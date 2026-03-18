from fastapi import APIRouter, Depends
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin
from app.db.session import get_db
from app.models.user import User

router = APIRouter(prefix="/admin/signup-key", tags=["admin"])


@router.get("")
async def get_signup_key(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.api.auth import _get_or_create_signup_key

    record = await _get_or_create_signup_key(db)
    from datetime import datetime, timezone, timedelta

    now = datetime.now(timezone.utc)
    expires_in = timedelta(hours=24) - (now - record.created_at)
    hours, remainder = divmod(int(expires_in.total_seconds()), 3600)
    minutes = remainder // 60
    return {
        "key": record.key,
        "created_at": record.created_at,
        "expires_in": f"{hours}h {minutes}m",
    }


@router.post("/refresh")
async def refresh_signup_key(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from sqlalchemy import select
    from app.models.user import SignupKey
    import random

    await db.execute(delete(SignupKey))
    key = str(random.randint(0, 9999)).zfill(4)
    record = SignupKey(key=key)
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return {"key": record.key, "created_at": record.created_at}
