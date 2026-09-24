# My Notes Hub

A single-page notes workspace that runs entirely in your browser — no server, no build step, no sign-up. Organize notes, articles, images, links, documents, and voice recordings into categories, with a trash you can restore from.

## Files

| File          | Purpose                                                              |
|---------------|-----------------------------------------------------------------------|
| `index.html`  | Page structure — sidebar, topbar, and the empty containers the app fills in |
| `style.css`   | All visual styling, including light/dark theme and mobile layout      |
| `app.js`      | All application logic — rendering, storage, and event handling        |

## Getting started

1. Keep all three files in the same folder.
2. Open `index.html` in a browser — either double-click it, or serve the folder with any static server (e.g. `npx serve` or the VS Code "Live Server" extension) for the smoothest experience.
3. That's it. Your data lives in the browser's `localStorage` on that device, and will still be there next time you open the page.

## Features

### Sidebar navigation
- **Dashboard** — an editable profile card (name, role, email, photo, about-me), a workspace banner, and live clocks for India / US Central time.
- **All Notes** — every category *you've* created yourself, in one place.
- **Work, Personal, Ideas, Important, Tasks, Links, Documents, Screenshots, Contacts, Travel, Finance, Health, Learning** — ready-made categories, one per sidebar item. Each behaves exactly like a category you'd create yourself: click **+ Add Content** to add a Text Note, Article, Image, Screenshot, URL/Link, File/Document, or Voice Note.
- **Trash** — anything deleted (a category or a single piece of content) lands here first. Restore it or delete it for good.
- **Settings** — edit your profile, and see counts of your categories, content, and trash.
- The ☰ icon (top-left, and in the mobile topbar) opens and closes the sidebar.

### Categories & content
- Add your own categories from the **All Notes** page with **+ Add Category** (name, description, icon).
- Every content card has three actions:
  - **📋 Copy** — copies the note's text (or link/file name) to your clipboard.
  - **✎ Edit** — reopens the same form you used to add it, pre-filled.
  - **🗑️ Trash** — moves it to Trash (recoverable).
- Use the search bar at the top to filter categories and content by title, text, URL, or file name, live as you type.

### Appearance
- The ☼ icon in the topbar switches between light and dark themes; your choice is remembered.
- Sidebar items are colored with distinct mid-tone accent colors so they're easy to tell apart at a glance.

## Data & storage

- All notes, categories, trash, and your profile are stored as JSON in the browser's `localStorage`, under these keys:
  - `my_notes_hub_data_v4` — categories, content, and trash
  - `my_notes_hub_profile` — your profile (name, role, email, description, photo)
  - `my_notes_hub_theme` — light/dark preference
- Uploaded images, documents, and voice notes are stored as base64 data URLs inside that same JSON blob.
- **This means everything is local to one browser on one device.** Clearing your browser's site data for this page will erase it. There's no cloud sync or backup built in — if you need that, plan to export/back up the `localStorage` data yourself, or extend the app to sync elsewhere.
- Because everything (including files) is stored as text in `localStorage`, browsers typically cap total storage around 5–10 MB. Large images, PDFs, or audio files will use this up quickly — keep uploads modest in size.

## Known limitations

- No multi-device sync — data doesn't leave your browser.
- No file-size limit enforced by the app itself; very large uploads may hit the browser's storage cap and fail to save.
- No user accounts or authentication — anyone with access to the browser/profile can see and edit everything.# my-notes-hub
