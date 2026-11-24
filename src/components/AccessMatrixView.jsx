
export default function AccessMatrixView(props) {
  const { usersList, handleToggleUserStatus } = props;

  return (
<div className="table-card">
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
                  <h2 className="section-title">Role-Based Access Control (RBAC) Directory</h2>
                  <p className="section-subtitle">
                    Maps directly to MySQL <code className="inline-code">users</code> and{' '}
                    <code className="inline-code">roles</code> tables.
                  </p>
                </div>

                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Identity</th>
                      <th>Assigned Role</th>
                      <th>Clearance</th>
                      <th>Permissions</th>
                      <th style={{ textAlign: 'right' }}>Status Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{u.name}</div>
                          <div
                            className="mono-text"
                            style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                          >
                            {u.email}
                          </div>
                        </td>
                        <td>
                          <span className="badge-slate">{u.roleLabel}</span>
                        </td>
                        <td className="mono-text">{u.clearance}</td>
                        <td>
                          <div className="perm-tag-list">
                            {u.permissions.map((perm) => (
                              <span key={perm} className="perm-tag">
                                {perm}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className="btn-secondary"
                            style={{
                              height: '32px',
                              padding: '0 12px',
                              borderColor: 'var(--accent-umber)',
                              color: 'var(--accent-umber)'
                            }}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend Access' : 'Restore Access'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
  );
}
