from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Optional
from uuid import uuid4


_notifications: list[dict] = []
_lock = Lock()


def _infer_type(subject: str, body: str) -> str:
    text = f"{subject} {body}".lower()
    if "order" in text:
        return "order"
    if "payment" in text:
        return "payment"
    if "cancel" in text or "failed" in text:
        return "alert"
    return "system"


def record_email_notification(user_email: str, subject: str, body: str) -> dict:
    now = datetime.now(timezone.utc)
    notification = {
        "id": str(uuid4()),
        "user_email": user_email,
        "type": _infer_type(subject, body),
        "title": subject or "Email Notification",
        "desc": body or "No details provided.",
        "message": body or "No details provided.",
        "time": "Just now",
        "unread": True,
        "created_at": now.isoformat(),
    }

    with _lock:
        _notifications.insert(0, notification)
        del _notifications[100:]

    return notification


def get_notifications(user_email: Optional[str] = None) -> list[dict]:
    with _lock:
        notifications = list(_notifications)

    if user_email:
        normalized_email = user_email.lower()
        notifications = [
            notification
            for notification in notifications
            if notification.get("user_email", "").lower() == normalized_email
        ]

    return notifications
