import random
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import SignupKey, User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services.user import get_user_by_email

router = APIRouter(prefix="/auth", tags=["auth"])


async def _get_or_create_signup_key(db: AsyncSession) -> SignupKey:
    """현재 유효한 키 반환. 없거나 24h 경과 시 새로 생성."""
    from datetime import datetime, timezone

    result = await db.execute(select(SignupKey).order_by(SignupKey.id.desc()).limit(1))
    record = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if record is None or (now - record.created_at) >= timedelta(hours=24):
        # 기존 레코드 전부 삭제 후 새 키 생성
        await db.execute(delete(SignupKey))
        key = str(random.randint(0, 9999)).zfill(4)
        record = SignupKey(key=key)
        db.add(record)
        await db.commit()
        await db.refresh(record)

    return record


@router.post(
    "/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # 회원가입 키 검증
    record = await _get_or_create_signup_key(db)
    if body.signup_key != record.key:
        raise HTTPException(status_code=400, detail="Invalid signup key")

    existing = await get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
        user_id = int(payload["sub"])
    except (JWTError, ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    from app.services.user import get_user_by_id

    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )
