from app.models.user import RecommendMode, TagLogic
from app.schemas.recommend import ProblemOut, RecommendResponse
from app.services.solved_ac import SolvedACError, search_problems

# solved.ac 공식 rating → tier 변환표
# tier: 0=Unrated, 1=Bronze V ... 30=Ruby I
RATING_BREAKPOINTS = [
    (2950, 30),  # Ruby I
    (2900, 29),  # Ruby II
    (2850, 28),  # Ruby III
    (2800, 27),  # Ruby IV
    (2700, 26),  # Ruby V
    (2600, 25),  # Diamond I
    (2500, 24),  # Diamond II
    (2400, 23),  # Diamond III
    (2300, 22),  # Diamond IV
    (2200, 21),  # Diamond V
    (2100, 20),  # Platinum I
    (2000, 19),  # Platinum II
    (1900, 18),  # Platinum III
    (1750, 17),  # Platinum IV
    (1600, 16),  # Platinum V
    (1400, 15),  # Gold I
    (1250, 14),  # Gold II
    (1100, 13),  # Gold III
    (950, 12),  # Gold IV
    (800, 11),  # Gold V
    (650, 10),  # Silver I
    (500, 9),  # Silver II
    (400, 8),  # Silver III
    (300, 7),  # Silver IV
    (200, 6),  # Silver V
    (150, 5),  # Bronze I
    (120, 4),  # Bronze II
    (90, 3),  # Bronze III
    (60, 2),  # Bronze IV
    (30, 1),  # Bronze V
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
    for min_rating, tier in RATING_BREAKPOINTS:
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
    tier: int,
    tag_ratings: dict[str, int],
    handle: str | None,
    count: int = 10,
) -> RecommendResponse:
    """
    선택한 태그들의 tag_rating 평균을 tier로 변환해 추천 난이도 기준으로 사용.
    태그 rating이 없으면 전체 tier로 fallback.
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
