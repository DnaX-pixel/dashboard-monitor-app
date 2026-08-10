const router = require('express').Router();
const { queryAll, queryGet, queryRun } = require('../db/database');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

router.use(requireAuth);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Must match the column widths in database.js — MySQL would otherwise reject
// (or, under INSERT IGNORE, silently truncate) anything longer.
const MAX_NAME  = 100;
const MAX_EMAIL = 150;
const MAX_LABEL = 150;

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

/** Returns a trimmed name, or an error string explaining why it's unusable. */
function validateName(raw) {
  const name = String(raw ?? '').trim();
  if (!name) return { error: 'name is required' };
  if (name.length > MAX_NAME) return { error: `Preset name must be ${MAX_NAME} characters or fewer` };
  return { name };
}

/** Returns { email, label } normalized, or an error string. */
function validateMember(raw) {
  const email = normalizeEmail(raw?.email);
  if (!EMAIL_RE.test(email)) return { error: `Invalid email address: ${raw?.email}` };
  if (email.length > MAX_EMAIL) return { error: `Email address must be ${MAX_EMAIL} characters or fewer` };
  const label = String(raw?.label ?? '').trim();
  if (label.length > MAX_LABEL) return { error: `Name must be ${MAX_LABEL} characters or fewer` };
  return { email, label: label || null };
}

async function ownsPreset(presetId, userId) {
  return await queryGet(
    'SELECT * FROM email_presets WHERE preset_id = ? AND user_id = ?',
    [presetId, userId]
  );
}

async function withMembers(preset) {
  const members = await queryAll(
    'SELECT * FROM email_preset_members WHERE preset_id = ? ORDER BY member_id',
    [preset.preset_id]
  );
  return { ...preset, members };
}

router.get('/', asyncHandler(async (req, res) => {
  const presets = await queryAll(
    'SELECT * FROM email_presets WHERE user_id = ? ORDER BY name',
    [req.user.user_id]
  );
  res.json(await Promise.all(presets.map(withMembers)));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, error: nameError } = validateName(req.body.name);
  if (nameError) return res.status(400).json({ error: nameError });

  if (req.body.members !== undefined && !Array.isArray(req.body.members)) {
    return res.status(400).json({ error: 'members must be an array' });
  }

  // Validate every member up front so a bad one can't leave a half-built preset
  const members = [];
  const seen = new Set();
  for (const raw of req.body.members ?? []) {
    const { email, label, error } = validateMember(raw);
    if (error) return res.status(400).json({ error });
    if (seen.has(email)) continue; // collapse duplicates within this payload
    seen.add(email);
    members.push({ email, label });
  }

  let result;
  try {
    result = await queryRun(
      'INSERT INTO email_presets (user_id, name) VALUES (?, ?)',
      [req.user.user_id, name]
    );
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A preset with that name already exists' });
    }
    throw e;
  }

  for (const m of members) {
    await queryRun(
      'INSERT INTO email_preset_members (preset_id, email, label) VALUES (?, ?, ?)',
      [result.insertId, m.email, m.label]
    );
  }

  const preset = await queryGet('SELECT * FROM email_presets WHERE preset_id = ?', [result.insertId]);
  res.status(201).json(await withMembers(preset));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const preset = await ownsPreset(req.params.id, req.user.user_id);
  if (!preset) return res.status(404).json({ error: 'Preset not found' });
  res.json(await withMembers(preset));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const preset = await ownsPreset(req.params.id, req.user.user_id);
  if (!preset) return res.status(404).json({ error: 'Preset not found' });

  const { name, error: nameError } = validateName(req.body.name);
  if (nameError) return res.status(400).json({ error: nameError });

  try {
    await queryRun(
      'UPDATE email_presets SET name = ? WHERE preset_id = ? AND user_id = ?',
      [name, req.params.id, req.user.user_id]
    );
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A preset with that name already exists' });
    }
    throw e;
  }

  const updated = await queryGet('SELECT * FROM email_presets WHERE preset_id = ?', [req.params.id]);
  res.json(await withMembers(updated));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const preset = await ownsPreset(req.params.id, req.user.user_id);
  if (!preset) return res.status(404).json({ error: 'Preset not found' });
  await queryRun('DELETE FROM email_presets WHERE preset_id = ?', [req.params.id]);
  res.status(204).end();
}));

router.post('/:id/members', asyncHandler(async (req, res) => {
  const preset = await ownsPreset(req.params.id, req.user.user_id);
  if (!preset) return res.status(404).json({ error: 'Preset not found' });

  const { email, label, error } = validateMember(req.body);
  if (error) return res.status(400).json({ error });

  const existing = await queryGet(
    'SELECT 1 FROM email_preset_members WHERE preset_id = ? AND email = ?',
    [preset.preset_id, email]
  );
  if (existing) return res.status(409).json({ error: 'That email is already in this preset' });

  const result = await queryRun(
    'INSERT INTO email_preset_members (preset_id, email, label) VALUES (?, ?, ?)',
    [preset.preset_id, email, label]
  );
  res.status(201).json(
    await queryGet('SELECT * FROM email_preset_members WHERE member_id = ?', [result.insertId])
  );
}));

router.delete('/:id/members/:memberId', asyncHandler(async (req, res) => {
  const preset = await ownsPreset(req.params.id, req.user.user_id);
  if (!preset) return res.status(404).json({ error: 'Preset not found' });

  const result = await queryRun(
    'DELETE FROM email_preset_members WHERE member_id = ? AND preset_id = ?',
    [req.params.memberId, preset.preset_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Member not found' });
  res.status(204).end();
}));

module.exports = router;
