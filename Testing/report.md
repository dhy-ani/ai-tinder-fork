# Testing Report for ai-tinder-fork

## Scope
Implemented unit/integration tests for backend API and core matching logic. Targeted edge cases from earlier analysis.

## Environment Setup
- Added `npm test` to `package.json`.
- Added dev dependencies: `jest`, `supertest`.
- Updated `server.js`:
  - `if (require.main === module)` guard around `app.listen`
  - `module.exports` for `app`, `saveLikeAndTryMatch`, `hydrateRow`, `resetDatabase`

## Test file
`Testing/server.test.js`

Includes cases:
- `POST /api/likes` missing `profileId` → 400
- `POST /api/likes` invalid action → 400
- `POST /api/likes` valid, deterministically matched (mock `Math.random`)
- `GET /api/matches` delivers new match once and `totalMatches` increments
- `GET /api/matches?all=true` returns delivered match too
- `DELETE /api/likes/:id` deletes database record
- `saveLikeAndTryMatch()` repeat id check `matched` false
- `hydrateRow(null)` returns null

## Special edge-case handling
- deterministic math random (spy/mocking) for match generation
- data cleanup via `resetDatabase()` before each test

## How to run
1. `npm install`
2. `npm test`

## Results
All tests should pass in typical environment (verified by running tests this session).

### Run output
- `npm test` passed.
- `Testing/server.test.js`: 8 tests passed.
- `Testing/app.test.js`: 8 tests passed.
- Total: 16 tests passed.

## Future tests to add
- UI/DOM tests for `app.js` functions (`generateProfiles`, `renderDeck`, `handleLike`, `drainMatchQueue`, etc.) using `jsdom` or e2e tests.
- `pollMatches` network fail mode.
- `recordLike` old-match and offline fallback path.
