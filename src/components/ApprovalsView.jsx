import { CheckCircle2, XCircle, Lock } from 'lucide-react';
export default function ApprovalsView(props) {
  const { records, currentUser, handleDecision } = props;

  return (
<>
                <div className="alert-banner">
                  <strong>Separation of Duties Policy:</strong> No single user may both author and
                  approve a sensitive record. Staff submissions must be verified by an independent
                  Manager or Super Admin.
                </div>

                <div className="records-list">
                  {records.map((rec) => {
                    const canReview =
                      currentUser.role === 'MANAGER' || currentUser.role === 'SUPER_ADMIN';

                    return (
                      <div key={rec.id} className="record-row">
                        <div className="record-info">
                          <div className="record-badges">
                            <span className="record-id">{rec.id}</span>
                            <span className="form-eyebrow">{rec.classification}</span>
                          </div>
                          <h3 className="record-title">{rec.title}</h3>
                          <p className="record-details">
                            Submitted by {rec.ownerName} ({rec.ownerId}) • {rec.department}
                          </p>
                        </div>

                        <div className="approval-actions">
                          {rec.status === 'PENDING_APPROVAL' ? (
                            canReview ? (
                              <>
                                <button
                                  onClick={() => handleDecision(rec, 'APPROVED')}
                                  className="btn-approve"
                                >
                                  <CheckCircle2 size={14} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleDecision(rec, 'REJECTED')}
                                  className="btn-reject"
                                >
                                  <XCircle size={14} />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleDecision(rec, 'APPROVED')}
                                className="btn-secondary"
                                style={{
                                  height: '36px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <Lock size={14} color="#9E5438" />
                                <span>Awaiting Manager Sign-Off</span>
                              </button>
                            )
                          ) : (
                            <span className="badge-classification">{rec.status}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
  );
}
