# Demo deploy — ngrok backend + Vercel frontend (no Git, no Docker, no card)

Live Servers-stock backend, runs on YOUR machine, exposed via ngrok. Frontend on Vercel.

> This is a **live-while-you're-online** demo: your PC must be on with the backend +
> Postgres + ngrok all running while the client uses the link. Close your laptop → demo
> goes down. Perfect for showing a client on a call; not an always-on public link.

---

## One-time setup

### 1. ngrok account + static domain  (https://ngrok.com — free, no card)
1. Sign up, then install ngrok (Windows): `winget install ngrok.ngrok`
2. Add your authtoken (shown in the ngrok dashboard):
   `ngrok config add-authtoken <YOUR_TOKEN>`
3. In the dashboard → **Domains** → **Create Domain** → you get ONE free static domain,
   e.g. `sheeltron-demo.ngrok-free.app`. Copy it. (Static = URL never changes, so you
   only build the frontend once.)

### 2. Build the frontend with that domain baked in  (from `Configurator/Frontend`)
```powershell
$env:VITE_API_BASE_URL = "https://sheeltron-demo.ngrok-free.app"   # your static domain, https, no trailing slash
npm run build
```

### 3. Deploy frontend to Vercel  (https://vercel.com — free, no card)
- Vercel → **Add New → Project**, drag in the `Configurator/Frontend/dist` folder.
- You get the demo link, e.g. `https://sheeltron-demo.vercel.app` — this is what you share.

---

## Every time you want to show the demo (3 things running)

Open 3 terminals (or run the first two in the background):

1. **Postgres** — make sure your local DB is up (your normal setup / docker compose up -d db).
2. **Backend** (from `Configurator/Backend`):
   ```powershell
   go run main.go        # listens on :8080, connects local Postgres, runs migrations
   ```
3. **ngrok** — expose 8080 on your static domain:
   ```powershell
   ngrok http --domain=sheeltron-demo.ngrok-free.app 8080
   ```

Then open the Vercel link → it calls your backend through ngrok → live data. ✅

> Tip: open the Vercel link yourself once before the client joins, to confirm the
> Servers-stock list loads (proves all 3 pieces are connected).

---

## Why the two code tweaks are already done
- **CORS:** backend already allows all origins (`middleware.CORS()`), so the Vercel
  origin can call it — no change needed.
- **ngrok warning page:** `src/lib/api.ts` now sends the `ngrok-skip-browser-warning`
  header, so API calls return JSON instead of ngrok's interstitial HTML. (Harmless on
  any other host.)

## If the backend URL ever changes
Only if you DON'T use the static domain. Re-run step 2 with the new URL and re-drag
`dist` into Vercel. With the static domain, you never need to rebuild.
