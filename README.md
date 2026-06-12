# OMEGA — Autonomous Reality Defense System

Self-improving multi-agent crisis response built for **Langfuse**: distributed tracing, LLM-as-judge evals, human feedback loops, prompt management, golden dataset CI, and a live operator dashboard.

## Repo structure

```
omega/
├── backend/          # Python FastAPI + LangGraph + Langfuse
├── web/              # Next.js operator dashboard
├── mcp/              # Langfuse MCP config
├── Makefile
└── .github/workflows/
```

## Quick start

### Backend (port 8001)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add LANGFUSE_* and GOOGLE_API_KEY (or OMEGA_DEMO_MODE=true)
python run.py
```

### Dashboard (port 3000)

```bash
cd web
npm install
npm run dev
# open http://localhost:3000
```

Set `NEXT_PUBLIC_OMEGA_API_URL=http://localhost:8001` in `web/.env.local` if needed.

### Demo data

```bash
make seed      # 50 synthetic incidents
make regression
```

## Push to GitHub

```bash
cd /Users/nikitha/Documents/GitHub/omega
git init
git add .
git commit -m "Initial commit: OMEGA multi-agent system with Langfuse"
git remote add origin https://github.com/Sbnikitha/omega.git
git push -u origin main
```

Create the empty repo `Sbnikitha/omega` on GitHub first if it doesn't exist.

## Langfuse features

1. Cross-agent distributed tracing (one trace per incident)
2. LLM-as-judge auto-scores
3. Human approval → Langfuse scores
4. Prompt Management (zero-downtime deploy)
5. Self-improving prompt optimizer
6. Golden dataset + CI regression gate
7. NL incident queries (MCP pattern)
