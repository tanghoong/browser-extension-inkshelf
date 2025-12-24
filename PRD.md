# Markdown Capture Chrome Extension — MVP PRD

## 1. Project Name (Candidates)

### Naming Principles

* Avoid common keyword combinations (e.g., direct combinations of Markdown, Clip, Web, Note)
* Should evoke "capture / temporary storage / draft / conversion"
* Suitable for open source, technically oriented

### Candidate Names (Ordered by Preference)

1. **InkShelf** (Primary) — Web content becomes your ink draft layer
2. **Draftport** — Draft + Portal, a draft transit station
3. **Web2MD** — Technical and straightforward (more likely to conflict)
4. **PageToInk** — Content → Editable text
5. **Clipscript** — Clip + Script (technical vibe)

> Recommended Official Name: **InkShelf**
> Repo / Extension ID: `inkshelf-md-capture`

---

## 2. Product Positioning

**InkShelf is a browser transit tool for "Web Content → Markdown Draft".**

* No cloud sync
* No user accounts
* Does not replace Notion / Obsidian
* Focused on "capture, preview, temporary editing"

---

## 3. User Flow

### 3.1 Web Page Capture Flow

1. User is on any web page
2. Click InkShelf extension icon or use keyboard shortcut
3. System captures content and converts to Markdown
4. Opens InkShelf Editor Tab
5. Default mode: **Preview (read-only)**
6. User clicks "Edit" to enter editing mode

### 3.2 Drag-In Markdown File

1. User drags `.md` file into browser window
2. InkShelf intercepts the event
3. Parses content and opens Editor Tab
4. Default: Preview mode

---

## 4. Capture Modes (MVP)

| Mode           | Description                                   |
| -------------- | --------------------------------------------- |
| Clean Article  | Remove nav / footer / ads, keep main content  |
| Selection Only | Capture only user-selected text               |
| Page Snapshot  | Preserve heading / list / table structure     |

MVP Default: Clean Article

---

## 5. Editor Specifications (MVP)

### 5.1 Modes

* Preview Mode (default)
* Edit Mode (manual toggle)

### 5.2 Features

* Markdown textarea
* Preview rendering
* Toggle Preview / Edit
* Download `.md`
* Copy Markdown

> Does not include rich text or complex keyboard shortcuts

---

## 6. Storage Design (Critical)

### 6.1 Document Identification (doc_id)

Each document must have a unique `doc_id`:

```text
doc_id rules:
- capture:<hash(url)>
- file:<filename + size + lastModified>
- temp:<timestamp + random>
```

Purpose:

* Distinguish different drafts
* Multiple tabs coexist
* Prevent overwriting

---

### 6.2 Draft Storage Strategy

| Level          | Purpose                                      |
| -------------- | -------------------------------------------- |
| sessionStorage | Unsaved content for current tab              |
| IndexedDB      | Multi-tab coexistence within extension session |

#### Key Example

```json
{
  "doc_id": "capture:abc123",
  "content": "...markdown...",
  "updated_at": "timestamp",
  "status": "draft"
}
```

---

### 6.3 Draft Lifecycle

* Tab opens → draft is created
* During editing → continuously update storage
* Download / Copy ≠ clear draft
* Close tab → clear that doc_id draft

> No cross-browser persistence

---

## 7. Tab Behavior Rules (Very Important)

1. Each Editor Tab is bound to one doc_id
2. New capture / new file = new tab
3. Does not automatically overwrite drafts in other tabs
4. Same doc_id can prompt "Draft already exists, open it?"

---

## 8. Technical Architecture (Constraints)

* Pure HTML / Vanilla JS / CSS
* Chrome Extension Manifest v3
* Content Script: DOM extraction
* Background: tab management / message relay
* Editor Page: standalone HTML

---

## 9. Excluded Features (Intentionally)

* Cloud sync
* User account system
* AI rewriting / summarization
* Cross-device sync

---

## 10. MVP Acceptance Criteria

* Drafts in different tabs do not interfere with each other
* Closing tab does not leave garbage data
* Large articles do not crash
* Can be used offline

---

## 11. Open Source Strategy (Recommended)

* License: MIT
* README: Clearly explain "transit tool" positioning
* Issue labels: capture / editor / storage

---

## 12. Future Extensions (Not in MVP)

* Metadata Frontmatter toggle
* Keyboard shortcut configuration
* Obsidian / Hugo Export
* Multiple Capture Presets

---

> Document Version: v1.0
> Goal: Ready for AI engineer to start implementation
