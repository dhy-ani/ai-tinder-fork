# White-Box Test Justification

This document explains the rationale behind each test case in `server.test.js`. Every test input was chosen by examining specific conditionals, branches, and boundary values in the source code.

---

## 1. POST /api/likes — Input Validation

**Source:** `server.js:135`
```js
if (!profileId || !["like", "superlike"].includes(action))
```

This condition has two independent sub-conditions joined by `||`. White-box testing requires exercising both the truthy and falsy paths of each.

| Test | Input | Targeted Branch | Justification |
|------|-------|-----------------|---------------|
| Missing profileId | `{ action: "like" }` | `!profileId` is `true` (undefined is falsy) | Tests the first sub-condition |
| Empty string profileId | `{ profileId: "", action: "like" }` | `!profileId` is `true` (`""` is falsy) | Boundary: empty string is falsy in JS, ensures it's rejected |
| Missing action | `{ profileId: "p1" }` | `!["like","superlike"].includes(undefined)` → `true` | Tests second sub-condition with undefined |
| Invalid action `"dislike"` | `{ profileId: "p1", action: "dislike" }` | `includes` returns `false` → validation fails | Tests an action string that *looks* plausible but isn't in the allowed set |
| Action `"like"` | `{ profileId: "p1", action: "like" }` | Both sub-conditions are `false` → passes | Boundary: exact match against first allowed value |
| Action `"superlike"` | `{ profileId: "p2", action: "superlike" }` | Both sub-conditions are `false` → passes | Boundary: exact match against second allowed value |
| Null body | `null` | `req.body || {}` fallback kicks in → all fields undefined | Tests the `req.body || {}` defensive destructure on line 133 |

---

## 2. POST /api/likes — Name Fallback

**Source:** `server.js:143`
```js
name || "Unknown"
```

| Test | Input | Targeted Branch | Justification |
|------|-------|-----------------|---------------|
| Name omitted | `{ profileId, action }` | `undefined || "Unknown"` → `"Unknown"` | Falsy branch of `||` |
| Name provided | `{ profileId, action, name: "Charlie" }` | `"Charlie" || "Unknown"` → `"Charlie"` | Truthy branch of `||` |

---

## 3. POST /api/likes — Optional Field Defaults

**Source:** `server.js:133` (destructuring defaults) and `server.js:101` (`img || ""`)
```js
const { profileId, name, action, img = "", tags = [] } = req.body || {};
stmts.insertLike.run({ ..., img: img || "", tags: tagsJson });
```

| Test | Input | Targeted Branch | Justification |
|------|-------|-----------------|---------------|
| img omitted | no `img` field | Default `""` from destructure, then `"" || ""` → `""` | Tests default path |
| tags omitted | no `tags` field | Default `[]` from destructure → serialized as `"[]"` | Tests default path |
| tags provided | `tags: ["Hiking", "Dogs"]` | Provided value serialized/deserialized through JSON | Tests JSON round-trip through `JSON.stringify` → SQLite → `JSON.parse` |

---

## 4. POST /api/likes — Upsert (INSERT OR REPLACE)

**Source:** `server.js:62`
```sql
INSERT OR REPLACE INTO likes (profile_id, name, action, img, tags)
```

| Test | Input | Justification |
|------|-------|---------------|
| Two likes with same profileId | First: `action: "like"`, Second: `action: "superlike"` | `INSERT OR REPLACE` means the second write should overwrite the first. Verify only one row exists and it has the second action. |

---

## 5. POST /api/likes — Match Probability

**Source:** `server.js:110`
```js
const alreadyLikedBack = Math.random() < 0.4;
```

This is a strict less-than comparison against `0.4`. White-box boundary analysis requires testing values on, just below, and just above the boundary.

| Test | `Math.random()` return | Expected `matched` | Justification |
|------|----------------------|-------------------|---------------|
| 0.39 | Just below boundary | `true` | `0.39 < 0.4` is `true` |
| **0.4** | **Exactly at boundary** | **`false`** | `0.4 < 0.4` is `false` — this is the critical boundary value |
| 0.41 | Just above boundary | `false` | `0.41 < 0.4` is `false` |
| 0.0 | Lower extreme | `true` | `0.0 < 0.4` is `true` — tests minimum possible random value |
| 0.99 | Upper extreme | `false` | `0.99 < 0.4` is `false` — tests near-maximum random value |

