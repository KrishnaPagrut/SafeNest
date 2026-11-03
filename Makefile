.PHONY: dev backend frontend test demo lint

backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) -j2 backend frontend

test:
	cd backend && uv run pytest -q

lint:
	cd backend && uv run ruff check . && uv run ruff format --check .

demo:
	cd backend && SAFENEST_CACHE_ONLY=1 uv run uvicorn app.main:app --port 8000 & cd frontend && npm run dev
