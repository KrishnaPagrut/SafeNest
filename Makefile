.PHONY: dev backend frontend test demo lint fmt check

# Override if :8000 is taken, e.g. `make dev PORT=8010`. The Vite proxy reads VITE_API_PORT.
PORT ?= 8000

backend:
	cd backend && uv run uvicorn app.main:app --reload --port $(PORT)

frontend:
	cd frontend && VITE_API_PORT=$(PORT) npm run dev

dev:
	$(MAKE) -j2 backend frontend

test:
	cd backend && uv run pytest -q

lint:
	cd backend && uv run ruff check . && uv run ruff format --check .
	cd frontend && npm run lint && npm run format:check

fmt:
	cd backend && uv run ruff check --fix . && uv run ruff format .
	cd frontend && npm run format

# What CI runs.
check: lint test
	cd frontend && npm run build

demo:
	cd backend && SAFENEST_CACHE_ONLY=1 uv run uvicorn app.main:app --port $(PORT) & cd frontend && VITE_API_PORT=$(PORT) npm run dev
