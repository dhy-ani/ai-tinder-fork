# AI Tinder Testing Guide

## Overview

This guide explains how to run the executable unit tests for the AI Tinder project. The tests are based on the black box test cases and cover both frontend interface interactions and backend API endpoints.

## Setup

### 1. Install Dependencies

```bash
cd c:\CS485\in-class-activity\ai-tinder-fork
npm install
```

This will install:
- **Jest**: Testing framework
- **Supertest**: HTTP assertion library for backend tests
- **Puppeteer**: Headless browser for frontend tests
- **@jest/globals**: Jest global utilities

### 2. Test Structure

```
tests/
├── setup.js              # Test setup and teardown
├── backend.test.js       # Backend API tests (BB-01 to BB-16)
└── frontend.test.js      # Frontend interface tests (FB-01 to FB-16)
```

## Running Tests

### Basic Test Commands

#### Run All Tests
```bash
npm test
```
This runs both backend and frontend tests.

#### Run Backend Tests Only
```bash
npm test -- tests/backend.test.js
```

#### Run Frontend Tests Only
```bash
npm test -- tests/frontend.test.js
```

#### Run Specific Test Case
```bash
npm test -- --testNamePattern="BB-01"
```

### Advanced Test Commands

#### Run Tests in Watch Mode
```bash
npm run test:watch
```
Tests will automatically re-run when files change.

#### Run Tests with Coverage Report
```bash
npm run test:coverage
```
Generates a detailed coverage report in the `coverage/` directory.

#### Run Tests with Verbose Output
```bash
npm test -- --verbose
```

#### Run Tests and Update Snapshots
```bash
npm test -- --updateSnapshot
```

## Test Categories

### Backend Tests (16 tests)

**API Endpoint Testing:**
- `POST /api/likes` - Like and super like submissions
- `GET /api/matches` - Match polling and retrieval
- `GET /api/likes` - Debug endpoint for likes
- `DELETE /api/likes/:id` - Like deletion

**Test Cases Covered:**
- BB-01 to BB-06: Like processing and validation
- BB-07 to BB-10: Match retrieval scenarios
- BB-11: Debug endpoint functionality
- BB-12 to BB-13: Delete operations
- BB-14: Match creation logic (deterministic for testing)

### Frontend Tests (16 tests)

**User Interface Testing:**
- Card deck initialization and management
- Button interactions (like, nope, super like)
- Swipe gesture recognition
- Advanced interactions (double tap, shuffle)
- Match notification system
- Empty deck behavior

**Test Cases Covered:**
- FB-01 to FB-04: Core button functionality
- FB-05 to FB-08: Swipe gesture testing
- FB-09 to FB-11: Advanced interactions
- FB-12 to FB-13: Match notifications
- FB-11: Empty deck handling

## Test Environment

### Backend Test Environment
- Uses in-memory SQLite database (`tinder-test.db`)
- Deterministic match creation based on profile ID patterns
- Isolated test database that's cleaned between tests
- Mock server setup for consistent testing

### Frontend Test Environment
- Headless Chrome browser via Puppeteer
- Automatic server startup/teardown
- Real DOM manipulation and event testing
- Visual feedback testing (animations, transitions)

## Expected Test Results

### Successful Test Run
```
 PASS  tests/backend.test.js
  Backend API Tests
    POST /api/likes
      ✓ BB-01: POST /api/likes - Valid Like (45 ms)
      ✓ BB-02: POST /api/likes - Valid Super Like (12 ms)
      ✓ BB-03: POST /api/likes - Missing Required Fields (8 ms)
      ✓ BB-04: POST /api/likes - Invalid Action (7 ms)
      ✓ BB-05: POST /api/likes - Empty Body (6 ms)
      ✓ BB-06: POST /api/likes - Duplicate Like (15 ms)
      ✓ BB-14: Match Creation Probability (deterministic for testing) (23 ms)
    GET /api/matches
      ✓ BB-07: GET /api/matches - New Matches (18 ms)
      ✓ BB-08: GET /api/matches - No New Matches (12 ms)
      ✓ BB-09: GET /api/matches - All Matches (Debug) (14 ms)
      ✓ BB-10: GET /api/matches - Empty Database (9 ms)
    GET /api/likes
      ✓ BB-11: GET /api/likes - Debug Endpoint (11 ms)
    DELETE /api/likes/:id
      ✓ BB-12: DELETE /api/likes/:id - Existing Like (16 ms)
      ✓ BB-13: DELETE /api/likes/:id - Non-existent Like (8 ms)

 PASS  tests/frontend.test.js
  Frontend Interface Tests
    Card Deck Initialization
      ✓ FB-01: Card Deck Initialization (523 ms)
    Button Functionality
      ✓ FB-02: Like Button Functionality (412 ms)
      ✓ FB-03: Nope Button Functionality (389 ms)
      ✓ FB-04: Super Like Button Functionality (401 ms)
    Swipe Gestures
      ✓ FB-05: Swipe Gestures - Right Swipe (Like) (445 ms)
      ✓ FB-06: Swipe Gestures - Left Swipe (Nope) (438 ms)
      ✓ FB-07: Swipe Gestures - Up Swipe (Super Like) (423 ms)
      ✓ FB-08: Insufficient Swipe Distance (367 ms)
    Advanced Interactions
      ✓ FB-09: Double Tap for Next Photo (289 ms)
      ✓ FB-10: Shuffle Button Functionality (567 ms)
      ✓ FB-11: Empty Deck Behavior (1234 ms)
    Match Notifications
      ✓ FB-12: Match Notification Display (234 ms)
      ✓ FB-13: Match Banner Manual Dismiss (198 ms)
    UI Elements
      ✓ Poll indicator is visible (156 ms)
      ✓ All control buttons are present (145 ms)

Test Suites: 2 passed, 2 total
Tests:       30 passed, 30 total
Snapshots:   0 total
Time:        8.234 s
```

## Troubleshooting

### Common Issues

#### Port Already in Use
If port 3000 is already in use, the tests may fail. Stop any running servers:

```bash
# Find and kill Node processes on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### Puppeteer Installation Issues
On Windows, Puppeteer may require additional setup:

```bash
# Reinstall Puppeteer with forced download
npm install puppeteer --force
```

#### Database Permission Issues
If database tests fail due to permissions:

```bash
# Delete test database files
del tinder.db tinder-test.db
```

#### Frontend Tests Time Out
If frontend tests are slow or time out:

```bash
# Run with increased timeout
npm test -- --testTimeout=30000
```

### Debug Mode

To run tests with additional debugging:

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run Puppeteer tests in headed mode (visible browser)
DEBUG=true npm test -- tests/frontend.test.js
```

## Continuous Integration

These tests are designed to work in CI/CD environments:

```bash
# CI-friendly command (no watch, clear output)
CI=true npm test -- --ci --coverage --watchAll=false
```

## Coverage Reports

After running tests with coverage:

```bash
# View coverage report
open coverage/lcov-report/index.html

# View coverage in terminal
npm run test:coverage
```

Expected coverage areas:
- Backend: API endpoints, database operations
- Frontend: UI interactions, event handlers
- Overall: Input validation, error handling

## Next Steps

1. **Run the tests** using the commands above
2. **Review coverage reports** to identify untested code paths
3. **Add edge case tests** as needed
4. **Integrate with CI/CD** pipeline for automated testing
