from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.user import TagLogic, UserRole


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    boj_handle: str | None
    tier: int
    tier_override: bool
    rating: int
    defense_mode: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TagStatOut(BaseModel):
    tag_key: str
    tag_name_ko: str
    tag_name_en: str
    solved_count: int
    tag_rating: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class HandleRegisterRequest(BaseModel):
    handle: str


class HandleRegisterResponse(BaseModel):
    boj_handle: str
    tier: int
    rating: int
    tag_stats_count: int


# ---------- Admin schemas ----------


class AdminUpdateHandleRequest(BaseModel):
    handle: str


class AdminOverrideTierRequest(BaseModel):
    tier: int  # 0~30


class AdminUpdateStatusRequest(BaseModel):
    is_active: bool
