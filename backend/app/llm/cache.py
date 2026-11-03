"""Content-addressed cache for every model call, so demo replays need zero network."""

import hashlib
import json
import sqlite3
import threading

from app.config import CACHE_DB

_lock = threading.Lock()
_conn = sqlite3.connect(CACHE_DB, check_same_thread=False)
_conn.execute(
    "CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value BLOB, created REAL DEFAULT (julianday('now')))"
)
_conn.commit()


def make_key(*parts: object) -> str:
    h = hashlib.sha256()
    for p in parts:
        if isinstance(p, bytes):
            h.update(hashlib.sha256(p).digest())
        else:
            h.update(json.dumps(p, sort_keys=True, default=str).encode())
        h.update(b"\x00")
    return h.hexdigest()


def get(key: str) -> bytes | None:
    with _lock:
        row = _conn.execute("SELECT value FROM cache WHERE key = ?", (key,)).fetchone()
    return row[0] if row else None


def put(key: str, value: bytes) -> None:
    with _lock:
        _conn.execute("INSERT OR REPLACE INTO cache (key, value) VALUES (?, ?)", (key, value))
        _conn.commit()
