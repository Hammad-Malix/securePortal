import { X } from 'lucide-react';

export default function CreateRecordModal({
  isOpen,
  onClose,
  newTitle,
  setNewTitle,
  newClassification,
  setNewClassification,
  newDetails,
  setNewDetails,
  handleCreateRecord
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <div className="form-eyebrow" style={{ fontSize: '9px' }}>
              NEW ENTRY / INTEGRITY SEALED
            </div>
            <h3 className="section-title" style={{ marginTop: '4px' }}>
              Submit Classified Dossier
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#767268' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateRecord} className="auth-form">
          <div className="input-group">
            <label className="input-label">Dossier Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Semester Grade Audit Sheet"
              className="text-input"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Security Classification Label</label>
            <select
              value={newClassification}
              onChange={(e) => setNewClassification(e.target.value)}
              className="text-input"
            >
              <option value="CONFIDENTIAL">CONFIDENTIAL</option>
              <option value="SECRET">SECRET</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Summary & Audit Notes</label>
            <input
              type="text"
              value={newDetails}
              onChange={(e) => setNewDetails(e.target.value)}
              placeholder="Enter context for Manager review..."
              className="text-input"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ height: '38px' }}>
              Cancel
            </button>
            <button type="submit" className="btn-action-umber">
              Seal & Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
