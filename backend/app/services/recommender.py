from app.models.user import RecommendMode, TagLogic
from app.schemas.recommend import ProblemOut, RecommendResponse
from app.services.solved_ac import SolvedACError, search_problems

# solved.ac rating → tier 변환 테이블
# https://solved.ac 기준: 각 티어의 최소 rating
# Bronze V=1 ~ Ruby I=30
RATING_TO_TIER_BREAKPOINTS = [
    (2800, 30),  # Ruby I
    (2700, 29),  # Ruby II
    (2600, 28),
    (2500, 27),
    (2400, 26),  # Ruby V
    (2200, 25),  # Diamond I
    (2100, 24),
    (2000, 23),
    (1900, 22),
    (1800, 21),  # Diamond V
    (1600, 20),  # Platinum I
    (1500, 19),
    (1400, 18),
    (1300, 17),
    (1200, 16),  # Platinum V
    (1000, 15),  # Gold I
    (900, 14),
    (800, 13),
    (700, 12),
    (600, 11),  # Gold V
    (500, 10),  # Silver I
    (400, 9),
    (300, 8),
    (200, 7),
    (100, 6),  # Silver V
    (80, 5),  # Bronze I
    (60, 4),
    (40, 3),
    (20, 2),
    (1, 1),  # Bronze V
    (0, 0),  # Unrated
]

MODE_DELTA: dict[RecommendMode, tuple[int, int]] = {
    RecommendMode.PRACTICE: (-3, -1),
    RecommendMode.TRAIN: (-1, 1),
    RecommendMode.CHALLENGE: (1, 3),
}

TIER_MIN = 1
TIER_MAX = 30


def rating_to_tier(rating: int) -> int:
    """solved.ac rating 숫자를 tier 숫자(0~30)로 변환."""
    for min_rating, tier in RATING_TO_TIER_BREAKPOINTS:
        if rating >= min_rating:
            return tier
    return 0


def build_query(
    tags: list[str],
    tag_logic: TagLogic,
    tier: int,
    mode: RecommendMode,
    handle: str | None,
) -> str:
    lo, hi = MODE_DELTA[mode]
    tier_lo = max(TIER_MIN, tier + lo)
    tier_hi = min(TIER_MAX, tier + hi)

    tier_part = f"tier:{tier_lo}..{tier_hi}"

    if tag_logic == TagLogic.AND:
        tag_part = " ".join(f"tag:{t}" for t in tags)
    else:
        tag_part = "(" + "|".join(f"tag:{t}" for t in tags) + ")"

    exclude_part = f"-@{handle}" if handle else ""

    parts = [tier_part, tag_part]
    if exclude_part:
        parts.append(exclude_part)

    return " ".join(parts)


def parse_problem(item: dict) -> ProblemOut:
    problem_id = item["problemId"]
    tag_keys = [tag["key"] for tag in item.get("tags", [])]
    return ProblemOut(
        problem_id=problem_id,
        title=item.get("titleKo", str(problem_id)),
        level=item.get("level", 0),
        solved_count=item.get("acceptedUserCount", 0),
        tags=tag_keys,
        url=f"https://www.acmicpc.net/problem/{problem_id}",
    )


async def recommend(
    tags: list[str],
    tag_logic: TagLogic,
    mode: RecommendMode,
    tier: int,  # 전체 tier (fallback용)
    tag_ratings: dict[str, int],  # {tag_key: rating} — DB에서 전달
    handle: str | None,
    count: int = 10,
) -> RecommendResponse:
    """
    태그별 rating 기반 추천.
    - 단일 태그: 해당 태그의 rating으로 tier 계산
    - 복수 태그 AND: 선택 태그들의 rating 평균으로 tier 계산
    - 복수 태그 OR: 태그별로 각각 tier 계산 후 평균
    - 태그 rating이 없으면 전체 tier 사용
    """
    if tag_ratings and tags:
        ratings = [tag_ratings[t] for t in tags if t in tag_ratings]
        if ratings:
            avg_rating = sum(ratings) // len(ratings)
            effective_tier = rating_to_tier(avg_rating)
        else:
            effective_tier = tier
    else:
        effective_tier = tier

    query = build_query(tags, tag_logic, effective_tier, mode, handle)

    try:
        data = await search_problems(query)
    except SolvedACError as e:
        raise ValueError(str(e)) from e

    items = data.get("items", [])
    problems = [parse_problem(item) for item in items[:count]]

    return RecommendResponse(
        problems=problems,
        query_used=query,
        effective_tier=effective_tier,
    )
