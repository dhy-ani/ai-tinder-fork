const request = require("supertest");
const { app, db } = require("./server");

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Wipe both tables between tests so they are fully isolated. */
function resetDB() {
  db.exec("DELETE FROM matches");
  db.exec("DELETE FROM likes");
}

afterEach(resetDB);
afterAll(() => db.close());

// ─── POST /api/likes — input validation (server.js:135) ────────────────────────
// Condition: !profileId || !["like", "superlike"].includes(action)

describe("POST /api/likes — validation", () => {
  test("400 when profileId is missing (falsy branch of !profileId)", async () => {
    const res = await request(app)
      .post("/api/likes")
      .send({ action: "like", name: "Test" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/profileId/);
  });

  test("400 when profileId is empty string (falsy branch of !profileId)", async () => {
    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "", action: "like", name: "Test" });
    expect(res.status).toBe(400);
  });

  test("400 when action is missing (not in allowed list)", async () => {
    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "p1", name: "Test" });
    expect(res.status).toBe(400);
  });

  test("400 when action is invalid string (not 'like' or 'superlike')", async () => {
    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "p1", action: "dislike", name: "Test" });
    expect(res.status).toBe(400);
  });

  test("201 when action is exactly 'like' (boundary of includes check)", async () => {
    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "p1", action: "like", name: "Alice" });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.action).toBe("like");
  });

  test("201 when action is exactly 'superlike' (boundary of includes check)", async () => {
    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "p2", action: "superlike", name: "Bob" });
    expect(res.status).toBe(201);
    expect(res.body.action).toBe("superlike");
  });

  test("400 when body is null/undefined (req.body || {} branch)", async () => {
    const res = await request(app)
      .post("/api/likes")
      .set("Content-Type", "application/json")
      .send("null");
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/likes — name fallback (server.js:143) ───────────────────────────
// Condition: name || "Unknown"

describe("POST /api/likes — name fallback", () => {
  test("uses 'Unknown' when name is omitted", async () => {
    await request(app)
      .post("/api/likes")
      .send({ profileId: "pNoName", action: "like" });

    const res = await request(app).get("/api/likes");
    const like = res.body.likes.find((l) => l.profile_id === "pNoName");
    expect(like.name).toBe("Unknown");
  });

  test("preserves provided name when present", async () => {
    await request(app)
      .post("/api/likes")
      .send({ profileId: "pNamed", action: "like", name: "Charlie" });

    const res = await request(app).get("/api/likes");
    const like = res.body.likes.find((l) => l.profile_id === "pNamed");
    expect(like.name).toBe("Charlie");
  });
});

// ─── POST /api/likes — img default (server.js:101, 133) ────────────────────────
// Condition: img || "" in saveLikeAndTryMatch, default img = "" in destructure

describe("POST /api/likes — optional fields default", () => {
  test("img defaults to empty string when omitted", async () => {
    await request(app)
      .post("/api/likes")
      .send({ profileId: "pImg", action: "like", name: "A" });

    const res = await request(app).get("/api/likes");
    const like = res.body.likes.find((l) => l.profile_id === "pImg");
    expect(like.img).toBe("");
  });

  test("tags default to empty array when omitted", async () => {
    await request(app)
      .post("/api/likes")
      .send({ profileId: "pTags", action: "like", name: "A" });

    const res = await request(app).get("/api/likes");
    const like = res.body.likes.find((l) => l.profile_id === "pTags");
    expect(like.tags).toEqual([]);
  });

  test("tags are round-tripped correctly through JSON serialization", async () => {
    await request(app)
      .post("/api/likes")
      .send({ profileId: "pTagsRT", action: "like", name: "A", tags: ["Hiking", "Dogs"] });

    const res = await request(app).get("/api/likes");
    const like = res.body.likes.find((l) => l.profile_id === "pTagsRT");
    expect(like.tags).toEqual(["Hiking", "Dogs"]);
  });
});

// ─── POST /api/likes — upsert behavior (INSERT OR REPLACE, server.js:62) ──────

describe("POST /api/likes — upsert (INSERT OR REPLACE)", () => {
  test("second like with same profileId overwrites the first", async () => {
    await request(app)
      .post("/api/likes")
      .send({ profileId: "pDup", action: "like", name: "First" });
    await request(app)
      .post("/api/likes")
      .send({ profileId: "pDup", action: "superlike", name: "Second" });

    const res = await request(app).get("/api/likes");
    const hits = res.body.likes.filter((l) => l.profile_id === "pDup");
    expect(hits).toHaveLength(1);
    expect(hits[0].action).toBe("superlike");
    expect(hits[0].name).toBe("Second");
  });
});

// ─── POST /api/likes — match logic (server.js:104-117) ─────────────────────────
// Condition 1: stmts.matchExists.get(profileId) → already matched, return false
// Condition 2: Math.random() < 0.4 → 40% match probability boundary

describe("POST /api/likes — match probability", () => {
  test("match occurs when Math.random() returns value < 0.4 (e.g. 0.39)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.39);

    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "pMatch", action: "like", name: "Lucky" });

    expect(res.body.matched).toBe(true);
    Math.random.mockRestore();
  });

  test("no match when Math.random() returns exactly 0.4 (boundary — NOT < 0.4)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.4);

    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "pNoMatch", action: "like", name: "Unlucky" });

    expect(res.body.matched).toBe(false);
    Math.random.mockRestore();
  });

  test("no match when Math.random() returns 0.41 (just above boundary)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.41);

    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "pAbove", action: "like", name: "Nope" });

    expect(res.body.matched).toBe(false);
    Math.random.mockRestore();
  });

  test("match occurs when Math.random() returns 0.0 (lower extreme)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.0);

    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "pZero", action: "like", name: "Zero" });

    expect(res.body.matched).toBe(true);
    Math.random.mockRestore();
  });

  test("no match when Math.random() returns 0.99 (upper extreme)", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.99);

    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "pHigh", action: "like", name: "High" });

    expect(res.body.matched).toBe(false);
    Math.random.mockRestore();
  });
});

