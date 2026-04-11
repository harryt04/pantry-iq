# PantryIQ Test Coverage Implementation -- Orchestration Plan

**Version:** 1.0  
**Date:** 2026-04-11  
**Purpose:** Self-contained work unit plan for LLM orchestration agents dispatching via OpenCode Task tool  
**Source:** `TEST_COVERAGE_AUDIT.md` (translated into executable agent prompts)  
**Status:** Ready for orchestration

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Execution Phases](#execution-phases)
4. [Work Units (Agent Prompts)](#work-units-agent-prompts)
5. [Dependency Graph](#dependency-graph)

---

## Overview

This document breaks down the PantryIQ Test Coverage Audit into **self-contained work units**, each of which can be dispatched to an LLM agent via the OpenCode `task()` tool.

**Key characteristics:**

- Each work unit includes all information needed to execute it independently
- Dependencies are explicit (blockers must complete first)
- Work units within a layer can execute in parallel
- Status tracked via checkboxes and layer completion
- All file paths, acceptance criteria, and tests are inline
- **CSV import tests are ✅ COMPLETE** (Phase 0); Phase 1-3 remain

**Orchestration strategy:**

1. Orchestrator reads this file
2. Executes all work units in a given layer in parallel (via concurrent `task()` calls)
3. Waits for layer to complete before moving to next layer
4. Updates status checkboxes as units complete
5. If a unit fails, orchestrator halts and surfaces error; human decides to retry or skip

---

## Prerequisites

**Before starting orchestration, the following must be in place:**

- [ ] **Node.js 20+ installed** -- required for `npm run test:unit` and `npm run test:e2e`
- [ ] **Docker installed** -- required for `docker-compose up -d` (PostgreSQL + Zero sync)
- [ ] **`.env` file created** from `.env.sample` with all values (see `AGENTS.md`)
- [ ] **`npm install` completed** -- all production and dev dependencies installed
- [ ] **Docker stack running** -- execute `docker-compose up -d` before testing
- [ ] **Database migrations applied** -- run `npm run db:migrate`
- [ ] **Current git branch:** `test-coverage` or feature branch (not main)
- [ ] **CSV import tests passing** -- baseline from Phase 0 complete (`npm run test:unit -- csv`)

**If any prerequisite is missing, orchestrator must halt and ask human to complete it before proceeding.**

---

## Execution Phases

| Phase | Layer | Work Units            | Can Parallelize | Effort | Duration | Status      |
| ----- | ----- | --------------------- | --------------- | ------ | -------- | ----------- |
| 0     | N/A   | ✅ CSV Import (Done)  | N/A             | Large  | ✅ Done  | [x] Complete |
| 1     | 0     | WU-1.0, WU-1.1, WU-1.2 | ✅ All          | Large  | ~1-2wks | [ ] Pending |
| 1     | 1     | WU-1.3, WU-1.4, WU-1.5 | ✅ All          | Medium | ~1-2wks | [ ] Pending |
| 2     | 2     | WU-2.1, WU-2.2, WU-2.3, WU-2.4 | ✅ All | Medium | ~1-2wks | [ ] Pending |
| 2     | 3     | WU-2.5, WU-2.6 | ✅ Both | Medium | ~1wk | [ ] Pending |
| 3     | 4     | WU-3.1–WU-3.6 | ✅ All | Small | ~ongoing | [ ] Pending |

**Legend:**
- **Layer 0 & 1**: Critical (Phase 1 ~ 2 weeks)
- **Layer 2 & 3**: Important (Phase 2 ~ 1-2 weeks)
- **Layer 4**: Nice-to-have (Phase 3 ~ ongoing)

---

## Work Units (Agent Prompts)

Each work unit below is formatted as a ready-to-execute agent prompt. The orchestrator can pass the entire **Prompt** section (starting with `## Prompt`) directly to `task(description, prompt, subagent_type)`.

---

## Phase 1: Critical API & Utility Tests (Layers 0 & 1) -- All Parallel

---

### WU-1.0: Authentication API Route Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Large  
**Dependencies:** None  
**Parallel group:** Layer 0  
**Estimated test cases:** 25-30

### Prompt

You are an expert full-stack testing engineer specializing in authentication. Your task is to create comprehensive unit tests for PantryIQ's authentication API routes using Better Auth (session-based auth system). The application is a Next.js full-stack monolith with PostgreSQL, Drizzle ORM, and real-time data sync (Zero by Rocicorp).

**Acceptance Criteria (Validation):**

- ✅ Test file created at `tests/unit/api/auth.test.ts` with 25-30 test cases
- ✅ All signup flow tests pass (validation, error cases, duplicate email)
- ✅ All login flow tests pass (valid/invalid credentials, session creation)
- ✅ All logout flow tests pass (session cleanup, cookies cleared)
- ✅ OAuth callback handling tested (state validation, token exchange)
- ✅ Session management tested (isValid, refresh, expiry)
- ✅ All error codes correct (400/401/409/500 with proper error messages)
- ✅ Tests use vi.mock() for auth, database, and external APIs
- ✅ Test data uses realistic values (valid emails, strong passwords)
- ✅ All tests pass with `npm run test:unit -- auth.test`
- ✅ No console errors or warnings during test runs

**Files to Create:**

1. `tests/unit/api/auth.test.ts` -- Comprehensive authentication API tests:
   - Signup tests: valid submission, duplicate email, invalid email format, missing fields, weak password, validation errors
   - Login tests: valid credentials, invalid credentials, account not found, session creation, cookie setting
   - Logout tests: session termination, cookie cleanup, redirect handling
   - Session tests: session validation, refresh token handling, expiry, concurrent sessions
   - OAuth callback tests: state validation, code exchange, error handling, token storage

**Files to Modify:**

None (tests only, no source code changes)

**Dependencies to Install (if applicable):**

```bash
# Already installed (verify):
# npm list vitest @testing-library/react supertest
```

**Environment Variables Required (if applicable):**

```bash
# Use existing from .env
# BETTER_AUTH_SECRET (verify at least 32 characters)
# BETTER_AUTH_URL=http://localhost:3000
# NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

**Tests:**

Create `tests/unit/api/auth.test.ts`:

**Signup Tests (7 cases):**
- Test: Valid signup with email and password returns 201 with user ID
- Test: Duplicate email returns 409 CONFLICT with error code USER_ALREADY_EXISTS
- Test: Invalid email format returns 400 BAD_REQUEST with error code INVALID_EMAIL
- Test: Missing email field returns 400 BAD_REQUEST with error code MISSING_EMAIL
- Test: Missing password field returns 400 with error code MISSING_REQUIRED_FIELDS
- Test: Password too weak returns 400 with error code PASSWORD_WEAK
- Test: Valid signup creates user in database with hashed password

**Login Tests (7 cases):**
- Test: Valid credentials return 200 with session token
- Test: Invalid password returns 401 UNAUTHORIZED with error code INVALID_CREDENTIALS
- Test: User not found returns 401 with error code USER_NOT_FOUND
- Test: Successful login sets HTTP-only cookie with session
- Test: Login creates session in database with expiry
- Test: Disabled account cannot login (returns 401)
- Test: Multiple concurrent logins create separate sessions

**Logout Tests (4 cases):**
- Test: Logout with valid session returns 200 and clears cookie
- Test: Logout removes session from database
- Test: Logout without session returns 401
- Test: Subsequent requests with cleared session return 401

**Session Tests (5 cases):**
- Test: Valid session returns authenticated user
- Test: Expired session returns 401 UNAUTHORIZED
- Test: Invalid/tampered session returns 401
- Test: Session refresh extends expiry
- Test: Multiple sessions per user all work independently

**OAuth Callback Tests (3 cases):**
- Test: Valid OAuth state and code exchanges for session
- Test: Invalid/missing state returns 401 or error
- Test: Token stored securely (no plain text in logs/errors)

**Notes:**

- Use `vi.mocked()` to mock `getServerSession()`, database calls, and external auth providers
- Mock Better Auth client methods (sign up, sign in, get session, etc.)
- Use realistic test data: `test@example.com`, `SecurePass123!`, etc.
- Verify error response format: `{ error: "user message", code: "ERROR_CODE" }` (no stack traces)
- Test should NOT make real HTTP requests to auth providers
- Reference: `lib/auth.ts` (server config), `lib/auth-client.ts` (client), `app/api/auth/[...all]/route.ts` (endpoint)

---

### WU-1.1: Conversation API Route Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Large  
**Dependencies:** WU-1.0 (for auth mocking patterns)  
**Parallel group:** Layer 0  
**Estimated test cases:** 28-32

### Prompt

You are an expert backend testing engineer. Your task is to create comprehensive unit tests for PantryIQ's conversation API routes, which handle the LLM-powered chat feature. This is CRITICAL for the core product functionality.

The application uses Vercel AI SDK for LLM calls (OpenAI, Anthropic, Google), Zero sync for real-time data, and PostgreSQL with Drizzle ORM. Conversations are stored with messages and metadata.

**Acceptance Criteria (Validation):**

- ✅ Test file created at `tests/unit/api/conversations.test.ts` with 28-32 test cases
- ✅ POST /api/conversations tests pass (create, auth, error handling)
- ✅ POST /api/conversations/[id]/message tests pass (send message, LLM call, stream response)
- ✅ GET /api/conversations/[id]/history tests pass (fetch messages, pagination)
- ✅ DELETE /api/conversations/[id] tests pass (delete, auth, cascade)
- ✅ LLM streaming handled correctly (test response streaming)
- ✅ Error handling for LLM failures (timeout, rate limit, 500)
- ✅ Authentication enforced (401 if not logged in)
- ✅ Authorization enforced (403 if user doesn't own conversation)
- ✅ All error codes correct (400/401/403/404/500 with proper messages)
- ✅ Tests mock LLM provider (no real API calls)
- ✅ All tests pass with `npm run test:unit -- conversations.test`

**Files to Create:**

1. `tests/unit/api/conversations.test.ts` -- Conversation API tests:
   - Create conversation tests (POST /api/conversations)
   - Send message tests (POST /api/conversations/[id]/message) - CRITICAL
   - Fetch history tests (GET /api/conversations/[id]/history)
   - Delete conversation tests (DELETE /api/conversations/[id])

**Files to Modify:**

None (tests only)

**Dependencies to Install (if applicable):**

```bash
# Already installed:
# npm list vitest ai @ai-sdk/openai (or anthropic/google)
```

**Environment Variables Required (if applicable):**

```bash
# Mock/stub these for tests:
OPENAI_API_KEY=sk-test-key-12345
ANTHROPIC_API_KEY=claude-test-key
GOOGLE_GENERATIVE_AI_API_KEY=google-test-key
```

**Tests:**

Create `tests/unit/api/conversations.test.ts`:

**Create Conversation Tests (6 cases):**
- Test: Valid authenticated user can create conversation returns 201 with ID
- Test: Unauthenticated request returns 401 NOT_AUTHENTICATED
- Test: Conversation record created in database with user_id and timestamps
- Test: Initial message parameter is optional
- Test: Conversation name can be customized
- Test: Cannot create conversation for another user (returns 403 or ignored)

**Send Message Tests (12 cases):**
- Test: Valid message sent returns 200 with conversation ID and message ID
- Test: Unauthenticated request returns 401
- Test: User doesn't own conversation returns 403 FORBIDDEN
- Test: Missing message content returns 400 BAD_REQUEST
- Test: Conversation doesn't exist returns 404 CONVERSATION_NOT_FOUND
- Test: Message stored in database with content, role, and timestamp
- Test: LLM provider called with correct context and model
- Test: LLM response streamed back to client correctly
- Test: LLM timeout returns 500 with error code LLM_TIMEOUT
- Test: LLM rate limit returns 429 (or 500) with appropriate error
- Test: LLM API key invalid returns 500 with error code LLM_AUTH_ERROR
- Test: Conversation context includes previous messages (sliding window)

**Fetch History Tests (6 cases):**
- Test: Valid request returns 200 with array of messages
- Test: Unauthenticated request returns 401
- Test: User doesn't own conversation returns 403
- Test: Conversation doesn't exist returns 404
- Test: Messages ordered chronologically (oldest first)
- Test: Pagination works (limit and offset parameters)

**Delete Conversation Tests (5 cases):**
- Test: Valid request returns 204 NO_CONTENT
- Test: Unauthenticated request returns 401
- Test: User doesn't own conversation returns 403 FORBIDDEN
- Test: Conversation doesn't exist returns 404
- Test: Conversation and all messages deleted from database

**Streaming Tests (3 cases):**
- Test: LLM response streams character by character
- Test: Stream error handling stops stream gracefully
- Test: Client receives complete streamed response

**Notes:**

- Mock LLM provider using `vi.mock('@ai-sdk/openai')` or similar
- Mock database calls via Drizzle ORM
- Test CRITICAL LLM integration (POST /api/conversations/[id]/message) thoroughly
- Verify error response format matches `lib/api-error.ts` pattern
- Use realistic conversation context (location data, previous messages)
- Test with multiple LLM models to ensure abstraction works
- Reference: `app/api/conversations/route.ts`, `app/api/conversations/[id]/message/route.ts`, `lib/ai/`

---

### WU-1.2: Square Integration API Route Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Large  
**Dependencies:** WU-1.0 (for auth patterns)  
**Parallel group:** Layer 0  
**Estimated test cases:** 20-24

### Prompt

You are a backend testing engineer specializing in OAuth and payment integrations. Your task is to create comprehensive unit tests for PantryIQ's Square POS integration API routes, which handle OAuth flow, token storage, and inventory synchronization.

Square integration is CRITICAL for the product's core inventory management feature. The app uses Square OAuth, encrypted token storage, and periodic syncing.

**Acceptance Criteria (Validation):**

- ✅ Test file created at `tests/unit/api/square.test.ts` with 20-24 test cases
- ✅ POST /api/square/connect tests pass (OAuth initiation)
- ✅ GET /api/square/callback tests pass (OAuth redirect, token exchange)
- ✅ POST /api/square/sync tests pass (inventory sync logic)
- ✅ Token encryption/decryption tested
- ✅ OAuth state validation prevents CSRF
- ✅ Error handling for Square API failures
- ✅ Authorization enforced (user owns location)
- ✅ All error codes correct (400/401/403/500 with proper messages)
- ✅ Sensitive data never logged or exposed
- ✅ All tests pass with `npm run test:unit -- square.test`

**Files to Create:**

1. `tests/unit/api/square.test.ts` -- Square integration tests:
   - OAuth connect tests (POST /api/square/connect)
   - OAuth callback tests (GET /api/square/callback)
   - Inventory sync tests (POST /api/square/sync)
   - Token management and encryption

**Files to Modify:**

None (tests only)

**Dependencies to Install (if applicable):**

```bash
# Already installed:
# npm list vitest square (or @square/web-payments-sdk)
```

**Environment Variables Required (if applicable):**

```bash
# Mock for tests:
SQUARE_APP_ID=test-app-id-12345
SQUARE_APP_SECRET=test-secret-key-67890
SQUARE_ENVIRONMENT=sandbox
ENCRYPTION_KEY=[32-char base64 encoded key for testing]
```

**Tests:**

Create `tests/unit/api/square.test.ts`:

**OAuth Connect Tests (4 cases):**
- Test: Valid authenticated user can initiate OAuth returns 200 with authorization URL
- Test: Unauthenticated request returns 401
- Test: OAuth state stored in database for CSRF prevention
- Test: Authorization URL redirects to Square OAuth endpoint

**OAuth Callback Tests (8 cases):**
- Test: Valid state and auth code exchange for access token returns 200
- Test: Invalid/missing state returns 401 OAUTH_STATE_MISMATCH (CSRF prevention)
- Test: Invalid auth code returns 401 or 400 with error code OAUTH_CODE_INVALID
- Test: Access token encrypted and stored in database
- Test: Sensitive tokens NOT logged or exposed in error messages
- Test: Authorization user must own location (403 if trying to connect for another user)
- Test: Duplicate connection (user already connected) handled gracefully
- Test: Expired or revoked tokens handled in callback

**Inventory Sync Tests (8 cases):**
- Test: Valid sync request returns 200 with sync status
- Test: Unauthenticated request returns 401
- Test: User must own location being synced (403 if trying to sync other user's location)
- Test: Sync fetches items from Square API with stored access token
- Test: Items inserted/updated in database via Zero sync
- Test: Sync handles Square API timeout (returns 500 with error code SQUARE_TIMEOUT)
- Test: Sync handles rate limiting (returns 429 or 500 with appropriate error)
- Test: Sync can be run multiple times without duplicates (idempotent)

**Token Management Tests (4 cases):**
- Test: Access token encrypted using ENCRYPTION_KEY
- Test: Encrypted token can be decrypted correctly
- Test: Corrupted encrypted token fails with clear error (not crash)
- Test: Token refresh logic works (Square tokens expire and need refresh)

**Notes:**

- Mock Square API calls using `vi.mock()` - do NOT make real HTTP requests
- Mock database/Drizzle ORM for token storage
- Use realistic test data: valid Square app ID/secret, location IDs, item data
- Verify CSRF prevention: state must match between request and callback
- Verify sensitive data (tokens, secrets) never logged or exposed in errors
- Test with multiple locations per user (each should have separate connection)
- Reference: `lib/square/client.ts`, `lib/square/encryption.ts`, `lib/square/sync.ts`, `app/api/square/`

---

### WU-1.3: Square Token Encryption Utility Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Medium  
**Dependencies:** None (independent utility)  
**Parallel group:** Layer 1  
**Estimated test cases:** 12-15

### Prompt

You are a security-focused testing engineer. Your task is to create comprehensive unit tests for PantryIQ's token encryption utility, which handles Square OAuth token storage. This is CRITICAL for security.

The utility encrypts/decrypts sensitive tokens using a 32-character encryption key. Failures must be handled gracefully without exposing secrets.

**Acceptance Criteria (Validation):**

- ✅ Test file created at `tests/unit/lib/square-encryption.test.ts` with 12-15 test cases
- ✅ Encryption tests pass (valid plaintext → encrypted)
- ✅ Decryption tests pass (encrypted → valid plaintext)
- ✅ Round-trip encryption/decryption works correctly
- ✅ Different plaintexts produce different ciphertexts
- ✅ Corrupted ciphertexts fail gracefully (throw error, not crash)
- ✅ Invalid encryption keys handled
- ✅ Edge cases: empty strings, very long strings, special characters
- ✅ Performance acceptable (encryption < 1ms per token)
- ✅ No sensitive data in error messages
- ✅ All tests pass with `npm run test:unit -- square-encryption.test`

**Files to Create:**

1. `tests/unit/lib/square-encryption.test.ts` -- Encryption utility tests:
   - Encrypt/decrypt round-trip tests
   - Error handling for corrupted data
   - Key validation and rotation
   - Performance tests

**Files to Modify:**

None (tests only)

**Tests:**

Create `tests/unit/lib/square-encryption.test.ts`:

**Encryption Tests (3 cases):**
- Test: Valid plaintext encrypted produces non-empty string
- Test: Encrypted ciphertext differs from plaintext
- Test: Same plaintext + same key produces same ciphertext (deterministic OR verify nonce handling)

**Decryption Tests (3 cases):**
- Test: Valid ciphertext decrypted returns original plaintext
- Test: Invalid ciphertext throws DecryptionError (not exposing ciphertext)
- Test: Empty ciphertext throws error

**Round-Trip Tests (2 cases):**
- Test: Plaintext → encrypt → decrypt → plaintext (matches original)
- Test: Multiple tokens encrypted/decrypted independently

**Key Management Tests (3 cases):**
- Test: Invalid/missing encryption key throws error at encryption
- Test: Wrong key used for decryption fails with DecryptionError
- Test: Key rotation scenario: old token decrypted with old key, new token with new key

**Edge Cases & Security (3 cases):**
- Test: Empty string encrypts and decrypts correctly
- Test: Very long token (Square tokens are ~300 chars) handled correctly
- Test: Special characters and Unicode handled without corruption
- Test: Sensitive plaintext/ciphertext never appears in error messages

**Performance Tests (1 case):**
- Test: Encrypt/decrypt operations complete within 1ms per token

**Notes:**

- Use real ENCRYPTION_KEY from .env or generate test key
- Do NOT use hardcoded keys in test file (security risk)
- Verify that decryption failures throw descriptive errors without exposing secrets
- Reference: `lib/square/encryption.ts`

---

### WU-1.4: LLM Stream Handler Utility Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Medium  
**Dependencies:** None (independent utility)  
**Parallel group:** Layer 1  
**Estimated test cases:** 14-18

### Prompt

You are a testing engineer specializing in streaming APIs and error handling. Your task is to create comprehensive unit tests for PantryIQ's LLM stream handler utility, which manages streaming responses from language models (OpenAI, Anthropic, Google).

**Acceptance Criteria (Validation):**

- ✅ Test file created at `tests/unit/lib/stream-handler.test.ts` with 14-18 test cases
- ✅ Streaming response tests pass (chunk handling, concatenation)
- ✅ Error handling during stream tested (network error, timeout, provider error)
- ✅ Stream termination tests pass (graceful close, cleanup)
- ✅ Timeout scenarios tested
- ✅ Retry logic tested (if applicable)
- ✅ Error messages are user-friendly (no technical details leaked)
- ✅ Performance: streaming handles large responses without memory issues
- ✅ All tests pass with `npm run test:unit -- stream-handler.test`

**Files to Create:**

1. `tests/unit/lib/stream-handler.test.ts` -- Stream handler utility tests:
   - Chunk handling and concatenation
   - Error handling and recovery
   - Timeout detection
   - Resource cleanup

**Files to Modify:**

None (tests only)

**Tests:**

Create `tests/unit/lib/stream-handler.test.ts`:

**Streaming Response Tests (5 cases):**
- Test: Single chunk processed correctly
- Test: Multiple chunks concatenated in order
- Test: Empty chunks handled gracefully
- Test: Large chunk (>1MB) processed without buffering issues
- Test: Complete response matches expected output

**Error Handling Tests (6 cases):**
- Test: Network error (e.g., ECONNREFUSED) during stream caught and error returned
- Test: Provider returns error response (e.g., 429 rate limit) handled gracefully
- Test: Invalid/malformed response from provider handled (JSON parse error)
- Test: Stream interrupted mid-response recovers or fails gracefully
- Test: Auth error from provider (e.g., invalid API key) surfaces clear error message
- Test: Sensitive data (API keys, internal errors) NOT exposed in user-facing errors

**Timeout Tests (4 cases):**
- Test: Stream timeout after X seconds (e.g., 30s) triggers error
- Test: Partial response before timeout returned (or error with partial data)
- Test: Timeout doesn't leave dangling connections
- Test: Multiple concurrent streams have independent timeouts

**Cleanup Tests (2 cases):**
- Test: Stream closed properly after completion
- Test: Stream closed properly after error (no resource leak)

**Retry Logic Tests (1-2 cases, if applicable):**
- Test: Retriable errors (e.g., 429) retried with exponential backoff
- Test: Non-retriable errors (e.g., 401 auth) fail immediately

**Notes:**

- Use Node.js Readable/Transform streams for testing
- Mock LLM provider responses using vi.mock()
- Test with realistic streaming response patterns (gradual chunk arrival)
- Verify error messages are suitable for end users (no stack traces, API details)
- Reference: `lib/ai/stream-handler.ts` (if exists) or streaming logic in `app/api/conversations/[id]/message/route.ts`

---

### WU-1.5: LLM Context Builder Utility Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P0  
**Effort:** Medium  
**Dependencies:** WU-1.1 (for conversation context patterns)  
**Parallel group:** Layer 1  
**Estimated test cases:** 16-20

### Prompt

You are a testing engineer specializing in data transformation and AI context preparation. Your task is to create comprehensive unit tests for PantryIQ's LLM context builder utility, which constructs the prompt/context sent to language models for chat responses.

The context builder must format location data, transaction history, messages, and other info into a prompt that LLMs can understand for inventory management queries.

**Acceptance Criteria (Validation):**

- ✅ Test file created at `tests/unit/lib/context-builder.test.ts` with 16-20 test cases
- ✅ Basic context construction tests pass (location data, conversation history)
- ✅ Data formatting tests pass (numbers, dates, special characters)
- ✅ Missing data handling tested (graceful fallbacks)
- ✅ Context length management tested (token limits for large prompts)
- ✅ Different data types formatted correctly (transactions, inventory, locations)
- ✅ Context includes relevant system instructions for inventory queries
- ✅ All tests pass with `npm run test:unit -- context-builder.test`

**Files to Create:**

1. `tests/unit/lib/context-builder.test.ts` -- Context builder utility tests:
   - Context construction and formatting
   - Data type handling
   - Missing data handling
   - Token/length management

**Files to Modify:**

None (tests only)

**Tests:**

Create `tests/unit/lib/context-builder.test.ts`:

**Basic Context Construction Tests (4 cases):**
- Test: Empty location data builds minimal valid context
- Test: Location with name/address formatted correctly in context
- Test: Conversation history (previous messages) included in context
- Test: System instructions for inventory management included

**Data Formatting Tests (5 cases):**
- Test: Currency values formatted as "$X.XX"
- Test: Dates formatted as "YYYY-MM-DD" or readable format
- Test: Numbers formatted with appropriate precision
- Test: Product names with special characters escaped correctly
- Test: Long strings truncated if needed with ellipsis

**Missing Data Handling Tests (4 cases):**
- Test: Missing location name defaults to generic placeholder
- Test: Missing transaction history doesn't break context
- Test: Missing conversation history (first message) handled
- Test: Null/undefined fields skipped gracefully (not breaking the prompt)

**Conversation History Tests (3 cases):**
- Test: Recent messages included (e.g., last 5 messages)
- Test: Very old messages excluded (context window optimization)
- Test: Message order preserved (most recent last)

**Transaction/Inventory Data Tests (2 cases):**
- Test: Transaction data formatted as readable list (date, item, qty, revenue)
- Test: Inventory summary included (total items, low-stock alerts)

**Context Length Management Tests (2 cases):**
- Test: Context built respects reasonable token limit (~2000 tokens)
- Test: If context exceeds limit, older messages excluded (not entire context)

**Edge Cases Tests (1 case):**
- Test: Very large dataset (10k transactions) handled without timeout

**Notes:**

- Use realistic location/transaction/conversation data
- Format should be human-readable and LLM-friendly
- Test should NOT make LLM calls (pure data transformation tests)
- Verify context includes sufficient detail for LLM to provide meaningful responses
- Reference: `lib/ai/context-builder.ts` (if exists) or context building logic in conversation route

---

## Phase 2: Important Component & E2E Tests (Layers 2 & 3)

---

### WU-2.1: Chat UI Component Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Medium  
**Dependencies:** WU-1.1 (for conversation API patterns)  
**Parallel group:** Layer 2  
**Estimated test cases:** 18-22

### Prompt

You are a React testing specialist. Your task is to create comprehensive unit tests for PantryIQ's ChatInterface component, which is the primary user-facing chat UI for LLM interactions.

Use React Testing Library + Vitest. Focus on user interactions, not implementation details. Mock API calls and Zero sync.

**Acceptance Criteria (Validation):**

- ✅ Test file created at `tests/unit/components/chat-interface.test.tsx` with 18-22 test cases
- ✅ Component renders correctly (messages, input, buttons visible)
- ✅ User can type and submit messages
- ✅ LLM responses displayed with loading state
- ✅ Model selection works (switch between OpenAI, Anthropic, etc.)
- ✅ Error states handled gracefully (show error message, not crash)
- ✅ Accessibility basics verified (labels, ARIA, keyboard navigation)
- ✅ All tests pass with `npm run test:unit -- chat-interface.test`

**Files to Create:**

1. `tests/unit/components/chat-interface.test.tsx` -- Chat UI component tests:
   - Rendering tests
   - Message submission and display
   - Model selection
   - Error handling
   - Loading states

**Files to Modify:**

None (tests only)

**Tests:**

Create `tests/unit/components/chat-interface.test.tsx`:

**Rendering Tests (3 cases):**
- Test: Component renders message list, input field, send button
- Test: Empty state (no messages) shows placeholder or greeting
- Test: Multiple messages display in chronological order

**User Input Tests (4 cases):**
- Test: User can type in message input
- Test: Send button click submits message
- Test: Enter key submits message (accessibility)
- Test: Empty message rejected (validation)

**Message Display Tests (3 cases):**
- Test: User messages display on right with user avatar
- Test: LLM responses display on left with bot avatar
- Test: Markdown in LLM responses rendered correctly

**Model Selection Tests (2 cases):**
- Test: Dropdown to switch models (OpenAI, Anthropic, Google)
- Test: Selected model persists in component state

**Loading & Error States (4 cases):**
- Test: Spinner/skeleton shown while LLM response streaming
- Test: Error message displayed on API failure (not generic error)
- Test: Retry button appears on error
- Test: Error is dismissible

**Accessibility Tests (2 cases):**
- Test: Input has associated label
- Test: Send button keyboard accessible

**Notes:**

- Use `render()`, `screen`, `userEvent` from React Testing Library
- Mock API calls with `vi.mock('@/lib/api')`
- Mock Zero sync with realistic data
- Reference: `components/chat/chat-interface.tsx`

---

### WU-2.2: Signup Form Component Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Medium  
**Dependencies:** WU-1.0 (for auth patterns)  
**Parallel group:** Layer 2  
**Estimated test cases:** 16-20

### Prompt

You are a React testing specialist. Your task is to create comprehensive unit tests for PantryIQ's SignupForm component, which handles user registration with email, password, and validation.

Use React Testing Library + Vitest. Test form validation, submission, and error display.

**Acceptance Criteria (Validation):**

- ✅ Test file created at `tests/unit/components/signup-form.test.tsx` with 16-20 test cases
- ✅ Form renders with email, password, confirm password fields
- ✅ Email validation works (format, required)
- ✅ Password validation works (strength, requirements displayed)
- ✅ Form submission sends correct data to API
- ✅ Errors displayed clearly (field-level and form-level)
- ✅ Success redirects user
- ✅ Loading state during submission
- ✅ All tests pass with `npm run test:unit -- signup-form.test`

**Files to Create:**

1. `tests/unit/components/signup-form.test.tsx` -- Signup form tests:
   - Form rendering
   - Email validation
   - Password validation
   - Submission flow
   - Error handling

**Files to Modify:**

None (tests only)

**Tests:**

Create `tests/unit/components/signup-form.test.tsx`:

**Rendering Tests (2 cases):**
- Test: Form renders with email, password, confirm password inputs
- Test: Submit button disabled initially (optional, depends on implementation)

**Email Validation Tests (3 cases):**
- Test: Invalid email shows error (e.g., "invalid@")
- Test: Valid email passes validation
- Test: Email required (cannot be empty)

**Password Validation Tests (5 cases):**
- Test: Password must be at least 8 characters
- Test: Password must contain uppercase letter
- Test: Password must contain number
- Test: Password strength indicator shows visual feedback
- Test: Password and confirm password must match

**Submission Tests (3 cases):**
- Test: Valid form submission sends POST to /api/auth/signup
- Test: Loading state shown during submission
- Test: Success response redirects to /dashboard

**Error Display Tests (2 cases):**
- Test: API error (e.g., email already exists) displays to user
- Test: Field-level validation errors highlighted

**Accessibility Tests (1 case):**
- Test: Form inputs have labels and descriptions

**Notes:**

- Mock auth API call
- Test with realistic email/password combinations
- Reference: `components/auth/signup-form.tsx`

---

### WU-2.3: CSV Upload Component Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Medium  
**Dependencies:** None (independent component)  
**Parallel group:** Layer 2  
**Estimated test cases:** 14-18

### Prompt

You are a React testing specialist. Your task is to create comprehensive unit tests for PantryIQ's CSVUpload component, which handles file selection, drag-drop, and upload initiation.

Note: Comprehensive CSV API tests already exist (WU-0 complete). These component tests focus on UI interactions and file handling.

**Acceptance Criteria (Validation):**

- ✅ Test file created at `tests/unit/components/csv-upload.test.tsx` with 14-18 test cases
- ✅ Component renders file input and drag-drop zone
- ✅ File selection via input works
- ✅ Drag-drop file selection works
- ✅ File validation (only .csv, .tsv accepted)
- ✅ File size validation before upload
- ✅ Upload progress/loading state shown
- ✅ Error handling (invalid file, too large, upload error)
- ✅ Success callback triggered
- ✅ All tests pass with `npm run test:unit -- csv-upload.test`

**Files to Create:**

1. `tests/unit/components/csv-upload.test.tsx` -- CSV upload component tests:
   - File input and drag-drop
   - File validation
   - Upload flow
   - Error handling

**Files to Modify:**

None (tests only)

**Tests:**

Create `tests/unit/components/csv-upload.test.tsx`:

**File Input Tests (3 cases):**
- Test: Clicking input opens file browser
- Test: Selecting CSV file triggers upload
- Test: Selecting TSV file triggers upload

**Drag-Drop Tests (3 cases):**
- Test: Drag file over zone highlights it
- Test: Drop CSV file triggers upload
- Test: Drop invalid file shows error (not upload)

**File Validation Tests (3 cases):**
- Test: Invalid file type (.xlsx, .txt) rejected with error message
- Test: File size > 50MB rejected with error message
- Test: Valid CSV file (<50MB) accepted

**Upload Flow Tests (3 cases):**
- Test: Upload shows progress/loading indicator
- Test: Upload completes and shows success message
- Test: Success callback called with file metadata

**Error Handling Tests (2 cases):**
- Test: Network error during upload shows error message and retry option
- Test: Error dismissed closes error UI

**Notes:**

- Mock file input/drag-drop events
- Mock API upload call
- Use realistic test files (CSV generated from WU-0 test data generator)
- Reference: `components/import/csv-upload.tsx`

---

### WU-2.4: Location Form Component Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Medium  
**Dependencies:** None (independent component)  
**Parallel group:** Layer 2  
**Estimated test cases:** 16-20

### Prompt

You are a React testing specialist. Your task is to create comprehensive unit tests for PantryIQ's LocationForm component, which handles creation and editing of restaurant locations.

**Acceptance Criteria (Validation):**

- ✅ Test file created at `tests/unit/components/location-form.test.tsx` with 16-20 test cases
- ✅ Form renders with location fields (name, address, phone, etc.)
- ✅ Create mode initializes empty form
- ✅ Edit mode populates form with location data
- ✅ Required field validation
- ✅ Phone number formatting
- ✅ Form submission sends correct data
- ✅ Error handling and display
- ✅ Success callback or redirect
- ✅ All tests pass with `npm run test:unit -- location-form.test`

**Files to Create:**

1. `tests/unit/components/location-form.test.tsx` -- Location form tests:
   - Create and edit modes
   - Field validation
   - Submission flow
   - Error handling

**Files to Modify:**

None (tests only)

**Tests:**

Create `tests/unit/components/location-form.test.tsx`:

**Create Mode Tests (3 cases):**
- Test: Form renders empty in create mode
- Test: Submit button labeled "Create Location"
- Test: Successful submission creates location via API

**Edit Mode Tests (3 cases):**
- Test: Form populates with existing location data
- Test: Submit button labeled "Update Location"
- Test: Successful submission updates location via API

**Validation Tests (4 cases):**
- Test: Location name required (cannot be empty)
- Test: Address required
- Test: Phone number formatted (e.g., (123) 456-7890)
- Test: Invalid email shows error

**Submission Tests (2 cases):**
- Test: Valid form data submitted to correct API endpoint
- Test: Loading state shown during submission

**Error Display Tests (2 cases):**
- Test: Validation errors highlighted on fields
- Test: API errors displayed in error message

**Accessibility Tests (1 case):**
- Test: Form fields have labels

**Notes:**

- Mock location API calls
- Test both POST (create) and PUT (edit) scenarios
- Use realistic location data
- Reference: `components/settings/location-form.tsx`

---

### WU-2.5: Settings Page E2E Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Medium  
**Dependencies:** WU-1.0 (for auth flow)  
**Parallel group:** Layer 3  
**Estimated test cases:** 8-10

### Prompt

You are an E2E testing specialist using Playwright. Your task is to create comprehensive end-to-end tests for PantryIQ's Settings page (`/settings`), which allows users to manage their restaurant locations (CRUD operations).

**Acceptance Criteria (Validation):**

- ✅ Test file created at `tests/e2e/settings.spec.ts` with 8-10 test cases
- ✅ User can navigate to settings page (after login)
- ✅ Location list displays all user locations
- ✅ User can add new location (form submission, success)
- ✅ User can edit existing location
- ✅ User can delete location (confirmation, success)
- ✅ All tests pass with `npm run test:e2e -- settings.spec`

**Files to Create:**

1. `tests/e2e/settings.spec.ts` -- Settings page E2E tests:
   - Page navigation and rendering
   - Location CRUD operations
   - Error handling

**Files to Modify:**

None (tests only)

**Tests:**

Create `tests/e2e/settings.spec.ts`:

**Navigation Tests (1 case):**
- Test: User can navigate to /settings from dashboard

**Location List Tests (2 cases):**
- Test: Settings page displays list of user's locations
- Test: Location names, addresses visible

**Create Location Tests (2 cases):**
- Test: User can click "Add Location" button
- Test: Filling form and clicking save creates location (appears in list)

**Edit Location Tests (2 cases):**
- Test: User can click edit button on location
- Test: Updating form and saving updates location

**Delete Location Tests (1 case):**
- Test: User can delete location (confirmation dialog, success)

**Notes:**

- Use Playwright `page.goto()`, `page.fill()`, `page.click()`
- Test full user workflow (login → navigate → create/edit/delete)
- Verify data persists by checking list after operations
- Reference: `app/(app)/settings/page.tsx`

---

### WU-2.6: Pricing Page E2E Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P1  
**Effort:** Small  
**Dependencies:** None (public page)  
**Parallel group:** Layer 3  
**Estimated test cases:** 4-6

### Prompt

You are an E2E testing specialist using Playwright. Your task is to create end-to-end tests for PantryIQ's Pricing page (`/pricing`), which is a marketing page displaying plan options and call-to-action buttons.

**Acceptance Criteria (Validation):**

- ✅ Test file created at `tests/e2e/pricing.spec.ts` with 4-6 test cases
- ✅ Pricing page loads and displays pricing cards
- ✅ All pricing plans visible (Starter, Pro, Enterprise, etc.)
- ✅ CTA buttons ("Get Started", "Contact Sales") track analytics events
- ✅ Links work (navigate to signup, contact form, etc.)
- ✅ All tests pass with `npm run test:e2e -- pricing.spec`

**Files to Create:**

1. `tests/e2e/pricing.spec.ts` -- Pricing page E2E tests:
   - Page rendering
   - CTA interactions
   - Analytics event tracking

**Files to Modify:**

None (tests only)

**Tests:**

Create `tests/e2e/pricing.spec.ts`:

**Page Load Tests (1 case):**
- Test: Pricing page loads and displays pricing cards

**Pricing Display Tests (2 cases):**
- Test: All pricing plans visible (Starter, Pro, Enterprise)
- Test: Feature cards show key features for each plan

**CTA Tests (2 cases):**
- Test: "Get Started" buttons navigate to /signup
- Test: "Contact Sales" buttons navigate to contact form

**Notes:**

- Test is public (no login required)
- Verify PostHog analytics events tracked (`pricing-card-viewed`, etc.)
- Reference: `app/(marketing)/pricing/page.tsx`

---

## Phase 3: Nice-to-Have Additional Tests (Layer 4) -- All Parallel

---

### WU-3.1: API Error Utility Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P2  
**Effort:** Small  
**Dependencies:** None  
**Parallel group:** Layer 4  
**Estimated test cases:** 10-12

### Prompt

You are a testing engineer. Create unit tests for `lib/api-error.ts`, which provides centralized error response formatting and logging. Verify all error types and status codes.

**Acceptance Criteria:**
- ✅ All error types generate correct HTTP status (400, 401, 403, 404, 409, 500)
- ✅ Error messages user-friendly (no stack traces)
- ✅ Error codes properly formatted (e.g., `ERROR_CODE_IN_CAPS`)
- ✅ All tests pass

**Files to Create:**
- `tests/unit/lib/api-error.test.ts`

---

### WU-3.2: Analytics Utility Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P2  
**Effort:** Small  
**Dependencies:** None  
**Parallel group:** Layer 4  
**Estimated test cases:** 8-10

### Prompt

You are a testing engineer. Create unit tests for `lib/analytics-utils.ts`, which provides PostHog event tracking utilities. Verify event properties and payload construction.

**Acceptance Criteria:**
- ✅ Events formatted correctly for PostHog
- ✅ All required properties included
- ✅ Timestamp handling correct
- ✅ All tests pass

**Files to Create:**
- `tests/unit/lib/analytics-utils.test.ts`

---

### WU-3.3: General Utilities Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P2  
**Effort:** Small  
**Dependencies:** None  
**Parallel group:** Layer 4  
**Estimated test cases:** 12-15

### Prompt

You are a testing engineer. Create unit tests for `lib/utils.ts`, which provides general utility functions (formatting, validation, helpers). Test all exported functions.

**Acceptance Criteria:**
- ✅ All utility functions tested with valid and invalid inputs
- ✅ Edge cases handled
- ✅ All tests pass

**Files to Create:**
- `tests/unit/lib/utils.test.ts`

---

### WU-3.4: CSV Storage Logic Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P2  
**Effort:** Small  
**Dependencies:** None  
**Parallel group:** Layer 4  
**Estimated test cases:** 8-10

### Prompt

You are a testing engineer. Create unit tests for CSV storage logic (file persistence, retrieval, cleanup). Test database operations for CSV uploads.

**Acceptance Criteria:**
- ✅ CSV files stored and retrieved correctly
- ✅ Database records created/updated
- ✅ Cleanup (deletion) works
- ✅ All tests pass

**Files to Create:**
- `tests/unit/lib/csv-storage.test.ts`

---

### WU-3.5: Client Auth Hook Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P2  
**Effort:** Small  
**Dependencies:** None  
**Parallel group:** Layer 4  
**Estimated test cases:** 10-12

### Prompt

You are a React testing specialist. Create unit tests for `lib/auth-client.ts`, which exports client-side auth hooks (e.g., `useSession()`, `useSignOut()`).

**Acceptance Criteria:**
- ✅ Hooks render correctly in components
- ✅ Session state returned properly
- ✅ Sign out functionality works
- ✅ All tests pass

**Files to Create:**
- `tests/unit/lib/auth-client.test.ts`

---

### WU-3.6: Login Flow E2E Tests

**Status:** [ ] Pending | [ ] In Progress | [ ] Complete | [ ] Failed

**Priority:** P2  
**Effort:** Small  
**Dependencies:** WU-1.0 (for auth patterns)  
**Parallel group:** Layer 4  
**Estimated test cases:** 3-5

### Prompt

You are an E2E testing specialist using Playwright. Create tests for the login page (`/login`) and login flow (email + password → authenticated session).

**Acceptance Criteria:**
- ✅ Login page loads
- ✅ Valid credentials log user in
- ✅ Invalid credentials show error
- ✅ User redirected to dashboard on success
- ✅ All tests pass

**Files to Create:**
- `tests/e2e/login.spec.ts`

---

## Dependency Graph

```
Layer 0 (Phase 1, Week 1):
├─ WU-1.0: Auth API Tests (P0, Large)
│  └─ Blocks: WU-1.1, WU-1.2, WU-2.2, WU-2.5, WU-3.6
├─ WU-1.1: Conversation API Tests (P0, Large)
│  └─ Depends on: WU-1.0 (auth patterns)
│  └─ Blocks: WU-1.4, WU-2.1, WU-2.5
├─ WU-1.2: Square API Tests (P0, Large)
│  └─ Depends on: WU-1.0 (auth patterns)
│  └─ Blocks: WU-1.3

Layer 1 (Phase 1, Week 2):
├─ WU-1.3: Token Encryption Tests (P0, Medium)
│  └─ Depends on: WU-1.2
├─ WU-1.4: Stream Handler Tests (P0, Medium)
│  └─ Depends on: WU-1.1
├─ WU-1.5: Context Builder Tests (P0, Medium)
│  └─ Depends on: WU-1.1

Layer 2 (Phase 2, Week 3):
├─ WU-2.1: Chat UI Component (P1, Medium)
│  └─ Depends on: WU-1.1, WU-1.5
├─ WU-2.2: Signup Form Component (P1, Medium)
│  └─ Depends on: WU-1.0
├─ WU-2.3: CSV Upload Component (P1, Medium)
│  └─ Depends on: None (CSV API ✅ complete)
├─ WU-2.4: Location Form Component (P1, Medium)
│  └─ Depends on: None

Layer 3 (Phase 2, Week 4):
├─ WU-2.5: Settings Page E2E (P1, Medium)
│  └─ Depends on: WU-1.0, WU-2.4
├─ WU-2.6: Pricing Page E2E (P1, Small)
│  └─ Depends on: None

Layer 4 (Phase 3, Ongoing):
├─ WU-3.1: API Error Utility Tests (P2, Small) - Independent
├─ WU-3.2: Analytics Utility Tests (P2, Small) - Independent
├─ WU-3.3: General Utilities Tests (P2, Small) - Independent
├─ WU-3.4: CSV Storage Tests (P2, Small) - Independent
├─ WU-3.5: Auth Client Hook Tests (P2, Small) - Independent
├─ WU-3.6: Login Flow E2E (P2, Small) - Depends on: WU-1.0
```

---

## Execution Instructions for Orchestrator

### Layer 0 (Phase 1, Week 1) -- Execute in Parallel

**All work units can run in parallel** (all have 0 dependencies):

```bash
# Orchestrator: dispatch these 3 agents in parallel
task("Auth API Tests", WU-1.0-prompt, subagent_type="general")
task("Conversation API Tests", WU-1.1-prompt, subagent_type="general")
task("Square API Tests", WU-1.2-prompt, subagent_type="general")

# Wait for all 3 to complete before proceeding
```

**Success criteria:** All 3 work units complete with test files passing

### Layer 1 (Phase 1, Week 2) -- Execute in Parallel (after Layer 0)

**All work units can run in parallel** (dependencies on WU-1.0 already complete):

```bash
# Orchestrator: dispatch these 3 agents in parallel
task("Token Encryption Tests", WU-1.3-prompt, subagent_type="general")
task("Stream Handler Tests", WU-1.4-prompt, subagent_type="general")
task("Context Builder Tests", WU-1.5-prompt, subagent_type="general")

# Wait for all 3 to complete
```

**Success criteria:** All 3 work units complete with tests passing

### Layer 2 (Phase 2, Week 3) -- Execute in Parallel (after Layer 1)

**All work units can run in parallel** (no cross-dependencies in this layer):

```bash
# Orchestrator: dispatch these 4 agents in parallel
task("Chat UI Component Tests", WU-2.1-prompt, subagent_type="general")
task("Signup Form Component Tests", WU-2.2-prompt, subagent_type="general")
task("CSV Upload Component Tests", WU-2.3-prompt, subagent_type="general")
task("Location Form Component Tests", WU-2.4-prompt, subagent_type="general")

# Wait for all 4 to complete
```

**Success criteria:** All 4 work units complete with tests passing

### Layer 3 (Phase 2, Week 4) -- Execute in Parallel (after Layer 2)

**All work units can run in parallel**:

```bash
# Orchestrator: dispatch these 2 agents in parallel
task("Settings Page E2E Tests", WU-2.5-prompt, subagent_type="general")
task("Pricing Page E2E Tests", WU-2.6-prompt, subagent_type="general")

# Wait for both to complete
```

**Success criteria:** Both work units complete with tests passing

### Layer 4 (Phase 3, Ongoing) -- Execute in Parallel (any time)

**All work units are independent** (no dependencies on each other):

```bash
# Orchestrator: dispatch all 6 agents in parallel
task("API Error Utility Tests", WU-3.1-prompt, subagent_type="general")
task("Analytics Utility Tests", WU-3.2-prompt, subagent_type="general")
task("General Utilities Tests", WU-3.3-prompt, subagent_type="general")
task("CSV Storage Tests", WU-3.4-prompt, subagent_type="general")
task("Auth Client Hook Tests", WU-3.5-prompt, subagent_type="general")
task("Login Flow E2E Tests", WU-3.6-prompt, subagent_type="general")

# Wait for all 6 to complete
```

**Success criteria:** All 6 work units complete with tests passing

---

## Overall Project Summary

| Metric | Current | Target After Phase 1 | Target After Phase 2 | Target After Phase 3 |
|--------|---------|----------------------|----------------------|----------------------|
| Unit Test Files | 16 | 22 | 26 | 32 |
| E2E Test Files | 10 | 10 | 12 | 13 |
| Total Test Cases | ~165 | ~240 | ~290 | ~330 |
| API Route Coverage | 31% | 60% | 75% | 85% |
| Component Coverage | 8% | 15% | 40% | 50% |
| Utility Coverage | 40% | 75% | 80% | 90% |
| **Overall Coverage** | **42%** | **~60%** | **~70%** | **~80%** |

---

## Status Tracking

### Phase 1 Completion

- [ ] Layer 0 complete (WU-1.0, 1.1, 1.2)
- [ ] Layer 1 complete (WU-1.3, 1.4, 1.5)
- [ ] `npm run test:unit` passes all new tests

### Phase 2 Completion

- [ ] Layer 2 complete (WU-2.1, 2.2, 2.3, 2.4)
- [ ] Layer 3 complete (WU-2.5, 2.6)
- [ ] `npm run test:unit` and `npm run test:e2e` pass all tests

### Phase 3 Completion

- [ ] Layer 4 complete (WU-3.1 through 3.6)
- [ ] `npm run test` passes all tests
- [ ] Coverage targets met (80%+ overall)

---

## Notes for Future Use

- This orchestration plan assumes parallel execution capability via OpenCode task tool
- Each work unit is self-contained and includes all context needed for successful execution
- Work units can be skipped (marked ❌) if priorities change; update dependency graph accordingly
- All test references follow PantryIQ project structure (tests/unit/, tests/e2e/, etc.)
- Update this document as work progresses; maintain as source of truth for test coverage status

---

**For questions or to report issues, see `AGENTS.md` or contact the development team.**
