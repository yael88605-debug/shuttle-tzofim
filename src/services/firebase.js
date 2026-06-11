import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { RIDE_CAPACITY } from '../config/constants';

// ─── Init ─────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ─── Registrations ────────────────────────────────────────────────────────────

/**
 * Count how many active registrations exist for a specific ride.
 */
export const countActiveRegistrations = async (rideDate, rideTime) => {
  const q = query(
    collection(db, 'registrations'),
    where('ride_date', '==', rideDate),
    where('ride_time', '==', rideTime),
    where('status', '==', 'active'),
  );
  const snap = await getDocs(q);
  return snap.size;
};

/**
 * Create a new registration.
 * Automatically sets status to 'active' or 'waitlist' based on current capacity.
 * Returns { id, status }.
 */
export const createRegistration = async (data) => {
  const activeCount = await countActiveRegistrations(data.ride_date, data.ride_time);
  const status = activeCount < RIDE_CAPACITY ? 'active' : 'waitlist';

  const ref = await addDoc(collection(db, 'registrations'), {
    ...data,
    status,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return { id: ref.id, status };
};

/**
 * Look up a registration by its unique cancel_token.
 * Returns the registration object (with id) or null if not found.
 */
export const getRegistrationByToken = async (token) => {
  const q = query(
    collection(db, 'registrations'),
    where('cancel_token', '==', token),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

/**
 * Cancel a registration by id.
 * If the cancelled person was 'active', promote the first person on the waitlist.
 * Returns the promoted person object (or null if nobody was on the waitlist).
 */
export const cancelAndPromote = async (regId, rideDate, rideTime, wasActive) => {
  // Step 1: cancel
  await updateDoc(doc(db, 'registrations', regId), {
    status: 'cancelled',
    updated_at: serverTimestamp(),
  });

  // Step 2: promote only if the cancelled slot was active
  if (!wasActive) return null;

  const q = query(
    collection(db, 'registrations'),
    where('ride_date', '==', rideDate),
    where('ride_time', '==', rideTime),
    where('status', '==', 'waitlist'),
    orderBy('created_at', 'asc'),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const promotedDoc = snap.docs[0];
  const promotedData = { id: promotedDoc.id, ...promotedDoc.data() };

  await updateDoc(doc(db, 'registrations', promotedDoc.id), {
    status: 'active',
    updated_at: serverTimestamp(),
  });

  return promotedData;
};

/**
 * Admin: get all registrations ordered by date → time → creation order.
 */
export const getAllRegistrations = async () => {
  const snap = await getDocs(
    query(
      collection(db, 'registrations'),
      orderBy('ride_date', 'asc'),
      orderBy('ride_time', 'asc'),
      orderBy('created_at', 'asc'),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Admin: cancel a registration (same logic as user cancel).
 */
export const adminCancelRegistration = async (reg) => {
  return cancelAndPromote(reg.id, reg.ride_date, reg.ride_time, reg.status === 'active');
};

// ─── Blocked Rides ────────────────────────────────────────────────────────────

/**
 * Returns true if the specified ride is blocked.
 */
export const isRideBlocked = async (rideDate, rideTime) => {
  const q = query(
    collection(db, 'blocked_rides'),
    where('ride_date', '==', rideDate),
    where('ride_time', '==', rideTime),
  );
  const snap = await getDocs(q);
  return !snap.empty;
};

/**
 * Get all blocked rides ordered by date.
 */
export const getAllBlockedRides = async () => {
  const snap = await getDocs(
    query(collection(db, 'blocked_rides'), orderBy('ride_date', 'asc')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Block a ride. Silently skips if already blocked (no duplicates).
 */
export const blockRide = async (rideDate, rideTime) => {
  const already = await isRideBlocked(rideDate, rideTime);
  if (already) return;
  await addDoc(collection(db, 'blocked_rides'), {
    ride_date: rideDate,
    ride_time: rideTime,
    created_at: serverTimestamp(),
  });
};

/**
 * Unblock a ride (removes all matching documents).
 */
export const unblockRide = async (rideDate, rideTime) => {
  const q = query(
    collection(db, 'blocked_rides'),
    where('ride_date', '==', rideDate),
    where('ride_time', '==', rideTime),
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(doc(db, 'blocked_rides', d.id));
  }
};
