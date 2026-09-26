# Mood Wala Food — Online Menu, Ordering & Manager Dashboard

A mobile-first ordering site for **Mood Wala Food**, plus a manager dashboard —
both static HTML files, no server needed. Orders and menu on/off state are
stored in a Google Sheet via one Google Apps Script Web App.

## Files

- `index.html` — customer-facing menu + cart + checkout, with a dark/light toggle.
- `admin.html` — manager dashboard: Live Orders, History, Menu on/off. PIN-gated.
- `Code.gs` — Google Apps Script backend (orders + menu state), shared by both pages.

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
- On load, it fetches the current on/off menu state from the Sheet
  (`?action=menuStatus`). Any item turned off in the dashboard simply doesn't
  appear — if a whole category is turned off, that category disappears too.
- Placing an order POSTs name, phone, itemized list and total; the backend adds
  a unique Order ID, a `Pending` status, and the date, then appends a row.

### Manager dashboard (`admin.html`)
- **PIN screen** on first visit (remembered on that device afterwards).
- **Live Orders** — all `Pending` orders, oldest first (so you work through
  them in the order they came in). Each card has **Mark Done** and **Reject**;
  either one removes it from Live Orders immediately. Auto-refreshes every
  20 seconds, plus a manual ⟳ button.
- **History** — a date picker (defaults to today) showing every order for that
  day, oldest first, with a status badge and a running total (excluding
  rejected orders).
- **Menu** — every item from the menu with an on/off switch. Turning an item
  off removes it from the customer page immediately (it re-checks on each
  page load); turning it back on brings it back.

### Keeping the menu in sync
The item list is duplicated in `index.html` and `admin.html` (both need it to
compute the same stable item keys). If you add, remove, or rename a menu item
or its price, **update the `MENU` array in both files** so the dashboard's
on/off list matches the customer page. Renaming an item counts as a new item
for on/off purposes (its key is derived from the category + name).

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

