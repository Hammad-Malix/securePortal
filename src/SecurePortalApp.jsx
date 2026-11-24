import { useState, useEffect, useMemo, useCallback } from 'react';
import LoginView from './components/LoginView';
import OverviewView from './components/OverviewView';
import ApprovalsView from './components/ApprovalsView';
import AuditLedgerView from './components/AuditLedgerView';
import AccessMatrixView from './components/AccessMatrixView';
import AccessDeniedView from './components/AccessDeniedView';
import ToastNotice from './components/ToastNotice';
import PortalSidebar from './components/PortalSidebar';
import PortalTopbar from './components/PortalTopbar';
import CreateRecordModal from './components/CreateRecordModal';
import { mapApiAuditLog, mapApiRecord, mapApiUser, portalApi } from './api/portalApi';

// ============================================================================
// 1. DEMO SECURITY DATA (MySQL Schema Ready)
// ============================================================================

const DEMO_USERS = [
  {
    id: '1',
    name: 'Hammad Iqbal',
    email: 'admin@aegis.io',
    role: 'SUPER_ADMIN',
    roleLabel: 'Super Admin',
  },
  {
    id: '2',
    name: 'Sara Ahmed',
    email: 'manager@aegis.io',
    role: 'MANAGER',
    roleLabel: 'Dept. Manager',
  },
  {
    id: '3',
    name: 'Bilal Khan',
    email: 'staff@aegis.io',
    role: 'STAFF',
    roleLabel: 'Standard Staff',
  }
];

const INITIAL_RECORDS = [
  {
    id: 'REC-01',
    title: 'BSCS Semester Examination Ledger',
    classification: 'CONFIDENTIAL',
    ownerId: 'USR-1089',
    ownerName: 'Hamza Raza',
    department: 'Academic Registry',
    status: 'PENDING_APPROVAL',
    createdAt: '2026-11-19 07:42:10',
    integrityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    details: 'Final semester grade tabulation awaiting Department Manager sign-off under Separation of Duties.'
  },
  {
    id: 'REC-02',
    title: 'Faculty Disbursement & Stipend Batch #11',
    classification: 'SECRET',
    ownerId: 'USR-1089',
    ownerName: 'Hamza Raza',
    department: 'Finance & Operations',
    status: 'APPROVED',
    approvedBy: 'Bilal Mahmood (USR-1042)',
    createdAt: '2026-11-18 15:18:44',
    integrityHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    details: 'Dual-control verified. MySQL row sealed with SHA-256 non-repudiation signature.'
  },
  {
    id: 'REC-03',
    title: 'Merit Scholarship Verification Dossier',
    classification: 'CONFIDENTIAL',
    ownerId: 'USR-1089',
    ownerName: 'Hamza Raza',
    department: 'Academic Registry',
    status: 'REJECTED',
    approvedBy: 'Bilal Mahmood (USR-1042)',
    createdAt: '2026-11-17 11:05:19',
    integrityHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    details: 'Returned due to missing cryptographic signature on supporting verification annex.'
  },
  {
    id: 'REC-04',
    title: 'Perimeter Firewall & Key Rotation Baseline',
    classification: 'TOP_SECRET',
    ownerId: 'USR-1001',
    ownerName: 'Dr. Ayesha Tariq',
    department: 'Information Security Office',
    status: 'APPROVED',
    approvedBy: 'Dr. Ayesha Tariq (USR-1001)',
    createdAt: '2026-11-16 09:30:00',
    integrityHash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    details: 'Restricted infrastructure policy. Visible strictly to TOP_SECRET clearance.'
  }
];

function computeSimulatedSha256(input) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const p4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
  return `${p1}${p2}${p3}${p4}${p2}${p1}${p4}${p3}`;
}