---

## 6. POST /api/likes — Duplicate Match Prevention

**Source:** `server.js:104`
```js
if (stmts.matchExists.get(profileId)) {
    return { inserted: true, matched: false };
}
```

| Test | Scenario | Justification |
|------|----------|---------------|
| Re-like after match | First like with `random=0.1` (match), then re-like same profile | The `matchExists` check returns truthy on the second call, so `matched` should be `false` even though `random` would allow it. Tests the early-return guard. |

---

## 7. GET /api/matches — Delivery Flag Semantics

**Source:** `server.js:167`
```js
const returnAll = req.query.all === "true";
```

**Source:** `server.js:177`
```js
if (!returnAll) { ... markDelivered ... }
```

The `=== "true"` is a **strict string comparison**, not a truthy check. This creates important boundary behavior.

| Test | Query | Expected Behavior | Justification |
|------|-------|-------------------|---------------|
| First normal poll | `/api/matches` | Returns 1 new match | `delivered=0` row exists, `returnAll=false` |
| Second normal poll | `/api/matches` (again) | Returns 0 matches | First poll set `delivered=1` via `markDelivered` |
| `?all=true` after delivery | `/api/matches?all=true` | Returns 1 match | `returnAll=true` → uses `allMatches` query (ignores delivered flag) |
| `?all=true` side effects | Poll `?all=true` first, then normal poll | Normal poll still returns the match | `!returnAll` is `false` → `markDelivered` is **not** called for `?all=true` |
| `?all=1` (not `"true"`) | `/api/matches?all=1` | Treated as normal poll (returns 0) | `"1" === "true"` is `false` — strict equality boundary. This catches code that might use `==` or truthy checks. |
| totalMatches count | After creating 1 match | `totalMatches` is 1 in all responses | The count query (`SELECT COUNT(*)`) runs on every request regardless of delivery |

---

## 8. GET /api/matches — Empty State

| Test | Scenario | Justification |
|------|----------|---------------|
| No matches exist | Fresh DB | Tests the zero-length array path in `rows.map(hydrateRow)` and `matchCount` returning 0 |

---

## 9. GET /api/likes — Debug Endpoint

| Test | Scenario | Justification |
|------|----------|---------------|
| Empty DB | Fresh state | Returns `count: 0`, `likes: []` |
| After inserts | 2 likes added | Returns `count: 2` — verifies the `.length` property matches actual rows |

---

## 10. DELETE /api/likes/:id

**Source:** `server.js:215`
```js
const existed = stmts.deleteLike.run(id).changes > 0;
```

| Test | Input | Expected `removed` | Justification |
|------|-------|--------------------|---------------|
| Existing profile | Previously inserted like | `true` | `.changes > 0` when a row was deleted |
| Non-existent profile | `"nonexistent"` | `false` | `.changes === 0` when no row matched — boundary of `> 0` |
| Cascade to matches | Delete a like that has a match | Match is also deleted | Tests `stmts.deleteMatch.run(id)` on line 216 actually removes the corresponding match row |

---

## 11. hydrateRow — Tags Deserialization

**Source:** `server.js:85-91`
```js
function hydrateRow(row) {
    if (!row) return null;
    return { ...row, tags: JSON.parse(row.tags || "[]") };
}
```

Tested indirectly through the API responses:

| Test | Input tags | Expected output | Justification |
|------|-----------|-----------------|---------------|
| `["A", "B"]` | Non-empty array | `["A", "B"]` | Tests JSON.parse on valid JSON array string |
| `[]` | Empty array | `[]` | Tests `JSON.parse("[]")` — the `row.tags || "[]"` fallback produces the same result |

---

## 12. Match Data Integrity

| Test | Justification |
|------|---------------|
| All fields round-trip correctly | Verifies that `name`, `action`, `img`, and `tags` written via POST /api/likes are faithfully stored in the matches table and returned via GET /api/matches. Tests the full data flow through `saveLikeAndTryMatch` → SQLite → `hydrateRow`. |
