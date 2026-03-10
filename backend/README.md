# BOJ Recommend - Backend

## 환경 세팅

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 환경변수

```bash
cp .env.example .env
# .env 파일에서 DATABASE_URL, SECRET_KEY 수정
```

## PostgreSQL DB 생성

```sql
CREATE DATABASE boj_recommend;
```

## 실행 (개발)

```bash
uvicorn app.main:app --reload
```

앱 시작 시 lifespan 이벤트에서 테이블이 자동 생성됩니다.

## Alembic 마이그레이션 (프로덕션)

```bash
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

## API 문서

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 엔드포인트 요약

### Auth

| Method | Path               | 설명      |
| ------ | ------------------ | --------- |
| POST   | /api/auth/register | 회원가입  |
| POST   | /api/auth/login    | 로그인    |
| POST   | /api/auth/refresh  | 토큰 갱신 |

### User

| Method | Path                | 설명           |
| ------ | ------------------- | -------------- |
| GET    | /api/user/me        | 내 프로필      |
| PUT    | /api/user/me/handle | 핸들 등록/변경 |
| GET    | /api/user/me/stats  | 태그별 통계    |

### Recommend

| Method | Path           | 설명      |
| ------ | -------------- | --------- |
| POST   | /api/recommend | 문제 추천 |

### Admin (admin role 필요)

| Method | Path                          | 설명               |
| ------ | ----------------------------- | ------------------ |
| GET    | /api/admin/users              | 전체 유저 목록     |
| GET    | /api/admin/users/{id}         | 유저 상세          |
| GET    | /api/admin/users/{id}/stats   | 유저 태그 통계     |
| GET    | /api/admin/users/{id}/history | 유저 추천 이력     |
| PUT    | /api/admin/users/{id}/handle  | 핸들 수정          |
| PUT    | /api/admin/users/{id}/tier    | 티어 수동 override |
| PATCH  | /api/admin/users/{id}/status  | 계정 활성/정지     |
| DELETE | /api/admin/users/{id}         | 계정 삭제          |

## 추천 요청 예시

```json
POST /api/recommend
{
  "tags": ["dp", "graph"],
  "tag_logic": "AND",
  "mode": "train",
  "count": 10
}
```

mode 값: `practice` (tier-3~-1) / `train` (tier-1~+1) / `challenge` (tier+1~+3)

## Admin 계정 생성

현재는 DB에서 직접 role을 "admin"으로 변경해야 합니다:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```
