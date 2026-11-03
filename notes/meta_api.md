# Meta Model API: build notes (checked 2026-11-03)

Official docs are at https://dev.meta.ai/docs/* . Each page is also served as raw Markdown at `<page>.md`, and the index is https://dev.meta.ai/llms.txt .
Raw copies of the pages are in ./raw/ next to this file.

## Core facts
- Base URL: `https://api.meta.ai/v1`. For the Anthropic SDK, use `https://api.meta.ai` (the SDK appends /v1/messages).
- Auth: `Authorization: Bearer $MODEL_API_KEY`. Keys look like `LLM_<numericid>_<secret>`. The OpenAI SDK does NOT read MODEL_API_KEY automatically, so pass `api_key=` yourself.
- Endpoints: `/v1/responses` (the docs' preferred one), `/v1/chat/completions` (OpenAI-compatible), `/v1/messages` (Anthropic-compatible), `/v1/images/generations`, `/v1/images/edits`, `/v1/files`, `/v1/models`, `/v1/asr/transcribe`, `wss://api.meta.ai/v1/asr/realtime`.
- SDK: `pip install openai`. No Meta-specific SDK exists for text or image. SAM output has a parser: `pip install meta-sam-parser` (import `meta_sam_parser`, version 0.1.0, no dependencies, Python 3.10+).
- LiteLLM: either `model="openai/muse-spark-1.3", api_base="https://api.meta.ai/v1"`, or the native provider `meta/muse-spark-1.1` with env var META_API_KEY.

## Model IDs
| ID | What | Notes |
|---|---|---|
| muse-spark-1.3 | latest Spark, recommended | 1,048,576 ctx; reasoning effort minimal..max; audio input degraded on 1.3 |
| muse-spark-1.3-contributor | same model, cheap; Meta may train on your content | 150 RPM; no "max" effort |
| muse-spark-1.2 / muse-spark-1.2-contributor | previous version | |
| muse-spark-1.1 | original | Standard mode only |
| muse-wonder-1.0 | most capable (preview) | $4/$20 per 1M tokens |
| muse-image-1.0 | image generation and editing | $0.01 per image, 150 RPM |
| sam-3.1 | segmentation for image and video | $2.50 per 1k images; $0.20 per 1k video frames (50-frame minimum) |
| muse-voice-transcribe-1.0 | speech to text | $0.18 per hour |
"Muse Code" is NOT a model ID. It is Meta's terminal coding-agent CLI (`curl -fsSL https://dev.meta.ai/install.sh | sh`, then run `muse`), which uses Spark and Wonder.

## Pricing and limits
- Spark Standard: $1.25 input, $4.25 output, $0.15 cached input (per 1M tokens). Contributor: $0.10 input, $0.20 output, $0.002 cached. No long-context premium. web_search costs $2.50 per 1k queries.
- Rate limits are per TEAM, not per key: Spark/Wonder 3,000 RPM and 4M TPM; contributor variants 150 RPM and 3M TPM; sam-3.1 3,000 RPM; muse-image-1.0 150 RPM. On a 429, back off exponentially and respect `Retry-After`. Response headers: `x-ratelimit-remaining-tokens` and `x-ratelimit-remaining-requests`.
- Free credits: press reports (July 2026 launch) say every new API account gets $20. Access was US-only with a waitlist. The official docs say nothing about hackathon credits.
- Latency: the docs give no figures. Expect a pause before the first token because the model reasons first; use `reasoning_effort="low"` or `"minimal"` for speed.

## Muse Spark quirks (important)
- It is always a reasoning model. `reasoning_effort="none"` returns a 400. Allowed values: minimal, low, medium, high, xhigh, max (1.3 and Wonder only). In Chat Completions this is the top-level `reasoning_effort`; in Responses it is `reasoning={"effort": ...}`.
- Reasoning tokens count toward `max_completion_tokens` / `max_output_tokens`. Set these generously or the visible output gets truncated.
- These return 400: `stop`, `n>1`, `logprobs`, `logit_bias`, `prediction`, `modalities`, `audio`, and `web_search_options` on chat. `frequency_penalty` and `presence_penalty` are also unsupported. Sending `text.format` to chat returns a 400 (use `response_format` there).
- `tool_choice` accepts only "auto". "required", "none" and named choices return 400. `parallel_tool_calls` defaults to true. A tool name may contain at most one dot.
- Tool-call arguments are NOT guaranteed to match the schema, so validate them yourself. Structured output (response_format json_schema) IS constrained decoding, so it is guaranteed. Recursive schemas return 400. Max nesting depth is 10.
- Leave temperature and top_p at their defaults (1.0).
- On Chat Completions, `reasoning_content` comes back redacted (empty), so reasoning does not carry across turns. For agent loops use Responses with `previous_response_id` or `include=["reasoning.encrypted_content"]`.
- Anthropic SDK: `content[0]` is a `redacted_thinking` block, so filter for `type == "text"`.
- Search grounding exists only on Responses: `tools=[{"type":"web_search"}]`.

## Snippets (copied from the docs)

### Client
```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://api.meta.ai/v1",
    api_key=os.environ["MODEL_API_KEY"],
)
```
For FastAPI, use `AsyncOpenAI` with the same arguments.

### Responses (quickstart)
```python
response = client.responses.create(
    model="muse-spark-1.3",
    input="What is the capital of France?",
)
print(response.output_text)
```
The `output` list holds a `reasoning` item and then a `message` item with `output_text`. Usage is in `output_tokens_details.reasoning_tokens`.

### Chat Completions plus streaming
```python
stream = client.chat.completions.create(
    model="muse-spark-1.3",
    messages=[{"role": "user", "content": "Explain how garbage collection works in Python."}],
    stream=True,
)
for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)
```

### Structured output (JSON schema)
```python
response = client.chat.completions.create(
    model="muse-spark-1.3",
    messages=[
        {"role": "system", "content": "Extract the address from the user input into the specified JSON format."},
        {"role": "user", "content": "Please format this address: 1 Hacker Wy Menlo Park CA 94025"},
    ],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "Address",
            "schema": {
                "type": "object",
                "properties": {
                    "street": {"type": "string"},
                    "city": {"type": "string"},
                    "state": {"type": "string", "description": "2-letter state abbreviation"},
                    "zip": {"type": "string", "description": "5-digit zip code"},
                },
                "required": ["street", "city", "state", "zip"],
            },
        },
    },
)
```
Pydantic version:
```python
from pydantic import BaseModel

class Address(BaseModel):
    street: str
    city: str
    state: str
    zip: str

response = client.beta.chat.completions.parse(
    model="muse-spark-1.3",
    messages=[
        {"role": "system", "content": "Extract the address from the user input."},
        {"role": "user", "content": "Please format this address: 1 Hacker Wy Menlo Park CA 94025"},
    ],
    response_format=Address,
)
address = response.choices[0].message.parsed
```
In Responses, the equivalent is `text={"format": {"type": "json_schema", "name": ..., "schema": ...}}`. `strict` defaults to false, and output is constrained either way.

### Tool calling (chat, multi-turn)
```python
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Return current weather for the given location.",
        "parameters": {
            "type": "object",
            "properties": {"location": {"type": "string", "description": "City name"}},
            "required": ["location"],
        },
    },
}]
messages = [{"role": "user", "content": "What is the weather in Seattle?"}]
response = client.chat.completions.create(model="muse-spark-1.3", messages=messages, tools=tools)
msg = response.choices[0].message
messages.append({
    "role": "assistant",
    "content": msg.content or "",
    "tool_calls": [
        {"id": tc.id, "type": "function",
         "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
        for tc in msg.tool_calls
    ],
})
for tc in msg.tool_calls:
    args = json.loads(tc.function.arguments)
    result = get_weather(**args)
    messages.append({"role": "tool", "tool_call_id": tc.id, "content": json.dumps(result)})
response = client.chat.completions.create(model="muse-spark-1.3", messages=messages, tools=tools)
print(response.choices[0].message.content)
```
You MUST include the full assistant tool_calls message, or the request returns a 400.

### Vision input (Responses)
```python
response = client.responses.create(
    model="muse-spark-1.3",
    input=[{
        "type": "message", "role": "user",
        "content": [
            {"type": "input_text", "text": "What is in this image?"},
            {"type": "input_image", "image_url": "https://... or data:image/png;base64,..."},
        ],
    }],
)
```

## Muse Image (muse-image-1.0)
There are two ways to call it.

A) Single-shot, OpenAI Images-compatible:
```python
response = client.images.generate(
    model="muse-image-1.0",
    prompt="a watercolor painting of a red fox sitting in a snowy pine forest, soft golden morning light",
    n=1,
)
image_b64 = response.data[0].b64_json   # default output is webp
```
Edit:
```python
with open("fox.png", "rb") as image:
    response = client.images.edit(
        model="muse-image-1.0",
        prompt="add a small red wool hat on the fox's head, keep the snowy forest background",
        image=image,
        n=1,
    )
```
- The raw-HTTP edit also accepts a JSON body with `images: [{"image_url": ...} | {"file_id": ...}]` (1 to 10 items).
- Meta extras go through `extra_body`: `{"reasoning_strength": "low"|"high", "tool_enablement": {"enable_image_search": bool, "enable_web_search": bool, "enable_shell": bool}}`. Use "low" with tools off for speed.
- `n` can be 1 to 10. An unknown top-level param such as `seed` returns 400. Do not send `moderation`; it returns 400. A content-policy block returns 400 with `content_policy_violation`. A 503 is retryable.
- Response shape: `{"created", "data":[{"b64_json"}], "output_format":"webp", "background":"opaque", "usage":{...}}`.
- Streaming (`stream: true`) emits a single `image_generation.completed` SSE event carrying `b64_json`.

