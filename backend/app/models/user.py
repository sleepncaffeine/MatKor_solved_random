import enum
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"


class RecommendMode(str, enum.Enum):
    PRACTICE = "practice"  # tier -3 ~ -1
    TRAIN = "train"  # tier -1 ~ +1
    CHALLENGE = "challenge"  # tier +1 ~ +3


class TagLogic(str, enum.Enum):
    AND = "AND"
    OR = "OR"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), nullable=False, default=UserRole.USER
    )

    boj_handle: Mapped[str | None] = mapped_column(
        String(100), unique=True, nullable=True
    )
    # solved.ac tier: 1 (Bronze V) ~ 30 (Ruby I), 0 = unrated
    tier: Mapped[int] = mapped_column(Integer, default=0)
    # admin이 수동으로 tier를 override했는지 여부
    tier_override: Mapped[bool] = mapped_column(Boolean, default=False)
    rating: Mapped[int] = mapped_column(Integer, default=0)

    defense_mode: Mapped[str] = mapped_column(
        String(20), nullable=False, default="train"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    tag_stats: Mapped[list["UserTagStat"]] = relationship(
        "UserTagStat", back_populates="user", cascade="all, delete-orphan"
    )
    solved_problems: Mapped[list["SolvedProblem"]] = relationship(
        "SolvedProblem", back_populates="user", cascade="all, delete-orphan"
    )
    defense_assignments: Mapped[list["DefenseAssignment"]] = relationship(
        "DefenseAssignment", back_populates="user", cascade="all, delete-orphan"
    )


class UserTagStat(Base):
    __tablename__ = "user_tag_stats"
    __table_args__ = (UniqueConstraint("user_id", "tag_key", name="uq_user_tag"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tag_key: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "dp"
    tag_name_ko: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # e.g. "다이나믹 프로그래밍"
    tag_name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    solved_count: Mapped[int] = mapped_column(Integer, default=0)
    # solved.ac가 계산한 해당 태그에서의 유저 레이팅 (user/tag_ratings 엔드포인트)
    tag_rating: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    user: Mapped["User"] = relationship("User", back_populates="tag_stats")


class SolvedProblem(Base):
    __tablename__ = "solved_problems"
    __table_args__ = (
        UniqueConstraint("user_id", "problem_id", name="uq_user_problem"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    problem_id: Mapped[int] = mapped_column(Integer, nullable=False)
    solved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship("User", back_populates="solved_problems")


class Defense(Base):
    __tablename__ = "defenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    tags: Mapped[list] = mapped_column(JSON, nullable=False)  # ["dp", "graph"]
    problem_count: Mapped[int] = mapped_column(Integer, nullable=False)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fixed_problem_ids: Mapped[list] = mapped_column(
        JSON, default=list
    )  # admin 지정 고정 문제
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    assignments: Mapped[list["DefenseAssignment"]] = relationship(
        "DefenseAssignment", back_populates="defense", cascade="all, delete-orphan"
    )


class DefenseAssignment(Base):
    __tablename__ = "defense_assignments"
    __table_args__ = (
        UniqueConstraint("defense_id", "user_id", name="uq_defense_user"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    defense_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("defenses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # [{problem_id, title, level, url, is_fixed}]
    problems: Mapped[list] = mapped_column(JSON, nullable=False)
    refresh_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    defense: Mapped["Defense"] = relationship("Defense", back_populates="assignments")
    user: Mapped["User"] = relationship("User", back_populates="defense_assignments")
    submissions: Mapped[list["DefenseSubmission"]] = relationship(
        "DefenseSubmission", back_populates="assignment", cascade="all, delete-orphan"
    )


class DefenseSubmission(Base):
    """solved.ac 갱신 시 각 문제의 풀이 여부 기록"""

    __tablename__ = "defense_submissions"
    __table_args__ = (
        UniqueConstraint("assignment_id", "problem_id", name="uq_assign_problem"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assignment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("defense_assignments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    problem_id: Mapped[int] = mapped_column(Integer, nullable=False)
    solved: Mapped[bool] = mapped_column(Boolean, default=False)
    solved_after_end: Mapped[bool] = mapped_column(
        Boolean, default=False
    )  # 디펜스 종료 후 풀었을 때
    first_solved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )  # False→True 전환 시각 (근사값)
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    assignment: Mapped["DefenseAssignment"] = relationship(
        "DefenseAssignment", back_populates="submissions"
    )


class SignupKey(Base):
    """회원가입 키 — 항상 레코드 1개만 유지, 24h마다 자동 갱신"""

    __tablename__ = "signup_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(4), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
