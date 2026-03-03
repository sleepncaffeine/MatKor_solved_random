from pydantic import BaseModel, Field

from app.models.user import RecommendMode, TagLogic


class RecommendRequest(BaseModel):
    tags: list[str] = Field(..., min_length=1)
    tag_logic: TagLogic = TagLogic.AND
    mode: RecommendMode = RecommendMode.TRAIN
    count: int = Field(default=10, ge=1, le=50)


class ProblemOut(BaseModel):
    problem_id: int
    title: str
    level: int  # solved.ac tier (0~30)
    solved_count: int
    tags: list[str]
    url: str


class RecommendResponse(BaseModel):
    problems: list[ProblemOut]
    query_used: str  # 디버깅/투명성을 위해 실제 검색 쿼리 반환
