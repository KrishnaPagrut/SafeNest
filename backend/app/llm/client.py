"""Meta Model API adapter: Spark (strict JSON), SAM 3.1 (segmentation), Muse Image (edit). Every call is cached."""

import asyncio
import base64
import json
import logging
import time

from openai import APIStatusError, AsyncOpenAI

from app import config
from app.llm import budget, cache

log = logging.getLogger("safenest.llm")


class CacheMiss(RuntimeError):
    pass


_client: AsyncOpenAI | None = None


def client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(base_url=config.BASE_URL, api_key=config.API_KEY or "missing", max_retries=3)
    return _client


def data_url(jpeg: bytes) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(jpeg).decode()


async def _with_retry(fn, attempts: int = 4):
    # The SDK retries 429/5xx itself; this outer loop covers 503s from image/SAM that come back as errors mid-stream.
    for i in range(attempts):
        try:
            return await fn()
        except APIStatusError as e:
            if e.status_code in (429, 500, 502, 503) and i < attempts - 1:
                await asyncio.sleep(2**i)
                continue
            raise


async def spark_json(
    *,
    name: str,
    system: str,
    content: list[dict],
    schema: dict,
    images: list[bytes] = (),
    effort: str | None = None,
) -> dict:
    """Responses API with constrained JSON-schema decoding. `content` is the user message parts; image bytes are
    hashed into the cache key separately so data URLs don't bloat it."""
    effort = effort or config.REASONING_EFFORT
    key = cache.make_key(
        "spark", config.SPARK_MODEL, name, system, _strip_images(content), schema, effort, *images
    )
    hit = cache.get(key)
    if hit is not None:
        return json.loads(hit)
    if config.CACHE_ONLY:
        raise CacheMiss(f"spark:{name}")
    budget.check()
    t0 = time.monotonic()

    async def call():
        return await client().responses.create(
            model=config.SPARK_MODEL,
            instructions=system,
            input=[{"type": "message", "role": "user", "content": content}],
            text={"format": {"type": "json_schema", "name": name, "schema": schema, "strict": True}},
            reasoning={"effort": effort},
            max_output_tokens=32000,
        )

    resp = await _with_retry(call)
    budget.record("spark", budget.spark_cost(getattr(resp, "usage", None)))
    out = json.loads(resp.output_text)
    log.info("spark %s %.1fs", name, time.monotonic() - t0)
    cache.put(key, json.dumps(out).encode())
    return out


def _strip_images(content: list[dict]) -> list[dict]:
    return [{**p, "image_url": "<img>"} if p.get("type") == "input_image" else p for p in content]


async def sam_image(phrase: str, jpeg: bytes) -> str:
    """Returns SAM's raw special-token output text (empty string = no match). Parsed in pipeline.grounder."""
    key = cache.make_key("sam", config.SAM_MODEL, phrase, jpeg)
    hit = cache.get(key)
    if hit is not None:
        return hit.decode()
    if config.CACHE_ONLY:
        raise CacheMiss(f"sam:{phrase}")
    budget.check()

    async def call():
        return await client().responses.create(
            model=config.SAM_MODEL,
            input=[
                {
                    "type": "message",
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": phrase},
                        {"type": "input_image", "image_url": data_url(jpeg)},
                    ],
                }
            ],
            metadata={"include_confidence": "true", "mask_encoding": "lossless"},
        )

    resp = await _with_retry(call)
    budget.record("sam", budget.SAM_PER_IMAGE)
    text = resp.output_text or ""
    cache.put(key, text.encode())
    return text


async def image_edit(jpeg: bytes, prompt: str) -> bytes:
    """Muse Image edit of one frame. Returns PNG/WebP bytes."""
    key = cache.make_key("img", config.IMAGE_MODEL, prompt, jpeg)
    hit = cache.get(key)
    if hit is not None:
        return hit
    if config.CACHE_ONLY:
        raise CacheMiss("image_edit")
    budget.check()

    async def call():
        return await client().images.edit(
            model=config.IMAGE_MODEL,
            image=("frame.jpg", jpeg, "image/jpeg"),
            prompt=prompt,
            n=1,
            extra_body={
                "reasoning_strength": "low",
                "tool_enablement": {
                    "enable_image_search": False,
                    "enable_web_search": False,
                    "enable_shell": False,
                },
            },
        )

    resp = await _with_retry(call)
    budget.record("image", budget.IMAGE_PER_IMAGE)
    out = base64.b64decode(resp.data[0].b64_json)
    cache.put(key, out)
    return out
