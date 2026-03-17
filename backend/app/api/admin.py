from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    AdminOverrideTierRequest,
    AdminUpdateHandleRequest,
    AdminUpdateStatusRequest,
    TagStatOut,
    UserOut,
)
from app.services.solved_ac import (
    SolvedACError,
    fetch_user_info,
    fetch_user_tag_ratings,
    parse_tag_ratings,
)
from app.services.user import (
    get_all_users,
    get_user_by_id,
    get_user_tag_stats,
)

router = APIRouter(prefix="/admin", tags=["admin"])


async def _get_target_user(db: AsyncSession, user_id: int) -> User:
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return await get_all_users(db)


@router.get("/users/{user_id}", response_model=UserOut)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return await _get_target_user(db, user_id)


@router.get("/users/{user_id}/stats", response_model=list[TagStatOut])
async def get_user_stats(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    await _get_target_user(db, user_id)
    return await get_user_tag_stats(db, user_id)


@router.put("/users/{user_id}/handle")
async def update_user_handle(
    user_id: int,
    body: AdminUpdateHandleRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    user = await _get_target_user(db, user_id)

    try:
        user_info = await fetch_user_info(body.handle)
        tag_items = await fetch_user_tag_ratings(body.handle)
    except SolvedACError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user.boj_handle = user_info["handle"]
    user.rating = user_info.get("rating", 0)
    if not user.tier_override:
        user.tier = user_info.get("tier", 0)

    from datetime import datetime, timezone
    from sqlalchemy import select
    from app.models.user import UserTagStat

    parsed = parse_tag_ratings(tag_items)
    now = datetime.now(timezone.utc)

    for stat in parsed:
        result = await db.execute(
            select(UserTagStat).where(
                UserTagStat.user_id == user.id,
                UserTagStat.tag_key == stat["tag_key"],
            )
        )
        existing_stat = result.scalar_one_or_none()
        if existing_stat:
            existing_stat.solved_count = stat["solved_count"]
            existing_stat.tag_rating = stat["tag_rating"]
            existing_stat.updated_at = now
        else:
            db.add(UserTagStat(user_id=user.id, **stat))

    await db.commit()
    await db.refresh(user)
    return {"detail": "Handle updated", "tier": user.tier, "rating": user.rating}


@router.put("/users/{user_id}/tier")
async def override_user_tier(
    user_id: int,
    body: AdminOverrideTierRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    if not (0 <= body.tier <= 30):
        raise HTTPException(status_code=400, detail="Tier must be between 0 and 30")

    user = await _get_target_user(db, user_id)
    user.tier = body.tier
    user.tier_override = True
    await db.commit()
    return {"detail": "Tier overridden", "tier": user.tier}


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    body: AdminUpdateStatusRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    user = await _get_target_user(db, user_id)
    user.is_active = body.is_active
    await db.commit()
    return {"detail": "Status updated", "is_active": user.is_active}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    user = await _get_target_user(db, user_id)
    await db.delete(user)
    await db.commit()
    return {"detail": "User deleted"}