// ─── POST /api/likes — duplicate match prevention (server.js:104) ───────────────
// Condition: if (stmts.matchExists.get(profileId)) → return matched: false

describe("POST /api/likes — duplicate match prevention", () => {
  test("re-liking a profile that already matched returns matched: false", async () => {
    // Force first like to match
    jest.spyOn(Math, "random").mockReturnValue(0.1);
    const first = await request(app)
      .post("/api/likes")
      .send({ profileId: "pDupMatch", action: "like", name: "DupTest" });
    expect(first.body.matched).toBe(true);
    Math.random.mockRestore();

    // Second like for same profile — match already exists
    jest.spyOn(Math, "random").mockReturnValue(0.1);
    const second = await request(app)
      .post("/api/likes")
      .send({ profileId: "pDupMatch", action: "superlike", name: "DupTest" });
    expect(second.body.matched).toBe(false);
    Math.random.mockRestore();
  });
});

// ─── GET /api/matches — delivery flag (server.js:167-188) ───────────────────────
// Condition: req.query.all === "true" (strict string equality)
// Branch: !returnAll → marks matches as delivered

describe("GET /api/matches — delivery semantics", () => {
  beforeEach(async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.1); // force match
    await request(app)
      .post("/api/likes")
      .send({ profileId: "pDeliv", action: "like", name: "DelivTest" });
    Math.random.mockRestore();
  });

  test("first poll returns the new match (delivered = 0)", async () => {
    const res = await request(app).get("/api/matches");
    expect(res.body.ok).toBe(true);
    expect(res.body.newMatches).toHaveLength(1);
    expect(res.body.newMatches[0].profile_id).toBe("pDeliv");
  });

  test("second poll returns empty (match was marked delivered = 1)", async () => {
    await request(app).get("/api/matches"); // marks delivered
    const res = await request(app).get("/api/matches");
    expect(res.body.newMatches).toHaveLength(0);
  });

  test("?all=true returns all matches regardless of delivered flag", async () => {
    await request(app).get("/api/matches"); // marks delivered
    const res = await request(app).get("/api/matches?all=true");
    expect(res.body.newMatches).toHaveLength(1);
  });

  test("?all=true does NOT mark matches as delivered", async () => {
    await request(app).get("/api/matches?all=true"); // should NOT mark delivered
    const res = await request(app).get("/api/matches"); // normal poll
    expect(res.body.newMatches).toHaveLength(1); // still undelivered
  });

  test("?all=1 is NOT treated as 'true' (strict === 'true' check)", async () => {
    await request(app).get("/api/matches"); // marks delivered
    const res = await request(app).get("/api/matches?all=1");
    // all=1 does not match === "true", so treated as normal poll → returns empty
    expect(res.body.newMatches).toHaveLength(0);
  });

  test("totalMatches count reflects all matches regardless of delivery", async () => {
    const res = await request(app).get("/api/matches");
    expect(res.body.totalMatches).toBe(1);

    const after = await request(app).get("/api/matches");
    expect(after.totalMatches || after.body.totalMatches).toBe(1);
  });
});

