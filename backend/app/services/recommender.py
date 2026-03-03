from app.models.user import RecommendMode, TagLogic
from app.schemas.recommend import ProblemOut, RecommendResponse
from app.services.solved_ac import SolvedACError, search_problems

# solved.ac tier 숫자 → 검색 쿼리용 범위 매핑
MODE_DELTA: dict[RecommendMode, tuple[int, int]] = {
    RecommendMode.PRACTICE: (-3, -1),
    RecommendMode.TRAIN: (-1, 1),
    RecommendMode.CHALLENGE: (1, 3),
}

TIER_MIN = 1  # Bronze V
TIER_MAX = 30  # Ruby I


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
    else:  # OR
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
    handle: str | None,
    count: int = 10,
) -> RecommendResponse:
    query = build_query(tags, tag_logic, tier, mode, handle)

    try:
        data = await search_problems(query)
    except SolvedACError as e:
        raise ValueError(str(e)) from e

    items = data.get("items", [])
    problems = [parse_problem(item) for item in items[:count]]

    return RecommendResponse(problems=problems, query_used=query)
