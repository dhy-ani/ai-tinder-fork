const { exec } = require('child_process');
const path = require('path');

// Start server before tests
let serverProcess;

beforeAll(async () => {
  // Start the server in the background
  serverProcess = exec('node server.js', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3001' } // Use different port for testing
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
});

afterAll(async () => {
  // Clean up server after tests
  if (serverProcess) {
    serverProcess.kill();
  }
  
  // Clean up test database
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, '..', 'tinder.db');
  try {
    const db = new Database(dbPath);
    db.exec('DELETE FROM likes;');
    db.exec('DELETE FROM matches;');
    db.close();
  } catch (err) {
    // Database might not exist, that's OK
  }
});
