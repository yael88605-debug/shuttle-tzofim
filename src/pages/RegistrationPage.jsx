import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRegistration, isRideBlocked, countActiveRegistrations } from '../services/firebase';
import { sendRegistrationEmail } from '../services/emailService';
import {
  generateToken,
  getAvailableTimesForDate,
  isDateValid,
  formatDateHebrew,
  getTodayString,
} from '../utils/helpers';
import { RIDE_CAPACITY } from '../config/constants';

const EMPTY_FORM = {
  full_name: '',
  phone: '',
  platoon: '',
  email: '',
  ride_date: '',
  ride_time: '',
};

export default function RegistrationPage() {
  const navigate = useNavigate();

  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading]       = useState(false);

  const [availableTimes, setAvailableTimes]   = useState([]);
  const [spotsLeft, setSpotsLeft]             = useState(null);
  const [checkingSpots, setCheckingSpots]     = useState(false);

  // ── When date changes: update time options ──────────────────────────────
  useEffect(() => {
    if (!form.ride_date) {
      setAvailableTimes([]);
      return;
    }

    const times = getAvailableTimesForDate(form.ride_date);
    setAvailableTimes(times);
    setSpotsLeft(null);

    setForm(prev => ({
      ...prev,
      // Keep current time if still valid; auto-select if only one option
      ride_time: times.includes(prev.ride_time)
        ? prev.ride_time
        : times.length === 1
          ? times[0]
          : '',
    }));
  }, [form.ride_date]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── When date + time both selected: fetch available spots ───────────────
  useEffect(() => {
    if (!form.ride_date || !form.ride_time) {
      setSpotsLeft(null);
      return;
    }

    let stale = false;
    setCheckingSpots(true);

    countActiveRegistrations(form.ride_date, form.ride_time)
      .then(count => { if (!stale) setSpotsLeft(Math.max(0, RIDE_CAPACITY - count)); })
      .catch(() => { if (!stale) setSpotsLeft(null); })
      .finally(() => { if (!stale) setCheckingSpots(false); });

    return () => { stale = true; };
  }, [form.ride_date, form.ride_time]);

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};

    if (!form.full_name.trim())
      e.full_name = 'שדה חובה';
    else if (form.full_name.trim().length < 2)
      e.full_name = 'שם חייב להכיל לפחות 2 תווים';

    if (!form.phone.trim()) {
      e.phone = 'שדה חובה';
    } else {
      const clean = form.phone.replace(/[-\s]/g, '');
      if (!/^05\d{8}$/.test(clean))
        e.phone = 'מספר לא תקין (דוגמה: 0501234567)';
    }

    if (!form.platoon.trim())
      e.platoon = 'שדה חובה';

    if (!form.email.trim()) {
      e.email = 'שדה חובה';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'כתובת אימייל לא תקינה';
    }

    if (!form.ride_date) {
      e.ride_date = 'שדה חובה';
    } else if (!isDateValid(form.ride_date)) {
      const d = new Date(form.ride_date + 'T12:00:00');
      e.ride_date = d.getDay() === 6
        ? 'אין נסיעות בשבת'
        : 'לא ניתן להירשם לתאריך שעבר';
    }

    if (!form.ride_time)
      e.ride_time = 'שדה חובה';

    return e;
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear inline error when user starts correcting
    if (errors[name])    setErrors(prev => ({ ...prev, [name]: '' }));
    if (submitError)     setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      // Check if ride is blocked before creating the registration
      const blocked = await isRideBlocked(form.ride_date, form.ride_time);
      if (blocked) {
        setSubmitError('נסיעה זו חסומה. אנא בחר/י תאריך או שעה אחרים.');
        return;
      }

      const cancelToken = generateToken();
      const data = {
        full_name:    form.full_name.trim(),
        phone:        form.phone.replace(/[-\s]/g, ''),
        platoon:      form.platoon.trim(),
        email:        form.email.trim().toLowerCase(),
        ride_date:    form.ride_date,
        ride_time:    form.ride_time,
        cancel_token: cancelToken,
      };

      const { status } = await createRegistration(data);

      const cancelLink = `${import.meta.env.VITE_APP_URL}/cancel/${cancelToken}`;
      await sendRegistrationEmail({
        ...data,
        status,
        cancelLink,
        formattedDate: formatDateHebrew(form.ride_date),
      });

      navigate('/success', {
        state: {
          status,
          ride_date: form.ride_date,
          ride_time: form.ride_time,
          full_name: data.full_name,
        },
      });

    } catch (err) {
      console.error('Registration error:', err);
      setSubmitError('אירעה שגיאה בעת ההרשמה. אנא נסה/י שוב.');
    } finally {
      setLoading(false);
    }
  };

  // ── Spots indicator text + class ────────────────────────────────────────
  let spotsClass = 'loading';
  let spotsText  = null;

  if (form.ride_date && form.ride_time) {
    if (checkingSpots) {
      spotsClass = 'loading';
      spotsText  = '⏳ בודק זמינות...';
    } else if (spotsLeft !== null) {
      if (spotsLeft === 0) {
        spotsClass = 'full';
        spotsText  = '⚠️ הנסיעה מלאה — תרשם/י לרשימת המתנה';
      } else if (spotsLeft <= 2) {
        spotsClass = 'almost-full';
        spotsText  = `🔴 נותרו ${spotsLeft === 1 ? 'מקום אחד' : `${spotsLeft} מקומות`} בלבד!`;
      } else {
        spotsClass = 'available';
        spotsText  = `✅ ${spotsLeft} מקומות פנויים מתוך ${RIDE_CAPACITY}`;
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div className="card">

        {/* Header */}
        <div className="card-header">
          <span className="icon">🚌</span>
          <h1>שאטל צופים</h1>
          <p className="subtitle">הרשמה לנסיעה לרכבת כפר סבא</p>
          <div className="route-line">
            <span>הבסיס</span>
            <div className="route-dot" />
            <div className="route-dash" />
            <div className="route-dot" />
            <span>כפר סבא</span>
          </div>
        </div>

        {/* Form */}
        <div className="card-body">
          <form onSubmit={handleSubmit} noValidate>

            <div className="form-group">
              <label htmlFor="full_name">שם מלא</label>
              <input
                id="full_name" name="full_name" type="text"
                value={form.full_name} onChange={handleChange}
                placeholder="שם פרטי ושם משפחה"
                className={errors.full_name ? 'error' : ''}
                autoComplete="name"
              />
              {errors.full_name && <span className="error-msg">{errors.full_name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">מספר טלפון</label>
              <input
                id="phone" name="phone" type="tel"
                value={form.phone} onChange={handleChange}
                placeholder="0501234567"
                className={errors.phone ? 'error' : ''}
                autoComplete="tel"
                dir="ltr"
                inputMode="numeric"
              />
              {errors.phone && <span className="error-msg">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="platoon">פלוגה / פלסם</label>
              <input
                id="platoon" name="platoon" type="text"
                value={form.platoon} onChange={handleChange}
                placeholder="לדוגמה: פלוגה א׳"
                className={errors.platoon ? 'error' : ''}
              />
              {errors.platoon && <span className="error-msg">{errors.platoon}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">כתובת אימייל</label>
              <input
                id="email" name="email" type="email"
                value={form.email} onChange={handleChange}
                placeholder="example@gmail.com"
                className={errors.email ? 'error' : ''}
                autoComplete="email"
                dir="ltr"
                inputMode="email"
              />
              {errors.email && <span className="error-msg">{errors.email}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ride_date">תאריך נסיעה</label>
                <input
                  id="ride_date" name="ride_date" type="date"
                  value={form.ride_date} onChange={handleChange}
                  min={getTodayString()}
                  className={errors.ride_date ? 'error' : ''}
                />
                {errors.ride_date && <span className="error-msg">{errors.ride_date}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="ride_time">שעת יציאה</label>
                <select
                  id="ride_time" name="ride_time"
                  value={form.ride_time} onChange={handleChange}
                  className={errors.ride_time ? 'error' : ''}
                  disabled={availableTimes.length === 0}
                >
                  <option value="">בחר שעה</option>
                  {availableTimes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.ride_time && <span className="error-msg">{errors.ride_time}</span>}
              </div>
            </div>

            {/* Spots indicator — shown only when both date and time are selected */}
            {spotsText && (
              <div className={`spots-indicator ${spotsClass}`}>{spotsText}</div>
            )}

            {submitError && (
              <div className="alert alert-error">{submitError}</div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? '⏳ שולח...' : 'הירשם לנסיעה ←'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
