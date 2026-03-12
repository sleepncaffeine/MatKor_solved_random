from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, admin_defense, auth, defense, recommend, user
from app.db.session import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="BOJ Recommend API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://mat-kor-solved-random.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(recommend.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(admin_defense.router, prefix="/api")
app.include_router(defense.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
