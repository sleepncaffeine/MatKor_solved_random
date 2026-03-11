from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import Defense, DefenseAssignment, DefenseSubmission, User
from app.models.user import RecommendMode
from app.schemas.defense import (
    DefenseAssignmentOut,
    DefenseModeUpdate,
    DefenseProblemOut,
    DefenseOut,
)
from app.services.defense import build_defense_problems
from app.services.solved_ac import fetch_user_info
from app.services.user import get_user_tag_stats

router = APIRouter(prefix="/defense", tags=["defense"])


def utcnow():
    return datetime.now(timezone.utc)


async def _get_submission_map(db: AsyncSession, assignment_id: int) -> dict[int, bool]:
    """assignment의 제출 현황 {problem_id: solved} 반환."""
    result = await db.execute(
        select(DefenseSubmission).where(
            DefenseSubmission.assignment_id == assignment_id
        )
    )
    return {s.problem_id: s.solved for s in result.scalars().all()}


def _build_assignment_out(
    assignment: DefenseAssignment, submission_map: dict
) -> DefenseAssignmentOut:
    problems = [
        DefenseProblemOut(**p, solved=submission_map.get(p["problem_id"], False))
        for p in assignment.problems
    ]
    return DefenseAssignmentOut(
        id=assignment.id,
        defense_id=assignment.defense_id,
        defense_title=assignment.defense.title,
        defense_end_at=assignment.defense.end_at,
        problems=problems,
        refresh_used=assignment.refresh_used,
        created_at=assignment.created_at,
    )


@router.get("/active", response_model=list[DefenseOut])
async def get_active_defenses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """현재 활성화된 디펜스 목록."""
    now = utcnow()
    result = await db.execute(
        select(Defense)
        .where(
            Defense.is_active == True,
            Defense.start_at <= now,
            Defense.end_at >= now,
        )
        .order_by(Defense.end_at)
    )
    return result.scalars().all()


