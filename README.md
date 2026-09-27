# Mood Wala Food — Online Menu, Ordering & Manager Dashboard

A mobile-first ordering site for **Mood Wala Food**, plus a manager dashboard —
both static HTML files, no server needed. Orders and menu on/off state are
stored in a Google Sheet via one Google Apps Script Web App.

## Files

- `index.html` — customer-facing menu + cart + checkout, with a dark/light toggle.
- `admin.html` — manager dashboard: Live Orders, History, Menu on/off. PIN-gated.
- `Code.gs` — Google Apps Script backend (orders + menu state), shared by both pages.
- `sw.js`, `manifest.webmanifest`, `admin.webmanifest`, `icons/` — make both pages
  installable apps (PWA). Upload these to GitHub along with the HTML files,
  keeping the `icons` folder.

> **v2 (optimized for many users)** — see *Performance & Google limits* below.
> Update **all three files together** and deploy a **new version** of the script.

## 1. Set up the Google Sheet + Apps Script

1. Create a new Google Sheet (e.g. "Mood Wala Food Orders").
2. **Extensions → Apps Script**, delete the starter code, paste in `Code.gs`, save.
3. **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy, authorize when prompted (it's your own script, safe to allow).
4. Copy the **Web app URL** (ends in `/exec`).

Two tabs are created automatically the first time each is used:
- **Orders** — every order, with a `Status` column (Pending / Done / Rejected).
- **MenuConfig** — one row per item that has ever been turned off from the dashboard.

> Whenever you edit `Code.gs`, use **Deploy → Manage deployments → Edit (pencil)
> → New version → Deploy** so the live URL picks up the change.

## 2. Connect both pages to your Sheet

In **both** `index.html` and `admin.html`, find:
```js
const SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
```
and replace with the Web app URL from step 1.4.

In `admin.html`, also set your own PIN:
```js
const ADMIN_PIN = "1234"; // change this before sharing the dashboard link
```
This is a light deterrent, not real security — anyone with the dashboard link and
the PIN can view customer names/phone numbers. Keep the `admin.html` link private
(don't put it in the same QR code as the customer menu), and change the PIN from
the default.

## 3. Publish on GitHub Pages (free hosting)

1. Create a GitHub repo (e.g. `moodwala-food-menu`) and add `index.html`,
   `admin.html`, and this `README.md`.
2. **Settings → Pages** → Source: **Deploy from a branch**, Branch: **main / (root)**, Save.
3. Your pages go live at:
   - Customer menu: `https://<username>.github.io/<repo>/`
   - Manager dashboard: `https://<username>.github.io/<repo>/admin.html`

Share the first link with customers (e.g. as a QR code on the table); keep the
second for staff only.

## How it works

### Customer page (`index.html`)
- Same cart/checkout flow as before, plus a 🌙/☀️ button in the header that
  switches between dark and light themes (remembered per device via
  `localStorage`).
- The on/off menu state is cached on the customer's phone and drawn instantly;
  it is refreshed in the background at most once a minute (and served from the
  script cache, not the sheet). Any item turned off in the dashboard doesn't
  appear — if a whole category is turned off, that category disappears too.
- Placing an order POSTs name, phone, itemized list, total and a client order ID.
  The page waits for a real confirmation from the sheet and retries automatically
  if Google is slow — the order ID makes retries safe (never a duplicate row).
  If an item was switched off after the page loaded, the order is refused, the
  item is removed from the cart, and the customer is asked to re-submit.

### Manager dashboard (`admin.html`)
- **PIN screen** on first visit (remembered on that device afterwards).
- **Live Orders** — all `Pending` orders, oldest first. **Mark Done** / **Reject**
  remove the card instantly (restored if the sheet write fails). Syncs every
  15 seconds while the dashboard is on screen, pauses when the phone is locked or
  the tab is in the background, and syncs immediately when you come back.
- **History** — served from this device's saved copy (last 60 days), so it opens
  instantly and uses no sheet quota. Older dates are fetched from the sheet once
  and remembered for the session. **Full resync** re-downloads everything.
- **Menu** — every item from the menu with an on/off switch. Turning an item
  off removes it from the customer page immediately (it re-checks on each
  page load); turning it back on brings it back.

### Keeping the menu in sync
The item list is duplicated in `index.html` and `admin.html` (both need it to
compute the same stable item keys). If you add, remove, or rename a menu item
or its price, **update the `MENU` array in both files** so the dashboard's
on/off list matches the customer page. Renaming an item counts as a new item
for on/off purposes (its key is derived from the category + name).

## Installable app (PWA)

- Both pages can be installed to the home screen. A small floating
  **⬇ Install app** button appears on Android/Chrome (and on iPhone, where it
  shows the "Share → Add to Home Screen" steps). It hides once installed; the ×
  hides it for 3 days.
- The customer app and the manager app install as two separate icons
  ("Mood Wala" and "MW Manager").
- Pages open even with no internet (cached copy). Orders, menu status and sync
  always go live to the sheet and are never cached.
- After you change the HTML, installed apps pick it up on the next open (the
  page is loaded network-first). If you change `sw.js`, bump `VERSION` inside it.

## Many orders at once, offline outbox & My Orders

- Every order is **saved on the customer's phone first**, then sent.
- If Google is busy or the network drops, the order stays in an **outbox** and is
  re-sent automatically (5s, 10s, 20s … then every 2 min), and immediately when the
  connection returns or the page is reopened. A banner shows "waiting to be sent".
- Each order has a unique ID, so a re-send can never create a duplicate row.
- An order that can't be sent for 30 minutes stops auto-sending and is marked
  **Not sent**. This stops a stale order reaching the kitchen hours later. The
  customer can tap **Try again**, **Put back in cart**, or **Remove**.
- **My Orders** (top-left button) shows this phone's last 50 orders with their
  items and send status. It is stored only on the phone and never reads the sheet.
  **Order again** refills the cart at current prices.
- Name and mobile number are remembered on the phone for the next order.

## Performance & Google limits (v2)

- **Customer menu load** — answered from the phone's cache or the script cache;
  the spreadsheet is not opened.
- **Dashboard polling** — each device sends the last row + version it has. If
  nothing changed, the script answers from its cache without opening the sheet.
  If something changed, only the new rows and status changes are sent.
- **Orders** — written under a lock so simultaneous customers never collide.
- **Status updates** — go straight to the row instead of scanning the sheet.
- Each dashboard does one full refresh every 12 hours to self-correct.

**Rules for the Orders tab:** don't sort, insert or delete rows by hand
(dashboards track orders by row) — use a Filter view instead. If you do edit
the sheet by hand, use the sheet menu **Mood Wala → Refresh all dashboards**
(appears after reloading the sheet once the new script is saved).

## Troubleshooting

- **Dashboard shows "Could not reach the order sheet"**: double-check
  `SCRIPT_URL` is pasted into `admin.html`, and that the deployment's access is
  set to "Anyone" (not "Anyone with Google account").
- **Menu on/off doesn't affect the customer page**: make sure `SCRIPT_URL` is
  also set in `index.html` — without it, the customer page always shows the
  full menu.
- If you ever see a CORS-related error in the browser console, redeploy the
  Apps Script as a **new** version (not just saved) — Apps Script only applies
  code changes to `/exec` URLs after a fresh deployment version.

## Changelog notes (if you already had this set up)

- **v2 performance update.** Replace all three files, then **Deploy → Manage
  deployments → Edit → New version → Deploy**. The `/exec` URL stays the same.
  The first time you save the new script, run `refreshAllDashboards` once from the
  editor to grant permission for the sheet menu.
- **Order placement now confirms for real.** Previously the page used a
  `no-cors` request and always showed "Order placed!" even if Google dropped the
  order under load.

- **Done orders now always show in History.** Previously the History tab only
  re-fetched the first time you opened it in a session, so orders marked Done
  after that didn't appear until you clicked "Load" again — the tab now
  refreshes every time you open it. As a belt-and-suspenders fix, `Code.gs`
  also normalizes the Order Date field in case Google Sheets ever
  auto-converts it to a real date value internally.
- **If you already have an Orders sheet from before this update**, open it and
  manually set column **C** (Order Date) and column **F** (Mobile Number) to
  **Format → Number → Plain text**, so Sheets never silently reformats them.
  Brand-new sheets get this applied automatically.
- **History is now a compact tappable list** — tap any row to see full order
  details (items, phone, time, status) in a popup.
- **Optional per-item notes** — once an item is in the cart, a small "Add a
  note" field appears under it (e.g. "extra spicy", "less sweet", "thick").
  It's saved along with that item in the sheet's Items column.

