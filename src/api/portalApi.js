const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Dept. Manager',
  STAFF: 'Standard Staff'
};

const ROLE_CLEARANCES = {
  SUPER_ADMIN: 'TOP_SECRET',
  MANAGER: 'SECRET',
  STAFF: 'CONFIDENTIAL'
};

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['VIEW_ALL_RECORDS', 'APPROVE_RECORDS', 'MANAGE_USERS', 'VIEW_AUDIT_LOGS', 'VERIFY_HASH_CHAIN'],
  MANAGER: ['VIEW_ALL_RECORDS', 'APPROVE_RECORDS', 'VIEW_AUDIT_LOGS'],
  STAFF: ['CREATE_RECORD', 'VIEW_OWN_RECORDS']
};

async function request(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The API returned an invalid response. Check that the backend is running.');
  }
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  return data;
}

export function mapApiUser(user) {
  const role = user.role_name || user.role;
  return {
    id: String(user.user_id ?? user.id),
    name: user.full_name || user.name,
    email: user.email,
    role,
    roleLabel: ROLE_LABELS[role] || role,
    department: user.department || 'General',
    clearance: ROLE_CLEARANCES[role] || 'CONFIDENTIAL',
    status: user.is_active === false || user.is_active === 0 || user.is_locked ? 'SUSPENDED' : 'ACTIVE',
    permissions: ROLE_PERMISSIONS[role] || []
  };
}

export function mapApiRecord(record) {
  const status = record.status === 'PENDING' ? 'PENDING_APPROVAL' : record.status;
  const recordId = String(record.record_id ?? record.recordId);
  return {
    id: `REC-${recordId.padStart(2, '0')}`,
    recordId,
    title: record.title,
    classification: record.classification,
    ownerId: String(record.created_by),
    ownerName: record.creator_name || 'Unknown',
    department: record.creator_department || 'General',
    status,
    approvedBy: record.approver_name || null,
    createdAt: record.created_at
      ? new Date(record.created_at).toLocaleString()
      : '',
    integrityHash: record.integrity_hash || 'Not available',
    details: record.details || 'No summary provided.'
  };
}

export function mapApiAuditLog(log) {
  const logId = String(log.log_id);
  return {
    id: `LOG-${logId.padStart(3, '0')}`,
    timestamp: log.created_at ? new Date(log.created_at).toLocaleString() : '',
    userId: log.actor_email,
    userName: log.actor_email,
    role: log.actor_role,
    action: log.action_type,
    resource: log.target_resource,
    ip: log.ip_address,
    status: log.status === 'SUCCESS' ? 'SUCCESS' : '403_FORBIDDEN',
    details: log.details || log.action_type,
    prevHash: log.prev_hash,
    hash: log.current_hash
  };
}

export const portalApi = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  verifyMfa: (email, otp) =>
    request('/auth/verify-mfa', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    }),

  getCurrentUser: (token) => request('/auth/me', { token }),

  getRecords: (token) => request('/records', { token }),

  createRecord: (token, record) =>
    request('/records', {
      method: 'POST',
      token,
      body: JSON.stringify(record)
    }),

  updateRecordStatus: (token, recordId, status) =>
    request(`/records/${encodeURIComponent(recordId)}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status })
    }),

  getAuditLogs: (token) => request('/audit-logs', { token }),

  recordAuditEvent: (token, event) =>
    request('/audit-logs/events', {
      method: 'POST',
      token,
      body: JSON.stringify(event)
    }),

  verifyAuditChain: (token) => request('/audit-logs/verify', { token }),

  getUsers: (token) => request('/users', { token }),

  updateUserStatus: (token, userId, active) =>
    request(`/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ active })
    }),

  checkHealth: () => request('/health')
};
