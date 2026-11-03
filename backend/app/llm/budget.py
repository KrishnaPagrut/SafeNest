"""Hard spend cap. Every live call is priced (list prices, notes/meta_api.md) and recorded; once the cap is hit,
the client refuses network calls and only serves the cache. Keeps us far inside the free $150 hackathon credits."""

import threading

from app import config
from app.llm import cache

# USD, from dev.meta.ai pricing (Nov 2026).
SPARK_IN_PER_TOKEN = 1.25 / 1e6
SPARK_OUT_PER_TOKEN = 4.25 / 1e6
SAM_PER_IMAGE = 2.50 / 1000
IMAGE_PER_IMAGE = 0.01

_lock = threading.Lock()
cache._conn.execute(
    "CREATE TABLE IF NOT EXISTS spend (id INTEGER PRIMARY KEY, kind TEXT, usd REAL, ts REAL DEFAULT (julianday('now')))"
)
cache._conn.commit()


class BudgetExceeded(RuntimeError):
    pass


def spent() -> float:
    with _lock:
        return cache._conn.execute("SELECT COALESCE(SUM(usd), 0) FROM spend").fetchone()[0]


def check() -> None:
    if spent() >= config.BUDGET_USD:
        raise BudgetExceeded(
            f"spend cap ${config.BUDGET_USD:.2f} reached (${spent():.2f} spent); cache-only from here"
        )


def record(kind: str, usd: float) -> None:
    with _lock:
        cache._conn.execute("INSERT INTO spend (kind, usd) VALUES (?, ?)", (kind, usd))
        cache._conn.commit()


def spark_cost(usage) -> float:
    if usage is None:
        return 0.02  # conservative guess when usage is missing
    return usage.input_tokens * SPARK_IN_PER_TOKEN + usage.output_tokens * SPARK_OUT_PER_TOKEN
