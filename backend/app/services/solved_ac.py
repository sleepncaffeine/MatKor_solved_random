import httpx

from app.core.config import settings

BASE = settings.SOLVED_AC_BASE_URL
HEADERS = {"Accept": "application/json"}


class SolvedACError(Exception):
    pass


async def fetch_user_info(handle: str) -> dict:
    url = f"{BASE}/user/show"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params={"handle": handle}, headers=HEADERS)

    if resp.status_code == 404:
        raise SolvedACError(f"Handle '{handle}' not found on solved.ac")
    if resp.status_code != 200:
        raise SolvedACError(f"solved.ac API error: {resp.status_code}")

    return resp.json()


async def fetch_user_tag_ratings(handle: str) -> list[dict]:
    """
    GET /user/tag_ratings
    Returns list of:
    {
      "tag": {"key": "dp", "displayNames": [...]},
      "solvedCount": 72,
      "rating": 1541,
      "ratingByProblemsSum": ...,
      ...
    }
    """
    url = f"{BASE}/user/tag_ratings"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params={"handle": handle}, headers=HEADERS)

    if resp.status_code == 404:
        raise SolvedACError(f"Handle '{handle}' not found on solved.ac")
    if resp.status_code != 200:
        raise SolvedACError(f"solved.ac tag ratings error: {resp.status_code}")

    # 응답이 배열임 (count/items 래퍼 없음)
    return resp.json()


async def search_problems(query: str, page: int = 1) -> dict:
    """
    Returns solved.ac search result:
    {"count": N, "items": [{problemId, titleKo, level, acceptedUserCount, tags}, ...]}
    """
    url = f"{BASE}/search/problem"
    params = {"query": query, "page": page, "sort": "id", "direction": "asc"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params, headers=HEADERS)

    if resp.status_code != 200:
        raise SolvedACError(f"solved.ac search error: {resp.status_code}")

    return resp.json()


def parse_tag_ratings(items: list[dict]) -> list[dict]:
    """
    Normalizes raw tag_ratings items into a flat structure for DB storage.
    """
    result = []
    for item in items:
        tag = item.get("tag", {})
        display_names = tag.get("displayNames", [])

        name_ko = next(
            (d["name"] for d in display_names if d["language"] == "ko"),
            tag.get("key", ""),
        )
        name_en = next(
            (d["name"] for d in display_names if d["language"] == "en"),
            tag.get("key", ""),
        )

        result.append(
            {
                "tag_key": tag.get("key", ""),
                "tag_name_ko": name_ko,
                "tag_name_en": name_en,
                "solved_count": item.get("solvedCount", 0),
                "tag_rating": item.get("rating", 0),
            }
        )
    return result
