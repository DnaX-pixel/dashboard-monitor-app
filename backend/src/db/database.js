const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || 'dashboard_monitor',
  user:     process.env.DB_USER     || 'monitor_user',
  password: process.env.DB_PASS     || 'monitor_pass',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone: '+00:00',
});

async function initSchema() {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        user_id       INT AUTO_INCREMENT PRIMARY KEY,
        name          VARCHAR(100)  NOT NULL,
        email         VARCHAR(150)  NOT NULL UNIQUE,
        password_hash VARCHAR(255)  NOT NULL,
        is_admin      TINYINT(1)    NOT NULL DEFAULT 0,
        created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS jobs (
        job_id                INT AUTO_INCREMENT PRIMARY KEY,
        user_id               INT          NOT NULL,
        job_name              VARCHAR(100) NOT NULL,
        target_url            TEXT         NOT NULL,
        crop_x                DOUBLE       NOT NULL DEFAULT 0,
        crop_y                DOUBLE       NOT NULL DEFAULT 0,
        crop_width            DOUBLE       NOT NULL DEFAULT 100,
        crop_height           DOUBLE       NOT NULL DEFAULT 100,
        schedule_cron         VARCHAR(50)  NOT NULL,
        notify_only_on_change TINYINT(1)   NOT NULL DEFAULT 1,
        notification_subject  VARCHAR(200) DEFAULT '',
        status                ENUM('active','paused') NOT NULL DEFAULT 'active',
        created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS recipients (
        recipient_id INT AUTO_INCREMENT PRIMARY KEY,
        job_id       INT          NOT NULL,
        type         ENUM('email','whatsapp') NOT NULL,
        value        VARCHAR(150) NOT NULL,
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS history (
        history_id      INT AUTO_INCREMENT PRIMARY KEY,
        job_id          INT          NOT NULL,
        run_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        screenshot_path TEXT,
        ocr_text        TEXT,
        changed_flag    TINYINT(1)   NOT NULL DEFAULT 0,
        delivery_status ENUM('sent','failed','pending') NOT NULL DEFAULT 'pending',
        error_message   TEXT,
        FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS job_items (
        item_id     INT AUTO_INCREMENT PRIMARY KEY,
        job_id      INT          NOT NULL,
        label       VARCHAR(100) DEFAULT '',
        target_url  TEXT         NOT NULL,
        crop_x      DOUBLE       NOT NULL DEFAULT 0,
        crop_y      DOUBLE       NOT NULL DEFAULT 0,
        crop_width  DOUBLE       NOT NULL DEFAULT 100,
        crop_height DOUBLE       NOT NULL DEFAULT 100,
        sort_order  INT          NOT NULL DEFAULT 0,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
      )
    `);

    console.log('[DB] MySQL schema ready');
  } finally {
    conn.release();
  }
}

// Helper: run a query and return all rows
async function queryAll(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Helper: run a query and return first row (or undefined)
async function queryGet(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows[0];
}

// Helper: run INSERT/UPDATE/DELETE and return { insertId, affectedRows }
async function queryRun(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return { insertId: result.insertId, affectedRows: result.affectedRows };
}

module.exports = { pool, initSchema, queryAll, queryGet, queryRun };
