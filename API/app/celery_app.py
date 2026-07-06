import os
from celery import Celery

celery_app = Celery(
    "url_shortener",
    broker=os.getenv("REDIS_URL"),
    backend=os.getenv("REDIS_URL"),
)