// ─── GET /api/matches — empty state ────────────────────────────────────────────

describe("GET /api/matches — empty state", () => {
  test("returns empty array and 0 total when no matches exist", async () => {
    const res = await request(app).get("/api/matches");
    expect(res.body.newMatches).toEqual([]);
    expect(res.body.totalMatches).toBe(0);
  });
});

// ─── GET /api/likes — debug endpoint ────────────────────────────────────────────

describe("GET /api/likes — debug endpoint", () => {
  test("returns empty list initially", async () => {
    const res = await request(app).get("/api/likes");
    expect(res.body.ok).toBe(true);
    expect(res.body.count).toBe(0);
    expect(res.body.likes).toEqual([]);
  });

  test("returns all likes after inserting multiple", async () => {
    await request(app).post("/api/likes").send({ profileId: "a", action: "like", name: "A" });
    await request(app).post("/api/likes").send({ profileId: "b", action: "superlike", name: "B" });

    const res = await request(app).get("/api/likes");
    expect(res.body.count).toBe(2);
  });
});

// ─── DELETE /api/likes/:id (server.js:212-221) ─────────────────────────────────
// Condition: stmts.deleteLike.run(id).changes > 0

describe("DELETE /api/likes/:id", () => {
  test("removed: true when the like exists", async () => {
    await request(app)
      .post("/api/likes")
      .send({ profileId: "pDel", action: "like", name: "Del" });

    const res = await request(app).delete("/api/likes/pDel");
    expect(res.body.ok).toBe(true);
    expect(res.body.removed).toBe(true);
  });

  test("removed: false when the like does NOT exist (changes === 0)", async () => {
    const res = await request(app).delete("/api/likes/nonexistent");
    expect(res.body.ok).toBe(true);
    expect(res.body.removed).toBe(false);
  });

  test("cascades delete to matches table", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.1);
    await request(app)
      .post("/api/likes")
      .send({ profileId: "pCascade", action: "like", name: "Cascade" });
    Math.random.mockRestore();

    // Verify match was created
    const before = await request(app).get("/api/matches?all=true");
    expect(before.body.newMatches.some((m) => m.profile_id === "pCascade")).toBe(true);

    // Delete the like
    await request(app).delete("/api/likes/pCascade");

    // Match should also be gone
    const after = await request(app).get("/api/matches?all=true");
    expect(after.body.newMatches.some((m) => m.profile_id === "pCascade")).toBe(false);
  });
});

// ─── hydrateRow (server.js:85-91) ──────────────────────────────────────────────
// Condition: !row → return null
// Condition: row.tags || "[]" → tags null/empty fallback

describe("hydrateRow — tags deserialization via API", () => {
  test("tags stored as JSON are deserialized to array in GET response", async () => {
    await request(app)
      .post("/api/likes")
      .send({ profileId: "pH", action: "like", name: "H", tags: ["A", "B"] });

    const res = await request(app).get("/api/likes");
    const like = res.body.likes.find((l) => l.profile_id === "pH");
    expect(Array.isArray(like.tags)).toBe(true);
    expect(like.tags).toEqual(["A", "B"]);
  });

  test("empty tags array is deserialized correctly", async () => {
    await request(app)
      .post("/api/likes")
      .send({ profileId: "pEmpty", action: "like", name: "E", tags: [] });

    const res = await request(app).get("/api/likes");
    const like = res.body.likes.find((l) => l.profile_id === "pEmpty");
    expect(like.tags).toEqual([]);
  });
});

// ─── Match data integrity ───────────────────────────────────────────────────────

describe("Match data integrity", () => {
  test("match record contains the correct profile data from the like", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.1);
    await request(app)
      .post("/api/likes")
      .send({
        profileId: "pInteg",
        action: "superlike",
        name: "Integrity",
        img: "http://example.com/photo.jpg",
        tags: ["Yoga", "Coffee"],
      });
    Math.random.mockRestore();

    const res = await request(app).get("/api/matches");
    const match = res.body.newMatches.find((m) => m.profile_id === "pInteg");
    expect(match).toBeDefined();
    expect(match.name).toBe("Integrity");
    expect(match.action).toBe("superlike");
    expect(match.img).toBe("http://example.com/photo.jpg");
    expect(match.tags).toEqual(["Yoga", "Coffee"]);
  });
});
