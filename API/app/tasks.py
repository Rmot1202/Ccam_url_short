from .celery_app import celery_app
from .database import SessionLocal
from . import models
from .redis_client import r

@celery_app.task
def track_click(short_code: str):
    try:
        r.incr(f"clicks:{short_code}")
    except Exception:
        pass

    db = SessionLocal()
    try:
        link = db.query(models.Link).filter(models.Link.short_code == short_code).first()
        if link:
            link.click_count += 1
            db.commit()
    finally:
        db.close()