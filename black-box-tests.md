# AI Tinder Black Box Tests

## Frontend Interface Tests

### Test Case FB-01: Card Deck Initialization
**Description**: Verify that the application loads and displays a deck of profile cards on startup.
**Inputs**: Application launch
**Expected Outputs**: 
- 12 profile cards displayed in deck
- Each card contains: name, age, location, job title, bio, tags, profile image
- Cards are stacked with proper z-index (top card fully visible)
**Test Steps**:
1. Launch application
2. Verify deck contains exactly 12 cards
3. Verify each card has all required elements
4. Verify card stacking order

### Test Case FB-02: Like Button Functionality
**Description**: Test the like button interaction and card removal.
**Inputs**: Click like button (♥)
**Expected Outputs**:
- Top card animates to the right and fades out
- Card is removed from deck
- Next card becomes top card
- Like action is sent to backend
**Test Steps**:
1. Ensure deck has cards
2. Click like button
3. Verify animation and removal
4. Verify new top card
5. Check backend received like request

### Test Case FB-03: Nope Button Functionality
**Description**: Test the nope button interaction and card removal.
**Inputs**: Click nope button (✖)
**Expected Outputs**:
- Top card animates to the left and fades out
- Card is removed from deck
- Next card becomes top card
- No backend request sent
**Test Steps**:
1. Ensure deck has cards
2. Click nope button
3. Verify animation and removal
4. Verify new top card
5. Verify no backend request

### Test Case FB-04: Super Like Button Functionality
**Description**: Test the super like button interaction and card removal.
**Inputs**: Click super like button (★)
**Expected Outputs**:
- Top card animates upward and fades out
- Card is removed from deck
- Next card becomes top card
- Super like action is sent to backend
**Test Steps**:
1. Ensure deck has cards
2. Click super like button
3. Verify animation and removal
4. Verify new top card
5. Check backend received super like request

### Test Case FB-05: Swipe Gestures - Right Swipe (Like)
**Description**: Test right swipe gesture for liking.
**Inputs**: Drag card right beyond threshold (>80px)
**Expected Outputs**:
- Card animates to right and fades out
- Card is removed
- Like action sent to backend
**Test Steps**:
1. Press and hold top card
2. Drag right beyond 80px threshold
3. Release
4. Verify like behavior

### Test Case FB-06: Swipe Gestures - Left Swipe (Nope)
**Description**: Test left swipe gesture for rejecting.
**Inputs**: Drag card left beyond threshold (>80px)
**Expected Outputs**:
- Card animates to left and fades out
- Card is removed
- No backend request
**Test Steps**:
1. Press and hold top card
2. Drag left beyond 80px threshold
3. Release
4. Verify nope behavior

### Test Case FB-07: Swipe Gestures - Up Swipe (Super Like)
**Description**: Test up swipe gesture for super liking.
**Inputs**: Drag card up beyond threshold (>80px)
**Expected Outputs**:
- Card animates upward and fades out
- Card is removed
- Super like action sent to backend
**Test Steps**:
1. Press and hold top card
2. Drag up beyond 80px threshold
3. Release
4. Verify super like behavior

### Test Case FB-08: Insufficient Swipe Distance
**Description**: Test that insufficient swipe returns card to center.
**Inputs**: Drag card less than threshold distance (<80px)
**Expected Outputs**:
- Card returns to center position
- Card remains in deck
- No action sent to backend
**Test Steps**:
1. Press and hold top card
2. Drag less than 80px in any direction
3. Release
4. Verify card returns to center

### Test Case FB-09: Double Tap for Next Photo
**Description**: Test double tap functionality for photo brightness effect.
**Inputs**: Double tap top card within 300ms
**Expected Outputs**:
- Photo brightness increases temporarily
- Effect lasts 150ms
- Card remains in deck
**Test Steps**:
1. Double tap top card quickly
2. Verify brightness effect
3. Verify card remains

### Test Case FB-10: Shuffle Button Functionality
**Description**: Test shuffle button generates new deck.
**Inputs**: Click shuffle button
**Expected Outputs**:
- New set of 12 profile cards generated
- Old cards replaced
- New cards have different profiles
**Test Steps**:
1. Note current profiles
2. Click shuffle button
3. Verify 12 new cards
4. Verify profiles are different

### Test Case FB-11: Empty Deck Behavior
**Description**: Test application behavior when all cards are swiped.
**Inputs**: Swipe all cards until deck is empty
**Expected Outputs**:
- Deck shows empty state
- Controls remain functional
- Shuffle button can generate new deck
**Test Steps**:
1. Swipe all 12 cards
2. Verify empty deck
3. Test button states
4. Test shuffle functionality

