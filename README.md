# InkShelf

> A lightweight, open‑source Chrome extension to capture web pages and turn them into clean, editable Markdown drafts — now with **Tulis.app** cloud sync.

InkShelf is designed as a **personal knowledge capture inbox** that bridges web content to your Markdown workflow. Capture, organize, tag, and sync your articles across devices with optional **Tulis.app** cloud integration.

---

## Why InkShelf?

Copy‑pasting from the web is messy:

* Broken formatting
* Extra ads, navigation, scripts
* No clean Markdown structure

InkShelf solves this by acting as a **middle layer**:

> **Web Page → Clean Markdown → Organize (Groups/Tags) → Draft (Preview/Edit) → Export or Sync**

**Offline-first. Cloud-optional. Always in control.**

---

## Key Features

### Core Features
* 🔹 **One‑click Web → Markdown capture**
* 🔹 **Preview‑first workflow** (read before you edit)
* 🔹 **Built‑in Markdown editor** (minimal, distraction‑free)
* 🔹 **Drag & drop `.md` files into the browser**
* 🔹 **Multiple tabs supported without overwriting drafts**
* 🔹 **Offline‑friendly** — works without internet

### Organization Features (v2.0)
* 📁 **Document Groups** — Organize articles into folders/collections
* 🏷️ **Custom Tags** — Add multiple tags to any document
* ⭐ **Starred Documents** — Quick access to favorites
* 🔍 **Filter & Search** — Find documents by group, tag, or text

### Cloud Features (v2.0) — Powered by Tulis.app
* ☁️ **Cloud Sync** — Sync documents across devices
* 👤 **Tulis.app Account** — Login to access cloud features
* 📤 **Publish to Cloud** — Share articles publicly or privately
* 💾 **Offline Backup** — Export/import all documents as ZIP
* 🔄 **Offline/Online Sync** — Changes queue when offline, sync when online

### AI Features (v2.0) — BYOK (Bring Your Own Key)
* 🤖 **AI-Powered Content Polish** — Clean and format captured articles
* ✍️ **Help Me Write** — Transform content into well-structured articles with English translation
* 🔑 **Multiple Providers** — Support for OpenAI, DeepSeek, or custom endpoints
* ⚡ **Rate Limiting** — Built-in rate limiting to prevent excessive API usage
* 🔐 **Secure Storage** — API keys stored locally in Chrome's secure storage

---

## How It Works

### 1. Capture a Web Page

1. Open any web page
2. Click the InkShelf extension icon (or press `Ctrl+Shift+M`)
3. Select a **Group** for organization (optional)
4. InkShelf extracts content and converts to Markdown
5. A new InkShelf editor tab opens

Default mode: **Preview (read‑only)**

---

### 2. Organize with Groups & Tags

**Groups** (Folders):
* Create groups like "Research", "Tech Articles", "Reading List"
* Assign documents to groups during capture or later
* Collapse/expand groups in the sidebar
* Drag documents between groups

**Tags**:
* Add multiple tags to any document
* Tags are stored in YAML frontmatter for compatibility
* Filter documents by clicking tags
* Auto-suggested tags based on content

---

### 3. Preview → Edit (Optional)

* Preview mode lets you quickly review the captured content
* Click **Edit** to switch to Markdown editing
* Click **Split** for side-by-side preview and editing
* Unsaved changes auto-save (configurable)

---

### 4. Cloud Sync with Tulis.app

**Login** (Right Sidebar):
1. Click the user icon in the right sidebar
2. Login or create a Tulis.app account
3. Your documents will sync automatically

**Sync Behavior**:
* **Online**: Changes sync in real-time
* **Offline**: Changes queue locally, sync when online
* **Conflict Resolution**: Last-write-wins with notification

**Publish**:
* Publish articles to your Tulis.app profile
* Choose public or private visibility
* Manage published articles from the extension

---

### 5. AI Features — BYOK (Bring Your Own Key)

InkShelf includes AI-powered features that help you polish and transform captured content. You bring your own API key.

**Setup**:
1. Go to Settings → AI Features
2. Enable AI Features
3. Select your provider (OpenAI, DeepSeek, or Custom)
4. Enter your API key
5. Select a model

**Help Me Write**:
* Click the "Help me write" button in the editor
* AI will transform your content into a well-structured article
* Supports automatic translation to English
* Preview the result before applying
* Choose to replace content or append to bottom

**Rate Limiting**:
* Maximum 5 requests per minute
* Prevents excessive API usage
* Countdown timer shows when next request is allowed

**Supported Providers**:
| Provider | Models | Endpoint |
|----------|--------|----------|
| OpenAI | GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo | api.openai.com |
| DeepSeek | deepseek-chat, deepseek-coder | api.deepseek.com |
| Custom | Any OpenAI-compatible | Your endpoint |

---

### 6. Backup & Restore