B) Responses, which handles multi-turn editing:
```python
t1 = client.responses.create(model="muse-image-1.0", input="a red fox trotting through fresh snow, golden hour")
image_b64 = next(o.result for o in t1.output if o.type == "image_generation_call")
t2 = client.responses.create(model="muse-image-1.0", previous_response_id=t1.id,
                             input="now make it night, with the aurora overhead")
```
- Controls: `tools=[{"type":"image_generation","enable_web_search":False,"enable_shell":False,"reasoning_strength":"low","size":"1536x1024","output_format":"png"}]`.
- `size` sets only the aspect ratio. ONLY the `image_generation` tool is allowed; anything else returns 400.

## SAM 3.1 (sam-3.1), called through the Responses API
- Request: one user message containing an `input_text` (a SHORT noun phrase, ONE concept per request; "a, b" lists return 0 matches; commands and questions are unreliable) plus an `input_image` (`image_url`: a URL or data URL) or an `input_video` (`video_url` or `file_id`).
- Alternatively, box and point prompts (not combinable with a phrase); build them with `meta_sam_parser.build_object_prompt`.
- Metadata values are STRINGS: `metadata={"include_confidence":"true", "mask_encoding":"one_bit"|"lossless", "propagation_direction":"both"|"forward"|"backward"}`.
- Streaming is recommended but optional. A non-streaming request returns the same text in output_text.
- Zero matches means empty output_text. That is not an error.
- Limits: MP4/MOV (H.264, H.265, MPEG-4; no WebM or VP9), at most 15,000 frames, 16 tracked objects per video frame, all instances returned for images.
- Upload video with `client.files.create(file=..., purpose="user_data")` and reuse the file_id.

