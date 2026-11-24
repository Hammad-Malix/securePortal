import { Menu, Clock, LogOut } from 'lucide-react';

export default function PortalTopbar({
  currentUser,
  activeTab,
  sessionSeconds,
  formatTimer,
  setMobileNavOpen,
  handleSignOut
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="mobile-menu-btn"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <div>
          <div className="form-eyebrow" style={{ fontSize: '9px' }}>
            INFORMATION SECURITY / {currentUser.department}
          </div>
          <h1 className="topbar-heading">
            {activeTab === 'OVERVIEW' && 'Overview & Classified Records'}
            {activeTab === 'APPROVALS' && 'Dual-Control Approval Queue'}
            {activeTab === 'AUDIT_LOGS' && 'Immutable Audit Log Ledger'}
            {activeTab === 'ACCESS_MATRIX' && 'Access & Role Matrix'}
            {activeTab === 'ACCESS_DENIED' && 'Clearance Restricted'}
          </h1>
        </div>
      </div>

      <div className="topbar-right">
        <div className="ttl-badge">
          <Clock size={14} color="#9E5438" />
          <span>TTL {formatTimer(sessionSeconds)}</span>
        </div>
        <button onClick={() => handleSignOut('MANUAL_SIGNOUT')} className="btn-signout">
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
