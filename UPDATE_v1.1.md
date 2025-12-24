# InkShelf v1.1 - Update Summary

## 🎉 New Features Implemented

### 1. ✅ Three View Modes
- **Preview Mode**: Read-only rendered Markdown view
- **Edit Mode**: Full-screen Markdown editing
- **Split View**: Side-by-side preview and edit (live preview updates as you type!)

Toggle between modes using the buttons in the header: `Preview | Edit | Split`

### 2. ✅ Obsidian-Style Frontmatter
When capturing articles, InkShelf now adds YAML frontmatter:

```yaml
---
title: "Article Title"
date: 2025-12-25
source: https://example.com/article
tags:
  - web-capture
  - example.com
---
```

This makes captured content compatible with Obsidian and other tools that use frontmatter.

### 3. ✅ .md File Handling
- **Drag & Drop**: Drag any `.md` file into the browser window - InkShelf will open it automatically
- **File Association**: .md files can now be opened directly in the browser with InkShelf
- Works across all browser tabs

### 4. ✅ Document Management Sidebar
- **Save Documents**: Click "Save" to store documents in browser storage
- **Document List**: View all saved documents in the left sidebar
- **Quick Access**: Click any document to open it
- **Delete**: Remove unwanted documents
- **New Document**: Create new blank documents
- **Collapsible**: Toggle sidebar with the menu icon

## 🎨 Updated UI

### Header Changes
- Removed old "Edit/Preview" toggle button
- Added three-button view mode selector
- Added "Save" button (primary action)
- Added "Delete" button (for saved documents)
- Kept theme toggle, download, and copy buttons

### Layout
- Left sidebar for document management (280px wide)
- Main content area adapts to view mode
- Split view shows 50/50 preview and edit panels
- Fully responsive to theme changes

### Sidebar Features
- "My Documents" heading
- Toggle button to collapse/expand
- "+ New Document" button
- List of saved documents with:
  - Document title
  - Save date
  - Active state indicator
  - Click to open

## 🔧 Technical Changes

### Files Modified
1. `editor.html` - Added sidebar, view mode buttons, split layout
2. `editor.css` - Added sidebar styles, split view layout, new button styles
3. `editor.js` - Implemented view modes, sidebar, CRUD operations
4. `content.js` - Added Obsidian frontmatter generation
5. `manifest.json` - Added file handler configuration
6. `file-handler.js` - NEW: Handles .md file drops and opening

### Storage Enhancement
- Documents saved to IndexedDB persist across sessions
- Each document has unique ID
- Automatic title extraction from first heading
- Metadata includes title, date, source URL, tags

### View Mode Logic
- `preview`: Only preview panel visible
- `edit`: Only edit panel visible  
- `split`: Both panels visible side-by-side
- Active mode highlighted in UI
- Preview updates live in split mode

## 📋 How to Use

### Save Documents
1. Capture or create content
2. Click "Save" button
3. Document appears in sidebar
4. Auto-saved to browser storage

### View Modes
- Click "Preview" - see rendered Markdown
- Click "Edit" - edit raw Markdown (full screen)
- Click "Split" - see both simultaneously

### Manage Documents
- Click document in sidebar to open
- Edit and save again to update
- Click "Delete" to remove
- Click "+" to create new

### Open .md Files
- Drag any .md file into browser window
- File opens in InkShelf editor
- Edit, save, or export as needed

## 🚀 Testing Checklist

- [ ] Reload extension in `chrome://extensions/`
- [ ] Capture an article - check for frontmatter
- [ ] Toggle between Preview/Edit/Split modes
- [ ] Click "Save" - document appears in sidebar
- [ ] Click saved document to reopen
- [ ] Create new document with "+" button
- [ ] Delete a saved document
- [ ] Drag a .md file into browser
- [ ] Test split mode - edit and watch preview update
- [ ] Toggle sidebar open/closed
- [ ] Test theme switching in all modes

## 🎯 Key Improvements

1. **Better Workflow**: Split view lets you write and preview simultaneously
2. **Obsidian Compatible**: Frontmatter makes integration seamless
3. **Persistent Storage**: Save documents for later editing
4. **File Management**: Drag & drop .md files anywhere
5. **Organization**: Sidebar keeps all documents accessible

## 📝 Notes

- Saved documents persist in browser (IndexedDB)
- No cloud sync (by design)
- Frontmatter includes source URL for attribution
- Split view updates preview as you type
- Sidebar can be collapsed for more space

---

**Version**: 1.1  
**Status**: Ready for testing  
**Breaking Changes**: None (backward compatible)