### Test Case FB-12: Match Notification Display
**Description**: Test match notification banner when match occurs.
**Inputs**: Backend returns match data
**Expected Outputs**:
- Match banner appears with animation
- Shows match profile info
- Match count badge increments
- Banner auto-dismisses after 6 seconds
**Test Steps**:
1. Trigger a match (via backend simulation)
2. Verify banner appearance
3. Verify match info display
4. Verify badge increment
5. Wait for auto-dismiss

### Test Case FB-13: Match Banner Manual Dismiss
**Description**: Test manual dismissal of match notification.
**Inputs**: Click dismiss button (✕) on match banner
**Expected Outputs**:
- Banner immediately dismisses
- Next queued match shows if available
**Test Steps**:
1. Trigger match
2. Click dismiss button
3. Verify immediate dismissal
4. Test queue behavior

### Test Case FB-14: Multiple Match Queue
**Description**: Test behavior with multiple matches in queue.
**Inputs**: Multiple matches arrive simultaneously
**Expected Outputs**:
- Matches display one at a time
- Each shows for 6 seconds or until dismissed
- Queue processes in order received
**Test Steps**:
1. Trigger multiple matches
2. Verify sequential display
3. Verify timing and order

### Test Case FB-15: Backend Offline Behavior
**Description**: Test application behavior when backend is unavailable.
**Inputs**: Backend server not running
**Expected Outputs**:
- Application loads and functions normally
- Like/super like actions fail gracefully
- Error logged to console
- UI remains responsive
**Test Steps**:
1. Stop backend server
2. Launch application
3. Test like/super like actions
4. Verify graceful degradation

### Test Case FB-16: Match Polling Behavior
**Description**: Test periodic polling for new matches.
**Inputs**: Application running for 10+ seconds
**Expected Outputs**:
- Polling occurs every 10 seconds
- Poll indicator shows "Live" status
- New matches trigger notifications
**Test Steps**:
1. Launch application
2. Wait 10+ seconds
3. Verify polling attempts
4. Trigger backend match
5. Verify notification appears

## Backend API Tests

### Test Case BB-01: POST /api/likes - Valid Like
**Description**: Test successful like submission.
**Inputs**: 
```json
{
  "profileId": "test_profile_123",
  "name": "Test User",
  "action": "like",
  "img": "http://example.com/image.jpg",
  "tags": ["Coffee", "Travel"]
}
```
**Expected Outputs**:
- Status: 201 Created
- Response: `{"ok": true, "profileId": "test_profile_123", "action": "like", "matched": true/false}`
- Like stored in database
**Test Steps**:
1. Send POST request with valid data
2. Verify response status and format
3. Check database for like record

### Test Case BB-02: POST /api/likes - Valid Super Like
**Description**: Test successful super like submission.
**Inputs**:
```json
{
  "profileId": "test_profile_456",
  "name": "Test User 2",
  "action": "superlike",
  "img": "http://example.com/image2.jpg",
  "tags": ["Hiking", "Music"]
}
```
**Expected Outputs**:
- Status: 201 Created
- Response: `{"ok": true, "profileId": "test_profile_456", "action": "superlike", "matched": true/false}`
- Super like stored in database
**Test Steps**:
1. Send POST request with superlike action
2. Verify response status and format
3. Check database for super like record

### Test Case BB-03: POST /api/likes - Missing Required Fields
**Description**: Test validation of required fields.
**Inputs**: 
```json
{
  "name": "Test User"
  // Missing profileId and action
}
```
**Expected Outputs**:
- Status: 400 Bad Request
- Response: `{"error": "profileId and action ('like'|'superlike') are required"}`
**Test Steps**:
1. Send POST request missing required fields
2. Verify 400 status
3. Verify error message

### Test Case BB-04: POST /api/likes - Invalid Action
**Description**: Test validation of action field.
**Inputs**:
```json
{
  "profileId": "test_profile_789",
  "name": "Test User",
  "action": "invalid_action"
}
```
**Expected Outputs**:
- Status: 400 Bad Request
- Response: `{"error": "profileId and action ('like'|'superlike') are required"}`
**Test Steps**:
1. Send POST request with invalid action
2. Verify 400 status
3. Verify error message