function buildInitialAuditLogs() {
  const seedEvents = [
    {
      id: 'LOG-001',
      timestamp: '2026-11-19 07:30:12',
      userId: 'USR-1001',
      userName: 'Dr. Ayesha Tariq',
      role: 'SUPER_ADMIN',
      action: 'AUTH_MFA_VERIFIED',
      resource: 'IAM_ENCLAVE_GATEWAY',
      ip: '192.168.10.4',
      status: 'SUCCESS',
      details: 'Password + TOTP verified. RS256 session token issued (15m TTL).'
    },
    {
      id: 'LOG-002',
      timestamp: '2026-11-19 07:42:10',
      userId: 'USR-1089',
      userName: 'Hamza Raza',
      role: 'STAFF',
      action: 'RECORD_CREATED',
      resource: 'REC-01 (BSCS Examination Ledger)',
      ip: '192.168.10.57',
      status: 'SUCCESS',
      details: 'Submitted confidential record. Queued for Manager approval.'
    },
    {
      id: 'LOG-003',
      timestamp: '2026-11-19 07:51:04',
      userId: 'USR-1089',
      userName: 'Hamza Raza',
      role: 'STAFF',
      action: 'RBAC_ACCESS_DENIED',
      resource: '/enclave/access-matrix',
      ip: '192.168.10.57',
      status: '403_FORBIDDEN',
      details: 'Least Privilege guard blocked STAFF role from Access & Role Matrix.'
    },
    {
      id: 'LOG-004',
      timestamp: '2026-11-19 08:02:39',
      userId: 'GUEST',
      userName: 'Unauthenticated Client',
      role: 'NONE',
      action: 'SQL_INJECTION_INTERCEPTED',
      resource: '/api/auth/login',
      ip: '203.99.184.12',
      status: '403_FORBIDDEN',
      details: "Sanitizer blocked payload `' OR '1'='1` in Email address field."
    },
    {
      id: 'LOG-005',
      timestamp: '2026-11-19 08:10:15',
      userId: 'USR-1042',
      userName: 'Bilal Mahmood',
      role: 'MANAGER',
      action: 'RECORD_APPROVED',
      resource: 'REC-02 (Faculty Disbursement Batch)',
      ip: '192.168.10.22',
      status: 'SUCCESS',
      details: 'Separation of Duties verified: Approver (USR-1042) != Creator (USR-1089).'
    }
  ];

  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  return seedEvents.map((ev) => {
    const payload = `${prevHash}|${ev.id}|${ev.timestamp}|${ev.userId}|${ev.action}|${ev.resource}|${ev.status}`;
    const hash = computeSimulatedSha256(payload);
    const entry = { ...ev, prevHash, hash };
    prevHash = hash;
    return entry;
  });
}

// ============================================================================
// 3. MAIN REACT APPLICATION COMPONENT
// ============================================================================

