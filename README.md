# TickPulse

TickPulse is a personal task manager with a three-column workspace (lists, virtualized task list, editor) and a month calendar. Data lives in MySQL; the UI talks to a Go API over cookie sessions.

| Service | Address |
|---|---|
| Frontend | http://localhost:3001 |
| API | http://localhost:3000 |
| MySQL | Docker, published as `localhost:${MYSQL_PORT}` (default `3306`), database `tickpulse_db` |

Run the frontend and the Go API together. CORS is locked to `http://localhost:3001`, and the UI is hardcoded to call `http://localhost:3000`.

## Features

- Email/password accounts, plus optional Google and GitHub OAuth
- Per-user **Inbox** (cannot be deleted); custom lists with drag-and-drop order
- Tasks with status (`pending`, `completed`, `cancelled`, `deleted`), priority, deadline, notes, and optional time range
- Smart filters: All, Today, Next 7 Days, Completed, Won't Do, Trash
- Multi-select (`Ctrl`/`Cmd` click, `Shift` range) and block drag-and-drop
- LexoRank ordering computed on the server from neighbor ids (`prev_id` / `next_id`)
- Virtualized middle column (`@tanstack/react-virtual` + `@dnd-kit`)
- Month calendar
- Light / dark theme
- HttpOnly session cookie `connect.sid` (24 hours)

## Requirements

- Node.js 18+
- Go 1.23+
- Docker Desktop (MySQL 8 only; `docker run hello-world` is enough to confirm Docker works)

## Quick start

### 1. Install frontend dependencies

From the repository root:

```bash
npm install
```

Go modules download on the first `go run` or `go test`.

### 2. Configure environment

The Go process reads `backend-go/.env` (also found if you start from the repo root). Copy the example and edit it:

```bash
cp backend-go/.env.example backend-go/.env
```

On Windows PowerShell:

```powershell
Copy-Item backend-go\.env.example backend-go\.env
```

Required values:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=change-me
MYSQL_DATABASE=tickpulse_db

PORT=3000
ACCESS_TOKEN_SECRET=replace-with-a-long-random-string
CLIENT_URL=http://localhost:3001
```

`MYSQL_PASSWORD` is also the Docker MySQL root password. Google / GitHub OAuth is optional; email login works without those keys.

### 3. Start MySQL

Compose loads `backend-go/.env` automatically:

```bash
cd backend-go
docker compose up -d
docker compose ps
```

Wait until the container is **healthy**. The first start pulls `mysql:8.0`.

If port `3306` is already taken (a local MySQL service is a common cause), set `MYSQL_PORT=3307` in `backend-go/.env`. Compose publishes `3307:3306`, and the Go API connects to `3307`.

Stop the container (volume data is kept):

```bash
docker compose down
```

The API creates `tickpulse_db` and tables on startup. If `Tasks.sort_order` is still a numeric type from an older schema, it is rewritten to LexoRank strings automatically.

### 4. Start the API

```bash
cd backend-go
go run ./cmd/server
```

You should see something like:

```text
Database tickpulse_db created or already exists
MySQL connected
All tables created or already exist
Server is running on port 3000
```

Gin debug / trusted-proxy warnings are safe to ignore locally. On Windows, `exit status 0xc000013a` after Ctrl+C is a normal stop, not a crash.

### 5. Start the frontend

In a second terminal, from the repository root. Next.js defaults to port 3000, so you must use **3001**:

```bash
npm run dev -- -p 3001
```

Open http://localhost:3001.

### 6. Seed a login account

`go test` creates users and deletes them afterward, so those accounts cannot be used in the UI. Seed a stable user:

```bash
cd backend-go
go run ./cmd/inituser
```

Default credentials (reused if the user already exists; extra random lists and tasks are always appended):

- Email: `test@tickpulse.com`
- Password: `Password.123!`

Defaults: 5 extra categories and 16 tasks. Override with:

```bash
# Unix
INIT_CATEGORIES=8 INIT_TASKS=30 go run ./cmd/inituser

# PowerShell
$env:INIT_CATEGORIES = "8"
$env:INIT_TASKS = "30"
go run ./cmd/inituser
```

Optional: `INIT_EMAIL`, `INIT_PASSWORD`. Then sign in at http://localhost:3001/login.

Sign-up passwords must be 8–63 characters and include uppercase, lowercase, a digit, and one of `!@#$%^&*.`.

## Project layout

```text
.
├── src/                     Next.js App Router UI
│   ├── app/                 Routes: /, /login, /sign-up, /webapp, /webapp/calendar
│   ├── components/          Task list, calendar, editor, chrome
│   ├── context/             Auth, tasks, theme, toasts
│   └── lib/                 Selection, reorder, and section helpers
├── backend-go/
│   ├── cmd/server           HTTP API
│   ├── cmd/inituser         Seed a local login user
│   ├── cmd/rebalance-sort   Inspect / rewrite duplicate LexoRanks
│   ├── cmd/bench-sql        Optional SQL shape benchmark
│   ├── cmd/bench-category   Optional category-filter vs full-list benchmark
│   ├── internal/            Config, db, handlers, models, sessions
│   ├── test_module/         HTTP API tests against real MySQL
│   └── docker-compose.yml   MySQL 8
└── package.json             Frontend scripts
```

Frontend routes:

| Path | Page |
|---|---|
| `/` | Landing |
| `/login`, `/sign-up` | Auth |
| `/auth/callback` | OAuth return |
| `/webapp` | Task workspace |
| `/webapp/calendar` | Month calendar |
| `/calendar` | Redirects to `/webapp/calendar` |

## API (Go)

Session cookie: `connect.sid`. Task and category routes require a logged-in session.

| Method | Path | Notes |
|---|---|---|
| GET | `/auth/check` | Current session |
| POST | `/auth/sign-up` | `{ email, password }` |
| POST | `/auth/login` | `{ email, password }` |
| POST | `/auth/logout` | |
| GET | `/auth/google`, `/auth/github` | OAuth start |
| GET | `/auth/google/callback`, `/auth/github/callback` | OAuth return |
| GET | `/api/tasks` | Optional `?category_id=` |
| POST | `/api/tasks` | Create |
| GET/PUT/DELETE | `/api/tasks/:taskId` | Read / patch / delete |
| PUT | `/api/tasks/:taskId/reorder` | `{ prev_id, next_id }` |
| PUT | `/api/tasks/reorder` | `{ ids, prev_id, next_id }` (multi-select, max 100) |
| GET/POST | `/api/categories` | List / create |
| GET | `/api/categories/:categoryId` | Tasks in that list |
| PUT | `/api/categories/:categoryId` | Rename / color |
| PUT | `/api/categories/:categoryId/order` | `{ prev_id, next_id }` |
| DELETE | `/api/categories/:categoryId` | Moves tasks to Inbox |
| GET/PUT | `/api/license` | Stored key; not enforced on sign-up or calendar yet |
| GET | `/api/data` | Unauthenticated health-style payload |

Drag-and-drop sends neighbor ids only. Do not send LexoRank strings from the client.

Deleting a list moves its tasks to that user's Inbox (`inbox_<userId>`). Inbox cannot be deleted.

## License keys (not wired into the product flow)

`GET` / `PUT /api/license` and a demo catalog in `backend-go/internal/license` exist for later billing. Sign-up and calendar do **not** require a key today, so local and demo use is not blocked.

Demo keys (tests / future UI only):

- Normal: `BK67-M61S-DH4Y-H6E9`
- Premium: `NBUN-JW8N-SUIS-451N`

## Tests

### Go API (recommended)

You do **not** need to start the API yourself. Tests spin up a temporary HTTP server, use the real MySQL from `.env`, and delete the users they create.

```bash
cd backend-go
go test ./internal/models ./internal/license ./test_module -count=1 -v
```

Coverage:

- `internal/license` — demo key catalog
- `internal/models` — LexoRank helpers
- `test_module/initial_api_test.go` — sign-up → login → create task → list categories → 401 after logout
- `test_module/session_test.go` — two-user isolation, forged cookie, logout
- `test_module/crud_security_test.go` — wrong password, duplicate email, cross-user CRUD, Inbox protection, tasks moved to Inbox
- `test_module/license_test.go` — `/api/license` needs auth; sign-up does not require a key
- `test_module/index_test.go` — list indexes exist

Optional query timing (seeds a throwaway user, then deletes it):

```bash
# Unix
TICKPULSE_STRESS=1 TICKPULSE_STRESS_N=10000 go test ./test_module -run TestListTasksQueryTiming -count=1 -v

# PowerShell
$env:TICKPULSE_STRESS = "1"
$env:TICKPULSE_STRESS_N = "10000"
go test ./test_module -run TestListTasksQueryTiming -count=1 -v
```

### Frontend list helpers

No browser required:

```bash
npm run test:lib
```

## Extra Go commands

All run from `backend-go/` and use the same `.env` MySQL.

```bash
go run ./cmd/rebalance-sort          # inspect duplicate task ranks
go run ./cmd/rebalance-sort --apply  # rewrite them to unique LexoRanks

go run ./cmd/bench-sql               # compare list SQL shapes (default 3000 rows)
go run ./cmd/bench-category          # category-filtered list vs full list
```

Bench tools seed a throwaway user and delete those rows when they finish. Optional env: `BENCH_N`, `BENCH_ROUNDS`; `bench-category` also uses `BENCH_CATEGORIES`.

## OAuth (optional)

Create a Google OAuth client and/or a GitHub OAuth App, then set `*_CLIENT_ID`, `*_CALLBACK_URL`, and secrets in `backend-go/.env`.

Suggested local callbacks:

- Google: `http://localhost:3000/auth/google/callback`
- GitHub: `http://localhost:3000/auth/github/callback`

After the provider returns, the API serves a small HTML page that navigates to the frontend so the session cookie is not dropped on a cross-origin 302.

## Troubleshooting

**`Error 1049 Unknown database 'tickpulse_db'`**  
MySQL is up but the database is missing. Current Go code creates it on start. Confirm `MYSQL_DATABASE` in `backend-go/.env` and that `docker compose ps` is healthy.

**`Error 1045 Access denied`**  
`MYSQL_USER` / `MYSQL_PASSWORD` do not match the container. Start Compose from `backend-go` so it uses the same `.env` as the API.

**`Bind for 0.0.0.0:3306 failed`**  
Something else owns 3306. Stop that MySQL, or set `MYSQL_PORT` to a free port (for example `3307`).

**Login fails or CORS errors**  
Frontend must be 3001 and API 3000. Only one process should listen on 3000.

**Google / GitHub login never returns**  
The OAuth app and env vars are missing or the callback URL is wrong. Email/password sign-up is independent of OAuth.
