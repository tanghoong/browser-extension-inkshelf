# AI Features Testing Guide

## Quick Test Checklist

### Prerequisites
- [ ] Chrome/Edge version 128 or higher
- [ ] AI flags enabled in chrome://flags (if needed)
- [ ] Extension loaded/updated

### Test 1: Settings Page
1. Open InkShelf settings
2. **Expected**: "AI Features (Chrome 128+)" section visible
3. **Expected**: AI Status shows one of:
   - "Available: Summarizer, Translator, Language Detector"
   - "Not available. Requires Chrome 128+..."
   - "AI APIs detected but not ready..."
4. Toggle AI Features ON
5. **Expected**: Setting saved (refresh and check toggle stays ON)

### Test 2: Editor UI (AI Enabled)
1. Open editor page
2. **Expected**: Three new buttons visible in toolbar:
   - [Summarize]
   - [Detect Lang]
   - [Translate ▼]
3. **Expected**: Buttons appear between "Preview" and "Copy"

### Test 3: Summarization
1. Capture or paste content into editor (at least a paragraph)
2. Click "Summarize" button
3. **Expected**: 
   - Button shows loading spinner
   - Summary card appears above metadata bar
   - Summary text generated (may take 2-5 seconds)
   - Success toast notification
4. Click × to close summary
5. **Expected**: Summary card hidden

### Test 4: Language Detection
1. Have content in editor (any language)
2. Click "Detect Lang" button
3. **Expected**:
   - Button shows loading spinner briefly
   - Language badge appears (e.g., "EN")
   - Toast shows "Language detected: EN (95% confidence)"
   - Success feedback on button

### Test 5: Translation
1. Ensure content is in editor
2. Click "Translate" dropdown
3. **Expected**: Language menu shows 8 options
4. Select "Spanish" (or any language)
5. **Expected**:
   - Translation modal opens
   - Loading indicator visible
   - Translation appears (may take 3-10 seconds)
   - Modal shows "Translated from EN to ES"
6. Click "Copy Translation"
7. **Expected**: Toast "Translation copied to clipboard"
8. Paste clipboard content - should match translation
9. Click "Open in New Tab"
10. **Expected**: New tab opens with formatted translation
11. Close modal with × or "Close" button

### Test 6: Error Handling
1. Clear editor content (empty document)
2. Click "Summarize"
3. **Expected**: Warning toast "no content to summarize"
4. Add content, disconnect network (if possible)
5. Click "Summarize"
6. **Expected**: Works offline (AI is on-device)

### Test 7: AI Disabled State
1. Go to settings
2. Toggle AI Features OFF
3. Return to editor
4. **Expected**: AI buttons hidden
5. Re-enable AI in settings
6. Refresh editor
7. **Expected**: AI buttons reappear

### Test 8: Combined Workflow
1. Capture a news article
2. Click "Detect Lang" → verify language
3. Click "Summarize" → read summary
4. Click "Translate" → select target language
5. Copy or open translation
6. **Expected**: All features work smoothly together

## Sample Test Content

### English (for testing)
```
The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for testing purposes. Artificial intelligence has revolutionized the way we interact with technology, making complex tasks simpler and more accessible to everyone.
```

### Spanish (for language detection)
```
El rápido zorro marrón salta sobre el perro perezoso. Esta oración contiene todas las letras del alfabeto español y se usa comúnmente para pruebas.
```

### French (for language detection)
```
Le rapide renard brun saute par-dessus le chien paresseux. Cette phrase est couramment utilisée pour tester les systèmes.
```

## Expected Behavior Matrix

| Action | Content State | AI Enabled | Expected Result |
|--------|--------------|------------|-----------------|
| Click Summarize | Has content | Yes | Summary generated |
| Click Summarize | Empty | Yes | Warning toast |
| Click Summarize | Has content | No | Button hidden |
| Click Detect Lang | Has content | Yes | Language badge shown |
| Click Translate | Has content | Yes | Modal opens with translation |
| Translation → Copy | After translate | Yes | Clipboard has translation |
| Translation → New Tab | After translate | Yes | New tab with formatted text |

## Known Chrome Flags to Check

If AI features not working, enable these in `chrome://flags`:

1. **Optimization Guide On Device Model**
   - Flag: `#optimization-guide-on-device-model`
   - Set to: `Enabled BypassPerfRequirement`

2. **Prompt API for Gemini Nano**
   - Flag: `#prompt-api-for-gemini-nano`
   - Set to: `Enabled`

3. **Summarization API**
   - Flag: `#summarization-api-for-gemini-nano`
   - Set to: `Enabled`

4. **Translation API**
   - Flag: `#translation-api`
   - Set to: `Enabled`

5. **Language Detection API**
   - Flag: `#language-detection-api`
   - Set to: `Enabled`

**After changing flags**: Restart Chrome completely

## Component Check in chrome://components

Look for "Optimization Guide On Device Model" - should show version number and status "Up to date"

If status is "Component not updated" or missing:
1. Click "Check for update"
2. Wait for download (can be ~100-500MB)
3. Restart Chrome

## Debugging Tips

### Check Browser Console
Open DevTools → Console while testing:
- Look for "Summarizer check failed" or similar
- Check for JavaScript errors
- Verify AI capabilities logged at startup

### Verify Settings Storage
In DevTools → Application → Local Storage:
- `inkshelf-ai-enabled` should be "true" when enabled
- Check value persists after reload

### Network Tab
- Should see NO network requests during AI operations
- Everything happens on-device

### Test in Incognito
- Open extension in incognito mode (with extension access enabled)
- Verify settings persist in incognito session

## Performance Benchmarks

| Operation | Expected Time | Notes |
|-----------|--------------|-------|
| Summarize 500 words | 2-3 seconds | First run may be slower |
| Summarize 2000 words | 4-6 seconds | Depends on complexity |
| Detect Language | < 1 second | Very fast |
| Translate 500 words | 3-5 seconds | Varies by language pair |
| Translate 2000 words | 8-12 seconds | May timeout if too long |

## Report Issues

If testing reveals problems, note:
1. Chrome version (`chrome://version`)
2. Which AI feature failed
3. Error message from console
4. Content length/type being tested
5. Flags enabled in chrome://flags
6. Component status in chrome://components

---

**Happy Testing! 🎉**
