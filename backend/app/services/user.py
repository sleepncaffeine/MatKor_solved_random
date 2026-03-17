from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserTagStat


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_handle(db: AsyncSession, handle: str) -> User | None:
    result = await db.execute(select(User).where(User.boj_handle == handle))
    return result.scalar_one_or_none()


async def get_user_tag_stats(db: AsyncSession, user_id: int) -> list[UserTagStat]:
    result = await db.execute(select(UserTagStat).where(UserTagStat.user_id == user_id))
    return list(result.scalars().all())


async def get_all_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())
