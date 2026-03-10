from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import RecommendationHistory, User
from app.schemas.recommend import RecommendRequest, RecommendResponse
from app.services.recommender import recommend
from app.services.user import get_user_tag_stats

router = APIRouter(prefix="/recommend", tags=["recommend"])


@router.post("", response_model=RecommendResponse)
async def get_recommendations(
    body: RecommendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.tier == 0 and not current_user.boj_handle:
        raise HTTPException(
            status_code=400,
            detail="BOJ handle not registered. Register your handle first.",
        )

    # DB에서 태그별 rating 로드 → {tag_key: tag_rating}
    tag_stats = await get_user_tag_stats(db, current_user.id)
    tag_ratings = {s.tag_key: s.tag_rating for s in tag_stats}

    try:
        result = await recommend(
            tags=body.tags,
            tag_logic=body.tag_logic,
            mode=body.mode,
            tier=current_user.tier,
            tag_ratings=tag_ratings,
            handle=current_user.boj_handle,
            count=body.count,
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    # 추천 이력 저장
    for problem in result.problems:
        db.add(
            RecommendationHistory(
                user_id=current_user.id,
                problem_id=problem.problem_id,
                tags=body.tags,
                mode=body.mode,
                tag_logic=body.tag_logic,
            )
        )
    await db.commit()

    return result
