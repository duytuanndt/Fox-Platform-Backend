# GitHub Team Stats - NestJS Backend Spec

> **Stack:** NestJS · TypeScript · @octokit/rest · Redis  
> **Architecture:** Hexagonal (Ports and Adapters), aligned with `docs/architecture.md`

---

## 1) System Objectives

Build an internal backend system to track team GitHub contributions:

- Number of commits by developer
- Number of lines added/deleted by developer
- Number of PRs opened/merged/closed
- Breakdown by repository
- Team-wide summary
- Leaderboard by multiple metrics
- GitHub contribution heatmap
- Filter by date range
- Export CSV

---

## 2) Business Goals

### 2.1 Key Outputs Required

- Team lead can review team performance over a selected period
- Team lead can view commits/lines/PR metrics per developer
- Team lead can compare developers on leaderboards
- Team lead can identify top-performing repositories
- Team lead can export CSV for internal reporting

### 2.2 Important Business Notes

GitHub activity is a proxy metric, not absolute productivity. UI/API documentation should include:

- More commits are not always better
- More lines of code are not always higher quality
- Squash/rebase merge strategies may distort commit attribution
- Author identity mapping (email/username) must be standardized
- Merge bots/dependency bots should be excluded from analytics

---

## 3) Module Structure (NestJS + Hexagonal)

The structure follows NestJS modules and port-adapter separation from `docs/architecture.md`.

```txt
src/
├── github-stats/
│   ├── domain/
│   │   ├── github-metric.ts
│   │   ├── developer-stat.ts
│   │   ├── repo-stat.ts
│   │   └── pull-request-stat.ts
│   ├── dto/
│   │   ├── query-stats.dto.ts
│   │   ├── leaderboard-query.dto.ts
│   │   ├── heatmap-query.dto.ts
│   │   └── export-query.dto.ts
│   ├── application/
│   │   ├── github-stats.service.ts
│   │   ├── leaderboard.service.ts
│   │   ├── heatmap.service.ts
│   │   └── export.service.ts
│   ├── infrastructure/
│   │   ├── github/
│   │   │   ├── github.module.ts
│   │   │   ├── github.client.ts
│   │   │   └── github.mapper.ts
│   │   ├── cache/
│   │   │   ├── cache.module.ts
│   │   │   └── redis-cache.adapter.ts
│   │   └── csv/
│   │       └── csv-export.adapter.ts
│   ├── ports/
│   │   ├── github-data.port.ts
│   │   ├── cache.port.ts
│   │   └── export.port.ts
│   ├── github-stats.controller.ts
│   └── github-stats.module.ts
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── pipes/
│   │   └── date-range-validation.pipe.ts
│   └── guards/
│       └── internal-auth.guard.ts
└── app.module.ts
```

### Mapping from Express concepts to NestJS

- `routes/*` -> `controller + module`
- `middleware/errorHandler` -> `ExceptionFilter`
- `middleware/rateLimit` -> `Guard/Interceptor`
- `services/*.js` -> `@Injectable()` application/infrastructure services
- `app.js` -> `main.ts` + `AppModule`

---

## 4) API Surface (NestJS Controllers)

Base route: `/github-stats`

- `GET /repos`
  - List repositories in scope (from config or org discovery)
- `GET /commits?from&to&dev&repo`
  - Commit counts by developer and repo
- `GET /lines?from&to&dev&repo`
  - Added/deleted/net lines by developer and repo
- `GET /prs?from&to&dev&repo&state=all|open|closed|merged`
  - PR counts and status split
- `GET /summary?from&to`
  - Team totals and per-repo rollups
- `GET /leaderboard?from&to&metric=commits|lines|prs|streak`
  - Ranked developer list by selected metric
- `GET /heatmap?from&to&dev`
  - Contribution heatmap buckets (day-level or week-level)
- `GET /export.csv?from&to&metric`
  - CSV export for reporting

All analytics endpoints must support date-range filtering via `from` and `to`.

---

## 5) Data and Processing Rules

### Contribution Aggregation

- Commits:
  - Use paginated GitHub commit listing
  - Exclude bot accounts by configured pattern list
- Lines changed:
  - Aggregate additions/deletions from commit details
  - Use concurrency limits to avoid rate-limit spikes
