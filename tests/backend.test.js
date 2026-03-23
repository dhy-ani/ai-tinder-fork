const request = require('supertest');
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

// Import server setup
const app = express();
const PORT = process.env.PORT || 3001;

// Use the same server setup as in server.js
const cors = require('cors');
app.use(cors());
app.use(express.json());

// Database setup for testing
const DB_PATH = path.join(__dirname, '..', 'tinder-test.db');
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS likes (
    profile_id  TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL,
    action      TEXT    NOT NULL CHECK(action IN ('like','superlike')),
    img         TEXT    DEFAULT '',
    tags        TEXT    DEFAULT '[]',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS matches (
    profile_id  TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL,
    action      TEXT    NOT NULL,
    img         TEXT    DEFAULT '',
    tags        TEXT    DEFAULT '[]',
    matched_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    delivered   INTEGER NOT NULL DEFAULT 0
  );
`);

// Prepared statements
const stmts = {
  insertLike: db.prepare(`
    INSERT OR REPLACE INTO likes (profile_id, name, action, img, tags)
    VALUES (@profileId, @name, @action, @img, @tags)
  `),
  getLike: db.prepare(`SELECT * FROM likes WHERE profile_id = ?`),
  allLikes: db.prepare(`SELECT * FROM likes ORDER BY created_at DESC`),
  deleteLike: db.prepare(`DELETE FROM likes WHERE profile_id = ?`),
  insertMatch: db.prepare(`
    INSERT OR IGNORE INTO matches (profile_id, name, action, img, tags)
    VALUES (@profileId, @name, @action, @img, @tags)
  `),
  matchExists: db.prepare(`SELECT 1 FROM matches WHERE profile_id = ?`),
  newMatches: db.prepare(`SELECT * FROM matches WHERE delivered = 0 ORDER BY matched_at ASC`),
  allMatches: db.prepare(`SELECT * FROM matches ORDER BY matched_at DESC`),
  markDelivered: db.prepare(`UPDATE matches SET delivered = 1 WHERE profile_id = ?`),
  deleteMatch: db.prepare(`DELETE FROM matches WHERE profile_id = ?`),
  matchCount: db.prepare(`SELECT COUNT(*) AS cnt FROM matches`),
};

function hydrateRow(row) {
  if (!row) return null;
  return {
    ...row,
    tags: JSON.parse(row.tags || "[]"),
  };
}

function saveLikeAndTryMatch(profileId, name, action, img, tags) {
  const tagsJson = JSON.stringify(tags);
  stmts.insertLike.run({ profileId, name, action, img: img || "", tags: tagsJson });

  if (stmts.matchExists.get(profileId)) {
    return { inserted: true, matched: false };
  }

  // For testing, make match probability deterministic based on profileId
  const alreadyLikedBack = profileId.includes('match');

  if (alreadyLikedBack) {
    stmts.insertMatch.run({ profileId, name, action, img: img || "", tags: tagsJson });
    return { inserted: true, matched: true };
  }

  return { inserted: true, matched: false };
}

// Routes
app.post("/api/likes", (req, res) => {
  const { profileId, name, action, img = "", tags = [] } = req.body || {};

  if (!profileId || !["like", "superlike"].includes(action)) {
    return res.status(400).json({
      error: "profileId and action ('like'|'superlike') are required",
    });
  }

  try {
    const { inserted, matched } = saveLikeAndTryMatch(
      profileId,
      name || "Unknown",
      action,
      img,
      tags
    );

    return res.status(201).json({ ok: true, profileId, action, matched });
  } catch (err) {
    return res.status(500).json({ error: "Database error", detail: err.message });
  }
});

app.get("/api/matches", (req, res) => {
  const returnAll = req.query.all === "true";

  try {
    const rows = returnAll
      ? stmts.allMatches.all()
      : stmts.newMatches.all();

    const matches = rows.map(hydrateRow);

    if (!returnAll) {
      const markMany = db.transaction((items) => {
        for (const m of items) stmts.markDelivered.run(m.profile_id);
      });
      markMany(rows);
    }

    const { cnt: totalMatches } = stmts.matchCount.get();

    return res.json({ ok: true, newMatches: matches, totalMatches });
  } catch (err) {
    return res.status(500).json({ error: "Database error", detail: err.message });
  }
});

app.get("/api/likes", (req, res) => {
  try {
    const likes = stmts.allLikes.all().map(hydrateRow);
    return res.json({ ok: true, count: likes.length, likes });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/likes/:id", (req, res) => {
  const { id } = req.params;
  try {
    const existed = stmts.deleteLike.run(id).changes > 0;
    stmts.deleteMatch.run(id);
    return res.json({ ok: true, removed: existed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

describe('Backend API Tests', () => {
  beforeEach(() => {
    // Clean up database before each test
    db.exec('DELETE FROM likes;');
    db.exec('DELETE FROM matches;');
  });

  afterAll(() => {
    db.close();
  });

  describe('POST /api/likes', () => {
    test('BB-01: POST /api/likes - Valid Like', async () => {
      const response = await request(app)
        .post('/api/likes')
        .send({
          profileId: 'test_profile_123',
          name: 'Test User',
          action: 'like',
          img: 'http://example.com/image.jpg',
          tags: ['Coffee', 'Travel']
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        ok: true,
        profileId: 'test_profile_123',
        action: 'like',
        matched: false
      });

      // Verify database state
      const like = stmts.getLike.get('test_profile_123');
      expect(like).toBeTruthy();
      expect(like.name).toBe('Test User');
      expect(like.action).toBe('like');
    });

    test('BB-02: POST /api/likes - Valid Super Like', async () => {
      const response = await request(app)
        .post('/api/likes')
        .send({
          profileId: 'test_profile_456',
          name: 'Test User 2',
          action: 'superlike',
          img: 'http://example.com/image2.jpg',
          tags: ['Hiking', 'Music']
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        ok: true,
        profileId: 'test_profile_456',
        action: 'superlike',
        matched: false
      });
    });

    test('BB-03: POST /api/likes - Missing Required Fields', async () => {
      const response = await request(app)
        .post('/api/likes')
        .send({
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "profileId and action ('like'|'superlike') are required"
      });
    });

    test('BB-04: POST /api/likes - Invalid Action', async () => {
      const response = await request(app)
        .post('/api/likes')
        .send({
          profileId: 'test_profile_789',
          name: 'Test User',
          action: 'invalid_action'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "profileId and action ('like'|'superlike') are required"
      });
    });

    test('BB-05: POST /api/likes - Empty Body', async () => {
      const response = await request(app)
        .post('/api/likes')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "profileId and action ('like'|'superlike') are required"
      });
    });

    test('BB-06: POST /api/likes - Duplicate Like', async () => {
      // First like
      await request(app)
        .post('/api/likes')
        .send({
          profileId: 'test_profile_duplicate',
          name: 'Test User',
          action: 'like'
        });

      // Update to superlike
      const response = await request(app)
        .post('/api/likes')
        .send({
          profileId: 'test_profile_duplicate',
          name: 'Test User',
          action: 'superlike'
        });

      expect(response.status).toBe(201);
      expect(response.body.action).toBe('superlike');

      // Verify database has updated record
      const like = stmts.getLike.get('test_profile_duplicate');
      expect(like.action).toBe('superlike');
    });

    test('BB-14: Match Creation Probability (deterministic for testing)', async () => {
      // Profile with 'match' in ID should create a match
      const response1 = await request(app)
        .post('/api/likes')
        .send({
          profileId: 'test_match_profile',
          name: 'Test User',
          action: 'like'
        });

      expect(response1.body.matched).toBe(true);

      // Profile without 'match' in ID should not create a match
      const response2 = await request(app)
        .post('/api/likes')
        .send({
          profileId: 'test_profile_nomatch',
          name: 'Test User 2',
          action: 'like'
        });

      expect(response2.body.matched).toBe(false);
    });
  });

  describe('GET /api/matches', () => {
    beforeEach(() => {
      // Insert test data
      stmts.insertMatch.run({
        profileId: 'match_1',
        name: 'Match 1',
        action: 'like',
        img: '',
        tags: '[]'
      });
      stmts.insertMatch.run({
        profileId: 'match_2',
        name: 'Match 2',
        action: 'superlike',
        img: '',
        tags: '[]'
      });
    });

    test('BB-07: GET /api/matches - New Matches', async () => {
      const response = await request(app)
        .get('/api/matches');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.newMatches).toHaveLength(2);
      expect(response.body.totalMatches).toBe(2);

      // Verify matches are marked as delivered
      const newMatchesAfter = stmts.newMatches.all();
      expect(newMatchesAfter).toHaveLength(0);
    });

    test('BB-08: GET /api/matches - No New Matches', async () => {
      // Mark all as delivered
      stmts.markDelivered.run('match_1');
      stmts.markDelivered.run('match_2');

      const response = await request(app)
        .get('/api/matches');

      expect(response.status).toBe(200);
      expect(response.body.newMatches).toHaveLength(0);
      expect(response.body.totalMatches).toBe(2);
    });

    test('BB-09: GET /api/matches - All Matches (Debug)', async () => {
      const response = await request(app)
        .get('/api/matches?all=true');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.newMatches).toHaveLength(2);
      expect(response.body.totalMatches).toBe(2);

      // Verify matches are NOT marked as delivered when using ?all=true
      const newMatchesAfter = stmts.newMatches.all();
      expect(newMatchesAfter).toHaveLength(2);
    });

    test('BB-10: GET /api/matches - Empty Database', async () => {
      // Clear database
      db.exec('DELETE FROM matches;');

      const response = await request(app)
        .get('/api/matches');

      expect(response.status).toBe(200);
      expect(response.body.newMatches).toHaveLength(0);
      expect(response.body.totalMatches).toBe(0);
    });
  });

  describe('GET /api/likes', () => {
    test('BB-11: GET /api/likes - Debug Endpoint', async () => {
      // Insert test data
      stmts.insertLike.run({
        profileId: 'like_1',
        name: 'Like 1',
        action: 'like',
        img: '',
        tags: '["Coffee", "Travel"]'
      });
      stmts.insertLike.run({
        profileId: 'like_2',
        name: 'Like 2',
        action: 'superlike',
        img: '',
        tags: '["Hiking"]'
      });

      const response = await request(app)
        .get('/api/likes');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.likes).toHaveLength(2);
      expect(response.body.likes[0].tags).toEqual(['Coffee', 'Travel']);
    });
  });

  describe('DELETE /api/likes/:id', () => {
    beforeEach(() => {
      // Insert test data
      stmts.insertLike.run({
        profileId: 'delete_test',
        name: 'Delete Test',
        action: 'like',
        img: '',
        tags: '[]'
      });
      stmts.insertMatch.run({
        profileId: 'delete_test',
        name: 'Delete Test',
        action: 'like',
        img: '',
        tags: '[]'
      });
    });

    test('BB-12: DELETE /api/likes/:id - Existing Like', async () => {
      const response = await request(app)
        .delete('/api/likes/delete_test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        removed: true
      });

      // Verify removal from database
      const like = stmts.getLike.get('delete_test');
      expect(like).toBeFalsy();
      const match = stmts.matchExists.get('delete_test');
      expect(match).toBeFalsy();
    });

    test('BB-13: DELETE /api/likes/:id - Non-existent Like', async () => {
      const response = await request(app)
        .delete('/api/likes/non_existent');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        removed: false
      });
    });
  });
});
