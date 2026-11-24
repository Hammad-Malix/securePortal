const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('./db');
require('dotenv').config();

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  }
}));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in backend/.env before starting the API.');
}

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('Health check database error:', err.message);
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.get('/api/auth/me', authenticateJWT, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.department, u.is_active, u.is_locked, r.role_name
       FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = ?`,
      [req.user.user_id]
    );
    if (!users.length || !users[0].is_active || users[0].is_locked) {
      return res.status(401).json({ error: 'Session is no longer active.' });
    }
    res.json(users[0]);
  } catch (err) {
    console.error('Session lookup error:', err.message);
    res.status(500).json({ error: 'Failed to restore session.' });
  }
});

// In-memory store for temporary MFA OTPs (in production, use Redis with 5-min TTL)
const pendingOtps = new Map();

// 1. AVAILABILITY CONTROL: Rate Limiting against DoS & Brute Force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' }
});

// 2. ACCOUNTABILITY & NON-REPUDIATION: SHA-256 Hash-Chained Audit Logger
async function logAuditEvent({ actorEmail, actorRole, actionType, targetResource, ipAddress, status, details = null }) {
  try {
    const [rows] = await db.query('SELECT current_hash FROM audit_logs ORDER BY log_id DESC LIMIT 1');
    const prevHash = rows.length > 0 ? rows[0].current_hash : '0'.repeat(64);

    const payload = `${prevHash}|${actorEmail}|${actorRole}|${actionType}|${targetResource}|${status}`;
    const currentHash = crypto.createHash('sha256').update(payload).digest('hex');

    await db.query(
      `INSERT INTO audit_logs (actor_email, actor_role, action_type, target_resource, details, ip_address, status, prev_hash, current_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [actorEmail, actorRole, actionType, targetResource, details, ipAddress || '127.0.0.1', status, prevHash, currentHash]
    );
  } catch (err) {
    console.error('Audit Logging Error:', err.message);
  }
}

// 3. SEED DEFAULT USERS ON STARTUP (With Real Bcrypt Password Hashing)
async function seedInitialUsers() {
  try {
    const [existing] = await db.query('SELECT COUNT(*) AS count FROM users');
    if (existing[0].count === 0) {
      const adminHash = await bcrypt.hash('Admin@123', 10);
      const managerHash = await bcrypt.hash('Manager@123', 10);
      const staffHash = await bcrypt.hash('Staff@123', 10);

      await db.query(
        `INSERT INTO users (full_name, email, password_hash, role_id, department) VALUES
         ('Hammad Iqbal', 'admin@aegis.io', ?, 1, 'Information Security Office'),
         ('Sara Ahmed', 'manager@aegis.io', ?, 2, 'Finance & Operations'),
         ('Bilal Khan', 'staff@aegis.io', ?, 3, 'Academic Registry')`,
        [adminHash, managerHash, staffHash]
      );

      await db.query(
        `INSERT INTO records (title, classification, amount, status, created_by) VALUES
         ('Q4 Cloud Infrastructure Audit', 'CONFIDENTIAL', 4500.00, 'PENDING', 3),
         ('Biometric Access Server Upgrade', 'SECRET', 12800.00, 'APPROVED', 3)`
      );
      console.log('Seeded default RBAC users and records into MySQL.');
    }
  } catch (err) {
    console.error('Seed Error (Make sure schema.sql was executed):', err.message);
  }
}

// 4. AUTHENTICATION MIDDLEWARE (JWT Verification)
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization token.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid token.' });
  }
}

// 5. AUTHORIZATION MIDDLEWARE (RBAC Enforcement + Audit Logging on Denial)
function authorizeRoles(...allowedRoles) {
  return async (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      await logAuditEvent({
        actorEmail: req.user.email,
        actorRole: req.user.role,
        actionType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        targetResource: req.originalUrl,
        ipAddress: req.ip,
        status: 'BLOCKED'
      });
      return res.status(403).json({
        error: `Access Denied (403): Role '${req.user.role}' is not authorized for this resource.`
      });
    }
    next();
  };
}