```python
with client.responses.stream(
    model="sam-3.1",
    input=[{
        "type": "message", "role": "user",
        "content": [
            {"type": "input_text", "text": "glasses"},
            {"type": "input_image", "image_url": "https://example.com/photo.png"},
        ],
    }],
) as stream:
    for event in stream:
        if event.type == "response.output_text.delta":
            print(event.delta, end="", flush=True)
```

Output format: special-token TEXT, one line per frame:
```
<0f>0<|box;x1=353;y1=382;x2=453;y2=427;w=537;h=561|><|mask;x=0;y=0;data=46,101,~...|>,1<|box;...|><|mask;...|>
```
- `<Nf>` is the frame index (an image is always `<0f>`; video frames can skip and may come out of order).
- The leading int is the object id (stable within a response, not dense).
- The box is x1,y1,x2,y2 in source pixels, followed by w and h of the source frame.
- Mask: `data=H,W,<enc><base85 payload>`. H comes first. `~` means lossless, `!` means one_bit. The payload is BASE85, not base64. The mask raster is small (H×W) and matches the box size. In the cookbook example, box 751..925 × 290..493 gives mask w=174, h=203, so the mask goes at (x1, y1) in the frame. This is my inference from the example, so check it. The parser's boxes use half-open right/bottom.
- Do not decode by hand. Use the parser:
```python
from meta_sam_parser import (parse_responses_stream, image_segmentation_format,
                             video_segmentation_format, decode_mask_to_raster)
# async: feed the SDK's async event stream
result = await parse_responses_stream(response_events, image_segmentation_format()).final_result()
# result.records holds SegmentationBoxRecord / SegmentationMaskRecord entries (object_id is a str, plus frame)
# decode_mask_to_raster(mask) gives a row-major 0/1 array of H*W
# decode_mask_to_rle(mask) gives COCO RLE {size:[h,w], counts}
# decode_mask_to_svg_path(mask) gives an "M..L..Z" path string
```
Package root exports: image_segmentation_format, video_segmentation_format, parse_responses_stream, CompletedOutcome, IncompleteOutcome, decode_mask_to_raster, decode_mask_to_rle, decode_mask_to_svg_path, build_object_prompt, PromptObject, FramePrompt, PromptBox, PromptPoint, SegmentationBoxRecord, SegmentationMaskRecord.
Sync parsing of accumulated text:
```python
from meta_sam_parser import CompletedOutcome, image_segmentation_format
parser = image_segmentation_format().create_parser()
parser.push(full_output_text)
finished = parser.finish(CompletedOutcome())
result = finished.result
```
Cookbook (image and video, Python): https://dev.meta.ai/docs/cookbook/sam-api-basics (files python/01_segment_image.py and 02_upload_and_segment_video.py). Playground: https://github.com/meta-models/meta-sam

## Sources
- https://dev.meta.ai/docs/models.md, quickstart.md, authentication.md, sdks.md, pricing-rate-limits.md
- https://dev.meta.ai/docs/structured-output.md, tool-calling.md, reasoning.md, protocols/chat-completions.md
- https://dev.meta.ai/docs/image-generation.md, media-segmentation.md, sam/segmenting.md, sam/reading-segmentation.md, sam/client-libraries.md, cookbook/sam-api-basics.md
- https://pypi.org/project/meta-sam-parser/ ; https://docs.litellm.ai/docs/providers/meta
- $20 credits: https://propakistani.pk/2026/07/11/meta-launches-muse-spark-1-1-with-its-first-paid-ai-model-api/ , https://letsdatascience.com/news/meta-opens-muse-spark-11-to-developers-via-model-api-f9b336cb
