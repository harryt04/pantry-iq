# Error Handling

## Response Format

```json
{ "error": "User-friendly message", "code": "ERROR_CODE_CAPS" }
```

Never expose stack traces, SQL, credentials, or system paths to clients. Log full details server-side only.

## Key Files

- `lib/api-error.ts` – `ApiError` static methods + `logErrorSafely()`
- `app/(app)/error.tsx` – global error boundary (app routes)
- `components/ui/error-message.tsx`, `components/ui/loading-skeleton.tsx`

## Usage

```typescript
import { ApiError, logErrorSafely } from '@/lib/api-error'

return ApiError.unauthorized('Auth required', 'NOT_AUTHENTICATED')     // 401
return ApiError.forbidden('Access denied', 'ACCESS_DENIED')            // 403
return ApiError.notFound('Not found', 'LOCATION_NOT_FOUND')            // 404
return ApiError.badRequest('Invalid email', 'INVALID_EMAIL')           // 400

catch (error) {
  const msg = logErrorSafely(error, 'GET /api/endpoint')
  return ApiError.internalServerError(msg, 'ENDPOINT_ERROR')           // 500
}
```

## Error Codes

**401:** `NOT_AUTHENTICATED`, `UNAUTHORIZED`
**403:** `ACCESS_DENIED`, `FORBIDDEN`
**404:** `NOT_FOUND`, `LOCATION_NOT_FOUND`, `CONVERSATION_NOT_FOUND`
**400:** `BAD_REQUEST`, `INVALID_JSON`, `MISSING_EMAIL`, `INVALID_EMAIL`, `MISSING_REQUIRED_FIELDS`, `MISSING_LOCATION_ID`, `INVALID_TYPE`, `INVALID_FIELDS`, `INVALID_MODEL`
**500:** `INTERNAL_SERVER_ERROR`, `SUBSCRIBE_ERROR`, `FETCH/CREATE/UPDATE/DELETE_LOCATION_ERROR`, `FETCH/CREATE/UPDATE/DELETE_CONVERSATION_ERROR`
