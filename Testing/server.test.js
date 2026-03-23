const request = require("supertest");
const { app, resetDatabase, saveLikeAndTryMatch, hydrateRow } = require("../server");

describe("AI Tinder backend edge cases", () => {
  beforeEach(() => {
    resetDatabase();
  });

  test("POST /api/likes missing profileId returns 400", async () => {
    const res = await request(app).post("/api/likes").send({ action: "like" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /api/likes invalid action returns 400", async () => {
    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "x", action: "poke" });
    expect(res.status).toBe(400);
  });

  test("POST /api/likes works and returns matched bool", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.3);
    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "p_1", action: "like", name: "Alex", tags: ["Coffee"] });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, profileId: "p_1", action: "like", matched: true });
    Math.random.mockRestore();
  });

  test("GET /api/matches delivers once and total updates", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.1);
    await request(app).post("/api/likes").send({ profileId: "p_2", action: "superlike", name: "Sam" });
    const first = await request(app).get("/api/matches");
    expect(first.status).toBe(200);
    expect(first.body.newMatches.length).toBe(1);

    const second = await request(app).get("/api/matches");
    expect(second.body.newMatches.length).toBe(0);
    expect(second.body.totalMatches).toBe(1);
    Math.random.mockRestore();
  });

  test("GET /api/matches when there are no matches returns empty", async () => {
    const res = await request(app).get("/api/matches");
    expect(res.status).toBe(200);
    expect(res.body.newMatches).toEqual([]);
    expect(res.body.totalMatches).toBe(0);
  });

  test("POST /api/likes with empty body returns 400", async () => {
    const res = await request(app).post("/api/likes").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("POST /api/likes allows tags as primitive value without crashing", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.8);
    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "p_5", action: "superlike", name: "Kelly", tags: "not-an-array" });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    Math.random.mockRestore();
  });

  test("Repeated like on same profile does not create duplicate match", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.2);
    await request(app).post("/api/likes").send({ profileId: "p_6", action: "like", name: "Dana" });
    await request(app).post("/api/likes").send({ profileId: "p_6", action: "superlike", name: "Dana" });

    const firstPoll = await request(app).get("/api/matches");
    expect(firstPoll.body.newMatches.length).toBe(1);

    const secondPoll = await request(app).get("/api/matches");
    expect(secondPoll.body.newMatches.length).toBe(0);
    expect(secondPoll.body.totalMatches).toBe(1);
    Math.random.mockRestore();
  });

  test("GET /api/matches?all=true returns already-delivered match", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.1);
    await request(app).post("/api/likes").send({ profileId: "p_3", action: "like", name: "Casey" });
    await request(app).get("/api/matches");

    const all = await request(app).get("/api/matches?all=true");
    expect(all.body.newMatches.length).toBe(1);
    expect(all.body.totalMatches).toBe(1);
    Math.random.mockRestore();
  });

  test("DELETE /api/likes/:id removes like and returns ok", async () => {
    await request(app).post("/api/likes").send({ profileId: "p_4", action: "like", name: "Taylor" });
    const del = await request(app).delete("/api/likes/p_4");
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    const likes = await request(app).get("/api/likes");
    expect(likes.body.count).toBe(0);
  });

  test("saveLikeAndTryMatch returns false matched when already in matches", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.3);
    const first = saveLikeAndTryMatch("p_5", "Lee", "like", "", []);
    expect(first.matched).toBe(true);
    const second = saveLikeAndTryMatch("p_5", "Lee", "like", "", []);
    expect(second.matched).toBe(false);
    Math.random.mockRestore();
  });

  test("hydrateRow handles null gracefully", () => {
    expect(hydrateRow(null)).toBeNull();
  });

  test("GET /api/likes returns empty list when no likes", async () => {
    const res = await request(app).get("/api/likes");
    expect(res.status).toBe(200);
    expect(res.body.likes).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  test("DELETE non-existent like returns ok removed false", async () => {
    const res = await request(app).delete("/api/likes/nonexistent");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.removed).toBe(false);
  });

  test("POST /api/likes with null values does not throw", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.9);
    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: "p_7", action: "like", name: null, tags: null, img: null });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    Math.random.mockRestore();
  });

  test.each([
    ["p_8", "like"],
    ["p_9", "superlike"],
    ["p_10", "like"],
    ["p_11", "superlike"],
    ["p_12", "like"],
    ["p_13", "superlike"],
    ["p_14", "like"],
    ["p_15", "superlike"],
    ["p_16", "like"],
    ["p_17", "superlike"]
  ])("POST /api/likes with action %s should return ok", async (id, action) => {
    jest.spyOn(Math, "random").mockReturnValue(0.99);
    const res = await request(app)
      .post("/api/likes")
      .send({ profileId: id, action, name: "User", tags: ["Test"] });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    Math.random.mockRestore();
  });

  test("GET /api/matches?all=true returns 0 when no matches", async () => {
    const res = await request(app).get("/api/matches?all=true");
    expect(res.status).toBe(200);
    expect(res.body.newMatches).toEqual([]);
    expect(res.body.totalMatches).toBe(0);
  });

  test("saveLikeAndTryMatch with empty tags uses [] gracefully", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.4);
    const result = saveLikeAndTryMatch("p_18", "Sunny", "like", "", null);
    expect(result.inserted).toBe(true);
    expect(result.matched).toBe(true);
    Math.random.mockRestore();
  });

  test("saveLikeAndTryMatch with unknown action does not throw but won't match", () => {
    expect(() => saveLikeAndTryMatch("p_19", "Alex", "poke", "", [])).not.toThrow();
  });

  test("multiple likes and matches total count increments correctly", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.05);
    await request(app).post("/api/likes").send({ profileId: "p_20", action: "like", name: "A" });
    await request(app).post("/api/likes").send({ profileId: "p_21", action: "superlike", name: "B" });

    const res = await request(app).get("/api/matches");
    expect(res.body.newMatches.length).toBe(2);
    expect(res.body.totalMatches).toBe(2);
    Math.random.mockRestore();
  });
});
