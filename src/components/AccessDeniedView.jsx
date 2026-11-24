import { Lock } from 'lucide-react';
export default function AccessDeniedView(props) {
  const { currentUser, setActiveTab } = props;

  return (
<div className="denied-card">
                <div className="denied-icon-box">
                  <Lock size={20} />
                </div>
                <div className="form-eyebrow" style={{ color: 'var(--accent-terracotta)' }}>
                  403 FORBIDDEN • LEAST PRIVILEGE ENFORCED
                </div>
                <h2 className="section-title">Insufficient Role Clearance</h2>
                <p className="section-subtitle" style={{ lineHeight: 1.6 }}>
                  Your current role (<strong>{currentUser.roleLabel}</strong>) is not authorized to
                  view the Access & Role Matrix. This access attempt has been recorded in the
                  immutable Audit Ledger.
                </p>
                <button
                  onClick={() => setActiveTab('OVERVIEW')}
                  className="btn-action-umber"
                  style={{ marginTop: '6px' }}
                >
                  Return to Overview
                </button>
              </div>
  );
}