**Export All Documents**:
1. Go to Settings → Backup & Restore
2. Click "Export All Documents"
3. Downloads a `.zip` file containing:
   * All `.md` files with frontmatter
   * `metadata.json` with groups, tags, settings
   * `manifest.json` with backup info

**Import Backup**:
1. Go to Settings → Backup & Restore
2. Click "Import Backup"
3. Select a previously exported `.zip` file
4. Choose merge or replace strategy

---

### 7. Drag & Drop Markdown Files

* Drag a `.md` file into the browser window
* InkShelf automatically opens it in a new editor tab
* Frontmatter (groups/tags) is preserved

---

## Capture Modes

| Mode           | Description                       |
| -------------- | --------------------------------- |
| Clean Article  | Removes navigation, ads, footers  |
| Selection Only | Converts only selected text       |
| Page Snapshot  | Keeps headings, lists, and tables |

(Default: Clean Article)

---

## Document Schema

Each document includes:

```yaml
---
title: "Article Title"
date: 2025-12-25
source: https://example.com/article
group: "Research"
tags:
  - web-capture
  - technology
  - example.com
---

# Article content in Markdown...
```

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `docId` | string | Unique identifier |
| `title` | string | Document title |
| `content` | string | Markdown content |
| `url` | string | Source URL |
| `groupId` | string | Group identifier |
| `groupName` | string | Group display name |
| `tags` | string[] | User-defined tags |
| `starred` | boolean | Favorite flag |
| `timestamp` | number | Creation time |
| `updatedAt` | number | Last update time |
| `syncedAt` | number | Last sync time (cloud) |
| `cloudId` | string | Cloud document ID |
| `status` | string | draft / saved / published |

---

## UI Structure

### Left Sidebar — Document Management
```
┌─────────────────────────────┐
│ 🔍 Search documents...      │
├─────────────────────────────┤
│ + New Document              │
│ + New Group                 │
├─────────────────────────────┤
│ 📁 All Documents (15)       │
│ ⭐ Starred (3)              │
├─────────────────────────────┤
│ ▼ 📁 Research (5)           │
│   ├─ Article One            │
│   ├─ Article Two            │
│   └─ Article Three          │
│ ▶ 📁 Tech Articles (4)      │
│ ▶ 📁 Reading List (3)       │
├─────────────────────────────┤
│ 🏷️ Tags                     │
│   javascript (8)            │
│   tutorial (5)              │
│   web-capture (15)          │
└─────────────────────────────┘
```

### Main Content — Editor/Preview
```
┌─────────────────────────────────────────────┐
│ [Title] _________________ [Preview|Edit|Split]│
│ Source: https://example.com                  │
│ Group: [Research ▼]  Tags: [+ Add tag]       │
├─────────────────────────────────────────────┤
│                                             │
│           Preview / Edit Area               │
│                                             │
├─────────────────────────────────────────────┤
│ Status: Saved ✓  Words: 1,234  [⚙️ Options] │
└─────────────────────────────────────────────┘
```

### Right Sidebar — Tulis.app Account
```
┌─────────────────────────┐
│ 👤 Tulis.app            │
├─────────────────────────┤
│ [Not logged in]         │
│                         │
│ [Login] [Sign Up]       │
├─────────────────────────┤
│ — OR (when logged in) — │
├─────────────────────────┤
│ 👤 user@email.com       │
│ ☁️ Sync: Active         │
│ Last sync: 2 min ago    │
├─────────────────────────┤
│ [🔄 Sync Now]           │
│ [📤 Publish Article]    │
│ [📋 My Published]       │
├─────────────────────────┤
│ [⚙️ Account Settings]   │
│ [🚪 Logout]             │
└─────────────────────────┘
```

---

## Storage Architecture

### Local Storage (Browser)

| Storage | Purpose | Data |
|---------|---------|------|
| **IndexedDB** | Persistent documents | All drafts with full metadata |
| **sessionStorage** | Current tab state | Unsaved edits for active tab |
| **localStorage** | Settings & auth | Theme, preferences, auth tokens |

### Cloud Storage (Tulis.app)

| Endpoint | Purpose |
|----------|---------|
| `/api/auth/*` | Authentication |
| `/api/documents/*` | Document CRUD & sync |
| `/api/groups/*` | Group management |
| `/api/sync/*` | Sync operations |
| `/api/publish/*` | Publishing |

See [BACKEND_API.md](BACKEND_API.md) for full API specification.

---

## Data Migration

When updating from v1.x to v2.x, the extension automatically migrates existing documents:

### Migration Process
1. **Detection**: On startup, checks IndexedDB version
2. **Backup**: Creates automatic backup before migration
3. **Schema Update**: Adds new fields with defaults:
   * `groupId` → `"default"`
   * `groupName` → `"Uncategorized"`
   * `tags` → extracted from existing frontmatter or `[]`
   * `syncedAt` → `null`
   * `cloudId` → `null`
4. **Index Creation**: Creates new indexes for groups/tags
5. **Verification**: Validates all documents migrated correctly

