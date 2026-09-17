# TickPulse

任务管理应用：Next.js 前端 + Go（当前主力）/ Node（旧版）后端 + MySQL。

| 服务 | 地址 |
|---|---|
| 前端 | http://localhost:3001 |
| API | http://localhost:3000 |
| MySQL | Docker 容器映射到 localhost:3306，库名 `tickpulse_db` |

前端和后端必须**同时**开着。两个后端都监听 3000，不要一起启动。

## 环境要求

- Node.js（建议 18+）
- Go 1.23+
- Docker Desktop（只需跑 MySQL；`docker run hello-world` 能成功即可）
- 两个终端窗口（一个后端、一个前端）

## 1. 安装依赖

在仓库的 `tickpulse` 目录：

```powershell
cd F:\CSCI3100_Project\tickpulse
npm install
cd backend
npm install
```

Go 模块会在第一次 `go run` / `go test` 时自动下载。

## 2. 配置 MySQL 和 `.env`

Go 后端只读 `backend-go/.env`。可从 `backend-go/.env.example` 复制一份。至少包含：

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=你的MySQL密码
MYSQL_DATABASE=tickpulse_db

PORT=3000
ACCESS_TOKEN_SECRET=任意一串密钥
CLIENT_URL=http://localhost:3001

# GitHub OAuth（可选）
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=
# GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

Google / GitHub 登录可选；不填也不影响邮箱密码登录。`MYSQL_PASSWORD` 会同时用作 Docker MySQL 的 root 密码。

在 `backend-go` 目录启动数据库容器（Compose 会自动读同目录的 `.env`）：

```powershell
cd F:\CSCI3100_Project\tickpulse\backend-go
docker compose up -d
```

第一次会拉取 `mysql:8.0` 镜像。等容器 healthy 后再开后端。查看状态：

```powershell
docker compose ps
```

停止容器（数据仍在 volume 里）：

```powershell
docker compose down
```

如果本机已经有 MySQL 占用 3306（例如 Windows 服务 `MySQL267`），把 `backend-go/.env` 里的 `MYSQL_PORT` 改成 `3307`。Compose 会映射 `3307:3306`，Go 后端也会连 3307。当前推荐这样和本机 MySQL 并存。

Go 后端启动时会自动执行 `CREATE DATABASE IF NOT EXISTS tickpulse_db` 并建表。也可以自己执行：

