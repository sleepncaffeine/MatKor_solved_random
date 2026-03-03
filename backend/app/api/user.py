from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User, UserTagStat
from app.schemas.user import (
    HandleRegisterRequest,
    HandleRegisterResponse,
    TagStatOut,
    UserOut,
)
from app.services.solved_ac import (
    SolvedACError,
    fetch_user_info,
    fetch_user_tag_stats,
    parse_tag_stats,
)
from app.services.user import get_user_by_handle, get_user_tag_stats

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me/handle", response_model=HandleRegisterResponse)
async def register_handle(
    body: HandleRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 다른 유저가 이미 사용 중인 핸들인지 확인
    existing = await get_user_by_handle(db, body.handle)
    if existing and existing.id != current_user.id:
        raise HTTPException(
            status_code=400, detail="Handle already registered by another user"
        )

    # solved.ac에서 유저 정보 검증 및 fetch
    try:
        user_info = await fetch_user_info(body.handle)
        tag_items = await fetch_user_tag_stats(body.handle)
    except SolvedACError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 유저 기본 정보 업데이트 (tier_override 상태면 tier는 건드리지 않음)
    current_user.boj_handle = user_info["handle"]
    current_user.rating = user_info.get("rating", 0)
    if not current_user.tier_override:
        current_user.tier = user_info.get("tier", 0)

    # 태그 통계 upsert
    parsed = parse_tag_stats(tag_items)
    now = datetime.now(timezone.utc)

    for stat in parsed:
        result = await db.execute(
            select(UserTagStat).where(
                UserTagStat.user_id == current_user.id,
                UserTagStat.tag_key == stat["tag_key"],
            )
        )
        existing_stat = result.scalar_one_or_none()

        if existing_stat:
            existing_stat.solved_count = stat["solved_count"]
            existing_stat.level = stat["level"]
            existing_stat.tag_name_ko = stat["tag_name_ko"]
            existing_stat.tag_name_en = stat["tag_name_en"]
            existing_stat.updated_at = now
        else:
            db.add(UserTagStat(user_id=current_user.id, **stat))

    await db.commit()
    await db.refresh(current_user)

    return HandleRegisterResponse(
        boj_handle=current_user.boj_handle,
        tier=current_user.tier,
        rating=current_user.rating,
        tag_stats_count=len(parsed),
    )


@router.get("/me/stats", response_model=list[TagStatOut])
async def get_my_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stats = await get_user_tag_stats(db, current_user.id)
    return stats
