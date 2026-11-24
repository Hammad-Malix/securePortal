import { RefreshCw, Search } from 'lucide-react';
export default function AuditLedgerView(props) {
  const { tamperedLogId, auditLogs, isVerifyingChain, chainReport, setTamperedLogId, setChainReport, handleVerifyHashChain, logSearch, setLogSearch, logFilter, setLogFilter, filteredLogs } = props;

  return (
<>
                <div className="ledger-verify-box">
                  <div className="ledger-verify-top">
                    <div style={{ maxWidth: '560px' }}>
                      <div className="eyebrow-label">NON-REPUDIATION & TAMPER DETECTION</div>
                      <h2 className="section-title" style={{ marginTop: '4px' }}>
                        SHA-256 Hash-Chained Audit Ledger
                      </h2>
                      <p className="section-subtitle" style={{ marginTop: '6px', lineHeight: 1.5 }}>
                        Each entry computes{' '}
                        <code className="inline-code">SHA256(prev_hash + payload)</code>. Any
                        unauthorized alteration in MySQL breaks downstream hashes.
                      </p>
                    </div>

                    <div className="ledger-verify-actions">
                      <button
                        onClick={() => {
                          if (tamperedLogId) {
                            setTamperedLogId(null);
                            setChainReport(null);
                          } else {
                            setTamperedLogId(auditLogs[1]?.id || auditLogs[0]?.id);
                            setChainReport(null);
                          }
                        }}
                        className="btn-secondary"
                        style={{ height: '38px' }}
                      >
                        {tamperedLogId ? 'Restore Altered Row' : 'Simulate MySQL Tampering'}
                      </button>

                      <button
                        onClick={handleVerifyHashChain}
                        disabled={isVerifyingChain}
                        className="btn-action-umber"
                      >
                        <RefreshCw size={14} />
                        <span>
                          {isVerifyingChain ? 'Verifying Chain...' : 'Verify Chain Integrity'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {chainReport && (
                    <div
                      className={`chain-report-banner ${chainReport.valid ? 'valid' : 'invalid'}`}
                    >
                      {chainReport.text}
                    </div>
                  )}
                </div>

                <div className="filter-toolbar">
                  <div className="search-input-box">
                    <Search size={15} className="search-icon" />
                    <input
                      type="text"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="Filter by actor, event action, resource, or IP..."
                      className="search-input"
                    />
                  </div>

                  <div className="filter-pills">
                    {['ALL', 'SUCCESS', '403_FORBIDDEN'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setLogFilter(st)}
                        className={`filter-btn ${logFilter === st ? 'active' : ''}`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="table-card">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>ID & Timestamp</th>
                        <th>Actor</th>
                        <th>Security Event</th>
                        <th>IP Address</th>
                        <th>Outcome</th>
                        <th>SHA-256 Digest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => {
                        const isTampered = log.id === tamperedLogId;
                        return (
                          <tr key={log.id} className={isTampered ? 'tampered-row' : ''}>
                            <td className="mono-text" style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 500 }}>{log.id}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {log.timestamp}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{log.userName}</div>
                              <div
                                className="mono-text"
                                style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                              >
                                {log.role}
                              </div>
                            </td>
                            <td style={{ maxWidth: '300px' }}>
                              <div
                                className="mono-text"
                                style={{ fontWeight: 500, color: 'var(--accent-slate)' }}
                              >
                                {log.action}
                              </div>
                              <div>{log.resource}</div>
                              <div
                                style={{ fontSize: '11px', color: '#6B675E', marginTop: '2px' }}
                              >
                                {isTampered
                                  ? '⚠️ [UNAUTHORIZED DB EDIT SIMULATED]'
                                  : log.details}
                              </div>
                            </td>
                            <td
                              className="mono-text"
                              style={{ color: '#6B675E', whiteSpace: 'nowrap' }}
                            >
                              {log.ip}
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <span
                                className={`outcome-badge ${
                                  log.status === 'SUCCESS' ? 'success' : 'blocked'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="mono-text" style={{ color: 'var(--text-muted)' }}>
                              {log.hash.substring(0, 16)}...
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
  );
}
