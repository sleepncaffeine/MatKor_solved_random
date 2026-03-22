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


@router.get("/{defense_id}/scoreboard")
async def get_scoreboard(
    defense_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """디펜스 scoreboard — first_solved_at 기준 이벤트 목록 + 참가자별 진행도."""
    defense = await db.get(Defense, defense_id)
    if not defense:
        raise HTTPException(status_code=404, detail="Defense not found")

    result = await db.execute(
        select(DefenseAssignment)
        .options(
            selectinload(DefenseAssignment.user),
            selectinload(DefenseAssignment.submissions),
        )
        .where(DefenseAssignment.defense_id == defense_id)
    )
    assignments = result.scalars().all()

    # 참가자 기본 정보
    participants = []
    for a in assignments:
        sub_map = {s.problem_id: s for s in a.submissions}
        solved_problems = [
            {
                "problem_id": p["problem_id"],
                "title": p["title"],
                "level": p["level"],
                "first_solved_at": (lambda fsa: fsa.isoformat() if fsa else None)(
                    sub_map[p["problem_id"]].first_solved_at
                    if p["problem_id"] in sub_map
                    else None
                ),
                "solved_after_end": (
                    sub_map[p["problem_id"]].solved_after_end
                    if p["problem_id"] in sub_map
                    else False
                ),
            }
            for p in a.problems
        ]
        participants.append(
            {
                "user_id": a.user_id,
                "boj_handle": a.user.boj_handle or a.user.email,
                "total": len(a.problems),
                "problems": solved_problems,
            }
        )

    # 시간순 이벤트 목록 (first_solved_at 있는 것만)
    events = []
    for p in participants:
        for prob in p["problems"]:
            if prob["first_solved_at"]:
                events.append(
                    {
                        "boj_handle": p["boj_handle"],
                        "user_id": p["user_id"],
                        "problem_id": prob["problem_id"],
                        "title": prob["title"],
                        "level": prob["level"],
                        "solved_at": prob["first_solved_at"],
                        "solved_after_end": prob["solved_after_end"],
                    }
                )

    events.sort(key=lambda e: e["solved_at"])

    return {
        "defense_id": defense_id,
        "title": defense.title,
        "start_at": defense.start_at.isoformat(),
        "end_at": defense.end_at.isoformat(),
        "participants": participants,
        "events": events,
    }
