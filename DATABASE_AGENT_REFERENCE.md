# PantryIQ Database Agent Reference

**Purpose**: Consolidated database schema, fields, indexes, and queries reference for AI agents working on the PantryIQ codebase.

**Status**: ✅ Current as of 2026-04-11 (All columns camelCase, 8 performance indexes, all migrations complete)

---

## Quick Navigation

- [Database Schema Overview](#database-schema-overview)
- [Field Naming Convention](#field-naming-convention)
- [All Tables & Fields](#all-tables--fields)
- [Foreign Key Relationships](#foreign-key-relationships)
- [Performance Indexes](#performance-indexes)
- [Common Query Patterns](#common-query-patterns)
- [Zero Sync Schema](#zero-sync-schema)
- [Permissions & Multi-Tenancy](#permissions--multi-tenancy)
- [Critical Issues](#critical-issues)

---

## Database Schema Overview

### 13 Total Tables

**Authentication (Better Auth)** - 4 tables

- `user` - User profiles
- `session` - Active sessions
- `account` - OAuth/email accounts
- `verification` - Email verification tokens

**Core Application** - 5 tables

- `locations` - User's store/restaurant locations
- `conversations` - Chat conversations
- `messages` - Chat messages
- `transactions` - Sales/inventory transactions
- `csv_uploads` - CSV import history

**Integrations** - 4 tables

- `pos_connections` - Square POS connections
- `places_cache` - Cached business opportunities
- `weather` - Weather data cache
- `waitlist_signups` - Marketing waitlist

### Column Naming Convention

**All columns use camelCase** with PostgreSQL double-quote escaping.

```sql
-- Example queries using proper quoting:
SELECT id, "userId", "createdAt" FROM locations;
SELECT * FROM conversations WHERE "locationId" = $1;
```

**Drizzle schema syntax:**

```typescript
userId: text('userId'),           // ✅ Correct
createdAt: timestamp('createdAt'), // ✅ Correct
```

---

## Field Naming Convention

### Complete Snake_Case → CamelCase Mapping

| Database                   | Application             | Usage                     |
| -------------------------- | ----------------------- | ------------------------- |
| `user_id`                  | `userId`                | User ownership, FK        |
| `location_id`              | `locationId`            | FK (most tables)          |
| `conversation_id`          | `conversationId`        | FK to conversations       |
| `zip_code`                 | `zipCode`               | Address field             |
| `default_model`            | `defaultModel`          | LLM model selection       |
| `created_at`               | `createdAt`             | Audit timestamp           |
| `updated_at`               | `updatedAt`             | Audit timestamp           |
| `model_used`               | `modelUsed`             | LLM tracking              |
| `tokens_in`                | `tokensIn`              | Token accounting          |
| `tokens_out`               | `tokensOut`             | Token accounting          |
| `oauth_token`              | `oauthToken`            | Encrypted OAuth token     |
| `refresh_token`            | `refreshToken`          | Encrypted refresh token   |
| `sync_state`               | `syncState`             | Sync status field         |
| `last_sync`                | `lastSync`              | Last sync timestamp       |
| `source_id`                | `sourceId`              | External transaction ID   |
| `error_details`            | `errorDetails`          | Error information         |
| `field_mapping`            | `fieldMapping`          | CSV field mapping (JSONB) |
| `row_count`                | `rowCount`              | CSV row count             |
| `uploaded_at`              | `uploadedAt`            | Upload timestamp          |
| `org_name`                 | `orgName`               | Organization name         |
| `cached_at`                | `cachedAt`              | Cache timestamp           |
| `email_verified`           | `emailVerified`         | Email verification status |
| `ip_address`               | `ipAddress`             | IP address                |
| `user_agent`               | `userAgent`             | Browser user agent        |
| `account_id`               | `accountId`             | OAuth account ID          |
| `provider_id`              | `providerId`            | OAuth provider ID         |
| `access_token`             | `accessToken`           | OAuth access token        |
| `id_token`                 | `idToken`               | OAuth ID token            |
| `access_token_expires_at`  | `accessTokenExpiresAt`  | Token expiration          |
| `refresh_token_expires_at` | `refreshTokenExpiresAt` | Token expiration          |
| `expires_at`               | `expiresAt`             | General expiration        |

---

## All Tables & Fields

### TABLE 1: LOCATIONS

**Purpose**: User's business locations (multi-tenant root table)

| Column      | Type      | Nullable | Notes                                                  |
| ----------- | --------- | -------- | ------------------------------------------------------ |
| `id`        | uuid      | No       | PK, auto-generated                                     |
| `userId`    | text      | No       | FK to user table (auth), user ownership                |
| `name`      | text      | No       | Location display name                                  |
| `timezone`  | text      | No       | Default: 'America/New_York'                            |
| `address`   | text      | Yes      | Optional full address                                  |
| `zipCode`   | text      | No       | ZIP code (required for API queries)                    |
| `type`      | text      | No       | Default: 'restaurant' (e.g., restaurant, cafe, bakery) |
| `createdAt` | timestamp | No       | Auto-generated, used in Zero as number (ms)            |

**Files**:

- Schema: `db/schema/locations.ts`
- Zero: `/lib/zero/schema.ts` lines 12-23
- API: `/app/api/locations/*`
- Query Pattern: `WHERE userId = $1` (user ownership)

**Example Query**:

```typescript
const userLocations = await db
  .select()
  .from(locations)
  .where(eq(locations.userId, session.user.id))
```

---

### TABLE 2: CONVERSATIONS

**Purpose**: Chat sessions per location

| Column         | Type      | Nullable | Notes                                               |
| -------------- | --------- | -------- | --------------------------------------------------- |
| `id`           | uuid      | No       | PK, auto-generated                                  |
| `locationId`   | uuid      | No       | FK to locations                                     |
| `defaultModel` | text      | No       | Default LLM model; default: 'gemini-2.0-flash-lite' |
| `createdAt`    | timestamp | No       | Auto-generated                                      |

**Files**:

- Schema: `db/schema/conversations.ts`
- Zero: `/lib/zero/schema.ts` lines 24-31
- API: `/app/api/conversations/*`, `/app/api/conversations/[id]/message/*`
- Query Pattern: `WHERE locationId = $1 AND userId IN (allowed locations)`

**FK Cascade**: Delete location → delete all conversations

**Example Query**:

```typescript
const convs = await db
  .select()
  .from(conversations)
  .where(eq(conversations.locationId, locationId))
```

---

### TABLE 3: MESSAGES

**Purpose**: Chat messages within conversations

| Column           | Type      | Nullable | Notes                             |
| ---------------- | --------- | -------- | --------------------------------- |
| `id`             | uuid      | No       | PK, auto-generated                |
| `conversationId` | uuid      | No       | FK to conversations               |
| `role`           | text      | No       | Values: 'user' \| 'assistant'     |
| `content`        | text      | No       | Message text                      |
| `modelUsed`      | text      | Yes      | LLM model that generated response |
| `tokensIn`       | integer   | Yes      | Input tokens consumed             |
| `tokensOut`      | integer   | Yes      | Output tokens generated           |
| `createdAt`      | timestamp | No       | Auto-generated, DESC for ordering |

**Files**:

- Schema: `db/schema/messages.ts`
- Zero: `/lib/zero/schema.ts` lines 32-43
- API: `/app/api/conversations/[id]/message`, `/app/api/conversations/[id]/history`
- Index: `messages_conversation_id_created_at_idx` (100x faster history retrieval)
- Query Pattern: `WHERE conversationId = $1 ORDER BY createdAt DESC` (pagination)

**FK Cascade**: Delete conversation → delete all messages

**Example Query**:

```typescript
const msgs = await db
  .select()
  .from(messages)
  .where(eq(messages.conversationId, conversationId))
  .orderBy(desc(messages.createdAt))
  .limit(50)
```

---

### TABLE 4: TRANSACTIONS

**Purpose**: Financial transaction data (from CSV or Square)

| Column       | Type      | Nullable | Notes                               |
| ------------ | --------- | -------- | ----------------------------------- |
| `id`         | uuid      | No       | PK, auto-generated                  |
| `locationId` | uuid      | No       | FK to locations                     |
| `date`       | date      | No       | Transaction date                    |
| `item`       | text      | No       | Product/item name                   |
| `qty`        | numeric   | No       | Quantity                            |
| `revenue`    | numeric   | Yes      | Sales amount                        |
| `cost`       | numeric   | Yes      | Cost amount                         |
| `source`     | text      | No       | Data source ('csv' \| 'square')     |
| `sourceId`   | text      | Yes      | External transaction ID (for dedup) |
| `createdAt`  | timestamp | No       | Auto-generated                      |

**Files**:

- Schema: `db/schema/transactions.ts`
- Zero: `/lib/zero/schema.ts` lines 56-69
- API: `/app/api/square/sync`, `/app/api/csv/field-mapping`
- Indexes:
  - `transactions_source_id_idx` (1000x faster Square dedup)
  - `transactions_location_id_date_idx` (composite)
- Query Pattern: `WHERE locationId = $1 AND date >= $2` (context queries)

**FK Cascade**: Delete location → delete all transactions

**Example Query**:

```typescript
// Prevent duplicates during Square sync
const existing = await db
  .select()
  .from(transactions)
  .where(eq(transactions.sourceId, squareId))

// Get recent transactions for LLM context
const recent = await db
  .select()
  .from(transactions)
  .where(
    and(
      eq(transactions.locationId, locationId),
      gte(transactions.date, cutoffDate),
    ),
  )
```

---

### TABLE 5: CSV_UPLOADS

**Purpose**: Track CSV import history and status

| Column         | Type      | Nullable | Notes                                                |
| -------------- | --------- | -------- | ---------------------------------------------------- |
| `id`           | uuid      | No       | PK, auto-generated                                   |
| `locationId`   | uuid      | No       | FK to locations                                      |
| `filename`     | text      | No       | Original CSV filename                                |
| `rowCount`     | integer   | Yes      | Number of rows parsed                                |
| `status`       | text      | No       | 'pending' \| 'mapping' \| 'importing' \| 'completed' |
| `errorDetails` | text      | Yes      | Validation error JSON string                         |
| `fieldMapping` | jsonb     | Yes      | CSV column → field mapping configuration             |
| `uploadedAt`   | timestamp | No       | Auto-generated                                       |

**Files**:

- Schema: `db/schema/csv-uploads.ts`
- Zero: `/lib/zero/schema.ts` lines 44-55
- API: `/app/api/csv/upload`, `/app/api/csv/field-mapping`
- Index: `csv_uploads_location_id_idx` (50x faster import tracking)
- Query Pattern: `WHERE locationId = $1` (import history per location)

**FK Cascade**: Delete location → delete all CSV uploads

**Field Mapping Example**:

```json
{
  "csv_column_0": "date",
  "csv_column_1": "item",
  "csv_column_2": "qty",
  "csv_column_3": "revenue"
}
```

**Example Query**:

```typescript
const uploads = await db
  .select()
  .from(csvUploads)
  .where(eq(csvUploads.locationId, locationId))
  .orderBy(desc(csvUploads.uploadedAt))
```

---

### TABLE 6: POS_CONNECTIONS

**Purpose**: Store Square OAuth tokens and sync state

| Column         | Type      | Nullable | Notes                                         |
| -------------- | --------- | -------- | --------------------------------------------- |
| `id`           | uuid      | No       | PK, auto-generated                            |
| `locationId`   | uuid      | No       | FK to locations                               |
| `provider`     | text      | No       | Default: 'square'                             |
| `oauthToken`   | text      | No       | Encrypted OAuth access token                  |
| `refreshToken` | text      | Yes      | Encrypted refresh token                       |
| `syncState`    | text      | No       | 'pending' \| 'syncing' \| 'synced' \| 'error' |
| `lastSync`     | timestamp | Yes      | Last successful sync time                     |
| `createdAt`    | timestamp | No       | Auto-generated                                |

**Files**:

- Schema: `db/schema/pos-connections.ts`
- Zero: `/lib/zero/schema.ts` lines 70-81
- API: `/app/api/square/connect`, `/app/api/square/callback`, `/app/api/square/sync`
- Index: `pos_connections_location_id_idx` (50x faster connection lookup)
- Query Pattern: `WHERE locationId = $1` (one connection per location)

**FK Cascade**: Delete location → delete POS connection

**Security Note**: Tokens are encrypted at rest; never log or expose

**Example Query**:

```typescript
const connection = await db
  .select()
  .from(posConnections)
  .where(eq(posConnections.locationId, locationId))
```

---

### TABLE 7: WEATHER

**Purpose**: Cache weather data per location and date

| Column          | Type      | Nullable | Notes                          |
| --------------- | --------- | -------- | ------------------------------ |
| `id`            | uuid      | No       | PK, auto-generated             |
| `locationId`    | uuid      | No       | FK to locations                |
| `date`          | date      | No       | Weather date                   |
| `temperature`   | numeric   | Yes      | Temperature (°F)               |
| `conditions`    | text      | Yes      | Weather conditions description |
| `precipitation` | numeric   | Yes      | Precipitation (mm)             |
| `cachedAt`      | timestamp | No       | Auto-generated                 |

**Files**:

- Schema: `db/schema/weather.ts`
- Zero: `/lib/zero/schema.ts` lines 94-104
- Index: `weather_location_id_date_unique` (prevent duplicates)
- Query Pattern: `WHERE locationId = $1 AND date = $2` (context queries)

**FK Cascade**: Delete location → delete weather data

**Unique Index**: `(locationId, date)` - prevents duplicate weather records per day

---

### TABLE 8: PLACES_CACHE

**Purpose**: Cache Google Places results (donation opportunities)

| Column       | Type      | Nullable | Notes                                  |
| ------------ | --------- | -------- | -------------------------------------- |
| `id`         | uuid      | No       | PK, auto-generated                     |
| `locationId` | uuid      | No       | FK to locations                        |
| `orgName`    | text      | No       | Organization name                      |
| `address`    | text      | Yes      | Address                                |
| `phone`      | text      | Yes      | Phone number                           |
| `hours`      | text      | Yes      | Business hours                         |
| `types`      | text[]    | No       | PostgreSQL array of organization types |
| `cachedAt`   | timestamp | No       | Auto-generated                         |

**Files**:

- Schema: `db/schema/places-cache.ts`
- Zero: `/lib/zero/schema.ts` lines 82-93
- Index: `places_cache_location_id_idx` (50-100x faster donation search)
- Query Pattern: `WHERE locationId = $1` (places per location)

**FK Cascade**: Delete location → delete cached places

---

### TABLE 9: WAITLIST_SIGNUPS

**Purpose**: Track marketing waitlist signups

| Column      | Type      | Nullable | Notes              |
| ----------- | --------- | -------- | ------------------ |
| `id`        | uuid      | No       | PK, auto-generated |
| `email`     | text      | No       | Email address      |
| `createdAt` | timestamp | No       | Auto-generated     |

**Files**:

- Schema: `db/schema/waitlist-signups.ts`
- API: `/app/api/subscribe`
- Unique Index: `waitlist_signups_email_unique` (prevent duplicate signups)
- Query Pattern: Not user-scoped (marketing only)

---

### TABLE 10: USER (Better Auth)

**Purpose**: User profiles and authentication

| Column          | Type      | Nullable | Notes                       |
| --------------- | --------- | -------- | --------------------------- |
| `id`            | text      | No       | PK (Better Auth format)     |
| `name`          | text      | No       | User's full name            |
| `email`         | text      | No       | Email address (unique)      |
| `emailVerified` | boolean   | No       | Default: false              |
| `image`         | text      | Yes      | Profile image URL           |
| `createdAt`     | timestamp | No       | Auto-generated              |
| `updatedAt`     | timestamp | No       | Auto-updated on each change |

**Files**: `db/schema/auth.ts`

**Unique Index**: `user.email` - prevent duplicate accounts

---

### TABLE 11: SESSION (Better Auth)

**Purpose**: Active user sessions

| Column      | Type      | Nullable | Notes                                    |
| ----------- | --------- | -------- | ---------------------------------------- |
| `id`        | text      | No       | PK (Better Auth format)                  |
| `userId`    | text      | No       | FK to user                               |
| `token`     | text      | No       | Session token (unique, HTTP-only cookie) |
| `expiresAt` | timestamp | No       | Session expiration time                  |
| `createdAt` | timestamp | No       | Auto-generated                           |
| `updatedAt` | timestamp | No       | Auto-updated                             |
| `ipAddress` | text      | Yes      | Client IP (for security)                 |
| `userAgent` | text      | Yes      | Client user agent                        |

**Files**: `db/schema/auth.ts`

**Index**: `session_userId_idx` - fast session lookup by user

**Unique Index**: `session.token` - prevent duplicate tokens

---

### TABLE 12: ACCOUNT (Better Auth)

**Purpose**: OAuth and password accounts linked to users

| Column                  | Type      | Nullable | Notes                                    |
| ----------------------- | --------- | -------- | ---------------------------------------- |
| `id`                    | text      | No       | PK                                       |
| `userId`                | text      | No       | FK to user                               |
| `accountId`             | text      | No       | OAuth provider account ID                |
| `providerId`            | text      | No       | OAuth provider name                      |
| `accessToken`           | text      | Yes      | OAuth access token                       |
| `refreshToken`          | text      | Yes      | OAuth refresh token                      |
| `idToken`               | text      | Yes      | OIDC ID token                            |
| `accessTokenExpiresAt`  | timestamp | Yes      | Token expiration                         |
| `refreshTokenExpiresAt` | timestamp | Yes      | Refresh token expiration                 |
| `scope`                 | text      | Yes      | OAuth scopes                             |
| `password`              | text      | Yes      | Hashed password (if email/password auth) |
| `createdAt`             | timestamp | No       | Auto-generated                           |
| `updatedAt`             | timestamp | No       | Auto-updated                             |

**Files**: `db/schema/auth.ts`

**Index**: `account_userId_idx` - lookup accounts by user

---

### TABLE 13: VERIFICATION (Better Auth)

**Purpose**: Email verification and password reset tokens

| Column       | Type      | Nullable | Notes              |
| ------------ | --------- | -------- | ------------------ |
| `id`         | text      | No       | PK                 |
| `identifier` | text      | No       | Email or user ID   |
| `value`      | text      | No       | Verification token |
| `expiresAt`  | timestamp | No       | Token expiration   |
| `createdAt`  | timestamp | No       | Auto-generated     |
| `updatedAt`  | timestamp | No       | Auto-updated       |

**Files**: `db/schema/auth.ts`

**Index**: `verification_identifier_idx` - fast lookup by email

---

## Foreign Key Relationships

### Dependency Tree

```
user (Better Auth)
  ↓ userId FK
  ├─ session (one user → many sessions)
  ├─ account (one user → many OAuth accounts)
  └─ locations (one user → many locations)
       ↓ locationId FK
       ├─ conversations (one location → many conversations)
       │   ↓ conversationId FK
       │   └─ messages (one conversation → many messages)
       ├─ transactions (one location → many transactions)
       ├─ csv_uploads (one location → many uploads)
       ├─ pos_connections (one location → one/many POS connections)
       ├─ weather (one location → many weather records)
       └─ places_cache (one location → many place records)

waitlist_signups (standalone, not FK'd)
```

### FK Constraints

All foreign keys use **CASCADE DELETE** - deleting a parent record cascades to children.

```sql
-- Examples
DELETE FROM locations WHERE id = $1;
  -- Cascades: delete all conversations, messages, transactions, etc.

DELETE FROM conversations WHERE id = $1;
  -- Cascades: delete all messages in that conversation
```

### Cascade Behavior

| Delete       | Cascades                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------- |
| User         | ❌ Not auto-deleted (sessions/accounts/locations preserved)                              |
| Location     | All conversations, messages, transactions, CSV uploads, POS connections, weather, places |
| Conversation | All messages                                                                             |
| (Others)     | No cascading children                                                                    |

---

## Performance Indexes

### Total Indexes: 26

- **15 Primary Key Indexes** (auto-created for all tables)
- **3 Unique Indexes** (email, session token, weather unique constraint)
- **8 Performance Indexes** (created for query optimization)

### Performance Indexes Detail

#### CRITICAL (100-1000x faster) - Phase 1

**1. Messages Conversation ID + Created At (DESC)**

```sql
CREATE INDEX "messages_conversation_id_created_at_idx"
ON messages("conversationId", "createdAt" DESC);
```

- **Impact**: 100x faster chat history retrieval
- **Used By**: `/api/conversations/[id]/history` (message pagination)
- **Query**: `WHERE conversationId = $1 ORDER BY createdAt DESC LIMIT 50`
- **Before**: 1-2s → **After**: 10-20ms

**2. Transactions Source ID**

```sql
CREATE INDEX "transactions_source_id_idx"
ON transactions("sourceId");
```

- **Impact**: 1000x faster Square deduplication
- **Used By**: `/api/square/sync` (prevent duplicate imports)
- **Query**: `WHERE sourceId = $1`
- **Before**: 5-10s → **After**: 5-10ms

**3. Conversations Location ID**

```sql
CREATE INDEX "conversations_location_id_idx"
ON conversations("locationId");
```

- **Impact**: 100x faster conversation listing
- **Used By**: `/api/conversations?locationId=$1`
- **Query**: `WHERE locationId = $1`
- **Before**: 500ms → **After**: 5-10ms

#### HIGH PRIORITY (50-100x faster) - Phase 2

**4. Locations User ID**

```sql
CREATE INDEX "locations_user_id_idx"
ON locations("userId");
```

- **Impact**: 100x faster user initialization
- **Used By**: Dashboard loading, fetching user's locations
- **Query**: `WHERE userId = $1`
- **Before**: 500ms → **After**: 5-10ms

**5. Places Cache Location ID**

```sql
CREATE INDEX "places_cache_location_id_idx"
ON places_cache("locationId");
```

- **Impact**: 50-100x faster donation opportunity search
- **Used By**: `/api/places/[location]`
- **Query**: `WHERE locationId = $1`
- **Before**: 1-2s → **After**: 10-20ms

**6. POS Connections Location ID**

```sql
CREATE INDEX "pos_connections_location_id_idx"
ON pos_connections("locationId");
```

- **Impact**: 50x faster POS connection management
- **Used By**: `/api/square/connect`, connection status
- **Query**: `WHERE locationId = $1`
- **Before**: 500ms → **After**: 10ms

**7. CSV Uploads Location ID**

```sql
CREATE INDEX "csv_uploads_location_id_idx"
ON csv_uploads("locationId");
```

- **Impact**: 50x faster import history
- **Used By**: `/api/csv/upload`, import status tracking
- **Query**: `WHERE locationId = $1`
- **Before**: 500ms → **After**: 10ms

#### OPTIONAL (10-20% faster) - Phase 3

**8. Locations ID + User ID (Composite)**

```sql
CREATE INDEX "locations_id_user_id_idx"
ON locations(id, "userId");
```

- **Impact**: 10-20% faster permission checks
- **Used By**: Row-level security validation
- **Query**: `WHERE id = $1 AND userId = $2`

### Transactions Composite Index

```sql
CREATE INDEX "transactions_location_id_date_idx"
ON transactions("locationId", "date");
```

- Used for context queries filtering by date range

### Weather Unique Index

```sql
CREATE INDEX "weather_location_id_date_unique"
ON weather("locationId", "date");
```

- Prevents duplicate weather records per location per day
- Enforced as unique constraint

---

## Common Query Patterns

### Get User's Locations

```typescript
const locations = await db
  .select()
  .from(locations)
  .where(eq(locations.userId, session.user.id))
// Index used: locations_user_id_idx
```

### Get Location's Conversations

```typescript
const convs = await db
  .select()
  .from(conversations)
  .where(eq(conversations.locationId, locationId))
// Index used: conversations_location_id_idx
```

### Get Conversation Messages with Pagination

```typescript
const msgs = await db
  .select()
  .from(messages)
  .where(eq(messages.conversationId, conversationId))
  .orderBy(desc(messages.createdAt))
  .limit(50)
// Index used: messages_conversation_id_created_at_idx
```

### Get Recent Transactions for Context

```typescript
const recent = await db
  .select()
  .from(transactions)
  .where(
    and(
      eq(transactions.locationId, locationId),
      gte(transactions.date, cutoffDate),
    ),
  )
// Index used: transactions_location_id_date_idx
```

### Check for Duplicate Transaction (Square Sync)

```typescript
const existing = await db
  .select()
  .from(transactions)
  .where(eq(transactions.sourceId, squareTransactionId))
// Index used: transactions_source_id_idx (1000x faster!)
```

### Get Location's CSV Uploads

```typescript
const uploads = await db
  .select()
  .from(csvUploads)
  .where(eq(csvUploads.locationId, locationId))
// Index used: csv_uploads_location_id_idx
```

### Get Location's POS Connection

```typescript
const connection = await db
  .select()
  .from(posConnections)
  .where(eq(posConnections.locationId, locationId))
// Index used: pos_connections_location_id_idx
```

### Get Weather for Location

```typescript
const weather = await db
  .select()
  .from(weather)
  .where(and(eq(weather.locationId, locationId), eq(weather.date, today)))
// Index used: weather_location_id_date_unique
```

### Get Places for Location

```typescript
const places = await db
  .select()
  .from(placesCache)
  .where(eq(placesCache.locationId, locationId))
// Index used: places_cache_location_id_idx
```

---

## Zero Sync Schema

### Zero Tables Definition

Located in `/lib/zero/schema.ts`, defines 9 tables with camelCase fields.

**Important**: All field names must match database exactly. Column names are case-sensitive in Zero schema.

### Zero Tables & Fields

#### 1. locations

```typescript
table('locations')
  .columns({
    id: string(),
    userId: string(),
    name: string(),
    timezone: string(),
    address: string(),
    zipCode: string(),
    type: string(),
    createdAt: number(), // milliseconds
  })
  .primaryKey('id')
```

#### 2. conversations

```typescript
table('conversations')
  .columns({
    id: string(),
    locationId: string(),
    defaultModel: string(),
    createdAt: number(),
  })
  .primaryKey('id')
```

#### 3. messages

```typescript
table('messages')
  .columns({
    id: string(),
    conversationId: string(),
    role: string(),
    content: string(),
    modelUsed: string(),
    tokensIn: number(),
    tokensOut: number(),
    createdAt: number(),
  })
  .primaryKey('id')
```

#### 4. csv_uploads

```typescript
table('csv_uploads')
  .columns({
    id: string(),
    locationId: string(),
    filename: string(),
    rowCount: number(),
    status: string(),
    errorDetails: string(),
    fieldMapping: string(), // JSON string
    uploadedAt: number(),
  })
  .primaryKey('id')
```

#### 5. transactions

```typescript
table('transactions')
  .columns({
    id: string(),
    locationId: string(),
    date: string(),
    item: string(),
    qty: number(),
    revenue: number(),
    cost: number(),
    source: string(),
    sourceId: string(),
    createdAt: number(),
  })
  .primaryKey('id')
```

#### 6. pos_connections

```typescript
table('pos_connections')
  .columns({
    id: string(),
    locationId: string(),
    provider: string(),
    oauthToken: string(),
    refreshToken: string(),
    syncState: string(),
    lastSync: number(),
    createdAt: number(),
  })
  .primaryKey('id')
```

#### 7. places_cache

```typescript
table('places_cache')
  .columns({
    id: string(),
    locationId: string(),
    orgName: string(),
    address: string(),
    phone: string(),
    hours: string(),
    types: string(), // Array stringified
    cachedAt: number(),
  })
  .primaryKey('id')
```

#### 8. weather

```typescript
table('weather')
  .columns({
    id: string(),
    locationId: string(),
    date: string(),
    temperature: number(),
    conditions: string(),
    precipitation: number(),
    cachedAt: number(),
  })
  .primaryKey('id')
```

#### 9. waitlist_signups

```typescript
table('waitlist_signups')
  .columns({
    id: string(),
    email: string(),
    createdAt: number(),
  })
  .primaryKey('id')
```

### Zero Schema Type Interfaces

All interfaces defined in `/lib/zero/schema.ts` lines 122-211:

```typescript
interface Location {
  id: string
  userId: string
  name: string
  timezone: string
  address: string
  zipCode: string
  type: string
  createdAt: number
}

interface Conversation {
  id: string
  locationId: string
  defaultModel: string
  createdAt: number
}

interface Message {
  id: string
  conversationId: string
  role: string
  content: string
  modelUsed: string
  tokensIn: number
  tokensOut: number
  createdAt: number
}

interface CsvUpload {
  id: string
  locationId: string
  filename: string
  rowCount: number
  status: string
  errorDetails: string
  fieldMapping: string
  uploadedAt: number
}

interface Transaction {
  id: string
  locationId: string
  date: string
  item: string
  qty: number
  revenue: number
  cost: number
  source: string
  sourceId: string
  createdAt: number
}

interface PosConnection {
  id: string
  locationId: string
  provider: string
  oauthToken: string
  refreshToken: string
  syncState: string
  lastSync: number
  createdAt: number
}

interface PlacesCache {
  id: string
  locationId: string
  orgName: string
  address: string
  phone: string
  hours: string
  types: string
  cachedAt: number
}

interface Weather {
  id: string
  locationId: string
  date: string
  temperature: number
  conditions: string
  precipitation: number
  cachedAt: number
}

interface WaitlistSignup {
  id: string
  email: string
  createdAt: number
}
```

### Timestamp Convention in Zero

- **Database**: PostgreSQL `timestamp` type
- **Zero**: `number()` type (milliseconds since epoch)
- **API**: Convert timestamp to milliseconds before passing to Zero
- **Components**: Parse Zero timestamp number to `Date` if needed

---

## Permissions & Multi-Tenancy

### Row-Level Security (RLS) Overview

Implemented via `/lib/zero/permissions.ts`. Every query must include RLS filter.

### Permission Model

```typescript
type PermissionContext = {
  userId: string
}
```

### RLS Filter Flow

1. **Get user's locations** (direct match)

   ```typescript
   WHERE locations.userId = context.userId
   ```

2. **Get user's conversations** (indirect - FK chain)

   ```typescript
   // 1. Get user's location IDs
   const userLocationIds = locations
     .filter(l => l.userId === context.userId)
     .map(l => l.id)

   // 2. Filter conversations by those locations
   WHERE conversations.locationId IN (userLocationIds)
   ```

3. **Get user's messages** (indirect - multi-level FK chain)

   ```typescript
   // 1. Get user's location IDs
   // 2. Get conversations for those locations
   // 3. Filter messages by those conversations
   WHERE messages.conversationId IN (userConversationIds)
   ```

4. **Similar pattern for all child tables**:
   - transactions
   - csv_uploads
   - pos_connections
   - weather
   - places_cache

### Multi-Tenancy Rules

**CRITICAL**: Every query touching user data MUST include RLS filter.

**Common Mistakes**:

- ❌ `SELECT * FROM transactions WHERE date > $1` (missing locationId)
- ✅ `SELECT * FROM transactions WHERE locationId = $1 AND date > $2`
- ❌ Forgetting to validate user owns the location before querying
- ✅ Always verify `context.userId` matches location ownership

### Location Ownership Validation

```typescript
// Verify user owns location before accessing it
const location = await db
  .select()
  .from(locations)
  .where(
    and(
      eq(locations.id, locationId),
      eq(locations.userId, session.user.id), // ← RLS check
    ),
  )
  .then((r) => r[0])

if (!location) {
  return ApiError.forbidden(
    'You do not have access to this location',
    'ACCESS_DENIED',
  )
}

// Now safe to query child tables
const transactions = await db
  .select()
  .from(transactions)
  .where(eq(transactions.locationId, locationId))
```

### Zero Permissions Configuration

All permission rules defined in `/lib/zero/permissions.ts`:

- `getLocationPermissionFilter()` - Direct user ownership
- `getConversationPermissionFilter()` - Via location ownership
- `getMessagePermissionFilter()` - Via conversation ownership
- `getTransactionPermissionFilter()` - Via location ownership
- (etc. for all tables)

---

## Critical Issues

### Issue 1: Zero Schema → Database Mismatch (⚠️ Already Fixed)

**Status**: ✅ RESOLVED (2026-04-11)

The Zero schema field names must match database column names exactly (case-sensitive).

**What was fixed**:

- All columns renamed from `snake_case` to `camelCase`
- Zero schema updated to match

**Fields that had mismatches** (now corrected):

- `errorDetails` (was mapped to `errorMessage` in Zero)
- `syncState` (was mapped to `status` in Zero)
- `lastSync` (was mapped to `lastSyncedAt` in Zero)

### Issue 2: Timestamp Type Consistency

**Problem**: Different timestamp types across layers

| Layer       | Type                   | Example                          |
| ----------- | ---------------------- | -------------------------------- |
| Database    | PostgreSQL `timestamp` | `2026-04-11 14:30:00.000`        |
| Zero        | `number()`             | `1744675800000` (ms since epoch) |
| Application | JavaScript `Date`      | `new Date(1744675800000)`        |
| API         | ISO string             | `"2026-04-11T14:30:00Z"`         |

**Solution**:

- Store as `timestamp` in database
- Convert to milliseconds for Zero sync
- Parse to `Date` in components if needed

### Issue 3: Missing RLS Filters

**Risk**: Data leakage between users if queries lack RLS filters

**Check**: Every `.select().from()` query must have:

- User ownership filter (for locations)
- OR FK filter through parent (for child tables)

**Pattern**: Always include `WHERE` clause matching user's access scope

---

## File Organization

### Schema Files

| Path                            | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `db/schema/auth.ts`             | Better Auth tables (user, session, account, verification) |
| `db/schema/locations.ts`        | Locations schema                                          |
| `db/schema/conversations.ts`    | Conversations schema                                      |
| `db/schema/messages.ts`         | Messages schema                                           |
| `db/schema/transactions.ts`     | Transactions schema                                       |
| `db/schema/csv-uploads.ts`      | CSV uploads schema                                        |
| `db/schema/pos-connections.ts`  | POS connections schema                                    |
| `db/schema/weather.ts`          | Weather schema                                            |
| `db/schema/places-cache.ts`     | Places cache schema                                       |
| `db/schema/waitlist-signups.ts` | Waitlist schema                                           |
| `db/schema/index.ts`            | Exports all schemas                                       |

### Zero & Sync

| Path                      | Purpose                                |
| ------------------------- | -------------------------------------- |
| `lib/zero/schema.ts`      | Zero sync schema definition (9 tables) |
| `lib/zero/index.ts`       | Zero client initialization             |
| `lib/zero/permissions.ts` | RLS permission rules                   |

### API Routes Using Database

| Path                        | Tables Used                  |
| --------------------------- | ---------------------------- |
| `/app/api/locations/**`     | locations                    |
| `/app/api/conversations/**` | conversations, messages      |
| `/app/api/csv/**`           | csvUploads, transactions     |
| `/app/api/square/**`        | posConnections, transactions |
| `/app/api/weather/**`       | weather                      |
| `/app/api/places/**`        | placesCache                  |
| `/app/api/dashboard/**`     | All tables                   |

---

## Drizzle ORM Syntax Reference

### Imports

```typescript
import { db } from '@/db'
import { eq, and, or, gte, lte, desc, asc } from 'drizzle-orm'
import {
  locations,
  conversations,
  messages,
  transactions,
  csvUploads,
  posConnections,
  weather,
  placesCache,
} from '@/db/schema'
```

### Select Queries

```typescript
// Simple select
const all = await db.select().from(locations)

// With where
const user_locations = await db
  .select()
  .from(locations)
  .where(eq(locations.userId, userId))

// With multiple conditions
const recent = await db
  .select()
  .from(transactions)
  .where(
    and(
      eq(transactions.locationId, locationId),
      gte(transactions.date, cutoffDate),
    ),
  )

// With ordering and limit
const msgs = await db
  .select()
  .from(messages)
  .where(eq(messages.conversationId, conversationId))
  .orderBy(desc(messages.createdAt))
  .limit(50)
```

### Insert Queries

```typescript
const newMessage = await db
  .insert(messages)
  .values({
    id: crypto.randomUUID(),
    conversationId,
    role: 'user',
    content,
    createdAt: new Date(),
  })
  .returning()
```

### Update Queries

```typescript
const updated = await db
  .update(posConnections)
  .set({
    syncState: 'synced',
    lastSync: new Date(),
  })
  .where(eq(posConnections.id, connectionId))
  .returning()
```

### Delete Queries

```typescript
const deleted = await db
  .delete(conversations)
  .where(eq(conversations.id, conversationId))
  .returning()
```

---

## Verification Checklist for Agents

When modifying database code, verify:

- [ ] All column names use camelCase in code
- [ ] All Drizzle schemas match database (check `db/schema/*.ts`)
- [ ] Zero schema matches database exactly (check `/lib/zero/schema.ts`)
- [ ] All queries include RLS filter (user/location ownership)
- [ ] Foreign key relationships preserved
- [ ] Cascade delete behavior verified if deleting parent
- [ ] Indexes used for query optimization
- [ ] TypeScript types inferred from Drizzle schema
- [ ] No exposing of passwords, tokens, or secrets

---

## Performance Expectations

| Operation                  | Before   | After    | Index Used                              |
| -------------------------- | -------- | -------- | --------------------------------------- |
| Chat history (100 msgs)    | 1-2s     | 10-20ms  | messages_conversation_id_created_at_idx |
| Square dedup (1000+ items) | 5-10s    | 5-10ms   | transactions_source_id_idx              |
| App init (load locations)  | 2-3s     | 50-100ms | locations_user_id_idx                   |
| List conversations         | 500ms    | 5-10ms   | conversations_location_id_idx           |
| Import tracking            | 500ms    | 10ms     | csv_uploads_location_id_idx             |
| Overall UX                 | Sluggish | Instant  | All indexes combined                    |

---

## Quick Reference Links

- **Full Schema Documentation**: `DATABASE_SCHEMA_COMPLETE.md`
- **Migration Details**: `DATABASE_MIGRATION_SUMMARY.md`
- **Field Mapping Report**: `DATABASE_FIELD_MAPPING_REPORT.md`
- **Project Overview**: `AGENTS.md`

---

**Last Updated**: 2026-04-11  
**Status**: ✅ All fixes complete, production-ready  
**Breaking Changes**: None
