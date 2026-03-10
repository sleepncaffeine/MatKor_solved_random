import random

from app.models.user import RecommendMode
from app.services.solved_ac import SolvedACError, search_problems
from app.services.recommender import rating_to_tier, MODE_DELTA, TIER_MIN, TIER_MAX

# 연습/도전 모드에서 본인 tier 문제 최소 1개 보장을 위한 훈련 delta
TRAIN_DELTA = (-1, 1)


async def fetch_candidate_problems(
    tags: list[str],
    tier_lo: int,
    tier_hi: int,
    handle: str | None,
    min_solved: int = 500,
    page: int = 1,
) -> list[dict]:
    """solved.ac search로 후보 문제 목록 가져오기."""
    tag_part = " ".join(f"tag:{t}" for t in tags)
    tier_part = f"tier:{tier_lo}..{tier_hi}"
    solved_part = f"solved_by_count:{min_solved}.."
    exclude = f"-@{handle}" if handle else ""

    parts = [tier_part, tag_part, solved_part]
    if exclude:
        parts.append(exclude)

    query = " ".join(parts)

    try:
        data = await search_problems(query, page=page)
        return data.get("items", [])
    except SolvedACError:
        return []


async def build_defense_problems(
    tags: list[str],
    problem_count: int,
    user_tier: int,
    tag_ratings: dict[str, int],
    defense_mode: RecommendMode,
    handle: str | None,
    fixed_problem_ids: list[int],
) -> list[dict]:
    """
    사용자별 디펜스 문제 목록 생성.
    - fixed_problem_ids: 무조건 포함
    - 나머지는 tag_rating 기반 tier에서 랜덤 샘플링
    - 연습/도전이더라도 본인 tier(train delta) 문제 최소 1개 보장
    """
    # 태그 rating 평균으로 effective tier 계산
    ratings = [tag_ratings[t] for t in tags if t in tag_ratings]
    if ratings:
        avg_rating = sum(ratings) // len(ratings)
        effective_tier = rating_to_tier(avg_rating)
    else:
        effective_tier = user_tier

    lo, hi = MODE_DELTA[defense_mode]
    tier_lo = max(TIER_MIN, effective_tier + lo)
    tier_hi = min(TIER_MAX, effective_tier + hi)

    # 본인 tier (train) 범위
    train_lo = max(TIER_MIN, effective_tier + TRAIN_DELTA[0])
    train_hi = min(TIER_MAX, effective_tier + TRAIN_DELTA[1])

    need_anchor = defense_mode != RecommendMode.TRAIN  # 연습/도전만 anchor 필요

    # 후보 문제 fetch (최대 2페이지)
    candidates = []
    for page in range(1, 3):
        items = await fetch_candidate_problems(
            tags, tier_lo, tier_hi, handle, page=page
        )
        candidates.extend(items)
        if len(candidates) >= problem_count * 5:
            break

    # anchor 후보 (본인 tier 범위)
    anchor_candidates = []
    if need_anchor:
        for page in range(1, 2):
            items = await fetch_candidate_problems(
                tags, train_lo, train_hi, handle, page=page
            )
            anchor_candidates.extend(items)

    # fixed 문제 ID set
    fixed_ids = set(fixed_problem_ids)
    candidate_ids = {item["problemId"] for item in candidates}
    anchor_ids = {item["problemId"] for item in anchor_candidates} - fixed_ids

    # 이미 fixed에 본인 tier 포함 여부
    fixed_in_anchor = any(
        train_lo <= item.get("level", 0) <= train_hi
        for item in candidates
        if item["problemId"] in fixed_ids
    )

    result_ids: list[int] = list(fixed_ids)
    remaining = problem_count - len(result_ids)

    # anchor 1개 보장 (연습/도전 모드이고 fixed에 없는 경우)
    anchor_picked = None
    if need_anchor and not fixed_in_anchor and anchor_ids:
        anchor_pool = [
            i
            for i in anchor_candidates
            if i["problemId"] in anchor_ids and i["problemId"] not in fixed_ids
        ]
        if anchor_pool:
            anchor_picked = random.choice(anchor_pool)
            result_ids.append(anchor_picked["problemId"])
            remaining -= 1

    # 나머지 랜덤 샘플링
    pool = [item for item in candidates if item["problemId"] not in set(result_ids)]
    random.shuffle(pool)
    picked = pool[:remaining]
    result_ids.extend(item["problemId"] for item in picked)

    # 문제 메타 조합
    id_to_item = {item["problemId"]: item for item in candidates + anchor_candidates}

    problems = []
    for pid in fixed_ids:
        meta = id_to_item.get(pid, {})
        problems.append(
            {
                "problem_id": pid,
                "title": meta.get("titleKo", str(pid)),
                "level": meta.get("level", 0),
                "url": f"https://www.acmicpc.net/problem/{pid}",
                "is_fixed": True,
            }
        )

    for item in ([anchor_picked] if anchor_picked else []) + picked:
        if item["problemId"] not in fixed_ids:
            problems.append(
                {
                    "problem_id": item["problemId"],
                    "title": item.get("titleKo", str(item["problemId"])),
                    "level": item.get("level", 0),
                    "url": f"https://www.acmicpc.net/problem/{item['problemId']}",
                    "is_fixed": False,
                }
            )

    return problems[:problem_count]
