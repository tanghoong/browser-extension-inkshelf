# InkShelf

> A lightweight, openâ€‘source Chrome extension to capture web pages and turn them into clean, editable Markdown drafts.

InkShelf is designed as a **personal knowledge capture inbox**, not a full writing or noteâ€‘taking app. It helps you quickly move content from the web into Markdown, preview it, optionally edit it, and then export it to your preferred tools.

---

## Why InkShelf?

Copyâ€‘pasting from the web is messy:

* Broken formatting
* Extra ads, navigation, scripts
* No clean Markdown structure

InkShelf solves this by acting as a **middle layer**:

> **Web Page â†’ Clean Markdown â†’ Draft (Preview / Edit) â†’ Export**

No accounts. No cloud sync. No lockâ€‘in.

---

## Key Features

* ðŸ”¹ **Oneâ€‘click Web â†’ Markdown capture**
* ðŸ”¹ **Previewâ€‘first workflow** (read before you edit)
* ðŸ”¹ **Builtâ€‘in Markdown editor** (minimal, distractionâ€‘free)
* ðŸ”¹ **Drag & drop `.md` files into the browser**
* ðŸ”¹ **Unsaved draft memory per tab**
* ðŸ”¹ **Multiple tabs supported without overwriting drafts**
* ðŸ”¹ **Offlineâ€‘friendly**

---

## How It Works

### 1. Capture a Web Page

1. Open any web page
2. Click the InkShelf extension icon (or shortcut)
3. InkShelf extracts the main content and converts it to Markdown
4. A new InkShelf editor tab opens

Default mode: **Preview (readâ€‘only)**

---

### 2. Preview â†’ Edit (Optional)

* Preview mode lets you quickly review the captured content
* Click **Edit** to switch to Markdown editing
* Unsaved changes are remembered until the tab is closed

---

### 3. Drag & Drop Markdown Files

* Drag a `.md` file into the browser window
* InkShelf automatically opens it in a new editor tab
* Preview mode is enabled by default

---

## Capture Modes (MVP)

| Mode           | Description                       |
| -------------- | --------------------------------- |
| Clean Article  | Removes navigation, ads, footers  |
| Selection Only | Converts only selected text       |
| Page Snapshot  | Keeps headings, lists, and tables |

(Default: Clean Article)

---

## Draft & Tab Behavior (Important)

InkShelf is built to be safe and predictable.

* Each document has a unique **doc_id**
* Each editor tab is isolated
* Multiple Markdown drafts can be open at the same time
* Drafts are **never overwritten by another tab**

### Draft Lifecycle

* Open tab â†’ draft is created
* Edit â†’ draft is saved in memory
* Download / Copy â†’ draft remains
* Close tab â†’ draft is discarded

> InkShelf does not persist drafts after the tab is closed.

---

## Storage Design

InkShelf uses browserâ€‘native storage only:

* **sessionStorage** â€” unsaved content for the active tab
* **IndexedDB** â€” managing multiple drafts within the extension session

No external servers. No tracking.

---

## What InkShelf Is NOT

InkShelf intentionally avoids feature creep.

* âŒ No cloud sync
* âŒ No user accounts
* âŒ No AI rewriting or summarization
* âŒ No richâ€‘text editor
* âŒ No crossâ€‘device sync

It is meant to work *with* your tools, not replace them.

---

## Ideal Use Cases

* Developers collecting technical references
* Writers capturing research material
* Students saving articles for lateræ•´ç†
* Markdown users who prefer clean inputs

Perfect companion for:

* Obsidian
* Hugo / static sites
* GitHub Markdown
* Any Markdownâ€‘based workflow

---

## Screenshots / Demo

> *(GIF placeholders)*

* Capture web page â†’ Markdown
* Preview vs Edit mode
* Drag & drop `.md` file
* Multiple tabs with different drafts

---

## Tech Stack

* Chrome Extension (Manifest v3)
* Vanilla JavaScript
* HTML / CSS only
* No frameworks

---

## Installation (Development)

```bash
git clone https://github.com/your-org/inkshelf-md-capture.git
```

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project folder

---

## Roadmap (Postâ€‘MVP)

* Optional Markdown frontmatter metadata
* Keyboard shortcuts configuration
* Export presets (Obsidian / Hugo)
* Capture presets

---

## Contributing

Contributions are welcome.

* Fork the repo
* Create a feature branch
* Submit a pull request

Please keep the scope minimal and aligned with InkShelfâ€™s philosophy.

---

## License

MIT License

---

## Philosophy

InkShelf is built on one idea:

> **The best tools do one thing well â€” and stay out of your way.**

If you like Markdown and value clean inputs, InkShelf is for you.

