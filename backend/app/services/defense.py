import random

from app.models.user import RecommendMode
from app.services.solved_ac import SolvedACError, search_problems
from app.services.recommender import rating_to_tier, TIER_MIN, TIER_MAX

# ── 구간 분류 ──────────────────────────────────────────────
# 하: B5~S1  (tier 1~10)
# 중: G5~P3  (tier 11~18)
# 상: P2~    (tier 19~30)


def _user_band(tier: int) -> str:
    if tier <= 10:
        return "low"
    elif tier <= 18:
        return "mid"
    else:
        return "high"


# (lo_delta, hi_delta, hard_cap)
BAND_DELTA: dict[str, dict[str, tuple[int, int, int]]] = {
    "low": {
        "practice": (-6, 0, 13),
        "train": (-4, +1, 13),
        "challenge": (-2, +2, 13),
    },
    "mid": {
        "practice": (-10, 0, 20),
        "train": (-7, +1, 20),
        "challenge": (-5, +2, 20),
    },
    "high": {
        "practice": (-12, -1, 21),
        "train": (-9, 0, 21),
        "challenge": (-7, +1, 21),
    },
}


def _has_korean(item: dict) -> bool:
    """titles 배열에 language='ko' 항목이 있는 문제만 허용."""
    return any(t.get("language") == "ko" for t in item.get("titles", []))


async def fetch_candidate_problems(
    tags: list[str],
    tier_lo: int,
    tier_hi: int,
    handle: str | None,
    min_solved: int = 100,
    page: int = 1,
) -> list[dict]:
    tier_lo = max(1, tier_lo)  # tier 0 (번외) 제외
    tag_part = " ".join(f"tag:{t}" for t in tags)
    tier_part = f"tier:{tier_lo}..{tier_hi}"
    solved_part = f"solved_by_count:{min_solved}.."
    exclude = f"-@{handle}" if handle else ""

    parts = [tier_part, tag_part, solved_part, "-tag:language"]
    if exclude:
        parts.append(exclude)

    query = " ".join(parts)
    try:
        data = await search_problems(query, page=page)
        return [
            item
            for item in data.get("items", [])
            if _has_korean(item) and item.get("level", 0) >= 1
        ]
    except SolvedACError:
        return []


def _spectrum_pick(candidates: list[dict], count: int) -> list[dict]:
    """
    티어 오름차순 정렬 후 스펙트럼형 가중 샘플링.
    낮은 티어일수록 가중치 높음: weight = (n - rank)  where rank=0 is lowest tier.
    """
    if not candidates or count <= 0:
        return []

    sorted_c = sorted(candidates, key=lambda x: x.get("level", 0))
    n = len(sorted_c)
    # rank 0 = 가장 낮은 티어 → 가중치 n, rank n-1 = 가장 높은 티어 → 가중치 1
    weights = [n - i for i in range(n)]

    picked = []
    pool = list(range(n))
    pool_weights = list(weights)

    for _ in range(min(count, n)):
        total = sum(pool_weights)
        r = random.uniform(0, total)
        cumul = 0
        chosen_idx = 0
        for j, w in enumerate(pool_weights):
            cumul += w
            if r <= cumul:
                chosen_idx = j
                break
        picked.append(sorted_c[pool[chosen_idx]])
        pool.pop(chosen_idx)
        pool_weights.pop(chosen_idx)

    return picked


async def build_defense_problems(
    tags: list[str],
    problem_count: int,
    user_tier: int,
    tag_ratings: dict[str, int],
    defense_mode: RecommendMode,
    handle: str | None,
    fixed_problem_ids: list[int],
) -> list[dict]:
    # 태그 rating 평균으로 effective tier 계산
    ratings = [tag_ratings[t] for t in tags if t in tag_ratings]
    if ratings:
        from app.services.recommender import rating_to_tier

        avg_rating = sum(ratings) // len(ratings)
        effective_tier = rating_to_tier(avg_rating)
    else:
        effective_tier = user_tier

    band = _user_band(effective_tier)
    mode_key = (
        defense_mode.value if hasattr(defense_mode, "value") else str(defense_mode)
    )
    lo, hi, hard_cap = BAND_DELTA[band][mode_key]

    tier_lo = max(TIER_MIN, effective_tier + lo)
    tier_hi = min(hard_cap, effective_tier + hi)

    # tier_lo > tier_hi 방지 (하방이 하드캡보다 높아지는 극단 케이스)
    if tier_lo > tier_hi:
        tier_lo = max(TIER_MIN, tier_hi - 2)

    fixed_ids = set(fixed_problem_ids)
    remaining_count = problem_count - len(fixed_ids)

    # 후보 문제 fetch (최대 3페이지)
    candidates: list[dict] = []
    for page in range(1, 4):
        items = await fetch_candidate_problems(
            tags, tier_lo, tier_hi, handle, page=page
        )
        candidates.extend(items)
        if len(candidates) >= remaining_count * 6:
            break

    # fixed 제외 + level 0 (번외) 제외
    pool = [
        c
        for c in candidates
        if c["problemId"] not in fixed_ids and c.get("level", 0) >= 1
    ]

    # 스펙트럼형 가중 샘플링
    picked = _spectrum_pick(pool, remaining_count)

    # fixed 문제 메타 수집 — solved.ac에서 직접 가져와 정확한 티어 보장
    id_to_item = {item["problemId"]: item for item in candidates}

    for pid in fixed_ids:
        if pid not in id_to_item:
            try:
                from app.services.solved_ac import search_problems as _search

                data = await _search(f"id:{pid}")
                items = data.get("items", [])
                if items:
                    id_to_item[pid] = items[0]
            except Exception:
                pass

    problems = []

    # fixed 먼저
    for pid in fixed_ids:
        meta = id_to_item.get(pid, {})
        problems.append(
            {
                "problem_id": pid,
                "title": meta.get("titleKo", str(pid)),
                "level": meta.get("level", 0),  # solved.ac 실제 티어 그대로
                "url": f"https://www.acmicpc.net/problem/{pid}",
                "is_fixed": True,
            }
        )

    # 스펙트럼 샘플
    for item in picked:
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