// ==================== AUTH ROUTES (FACTOR 1 + FACTOR 2 MFA) ====================

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Detect obvious SQL Injection payloads for security telemetry
  const sqliPattern = /('|--|;|\bOR\b|\bUNION\b|\bSELECT\b|\bDROP\b)/i;
  if (sqliPattern.test(email)) {
    await logAuditEvent({
      actorEmail: String(email).slice(0, 60),
      actorRole: 'UNKNOWN',
      actionType: 'SQLI_PAYLOAD_BLOCKED',
      targetResource: '/api/auth/login',
      ipAddress: ip,
      status: 'ALERT'
    });
    return res.status(400).json({ error: 'Malicious input pattern detected and logged.' });
  }

  try {
    // Parameterized Query prevents SQL Injection
    const [users] = await db.query(
      `SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      await logAuditEvent({
        actorEmail: email,
        actorRole: 'UNKNOWN',
        actionType: 'FAILED_LOGIN_UNKNOWN_USER',
        targetResource: 'auth_gateway',
        ipAddress: ip,
        status: 'BLOCKED'
      });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];

    if (user.is_locked) {
      await logAuditEvent({
        actorEmail: user.email,
        actorRole: user.role_name,
        actionType: 'LOCKED_ACCOUNT_LOGIN_ATTEMPT',
        targetResource: 'auth_gateway',
        ipAddress: ip,
        status: 'BLOCKED'
      });
      return res.status(423).json({ error: 'Account is locked due to multiple failed attempts. Contact Super Admin.' });
    }
    if (!user.is_active) {
      await logAuditEvent({
        actorEmail: user.email,
        actorRole: user.role_name,
        actionType: 'SUSPENDED_ACCOUNT_LOGIN_ATTEMPT',
        targetResource: 'auth_gateway',
        ipAddress: ip,
        status: 'BLOCKED'
      });
      return res.status(403).json({ error: 'This account has been suspended. Contact Super Admin.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      const newAttempts = user.failed_attempts + 1;
      const shouldLock = newAttempts >= 5;

      await db.query(
        'UPDATE users SET failed_attempts = ?, is_locked = ? WHERE user_id = ?',
        [newAttempts, shouldLock, user.user_id]
      );

      await logAuditEvent({
        actorEmail: user.email,
        actorRole: user.role_name,
        actionType: shouldLock ? 'ACCOUNT_LOCKED_BRUTE_FORCE' : `FAILED_PASSWORD (${newAttempts}/5)`,
        targetResource: 'auth_gateway',
        ipAddress: ip,
        status: shouldLock ? 'ALERT' : 'BLOCKED'
      });

      return res.status(401).json({
        error: shouldLock
          ? 'Account locked after 5 failed attempts!'
          : `Invalid credentials. Attempt ${newAttempts} of 5.`
      });
    }

    // Factor 1 Passed -> Reset failed attempts & issue 6-digit MFA OTP
    await db.query('UPDATE users SET failed_attempts = 0 WHERE user_id = ?', [user.user_id]);
    const otpCode = String(crypto.randomInt(100000, 1000000));
    pendingOtps.set(user.email, { otpCode, expiresAt: Date.now() + 5 * 60 * 1000 });

    await logAuditEvent({
      actorEmail: user.email,
      actorRole: user.role_name,
      actionType: 'FACTOR_1_PASSWORD_VERIFIED',
      targetResource: 'mfa_challenge',
      ipAddress: ip,
      status: 'SUCCESS'
    });

    // Returning demoOtp in response so you can test easily without an external SMS gateway
    res.json({
      mfaRequired: true,
      email: user.email,
      message: 'Factor 1 verified. Enter your 6-digit MFA code.',
      demoOtp: otpCode
    });
  } catch (err) {
    console.error('Authentication request error:', err.message);
    res.status(500).json({ error: 'Server authentication error.' });
  }
});

app.post('/api/auth/verify-mfa', authLimiter, async (req, res) => {
  const { email, otp } = req.body;
  if (typeof email !== 'string' || typeof otp !== 'string' || !email.trim() || !otp.trim()) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }
  const record = pendingOtps.get(email);

  if (!record || record.expiresAt < Date.now() || record.otpCode !== String(otp).trim()) {
    await logAuditEvent({
      actorEmail: email || 'UNKNOWN',
      actorRole: 'UNKNOWN',
      actionType: 'MFA_VERIFICATION_FAILED',
      targetResource: 'mfa_challenge',
      ipAddress: req.ip,
      status: 'BLOCKED'
    });
    return res.status(401).json({ error: 'Invalid or expired 6-digit MFA code.' });
  }

  try {
    const [users] = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.department, u.is_active, r.role_name
       FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.email = ?`,
      [email]
    );
    const user = users[0];
    if (!user || !user.is_active) {
      pendingOtps.delete(email);
      return res.status(403).json({ error: 'This account has been suspended. Contact Super Admin.' });
    }

    pendingOtps.delete(email);
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, full_name: user.full_name, role: user.role_name },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    await logAuditEvent({
      actorEmail: user.email,
      actorRole: user.role_name,
      actionType: 'MFA_LOGIN_SUCCESS',
      targetResource: 'jwt_session_issued',
      ipAddress: req.ip,
      status: 'SUCCESS'
    });

    res.json({
      token,
      user: {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        role: user.role_name,
        department: user.department
      }
    });
  } catch (err) {
    console.error('MFA verification error:', err.message);
    res.status(500).json({ error: 'Server MFA verification error.' });
  }
});

