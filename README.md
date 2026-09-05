# CarWise – עוזר AI אישי לבעלי רכבים

## קישורים
- **אפליקציה באוויר:** https://car-wise-inky.vercel.app
- **GitHub Repository:** https://github.com/shiramalamud/CarWise

## הרצה מקומית

### דרישות מקדימות
- Node.js (גרסה 18 ומעלה)
- npm
- חשבון Supabase עם פרויקט מוגדר (טבלאות + מדיניות RLS לפי `db/schema.sql`)
- מפתח API של Google Gemini

### שלבי התקנה

```bash
# שיבוט הריפו
git clone https://github.com/shiramalamud/CarWise.git
cd CarWise

# התקנת תלויות
npm install

# הגדרת משתני סביבה (ראו פירוט למטה)
# יש ליצור קובץ .env.local בתיקיית השורש של הפרויקט

# הרצת שרת הפיתוח
npm run dev
```

האפליקציה תעלה בכתובת `http://localhost:3000`.

### הרצת בדיקות

```bash
# בדיקות יחידה (Vitest)
npm run test

# בדיקות מקצה לקצה (Playwright) — דורש ששרת הפיתוח רץ במקביל
npm run test:e2e
```

## משתני סביבה נדרשים

יש ליצור קובץ `.env.local` בתיקיית השורש, הכולל את שלושת המשתנים הבאים:

| משתנה | תיאור | היכן משיגים |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | כתובת פרויקט ה-Supabase | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | מפתח ה-Anon הציבורי של Supabase | Supabase Dashboard → Project Settings → API |
| `GEMINI_API_KEY` | מפתח API לשירות Google Gemini | https://aistudio.google.com/apikey |

**הערה חשובה:** שני המשתנים הראשונים (`NEXT_PUBLIC_...`) נחשפים בכוונה לצד הלקוח — הגנת המידע אינה מסתמכת על הסתרתם, אלא על מדיניות Row Level Security שמוגדרת במסד הנתונים עצמו. לעומת זאת, `GEMINI_API_KEY` הוא סוד רגיש ומשמש אך ורק בצד השרת (בתוך נתיבי ה-API), ואינו נחשף בשום שלב לדפדפן.

בסביבת הפרודקשן (Vercel), אותם שלושה משתנים מוגדרים דרך ממשק הניהול של הפרויקט (Project Settings → Environment Variables), ולא כקובץ בפרויקט.

## מבנה הפרויקט

ראו את מסמך "תכנון טכני מפורט" לפירוט מלא של מבנה התיקיות, הקומפוננטות ומבנה מסד הנתונים.