@router.post("/{defense_id}/join", response_model=DefenseAssignmentOut)
async def join_defense(
    defense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """디펜스 참가 — 문제 배분."""
    if not current_user.boj_handle:
        raise HTTPException(status_code=400, detail="BOJ handle not registered")

    # 디펜스 존재 확인
    defense = await db.get(Defense, defense_id)
    if not defense or not defense.is_active:
        raise HTTPException(status_code=404, detail="Defense not found")
    now = utcnow()
    if now < defense.start_at or now > defense.end_at:
        raise HTTPException(status_code=400, detail="Defense is not currently active")

    # 이미 참가했으면 기존 assignment 반환
    result = await db.execute(
        select(DefenseAssignment).where(
            DefenseAssignment.defense_id == defense_id,
            DefenseAssignment.user_id == current_user.id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        from sqlalchemy.orm import selectinload

        await db.refresh(existing, ["defense", "submissions"])
        sub_map = await _get_submission_map(db, existing.id)
        return _build_assignment_out(existing, sub_map)

    # 태그 rating 로드
    tag_stats = await get_user_tag_stats(db, current_user.id)
    tag_ratings = {s.tag_key: s.tag_rating for s in tag_stats}

    # 문제 배분
    problems = await build_defense_problems(
        tags=defense.tags,
        problem_count=defense.problem_count,
        user_tier=current_user.tier,
        tag_ratings=tag_ratings,
        defense_mode=RecommendMode(current_user.defense_mode),
        handle=current_user.boj_handle,
        fixed_problem_ids=defense.fixed_problem_ids or [],
    )

    assignment = DefenseAssignment(
        defense_id=defense_id,
        user_id=current_user.id,
        problems=problems,
        refresh_used=False,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    # defense relationship 로드
    await db.refresh(assignment, ["defense"])

    return _build_assignment_out(assignment, {})


@router.get("/my", response_model=list[DefenseAssignmentOut])
async def get_my_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """내 디펜스 참가 목록."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(DefenseAssignment)
        .options(selectinload(DefenseAssignment.defense))
        .where(DefenseAssignment.user_id == current_user.id)
        .order_by(DefenseAssignment.created_at.desc())
    )
    assignments = result.scalars().all()

    out = []
    for a in assignments:
        sub_map = await _get_submission_map(db, a.id)
        out.append(_build_assignment_out(a, sub_map))
    return out


@router.post("/{defense_id}/refresh", response_model=DefenseAssignmentOut)
async def refresh_problems(
    defense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """못 푼 문제만 교체 (1회 한정)."""
    result = await db.execute(
        select(DefenseAssignment).where(
            DefenseAssignment.defense_id == defense_id,
            DefenseAssignment.user_id == current_user.id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.refresh_used:
        raise HTTPException(status_code=400, detail="Refresh already used")

    defense = await db.get(Defense, defense_id)
    if not defense:
        raise HTTPException(status_code=404, detail="Defense not found")
    now = utcnow()
    if now > defense.end_at:
        raise HTTPException(status_code=400, detail="Defense has ended")

    # 현재 풀이 현황 확인
    sub_map = await _get_submission_map(db, assignment.id)
    solved_ids = {pid for pid, solved in sub_map.items() if solved}
    unsolved_problems = [
        p for p in assignment.problems if p["problem_id"] not in solved_ids
    ]
    solved_problems = [p for p in assignment.problems if p["problem_id"] in solved_ids]

    if not unsolved_problems:
        raise HTTPException(status_code=400, detail="All problems already solved")

    # 못 푼 문제 수만큼 새로 뽑기
    tag_stats = await get_user_tag_stats(db, current_user.id)
    tag_ratings = {s.tag_key: s.tag_rating for s in tag_stats}

    already_ids = {p["problem_id"] for p in assignment.problems}

    new_problems = await build_defense_problems(
        tags=defense.tags,
        problem_count=len(unsolved_problems),
        user_tier=current_user.tier,
        tag_ratings=tag_ratings,
        defense_mode=RecommendMode(current_user.defense_mode),
        handle=current_user.boj_handle,
        fixed_problem_ids=[],
    )
    # 이미 가진 문제 제외
    new_problems = [p for p in new_problems if p["problem_id"] not in already_ids]
    new_problems = new_problems[: len(unsolved_problems)]

    assignment.problems = solved_problems + new_problems
    assignment.refresh_used = True
    await db.commit()
    await db.refresh(assignment, ["defense"])

    sub_map = await _get_submission_map(db, assignment.id)
    return _build_assignment_out(assignment, sub_map)


@router.post("/{defense_id}/sync", response_model=DefenseAssignmentOut)
async def sync_submissions(
    defense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """solved.ac에서 제출 현황 갱신 (사용자 요청 시)."""
    if not current_user.boj_handle:
        raise HTTPException(status_code=400, detail="BOJ handle not registered")

    result = await db.execute(
        select(DefenseAssignment).where(
            DefenseAssignment.defense_id == defense_id,
            DefenseAssignment.user_id == current_user.id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # solved.ac에서 유저의 최근 풀이 확인
    # 각 문제를 개별 쿼리로 확인: "id:X solved_by:handle"
    # solved.ac search에서 결과가 있으면 해당 유저가 푼 것
    from app.services.solved_ac import SolvedACError
    import httpx
    from app.core.config import settings

    problem_ids = [p["problem_id"] for p in assignment.problems]
    solved_ids = set()

    async with httpx.AsyncClient(timeout=20.0) as client:
        for pid in problem_ids:
            try:
                query = f"id:{pid} solved_by:{current_user.boj_handle}"
                resp = await client.get(
                    f"{settings.SOLVED_AC_BASE_URL}/search/problem",
                    params={"query": query, "page": 1},
                    headers={"Accept": "application/json"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("count", 0) > 0:
                        solved_ids.add(pid)
            except Exception:
                pass

    # DB upsert
    now = datetime.now(timezone.utc)
    for pid in problem_ids:
        existing = await db.execute(
            select(DefenseSubmission).where(
                DefenseSubmission.assignment_id == assignment.id,
                DefenseSubmission.problem_id == pid,
            )
        )
        sub = existing.scalar_one_or_none()
        is_solved = pid in solved_ids
        if sub:
            sub.solved = is_solved
            sub.checked_at = now
        else:
            db.add(
                DefenseSubmission(
                    assignment_id=assignment.id,
                    user_id=current_user.id,
                    problem_id=pid,
                    solved=is_solved,
                    checked_at=now,
                )
            )

    await db.commit()
    await db.refresh(assignment, ["defense"])
    sub_map = await _get_submission_map(db, assignment.id)
    return _build_assignment_out(assignment, sub_map)


@router.put("/settings/mode", response_model=dict)
async def update_defense_mode(
    body: DefenseModeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """랜덤 디펜스 난이도 모드 설정."""
    current_user.defense_mode = body.defense_mode.value
    await db.commit()
    return {"defense_mode": current_user.defense_mode}
