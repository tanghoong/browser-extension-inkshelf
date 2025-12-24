# InkShelf Testing Checklist

## Pre-Installation Tests

- [ ] All required files present in project directory
- [ ] `libs/marked.min.js` exists
- [ ] `libs/Readability.js` exists
- [ ] All 4 icon files exist (16, 32, 48, 128)
- [ ] `manifest.json` is valid JSON

## Installation Tests

- [ ] Extension loads without errors in Chrome
- [ ] Extension icon appears in toolbar
- [ ] No errors in extension error console
- [ ] Developer mode enabled successfully

## Capture Mode Tests

### Clean Article Mode

- [ ] Click extension icon opens popup
- [ ] Click "Capture Article" button
- [ ] Editor tab opens
- [ ] Article content is extracted correctly
- [ ] Navigation and ads are removed
- [ ] Title is displayed correctly
- [ ] Source URL is shown
- [ ] Content is converted to Markdown
- [ ] Preview mode is active by default

### Selection Only Mode

- [ ] Select text on a webpage
- [ ] Click extension icon
- [ ] Click "Capture Selection"
- [ ] Only selected text is captured
- [ ] Formatting is preserved in Markdown

### Page Snapshot Mode

- [ ] Click extension icon
- [ ] Click "Capture Page Snapshot"
- [ ] Full page structure is captured
- [ ] Headings, lists, and tables preserved

### Keyboard Shortcut

- [ ] Press Ctrl+Shift+M (or Cmd+Shift+M on Mac)
- [ ] Capture initiates without clicking icon
- [ ] Default mode (Clean Article) is used

## Editor Interface Tests

### Preview Mode

- [ ] Preview renders Markdown correctly
- [ ] Headings are styled properly
- [ ] Links are clickable
- [ ] Lists display correctly
- [ ] Tables render properly
- [ ] Code blocks are formatted
- [ ] Images display (if present)
- [ ] Blockquotes are styled
- [ ] Bold and italic text renders correctly

### Edit Mode

- [ ] Click "Edit" button switches to edit mode
- [ ] Button text changes to "Preview"
- [ ] Status bar shows "Edit Mode"
- [ ] Markdown textarea is editable
- [ ] Content matches preview
- [ ] Cursor and typing work correctly
- [ ] Scrolling works smoothly

### Mode Toggle

- [ ] Toggle between Preview and Edit multiple times
- [ ] Content persists across toggles
- [ ] No data loss when switching
- [ ] UI updates correctly

## Editor Functions Tests

### Download Function

- [ ] Click "Download" button in edit mode
- [ ] `.md` file is downloaded
- [ ] Filename is based on article title
- [ ] File contains correct Markdown content
- [ ] Special characters in filename are sanitized

### Copy Function

- [ ] Click "Copy" button
- [ ] Button shows "Copied!" feedback
- [ ] Clipboard contains Markdown content
- [ ] Can paste into other applications
- [ ] Button reverts after 2 seconds

### Word Count

- [ ] Word count displays correctly
- [ ] Updates when editing
- [ ] Shows "0 words" for empty content
- [ ] Singular/plural handled correctly

## Storage Tests

### SessionStorage

- [ ] Edit content in editor
- [ ] Refresh the editor tab
- [ ] Content is preserved (should persist)
- [ ] Unsaved changes are remembered

### IndexedDB

- [ ] Capture content from a page
- [ ] Content is saved to IndexedDB
- [ ] Open browser DevTools → Application → IndexedDB
- [ ] Verify "InkShelfDB" database exists
- [ ] Verify draft is stored with correct doc_id
- [ ] Check timestamp is recorded

### Draft Lifecycle

- [ ] Open editor tab creates draft
- [ ] Editing updates draft
- [ ] Download does NOT clear draft
- [ ] Copy does NOT clear draft
- [ ] Close tab clears session storage
- [ ] IndexedDB entry remains (optional persistence)

## Multi-Tab Tests

### Tab Isolation

- [ ] Capture from page A, opens editor tab 1
- [ ] Capture from page B, opens editor tab 2
- [ ] Both tabs open simultaneously
- [ ] Tab 1 shows content from page A
- [ ] Tab 2 shows content from page B
- [ ] Edit tab 1, verify tab 2 unchanged
- [ ] Edit tab 2, verify tab 1 unchanged

### Duplicate Capture

- [ ] Capture same page twice
- [ ] System should create new tab OR focus existing
- [ ] No data loss or overwriting
- [ ] Warning if duplicate doc_id (optional feature)

### Tab Cleanup

- [ ] Open 3 editor tabs
- [ ] Close tab 2
- [ ] Tabs 1 and 3 still function normally
- [ ] No errors in console
- [ ] Closed tab's data is cleaned up

## Drag & Drop Tests

### Markdown File Drop

- [ ] Create a test `.md` file
- [ ] Drag file into browser window
- [ ] Drop zone overlay appears
- [ ] Release file
- [ ] New editor tab opens
- [ ] File content is loaded correctly
- [ ] Filename becomes document title
- [ ] Preview mode is active

### Invalid File Drop

- [ ] Drag a `.txt` or `.pdf` file
- [ ] System shows error message
- [ ] No editor tab opens
- [ ] Extension remains stable

### Multiple Files

- [ ] Drag multiple `.md` files
- [ ] System handles gracefully (loads first or shows error)

## Edge Cases Tests

### Large Content

- [ ] Capture a very long article (10,000+ words)
- [ ] Editor loads without crashing
- [ ] Scrolling is smooth
- [ ] All content is present
- [ ] Save/load works correctly

### Special Characters

- [ ] Capture content with Unicode characters
- [ ] Emojis render correctly
- [ ] Non-English text (Chinese, Arabic, etc.)
- [ ] Special Markdown characters are escaped

### Empty Content

- [ ] Try to capture page with no content
- [ ] System handles gracefully
- [ ] No JavaScript errors
- [ ] Editor opens with empty or minimal content

### Protected Pages

- [ ] Try capturing chrome:// pages
- [ ] Try capturing extension pages
- [ ] System shows appropriate error or warning

## Performance Tests

- [ ] Extension doesn't slow down browsing
- [ ] Popup opens quickly (<100ms)
- [ ] Capture completes in reasonable time (<2s)
- [ ] Editor loads quickly
- [ ] Preview rendering is fast
- [ ] No memory leaks after multiple captures

## Browser Console Tests

- [ ] Background script console has no errors
- [ ] Content script console has no errors
- [ ] Editor page console has no errors
- [ ] Popup console has no errors

## Compatibility Tests

- [ ] Works on news websites
- [ ] Works on blog posts
- [ ] Works on documentation sites
- [ ] Works on Wikipedia
- [ ] Works on Medium articles
- [ ] Works on GitHub README files

## Offline Tests

- [ ] Disconnect internet
- [ ] Extension functions still work
- [ ] Can edit existing drafts
- [ ] Can toggle preview/edit
- [ ] Can download files
- [ ] Can use drag & drop

## Final Validation

- [ ] No console errors anywhere
- [ ] All features working as expected
- [ ] Extension can be reloaded without issues
- [ ] Documentation is accurate
- [ ] Ready for user testing

---

## Test Results Summary

**Date Tested**: _______________  
**Tester**: _______________  
**Browser Version**: _______________  
**OS**: _______________  

**Total Tests**: 100+  
**Passed**: _____  
**Failed**: _____  
**Blocked**: _____  

**Critical Issues**: _______________  
**Notes**: _______________
