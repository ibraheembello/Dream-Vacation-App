# 🌍 Dream Vacation App — Dockerized

[![Backend CI/CD](https://github.com/ibraheembello/Dream-Vacation-App/actions/workflows/backend.yml/badge.svg)](https://github.com/ibraheembello/Dream-Vacation-App/actions/workflows/backend.yml)
[![Frontend CI/CD](https://github.com/ibraheembello/Dream-Vacation-App/actions/workflows/frontend.yml/badge.svg)](https://github.com/ibraheembello/Dream-Vacation-App/actions/workflows/frontend.yml)

A full-stack app for saving dream vacation destinations. A **React** frontend
talks to a **Node.js/Express** API, which stores data in **PostgreSQL** and
enriches it with country data from the public [REST Countries](https://restcountries.com) API.

This repository containerizes the whole stack with **Docker** and orchestrates it
with **Docker Compose** — frontend, backend, and database run as isolated,
reproducible containers and start with a single command.

---

## 📸 Screenshot

The app running via `docker compose up --build` — React frontend (served by
nginx) reading from the Express backend and PostgreSQL:

![Dream Vacation App running in Docker containers](docs/screenshot.png)

---

## 🧱 Architecture

```
                        Host machine (your browser)
                                   │
              ┌────────────────────┼─────────────────────┐
              │ :3000                                     │ :3001
              ▼                                           ▼
   ┌────────────────────┐                      ┌────────────────────┐
   │   frontend          │                      │   backend          │
   │   React + nginx     │   REST Countries     │   Node + Express   │
   │   (static build)    │   (external API) ◄───┤                    │
   └────────────────────┘                      └─────────┬──────────┘
                                                          │ db:5432
                                                          ▼
                                               ┌────────────────────┐
                                               │   db                │
                                               │   PostgreSQL 16     │
                                               │   volume: db-data   │
                                               └────────────────────┘

   All three services share the custom bridge network "dvapp-net" and
   resolve each other by service name (backend → db).
```

| Service    | Image / Build              | Container port | Host port |
|------------|----------------------------|----------------|-----------|
| `frontend` | multi-stage build → nginx  | 80             | `3000`    |
| `backend`  | `node:18-alpine`           | 3001           | `3001`    |
| `db`       | `postgres:16-alpine`       | 5432           | *(internal only)* |

---

## 📂 Project structure

```
Dream-Vacation-App/
├── backend/
│   ├── Dockerfile          # Node API image (non-root, prod deps only)
│   ├── .dockerignore
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── Dockerfile          # Multi-stage: node build → nginx serve
│   ├── nginx.conf          # SPA routing + gzip + asset caching
│   ├── .dockerignore
│   └── src/ ...
├── db/
│   └── init.sql            # Auto-creates the `destinations` table on first boot
├── docker-compose.yml      # Orchestrates frontend + backend + db
├── .env.example            # Template for environment variables
├── .gitignore              # Ignores .env, node_modules, build output
└── README.md
```

---

## ✅ Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/) v2 (bundled with Docker Desktop)

Verify:

```bash
docker --version
docker compose version
```

---

## 🚀 Setup & Run (Runbook)

### 1. Clone the repository

```bash
git clone https://github.com/ibraheembello/Dream-Vacation-App.git
cd Dream-Vacation-App
```

### 2. Create your environment file

The app reads configuration and secrets from a `.env` file (never committed).
Copy the template and edit the values:

```bash
cp .env.example .env
```

`.env` contents (defaults work out of the box for local use):

```ini
POSTGRES_USER=dreamuser
POSTGRES_PASSWORD=change_me_to_a_strong_password
POSTGRES_DB=dreamvacations

BACKEND_PORT=3001
COUNTRIES_API_BASE_URL=https://restcountries.com/v3.1

REACT_APP_API_URL=http://localhost:3001
FRONTEND_PORT=3000
```

### 3. Build and start everything

```bash
docker compose up --build
```

This builds all images and starts the three containers. The backend waits for
PostgreSQL to be **healthy** before it starts (no race conditions). The
`destinations` table is created automatically on first launch.

Run detached (in the background) instead:

```bash
docker compose up --build -d
```

### 4. Open the app

| What        | URL                                  |
|-------------|--------------------------------------|
| Frontend    | http://localhost:3000                |
| Backend API | http://localhost:3001/api/destinations |

Type a country (e.g. `Japan`), click **Add Destination**, and it appears in the
list — data is persisted in PostgreSQL.

---

## 🔍 Verify it's working

```bash
# 1. All three containers are "Up" (db should be "healthy")
docker compose ps

# 2. Frontend is served by nginx (expect: HTTP/1.1 200 OK)
curl -I http://localhost:3000

# 3. Backend responds (expect: [] on first run, then JSON rows)
curl http://localhost:3001/api/destinations

# 4. Create a destination through the API
curl -X POST http://localhost:3001/api/destinations \
  -H "Content-Type: application/json" \
  -d '{"country":"Japan"}'

# 5. Confirm it persisted
curl http://localhost:3001/api/destinations

# 6. Confirm the table exists inside the db container
docker compose exec db psql -U dreamuser -d dreamvacations -c "\dt"

# 7. Confirm service-name networking (backend can resolve "db")
docker compose exec backend getent hosts db

# Tail logs for a specific service
docker compose logs -f backend
```

---

## 🔒 Persistence test (volumes work)

Data survives container restarts because PostgreSQL writes to the named
`db-data` volume:

```bash
docker compose down      # stop & remove containers (volume is KEPT)
docker compose up -d     # bring it back
curl http://localhost:3001/api/destinations   # your data is still there
```

To wipe the database too, remove the volume:

```bash
docker compose down -v   # stop containers AND delete the db-data volume
```

---

## 🧹 Teardown

```bash
# Stop and remove containers + network (keep data)
docker compose down

# Stop and remove containers + network + volume (delete data)
docker compose down -v

# Also remove the images this project built
docker compose down --rmi local -v
```

---

## ⚙️ How each requirement is met

| Task requirement                                   | Where / how                                                                 |
|----------------------------------------------------|------------------------------------------------------------------------------|
| Frontend multi-stage build, served with nginx      | `frontend/Dockerfile` (node build stage → nginx production stage)            |
| Backend exposes a port, installs deps, runs server | `backend/Dockerfile` (`npm ci`, `EXPOSE 3001`, `CMD node server.js`)         |
| Compose orchestrates frontend + backend + db       | `docker-compose.yml` (three services)                                        |
| PostgreSQL container                               | `db` service using `postgres:16-alpine`                                      |
| Env vars via `.env` file                           | `env_file: .env` + `environment:` + `${VAR}` substitution                    |
| Volume for the database                            | named volume `db-data` mounted at `/var/lib/postgresql/data`                 |
| Internal comms via service names                   | backend connects to `db:5432`; all on `dvapp-net`                            |
| Custom bridge network                              | `networks: dvapp-net: driver: bridge`                                        |
| Secrets kept out of source                         | `.env` is git-ignored; only `.env.example` is committed                      |
| `docker compose up --build` runs the app           | Verified end-to-end (DB schema auto-loaded via `db/init.sql`)               |

---

## 🛠️ Troubleshooting

- **Port already in use** — change `FRONTEND_PORT` / `BACKEND_PORT` in `.env`.
- **Frontend can't reach backend** — `REACT_APP_API_URL` is baked at *build* time;
  after changing it run `docker compose up --build` (not just `up`).
- **DB changes not taking effect** — `db/init.sql` only runs when the volume is
  empty. Run `docker compose down -v` to re-initialize from scratch.
- **Added countries show `N/A` / `0` details** — the public REST Countries
  `v3.1` API used by the original app was **deprecated upstream** (it now returns
  a deprecation notice instead of country data). The backend handles this
  gracefully: a destination is still saved and the app keeps working end-to-end,
  just with placeholder details. To restore rich data, point
  `COUNTRIES_API_BASE_URL` in `.env` at a working country API.

---

## 🔁 CI/CD Pipeline (GitHub Actions)

Every push and pull request automatically builds, tests, and (on push) publishes
Docker images. There are **two independent workflows** so the frontend and backend
pipelines run — and can fail — separately:

| Workflow file                       | Watches       | Node | Image published to GHCR                     |
|-------------------------------------|---------------|------|---------------------------------------------|
| `.github/workflows/backend.yml`     | `backend/**`  | 18   | `ghcr.io/ibraheembello/dream-vacation-app-backend`  |
| `.github/workflows/frontend.yml`    | `frontend/**` | 16   | `ghcr.io/ibraheembello/dream-vacation-app-frontend` |

### When it runs

```
push / pull_request  ──►  branches: main, dev
        │
        ├─ paths filter: only run the workflow whose folder changed
        │
        ▼
   ┌─────────────┐        ┌──────────────────────────┐
   │  CI job     │  needs │  CD job                   │
   │  (always)   ├───────►│  (push events only)       │
   │             │        │                           │
   │ • npm ci    │        │ • log in to GHCR          │
   │ • lint      │        │ • tag with commit SHA     │
   │ • npm test  │        │ • build & push image      │
   │ • docker    │        │                           │
   │   build     │        │                           │
   └─────────────┘        └──────────────────────────┘
```

### Multi-stage design (CI separated from CD)

Each workflow has **two jobs**:

1. **`ci`** — runs on *both* pushes and pull requests. Installs dependencies with
   `npm ci`, runs lint (`npm run lint --if-present`), runs the test suite
   (`npm test`), and verifies the Docker image actually builds. A broken PR is
   caught here **before** anything is published.
2. **`cd`** — declared with `needs: ci` (so it only runs if CI passed) and guarded
   by `if: github.event_name == 'push'` (so pull requests **never** publish an
   image). It logs in to the registry, computes tags, and pushes.

### Registry & authentication (GitHub Secrets)

Images are pushed to the **GitHub Container Registry (GHCR)**. Authentication uses
the built-in **`GITHUB_TOKEN`** secret — a scoped secret GitHub injects into every
run — so there are **no credentials to configure manually**:

```yaml
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}   # GitHub-provided secret
```

The `cd` job requests `packages: write` permission so that token is allowed to push.

> **Using Docker Hub instead?** Swap the login step's `registry`, `username`, and
> `password` for `${{ secrets.DOCKER_USERNAME }}` / `${{ secrets.DOCKER_TOKEN }}`
> and add those two values in **Settings → Secrets and variables → Actions**.

### Image tagging (commit SHA)

Tags are generated by `docker/metadata-action`:

- `type=sha` → every image is tagged with its **commit SHA** (e.g. `sha-1a2b3c4`)
- `type=ref,event=branch` → a moving tag per branch (e.g. `main`, `dev`)
- `type=raw,value=latest` → `latest`, applied **only on `main`**

### Pulling a published image

```bash
docker pull ghcr.io/ibraheembello/dream-vacation-app-backend:latest
docker pull ghcr.io/ibraheembello/dream-vacation-app-frontend:latest
# or pin to an exact commit:
docker pull ghcr.io/ibraheembello/dream-vacation-app-backend:sha-<commit>
```

Published images appear under the repo's **Packages** section on GitHub.

---

## ☁️ AWS Deployment (Stage 6)

The app is deployed to an **AWS EC2** instance, and the CI/CD pipeline's final
stage rolls out every push to `main` automatically over SSH.

### Infrastructure (custom VPC)

| Resource | Name | Detail |
|---|---|---|
| VPC | `dream-vpc` | `10.0.0.0/16` |
| Subnet | `dream-subnet` | `10.0.1.0/24` (public, auto-assign IP) |
| Internet Gateway | `dream-igw` | attached to `dream-vpc` |
| Route Table | `dream-rt` | `0.0.0.0/0 → dream-igw` |
| Security Group | `dream-sg` | inbound `22` (SSH), `80` (HTTP) |
| EC2 | `dream-ec2` | Ubuntu 22.04, `t2.micro`, Docker via user-data |
| Elastic IP | `dream-eip` | stable public address for the deploy target |

```
Internet ──► Elastic IP ──► EC2 (t2.micro, dream-subnet)
                                └── docker-compose.prod.yml
                                     ├── frontend (nginx :80)  ── proxies /api ──►┐
                                     ├── backend  (:3001, internal)  ◄────────────┘
                                     └── db (postgres, named volume)
```

The browser hits **`http://<EC2_PUBLIC_IP>/`**; nginx serves the React bundle and
proxies `/api/*` to the backend container over the internal Docker network — so
the backend port is never exposed publicly.

### The deploy pipeline — `.github/workflows/deploy.yml`

On every push to `main`:

1. **`build-and-push`** — builds the backend and frontend images and pushes them
   to GHCR tagged `:latest` and `:sha-<commit>`.
2. **`deploy`** (`needs: build-and-push`) — SSHes into the EC2 instance using the
   `EC2_SSH_KEY` secret, copies `docker-compose.prod.yml`, `deploy/remote-deploy.sh`
   and `db/`, then runs the rollout: log in to GHCR, `docker compose pull`,
   `docker compose up -d`. Finally it **smoke-tests** `http://<host>/` for HTTP 200.

`docker-compose.prod.yml` **pulls** the prebuilt images instead of building them —
essential on a 1 GB `t2.micro`, which can't compile the React bundle.

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `EC2_HOST` | EC2 Elastic IP (SSH + smoke-test target) |
| `EC2_SSH_KEY` | private key for the `dream-ec2-key` pair |
| `POSTGRES_PASSWORD` | DB password written into the on-box `.env` |
| `GITHUB_TOKEN` | *(built-in)* — GHCR auth for pulling images on the box |

### Deliverables

**VPC & subnet**
![dream-vpc and dream-subnet in the AWS console](docs/aws-vpc.png)

**EC2 instance running**
![dream-ec2 t2.micro running](docs/aws-ec2.png)

**App live in the browser** (`http://<EC2_PUBLIC_IP>/`)
![Dream Vacation App served from EC2](docs/app-browser.png)

**CI/CD deployment logs** (successful SSH rollout)
![Successful deploy pipeline run](docs/deploy-logs.png)

---

## 🧰 Technologies

- **Frontend**: React (Create React App), served by **nginx**
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 16
- **External API**: REST Countries API
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions → GitHub Container Registry (GHCR)
- **Cloud / Deployment**: AWS (custom VPC, EC2 `t2.micro`, Elastic IP)
