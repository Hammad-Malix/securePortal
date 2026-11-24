import { ShieldAlert, ShieldCheck, X } from 'lucide-react';

export default function ToastNotice({ notice, onClose }) {
  if (!notice) return null;

  return (
    <div className="toast-notice">
      {notice.tone === 'danger' ? (
        <ShieldAlert size={20} color="#9E5438" style={{ flexShrink: 0, marginTop: '2px' }} />
      ) : (
        <ShieldCheck size={20} color="#C98A7B" style={{ flexShrink: 0, marginTop: '2px' }} />
      )}
      <div style={{ flex: 1, fontSize: '12px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '16px' }}>
          {notice.heading}
        </div>
        <p style={{ color: '#DEDAD0', marginTop: '4px', lineHeight: 1.5 }}>
          {notice.body}
        </p>
      </div>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#DEDAD0', cursor: 'pointer' }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
