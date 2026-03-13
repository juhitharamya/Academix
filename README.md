<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e4327e77-3dcf-444c-a90a-a7b176cba261

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run backend (Swagger testing):
   - `cd backend`
   - PowerShell: `$env:API_PORT=3002; npm.cmd run dev`
   - Swagger: `http://localhost:3002/swagger`
4. Run frontend:
   - `cd frontend`
   - PowerShell: `$env:PORT=3001; $env:API_PORT=3002; npm.cmd run dev`
   - App: `http://localhost:3001`

You can also run both together from the repo root with `npm run dev` (uses `PORT=3001`, `API_PORT=3002` by default).

## Dev architecture (refactored)

- Frontend (Vite) runs on `PORT` (default `3001`).
- Backend API (Express) runs on `API_PORT` (default `3002`) and serves Swagger at `/swagger`.
- SQLite DB file is stored at `database/academix.db`.
- Vite proxies `/api`, `/swagger`, and `/api-docs.json` to the backend so the frontend can keep using relative `/api/...` URLs.

### Backend-only (Swagger testing)

- PowerShell:
  - `cd backend; $env:API_PORT=3002; npm.cmd run dev`
- Open Swagger:
  - `http://localhost:3002/swagger`
