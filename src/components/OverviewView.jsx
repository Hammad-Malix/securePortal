import { Plus, Lock, ArrowRight } from 'lucide-react';
export default function OverviewView(props) {
  const { visibleRecords, records, currentUser, auditLogs, setIsCreateModalOpen, setActiveTab } = props;

  return (
<>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="form-eyebrow">CONFIDENTIALITY / ACCESS</div>
                    <div className="metric-value">
                      {visibleRecords.length} of {records.length} Dossiers
                    </div>
                    <p className="metric-desc">
                      Filtered by Need-to-Know policy for {currentUser.roleLabel}.
                    </p>
                  </div>

                  <div className="metric-card">
                    <div className="form-eyebrow">INTEGRITY & NON-REPUDIATION</div>
                    <div className="metric-value slate">{auditLogs.length} Chained Blocks</div>
                    <p className="metric-desc">
                      Every mutation sealed with sequential SHA-256 hashing.
                    </p>
                  </div>

                  <div className="metric-card">
                    <div className="form-eyebrow">DEFENSE-IN-DEPTH STATUS</div>
                    <div className="metric-value terracotta">
                      {auditLogs.filter((l) => l.status === '403_FORBIDDEN').length} Threats Blocked
                    </div>
                    <p className="metric-desc">
                      SQLi payloads & unauthorized privilege attempts halted.
                    </p>
                  </div>
                </div>

                <div className="section-header-row">
                  <div>
                    <h2 className="section-title">Authorized Information Assets</h2>
                    <p className="section-subtitle">
                      Records visible under your current clearance level ({currentUser.clearance}).
                    </p>
                  </div>

                  {(currentUser.role === 'STAFF' || currentUser.role === 'SUPER_ADMIN') && (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="btn-action-umber"
                    >
                      <Plus size={16} />
                      <span>New Classified Dossier</span>
                    </button>
                  )}
                </div>

                <div className="records-list">
                  {visibleRecords.map((rec) => (
                    <div key={rec.id} className="record-row">
                      <div className="record-info">
                        <div className="record-badges">
                          <span className="record-id">{rec.id}</span>
                          <span className="badge-classification">{rec.classification}</span>
                          <span
                            className={`badge-status ${
                              rec.status === 'APPROVED'
                                ? 'approved'
                                : rec.status === 'REJECTED'
                                ? 'rejected'
                                : 'pending'
                            }`}
                          >
                            {rec.status.replace('_', ' ')}
                          </span>
                        </div>

                        <h3 className="record-title">{rec.title}</h3>
                        <p className="record-details">{rec.details}</p>

                        <div className="record-meta">
                          <span>
                            Author: <strong>{rec.ownerName}</strong> ({rec.ownerId})
                          </span>
                          <span>•</span>
                          <span>{rec.createdAt}</span>
                          {rec.approvedBy && (
                            <>
                              <span>•</span>
                              <span style={{ color: 'var(--accent-slate)', fontWeight: 500 }}>
                                Verified by {rec.approvedBy}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="record-hash">SHA-256: {rec.integrityHash}</div>
                      </div>

                      <div>
                        {rec.status === 'PENDING_APPROVAL' ? (
                          <button
                            onClick={() => setActiveTab('APPROVALS')}
                            className="text-link-btn"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span>Review in Queue</span>
                            <ArrowRight size={14} />
                          </button>
                        ) : (
                          <span className="row-sealed-tag">
                            <Lock size={14} color="#5A4332" />
                            <span>Row Sealed</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
  );
}
