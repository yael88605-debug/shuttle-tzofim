import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatDateHebrew } from '../utils/helpers';

export default function SuccessPage() {
  const { state } = useLocation();
  const navigate  = useNavigate();

  // If someone navigates directly to /success without state → redirect home
  useEffect(() => {
    if (!state) navigate('/', { replace: true });
  }, [state, navigate]);

  if (!state) return null;

  const { status, ride_date, ride_time, full_name } = state;
  const isWaitlist = status === 'waitlist';

  const headerStyle = {
    background: isWaitlist
      ? 'linear-gradient(135deg, #78350f, #92400e)'
      : 'linear-gradient(135deg, #14532d, #15803d)',
  };

  return (
    <div className="page-container">
      <div className="card">

        <div className="card-header" style={headerStyle}>
          <span className="icon">{isWaitlist ? '⏳' : '✅'}</span>
          <h1>{isWaitlist ? 'נרשמת לרשימת המתנה' : 'ההרשמה אושרה!'}</h1>
          <p className="subtitle">
            {isWaitlist
              ? 'אם יתפנה מקום — נשלח לך מייל מיידית'
              : 'נשלח לך מייל עם לינק לביטול אם תצטרך'}
          </p>
        </div>

        <div className="card-body">
          <div className="ride-summary">
            <div className="summary-row">
              <span className="s-label">שם</span>
              <span className="s-value">{full_name}</span>
            </div>
            <div className="summary-row">
              <span className="s-label">תאריך</span>
              <span className="s-value">{formatDateHebrew(ride_date)}</span>
            </div>
            <div className="summary-row">
              <span className="s-label">שעת יציאה</span>
              <span className="s-value">{ride_time}</span>
            </div>
            <div className="summary-row">
              <span className="s-label">סטטוס</span>
              <span className={`badge ${isWaitlist ? 'badge-warning' : 'badge-success'}`}>
                {isWaitlist ? 'המתנה' : 'מאושר ✓'}
              </span>
            </div>
          </div>

          <button
            className="btn btn-outline btn-block"
            onClick={() => navigate('/')}
          >
            ← הרשמה לנסיעה נוספת
          </button>
        </div>

      </div>
    </div>
  );
}
