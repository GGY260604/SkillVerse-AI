# SkillVerse AI - Supabase Database Management & Data Pipeline API

This directory (`src/app/api/supabase`) provides a comprehensive, secure, and developer-friendly server-side database interface for the SkillVerse AI platform. It connects directly to the Supabase PostgreSQL database via privileged server-side credentials, providing full coverage across all **7 core database tables**.

Supported operations include:
- **Read Data (`GET`)**: Query single records, paginated lists, filtered results, or export the entire table.
- **Add New Data (`POST`)**: Insert new records or perform smart upserts with automatic field-level merging.
- **Modify Existing Data (`PATCH`)**: Partially update specific fields while **100% preserving all omitted/unspecified columns**.
- **Delete Data (`DELETE`)**: Remove single records or bulk-delete multiple lines by ID.

---

## Table of Contents

1. [Architecture & Working Principles](#1-architecture--working-principles)
2. [Supported Database Tables](#2-supported-database-tables)
3. [API Operations Guide](#3-api-operations-guide)
   - [A. Read Data (`GET`)](#a-read-data-get)
   - [B. Add New Data (`POST`)](#b-add-new-data-post)
   - [C. Modify Existing Data (`PATCH`) - Crucial: Preserves Unspecified Columns](#c-modify-existing-data-patch---crucial-preserves-unspecified-columns)
   - [D. Delete Data (`DELETE`)](#d-delete-data-delete)
4. [Root Gateway & Dynamic Routing](#4-root-gateway--dynamic-routing)
5. [Code Examples (JavaScript / TypeScript & cURL)](#5-code-examples-javascript--typescript--curl)
6. [Response Formats & Error Codes](#6-response-formats--error-codes)

---

## 1. Architecture & Working Principles

```text
src/app/api/supabase/
├── tableHandler.ts         # Core engine: query building, chunked fetching, smart-merge writing, partial patching & deletion
├── route.ts                # Root gateway: health check / table inventory summary, cross-table gateway
├── [table]/route.ts        # Dynamic fallback route: handles slug variations and kebab-case aliases (e.g., /api/supabase/esco-roles)
├── users/route.ts          # Dedicated endpoint for the 'users' table
├── esco_roles/route.ts     # Dedicated endpoint for the 'esco_roles' table
├── sdg_targets/route.ts    # Dedicated endpoint for the 'sdg_targets' table
├── trend_signals/route.ts  # Dedicated endpoint for the 'trend_signals' table
├── roadmaps/route.ts       # Dedicated endpoint for the 'roadmaps' table
├── roadmap_phases/route.ts # Dedicated endpoint for the 'roadmap_phases' table
├── shared_roadmaps/route.ts# Dedicated endpoint for the 'shared_roadmaps' table
└── README.md               # API Documentation
```

### Key Technical Guarantees

1. **Privileged Server Execution**:
   Every database interaction is executed through `createAdminClient()` from `@/lib/supabase/admin` using `SUPABASE_SERVICE_ROLE_KEY`. Queries run securely on the server without exposing service keys to client bundles and without getting blocked by client-side Row-Level Security (RLS) constraints.
2. **Zero Unintended Data Overwrite**:
   - **`PATCH` (Partial Update)**: Directly runs native database `UPDATE`. Only the keys explicitly sent in the payload are updated. All other database columns remain **100% untouched**.
   - **`POST` (Default Merge Mode)**: If a record with the same conflict key (e.g. `id`, `role_id`, `skillName`) already exists, the server fetches the existing row and merges `{ ...existingRecord, ...incomingFields }`. Any column left blank or omitted is never wiped out or set to `NULL`.

---

## 2. Supported Database Tables

| Table Name | Dedicated Endpoint | Primary Key / Conflict Identifier | Default Sorting | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`users`** | `/api/supabase/users` | `id` (UUID) | `createdAt desc` | User credentials, EXP level, profile preferences, and skills |
| **`esco_roles`** | `/api/supabase/esco_roles` | `role_id` | `created_at desc` | ESCO occupational taxonomies, multilingual titles & skill requirements |
| **`sdg_targets`** | `/api/supabase/sdg_targets` | `target_code` | `created_at desc` | UN Sustainable Development Goals (SDG 1-17) targets and embeddings |
| **`trend_signals`**| `/api/supabase/trend_signals`| `skillName` | `updatedAt desc` | Industry skill frequency signals, velocity values, and ingestion sources |
| **`roadmaps`** | `/api/supabase/roadmaps` | `id` (UUID) | `created_at desc` | User career roadmaps, scenario multipliers, and match scores |
| **`roadmap_phases`**| `/api/supabase/roadmap_phases`| `id` (UUID) | `created_at desc` | Roadmap learning phases, recommended courses, and completion states |
| **`shared_roadmaps`**| `/api/supabase/shared_roadmaps`| `id` (UUID) | `created_at desc` | Peer-to-peer roadmap share links, access levels, and synergy metrics |

> **Note**: Both snake_case (`roadmap_phases`) and kebab-case (`roadmap-phases`) URL slugs are supported.

---

## 3. API Operations Guide

### A. Read Data (`GET`)

Query records via `GET /api/supabase/<table_name>`.

#### 1. Fetch a Single Record by ID
Pass `?id=<value>` in the URL:
```http
GET /api/supabase/users?id=b1026198-ab4e-45e9-9aed-81f7759f37d8
GET /api/supabase/esco_roles?id=role-2512-1
```
- Returns `200 OK` with the record object in `data`.
- Returns `404 Not Found` if the identifier does not exist.

#### 2. Paginated Query with Sorting
- `limit`: Number of rows per page (default: 50, maximum: 1000).
- `page`: 1-based page number (e.g. `?page=1`).
- `offset`: Zero-based row offset (e.g. `?offset=50`).
- `orderBy`: Column name to sort by.
- `order`: `asc` or `desc` (default: `desc`).
```http
GET /api/supabase/esco_roles?page=1&limit=20&orderBy=created_at&order=desc
```

#### 3. Field-Level Filters
Any query parameter matching a column name acts as an exact filter:
```http
# Exact match
GET /api/supabase/roadmaps?status=current

# Comma-separated multi-value match (IN query)
GET /api/supabase/roadmaps?scenario=moderate,accelerated_ai
```

#### 4. Fetch ALL Records from a Table
When performing data analysis or backups, fetch the entire table in one call using `?all=true` (or `?limit=-1`):
```http
GET /api/supabase/esco_roles?all=true
```
- Automatically handles chunking and pagination under the hood.
- Returns `isAll: true`, total row count, and the complete data array.

---

### B. Add New Data (`POST`)

Add one or more rows via `POST /api/supabase/<table_name>`.

#### 1. Single Record Insert
```http
POST /api/supabase/trend_signals
Content-Type: application/json

{
  "skillName": "Rust Systems Programming",
  "category": "Software Engineering",
  "currentWindowC": 14.2,
  "pastWindowC": 6.8,
  "velocityVs": 2.08,
  "status": "emerging",
  "sources": [{ "name": "GitHub Trending", "year": 2026 }]
}
```

#### 2. Bulk Insert (Array Payload)
```http
POST /api/supabase/trend_signals
Content-Type: application/json

[
  { "skillName": "AI Agents Architecture", "category": "AI", "status": "emerging" },
  { "skillName": "Clean Energy Systems", "category": "Green Tech", "status": "emerging" }
]
```

#### 3. Insertion Modes (`mode`)
- **`mode=merge` (Default)**: Smart merge. If the line already exists in the database, missing/omitted fields are filled from the existing row, and updated fields are applied safely without wiping data.
- **`mode=insert` (Strict Insert)**: Enforces pure insert. Throws a conflict error if the record already exists. Set via `?mode=insert` or in the request body `{ "mode": "insert" }`.

---

### C. Modify Existing Data (`PATCH`) - Crucial: Preserves Unspecified Columns

Use `PATCH /api/supabase/<table_name>` to perform **partial updates**. **Any column you do not include in the payload will remain 100% unchanged in the database.**

#### 1. Single Record Update (ID in Query Parameter)
```http
PATCH /api/supabase/users?id=b1026198-ab4e-45e9-9aed-81f7759f37d8
Content-Type: application/json

{
  "currentJobTitle": "Principal AI Architect",
  "level": 8
}
```
> **Result**: Only `currentJobTitle` and `level` are updated. The user's `email`, `name`, `skills`, `exp`, `createdAt`, and other columns are completely preserved!

#### 2. Single Record Update (ID in JSON Body)
```http
PATCH /api/supabase/users
Content-Type: application/json

{
  "id": "b1026198-ab4e-45e9-9aed-81f7759f37d8",
  "careerGoal": "upskill"
}
```

#### 3. Batch Partial Updates
Send an array of objects, where each object contains its primary key:
```http
PATCH /api/supabase/trend_signals
Content-Type: application/json

[
  { "skillName": "Rust Systems Programming", "status": "stable" },
  { "skillName": "AI Agents Architecture", "velocityVs": 3.4 }
]
```

---

### D. Delete Data (`DELETE`)

Delete lines from a table via `DELETE /api/supabase/<table_name>`.

#### 1. Single Record Deletion (via URL Query)
```http
DELETE /api/supabase/users?id=b1026198-ab4e-45e9-9aed-81f7759f37d8
```

#### 2. Single Record Deletion (via JSON Body)
```http
DELETE /api/supabase/trend_signals
Content-Type: application/json

{
  "skillName": "Rust Systems Programming"
}
```

#### 3. Bulk Deletion
```http
# Option 1: Comma-separated query parameter
DELETE /api/supabase/users?ids=uuid-1,uuid-2,uuid-3

# Option 2: JSON array of IDs
DELETE /api/supabase/users
Content-Type: application/json

{
  "ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

---

## 4. Root Gateway & Dynamic Routing

### 1. Root Gateway (`/api/supabase`)
- **`GET /api/supabase`**: Returns health check, live row counts across all 7 tables, and usage tips.
- **`POST /api/supabase`**: Cross-table insert gateway. Supply `"table": "<name>"` in body.
- **`PATCH /api/supabase`**: Cross-table partial modify gateway. Supply `"table": "<name>"` and identifier in body.
- **`DELETE /api/supabase`**: Cross-table delete gateway. Supply `"table": "<name>"` and identifier in body or query.

### 2. Dynamic Routing (`/api/supabase/[table]`)
Allows parameterized routing. Both `/api/supabase/esco_roles` and `/api/supabase/esco-roles` map cleanly to the same handler.

---

## 5. Code Examples (JavaScript / TypeScript & cURL)

### Example 1: Fetch a User Record
```typescript
const res = await fetch("/api/supabase/users?id=" + userId);
const json = await res.json();
if (json.success) {
  console.log("User details:", json.data);
}
```

### Example 2: Read All ESCO Roles
```typescript
const res = await fetch("/api/supabase/esco_roles?all=true");
const { total, data } = await res.json();
console.log(`Loaded all ${total} ESCO roles`);
```

### Example 3: Partial Update (Only modify one field, keep others intact)
```typescript
const res = await fetch(`/api/supabase/users?id=${userId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    currentJobTitle: "Lead Full-Stack Engineer",
  }),
});
const { data } = await res.json();
console.log("Updated record with preserved columns:", data);
```

### Example 4: Add New Signal
```typescript
const res = await fetch("/api/supabase/trend_signals", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    skillName: "Next.js 16 App Router",
    category: "Frontend Development",
    status: "emerging",
  }),
});
```

### Example 5: Delete a Record
```typescript
const res = await fetch(`/api/supabase/shared_roadmaps?id=${sharedId}`, {
  method: "DELETE",
});
const result = await res.json();
console.log(`Deleted ${result.deletedCount} record(s)`);
```

### Example 6: cURL Equivalents
```bash
# Read single record
curl -X GET "http://localhost:3000/api/supabase/users?id=USER_UUID"

# Read all records
curl -X GET "http://localhost:3000/api/supabase/esco_roles?all=true"

# Partial update (preserves omitted columns)
curl -X PATCH "http://localhost:3000/api/supabase/users?id=USER_UUID" \
  -H "Content-Type: application/json" \
  -d '{"level": 5}'

# Delete record
curl -X DELETE "http://localhost:3000/api/supabase/users?id=USER_UUID"
```

---

## 6. Response Formats & Error Codes

### Standard Success Response (Single Record)
```json
{
  "success": true,
  "table": "users",
  "data": {
    "id": "b1026198-ab4e-45e9-9aed-81f7759f37d8",
    "email": "user@example.com",
    "level": 5,
    "currentJobTitle": "Lead Developer"
  }
}
```

### Standard List Response (Paginated / All)
```json
{
  "success": true,
  "table": "esco_roles",
  "isAll": true,
  "total": 240,
  "count": 240,
  "data": [ ... ]
}
```

### Error Response (HTTP 400 / 404 / 500)
```json
{
  "success": false,
  "table": "users",
  "error": "Record with identifier '...' was not found."
}
```

| HTTP Status Code | Scenario |
| :--- | :--- |
| **`200 OK`** | Operation completed successfully. |
| **`400 Bad Request`** | Missing required parameters, empty body, or invalid field names. |
| **`404 Not Found`** | Record ID does not exist or table name is unrecognized. |
| **`500 Internal Server Error`** | Database connection or Supabase service failure. |