// ==================== RECORDS ROUTES (RBAC + NEED-TO-KNOW + SEPARATION OF DUTIES) ====================

app.get('/api/records', authenticateJWT, async (req, res) => {
  try {
    // Need-to-Know Principle: STAFF only see their own records; MANAGER & SUPER_ADMIN see all
    if (req.user.role === 'STAFF') {
      const [rows] = await db.query(
        `SELECT r.*, u.full_name AS creator_name, u.department AS creator_department,
                approver.full_name AS approver_name
         FROM records r
        JOIN users u ON r.created_by = u.user_id
        LEFT JOIN users approver ON r.approved_by = approver.user_id
        WHERE r.created_by = ? ORDER BY r.created_at DESC`,
        [req.user.user_id]
      );
      return res.json(rows);
    }

    const [rows] = await db.query(
      `SELECT r.*, u.full_name AS creator_name, u.department AS creator_department,
              approver.full_name AS approver_name
       FROM records r
      JOIN users u ON r.created_by = u.user_id
      LEFT JOIN users approver ON r.approved_by = approver.user_id
      ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Record fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch records.' });
  }
});

app.post('/api/records', authenticateJWT, async (req, res) => {
  const { title, classification = 'CONFIDENTIAL', amount = 0, details = null } = req.body;
  const allowedClassifications = ['INTERNAL', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];
  const numericAmount = Number(amount);
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 150) {
    return res.status(400).json({ error: 'A title of 1 to 150 characters is required.' });
  }
  if (!allowedClassifications.includes(classification)) {
    return res.status(400).json({ error: 'Invalid record classification.' });
  }
  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    return res.status(400).json({ error: 'Amount must be a non-negative number.' });
  }
  if (details !== null && (typeof details !== 'string' || details.length > 5000)) {
    return res.status(400).json({ error: 'Record details must be text no longer than 5000 characters.' });
  }
  try {
    const recordPayload = `${title.trim()}|${classification}|${req.user.user_id}|${Date.now()}`;
    const integrityHash = crypto.createHash('sha256').update(recordPayload).digest('hex');
    const [result] = await db.query(
      'INSERT INTO records (title, classification, amount, details, integrity_hash, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title.trim(), classification, numericAmount, details, integrityHash, req.user.user_id]
    );

    await logAuditEvent({
      actorEmail: req.user.email,
      actorRole: req.user.role,
      actionType: 'CREATE_RECORD',
      targetResource: `record_id:${result.insertId} (${title.trim()})`,
      ipAddress: req.ip,
      status: 'SUCCESS',
      details: details || null
    });

    res.status(201).json({ message: 'Record created in PENDING state.', record_id: result.insertId });
  } catch (err) {
    console.error('Record creation error:', err.message);
    res.status(500).json({ error: 'Failed to create record.' });
  }
});

// SEPARATION OF DUTIES: Only MANAGER or SUPER_ADMIN can approve/reject, and creator cannot self-approve
app.patch('/api/records/:id/status', authenticateJWT, authorizeRoles('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  const { status } = req.body;
  const recordId = req.params.id;
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be APPROVED or REJECTED.' });
  }

  try {
    const [records] = await db.query('SELECT * FROM records WHERE record_id = ?', [recordId]);
    if (records.length === 0) return res.status(404).json({ error: 'Record not found.' });

    if (records[0].created_by === req.user.user_id) {
      await logAuditEvent({
        actorEmail: req.user.email,
        actorRole: req.user.role,
        actionType: 'SELF_APPROVAL_BLOCKED',
        targetResource: `record_id:${recordId}`,
        ipAddress: req.ip,
        status: 'BLOCKED'
      });
      return res.status(403).json({ error: 'Separation of Duties Violation: You cannot approve your own record.' });
    }
    if (records[0].status !== 'PENDING') {
      return res.status(409).json({ error: 'Only pending records can be approved or rejected.' });
    }

    await db.query(
      'UPDATE records SET status = ?, approved_by = ? WHERE record_id = ?',
      [status, req.user.user_id, recordId]
    );

    await logAuditEvent({
      actorEmail: req.user.email,
      actorRole: req.user.role,
      actionType: `RECORD_${status}`,
      targetResource: `record_id:${recordId}`,
      ipAddress: req.ip,
      status: 'SUCCESS'
    });

    res.json({ message: `Record #${recordId} marked as ${status}.` });
  } catch (err) {
    console.error('Record status update error:', err.message);
    res.status(500).json({ error: 'Failed to update record status.' });
  }
});

// ==================== AUDIT LOG & INTEGRITY VERIFICATION ROUTES ====================

app.post('/api/audit-logs/events', authenticateJWT, async (req, res) => {
  const allowedActions = new Set([
    'RBAC_ACCESS_DENIED',
    'SOD_POLICY_VIOLATION',
    'LOG_DELETION_BLOCKED',
    'AUTH_SIGNOUT',
    'SESSION_TTL_EXPIRED'
  ]);
  const { actionType, targetResource, details } = req.body;
  if (
    !allowedActions.has(actionType) ||
    typeof targetResource !== 'string' ||
    !targetResource.trim() ||
    targetResource.length > 150 ||
    (details !== undefined && (typeof details !== 'string' || details.length > 1000))
  ) {
    return res.status(400).json({ error: 'Invalid audit event.' });
  }
  await logAuditEvent({
    actorEmail: req.user.email,
    actorRole: req.user.role,
    actionType,
    targetResource: targetResource.trim(),
    ipAddress: req.ip,
    status: actionType === 'RBAC_ACCESS_DENIED' || actionType === 'SOD_POLICY_VIOLATION' || actionType === 'LOG_DELETION_BLOCKED' ? 'BLOCKED' : 'SUCCESS',
    details: details || null
  });
  res.status(201).json({ message: 'Audit event recorded.' });
});

app.get('/api/audit-logs', authenticateJWT, authorizeRoles('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const [logs] = await db.query('SELECT * FROM audit_logs ORDER BY log_id DESC LIMIT 100');
    res.json(logs);
  } catch (err) {
    console.error('Audit log fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

app.get('/api/audit-logs/verify', authenticateJWT, authorizeRoles('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const [logs] = await db.query('SELECT * FROM audit_logs ORDER BY log_id ASC');
    for (let i = 1; i < logs.length; i++) {
      const log = logs[i];
      const expectedPrevHash = logs[i - 1].current_hash;
      const payload = `${expectedPrevHash}|${log.actor_email}|${log.actor_role}|${log.action_type}|${log.target_resource}|${log.status}`;
      const recomputedHash = crypto.createHash('sha256').update(payload).digest('hex');

      if (log.prev_hash !== expectedPrevHash || log.current_hash !== recomputedHash) {
        return res.json({
          valid: false,
          tamperedLogId: log.log_id,
          message: `INTEGRITY BREACH DETECTED at Log #${log.log_id}! MySQL row was altered outside the application.`
        });
      }
    }
    res.json({ valid: true, totalVerified: logs.length, message: 'All SHA-256 audit log chains are intact.' });
  } catch (err) {
    console.error('Audit chain verification error:', err.message);
    res.status(500).json({ error: 'Failed to verify audit log chain.' });
  }
});

// ==================== ADMIN USER MANAGEMENT ROUTES ====================

app.get('/api/users', authenticateJWT, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.department, r.role_name, u.failed_attempts, u.is_locked, u.is_active
       FROM users u JOIN roles r ON u.role_id = r.role_id`
    );
    res.json(users);
  } catch (err) {
    console.error('User list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

app.patch('/api/users/:id/status', authenticateJWT, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  const active = req.body.active;
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'The active field must be a boolean.' });
  }
  if (Number(req.params.id) === Number(req.user.user_id) && !active) {
    return res.status(400).json({ error: 'You cannot suspend your own account.' });
  }
  try {
    const [result] = await db.query(
      'UPDATE users SET is_active = ?, is_locked = IF(?, FALSE, is_locked), failed_attempts = IF(?, 0, failed_attempts) WHERE user_id = ?',
      [active, active, active, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found.' });
    await logAuditEvent({
      actorEmail: req.user.email,
      actorRole: req.user.role,
      actionType: active ? 'ADMIN_RESTORED_USER' : 'ADMIN_SUSPENDED_USER',
      targetResource: `user_id:${req.params.id}`,
      ipAddress: req.ip,
      status: 'SUCCESS'
    });
    res.json({ message: active ? 'User access restored.' : 'User access suspended.' });
  } catch (err) {
    console.error('User status update error:', err.message);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

app.patch('/api/users/:id/unlock', authenticateJWT, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  await db.query('UPDATE users SET is_locked = FALSE, failed_attempts = 0 WHERE user_id = ?', [req.params.id]);
  await logAuditEvent({
    actorEmail: req.user.email,
    actorRole: req.user.role,
    actionType: 'ADMIN_UNLOCKED_USER',
    targetResource: `user_id:${req.params.id}`,
    ipAddress: req.ip,
    status: 'SUCCESS'
  });
  res.json({ message: 'User account unlocked.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await seedInitialUsers();
  console.log(`Aegis Secure Portal API running on http://localhost:${PORT}`);
});