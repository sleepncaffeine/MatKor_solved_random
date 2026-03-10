from pydantic import BaseModel
from datetime import datetime
from app.models.user import RecommendMode


# ---------- Defense schemas ----------


class DefenseCreate(BaseModel):
    title: str
    tags: list[str]
    problem_count: int
    start_at: datetime
    end_at: datetime
    fixed_problem_ids: list[int] = []


class DefenseOut(BaseModel):
    id: int
    title: str
    tags: list[str]
    problem_count: int
    start_at: datetime
    end_at: datetime
    fixed_problem_ids: list[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DefenseProblemOut(BaseModel):
    problem_id: int
    title: str
    level: int
    url: str
    is_fixed: bool
    solved: bool = False


class DefenseAssignmentOut(BaseModel):
    id: int
    defense_id: int
    defense_title: str
    defense_end_at: datetime
    problems: list[DefenseProblemOut]
    refresh_used: bool
    created_at: datetime


class DefenseModeUpdate(BaseModel):
    defense_mode: RecommendMode