### Manual Migration (if needed)
```javascript
// Run in browser console on editor.html
await storageManager.migrateToV2();
```

### Rollback
If issues occur, restore from automatic backup:
1. Go to Settings → Backup & Restore
2. Click "Restore from Auto-Backup"
3. Select the pre-migration backup

---

## Offline/Online Sync Strategy

### Sync Queue System
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Edit Doc   │ →  │  Sync Queue  │ →  │  Cloud API   │
│   (Local)    │    │  (IndexedDB) │    │  (Tulis.app) │
└──────────────┘    └──────────────┘    └──────────────┘
                           ↓
                    [Offline? Queue]
                    [Online? Process]
```

### Conflict Resolution (Last-Write-Wins)
1. Local change saved with `updatedAt` timestamp
2. Cloud has `serverUpdatedAt` timestamp
3. On sync:
   * If `local.updatedAt > server.serverUpdatedAt` → Push local
   * If `server.serverUpdatedAt > local.updatedAt` → Pull server
   * Notification shown to user about resolution

### Sync States
| State | Icon | Description |
|-------|------|-------------|
| Synced | ✅ | Document matches cloud |
| Pending | 🔄 | Changes queued for sync |
| Syncing | ⏳ | Currently syncing |
| Conflict | ⚠️ | Manual resolution needed |
| Offline | 📴 | No connection, queued |
| Error | ❌ | Sync failed, retry later |

---

## Tech Stack

* **Extension**: Chrome Extension (Manifest v3)
* **Frontend**: Vanilla JavaScript, HTML, CSS
* **Local Storage**: IndexedDB, sessionStorage, localStorage
* **Libraries**: 
  * marked.js (Markdown rendering)
  * Readability.js (Content extraction)
  * JSZip (Backup/restore, optional)
* **AI Integration**: OpenAI, DeepSeek, or any OpenAI-compatible API (BYOK)
* **Cloud Backend**: Node.js API (see [BACKEND_API.md](BACKEND_API.md))

---

## Installation (Development)

```bash
git clone https://github.com/tanghoong/browser-extension-inkshelf.git
cd browser-extension-inkshelf
```

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project folder

---

## File Structure

```
browser-extension-inkshelf/
├── manifest.json        # Extension manifest
├── background.js        # Service worker
├── content.js           # Page content extraction
├── popup.html/js        # Extension popup
├── editor.html/js/css   # Main editor interface
├── settings.html/js     # Settings page
├── config.js            # Configuration constants
├── storage.js           # IndexedDB management
├── sync.js              # Cloud sync module (v2.0)
├── auth.js              # Authentication module (v2.0)
├── backup.js            # Backup/restore module (v2.0)
├── ai-manager.js        # AI API integration (v2.0)
├── file-handler.js      # .md file drop handling
├── icons/               # Extension icons
├── libs/                # Third-party libraries
│   ├── marked.min.js
│   ├── Readability.js
│   └── jszip.min.js     # (optional, for ZIP backup)
├── README.md            # This file
├── BACKEND_API.md       # API specification for backend
├── PROJECT_SUMMARY.md   # Implementation details
└── TESTING.md           # Test cases
```

---

## Configuration

### Environment Variables (for development)
```javascript
// config.js
const CONFIG = {
  API_BASE_URL: 'https://api.tulis.app',  // Production
  // API_BASE_URL: 'http://localhost:3000', // Development
  SYNC_INTERVAL: 30000,  // 30 seconds
  OFFLINE_QUEUE_MAX: 100,
  AUTO_BACKUP_INTERVAL: 86400000,  // 24 hours
};
```

---

## Roadmap

### v2.0 (Current)
- [x] Document grouping
- [x] Custom tags with frontmatter
- [x] Tulis.app authentication
- [x] Cloud sync
- [x] Offline backup/restore
- [x] Data migration from v1.x
- [x] AI-powered content polishing (BYOK)
- [x] Multiple AI provider support (OpenAI, DeepSeek, Custom)

### v2.1 (Planned)
- [ ] Keyboard shortcuts configuration
- [ ] Export presets (Obsidian / Hugo)
- [ ] Bulk operations (move, tag, delete)
- [ ] Search within document content
- [ ] AI prompt customization

### v3.0 (Future)
- [ ] End-to-end encryption
- [ ] Team/shared collections
- [ ] Browser sync (Chrome/Firefox/Edge)
- [ ] Mobile companion app

---

## Contributing

Contributions are welcome.

* Fork the repo
* Create a feature branch
* Submit a pull request

Please keep the scope minimal and aligned with InkShelf's philosophy.

---

## License

MIT License

---

## Philosophy

InkShelf is built on one idea:

> **The best tools do one thing well — and stay out of your way.**

Now with optional cloud sync through **Tulis.app**, you get the best of both worlds:
* **Offline-first**: Everything works without internet
* **Cloud-optional**: Sync only if you want to
* **Data ownership**: Export everything anytime

If you like Markdown and value clean inputs, InkShelf is for you.
