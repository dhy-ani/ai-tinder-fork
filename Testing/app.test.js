/**
 * @jest-environment jsdom
 */

const fs = require("fs");
const path = require("path");

let app;

beforeEach(() => {
  document.body.innerHTML = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
  jest.useFakeTimers();
  jest.resetModules();
  app = require("../app");
});

afterEach(() => {
  jest.useRealTimers();
});

test("generateProfiles(0) returns empty array", () => {
  const list = app.generateProfiles(0);
  expect(Array.isArray(list)).toBe(true);
  expect(list).toHaveLength(0);
});

test("pickTags returns unique tags and max 4", () => {
  const tags = app.pickTags();
  expect(Array.isArray(tags)).toBe(true);
  expect(tags.length).toBeLessThanOrEqual(4);
  expect(new Set(tags).size).toBe(tags.length);
});

test("imgFor returns a valid Unsplash URL", () => {
  const url = app.imgFor("1515462277126-2b47b9fa09e6");
  expect(url).toContain("https://images.unsplash.com/photo-1515462277126-2b47b9fa09e6");
});

test("handleReject handles null input safely", () => {
  expect(() => app.handleReject(null)).not.toThrow();
});

test("handleLike handles null input safely", () => {
  expect(() => app.handleLike(null)).not.toThrow();
});

test("handleSuperLike handles null input safely", () => {
  expect(() => app.handleSuperLike(null)).not.toThrow();
});

test("queueMatch + drainMatchQueue updates match count and banner", () => {
  const matchBanner = document.getElementById("matchBanner");
  const matchList = document.getElementById("matchList");
  const matchCount = document.getElementById("matchCount");

  matchCount.textContent = "0";
  const profile = { id: "p_x", name: "Test", img: "https://example.com/img.jpg", tags: ["Test"] };

  app.showInstantMatch(profile);

  expect(matchBanner.classList.contains("match-banner--visible")).toBe(true);
  expect(matchCount.textContent).toBe("1");
  expect(matchList.children.length).toBe(1);

  jest.advanceTimersByTime(6000);
  expect(matchBanner.classList.contains("match-banner--visible")).toBe(false);
});

test("pollMatches handles network error gracefully", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error("network fail"));
  await expect(app.pollMatches()).resolves.toBeUndefined();
  global.fetch.mockRestore();
});

test("generateProfiles default count is 12 and has unique IDs", () => {
  const profiles = app.generateProfiles();
  expect(profiles).toHaveLength(12);
  const ids = profiles.map((p) => p.id);
  expect(new Set(ids).size).toBe(12);
});

test("handlePointerUp small move does not swipe card and resets transform", () => {
  const card = document.createElement('div');
  card.className = 'card';
  document.getElementById('deck').appendChild(card);
  app.initCards();
  app.topCard = card;

  app.startX = 0;
  app.startY = 0;
  app.currentX = 5;
  app.currentY = 5;
  app.isDragging = true;

  app.handlePointerUp();
  expect(app.isDragging).toBe(false);
});

test("queueMatch handles multiple matches sequentially", () => {
  const matchCount = document.getElementById('matchCount');
  matchCount.textContent = '0';

  app.queueMatch({ profileId: 'p1', name: 'A', img: '', tags: [], matchedAt: new Date().toISOString() });
  app.queueMatch({ profileId: 'p2', name: 'B', img: '', tags: [], matchedAt: new Date().toISOString() });

  expect(matchCount.textContent).toBe('1');
  jest.advanceTimersByTime(6000 + 400);
  expect(matchCount.textContent).toBe('2');
});

