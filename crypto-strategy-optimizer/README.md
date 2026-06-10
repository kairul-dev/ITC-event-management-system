# Crypto Strategy Optimizer

Stage 1 scaffold for a TradingView-like crypto strategy backtesting and optimization system using Bitget market data.

## Structure

```text
crypto-strategy-optimizer/
  backend/
  frontend/
  README.md
  .gitignore
```

## Backend

FastAPI app with a health check endpoint.

### Run backend

```powershell
cd crypto-strategy-optimizer\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```text
GET http://127.0.0.1:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "crypto-strategy-optimizer-backend"
}
```

## Frontend

Next.js TypeScript app with a basic dashboard and backend health connection test.

### Run frontend

Open a second terminal:

```powershell
cd crypto-strategy-optimizer\frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Then open:

```text
http://localhost:3000
```

The dashboard calls:

```text
http://127.0.0.1:8000/health
```

## Notes

- Early stages use Bitget public market endpoints only.
- Do not hardcode API keys.
- Store secrets in `.env` files only.
- `.env` files are ignored by git.
