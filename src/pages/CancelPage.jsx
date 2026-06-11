import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRegistrationByToken, cancelAndPromote } from '../services/firebase';
import { sendCancellationEmail, sendPromotionEmail } from '../services/emailService';
import { formatDateHebrew } from '../utils/helpers';

export default function CancelPage() {
  const { token } = useParams();
  const navigate  = useNavigate();

  const [reg,        setReg]        = useState(null);
  const [loading,    setLoading]    = useState(true);   // initial data fetch
  const [cancelling, setCancelling] = useState(false);  // confirm button spinner
  const [done,       setDone]       = useState(false);  // success state
  const [error,      setError]      = useState('');

  // ── Fetch registration on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!token) { setError('לינק לא תקין.'); setLoading(false); return; }

    getRegistrationByToken(token)
      .then(r => {
        if (!r) setError('לינק הביטול אינו תקין.');
        else    setReg(r);
      })
      .catch(() => setError('שגיאה בטעינת הנתונים. אנא נסה/י שוב.'))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Confirm cancellation ────────────────────────────────────────────────
  const handleConfirm = async () => {
    setCancelling(true);
    try {
      const wasActive = reg.status === 'active';
      const promoted  = await cancelAndPromote(reg.id, reg.ride_date, reg.ride_time, wasActive);

      // Email to the person who just cancelled
      await sendCancellationEmail({
        to_name:   reg.full_name,
        to_email:  reg.email,
        ride_date: formatDateHebrew(reg.ride_date),
        ride_time: reg.ride_time,
      });

      // Email to the first person promoted from waitlist (if any)
      if (promoted) {
        const cancelLink = `${import.meta.env.VITE_APP_URL}/cancel/${promoted.cancel_token}`;
        await sendPromotionEmail({
          to_name:   promoted.full_name,
          to_email:  promoted.email,
          ride_date: formatDateHebrew(promoted.ride_date),
          ride_time: promoted.ride_time,
          cancelLink,
        });
      }

      setDone(true);
    } catch (err) {
      console.error('Cancel error:', err);
      setError('שגיאה בביטול ההרשמה. אנא נסה/י שוב.');
    } finally {
      setCancelling(false);
    }
  };

  // ── Render: loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="card-body text-center" style={{ padding: '48px 24px' }}>
            <span className="page-icon">⏳</span>
            <p style={{ color: 'var(--text-muted)' }}>טוען...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: error ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="card-body text-center" style={{ padding: '48px 24px' }}>
            <span className="page-icon">❌</span>
            <h2 style={{ marginBottom: 8 }}>שגיאה</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{error}</p>
            <button className="btn btn-outline" onClick={() => navigate('/')}>
              ← דף הרשמה
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: already cancelled ───────────────────────────────────────────
  if (reg.status === 'cancelled') {
    return (
      <div className="page-container">
        <div className="card">
          <div className="card-body text-center" style={{ padding: '48px 24px' }}>
            <span className="page-icon">ℹ️</span>
            <h2 style={{ marginBottom: 8 }}>ההרשמה כבר בוטלה</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              הרשמה זו בוטלה בעבר.
            </p>
            <button className="btn btn-outline" onClick={() => navigate('/')}>
              ← הירשם מחדש
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: cancellation done ───────────────────────────────────────────
  if (done) {
    return (
      <div className="page-container">
        <div className="card">
          <div
            className="card-header"
            style={{ background: 'linear-gradient(135deg, #14532d, #15803d)' }}
          >
            <span className="icon">✅</span>
            <h1>הביטול אושר</h1>
            <p className="subtitle">נשלח לך אישור במייל</p>
          </div>
          <div className="card-body">
            <button
              className="btn btn-outline btn-block"
              onClick={() => navigate('/')}
            >
              ← הירשם מחדש
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: confirm cancellation ────────────────────────────────────────
  const isWaitlist = reg.status === 'waitlist';

  return (
    <div className="page-container">
      <div className="card">

        <div className="card-header">
          <span className="icon">🚌</span>
          <h1>ביטול הרשמה</h1>
        </div>

        <div className="card-body">
          <div className="ride-summary">
            <div className="summary-row">
              <span className="s-label">שם</span>
              <span className="s-value">{reg.full_name}</span>
            </div>
            <div className="summary-row">
              <span className="s-label">תאריך</span>
              <span className="s-value">{formatDateHebrew(reg.ride_date)}</span>
            </div>
            <div className="summary-row">
              <span className="s-label">שעת יציאה</span>
              <span className="s-value">{reg.ride_time}</span>
            </div>
            <div className="summary-row">
              <span className="s-label">פלוגה</span>
              <span className="s-value">{reg.platoon}</span>
            </div>
            <div className="summary-row">
              <span className="s-label">סטטוס</span>
              <span className={`badge ${isWaitlist ? 'badge-warning' : 'badge-success'}`}>
                {isWaitlist ? 'המתנה' : 'מאושר'}
              </span>
            </div>
          </div>

          <div className="alert alert-warning">
            {isWaitlist
              ? '⚠️ בביטול זה תוסר מרשימת ההמתנה.'
              : '⚠️ המקום שלך יועבר לאדם הבא ברשימת ההמתנה.'}
          </div>

          <button
            className="btn btn-danger btn-block"
            onClick={handleConfirm}
            disabled={cancelling}
          >
            {cancelling ? '⏳ מבטל...' : 'אשר ביטול'}
          </button>

          <button
            className="btn btn-outline btn-block mt-8"
            onClick={() => navigate('/')}
          >
            שמור את ההרשמה שלי
          </button>
        </div>

      </div>
    </div>
  );
}