### Test Case BB-05: POST /api/likes - Empty Body
**Description**: Test handling of empty request body.
**Inputs**: Empty request body
**Expected Outputs**:
- Status: 400 Bad Request
- Response: `{"error": "profileId and action ('like'|'superlike') are required"}`
**Test Steps**:
1. Send POST request with empty body
2. Verify 400 status
3. Verify error message

### Test Case BB-06: POST /api/likes - Duplicate Like
**Description**: Test updating existing like record.
**Inputs**: Same profileId with different action
**Expected Outputs**:
- Status: 201 Created
- Response: `{"ok": true, "profileId": "...", "action": "superlike", "matched": true/false}`
- Like record updated in database
**Test Steps**:
1. Send like for profile
2. Send super like for same profile
3. Verify update occurred
4. Check database state

### Test Case BB-07: GET /api/matches - New Matches
**Description**: Test polling for new undelivered matches.
**Inputs**: No query parameters
**Expected Outputs**:
- Status: 200 OK
- Response: `{"ok": true, "newMatches": [...], "totalMatches": N}`
- Returned matches marked as delivered
**Test Steps**:
1. Create matches in database
2. Send GET request
3. Verify response format
4. Verify matches marked delivered

### Test Case BB-08: GET /api/matches - No New Matches
**Description**: Test polling when no new matches exist.
**Inputs**: No query parameters, no undelivered matches
**Expected Outputs**:
- Status: 200 OK
- Response: `{"ok": true, "newMatches": [], "totalMatches": N}`
**Test Steps**:
1. Ensure no undelivered matches
2. Send GET request
3. Verify empty newMatches array

### Test Case BB-09: GET /api/matches - All Matches (Debug)
**Description**: Test debug endpoint for all matches.
**Inputs**: Query parameter `?all=true`
**Expected Outputs**:
- Status: 200 OK
- Response: `{"ok": true, "newMatches": [...], "totalMatches": N}`
- All matches returned, not marked as delivered
**Test Steps**:
1. Send GET request with ?all=true
2. Verify all matches returned
3. Verify delivery status unchanged

### Test Case BB-10: GET /api/matches - Empty Database
**Description**: Test matches endpoint with empty database.
**Inputs**: Empty matches table
**Expected Outputs**:
- Status: 200 OK
- Response: `{"ok": true, "newMatches": [], "totalMatches": 0}`
**Test Steps**:
1. Clear matches table
2. Send GET request
3. Verify empty response

### Test Case BB-11: GET /api/likes - Debug Endpoint
**Description**: Test debug endpoint for all likes.
**Inputs**: No parameters
**Expected Outputs**:
- Status: 200 OK
- Response: `{"ok": true, "count": N, "likes": [...]}`
- All likes returned with proper format
**Test Steps**:
1. Create various likes
2. Send GET request to /api/likes
3. Verify response format and count

### Test Case BB-12: DELETE /api/likes/:id - Existing Like
**Description**: Test deletion of existing like and associated match.
**Inputs**: Valid like ID in URL parameter
**Expected Outputs**:
- Status: 200 OK
- Response: `{"ok": true, "removed": true}`
- Like and match removed from database
**Test Steps**:
1. Create like and match
2. Send DELETE request
3. Verify removal from database

### Test Case BB-13: DELETE /api/likes/:id - Non-existent Like
**Description**: Test deletion of non-existent like.
**Inputs**: Invalid like ID in URL parameter
**Expected Outputs**:
- Status: 200 OK
- Response: `{"ok": true, "removed": false}`
**Test Steps**:
1. Send DELETE with invalid ID
2. Verify response indicates not removed

### Test Case BB-14: Match Creation Probability
**Description**: Test 40% probability of match creation.
**Inputs**: Multiple like submissions for same profile
**Expected Outputs**: Approximately 40% result in matches
**Test Steps**:
1. Send 100 like requests for different profiles
2. Count match responses
3. Verify approximately 40% match rate

### Test Case BB-15: Database Persistence
**Description**: Test that data persists across server restarts.
**Inputs**: Server restart
**Expected Outputs**:
- Likes and matches preserved
- Data accessible after restart
**Test Steps**:
1. Create likes and matches
2. Restart server
3. Verify data still accessible

### Test Case BB-16: Concurrent Requests
**Description**: Test handling of simultaneous requests.
**Inputs**: Multiple concurrent like requests
**Expected Outputs**:
- All requests processed successfully
- Data integrity maintained
- No database locks
**Test Steps**:
1. Send 10 concurrent requests
2. Verify all succeed
3. Check database consistency
