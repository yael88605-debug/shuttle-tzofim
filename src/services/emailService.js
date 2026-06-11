import emailjs from '@emailjs/browser';

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/**
 * Internal send wrapper.
 * Email failures are NON-FATAL — they are logged but never block the main flow.
 *
 * Template variables sent to EmailJS:
 *   to_name      — שם הנמען
 *   to_email     — כתובת האימייל (EmailJS uses this for the To: field)
 *   ride_date    — תאריך מפורמט (כבר מעוצב בעברית)
 *   ride_time    — שעת יציאה
 *   platoon      — פלוגה / פלסם (ריק בביטול / קידום)
 *   status_label — טקסט הסטטוס בעברית
 *   cancel_link  — לינק לביטול (ריק כשלא רלוונטי)
 *   message_type — סוג ההודעה: confirmed | waitlist | cancelled | promoted
 */
const send = async (params) => {
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, params, PUBLIC_KEY);
  } catch (err) {
    console.error('[EmailJS] Failed to send email:', err);
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sent after a new registration — either confirmed (active) or waitlist.
 */
export const sendRegistrationEmail = async ({
  full_name, email, platoon, formattedDate, ride_time, status, cancelLink,
}) => {
  const isWaitlist = status === 'waitlist';
  await send({
    to_name:      full_name,
    to_email:     email,
    platoon,
    ride_date:    formattedDate,
    ride_time,
    status_label: isWaitlist ? 'רשימת המתנה' : 'מאושר ✓',
    cancel_link:  isWaitlist ? '' : cancelLink,
    message_type: isWaitlist ? 'waitlist' : 'confirmed',
  });
};

/**
 * Sent when a user (or admin) cancels a registration.
 */
export const sendCancellationEmail = async ({ to_name, to_email, ride_date, ride_time }) => {
  await send({
    to_name,
    to_email,
    platoon:      '',
    ride_date,
    ride_time,
    status_label: 'בוטל',
    cancel_link:  '',
    message_type: 'cancelled',
  });
};

/**
 * Sent when a waitlist person is promoted to active after a cancellation.
 */
export const sendPromotionEmail = async ({ to_name, to_email, ride_date, ride_time, cancelLink }) => {
  await send({
    to_name,
    to_email,
    platoon:      '',
    ride_date,
    ride_time,
    status_label: 'מאושר ✓',
    cancel_link:  cancelLink,
    message_type: 'promoted',
  });
};
