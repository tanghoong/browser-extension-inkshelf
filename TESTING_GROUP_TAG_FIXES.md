# Testing Guide: Group and Tag Fixes

## Overview
This document provides step-by-step instructions for testing the fixes for document grouping and tag manager issues.

## Fixes Implemented

### 1. Document Grouping Bug Fix
**Problem**: Documents were always defaulting to "default group" instead of the selected group.
**Root Cause**: Inconsistent property naming - code used `group.id` but storage used `groupId`.
**Solution**: Updated all group-related functions to use `groupId` consistently.

### 2. Tag Manager Bug Fix
**Problem**: Tags from markdown frontmatter were not reflecting correctly in the tag manager.
**Root Cause**: Tags were not being extracted from frontmatter automatically and UI wasn't updating properly.
**Solution**: 
- Fixed `saveDraft()` to automatically extract tags from frontmatter
- Fixed tag loading when documents are initialized
- Fixed tag saving to properly sync with frontmatter

## Test Scenarios

### Test 1: Group Creation and Assignment

1. **Load the extension** in Chrome (Developer mode)
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

2. **Create a new group**
   - Open the editor (capture any webpage or open editor.html directly)
   - Click the "New Group" button in the sidebar
   - Enter a group name (e.g., "Tech Articles")
   - Select a color
   - Click "Create"
   - **Expected**: Group appears in the groups list

3. **Assign a document to the group**
   - Capture a webpage or create a new document
   - In the editor, locate the group dropdown (near the top of the page)
   - Select the "Tech Articles" group you just created
   - **Expected**: Document is moved to the selected group
   - **Expected**: The group count in the sidebar updates

4. **Verify group persistence**
   - Close the editor tab
   - Reopen the editor
   - Click on "Tech Articles" group in the sidebar
   - **Expected**: The document you assigned appears in the filtered list

### Test 2: Tag Extraction from Captured Content

1. **Capture a webpage**
   - Navigate to any article page (e.g., a blog post or news article)
   - Click the InkShelf extension icon
   - Click "Capture Article"
   - Wait for the editor to open

2. **Check tag extraction**
   - Look at the tags displayed in the right sidebar (or tags section)
   - **Expected**: You should see at least two tags:
     - `web-capture`
     - The domain name of the captured webpage (e.g., `example.com`)

3. **Verify tags in frontmatter**
   - Switch to "Edit" mode
   - Look at the top of the markdown content
   - **Expected**: You should see YAML frontmatter like:
     ```yaml
     ---
     title: "Article Title"
     date: 2024-01-01
     source: https://example.com/article
     tags:
       - web-capture
       - example.com
     ---
     ```

### Test 3: Manual Tag Management

1. **Add custom tags**
   - Open any document in the editor
   - Locate the tags input field (in the right sidebar or document header)
   - Type a tag name (e.g., "javascript")
   - Press Enter or comma to add the tag
   - **Expected**: Tag badge appears
   - Add 2-3 more tags

2. **Remove a tag**
   - Click the "×" button on any tag badge
   - **Expected**: Tag is removed from the list

3. **Verify tag persistence**
   - Close the editor tab
   - Reopen the same document
   - **Expected**: All tags you added are still there

4. **Check frontmatter sync**
   - Switch to "Edit" mode
   - Look at the frontmatter section
   - **Expected**: All tags appear in the YAML frontmatter under `tags:`

### Test 4: Tag Filtering

1. **Create multiple documents with tags**
   - Capture or create 3-4 different documents
   - Add different combinations of tags to each:
     - Document 1: `javascript`, `tutorial`
     - Document 2: `javascript`, `reference`
     - Document 3: `python`, `tutorial`
     - Document 4: `python`, `reference`

2. **Filter by tag**
   - In the left sidebar, locate the tags list
   - Click on the `javascript` tag
   - **Expected**: Only documents with the `javascript` tag are shown
   - Click on `javascript` again to deselect
   - Click on `tutorial`
   - **Expected**: Only documents with the `tutorial` tag are shown

3. **Multi-tag filtering**
   - Click on `javascript` tag
   - Then click on `tutorial` tag (while `javascript` is still selected)
   - **Expected**: Only Document 1 (which has both tags) is shown

### Test 5: Group and Tag Combination

1. **Create groups with specific purposes**
   - Create group "Work"
   - Create group "Personal"

2. **Organize documents**
   - Assign some documents to "Work" group and tag them with `javascript`, `meeting-notes`
   - Assign some documents to "Personal" group and tag them with `recipes`, `travel`

3. **Test combined filtering**
   - Click on "Work" group
   - **Expected**: Only documents in "Work" group are shown
   - While "Work" is selected, click on `javascript` tag
   - **Expected**: Only documents in "Work" group with `javascript` tag are shown

### Test 6: Edge Cases

1. **Document without frontmatter**
   - Create a new document
   - In Edit mode, clear all content
   - Type some plain text without frontmatter
   - Add tags using the tag input
   - **Expected**: Frontmatter is automatically created with the tags

2. **Document with empty tags**
   - Create a document with frontmatter but no tags
   - Save the document
   - **Expected**: Document saves successfully with empty tags array

3. **Group deletion**
   - Create a group and assign documents to it
   - Delete the group
   - **Expected**: Documents are moved back to "Uncategorized" / "default" group
   - **Expected**: Documents are still accessible

## Common Issues and Troubleshooting

### Issue: Tags not appearing after capture
**Check**: 
- View the document in Edit mode
- Verify frontmatter exists
- Check browser console for any errors

**Solution**: Tags should be extracted automatically. If not, try refreshing the extension.

### Issue: Group selection not persisting
**Check**:
- Verify the group dropdown shows the correct selection
- Check if the document appears in the correct group in the sidebar

**Solution**: This should now be fixed. If still occurring, check browser console for errors.

### Issue: Tag count not updating
**Check**:
- Tags sidebar in the left panel
- Count should update when tags are added/removed

**Solution**: Try clicking on another group/tag and back to refresh the view.

## Verification Checklist

After completing all tests, verify:

- [ ] Groups can be created successfully
- [ ] Documents can be assigned to groups via dropdown
- [ ] Group assignment persists after closing/reopening
- [ ] Tags are automatically extracted from captured webpages
- [ ] Custom tags can be added and removed
- [ ] Tags persist after closing/reopening documents
- [ ] Tags appear correctly in markdown frontmatter
- [ ] Tag filtering works correctly
- [ ] Multi-tag filtering works (AND logic)
- [ ] Group filtering works correctly
- [ ] Combined group + tag filtering works
- [ ] Group deletion moves documents to default group
- [ ] No errors in browser console during normal operation

## Browser Console Debugging

If you encounter issues, check the browser console:

1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors related to:
   - `groupId` or `group.id`
   - Tag extraction
   - Storage operations

## Success Criteria

All tests pass if:
1. Groups work correctly (create, assign, filter, delete)
2. Tags are extracted from frontmatter automatically
3. Tags can be managed manually (add, remove)
4. Tags appear in tag manager sidebar
5. Filtering by groups and tags works as expected
6. No JavaScript errors in console
7. All data persists across browser sessions

## Notes

- The extension uses IndexedDB for storage
- You can inspect IndexedDB in DevTools → Application → IndexedDB → InkShelfDB
- Changes are saved automatically with a 1-second debounce
- Tags are stored both in the document object and in markdown frontmatter
