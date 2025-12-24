# InkShelf - Development Setup & Installation Guide

## Prerequisites

- Google Chrome or Chromium-based browser
- Basic command line knowledge
- Internet connection for downloading dependencies

## Step 1: Download Required Libraries

InkShelf uses two third-party libraries that need to be downloaded:

### Option A: Using PowerShell (Windows)

Open PowerShell in the project directory and run:

```powershell
# Download marked.js
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/marked/marked.min.js" -OutFile "libs/marked.min.js"

# Download Readability.js
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/mozilla/readability/main/Readability.js" -OutFile "libs/Readability.js"
```

### Option B: Using curl (Mac/Linux/Git Bash)

```bash
# Download marked.js
curl -o libs/marked.min.js https://cdn.jsdelivr.net/npm/marked/marked.min.js

# Download Readability.js
curl -o libs/Readability.js https://raw.githubusercontent.com/mozilla/readability/main/Readability.js
```

### Option C: Manual Download

1. **marked.js**:
   - Visit: https://cdn.jsdelivr.net/npm/marked/marked.min.js
   - Save as: `libs/marked.min.js`

2. **Readability.js**:
   - Visit: https://github.com/mozilla/readability/blob/main/Readability.js
   - Click "Raw" button
   - Save as: `libs/Readability.js`

## Step 2: Create Icon Files

For development, you need placeholder icons. Create simple PNG files in the `icons/` directory:

- `icon16.png` (16x16px)
- `icon32.png` (32x32px)
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

**Quick Solution**: Use any PNG image and resize it, or use an online icon generator.

## Step 3: Load Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `browser-extension-inkshelf` folder
6. The InkShelf icon should appear in your extensions toolbar

## Step 4: Test the Extension

### Test Capture Mode

1. Navigate to any article webpage (e.g., a blog post or news article)
2. Click the InkShelf extension icon
3. Click "Capture Article"
4. A new editor tab should open with the converted Markdown

### Test Preview/Edit Toggle

1. In the editor, click the "Edit" button
2. Modify the Markdown content
3. Click "Preview" to see the rendered version

### Test Download

1. In edit mode, click "Download"
2. A `.md` file should be saved to your downloads folder

### Test Copy

1. Click "Copy" button
2. Paste into any text editor to verify clipboard functionality

### Test Drag & Drop

1. Save a `.md` file on your computer
2. Drag it into the browser window
3. InkShelf should open it in a new editor tab

## Project Structure

```
browser-extension-inkshelf/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (tab management)
├── content.js            # Content script (page capture)
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── editor.html           # Editor interface
├── editor.js             # Editor functionality
├── editor.css            # Editor styles
├── storage.js            # Storage management (IndexedDB)
├── libs/                 # Third-party libraries
│   ├── marked.min.js     # Markdown renderer
│   ├── Readability.js    # Content extractor
│   └── README.md         # Library documentation
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── README.md
├── PRD.md               # Product requirements
├── README.md            # Project overview
└── SETUP.md             # This file
```

## Troubleshooting

### Extension won't load
- Verify all files are in the correct locations
- Check browser console for errors (`chrome://extensions/` → Details → Errors)
- Ensure `manifest.json` is valid JSON

### Capture fails
- Verify `Readability.js` is downloaded correctly
- Check the webpage allows content scripts
- Try a different capture mode (Selection or Snapshot)

### Preview not rendering
- Verify `marked.min.js` is downloaded correctly
- Check browser console for JavaScript errors
- Ensure the file is named exactly `marked.min.js`

### Icons not showing
- Create placeholder PNG files in `icons/` directory
- Verify filenames match exactly (case-sensitive)
- Reload the extension after adding icons

## Development Tips

### Reload Extension After Changes

When you modify code:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the InkShelf card
3. Test your changes

### View Console Logs

- **Background script**: `chrome://extensions/` → Details → Inspect views: background page
- **Content script**: Right-click page → Inspect → Console
- **Editor**: Right-click editor tab → Inspect → Console

### Debug Issues

1. Check all console logs
2. Verify file paths in `manifest.json`
3. Ensure permissions are correctly set
4. Test in incognito mode to rule out conflicts

## Next Steps

Once the extension is working:

1. **Create proper icons** - Design professional-looking icons for the extension
2. **Test extensively** - Try different websites and edge cases
3. **Add features** - Refer to the PRD.md for future enhancements
4. **Package for distribution** - Prepare for Chrome Web Store submission

## Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Review the PRD.md for expected behavior
3. Verify all dependencies are correctly installed
4. Test in a clean browser profile

## License

MIT License - See main README.md for details
