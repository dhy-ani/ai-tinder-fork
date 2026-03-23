const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

describe('Frontend Interface Tests', () => {
  let browser;
  let page;
  let serverProcess;

  beforeAll(async () => {
    // Start the server
    const { spawn } = require('child_process');
    serverProcess = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) await browser.close();
    if (serverProcess) serverProcess.kill();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
    await page.waitForSelector('.deck');
  });

  afterEach(async () => {
    if (page) await page.close();
  });

  describe('Card Deck Initialization', () => {
    test('FB-01: Card Deck Initialization', async () => {
      const cards = await page.$$('.card');
      expect(cards).toHaveLength(12);

      // Check first card has required elements
      const firstCard = cards[0];
      const name = await firstCard.$eval('.card__title', el => el.textContent);
      const age = await firstCard.$eval('.card__age', el => el.textContent);
      const meta = await firstCard.$eval('.card__meta', el => el.textContent);
      const chips = await firstCard.$$('.chip');
      const img = await firstCard.$eval('.card__media', el => el.src);

      expect(name).toBeTruthy();
      expect(age).toBeTruthy();
      expect(meta).toBeTruthy();
      expect(chips.length).toBeGreaterThan(0);
      expect(img).toBeTruthy();
    });
  });

  describe('Button Functionality', () => {
    test('FB-02: Like Button Functionality', async () => {
      const initialCardCount = await page.$$('.card').then(cards => cards.length);
      
      // Click like button
      await page.click('#likeBtn');
      
      // Wait for animation
      await page.waitForTimeout(300);
      
      const finalCardCount = await page.$$('.card').then(cards => cards.length);
      expect(finalCardCount).toBe(initialCardCount - 1);
    });

    test('FB-03: Nope Button Functionality', async () => {
      const initialCardCount = await page.$$('.card').then(cards => cards.length);
      
      // Click nope button
      await page.click('#nopeBtn');
      
      // Wait for animation
      await page.waitForTimeout(300);
      
      const finalCardCount = await page.$$('.card').then(cards => cards.length);
      expect(finalCardCount).toBe(initialCardCount - 1);
    });

    test('FB-04: Super Like Button Functionality', async () => {
      const initialCardCount = await page.$$('.card').then(cards => cards.length);
      
      // Click super like button
      await page.click('#superLikeBtn');
      
      // Wait for animation
      await page.waitForTimeout(300);
      
      const finalCardCount = await page.$$('.card').then(cards => cards.length);
      expect(finalCardCount).toBe(initialCardCount - 1);
    });
  });

  describe('Swipe Gestures', () => {
    test('FB-05: Swipe Gestures - Right Swipe (Like)', async () => {
      const initialCardCount = await page.$$('.card').then(cards => cards.length);
      const topCard = await page.$('.card');
      
      // Get card position
      const cardRect = await page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }, topCard);
      
      // Perform right swipe
      await page.mouse.move(cardRect.x, cardRect.y);
      await page.mouse.down();
      await page.mouse.move(cardRect.x + 100, cardRect.y);
      await page.mouse.up();
      
      // Wait for animation
      await page.waitForTimeout(300);
      
      const finalCardCount = await page.$$('.card').then(cards => cards.length);
      expect(finalCardCount).toBe(initialCardCount - 1);
    });

    test('FB-06: Swipe Gestures - Left Swipe (Nope)', async () => {
      const initialCardCount = await page.$$('.card').then(cards => cards.length);
      const topCard = await page.$('.card');
      
      // Get card position
      const cardRect = await page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }, topCard);
      
      // Perform left swipe
      await page.mouse.move(cardRect.x, cardRect.y);
      await page.mouse.down();
      await page.mouse.move(cardRect.x - 100, cardRect.y);
      await page.mouse.up();
      
      // Wait for animation
      await page.waitForTimeout(300);
      
      const finalCardCount = await page.$$('.card').then(cards => cards.length);
      expect(finalCardCount).toBe(initialCardCount - 1);
    });

    test('FB-07: Swipe Gestures - Up Swipe (Super Like)', async () => {
      const initialCardCount = await page.$$('.card').then(cards => cards.length);
      const topCard = await page.$('.card');
      
      // Get card position
      const cardRect = await page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }, topCard);
      
      // Perform up swipe
      await page.mouse.move(cardRect.x, cardRect.y);
      await page.mouse.down();
      await page.mouse.move(cardRect.x, cardRect.y - 100);
      await page.mouse.up();
      
      // Wait for animation
      await page.waitForTimeout(300);
      
      const finalCardCount = await page.$$('.card').then(cards => cards.length);
      expect(finalCardCount).toBe(initialCardCount - 1);
    });

    test('FB-08: Insufficient Swipe Distance', async () => {
      const initialCardCount = await page.$$('.card').then(cards => cards.length);
      const topCard = await page.$('.card');
      
      // Get card position
      const cardRect = await page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }, topCard);
      
      // Perform short swipe (less than threshold)
      await page.mouse.move(cardRect.x, cardRect.y);
      await page.mouse.down();
      await page.mouse.move(cardRect.x + 30, cardRect.y);
      await page.mouse.up();
      
      // Wait for potential animation
      await page.waitForTimeout(300);
      
      const finalCardCount = await page.$$('.card').then(cards => cards.length);
      expect(finalCardCount).toBe(initialCardCount); // Card should still be there
    });
  });

  describe('Advanced Interactions', () => {
    test('FB-09: Double Tap for Next Photo', async () => {
      const topCard = await page.$('.card');
      const img = await topCard.$('.card__media');
      
      // Get initial filter
      const initialFilter = await page.evaluate(el => el.style.filter, img);
      
      // Double tap
      await page.click('.card', { clickCount: 2 });
      
      // Check brightness effect
      await page.waitForTimeout(100);
      const brightFilter = await page.evaluate(el => el.style.filter, img);
      expect(brightFilter).toContain('brightness');
      
      // Wait for effect to end
      await page.waitForTimeout(200);
      const finalFilter = await page.evaluate(el => el.style.filter, img);
      expect(finalFilter).toBe(initialFilter);
    });

    test('FB-10: Shuffle Button Functionality', async () => {
      // Get initial profile names
      const initialNames = await page.$$eval('.card__title', elements => 
        elements.map(el => el.textContent)
      );
      
      // Click shuffle button
      await page.click('#shuffleBtn');
      
      // Wait for new cards to load
      await page.waitForTimeout(500);
      
      // Get new profile names
      const newNames = await page.$$eval('.card__title', elements => 
        elements.map(el => el.textContent)
      );
      
      // Should still have 12 cards
      const cards = await page.$$('.card');
      expect(cards).toHaveLength(12);
      
      // Names should be different (very high probability with random generation)
      expect(initialNames).not.toEqual(newNames);
    });

    test('FB-11: Empty Deck Behavior', async () => {
      // Swipe all cards
      for (let i = 0; i < 12; i++) {
        await page.click('#nopeBtn');
        await page.waitForTimeout(100);
      }
      
      // Check deck is empty
      const cards = await page.$$('.card');
      expect(cards).toHaveLength(0);
      
      // Shuffle button should still work
      await page.click('#shuffleBtn');
      await page.waitForTimeout(500);
      
      const newCards = await page.$$('.card');
      expect(newCards).toHaveLength(12);
    });
  });

  describe('Match Notifications', () => {
    test('FB-12: Match Notification Display', async () => {
      // This test requires manual match creation in backend
      // For now, we'll test the banner visibility state
      const matchBanner = await page.$('#matchBanner');
      expect(matchBanner).toBeTruthy();
      
      // Initially hidden
      const isHidden = await page.evaluate(el => 
        el.getAttribute('aria-hidden'), matchBanner
      );
      expect(isHidden).toBe('true');
      
      // Check match count badge exists
      const matchCount = await page.$('#matchCount');
      expect(matchCount).toBeTruthy();
    });

    test('FB-13: Match Banner Manual Dismiss', async () => {
      // Test dismiss button exists
      const dismissBtn = await page.$('#dismissMatch');
      expect(dismissBtn).toBeTruthy();
    });
  });

  describe('UI Elements', () => {
    test('Poll indicator is visible', async () => {
      const pollIndicator = await page.$('#pollIndicator');
      expect(pollIndicator).toBeTruthy();
      
      const indicatorText = await page.evaluate(el => el.textContent, pollIndicator);
      expect(indicatorText).toContain('Live');
    });

    test('All control buttons are present', async () => {
      const likeBtn = await page.$('#likeBtn');
      const nopeBtn = await page.$('#nopeBtn');
      const superLikeBtn = await page.$('#superLikeBtn');
      const shuffleBtn = await page.$('#shuffleBtn');
      
      expect(likeBtn).toBeTruthy();
      expect(nopeBtn).toBeTruthy();
      expect(superLikeBtn).toBeTruthy();
      expect(shuffleBtn).toBeTruthy();
    });
  });
});
