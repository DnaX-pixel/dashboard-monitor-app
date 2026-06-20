const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../../data/dashboard.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    is_admin      BOOLEAN       NOT NULL DEFAULT 0,
    created_at    DATETIME      NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    job_id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    job_name              VARCHAR(100) NOT NULL,
    target_url            TEXT         NOT NULL,
    crop_x                REAL         NOT NULL DEFAULT 0,
    crop_y                REAL         NOT NULL DEFAULT 0,
    crop_width            REAL         NOT NULL DEFAULT 100,
    crop_height           REAL         NOT NULL DEFAULT 100,
    schedule_cron         VARCHAR(50)  NOT NULL,
    notify_only_on_change BOOLEAN      NOT NULL DEFAULT 1,
    notification_subject  VARCHAR(200) DEFAULT '',
    status                TEXT         NOT NULL DEFAULT 'active'
                          CHECK(status IN ('active', 'paused')),
    created_at            DATETIME     NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recipients (
    recipient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id       INTEGER NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
    type         TEXT    NOT NULL CHECK(type IN ('email', 'whatsapp')),
    value        VARCHAR(150) NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS history (
    history_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id          INTEGER NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
    run_at          DATETIME NOT NULL DEFAULT (datetime('now')),
    screenshot_path TEXT,
    ocr_text        TEXT,
    changed_flag    BOOLEAN  NOT NULL DEFAULT 0,
    delivery_status TEXT     NOT NULL DEFAULT 'pending'
                    CHECK(delivery_status IN ('sent', 'failed', 'pending')),
    error_message   TEXT
  );

  CREATE TABLE IF NOT EXISTS job_items (
    item_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id     INTEGER NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
    label      VARCHAR(100) DEFAULT '',
    target_url TEXT NOT NULL,
    crop_x     REAL NOT NULL DEFAULT 0,
    crop_y     REAL NOT NULL DEFAULT 0,
    crop_width REAL NOT NULL DEFAULT 100,
    crop_height REAL NOT NULL DEFAULT 100,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT (datetime('now'))
  );
`);

try {
  db.exec(`ALTER TABLE jobs ADD COLUMN notification_subject VARCHAR(200) DEFAULT ''`);
} catch (e) { /* column already exists */ }

module.exports = db;
