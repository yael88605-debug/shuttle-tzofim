import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllRegistrations,
  getAllBlockedRides,
  adminCancelRegistration,
  blockRide,
  unblockRide,
} from '../services/firebase';
import { sendCancellationEmail, sendPromotionEmail } from '../services/emailService';
import {
  formatDateHebrew,
  formatDateShort,
  getAvailableTimesForDate,
  getTodayString,
} from '../utils/helpers';
import { ADMIN_PASSWORD } from '../config/constants';

// ─── Status display helpers ────────────────────────────────────────────────────
const STATUS_LABEL = { active: 'מאושר', waitlist: 'המתנה', cancelled: 'בוטל' };
const STATUS_CLASS = { active: 'badge-success', waitlist: 'badge-warning', cancelled: 'badge-danger' };

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pw,  setPw]  = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      onLogin();
    } else {
      setErr('סיסמה שגויה');
      setPw('');
    }
  };

  return (
    <div className="page-container">
      <div className="card" style={{ maxWidth: 360 }}>
        <div className="card-header">
          <span className="icon">🔒</span>
          <h1>כניסת מנהל</h1>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="pw">סיסמה</label>
              <input
                id="pw"
                type="password"
                value={pw}
                onChange={e => { setPw(e.target.value); setErr(''); }}
                className={err ? 'error' : ''}
                autoFocus
                dir="ltr"
              />
              {err && <span className="error-msg">{err}</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              כניסה
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();

  const [auth,          setAuth]          = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [blockedRides,  setBlockedRides]  = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [tab,           setTab]           = useState('registrations');

  // Filters
  const [filterDate,   setFilterDate]   = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Block ride form
  const [blockDate,  setBlockDate]  = useState('');
  const [blockTime,  setBlockTime]  = useState('');
  const [blockTimes, setBlockTimes] = useState([]);

  // ── Load all data ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [regs, blocked] = await Promise.all([
        getAllRegistrations(),
        getAllBlockedRides(),
      ]);
      setRegistrations(regs);
      setBlockedRides(blocked);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth) loadData();
  }, [auth, loadData]);

  // ── Update blockTime options when blockDate changes ───────────────────
  useEffect(() => {
    if (!blockDate) {
      setBlockTimes([]);
      setBlockTime('');
      return;
    }
    const times = getAvailableTimesForDate(blockDate);
    setBlockTimes(times);
    setBlockTime(times[0] || '');
  }, [blockDate]);

  // ── Cancel a registration ─────────────────────────────────────────────
  const handleCancel = async (reg) => {
    if (!window.confirm(`לבטל את ההרשמה של ${reg.full_name}?`)) return;

    try {
      const promoted = await adminCancelRegistration(reg);

      await sendCancellationEmail({
        to_name:   reg.full_name,
        to_email:  reg.email,
        ride_date: formatDateHebrew(reg.ride_date),
        ride_time: reg.ride_time,
      });

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

      await loadData();
    } catch (err) {
      console.error('Admin cancel error:', err);
      alert('שגיאה בביטול ההרשמה');
    }
  };

  // ── Block a ride ──────────────────────────────────────────────────────
  const handleBlock = async () => {
    if (!blockDate || !blockTime) {
      alert('יש לבחור תאריך ושעה');
      return;
    }
    try {
      await blockRide(blockDate, blockTime);
      setBlockDate('');
      setBlockTime('');
      await loadData();
    } catch (err) {
      console.error('Block ride error:', err);
      alert('שגיאה בחסימת הנסיעה');
    }
  };

  // ── Unblock a ride ────────────────────────────────────────────────────
  const handleUnblock = async (rideDate, rideTime) => {
    if (!window.confirm(`לפתוח את הנסיעה ב-${formatDateShort(rideDate)} שעה ${rideTime}?`)) return;
    try {
      await unblockRide(rideDate, rideTime);
      await loadData();
    } catch (err) {
      console.error('Unblock ride error:', err);
      alert('שגיאה בביטול החסימה');
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────
  const stats = {
    active:    registrations.filter(r => r.status === 'active').length,
    waitlist:  registrations.filter(r => r.status === 'waitlist').length,
    cancelled: registrations.filter(r => r.status === 'cancelled').length,
    total:     registrations.length,
  };

  // ── Filtered registrations ────────────────────────────────────────────
  const filtered = registrations.filter(r => {
    if (filterDate   && r.ride_date !== filterDate)         return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  // ── Gate: login screen ────────────────────────────────────────────────
  if (!auth) return <LoginScreen onLogin={() => setAuth(true)} />;

  // ── Admin panel ───────────────────────────────────────────────────────
  return (
    <div className="admin-page">

      {/* Sticky header */}
      <div className="admin-header">
        <h1>🚌 ניהול שאטל</h1>
        <button
          className="btn btn-outline btn-sm"
          style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
          onClick={() => navigate('/')}
        >
          אתר ↗
        </button>
      </div>

      <div className="admin-content">

        {/* Stats */}
        <div className="admin-stats">
          <div className="stat-box">
            <div className="stat-num" style={{ color: 'var(--success)' }}>{stats.active}</div>
            <div className="stat-label">מאושרים</div>
          </div>
          <div className="stat-box">
            <div className="stat-num" style={{ color: 'var(--warning)' }}>{stats.waitlist}</div>
            <div className="stat-label">המתנה</div>
          </div>
          <div className="stat-box">
            <div className="stat-num" style={{ color: 'var(--danger)' }}>{stats.cancelled}</div>
            <div className="stat-label">ביטולים</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">סה״כ</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn ${tab === 'registrations' ? 'active' : ''}`}
            onClick={() => setTab('registrations')}
          >
            הרשמות ({stats.active + stats.waitlist})
          </button>
          <button
            className={`tab-btn ${tab === 'blocked' ? 'active' : ''}`}
            onClick={() => setTab('blocked')}
          >
            נסיעות חסומות ({blockedRides.length})
          </button>
        </div>

        {/* ── Tab: Registrations ────────────────────────────────────────── */}
        {tab === 'registrations' && (
          <div className="admin-card">
            <h2>רשימת הרשמות</h2>

            {/* Filters */}
            <div className="filters">
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                title="סינון לפי תאריך"
              />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="all">כל הסטטוסים</option>
                <option value="active">מאושר</option>
                <option value="waitlist">המתנה</option>
                <option value="cancelled">בוטל</option>
              </select>
              {(filterDate || filterStatus !== 'all') && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => { setFilterDate(''); setFilterStatus('all'); }}
                >
                  נקה
                </button>
              )}
              <button
                className="btn btn-outline btn-sm"
                onClick={loadData}
                disabled={loading}
                title="רענן"
              >
                {loading ? '⏳' : '🔄'}
              </button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="empty-state">⏳ טוען...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">אין הרשמות תואמות לסינון הנוכחי</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>שם</th>
                      <th>פלוגה</th>
                      <th>תאריך</th>
                      <th>שעה</th>
                      <th>סטטוס</th>
                      <th>פעולה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div>{r.full_name}</div>
                          <div className="cell-sub">{r.phone}</div>
                        </td>
                        <td>{r.platoon}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateShort(r.ride_date)}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.ride_time}</td>
                        <td>
                          <span className={`badge ${STATUS_CLASS[r.status] || 'badge-default'}`}>
                            {STATUS_LABEL[r.status] || r.status}
                          </span>
                        </td>
                        <td>
                          {r.status !== 'cancelled' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancel(r)}
                            >
                              בטל
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Blocked Rides ────────────────────────────────────────── */}
        {tab === 'blocked' && (
          <>
            {/* Block ride form */}
            <div className="admin-card">
              <h2>חסום נסיעה</h2>
              <div className="block-form">
                <div className="form-group">
                  <label>תאריך</label>
                  <input
                    type="date"
                    value={blockDate}
                    onChange={e => setBlockDate(e.target.value)}
                    min={getTodayString()}
                  />
                </div>
                <div className="form-group">
                  <label>שעה</label>
                  <select
                    value={blockTime}
                    onChange={e => setBlockTime(e.target.value)}
                    disabled={blockTimes.length === 0}
                  >
                    <option value="">בחר שעה</option>
                    {blockTimes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn btn-danger"
                  onClick={handleBlock}
                  disabled={!blockDate || !blockTime}
                  style={{ alignSelf: 'flex-end' }}
                >
                  חסום נסיעה
                </button>
              </div>
            </div>

            {/* Blocked rides list */}
            <div className="admin-card">
              <h2>נסיעות חסומות כרגע</h2>
              {blockedRides.length === 0 ? (
                <div className="empty-state">אין נסיעות חסומות</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>תאריך</th>
                        <th>שעה</th>
                        <th>פעולה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockedRides.map(b => (
                        <tr key={b.id}>
                          <td>{formatDateShort(b.ride_date)}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.ride_time}</td>
                          <td>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleUnblock(b.ride_date, b.ride_time)}
                            >
                              בטל חסימה
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
