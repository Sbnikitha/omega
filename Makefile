.PHONY: install seed prompts regression run dashboard

install:
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	cd web && npm install

seed:
	cd backend && . .venv/bin/activate && OMEGA_DEMO_MODE=true python -m app.scripts.seed_synthetic_data

prompts:
	cd backend && . .venv/bin/activate && python -m app.scripts.setup_prompts

regression:
	cd backend && . .venv/bin/activate && OMEGA_DEMO_MODE=true python -m app.scripts.run_regression

run:
	cd backend && . .venv/bin/activate && OMEGA_DEMO_MODE=true python run.py

dashboard:
	cd web && npm run dev
