# Quick Start Guide - InkShelf Chrome Extension

## Installation (2 Minutes)

### Step 1: Open Chrome Extensions Page

1. Open Google Chrome
2. Type in address bar: `chrome://extensions/`
3. Press Enter

### Step 2: Enable Developer Mode

1. Look for "Developer mode" toggle in top-right corner
2. Click to enable it (should turn blue)

### Step 3: Load Extension

1. Click "Load unpacked" button
2. Navigate to: `C:\Users\user\Documents\GitHub\browser-extension-inkshelf`
3. Click "Select Folder"

### Step 4: Verify Installation

✅ InkShelf icon appears in your extensions toolbar  
✅ No errors shown on the extensions page  
✅ Extension shows "Enabled" status

---

## First Use (30 Seconds)

### Capture Your First Article

1. **Go to any article webpage**
   - Example: https://en.wikipedia.org/wiki/Markdown
   - Or any blog post, news article, documentation page

2. **Click the InkShelf icon** in your toolbar
   - Or use keyboard shortcut: `Ctrl+Shift+M` (Windows/Linux)
   - Or: `Cmd+Shift+M` (Mac)

3. **Click "Capture Article"**
   - Extension will extract and convert the content

4. **See your Markdown!**
   - New tab opens with the article in Markdown format
   - Preview mode shows rendered content
   - Click "Edit" to see the raw Markdown

---

## Basic Features

### Three Capture Modes

| Button | Mode | What It Does |
|--------|------|--------------|
| **Capture Article** | Clean | Removes ads, nav, footers - keeps main content |
| **Capture Selection** | Selection | Captures only highlighted text |
| **Capture Page Snapshot** | Snapshot | Captures full page structure |

### Editor Controls

- **Preview/Edit**: Toggle button to switch modes
- **Download**: Save as `.md` file
- **Copy**: Copy Markdown to clipboard

### Drag & Drop

- Drag any `.md` file into browser window
- InkShelf automatically opens it in editor

---

## Common Use Cases

### For Developers

```
1. Find useful documentation online
2. Click InkShelf icon → Capture Article
3. Click Download
4. Add to your notes/wiki/repository
```

### For Writers

```
1. Research articles online
2. Capture to Markdown
3. Edit and clean up
4. Copy to your writing tool
```

### For Students

```
1. Read online articles
2. Capture important sections (Selection mode)
3. Organize in your note-taking app
```

---

## Tips & Tricks

### Keyboard Shortcut
- `Ctrl+Shift+M` (or `Cmd+Shift+M`) to capture instantly
- No need to click the icon

### Multiple Tabs
- Capture multiple articles
- Each opens in its own editor tab
- Drafts won't interfere with each other

### Preview First
- Always opens in Preview mode
- Review before editing
- Click Edit only when needed

### Quick Export
- Click "Copy" for fastest export
- Paste directly into Obsidian, Notion, VS Code, etc.

---

## Troubleshooting

### Extension won't capture

**Problem**: Clicking capture does nothing  
**Solution**: 
- Refresh the webpage and try again
- Some sites block content scripts
- Try "Capture Selection" instead

### Preview not rendering

**Problem**: Markdown shows as plain text  
**Solution**: 
- Check that `marked.min.js` exists in `libs/` folder
- Reload the extension

### Icons not showing

**Problem**: Extension has no icon  
**Solution**: 
- Icons are created, just reload extension
- Go to `chrome://extensions/` → Click refresh icon

---

## What Next?

1. **Test it out**: Try capturing different types of webpages
2. **Check the docs**: Read [SETUP.md](SETUP.md) for detailed info
3. **Report issues**: Note any bugs for fixing
4. **Customize**: Modify the code as needed

---

## File Locations

If you need to find files:

```
Extension folder: 
C:\Users\user\Documents\GitHub\browser-extension-inkshelf

Main files:
├── manifest.json (extension config)
├── popup.html (popup interface)
├── editor.html (editor interface)
├── content.js (capture logic)
└── libs/ (marked.js, Readability.js)
```

---

## Getting Help

1. **Installation issues**: See [SETUP.md](SETUP.md)
2. **Feature questions**: See [README.md](README.md)
3. **Testing**: See [TESTING.md](TESTING.md)
4. **Technical details**: See [PRD.md](PRD.md)

---

## Enjoy InkShelf! 🎉

You now have a powerful tool to capture web content as clean Markdown.

**Remember**: InkShelf is designed to be a transit tool - capture, review, edit, and export to your preferred apps!