```sql
CREATE DATABASE IF NOT EXISTS tickpulse_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

## 3. 启动后端（Go，推荐）

```powershell
cd F:\CSCI3100_Project\tickpulse\backend-go
go run ./cmd/server
```

成功时大致会看到：

```text
Database tickpulse_db created or already exists
MySQL connected
All tables created or already exist
Server is running on port 3000
Listening and serving HTTP on :3000
```

Gin 的 debug warning（debug mode、trusted proxies）在本地开发可以忽略。`exit status 0xc000013a` 是 Windows 上 Ctrl+C 停进程，不是崩溃。

### 旧版 Node 后端（一般不用）

```powershell
cd F:\CSCI3100_Project\tickpulse\backend
npm run dev
```

## 4. 启动前端

另开一个终端。Next 默认也是 3000，必须指定 **3001**，才能和 API、CORS 对上：

```powershell
cd F:\CSCI3100_Project\tickpulse
npm run dev -- -p 3001
```

浏览器打开 http://localhost:3001 。

分类和任务拖曳排序时，前端只提交前后邻居的 id（`prev_id` / `next_id`），**LexoRank 在 Go 后端计算**。任务列表支持 Ctrl/Cmd 多选、Shift 范围选，拖曳其中一个会把整组按相对顺序一起移动（`PUT /api/tasks/reorder`，body 含 `ids`）。请使用 `go run ./cmd/server`，不要用旧 Node 后端测拖曳。启动时若 `Tasks.sort_order` 仍是 DOUBLE，会自动改成 VARCHAR 并重写为 LexoRank。

## 5. 准备一个能登录前端的测试账号

`go test` 里创建的用户测完会删掉，不能拿来登界面。用：

```powershell
cd F:\CSCI3100_Project\tickpulse\backend-go
go run ./cmd/inituser
```

默认账号（已存在会复用，并**再追加**一批随机分类和任务）：

- 邮箱：`test@tickpulse.com`
- 密码：`Password.123!`

默认追加 5 个分类、16 个任务。改数量：

```powershell
$env:INIT_CATEGORIES = "8"
$env:INIT_TASKS = "30"
go run ./cmd/inituser
```

然后在 http://localhost:3001/login 登录。

## 授权密钥（未接入产品流程）

注册和日历**暂时不检查** license，避免本地/演示测试被挡住。目录和 `GET/PUT /api/license` 仍留在 Go 里，以后接支付再挂到注册或日历即可。

## 6. 跑测试

### Go 自动化测试（推荐）

**不必**先手动启动 API。测试会自己起临时 HTTP 服务，连真实 MySQL，测完清掉测试用户。

```powershell
cd F:\CSCI3100_Project\tickpulse\backend-go
go test ./internal/models ./internal/license ./test_module -count=1 -v
```

覆盖内容：

- `internal/license`：预留的演示密钥目录（产品流程尚未使用）
- `test_module/license_test.go`：预留的 `/api/license`（未登录 401；注册不要求 key）
- `test_module/initial_api_test.go`：注册 → 登录 → 建任务 → 列分类 → 登出后再建任务应 401
- `test_module/session_test.go`：双用户 session 隔离、伪造 cookie、登出失效
- `test_module/crud_security_test.go`：错密码、重复邮箱、越权读写删、Inbox 不可删、删分类后任务回 Inbox

可选压测（播种后计时查询，用完删除临时用户）：

```powershell
$env:TICKPULSE_STRESS = "1"
$env:TICKPULSE_STRESS_N = "10000"
go test ./test_module -run TestListTasksQueryTiming -count=1 -v
```

### 旧 Node 脚本（`backend/test_module`）

需要**已经在跑**的 API（3000）。这些脚本没有按 Go 测试那套改过，主要问题：

- `initial_api_test.js`：每次随机邮箱，适合当时手动抄账号；登出后打的是错误路径 `/tasks`
- `session_test.js`：写死了另一台电脑上的用户，这台库里通常不存在
- `seed.js` / `stress-test.js`：写死 user id / category id

日常请用上面的 `go test` 和 `go run ./cmd/inituser`。

若仍要跑旧脚本：

```powershell
cd F:\CSCI3100_Project\tickpulse\backend\test_module
node initial_api_test.js
```

## 常见问题

**`Error 1049 Unknown database 'tickpulse_db'`**  
容器已起但库还不存在。更新后的 Go 后端会自动建库；若仍报错，确认 `backend-go/.env` 里的库名，并在 `backend-go` 下检查 `docker compose ps` 是否为 healthy。

**`Error 1045 Access denied`**  
`MYSQL_USER` / `MYSQL_PASSWORD` 和 Docker MySQL 不一致。请在 `backend-go` 目录用 `docker compose up -d`，保证密码来自同一份 `backend-go/.env`。

**`Bind for 0.0.0.0:3306 failed: port is already allocated`**  
3306 被本机 MySQL 或其他进程占用。停掉本机 MySQL，或把 `MYSQL_PORT` 改成空闲端口（如 3307）。

**前端能开但登录失败 / CORS**  
确认前端是 3001、后端是 3000，且没有两个后端抢同一个端口。

**Google / GitHub 登录跳不过去**  
需要在 Google Cloud 或 GitHub OAuth App 配好，并填对应的 `*_CLIENT_ID`、`*_CLIENT_SECRET`、`*_CALLBACK_URL`。GitHub 回调地址用 `http://localhost:3000/auth/github/callback`。本地邮箱注册不受影响。