- PR stats:
  - Count opened, merged, closed
  - Derive merged via `merged_at != null`

### Identity Normalization

- Normalize contributors by a canonical internal identity key
- Support mapping table for `github_login -> internal_member`
- Merge aliases from author email/name when possible

### Caching Strategy

- Use cache keys including org/repo/date filters/developer filter
- Suggested TTL:
  - repos: 10m
  - commits/prs: 5m
  - lines: 30m (higher API cost)
  - summary/leaderboard/heatmap: 5-15m

---

## 6) Implementation Phases (NestJS)

### Phase 1 - Module Bootstrapping

- Create `github-stats` module/controller/service scaffolding
- Configure GitHub auth and startup health check
- Add DTO validation for date-range filters

### Phase 2 - GitHub Adapter + Cache Adapter

- Implement `github-data.port.ts` with Octokit adapter
- Implement `cache.port.ts` with Redis adapter
- Add cache hit/miss logging and internal cache clear use case

### Phase 3 - Core Metrics Endpoints

- Build `/repos`, `/commits`, `/lines`, `/prs`
- Add pagination and concurrency controls
- Add bot exclusion and identity normalization

### Phase 4 - Aggregation Endpoints

- Build `/summary`, `/leaderboard`, `/heatmap`
- Implement ranking for multi-metric leaderboard
- Ensure all endpoints support `from/to` filters

### Phase 5 - CSV Export

- Build `/export.csv` endpoint and CSV adapter
- Export by metric and/or consolidated report
- Add deterministic column ordering for reporting

---

## 7) Acceptance Criteria

- Team lead can query per-developer commit/line/PR stats by date range
- Team lead can view repo-level breakdown and team summary
- Leaderboard supports `commits`, `lines`, `prs`, and `streak`
- Heatmap endpoint returns contribution intensity by date
- CSV export endpoint works for selected filters
- Bot contributions are excluded
- Identity mapping avoids duplicate developer rows
- API docs include business caveats about productivity interpretation

---

## 8) Non-Functional Notes

- Do not tie design to Express middleware patterns
- Keep business logic in application/domain layers; adapters only in infrastructure
- Prefer specific repository methods over generic "universal" query methods
- Protect internal/reporting endpoints with internal auth or role guard

---

## 9) Connect GitHub Organization with Fine-grained PAT

Use a GitHub **Fine-grained personal access token (PAT)** to connect this service to your organization and call GitHub APIs.

### 9.1 Create the token

1. Go to GitHub:
   - [https://github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. Configure token:
   - **Token name:** `github-team-stats-api`
   - **Expiration:** short-lived (recommended 30-90 days)
   - **Resource owner:** your GitHub user
   - **Repository access:** only selected repositories in the target organization
3. Grant minimum required repository permissions:
   - **Contents: Read-only** (commits, repository metadata)
   - **Pull requests: Read-only** (PR opened/closed/merged metrics)
   - **Metadata: Read-only** (repository metadata endpoints)
4. Click **Generate token** and copy it once.

### 9.2 Organization approval (if required)

If your organization enforces PAT approval:

1. Open org settings / token access request page
2. Request access for the generated token
3. Ask org admin to approve the token for selected repositories

Without approval, API calls can fail with `403` despite valid token format.

### 9.3 Configure in project

Add to your runtime environment (never hardcode in source):

```env
GITHUB_TOKEN=github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_ORG=your-org-name
GITHUB_REPOS=repo-a,repo-b,repo-c
```

Recommended:

- Put real token in local `.env` only
- Commit only `.env.example` with masked placeholders
- Store production token in secret manager / CI secret store

### 9.4 Validate token at startup (NestJS)

At startup, call:

- `GET /user` to validate token identity
- `GET /rate_limit` to log remaining quota
- optional `GET /orgs/{org}` to verify organization visibility

If validation fails, service should:

- return unhealthy health-check status for GitHub integration
- log actionable errors (`401` invalid token, `403` missing permission/org approval)

### 9.5 Security requirements

- Never commit real PAT values to repository/docs/issues/chats
- Rotate token immediately if exposed
- Use least-privilege repository scope
- Prefer short expiration and regular rotation