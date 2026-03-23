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
});
