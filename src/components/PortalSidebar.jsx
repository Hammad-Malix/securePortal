import { Lock, X, Ban, FileText, CheckSquare, Terminal, Users } from 'lucide-react';

export default function PortalSidebar({
  currentUser,
  activeTab,
  mobileNavOpen,
  setMobileNavOpen,
  handleNavigationClick,
  appendAuditLog,
  showNotice
}) {
  const navItems = [
    { id: 'OVERVIEW', label: 'Overview & Records', icon: FileText, allowedRoles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'], tag: currentUser.role === 'STAFF' ? 'Own Only' : 'Need-to-Know' },
    { id: 'APPROVALS', label: 'Approval Queue', icon: CheckSquare, allowedRoles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'], tag: 'Sep. of Duties' },
    { id: 'AUDIT_LOGS', label: 'Audit Log Ledger', icon: Terminal, allowedRoles: ['SUPER_ADMIN', 'MANAGER'], tag: 'SHA-256' },
    { id: 'ACCESS_MATRIX', label: 'Access & Role Matrix', icon: Users, allowedRoles: ['SUPER_ADMIN'], tag: 'Admin Only' }
  ];

  return (
    <aside className={`portal-sidebar ${mobileNavOpen ? 'open' : ''}`}>
      <div>
        <div className="sidebar-brand">
          <div>
            <div className="eyebrow-label">AEGIS / PRIVATE VIEW</div>
            <div className="sidebar-title">Zero-Trust Ledger</div>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="mobile-menu-btn"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-user-card">
          <div className="user-card-top">
            <span className="eyebrow-label" style={{ fontSize: '9px' }}>VERIFIED ROLE</span>
            <span className="badge-slate">{currentUser.roleLabel}</span>
          </div>
          <div className="user-card-name">{currentUser.name}</div>
          <div className="user-card-clearance">Clearance: {currentUser.clearance}</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isPermitted = item.allowedRoles.includes(currentUser.role);
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigationClick(item)}
                className={`nav-item-btn ${isActive ? 'active' : ''} ${!isPermitted ? 'restricted' : ''}`}
              >
                <div className="nav-item-left">
                  <Icon size={16} color={isActive ? '#F5F2EB' : '#5A4332'} />
                  <span>{item.label}</span>
                </div>
                {!isPermitted ? (
                  <Lock size={14} color="#9E5438" />
                ) : (
                  <span className="nav-tag">{item.tag}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="mini-artwork-row">
          <div className="mini-frame">
            <svg viewBox="0 0 110 80" width="100%" height="100%" style={{ display: 'block' }}>
              <path d="M 18 70 L 18 38 A 22 22 0 0 1 62 38 L 62 70 Z" fill="#9E5438" />
              <path d="M 52 32 L 96 32 L 96 50 A 22 22 0 0 1 52 50 Z" fill="#2D403D" />
            </svg>
          </div>
          <div className="mini-caption">
            Study in Balance
            <br />
            SHA-256 Chain Active
          </div>
        </div>

        <button
          onClick={() => {
            appendAuditLog({
              userId: currentUser.id,
              userName: currentUser.name,
              role: currentUser.role,
              action: 'LOG_DELETION_BLOCKED',
              resource: 'mysql.audit_logs',
              status: '403_FORBIDDEN',
              details: 'Append-only trigger prevented audit record deletion.'
            });
            showNotice(
              'danger',
              '403 Forbidden — Immutable Ledger',
              'Audit records cannot be deleted by any role. Attempt logged with your User ID and IP.'
            );
          }}
          className="btn-guard-test"
        >
          <Ban size={14} />
          <span>Test Log Deletion Guard</span>
        </button>
      </div>
    </aside>
  );
}
