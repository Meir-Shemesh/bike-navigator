# CLAUDE.md – ניווט אופניים

אפליקציית ניווט לאופניים (עיר + שטח) בקובץ יחיד: `bike-navigator.html`. הקובץ עצמו נשאר ללא build ונפתח ישירות בדפדפן.

## חריגים מודעים לכללי תיקיית-האב (לבקשת המשתמש)
- **דו-לשוני עברית/אנגלית** (לא עברית בלבד). כל מחרוזת גלויה עוברת דרך `t('key')` ומוגדרת במילון `I18N` בשתי השפות – אסור להוסיף טקסט גלוי ישירות ב-HTML/JS. ב-HTML סטטי: `data-i18n` / `data-i18n-ph` / `data-i18n-title`. הנחיות פנייה נשמרות כ-`key` ומתורגמות בזמן הצגה (`hintText`). החלפת שפה = `applyLang()` (מעדכן `lang`/`dir` ומרנדר מחדש). CSS משתמש רק במאפיינים לוגיים (inline-start/end).
- **Leaflet 1.9.4 מ-cdnjs** (תג `<script>`/`<link>` בלבד).
- **מעטפת אנדרואיד עם build** בתיקייה `android-app/` (Capacitor 8, `package.json`). היא רק אורזת את `bike-navigator.html` – אין בה קוד אפליקציה. ראו "אנדרואיד" למטה.

## שירותים חיצוניים (כולם חופשיים, ללא מפתח API, עם CORS)
| צורך | שירות | הערות |
|---|---|---|
| חישוב מסלול | `brouter.de/brouter` (`format=geojson&timode=2`) | פרופילים: trekking, safety, fastbike, gravel, mtb, shortest. מחזיר `messages` (תגיות דרך לכל מקטע) ו-`voicehints` `[אינדקס, פקודה, יציאה-בכיכר, מרחק, זווית]` |
| גיבוי למסלול | `routing.openstreetmap.de/routed-bike` (OSRM) | בלי פירוט סוג דרך/משטח (`route.fallback`) |
| רשימת מסלולים מסומנים | `{cycling,mtb}.waymarkedtrails.org/api/v1/list/{by_area,search}` + `details/relation/ID` | bbox ב-EPSG:3857. נקודות הקצה של geometry/elevation מחזירות 404 – לא להשתמש |
| גאומטריה + תגיות של מסלול | `api.openstreetmap.org/api/0.6/relation/ID/full.json` | מכאן surface / mtb:scale / smoothness לכל way |
| חיפוש כתובות | Photon (`photon.komoot.io`), גיבוי Nominatim ב-Enter | Photon גם ל-reverse |
| אריחים | CyclOSM (ברירת מחדל), OSM, OpenTopoMap; שכבות Waymarked Trails | |

Overpass **לא** בשימוש (שרתים ציבוריים לא יציבים/חוסמים). אין API חופשי לגילוי מסלולים ב-Komoot/Strava/Wikiloc – הפתרון הוא ייבוא GPX.

## מבנה הקוד
- בלוק `CORE` (בין ההערות `CORE` / `/CORE`): פונקציות טהורות ללא DOM, מיוצאות ב-`module.exports` כשרצים ב-Node – כך בודקים לוגיקה בלי דפדפן (מחלצים את ה-`<script>` לקובץ ועושים `require`).
- בלוק `APP`: IIFE עם מצב יחיד `S` (from/to/vias, routes, active, view, nav, sim).
- **מבנה מסלול אחיד** לכל המקורות (BRouter / OSRM / מסלול קהילתי / GPX): `{coords:[[lat,lng,ele]], cum, dist, time, ascent, segs:[{a,b,cat,surf}], hints:[{i,arrow,text}], catM, surfM, isTrack, trackStart, dest, vias}`. תמיד לסיים ב-`finalizeRoute`.
- צבעי מקטעים על המפה: `className` על ה-polyline + כלל CSS `path.seg-<cat>{stroke:var(--c-<cat>)}` – לא לקבע צבע ב-JS.
- `score()` מדרג חלופות: זמן × (קנס לכביש סואן/מאסף, בונוס לשבילי אופניים). זה מימוש הדרישה "עדיפות לשבילים ולרחובות שקטים אלא אם העיקוף משמעותי".

