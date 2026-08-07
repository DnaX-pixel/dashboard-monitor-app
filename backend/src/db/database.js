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
        user_id          INT AUTO_INCREMENT PRIMARY KEY,
        name             VARCHAR(100)  NOT NULL,
        email            VARCHAR(150)  NOT NULL UNIQUE,
        password_hash    VARCHAR(255)  NOT NULL,
        is_admin         TINYINT(1)    NOT NULL DEFAULT 0,
        email_verified   TINYINT(1)    NOT NULL DEFAULT 0,
        failed_attempts  INT           NOT NULL DEFAULT 0,
        locked_until     DATETIME      NULL,
        last_login_at    DATETIME      NULL,
        last_login_ip    VARCHAR(45)   NULL,
        created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Idempotent migrations for existing users table
    const userCols = [
      ['email_verified',  'TINYINT(1) NOT NULL DEFAULT 0'],
      ['failed_attempts', 'INT NOT NULL DEFAULT 0'],
      ['locked_until',    'DATETIME NULL'],
      ['last_login_at',   'DATETIME NULL'],
      ['last_login_ip',   'VARCHAR(45) NULL'],
    ];
    for (const [col, def] of userCols) {
      try {
        await conn.execute(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
        console.log(`[DB] Added users.${col}`);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    }

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        token       CHAR(64) PRIMARY KEY,
        user_id     INT          NOT NULL,
        expires_at  DATETIME     NOT NULL,
        used_at     DATETIME     NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        token       CHAR(64) PRIMARY KEY,
        user_id     INT          NOT NULL,
        expires_at  DATETIME     NOT NULL,
        used_at     DATETIME     NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS login_history (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT          NULL,
        email       VARCHAR(150) NOT NULL,
        success     TINYINT(1)   NOT NULL,
        ip          VARCHAR(45)  NULL,
        user_agent  VARCHAR(500) NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_created (user_id, created_at),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
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
        type         ENUM('email','whatsapp','whatsapp_group') NOT NULL,
        value        VARCHAR(150) NOT NULL,
        label        VARCHAR(150) NULL,
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
      )
    `);

    await conn.execute(
      `ALTER TABLE recipients MODIFY COLUMN type ENUM('email','whatsapp','whatsapp_group') NOT NULL`
    );
    try {
      await conn.execute('ALTER TABLE recipients ADD COLUMN label VARCHAR(150) NULL');
      console.log('[DB] Added recipients.label');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

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
      CREATE TABLE IF NOT EXISTS user_smtp (
        user_id      INT PRIMARY KEY,
        smtp_host    VARCHAR(255) NOT NULL,
        smtp_port    INT          NOT NULL DEFAULT 587,
        smtp_user    VARCHAR(255) NOT NULL,
        smtp_pass    VARCHAR(255) NOT NULL,
        smtp_from    VARCHAR(255) NOT NULL,
        use_tls      TINYINT(1)   NOT NULL DEFAULT 1,
        is_verified  TINYINT(1)   NOT NULL DEFAULT 0,
        last_error   TEXT,
        updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        user_id      INT PRIMARY KEY,
        status       ENUM('disconnected','connecting','awaiting_qr','connected') NOT NULL DEFAULT 'disconnected',
        phone_number VARCHAR(20),
        push_name    VARCHAR(100),
        connected_at DATETIME,
        last_error   TEXT,
        updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    await conn.execute(
      `ALTER TABLE whatsapp_sessions MODIFY COLUMN status
         ENUM('disconnected','connecting','awaiting_qr','connected') NOT NULL DEFAULT 'disconnected'`
    );

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

async function queryAll(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function queryGet(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows[0];
}

async function queryRun(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return { insertId: result.insertId, affectedRows: result.affectedRows };
}

module.exports = { pool, initSchema, queryAll, queryGet, queryRun };
