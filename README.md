# 🚌 שאטל צופים — כפר סבא

אפליקציית הרשמה לשאטל מהבסיס לרכבת כפר סבא.
בנויה עם React + Vite + Firebase Firestore + EmailJS.

---

## הגדרה ראשונית

### 1. שכפול והתקנה

```bash
git clone <כתובת-הריפו-שלך>
cd shuttle-tzofim
npm install
```

### 2. משתני סביבה

העתק את קובץ הדוגמה וערוך אותו:

```bash
cp .env.example .env
```

פתח את `.env` ומלא את הערכים (ראה פירוט בסעיף Firebase ו-EmailJS למטה).

### 3. הרצה מקומית

```bash
npm run dev
```

---

## הגדרת Firebase

### יצירת פרויקט

1. כנסי ל-[Firebase Console](https://console.firebase.google.com)
2. צרי פרויקט חדש (או השתמשי בפרויקט `shuttle-tzofim` הקיים)
3. עברי ל-**Build → Firestore Database** → צרי מסד נתונים במצב Production
4. עברי ל-**Project Settings → Your apps** → הוסיפי **Web App**
5. העתיקי את ה-`firebaseConfig` ומלאי את `.env`

### Firestore Rules

העתיקי את תוכן `firestore.rules` לתוך **Firestore → Rules** בקונסול.

### Firestore Indexes

אינדקסים נדרשים מוגדרים ב-`firestore.indexes.json`.
ניתן ליצור אותם ידנית דרך הקונסול, או דרך Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # בחרי את הפרויקט shuttle-tzofim
firebase deploy --only firestore:indexes
```

> **חשוב:** ב-Firebase, כאשר שאילתה מחייבת אינדקס שאינו קיים, הקונסולת הדפדפן תציג הודעת שגיאה עם **קישור ישיר ליצירת האינדקס**. פשוט לחצי על הלינק — זה יוצר את האינדקס אוטומטית.

---

## הגדרת EmailJS

הנתונים הבאים כבר מוגדרים ב-`.env.example`:

```
VITE_EMAILJS_SERVICE_ID=service_kkijf1g
VITE_EMAILJS_TEMPLATE_ID=template_ul174ke
VITE_EMAILJS_PUBLIC_KEY=IRndEM2m0StIAWcpQ
```

### משתני התבנית (Template Variables)

הקוד שולח את המשתנים הבאים ל-EmailJS בכל שליחה.
וודאי שהתבנית שלך ב-EmailJS מכילה את הפלייסהולדרים המתאימים:

| משתנה | תיאור | דוגמה |
|-------|--------|--------|
| `{{to_name}}` | שם הנמען | "יעל כהן" |
| `{{to_email}}` | כתובת המייל | "yael@gmail.com" |
| `{{ride_date}}` | תאריך מפורמט | "יום שישי, 12 ביוני 2026" |
| `{{ride_time}}` | שעת יציאה | "08:30" |
| `{{platoon}}` | פלוגה / פלסם | "פלוגה א׳" |
| `{{status_label}}` | סטטוס בעברית | "מאושר ✓" / "רשימת המתנה" / "בוטל" |
| `{{cancel_link}}` | לינק לביטול | "https://your-site.com/cancel/abc123" |
| `{{message_type}}` | סוג ההודעה | `confirmed` / `waitlist` / `cancelled` / `promoted` |

> ניתן להשתמש ב-`{{message_type}}` בתוך התבנית כדי לשנות את תוכן המייל בהתאם לסוג האירוע.

---

## פריסה ל-Vercel

### שלב א׳ — GitHub

1. צרי ריפו חדש ב-GitHub
2. העלי את כל הקוד:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

### שלב ב׳ — Vercel

1. כנסי ל-[vercel.com](https://vercel.com) → **Add New Project**
2. חברי את הריפו מ-GitHub
3. Vercel יזהה אוטומטית שזה Vite ויגדיר הכל
4. בסעיף **Environment Variables** — הוסיפי את כל המשתנים מ-`.env`
5. לחצי **Deploy**

### שלב ג׳ — דומיין מותאם

1. קני דומיין ב-[Namecheap](https://namecheap.com) / GoDaddy / כל ספק אחר
2. ב-Vercel → **Project Settings → Domains → Add Domain**
3. Vercel יתן לך רשומות DNS להוסיף אצל ספק הדומיין
4. המתיני עד שה-DNS יתפשט (~15 דקות עד שעה)

---

## מבנה האפליקציה

| נתיב | עמוד |
|------|------|
| `/` | טופס הרשמה |
| `/success` | אישור הרשמה |
| `/cancel/:token` | ביטול הרשמה דרך לינק מהמייל |
| `/admin` | פאנל ניהול (סיסמה נדרשת) |

---

## לוגיקה עסקית

- **קיבולת:** 7 מקומות לכל נסיעה
- **מעבר להמתנה:** הרשמה מעל 7 → סטטוס `waitlist`
- **ביטול:** ביטול של `active` → מקדם את הראשון ברשימת ההמתנה
- **שעות ראשון–חמישי:** 06:15
- **שעות שישי:** 08:30, 09:30
- **שבת:** אין נסיעות

---

## הערות

- הסיסמה לאדמין מוגדרת ב-`VITE_ADMIN_PASSWORD` ב-`.env`
- כישלון שליחת מייל **לא** מבטל את ההרשמה — הוא מתועד בקונסול בלבד
- ה-`vercel.json` מוודא שניווט ישיר ל-`/cancel/TOKEN` עובד נכון
