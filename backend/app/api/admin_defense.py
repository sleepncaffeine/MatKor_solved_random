from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_admin
from app.db.session import get_db
from app.models.user import Defense, DefenseAssignment, DefenseSubmission, User
from app.schemas.defense import DefenseCreate, DefenseOut

router = APIRouter(prefix="/admin/defense", tags=["admin-defense"])


@router.post("", response_model=DefenseOut, status_code=201)
async def create_defense(
    body: DefenseCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    defense = Defense(
        title=body.title,
        tags=body.tags,
        problem_count=body.problem_count,
        start_at=body.start_at,
        end_at=body.end_at,
        fixed_problem_ids=body.fixed_problem_ids,
        is_active=True,
        created_by=admin.id,
    )
    db.add(defense)
    await db.commit()
    await db.refresh(defense)
    return defense


@router.get("", response_model=list[DefenseOut])
async def list_defenses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(Defense).order_by(Defense.created_at.desc()))
    return result.scalars().all()


@router.patch("/{defense_id}/toggle")
async def toggle_defense(
    defense_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    defense = await db.get(Defense, defense_id)
    if not defense:
        raise HTTPException(status_code=404, detail="Defense not found")
    defense.is_active = not defense.is_active
    await db.commit()
    return {"id": defense.id, "is_active": defense.is_active}


@router.delete("/{defense_id}")
async def delete_defense(
    defense_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    defense = await db.get(Defense, defense_id)
    if not defense:
        raise HTTPException(status_code=404, detail="Defense not found")
    await db.delete(defense)
    await db.commit()
    return {"detail": "Deleted"}


@router.get("/{defense_id}/participants")
async def get_participants(
    defense_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """디펜스 참가자 현황."""
    result = await db.execute(
        select(DefenseAssignment)
        .options(
            selectinload(DefenseAssignment.user),
            selectinload(DefenseAssignment.submissions),
        )
        .where(DefenseAssignment.defense_id == defense_id)
    )
    assignments = result.scalars().all()

    out = []
    for a in assignments:
        sub_map = {s.problem_id: s.solved for s in a.submissions}
        solved_count = sum(1 for p in a.problems if sub_map.get(p["problem_id"], False))
        out.append(
            {
                "user_id": a.user_id,
                "email": a.user.email,
                "boj_handle": a.user.boj_handle,
                "defense_mode": a.user.defense_mode,
                "total": len(a.problems),
                "solved": solved_count,
                "refresh_used": a.refresh_used,
                "joined_at": a.created_at,
                "problems": [
                    {**p, "solved": sub_map.get(p["problem_id"], False)}
                    for p in a.problems
                ],
            }
        )
    return out