## הגדרות רכיבה ותצוגת רוכב
- `S.bike` (mech / pedelec / electric) ו-`S.hill` (flat / mid / steep) נבחרים בחלון `#popRide` (צ'יפ ⚙). טבלת `BIKES` ב-CORE קובעת מהירות, האטה בעלייה וסף "תלול".
- זמן הרכיבה מחושב תמיד ב-`rideTime()` בתוך `finalizeRoute` (לא משתמשים ב-`total-time` של BRouter); `maxGradeOf()` נותן שיפוע מרבי בחלון 150 מ׳.
- העדפת שיפועים נשלחת ל-BRouter כ-`&profile:uphillcost=…&profile:uphillcutoff=…` (`hillParams()`); אם הבקשה נכשלת – ניסיון חוזר בלי הפרמטרים.
- אייקון הרוכב: `ICONS` + `meKind()`; עוקב אחרי סוג האופניים אלא אם נבחר חץ/נקודה.
- תצוגת רוכב (`body.pov`, רק בזמן ניווט): `#map` מוגדל לריבוע `--povD`, ממורכז בנקודת הרוכב (50% / 64%) ומקבל `perspective + rotateX + rotateZ(--rot)`. Leaflet אינו יודע על ה-transform, לכן בתצוגה זו מנוטרלות גרירה/זום/לחיצות, סימון הרוכב הוא שכבת HTML קבועה (`#povMe`) ולא marker, ו-`setView` בלי הנפשה. הקרדיט למפה עובר ל-`#povAttr`.

## ניווט וחישוב מחדש
- `onPos` מטיל את המיקום על המסלול (חלון סביב האינדקס האחרון, ואז חיפוש גלובלי קדימה). סף סטייה: ‎max(35, דיוק+20) מ׳; 3 קריאות רצופות מחוץ לסף → `reroute()`.
- מסלול רגיל: חישוב מחדש מהמיקום ליעד (עם נקודות ביניים שטרם נעברו).
- מסלול "track" (קהילתי/GPX): מחבר חזרה לנקודה הקרובה בהמשך המסלול ואז ממשיך לאורכו (`concatRoutes(connector, sliceRoute(tail))`).
- סימולציה (תפריט): מתקדמת לאורך המסלול; הקשה על המפה "מקפיצה" את המיקום כדי לבדוק חישוב מחדש.
- קישור ישיר לבדיקות: `?from=lat,lng&to=lat,lng&lang=he|en`.

## הנחיות קוליות
- `say(fn)` מקבל **פונקציה** שמחזירה טקסט, לא מחרוזת: היא מורצת כש-`LANG` מוחלף זמנית לשפת ההקראה (`ttsLang`), כך שאם במכשיר אין קול בעברית המשפט מנוסח ומוקרא באנגלית.
- `pickTtsLang()` בודק תמיכה בשפה (`isLanguageSupported` בתוסף / `getVoices` בדפדפן) בתחילת ניווט ובהפעלת הקול – לא בעליית האפליקציה, כי מנוע ה-TTS עוד לא מוכן. כשלים מוצגים פעם אחת ב-toast (`ttsFail`), לא נבלעים.

## חתימה, תנאי שימוש, פרטיות ונגישות
- חלון `#modal` עם 4 לשוניות (`about`/`terms`/`privacy`/`a11y`); נפתח מהתפריט או מקרדיט "© מאיר שמש" בפינת המפה.
- הטקסטים המשפטיים הם מחרוזות HTML במילון `I18N` (`legal.terms` / `legal.privacy` / `legal.a11y`) – **כל שינוי חייב להיעשות בשתי השפות**.
- בהפעלה ראשונה נפתח חלון הסכמה שאי אפשר לסגור בלי אישור; האישור נשמר כ-`terms: TERMS_VER`. שינוי מהותי בתנאים ⇒ להעלות את `TERMS_VER` כדי לבקש אישור מחדש.
- הלוגו מוטמע כ-data URI בקבוע `LOGO`. בעל הזכויות: מאיר שמש – יעוץ וניהול טכנולוגיות (האיות "יעוץ" הוא של המשתמש).
- החלפת שפה: `switchLang()` – מכפתור EN/עב הצף, מהתפריט ומתוך החלון.

## אנדרואיד (Capacitor)
- `android-app/prep.js` מעתיק את ה-HTML ל-`www/index.html` ומחליף את קישורי ה-CDN של Leaflet בעותק מקומי (נכשל בכוונה אם אין בדיוק 2 קישורים).
- תיקיית `android/` **נוצרת בזמן הבנייה ואינה נשמרת ב-git**; הגדרות native (הרשאות מיקום, שאילתת TTS, versionCode) מוחלות ב-`patch-android.js`.
- הבנייה רצה ב-GitHub Actions (`.github/workflows/android.yml`) ומפרסמת `BikeNavigator.apk` כ-Release בשם `latest`. במחשב המקומי אין Java – לא ניתן לבנות APK מקומית.
- ב-JS, `NAT()` מחזיר את `Capacitor.Plugins` רק בתוך האפליקציה. שם משתמשים ב-TextToSpeech (ל-WebView אין speechSynthesis), KeepAwake, ו-Filesystem+Share לייצוא GPX. בדפדפן רגיל – ה-API-ים של ה-web.
- מיקום: `navigator.geolocation` רגיל; Capacitor מבקש את ההרשאה בעצמו.
- `index.html` בשורש הוא הפניה בלבד, עבור GitHub Pages.

## מגבלות פלטפורמה
- Geolocation דורש HTTPS (או localhost) – בטלפון חייבים לארח את הקובץ.
- דפדפן לא מקבל GPS כשהמסך כבוי; משתמשים ב-Wake Lock. גם באפליקציית האנדרואיד הניווט פועל רק כשהמסך דולק (KeepAwake); GPS ברקע ידרוש foreground service. ל-iOS: `npx cap add ios` על Mac עם אותה מעטפת.
