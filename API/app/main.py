import logging
import time

from fastapi import Cookie, Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
from .tasks import track_click

from . import crud, models, schemas, services
from .auth import create_access_token, decode_access_token
from .database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="URL Shortener API")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("url_shortener")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000

    client = request.client.host if request.client else "unknown"
    logger.info(
        "%s %s from %s -> %s in %.2fms",
        request.method,
        request.url.path,
        client,
        response.status_code,
        duration_ms,
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://ccam-url-short-front.onrender.com",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(access_token: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_name = payload.get("sub")
    if not user_name:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(models.User).filter(models.User.user_name == user_name).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@app.post("/auth/signup", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    user = crud.create_user(db, payload)
    if not user:
        raise HTTPException(status_code=409, detail="Email or username already exists")
    return user


@app.post("/auth/login")
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user.user_name, "email": user.email})
    response = JSONResponse(content={"message": "Login successful"})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=3600,
    )
    return response


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out"}


@app.get("/auth/me", response_model=schemas.UserResponse)
def me(current_user=Depends(get_current_user)):
    return current_user


@app.post("/shorten", response_model=schemas.LinkResponse, status_code=status.HTTP_201_CREATED)
def shorten_link(
    payload: schemas.LinkCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        return services.create_short_link(db, current_user.user_name, payload)
    except services.AliasConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except (services.InvalidAliasError, services.InvalidExpirationError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/links", response_model=list[schemas.LinkResponse])
def list_links(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return services.list_short_links(db, current_user.user_name)


@app.get("/{short_code}")
def redirect_link(short_code: str, db: Session = Depends(get_db)):
    try:
        destination_url = services.resolve_redirect(db, short_code)
    except services.LinkExpiredError as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc

    if not destination_url:
        raise HTTPException(status_code=404, detail="Short code not found")

    track_click.delay(short_code)
    return RedirectResponse(url=destination_url, status_code=307)


@app.get("/stats/{short_code}", response_model=schemas.LinkResponse)
def link_stats(short_code: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    link = services.get_link_stats(db, short_code)
    if not link:
        raise HTTPException(status_code=404, detail="Short code not found")
    if link.user_name != current_user.user_name:
        raise HTTPException(status_code=403, detail="Not allowed")
    return link


@app.delete("/{short_code}")
def delete_link(short_code: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    link = services.get_link_stats(db, short_code)
    if not link:
        raise HTTPException(status_code=404, detail="Short code not found")
    if link.user_name != current_user.user_name:
        raise HTTPException(status_code=403, detail="Not allowed")

    services.delete_short_link(db, short_code)
    return {"detail": "Link deleted successfully"}

