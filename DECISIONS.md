# Decisions

- Keyframes (1 fps, ≤45) instead of raw video to Spotter and SAM by default: cheaper, cacheable, frame-addressable
  overlays. SAM video tracking is a flag (`SAFENEST_SAM_VIDEO=1`) to try once keyframes work.
- Masks are shipped to the frontend as SVG paths in frame pixels (parser's `decode_mask_to_svg_path`, offset by box)
  so the canvas can `new Path2D()` them with no decoding on the client.
- Chat Completions + `response_format: json_schema` for Spotter/Critic (constrained decoding); Responses API for SAM.
- `reasoning_effort="low"` for Spotter/Critic to keep latency down; revisit if quality is poor.
