# Test Failure Analysis Report

## Summary
Both tests are failing because there's a mismatch between what the tests **expect** and what the actual route **implementations** do. The implementations are actually correct for production behavior, but the tests contain incorrect expectations.

---

## Issue 1: conversations-route.test.ts Line 618
### Test Name: "should create conversation with custom model"

**Test Location:** `/Users/harry/Documents/git/pantry-iq-landing/tests/unit/conversations-route.test.ts:592-620`

### What The Test Expects
- **Input:** `modelId: 'invalid-model'`
- **Expected Response:** Status **400** with error code `'INVALID_MODEL'`
- **Test Logic:** Lines 612, 618-619 show the test sends an invalid model ID and expects rejection

```typescript
{ locationId: 'loc-123', modelId: 'invalid-model' }  // Line 612
expect(response.status).toBe(400)                     // Line 618
expect(body.code).toBe('INVALID_MODEL')              // Line 619
```

### What Actually Happens
- **Actual Response:** Status **201** (success)
- The conversation is created with the invalid model ID accepted

### Root Cause: Logic Bug in route.ts
**File:** `/Users/harry/Documents/git/pantry-iq-landing/app/api/conversations/route.ts:91-99`

```typescript
// Line 92-99: The validation logic has a bug
const finalModelId = modelId || 'gemini-2.0-flash-lite'
if (modelId) {
  try {
    getModel(modelId)
  } catch {
    return ApiError.badRequest(`Invalid model: ${modelId}`, 'INVALID_MODEL')
  }
}
```

**The Problem:**
- Line 92: `finalModelId` is set to the provided `modelId` regardless of validation
- Line 93-99: Validation only runs **IF** `modelId` is provided and truthy
- **BUT** the mock in the test sets `getModel('invalid-model')` to return `{ provider: 'openai', id: 'gpt-4o' }` (line 603-606)
- This means `getModel()` **does NOT throw**, so the catch block never executes
- The conversation gets created with `defaultModel: 'invalid-model'` and returns 201

### Test vs Implementation Verdict
**The TEST is CORRECT about the intent**, but the **implementation is incomplete**:
- The route should validate the model ID exists and is valid
- Currently it returns success (201) when validation passes
- But validation is weak because `getModel()` only throws if misconfigured, not if model ID is invalid

### Fix Required
The implementation should validate that the model ID actually exists in the list of supported models, not just that `getModel()` doesn't throw an exception.

---

## Issue 2: csv-upload-route.test.ts Line 851
### Test Name: "should handle filename with special characters"

**Test Location:** `/Users/harry/Documents/git/pantry-iq-landing/tests/unit/csv-upload-route.test.ts:823-852`

### What The Test Expects
- **Input filename:** `'data_2024-01-15 (final).csv'` (specialName, line 824)
- **Expected Output:** `body.filename` should equal `'data_2024-01-15 (final).csv'`
- The response filename should preserve the original filename with special characters

```typescript
const specialName = 'data_2024-01-15 (final).csv'  // Line 824
...
expect(body.filename).toBe(specialName)             // Line 851
```

### What Actually Happens
- **Actual Response:** `body.filename` is `'test.csv'` instead of `'data_2024-01-15 (final).csv'`
- The filename returned from the database doesn't match what was sent

### Root Cause: Test Mock Setup Mismatch
**File:** `/Users/harry/Documents/git/pantry-iq-landing/tests/unit/csv-upload-route.test.ts:832-839`

```typescript
vi.mocked(db.insert).mockReturnValueOnce({
  values: vi.fn().mockReturnValueOnce({
    returning: vi
      .fn()
      .mockResolvedValueOnce([
        { id: 'upload-123', filename: 'test.csv', status: 'pending' },
                            // ^^^^^^^^^ HARDCODED!
      ]),
  }),
} as any)
```

**The Problem:**
The test mock returns a **hardcoded** filename `'test.csv'` regardless of what filename was actually sent:
1. Line 842-845: `createFormDataRequest(specialName, 'col\nval\n', 'loc-123')`
   - This creates a File with name = `'data_2024-01-15 (final).csv'`
2. The route (csv/upload/route.ts:73) inserts the **actual** filename: `filename: file.name`
3. But the mock (line 837) returns hardcoded `'test.csv'` instead of respecting the special name
4. Test expects the response to have the special name (line 851)
5. Mock returns test.csv instead, so test fails

**Comparison with the actual route implementation:**
```typescript
// app/api/csv/upload/route.ts:69-78
const [uploadRecord] = await db
  .insert(csvUploads)
  .values({
    locationId,
    filename: file.name,  // Preserves original filename!
    rowCount: parsed.totalRows,
    status: 'pending',
    fieldMapping: JSON.stringify({ headers: parsed.headers }),
  })
  .returning()

// app/api/csv/upload/route.ts:89-97
return NextResponse.json(
  {
    uploadId: uploadRecord.id,
    filename: uploadRecord.filename,  // Returns what was stored
    // ...
  },
  { status: 200 },
)
```

The **implementation is correct** - it preserves the original filename with special characters!

### Test vs Implementation Verdict
**The TEST is WRONG.** The implementation correctly:
1. Preserves the original filename (line 73: `filename: file.name`)
2. Returns it in the response (line 92: `filename: uploadRecord.filename`)

The test mock is incorrectly hardcoding `'test.csv'` when it should return the special filename that was submitted.

### Fix Required
Update the test mock to return the special filename:
```typescript
// Instead of hardcoding 'test.csv':
{ id: 'upload-123', filename: specialName, status: 'pending' }
```

Or better yet, make the mock return the filename that was actually inserted (capture it from the values call).

---

## Summary Table

| Aspect | Test 1 (model validation) | Test 2 (filename preservation) |
|--------|---------------------------|--------------------------------|
| **Test File** | conversations-route.test.ts:618 | csv-upload-route.test.ts:851 |
| **What Test Expects** | Status 400, code 'INVALID_MODEL' | body.filename = 'data_2024-01-15 (final).csv' |
| **What Actually Happens** | Status 201 (success) | body.filename = 'test.csv' |
| **Route Implementation** | Incomplete validation | Correct behavior (preserves filename) |
| **Test Mock Setup** | getModel() doesn't throw on invalid model | Hardcoded mock returns wrong filename |
| **Root Problem** | Route should validate model exists in supported list | Test mock doesn't return filename that was sent |
| **Verdict** | **Implementation is WRONG** (weak validation) | **Test is WRONG** (incorrect mock) |
| **Fix Location** | Fix app/api/conversations/route.ts validation | Fix tests/unit/csv-upload-route.test.ts mock (line 837) |