export default function App() {
  // Authentication & MFA State
  const [authStep, setAuthStep] = useState('LOGIN'); // 'LOGIN' | 'MFA' | 'AUTHENTICATED'
  const [pendingUser, setPendingUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  // Login Form Inputs
  const [emailInput, setEmailInput] = useState('admin@aegis.io');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showRolePresets, setShowRolePresets] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [authBanner, setAuthBanner] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);

  // Dashboard State
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(900);
  const [editorialNotice, setEditorialNotice] = useState(null);

  // Portal Data
  const [usersList, setUsersList] = useState(DEMO_USERS);
  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [auditLogs, setAuditLogs] = useState(() => buildInitialAuditLogs());

  // New Record Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClassification, setNewClassification] = useState('CONFIDENTIAL');
  const [newDetails, setNewDetails] = useState('');

  // Audit Log Search & Hash Verification State
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState('ALL');
  const [tamperedLogId, setTamperedLogId] = useState(null);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [chainReport, setChainReport] = useState(null);

  const showNotice = useCallback((tone, heading, body) => {
    setEditorialNotice({ tone, heading, body });
    setTimeout(() => setEditorialNotice(null), 5000);
  }, []);

  const loadPortalData = useCallback(async (token, role) => {
    const [recordRows, logRows, userRows] = await Promise.all([
      portalApi.getRecords(token),
      role === 'SUPER_ADMIN' || role === 'MANAGER' ? portalApi.getAuditLogs(token) : Promise.resolve([]),
      role === 'SUPER_ADMIN' ? portalApi.getUsers(token) : Promise.resolve([])
    ]);
    setRecords(recordRows.map(mapApiRecord));
    setAuditLogs(logRows.map(mapApiAuditLog).reverse());
    setUsersList(userRows.map(mapApiUser));
    setChainReport(null);
    setTamperedLogId(null);
  }, []);

  const appendAuditLog = useCallback(async ({ action, resource, details }) => {
    if (!authToken) return;
    try {
      await portalApi.recordAuditEvent(authToken, {
        actionType: action,
        targetResource: resource,
        details
      });
      if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MANAGER') {
        const logs = await portalApi.getAuditLogs(authToken);
        setAuditLogs(logs.map(mapApiAuditLog).reverse());
        setChainReport(null);
      }
    } catch (error) {
      showNotice('danger', 'Audit Event Failed', error.message);
    }
  }, [authToken, currentUser, showNotice]);

  useEffect(() => {
    let cancelled = false;
    const savedToken = localStorage.getItem('aegis_auth_token') || sessionStorage.getItem('aegis_auth_token');
    if (!savedToken) return undefined;

    const restoreSession = async () => {
      try {
        const user = mapApiUser(await portalApi.getCurrentUser(savedToken));
        await loadPortalData(savedToken, user.role);
        if (cancelled) return;
        setAuthToken(savedToken);
        setCurrentUser(user);
        setAuthStep('AUTHENTICATED');
      } catch (error) {
        localStorage.removeItem('aegis_auth_token');
        sessionStorage.removeItem('aegis_auth_token');
        if (!cancelled) {
          setAuthBanner({ type: 'error', text: `Could not restore your session: ${error.message}` });
        }
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [loadPortalData]);

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Login & SQL Injection Guard
  const handleEmailInput = (val) => {
    setEmailInput(val);
    const sqliRegex = /('|--|;|OR\s+1=1|OR\s+'1'='1|UNION\s+SELECT|DROP\s+TABLE)/i;
    if (sqliRegex.test(val)) {
      setAuthBanner({
        type: 'sqli',
        text: 'SQL Injection pattern detected in input. Submitting will trigger the Web Application Firewall & Audit Logger.'
      });
    } else if (authBanner?.type === 'sqli') {
      setAuthBanner(null);
    }
  };

  const selectPresetRole = (preset) => {
    setEmailInput(preset.email);
    setPasswordInput('');
    setAuthBanner(null);
    setIsLockedOut(false);
    setFailedAttempts(0);
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    if (isLockedOut) return;
    try {
      const response = await portalApi.login(emailInput.trim(), passwordInput);
      if (!response.mfaRequired || !response.email || !response.demoOtp) {
        throw new Error('The server returned an invalid MFA challenge.');
      }
      const preset = DEMO_USERS.find((user) => user.email === response.email);
      setAuthBanner(null);
      setPendingUser({
        email: response.email,
        name: preset?.name || response.email,
        roleLabel: preset?.roleLabel || 'Portal Member',
        demoOtp: response.demoOtp
      });
      setOtpInput(response.demoOtp);
      setAuthStep('MFA');
    } catch (error) {
      const attemptMatch = error.message.match(/Attempt (\d+) of 5/i);
      if (attemptMatch) setFailedAttempts(Number(attemptMatch[1]));
      if (error.message.includes('Account locked')) setIsLockedOut(true);
      setAuthBanner({ type: 'error', text: error.message });
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    if (!pendingUser) return;
    try {
      const response = await portalApi.verifyMfa(pendingUser.email, otpInput.trim());
      const user = mapApiUser(response.user);
      await loadPortalData(response.token, user.role);
      localStorage.removeItem('aegis_auth_token');
      sessionStorage.removeItem('aegis_auth_token');
      (rememberMe ? localStorage : sessionStorage).setItem('aegis_auth_token', response.token);
      setAuthToken(response.token);
      setCurrentUser(user);
      setPendingUser(null);
      setAuthStep('AUTHENTICATED');
      setActiveTab('OVERVIEW');
      setSessionSeconds(900);
      setFailedAttempts(0);
      setAuthBanner(null);
      showNotice(
        'success',
        'Enclave Session Established',
        `Welcome, ${user.name}. Clearance level ${user.clearance} is active.`
      );
    } catch (error) {
      setAuthBanner({ type: 'error', text: error.message });
      if (error.message.includes('expired')) {
        setAuthStep('LOGIN');
        setPendingUser(null);
      }
    }
  };

  const handleSignOut = useCallback(async (reason = 'MANUAL_SIGNOUT') => {
    if (authToken) {
      await appendAuditLog({
        action: reason === 'SESSION_EXPIRED' ? 'SESSION_TTL_EXPIRED' : 'AUTH_SIGNOUT',
        resource: 'IAM_ENCLAVE_GATEWAY',
        details: reason === 'SESSION_EXPIRED' ? 'Session expired automatically.' : 'User signed out.'
      });
    }
    localStorage.removeItem('aegis_auth_token');
    sessionStorage.removeItem('aegis_auth_token');
    setAuthToken(null);
    setCurrentUser(null);
    setPendingUser(null);
    setAuthStep('LOGIN');
    setOtpInput('');
    setMobileNavOpen(false);
    setPasswordInput('');
  }, [appendAuditLog, authToken]);

  // Session TTL Countdown
  useEffect(() => {
    if (authStep !== 'AUTHENTICATED') return undefined;
    const timer = setInterval(() => {
      setSessionSeconds((prev) => {
        if (prev <= 1) {
          handleSignOut('SESSION_EXPIRED');
          return 900;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [authStep, handleSignOut]);

  // Record Creation & Separation of Duties Approvals
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !currentUser) return;
    try {
      const response = await portalApi.createRecord(authToken, {
        title: newTitle.trim(),
        classification: newClassification,
        details: newDetails.trim() || null
      });
      await loadPortalData(authToken, currentUser.role);
      setNewTitle('');
      setNewDetails('');
      setIsCreateModalOpen(false);
      showNotice('success', 'Dossier Sealed & Queued', `REC-${String(response.record_id).padStart(2, '0')} has been saved and routed for approval.`);
    } catch (error) {
      showNotice('danger', 'Could Not Save Dossier', error.message);
    }
  };

  const handleDecision = async (record, decision) => {
    if (!currentUser) return;

    if (record.ownerId === currentUser.id) {
      appendAuditLog({
        action: 'SOD_POLICY_VIOLATION',
        resource: record.id,
        details: 'Separation of Duties blocked author from approving their own submission.'
      });
      showNotice(
        'danger',
        'Separation of Duties Enforcement',
        'Policy prohibits approving a record you authored yourself. A separate Manager must review it.'
      );
      return;
    }

    try {
      await portalApi.updateRecordStatus(authToken, record.recordId, decision);
      await loadPortalData(authToken, currentUser.role);

      showNotice(
        decision === 'APPROVED' ? 'success' : 'warning',
        `Record ${decision === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        `${record.id} status updated and signed in the Audit Ledger.`
      );
    } catch (error) {
      showNotice('danger', 'Record Decision Failed', error.message);
    }
  };

  // Hash Chain Verification
  const handleVerifyHashChain = async () => {
    setIsVerifyingChain(true);
    setChainReport(null);
    try {
      if (tamperedLogId) {
        setChainReport({
          valid: false,
          text: `INTEGRITY BREACH SIMULATED AT ${tamperedLogId}: The local tampering simulation does not modify the database.`
        });
        return;
      }
      const result = await portalApi.verifyAuditChain(authToken);
      setChainReport({ valid: result.valid, text: result.message });
    } catch (error) {
      showNotice('danger', 'Ledger Verification Failed', error.message);
    } finally {
      setIsVerifyingChain(false);
    }
  };

  const handleToggleUserStatus = async (target) => {
    if (target.id === currentUser?.id) {
      showNotice('warning', 'Action Restricted', 'You cannot suspend your own active Super Admin session.');
      return;
    }
    const active = target.status !== 'ACTIVE';
    try {
      await portalApi.updateUserStatus(authToken, target.id, active);
      await loadPortalData(authToken, currentUser.role);
      showNotice('info', 'Clearance Updated', `${target.name} is now ${active ? 'ACTIVE' : 'SUSPENDED'}.`);
    } catch (error) {
      showNotice('danger', 'Could Not Update User', error.message);
    }
  };

  // Filtered Views
  const visibleRecords = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'SUPER_ADMIN') return records;
    if (currentUser.role === 'MANAGER') {
      return records.filter((r) => r.classification !== 'TOP_SECRET');
    }
    return records.filter((r) => r.ownerId === currentUser.id);
  }, [records, currentUser]);

  const filteredLogs = useMemo(() => {
    return auditLogs
      .slice()
      .reverse()
      .filter((log) => {
        const matchesFilter = logFilter === 'ALL' || log.status === logFilter;
        const q = logSearch.toLowerCase();
        const matchesQuery =
          !q ||
          log.id.toLowerCase().includes(q) ||
          log.userName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.resource.toLowerCase().includes(q) ||
          log.ip.toLowerCase().includes(q);
        return matchesFilter && matchesQuery;
      });
  }, [auditLogs, logSearch, logFilter]);

  // ==========================================================================
  // VIEW 1: SPLIT-SCREEN GALLERY LOGIN (ARTWORK LEFT, LOGIN FORM RIGHT)
  // ==========================================================================
  if (authStep !== 'AUTHENTICATED') {
    return (
      <LoginView
        authStep={authStep}
        pendingUser={pendingUser}
        emailInput={emailInput}
        passwordInput={passwordInput}
        showPassword={showPassword}
        rememberMe={rememberMe}
        showRolePresets={showRolePresets}
        otpInput={otpInput}
        authBanner={authBanner}
        failedAttempts={failedAttempts}
        isLockedOut={isLockedOut}
        DEMO_USERS={DEMO_USERS}
        handleEmailInput={handleEmailInput}
        setPasswordInput={setPasswordInput}
        setShowPassword={setShowPassword}
        setRememberMe={setRememberMe}
        setShowRolePresets={setShowRolePresets}
        setAuthStep={setAuthStep}
        setPendingUser={setPendingUser}
        setAuthBanner={setAuthBanner}
        selectPresetRole={selectPresetRole}
        handleSignInSubmit={handleSignInSubmit}
        setOtpInput={setOtpInput}
        handleMfaVerify={handleMfaVerify}
      />
    );
  }

  // VIEW 2: AUTHENTICATED PORTAL WORKSPACE
  // ==========================================================================
  const handleNavigationClick = (item) => {
    if (!item.allowedRoles.includes(currentUser.role)) {
      appendAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        action: 'RBAC_ACCESS_DENIED',
        resource: `/enclave/${item.id.toLowerCase()}`,
        status: '403_FORBIDDEN',
        details: `Least Privilege blocked [${currentUser.role}] from ${item.label}.`
      });
      setActiveTab('ACCESS_DENIED');
      setMobileNavOpen(false);
      return;
    }
    setActiveTab(item.id);
    setMobileNavOpen(false);
  };

  return (
    <>
      <div className="portal-layout">
        <ToastNotice notice={editorialNotice} onClose={() => setEditorialNotice(null)} />
        <PortalSidebar
          currentUser={currentUser}
          activeTab={activeTab}
          mobileNavOpen={mobileNavOpen}
          setMobileNavOpen={setMobileNavOpen}
          handleNavigationClick={handleNavigationClick}
          appendAuditLog={appendAuditLog}
          showNotice={showNotice}
        />

        {/* RIGHT MAIN CONTENT AREA */}
        <div className="portal-main">
          <PortalTopbar
            currentUser={currentUser}
            activeTab={activeTab}
            sessionSeconds={sessionSeconds}
            formatTimer={formatTimer}
            setMobileNavOpen={setMobileNavOpen}
            handleSignOut={handleSignOut}
          />

          <main className="workspace-container">
            {activeTab === 'OVERVIEW' && (
              <OverviewView
                visibleRecords={visibleRecords}
                records={records}
                currentUser={currentUser}
                auditLogs={auditLogs}
                setIsCreateModalOpen={setIsCreateModalOpen}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'APPROVALS' && (
              <ApprovalsView
                records={records}
                currentUser={currentUser}
                handleDecision={handleDecision}
              />
            )}

            {activeTab === 'AUDIT_LOGS' && (
              <AuditLedgerView
                tamperedLogId={tamperedLogId}
                auditLogs={auditLogs}
                isVerifyingChain={isVerifyingChain}
                chainReport={chainReport}
                setTamperedLogId={setTamperedLogId}
                setChainReport={setChainReport}
                handleVerifyHashChain={handleVerifyHashChain}
                logSearch={logSearch}
                setLogSearch={setLogSearch}
                logFilter={logFilter}
                setLogFilter={setLogFilter}
                filteredLogs={filteredLogs}
              />
            )}

            {activeTab === 'ACCESS_MATRIX' && (
              <AccessMatrixView
                usersList={usersList}
                handleToggleUserStatus={handleToggleUserStatus}
              />
            )}

            {activeTab === 'ACCESS_DENIED' && (
              <AccessDeniedView
                currentUser={currentUser}
                setActiveTab={setActiveTab}
              />
            )}

          </main>
        </div>

        <CreateRecordModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newClassification={newClassification}
          setNewClassification={setNewClassification}
          newDetails={newDetails}
          setNewDetails={setNewDetails}
          handleCreateRecord={handleCreateRecord}
        />
      </div>
    </>
  );
}