// Editor Script for InkShelf
// Handles editor UI, preview/edit toggle, and file operations

let currentDocId = null;
let currentContent = '';
let currentTitle = '';
let originalTitle = ''; // Track original title before editing
let currentUrl = '';
let viewMode = 'preview'; // 'preview', 'edit', 'split'
let savedDocuments = [];
let isScrollSyncing = false; // Prevent scroll feedback loop
let hasUnsavedChanges = false; // Track unsaved changes
let wordWrapEnabled = true; // Word wrap state
let autoSaveEnabled = true; // Auto-save state

// DOM elements
const previewPanel = document.getElementById('previewPanel');
const editPanel = document.getElementById('editPanel');
const mainContent = document.getElementById('mainContent');
const previewContent = document.getElementById('previewContent');
const markdownEditor = document.getElementById('markdownEditor');
const viewModeToggle = document.getElementById('viewModeToggle');
const viewModeLabel = document.getElementById('viewModeLabel');
const downloadBtn = document.getElementById('downloadMarkdownBtn');
const copyBtn = document.getElementById('copyBtn');
const shareBtn = document.getElementById('shareBtn');
const shareDropdownMenu = document.getElementById('shareDropdownMenu');
const shareThirdPartyBtn = document.getElementById('shareThirdPartyBtn');
const saveBtn = document.getElementById('saveBtn');
const docTitle = document.getElementById('docTitle');
const titleActions = document.getElementById('titleActions');
const titleSaveBtn = document.getElementById('titleSaveBtn');
const titleCancelBtn = document.getElementById('titleCancelBtn');
const sourceUrl = document.getElementById('sourceUrl');
const statusText = document.getElementById('statusText');
const wordCount = document.getElementById('wordCount');
const dropZone = document.getElementById('dropZone');
const emptyStateContainer = document.getElementById('emptyStateContainer');
const headerMeta = document.getElementById('headerMeta');
const optionsBtn = document.getElementById('optionsBtn');
const optionsDropdownMenu = document.getElementById('optionsDropdownMenu');
const settingsMenuItem = document.getElementById('settingsMenuItem');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarToggleFloat = document.getElementById('sidebarToggleFloat');
const newDocBtn = document.getElementById('newDocBtn');
const documentList = document.getElementById('documentList');
const sidebarRight = document.getElementById('sidebarRight');
const sidebarRightToggle = document.getElementById('sidebarRightToggle');
const sidebarRightToggleFloat = document.getElementById('sidebarRightToggleFloat');
const wordWrapToggle = document.getElementById('wordWrapToggle');
const wordWrapLabel = document.getElementById('wordWrapLabel');
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');
const autoSaveToggle = document.getElementById('autoSaveToggle');
const autoSaveLabel = document.getElementById('autoSaveLabel');

// Initialize editor
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  applySettings();
  setupEventListeners();
  setupDragAndDrop();
  initializeWordWrap();
  initializeAutoSave();
  updateThemeLabel();
  
  // Initialize AI Manager
  initializeAI();
  
  // Show empty state initially
  showEmptyState();
  
  // Configure marked.js
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }
});

// Listen for initialization message from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INIT_EDITOR') {
    initializeEditor(message.data);
    sendResponse({ success: true });
  }
  return true;
});

/**
 * Initialize editor with captured content
 * @param {Object} data - Document data
 */
async function initializeEditor(data) {
  currentDocId = data.docId;
  currentContent = data.content || '';
  currentTitle = data.title || 'Untitled';
  originalTitle = currentTitle; // Store original title
  currentUrl = data.url || '';
  const isNewCapture = data.isNewCapture || false;
  
  // Hide empty state and show document UI
  hideEmptyState();
  
  // Update UI
  docTitle.textContent = currentTitle;
  docTitle.setAttribute('contenteditable', 'true');
  sourceUrl.textContent = currentUrl;
  
  // Check for existing draft in session storage
  const sessionContent = storageManager.getFromSession(currentDocId);
  let savedDraft = null;
  if (sessionContent) {
    currentContent = sessionContent;
    // Still fetch the draft to get metadata
    savedDraft = await storageManager.getDraft(currentDocId);
  } else {
    // Check IndexedDB for existing draft
    savedDraft = await storageManager.getDraft(currentDocId);
    if (savedDraft) {
      currentContent = savedDraft.content;
    }
  }
  
  // Set editor content
  markdownEditor.value = currentContent;
  
  // Parse YAML front matter to update UI metadata
  if (currentContent && currentContent.trim()) {
    await parseAndUpdateMetadata(currentContent);
  }
  
  // Reset unsaved changes flag
  hasUnsavedChanges = false;
  updateSaveButtonVisibility();
  
  // Render preview
  renderPreview();
  
  // Save to IndexedDB, preserving existing metadata if available
  const savedDoc = await storageManager.saveDraft({
    ...savedDraft,  // Preserve existing metadata (groupId, starred, syncedAt, etc.)
    docId: currentDocId,
    content: currentContent,
    title: currentTitle,
    url: currentUrl,
    mode: data.mode
  });
  
  // Load document tags and group info from the saved document
  if (savedDoc) {
    loadDocumentTags(savedDoc);
    
    // Update group select
    if (groupSelect) {
      groupSelect.value = savedDoc.groupId || '';
    }
  }
  
  // Set to preview mode for newly captured content
  if (isNewCapture && currentContent && currentContent.trim()) {
    setViewMode('preview');
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Options dropdown
  optionsBtn.addEventListener('click', toggleOptionsDropdown);
  settingsMenuItem.addEventListener('click', openSettings);
  
  // View mode toggle - cycle through modes
  viewModeToggle.addEventListener('click', toggleViewMode);
  
  // Sidebar
  sidebarToggle.addEventListener('click', toggleSidebar);
  sidebarToggleFloat.addEventListener('click', toggleSidebar);
  newDocBtn.addEventListener('click', createNewDocument);
  
  // Right Sidebar
  if (sidebarRightToggle) sidebarRightToggle.addEventListener('click', toggleRightSidebar);
  if (sidebarRightToggleFloat) sidebarRightToggleFloat.addEventListener('click', toggleRightSidebar);
  if (rightSidebarBtn) rightSidebarBtn.addEventListener('click', toggleRightSidebar);
  
  // Word wrap toggle
  if (wordWrapToggle) {
    wordWrapToggle.addEventListener('click', toggleWordWrap);
  }
  
  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      toggleTheme();
      updateThemeLabel();
    });
  }
  
  // Auto-save toggle
  if (autoSaveToggle) {
    autoSaveToggle.addEventListener('click', toggleAutoSave);
  }
  
  // Document actions
  if (saveBtn) saveBtn.addEventListener('click', saveDocument);
  if (downloadBtn) downloadBtn.addEventListener('click', downloadMarkdown);
  if (copyBtn) copyBtn.addEventListener('click', copyMarkdown);
  
  // Share dropdown
  if (shareBtn) shareBtn.addEventListener('click', toggleShareDropdown);
  if (shareThirdPartyBtn) {
    shareThirdPartyBtn.addEventListener('click', () => {
      alert('Third-party sharing will be configured in Settings. This feature is coming soon!');
    });
  }
  
  // Close share dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.share-dropdown') && shareDropdownMenu) {
      shareDropdownMenu.classList.remove('show');
    }
    if (!e.target.closest('.options-dropdown') && optionsDropdownMenu) {
      optionsDropdownMenu.classList.remove('show');
    }
  });
  
  // Auto-save on content change
  if (markdownEditor) {
    markdownEditor.addEventListener('input', handleContentChange);
    
    // Auto-update preview in split mode
    markdownEditor.addEventListener('input', () => {
      if (viewMode === 'split') {
        renderPreview();
      }
    });
    
    // Synchronized scrolling in split mode with debouncing
    markdownEditor.addEventListener('scroll', () => {
      if (viewMode === 'split' && !isScrollSyncing) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          syncScroll('edit');
        }, 10);
      }
    });
  }
  // Synchronized scrolling for preview panel
  let scrollTimeout;
  if (previewPanel) {
    previewPanel.addEventListener('scroll', () => {
      if (viewMode === 'split' && !isScrollSyncing) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          syncScroll('preview');
        }, 10);
      }
    });
  }
  
  // Handle title editing
  if (docTitle) {
    // Show action buttons on focus
    docTitle.addEventListener('focus', () => {
      originalTitle = docTitle.textContent.trim();
      if (titleActions) {
        titleActions.style.display = 'flex';
      }
    });
    
    // Hide action buttons on blur (with delay to allow button clicks)
    docTitle.addEventListener('blur', () => {
      setTimeout(() => {
        if (titleActions && !titleActions.matches(':hover')) {
          titleActions.style.display = 'none';
        }
      }, 200);
    });
    
    // Handle Enter key in title (save instead of new line)
    docTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveTitleChange();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelTitleChange();
      }
    });
  }
  
  // Title save button
  if (titleSaveBtn) {
    titleSaveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      saveTitleChange();
    });
  }
  
  // Title cancel button
  if (titleCancelBtn) {
    titleCancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      cancelTitleChange();
    });
  }
  
  // Handle tab close
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Load saved documents
  loadSavedDocuments();
  
  // AI Assistant event listeners
  setupAIEventListeners();
  
  // Listen for settings changes from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('inkshelf-')) {
      applySettings();
    }
  });
}

/**
 * Save title change
 */
function saveTitleChange() {
  const newTitle = docTitle.textContent.trim();
  if (newTitle && newTitle !== currentTitle) {
    currentTitle = newTitle;
    originalTitle = newTitle;
    // Auto-save when title changes
    if (currentDocId) {
      saveDocument();
    }
  }
  // Hide action buttons
  if (titleActions) {
    titleActions.style.display = 'none';
  }
  docTitle.blur();
}

/**
 * Cancel title change
 */
function cancelTitleChange() {
  // Restore original title
  docTitle.textContent = originalTitle || currentTitle;
  // Hide action buttons
  if (titleActions) {
    titleActions.style.display = 'none';
  }
  docTitle.blur();
}

/**
 * Show empty state when no document is selected
 */
function showEmptyState() {
  if (emptyStateContainer) {
    emptyStateContainer.style.display = 'flex';
  }
  // Hide document-related elements
  const header = document.querySelector('.header');
  const statusBar = document.querySelector('.status-bar');
  if (header) header.style.display = 'none';
  if (statusBar) statusBar.style.display = 'none';
  if (headerMeta) headerMeta.style.display = 'none';
  if (editPanel) editPanel.style.display = 'none';
  if (previewPanel) previewPanel.style.display = 'none';
}

/**
 * Hide empty state when a document is selected
 */
function hideEmptyState() {
  if (emptyStateContainer) {
    emptyStateContainer.style.display = 'none';
  }
  // Show document-related elements
  const header = document.querySelector('.header');
  const statusBar = document.querySelector('.status-bar');
  if (header) header.style.display = 'flex';
  if (statusBar) statusBar.style.display = 'flex';
  if (headerMeta) headerMeta.style.display = 'flex';
}

/**
 * Toggle view mode (cycle through preview -> edit -> split -> preview)
 */
function toggleViewMode() {
  const modes = ['preview', 'edit', 'split'];
  const currentIndex = modes.indexOf(viewMode);
  const nextIndex = (currentIndex + 1) % modes.length;
  setViewMode(modes[nextIndex]);
}

/**
 * Set view mode (preview, edit, or split)
 */
function setViewMode(mode) {
  viewMode = mode;
  
  // Update button icon and label
  const icons = {
    preview: `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `,
    edit: `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `,
    split: `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="12" y1="3" x2="12" y2="21"></line>
      </svg>
    `
  };
  
  const labels = {
    preview: 'Preview',
    edit: 'Edit',
    split: 'Split'
  };
  
  viewModeToggle.innerHTML = icons[mode] + '<span id="viewModeLabel">' + labels[mode] + '</span>';
  viewModeToggle.title = `Current: ${labels[mode]} (click to cycle)`;
  
  if (mode === 'preview') {
    mainContent.classList.remove('split-view');
    previewPanel.style.display = 'block';
    editPanel.style.display = 'none';
    statusText.textContent = 'Preview Mode';
    renderPreview();
  } else if (mode === 'edit') {
    mainContent.classList.remove('split-view');
    previewPanel.style.display = 'none';
    editPanel.style.display = 'block';
    statusText.textContent = 'Edit Mode';
    markdownEditor.focus();
  } else if (mode === 'split') {
    mainContent.classList.add('split-view');
    editPanel.style.display = 'block';
    previewPanel.style.display = 'block';
    statusText.textContent = 'Split View';
    renderPreview();
  }
}

/**
 * Toggle share dropdown menu
 */
function toggleShareDropdown(e) {
  e.stopPropagation();
  shareDropdownMenu.classList.toggle('show');
}

/**
 * Toggle options dropdown menu
 */
function toggleOptionsDropdown(e) {
  e.stopPropagation();
  optionsDropdownMenu.classList.toggle('show');
}

/**
 * Open settings page
 */
function openSettings() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('settings.html'),
    active: true
  });
  optionsDropdownMenu.classList.remove('show');
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
  const isCollapsed = sidebar.classList.toggle('collapsed');
  
  // Show/hide floating toggle button
  if (isCollapsed) {
    sidebarToggleFloat.style.display = 'flex';
  } else {
    sidebarToggleFloat.style.display = 'none';
  }
}

/**
 * Toggle right sidebar visibility
 */
function toggleRightSidebar() {
  const isCollapsed = sidebarRight.classList.toggle('collapsed');
  
  // Show/hide floating toggle button
  if (isCollapsed) {
    sidebarRightToggleFloat.style.display = 'flex';
  } else {
    sidebarRightToggleFloat.style.display = 'none';
  }
}

/**
 * Synchronize scroll position between edit and preview panels
 * @param {string} source - Which panel triggered the scroll ('edit' or 'preview')
 */
function syncScroll(source) {
  isScrollSyncing = true;
  
  requestAnimationFrame(() => {
    if (source === 'edit') {
      // Calculate edit panel scroll percentage
      const editScrollTop = markdownEditor.scrollTop;
      const editScrollHeight = markdownEditor.scrollHeight - markdownEditor.clientHeight;
      const scrollPercentage = editScrollHeight > 0 ? editScrollTop / editScrollHeight : 0;
      
      // Apply to preview panel with smooth scroll
      const previewScrollHeight = previewPanel.scrollHeight - previewPanel.clientHeight;
      const targetScroll = scrollPercentage * previewScrollHeight;
      previewPanel.scrollTo({
        top: targetScroll,
        behavior: 'auto'
      });
    } else if (source === 'preview') {
      // Calculate preview panel scroll percentage
      const previewScrollTop = previewPanel.scrollTop;
      const previewScrollHeight = previewPanel.scrollHeight - previewPanel.clientHeight;
      const scrollPercentage = previewScrollHeight > 0 ? previewScrollTop / previewScrollHeight : 0;
      
      // Apply to edit panel with smooth scroll
      const editScrollHeight = markdownEditor.scrollHeight - markdownEditor.clientHeight;
      const targetScroll = scrollPercentage * editScrollHeight;
      markdownEditor.scrollTo({
        top: targetScroll,
        behavior: 'auto'
      });
    }
    
    // Reset flag after animation frame
    setTimeout(() => {
      isScrollSyncing = false;
    }, 100);
  });
}

/**
 * Create new document
 */
function createNewDocument() {
  const newDocId = StorageManager.generateTempDocId();
  const newDoc = {
    docId: newDocId,
    content: '',
    title: 'Untitled',
    url: '',
    mode: 'new',
    timestamp: Date.now()
  };
  
  initializeEditor(newDoc);
  setViewMode('edit');
}

/**
 * Render markdown preview
 */
function renderPreview() {
  if (typeof marked !== 'undefined') {
    previewContent.innerHTML = marked.parse(currentContent);
  } else {
    // Fallback if marked.js is not loaded
    previewContent.innerHTML = `<pre>${escapeHtml(currentContent)}</pre>`;
  }
  
  updateWordCount();
}

/**
 * Handle content change in editor
 */
async function handleContentChange() {
  const newContent = markdownEditor.value;
  
  // Track if content has changed
  if (newContent !== currentContent) {
    hasUnsavedChanges = true;
    updateSaveButtonVisibility();
  }
  
  currentContent = newContent;
  
  // Parse frontmatter and update UI
  parseFrontmatterAndUpdateUI(currentContent);
  
  // Save to session storage
  storageManager.saveToSession(currentDocId, currentContent);
  
  // Check if auto-save is enabled
  if (autoSaveEnabled) {
    // Show saving indicator
    showAutoSaveStatus('saving');
    
    // Debounced save to IndexedDB
    clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(async () => {
      await storageManager.saveDraft({
        docId: currentDocId,
        content: currentContent,
        title: currentTitle,
        url: currentUrl
      });
      
      // Show saved indicator
      showAutoSaveStatus('saved');
      
      // Clear saved indicator after 2 seconds
      setTimeout(() => {
        showAutoSaveStatus('idle');
      }, 2000);
    }, 1000);
  }
  
  updateWordCount();
}

/**
 * Update word count display
 */
function updateWordCount() {
  const text = currentContent.trim();
  const words = text ? text.split(/\s+/).length : 0;
  wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
}

/**
 * Parse frontmatter from markdown and update UI
 */
function parseFrontmatterAndUpdateUI(content) {
  // Check if content has frontmatter (starts with ---)
  if (!content.trim().startsWith('---')) {
    return;
  }
  
  const lines = content.split('\n');
  let frontmatterEnd = -1;
  
  // Find the end of frontmatter
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      frontmatterEnd = i;
      break;
    }
  }
  
  if (frontmatterEnd === -1) {
    return;
  }
  
  // Parse frontmatter lines
  const frontmatterLines = lines.slice(1, frontmatterEnd);
  const frontmatter = {};
  
  for (const line of frontmatterLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }
  
  // Update title if present
  if (frontmatter.title && docTitle) {
    const newTitle = frontmatter.title.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (newTitle !== currentTitle) {
      currentTitle = newTitle;
      originalTitle = newTitle;
      docTitle.textContent = newTitle;
    }
  }
  
  // Update source URL if present
  if (frontmatter.source && sourceUrl) {
    const newUrl = frontmatter.source.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (newUrl !== currentUrl) {
      currentUrl = newUrl;
      sourceUrl.textContent = newUrl;
    }
  }
  
  // Update tags if present
  if (frontmatter.tags) {
    const tagsStr = frontmatter.tags.replace(/^\[|\]$/g, '').replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
    
    if (tags.length > 0) {
      // Clear existing tags
      const tagsDisplay = document.getElementById('tagsDisplay');
      if (tagsDisplay) {
        tagsDisplay.innerHTML = '';
        
        // Add tags to UI
        tags.forEach(tag => {
          const tagBadge = document.createElement('span');
          tagBadge.className = 'tag-badge';
          tagBadge.innerHTML = `
            ${escapeHtml(tag)}
            <button class="remove-tag" data-tag="${escapeHtml(tag)}" aria-label="Remove tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          `;
          tagsDisplay.appendChild(tagBadge);
        });
      }
    }
  }
}

/**
 * Show auto-save status indicator
 */
function showAutoSaveStatus(status) {
  if (!statusText) return;
  
  switch (status) {
    case 'saving':
      statusText.textContent = 'Saving...';
      statusText.style.color = '#f39c12';
      break;
    case 'saved':
      statusText.textContent = 'Saved';
      statusText.style.color = '#28a745';
      break;
    case 'idle':
    default:
      // Restore to view mode indicator
      if (viewMode === 'preview') {
        statusText.textContent = 'Preview Mode';
      } else if (viewMode === 'edit') {
        statusText.textContent = 'Edit Mode';
      } else {
        statusText.textContent = 'Split Mode';
      }
      statusText.style.color = '';
      break;
  }
}

/**
 * Download markdown file
 */
function downloadMarkdown() {
  const content = markdownEditor.value;
  const filename = sanitizeFilename(currentTitle) + '.md';
  
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Copy markdown to clipboard
 */
async function copyMarkdown() {
  const content = markdownEditor.value;
  
  try {
    await navigator.clipboard.writeText(content);
    showToast('success', 'Markdown copied to clipboard');
  } catch (error) {
    console.error('Failed to copy:', error);
    showToast('error', 'Failed to copy to clipboard');
  }
}

/**
 * Initialize theme based on system preference or saved preference
 */
function initializeTheme() {
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('inkshelf-theme');
  
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Auto-detect system theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('inkshelf-theme')) {
      const theme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
    }
  });
}

/**
 * Apply settings from localStorage
 */
function applySettings() {
  // Apply font size
  const fontSize = localStorage.getItem('inkshelf-fontsize') || 'medium';
  applyFontSize(fontSize);
  
  // Apply word count visibility
  const showWordCount = localStorage.getItem('inkshelf-wordcount') !== 'false';
  if (wordCount) {
    wordCount.style.display = showWordCount ? 'block' : 'none';
  }
}

/**
 * Apply font size to editor and preview
 */
function applyFontSize(size) {
  const sizes = {
    small: { editor: '13px', preview: '14px', lineHeight: '1.5' },
    medium: { editor: '14px', preview: '15px', lineHeight: '1.6' },
    large: { editor: '16px', preview: '17px', lineHeight: '1.7' }
  };
  
  const config = sizes[size] || sizes.medium;
  
  if (markdownEditor) {
    markdownEditor.style.fontSize = config.editor;
    markdownEditor.style.lineHeight = config.lineHeight;
  }
  
  if (previewContent) {
    previewContent.style.fontSize = config.preview;
    previewContent.style.lineHeight = config.lineHeight;
  }
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('inkshelf-theme', newTheme);
}

/**
 * Setup drag and drop for markdown files
 */
function setupDragAndDrop() {
  let dragCounter = 0;
  
  // Handle drag enter - only show drop zone for external files
  document.body.addEventListener('dragenter', (e) => {
    // Check if this is an internal document drag
    if (isInternalDocumentDrag(e)) {
      return;
    }
    
    dragCounter++;
    if (dragCounter === 1) {
      dropZone.style.display = 'flex';
    }
  }, false);
  
  // Handle drag over - only for external files
  document.body.addEventListener('dragover', (e) => {
    // Check if this is an internal document drag
    if (isInternalDocumentDrag(e)) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
  }, false);
  
  // Handle drag leave
  document.body.addEventListener('dragleave', (e) => {
    // Check if this is an internal document drag
    if (isInternalDocumentDrag(e)) {
      return;
    }
    
    dragCounter--;
    if (dragCounter === 0) {
      dropZone.style.display = 'none';
    }
  }, false);
  
  // Handle dropped files - only for external files
  document.body.addEventListener('drop', (e) => {
    // Check if this is an internal document drag
    if (isInternalDocumentDrag(e)) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter = 0;
    dropZone.style.display = 'none';
    handleFileDrop(e);
  }, false);
}

/**
 * Check if drag event is from internal document dragging
 */
function isInternalDocumentDrag(e) {
  // Check if dataTransfer contains our document identifier
  const types = e.dataTransfer.types;
  return types.includes('application/inkshelf-document');
}

/**
 * Prevent default drag behaviors (removed - now handled conditionally)
 */
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Handle file drop (external .md files)
 */
async function handleFileDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  
  if (files.length > 0) {
    const file = files[0];
    
    // Check if it's a markdown file
    if (file.name.endsWith('.md') || file.type === 'text/markdown') {
      await loadMarkdownFile(file);
    } else {
      alert('Please drop a .md (Markdown) file');
    }
  }
}

/**
 * Load markdown file
 * @param {File} file - Markdown file
 */
async function loadMarkdownFile(file) {
  try {
    const content = await file.text();
    const docId = StorageManager.generateFileDocId(file);
    
    // Check if this file is already open
    if (docId === currentDocId) {
      // Just update content
      currentContent = content;
      markdownEditor.value = content;
      renderPreview();
      return;
    }
    
    // Open in new tab
    chrome.runtime.sendMessage({
      type: 'OPEN_EDITOR',
      data: {
        docId: docId,
        content: content,
        title: file.name.replace('.md', ''),
        url: '',
        mode: 'file',
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Failed to load file:', error);
    alert('Failed to load markdown file');
  }
}

/**
 * Handle before unload (tab close)
 */
function handleBeforeUnload(e) {
  // Clear session storage on tab close
  if (currentDocId) {
    storageManager.clearSession(currentDocId);
  }
}

/**
 * Sanitize filename
 * @param {string} name - Filename
 */
function sanitizeFilename(name) {
  return name
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'untitled';
}

/**
 * Escape HTML
 * @param {string} text - Text to escape
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Load saved documents from storage
 */
async function loadSavedDocuments() {
  savedDocuments = await storageManager.getAllDrafts();
  // Sort: starred first, then by updatedAt descending (most recent first)
  savedDocuments.sort((a, b) => {
    // Starred documents always come first
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    // Within same starred status, sort by date
    return (b.updatedAt || b.timestamp) - (a.updatedAt || a.timestamp);
  });
  renderDocumentList();
  updateDocumentCounts();
  renderGroupsList();
  updateTagsSidebar();
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  if (weeks < 4) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

/**
 * Render document list in sidebar
 */
function renderDocumentList() {
  if (savedDocuments.length === 0) {
    documentList.innerHTML = '<p class="empty-state">No saved documents yet</p>';
    return;
  }
  
  documentList.innerHTML = '';
  
  savedDocuments.forEach(doc => {
    const item = document.createElement('div');
    item.className = 'document-item';
    if (doc.docId === currentDocId) {
      item.classList.add('active');
    }
    
    // Make item draggable
    item.draggable = true;
    item.dataset.docId = doc.docId;
    
    const timeAgo = formatRelativeTime(doc.updatedAt || doc.timestamp);
    const starIcon = doc.starred ? '\u2605' : '\u2606';
    const starClass = doc.starred ? 'starred' : '';
    const starIndicator = doc.starred ? '<span class="star-indicator" title="Starred">★</span>' : '';
    
    item.innerHTML = `
      <div class="document-item-content">
        <div class="document-item-header">
          ${starIndicator}
          <div class="document-item-title">${escapeHtml(doc.title)}</div>
        </div>
        <div class="document-item-meta">${timeAgo}</div>
      </div>
      <div class="document-item-menu">
        <button class="document-menu-btn" title="More options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
        <div class="document-menu-dropdown">
          <button class="menu-item star-btn ${starClass}" data-doc-id="${escapeHtml(doc.docId)}">
            <span class="star-icon">${starIcon}</span>
            <span>${doc.starred ? 'Unstar' : 'Star'}</span>
          </button>
          <button class="menu-item delete-btn" data-doc-id="${escapeHtml(doc.docId)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          </button>
        </div>
      </div>
    `;
    
    // Click on item to load document
    const contentArea = item.querySelector('.document-item-content');
    contentArea.addEventListener('click', () => {
      loadDocument(doc.docId);
    });
    
    // Menu button toggle
    const menuBtn = item.querySelector('.document-menu-btn');
    const menuDropdown = item.querySelector('.document-menu-dropdown');
    
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other open menus
      document.querySelectorAll('.document-menu-dropdown.show').forEach(menu => {
        if (menu !== menuDropdown) {
          menu.classList.remove('show');
        }
      });
      menuDropdown.classList.toggle('show');
    });
    
    // Star button
    const starBtn = item.querySelector('.star-btn');
    starBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleStarDocument(doc.docId);
      menuDropdown.classList.remove('show');
    });
    
    // Delete button
    const deleteBtn = item.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteDocumentFromList(doc.docId);
      menuDropdown.classList.remove('show');
    });
    
    // Drag event handlers
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
    
    documentList.appendChild(item);
  });
  
  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.document-item-menu')) {
      document.querySelectorAll('.document-menu-dropdown.show').forEach(menu => {
        menu.classList.remove('show');
      });
    }
  });
  
  // Setup trash zone if not already created
  setupTrashZone();
}

/**
 * Setup trash zone for drag-and-drop delete
 */
function setupTrashZone() {
  let trashZone = document.getElementById('trashZone');
  
  if (!trashZone) {
    trashZone = document.createElement('div');
    trashZone.id = 'trashZone';
    trashZone.className = 'trash-zone';
    trashZone.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
      <span>Drag here to trash</span>
    `;
    sidebar.appendChild(trashZone);
    
    // Trash zone drag events
    trashZone.addEventListener('dragover', handleTrashDragOver);
    trashZone.addEventListener('dragleave', handleTrashDragLeave);
    trashZone.addEventListener('drop', handleTrashDrop);
  }
}

let draggedDocId = null;

/**
 * Handle drag start
 */
function handleDragStart(e) {
  draggedDocId = e.target.dataset.docId;
  e.target.classList.add('dragging');
  
  // Set specific identifier for document dragging
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('application/inkshelf-document', draggedDocId);
  e.dataTransfer.setData('text/plain', draggedDocId);
  
  // Show trash zone
  const trashZone = document.getElementById('trashZone');
  if (trashZone) {
    trashZone.classList.add('active');
  }
}

/**
 * Handle drag end
 */
function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  
  // Hide trash zone
  const trashZone = document.getElementById('trashZone');
  if (trashZone) {
    trashZone.classList.remove('active');
    trashZone.classList.remove('drag-over');
  }
  
  draggedDocId = null;
}

/**
 * Handle drag over trash zone
 */
function handleTrashDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

/**
 * Handle drag leave trash zone
 */
function handleTrashDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

/**
 * Handle drop on trash zone
 */
async function handleTrashDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');
  
  // Verify this is a document drag
  const docId = e.dataTransfer.getData('application/inkshelf-document');
  
  if (docId && draggedDocId) {
    await deleteDocumentFromList(draggedDocId);
  }
}

/**
 * Load document from storage
 */
async function loadDocument(docId) {
  const doc = await storageManager.getDraft(docId);
  if (doc) {
    initializeEditor(doc);
    renderDocumentList();
    
    // Switch to preview mode to show rendered markdown
    setViewMode('preview');
    
    // Scroll to top of content
    if (previewPanel) {
      previewPanel.scrollTop = 0;
    }
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }
}

/**
 * Toggle star status of a document
 */
async function toggleStarDocument(docId) {
  const doc = await storageManager.getDraft(docId);
  if (doc) {
    doc.starred = !doc.starred;
    await storageManager.saveDraft(doc);
    await loadSavedDocuments();
  }
}

/**
 * Delete document from list
 */
async function deleteDocumentFromList(docId) {
  if (!confirm('Are you sure you want to delete this document?')) {
    return;
  }
  
  await storageManager.deleteDraft(docId);
  
  // If deleting current document, check if there are other documents
  if (docId === currentDocId) {
    // Get all remaining documents
    const allDocs = await storageManager.getAllDrafts();
    
    if (allDocs && allDocs.length > 0) {
      // Load the first available document
      await loadDocument(allDocs[0].docId);
    } else {
      // No documents left, show empty state
      currentDocId = null;
      currentContent = '';
      currentTitle = '';
      originalTitle = '';
      currentUrl = '';
      markdownEditor.value = '';
      docTitle.textContent = '';
      sourceUrl.textContent = '';
      showEmptyState();
    }
  }
  
  await loadSavedDocuments();
}

/**
 * Save current document
 */
async function saveDocument() {
  if (!currentDocId) {
    currentDocId = StorageManager.generateTempDocId();
  }
  
  currentContent = markdownEditor.value;
  
  // Parse frontmatter first
  parseFrontmatterAndUpdateUI(currentContent);
  
  // Extract title from content or use default
  const firstLine = currentContent.split('\n')[0];
  if (firstLine.startsWith('# ')) {
    currentTitle = firstLine.substring(2).trim();
    originalTitle = currentTitle;
    docTitle.textContent = currentTitle;
  } else if (!currentTitle || currentTitle === 'Untitled') {
    currentTitle = 'Document ' + new Date().toLocaleDateString();
  }
  
  await storageManager.saveDraft({
    docId: currentDocId,
    content: currentContent,
    title: currentTitle,
    url: currentUrl,
    mode: 'saved'
  });
  
  // Clear unsaved changes flag
  hasUnsavedChanges = false;
  updateSaveButtonVisibility();
  
  // Visual feedback
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saved!';
  saveBtn.style.background = '#28a745';
  
  setTimeout(() => {
    saveBtn.textContent = originalText;
    saveBtn.style.background = '';
  }, 2000);
  
  await loadSavedDocuments();
}

/**
 * Delete current document
 */
async function deleteDocument() {
  if (!currentDocId || !confirm('Are you sure you want to delete this document?')) {
    return;
  }
  
  await storageManager.deleteDraft(currentDocId);
  
  // Reload document list
  await loadSavedDocuments();
  
  // Create new blank document
  const newDocId = StorageManager.generateTempDocId();
  currentDocId = newDocId;
  currentContent = '';
  currentTitle = 'Untitled';
  currentUrl = '';
  
  // Update UI
  docTitle.textContent = currentTitle;
  sourceUrl.textContent = '';
  markdownEditor.value = '';
  renderPreview();
  
  // Switch to edit mode
  setViewMode('edit');
}

/**
 * Initialize word wrap settings
 */
function initializeWordWrap() {
  // Load saved word wrap preference
  const savedWordWrap = localStorage.getItem('inkshelf-wordwrap');
  wordWrapEnabled = savedWordWrap !== 'false'; // default to true
  
  applyWordWrap();
}

/**
 * Toggle word wrap
 */
function toggleWordWrap() {
  wordWrapEnabled = !wordWrapEnabled;
  localStorage.setItem('inkshelf-wordwrap', wordWrapEnabled.toString());
  applyWordWrap();
}

/**
 * Apply word wrap setting to editor
 */
function applyWordWrap() {
  if (markdownEditor) {
    markdownEditor.style.whiteSpace = wordWrapEnabled ? 'pre-wrap' : 'pre';
    markdownEditor.style.overflowX = wordWrapEnabled ? 'hidden' : 'auto';
  }
  
  // Apply word wrap to preview content as well
  if (previewContent) {
    if (wordWrapEnabled) {
      previewContent.classList.remove('no-wrap');
    } else {
      previewContent.classList.add('no-wrap');
    }
  }
  
  if (wordWrapToggle && wordWrapLabel) {
    wordWrapLabel.textContent = `Word Wrap: ${wordWrapEnabled ? 'On' : 'Off'}`;
    if (wordWrapEnabled) {
      wordWrapToggle.classList.add('active');
    } else {
      wordWrapToggle.classList.remove('active');
    }
  }
}

/**
 * Update Save button visibility based on document state and unsaved changes
 */
function updateSaveButtonVisibility() {
  if (saveBtn) {
    // Show save button only if there's a document loaded and there are unsaved changes
    if (currentDocId && hasUnsavedChanges) {
      saveBtn.style.display = 'block';
    } else {
      saveBtn.style.display = 'none';
    }
  }
}

/**
 * Update theme label to reflect current theme
 */
function updateThemeLabel() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const themeName = currentTheme === 'dark' ? 'Dark' : 'Light';
  
  if (themeLabel) {
    themeLabel.textContent = `Theme: ${themeName}`;
  }
  
  if (themeToggle) {
    if (currentTheme === 'dark') {
      themeToggle.classList.add('active');
    } else {
      themeToggle.classList.remove('active');
    }
  }
}

/**
 * Initialize auto-save settings
 */
function initializeAutoSave() {
  // Load saved auto-save preference
  const savedAutoSave = localStorage.getItem('inkshelf-autosave');
  autoSaveEnabled = savedAutoSave !== 'false'; // default to true
  
  updateAutoSaveLabel();
}

/**
 * Toggle auto-save
 */
function toggleAutoSave() {
  autoSaveEnabled = !autoSaveEnabled;
  localStorage.setItem('inkshelf-autosave', autoSaveEnabled.toString());
  updateAutoSaveLabel();
}

/**
 * Update auto-save label to reflect current state
 */
function updateAutoSaveLabel() {
  if (autoSaveLabel) {
    autoSaveLabel.textContent = `Auto-Save: ${autoSaveEnabled ? 'On' : 'Off'}`;
  }
  
  if (autoSaveToggle) {
    if (autoSaveEnabled) {
      autoSaveToggle.classList.add('active');
    } else {
      autoSaveToggle.classList.remove('active');
    }
  }
}

// ===========================================
// InkShelf v2.0 - New Feature Functions
// Groups, Tags, Auth, Sync, Search
// ===========================================

// Current state for new features
let currentGroup = null;
let currentTags = [];
let selectedTagFilters = [];
let searchQuery = '';
let allGroups = [];

// New DOM elements for v2.0 features
const searchInput = document.getElementById('searchInput');
const groupsList = document.getElementById('groupsList');
const tagsList = document.getElementById('tagsList');
const groupSelect = document.getElementById('groupSelect');
const tagInput = document.getElementById('tagInput');
const tagsInputContainer = document.getElementById('tagsInputContainer');
const tagsDisplay = document.getElementById('tagsDisplay');
const newGroupBtn = document.getElementById('newGroupBtn');
const groupModal = document.getElementById('groupModal');
const filterAllBtn = document.getElementById('filterAll');
const filterStarredBtn = document.getElementById('filterStarred');
const groupsToggle = document.getElementById('groupsToggle');
const tagsToggle = document.getElementById('tagsToggle');
const documentsToggle = document.getElementById('documentsToggle');
const rightSidebarBtn = document.getElementById('rightSidebarBtn');
const countAll = document.getElementById('countAll');
const countStarred = document.getElementById('countStarred');

// Auth elements
const authNotLoggedIn = document.getElementById('authNotLoggedIn');
const authLoggedIn = document.getElementById('authLoggedIn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignupBtn = document.getElementById('showSignupBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');

// Sync elements
const syncStatusDetail = document.getElementById('syncStatusDetail');
const lastSyncTime = document.getElementById('lastSyncTime');
const syncNowBtn = document.getElementById('syncNowBtn');

// Publish elements
const publishArticleBtn = document.getElementById('publishArticleBtn');
const myPublishedBtn = document.getElementById('myPublishedBtn');

// Toast container
const toastContainer = document.getElementById('toastContainer');

/**
 * Initialize v2.0 features after DOM is ready
 */
async function initializeV2Features() {
  // Setup new event listeners
  setupSearchListener();
  setupGroupsUI();
  setupTagsUI();
  setupAuthUI();
  setupSyncUI();
  setupPublishUI();
  setupFilterButtons();
  setupSectionToggles();
  setupGroupModal();
  
  // Load groups
  await loadGroups();
  
  // Initialize auth state
  if (typeof authManager !== 'undefined' && authManager.addAuthStateListener) {
    authManager.addAuthStateListener(handleAuthStateChange);
    handleAuthStateChange(authManager.isAuthenticated());
  } else {
    console.log('AuthManager not available, auth features disabled');
  }
  
  // Initialize sync
  if (typeof syncManager !== 'undefined' && syncManager.start && 
      typeof authManager !== 'undefined' && authManager.isAuthenticated && authManager.isAuthenticated()) {
    syncManager.start();
    updateSyncStatus();
  } else {
    updateSyncStatus(); // Update status even if not authenticated
  }
  
  // Listen for online/offline
  window.addEventListener('online', handleOnlineStatus);
  window.addEventListener('offline', handleOnlineStatus);
  handleOnlineStatus();
  
  // Update document counts
  updateDocumentCounts();
}

/**
 * Setup filter buttons (All Documents, Starred)
 */
function setupFilterButtons() {
  if (filterAllBtn) {
    filterAllBtn.addEventListener('click', () => {
      filterAllBtn.classList.add('active');
      if (filterStarredBtn) filterStarredBtn.classList.remove('active');
      currentGroup = null;
      selectedTagFilters = [];
      filterAndRenderDocuments();
    });
  }
  
  if (filterStarredBtn) {
    filterStarredBtn.addEventListener('click', () => {
      filterStarredBtn.classList.add('active');
      if (filterAllBtn) filterAllBtn.classList.remove('active');
      currentGroup = null;
      selectedTagFilters = [];
      filterAndRenderDocuments();
    });
  }
}

/**
 * Setup section toggle buttons
 */
function setupSectionToggles() {
  // Helper function to setup toggle for a section
  const setupToggle = (toggleBtn, sectionSelector) => {
    if (!toggleBtn) return;
    
    const section = toggleBtn.closest('.sidebar-section');
    if (!section) return;
    
    const header = section.querySelector('.section-header');
    if (!header) return;
    
    // Click on entire header to toggle
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      section.classList.toggle('collapsed');
    });
  };
  
  // Setup all sections
  setupToggle(groupsToggle, '.sidebar-section');
  setupToggle(tagsToggle, '.sidebar-section');
  setupToggle(documentsToggle, '.sidebar-section');
}

/**
 * Update document counts in filter buttons
 */
function updateDocumentCounts() {
  if (countAll) {
    countAll.textContent = savedDocuments.length;
  }
  
  if (countStarred) {
    const starredCount = savedDocuments.filter(doc => doc.starred).length;
    countStarred.textContent = starredCount;
  }
}

// Call v2 init after main DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // Delay to ensure main init completes
  setTimeout(initializeV2Features, 100);
});

// ============ Search Functions ============

/**
 * Setup search input listener
 */
function setupSearchListener() {
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 200));
  }
}

/**
 * Handle search input
 */
function handleSearch() {
  searchQuery = searchInput?.value.toLowerCase().trim() || '';
  filterAndRenderDocuments();
}

/**
 * Filter and render documents based on search, group, and tag filters
 */
function filterAndRenderDocuments() {
  let filtered = [...savedDocuments];
  
  // Filter by search query
  if (searchQuery) {
    filtered = filtered.filter(doc => 
      doc.title.toLowerCase().includes(searchQuery) ||
      (doc.content && doc.content.toLowerCase().includes(searchQuery))
    );
  }
  
  // Filter by group
  if (currentGroup) {
    filtered = filtered.filter(doc => doc.groupId === currentGroup);
  }
  
  // Filter by tags
  if (selectedTagFilters.length > 0) {
    filtered = filtered.filter(doc => {
      const docTags = doc.tags || [];
      return selectedTagFilters.every(tag => docTags.includes(tag));
    });
  }
  
  // Filter starred if active
  if (filterStarredBtn && filterStarredBtn.classList.contains('active')) {
    filtered = filtered.filter(doc => doc.starred);
  }
  
  renderFilteredDocumentList(filtered);
  updateDocumentCounts();
}

/**
 * Render filtered document list
 */
function renderFilteredDocumentList(docs) {
  if (!documentList) return;
  
  if (docs.length === 0) {
    documentList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <p>${searchQuery ? 'No documents match your search' : 'No documents yet'}</p>
      </div>
    `;
    return;
  }
  
  documentList.innerHTML = '';
  
  docs.forEach(doc => {
    const item = createDocumentItem(doc);
    documentList.appendChild(item);
  });
}

/**
 * Create document list item element
 */
function createDocumentItem(doc) {
  const item = document.createElement('div');
  item.className = 'document-item';
  if (doc.docId === currentDocId) {
    item.classList.add('active');
  }
  
  item.draggable = true;
  item.dataset.docId = doc.docId;
  
  const timeAgo = formatRelativeTime(doc.updatedAt || doc.timestamp);
  const starIndicator = doc.starred ? '<span class="star-indicator" title="Starred">★</span>' : '';
  
  // Tags display
  let tagsHtml = '';
  if (doc.tags && doc.tags.length > 0) {
    tagsHtml = `<div class="document-item-tags">${doc.tags.slice(0, 3).map(t => 
      `<span class="doc-tag">${escapeHtml(t)}</span>`
    ).join('')}${doc.tags.length > 3 ? `<span class="doc-tag">+${doc.tags.length - 3}</span>` : ''}</div>`;
  }
  
  item.innerHTML = `
    <div class="document-item-content">
      <div class="document-item-header">
        ${starIndicator}
        <div class="document-item-title">${escapeHtml(doc.title)}</div>
      </div>
      <div class="document-item-meta">${timeAgo}</div>
      ${tagsHtml}
    </div>
    <div class="document-item-menu">
      <button class="document-menu-btn" title="More options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </button>
      <div class="document-menu-dropdown">
        <button class="menu-item star-btn ${doc.starred ? 'starred' : ''}" data-doc-id="${escapeHtml(doc.docId)}">
          <span class="star-icon">${doc.starred ? '\u2605' : '\u2606'}</span>
          <span>${doc.starred ? 'Unstar' : 'Star'}</span>
        </button>
        <button class="menu-item delete-btn" data-doc-id="${escapeHtml(doc.docId)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>Delete</span>
        </button>
      </div>
    </div>
  `;
  
  // Event listeners
  const contentArea = item.querySelector('.document-item-content');
  contentArea.addEventListener('click', () => loadDocument(doc.docId));
  
  const menuBtn = item.querySelector('.document-menu-btn');
  const menuDropdown = item.querySelector('.document-menu-dropdown');
  
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.document-menu-dropdown.show').forEach(menu => {
      if (menu !== menuDropdown) menu.classList.remove('show');
    });
    menuDropdown.classList.toggle('show');
  });
  
  item.querySelector('.star-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    await toggleStarDocument(doc.docId);
    menuDropdown.classList.remove('show');
  });
  
  item.querySelector('.delete-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    await deleteDocumentFromList(doc.docId);
    menuDropdown.classList.remove('show');
  });
  
  item.addEventListener('dragstart', handleDragStart);
  item.addEventListener('dragend', handleDragEnd);
  
  return item;
}

// ============ Groups Functions ============

/**
 * Setup groups UI event listeners
 */
function setupGroupsUI() {
  if (newGroupBtn) {
    newGroupBtn.addEventListener('click', openGroupModal);
  }
  
  if (groupSelect) {
    groupSelect.addEventListener('change', handleGroupSelectChange);
  }
}

/**
 * Load groups from storage
 */
async function loadGroups() {
  try {
    if (typeof storageManager !== 'undefined' && storageManager.getAllGroups) {
      allGroups = await storageManager.getAllGroups();
      renderGroupsList();
      updateGroupSelect();
    } else {
      console.log('StorageManager not available, groups disabled');
      allGroups = [];
    }
  } catch (error) {
    console.error('Failed to load groups:', error);
    allGroups = [];
  }
}

/**
 * Render groups list in sidebar
 */
function renderGroupsList() {
  if (!groupsList) return;
  
  // Add "All Documents" item
  let html = `
    <div class="group-item ${!currentGroup ? 'active' : ''}" data-group-id="">
      <div class="group-icon" style="background: var(--text-secondary);">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      </div>
      <span class="group-name">All Documents</span>
      <span class="group-count">${savedDocuments.length}</span>
    </div>
  `;
  
  // Add each group
  allGroups.forEach(group => {
    const count = savedDocuments.filter(d => d.groupId === group.groupId).length;
    html += `
      <div class="group-item ${currentGroup === group.groupId ? 'active' : ''}" data-group-id="${escapeHtml(group.groupId)}">
        <div class="group-icon" style="background: ${escapeHtml(group.color || '#6c757d')};">
          ${escapeHtml(group.icon || '📁')}
        </div>
        <span class="group-name">${escapeHtml(group.name)}</span>
        <button class="group-menu-btn" title="Group options">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
        <span class="group-count">${count}</span>
        <div class="group-menu-dropdown">
          <button class="menu-item rename-group-btn" data-group-id="${escapeHtml(group.groupId)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>Rename</span>
          </button>
          <button class="menu-item delete-group-btn" data-group-id="${escapeHtml(group.groupId)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          </button>
        </div>
      </div>
    `;
  });
  
  groupsList.innerHTML = html;
  
  // Add click handlers for groups
  groupsList.querySelectorAll('.group-item').forEach(item => {
    const groupId = item.dataset.groupId;
    const groupName = item.querySelector('.group-name');
    const menuBtn = item.querySelector('.group-menu-btn');
    const menuDropdown = item.querySelector('.group-menu-dropdown');
    
    // Click on group name to select
    if (groupName) {
      groupName.addEventListener('click', () => {
        selectGroup(groupId || null);
      });
    }
    
    // Click on group icon to select
    item.querySelector('.group-icon')?.addEventListener('click', () => {
      selectGroup(groupId || null);
    });
    
    // Menu button click
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other menus
        document.querySelectorAll('.group-menu-dropdown.show').forEach(menu => {
          if (menu !== menuDropdown) menu.classList.remove('show');
        });
        menuDropdown?.classList.toggle('show');
      });
    }
    
    // Rename button
    item.querySelector('.rename-group-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      menuDropdown?.classList.remove('show');
      await renameGroup(groupId);
    });
    
    // Delete button
    item.querySelector('.delete-group-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      menuDropdown?.classList.remove('show');
      await deleteGroup(groupId);
    });
  });
  
  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.group-item')) {
      document.querySelectorAll('.group-menu-dropdown.show').forEach(menu => {
        menu.classList.remove('show');
      });
    }
  });
}

/**
 * Select a group to filter documents
 */
function selectGroup(groupId) {
  currentGroup = groupId;
  renderGroupsList();
  filterAndRenderDocuments();
}

/**
 * Update group select dropdown in header
 */
function updateGroupSelect() {
  if (!groupSelect) return;
  
  let html = '<option value="">No Group</option>';
  allGroups.forEach(group => {
    html += `<option value="${group.groupId}">${escapeHtml(group.name)}</option>`;
  });
  
  groupSelect.innerHTML = html;
  
  // Set current document's group
  const currentDoc = savedDocuments.find(d => d.docId === currentDocId);
  if (currentDoc?.groupId) {
    groupSelect.value = currentDoc.groupId;
  }
}

/**
 * Handle group select change for current document
 */
async function handleGroupSelectChange() {
  const groupId = groupSelect.value || null;
  const group = allGroups.find(g => g.groupId === groupId);
  
  if (currentDocId) {
    const doc = await storageManager.getDraft(currentDocId);
    if (doc) {
      doc.groupId = groupId;
      doc.groupName = group?.name || null;
      await storageManager.saveDraft(doc);
      await loadSavedDocuments();
      const groupName = group?.name ? `"${group.name}"` : 'No Group';
      showToast('success', `Document moved to ${groupName}`);
    }
  }
}

// ============ Tags Functions ============

/**
 * Setup tags UI event listeners
 */
function setupTagsUI() {
  if (tagInput) {
    tagInput.addEventListener('keydown', handleTagInputKeydown);
    tagInput.addEventListener('blur', handleTagInputBlur);
  }
  
  if (tagsInputContainer) {
    tagsInputContainer.addEventListener('click', () => tagInput?.focus());
  }
}

/**
 * Handle tag input keydown
 */
function handleTagInputKeydown(e) {
  const value = tagInput.value.trim();
  
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    if (value && !currentTags.includes(value)) {
      addTag(value);
      tagInput.value = '';
    }
  } else if (e.key === 'Backspace' && !value && currentTags.length > 0) {
    removeTag(currentTags[currentTags.length - 1]);
  }
}

/**
 * Handle tag input blur
 */
function handleTagInputBlur() {
  const value = tagInput?.value.trim();
  if (value && !currentTags.includes(value)) {
    addTag(value);
    tagInput.value = '';
  }
}

/**
 * Add a tag to current document
 */
async function addTag(tag) {
  if (!currentTags.includes(tag)) {
    currentTags.push(tag);
    renderCurrentTags();
    await saveDocumentTags();
  }
}

/**
 * Remove a tag from current document
 */
async function removeTag(tag) {
  currentTags = currentTags.filter(t => t !== tag);
  renderCurrentTags();
  await saveDocumentTags();
}

/**
 * Render current document's tags
 */
function renderCurrentTags() {
  if (!tagsInputContainer) return;
  
  // Remove existing tags
  tagsInputContainer.querySelectorAll('.tag-badge').forEach(el => el.remove());
  
  // Add tag badges before input
  currentTags.forEach(tag => {
    const badge = document.createElement('span');
    badge.className = 'tag-badge';
    badge.innerHTML = `
      ${escapeHtml(tag)}
      <button class="remove-tag" data-tag="${escapeHtml(tag)}">&times;</button>
    `;
    badge.querySelector('.remove-tag').addEventListener('click', (e) => {
      e.stopPropagation();
      removeTag(tag);
    });
    tagsInputContainer.insertBefore(badge, tagInput);
  });
}

/**
 * Save current document's tags
 */
async function saveDocumentTags() {
  if (currentDocId) {
    // Capture the latest content from the editor to avoid losing unsaved changes
    const editorContent = markdownEditor.value;
    
    // Use the updateTags method which properly updates both tags array and frontmatter,
    // passing the current editor content so it doesn't have to fetch potentially stale data
    const updatedDoc = await storageManager.updateTags(currentDocId, currentTags, editorContent);
    
    // Update our in-memory content representation but avoid overwriting the editor value
    // to preserve cursor position and any unsaved edits
    if (updatedDoc && typeof updatedDoc.content === 'string') {
      currentContent = updatedDoc.content;
      // Only update editor if content actually changed (frontmatter was added/modified)
      if (markdownEditor.value !== updatedDoc.content) {
        const cursorPosition = markdownEditor.selectionStart;
        markdownEditor.value = updatedDoc.content;
        // Try to restore cursor position if possible
        if (cursorPosition <= updatedDoc.content.length) {
          markdownEditor.setSelectionRange(cursorPosition, cursorPosition);
        }
      }
    }
    
    // Re-render the preview from the current content
    renderPreview();
    
    await loadSavedDocuments();
    updateTagsSidebar();
  }
}

/**
 * Load tags for current document
 */
function loadDocumentTags(doc) {
  currentTags = doc?.tags || [];
  renderCurrentTags();
}

/**
 * Update tags sidebar with all unique tags
 */
function updateTagsSidebar() {
  if (!tagsList) return;
  
  // Collect all unique tags with counts
  const tagCounts = {};
  savedDocuments.forEach(doc => {
    (doc.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  
  const tags = Object.keys(tagCounts).sort();
  
  if (tags.length === 0) {
    tagsList.innerHTML = '<p style="color: var(--text-secondary); font-size: 12px; padding: 4px;">No tags yet</p>';
    return;
  }
  
  let html = '';
  tags.forEach(tag => {
    const isActive = selectedTagFilters.includes(tag);
    html += `
      <span class="tag-filter ${isActive ? 'active' : ''}" data-tag="${escapeHtml(tag)}">
        ${escapeHtml(tag)}
        <span class="tag-count">${tagCounts[tag]}</span>
      </span>
    `;
  });
  
  tagsList.innerHTML = html;
  
  // Add click handlers
  tagsList.querySelectorAll('.tag-filter').forEach(el => {
    el.addEventListener('click', () => {
      const tag = el.dataset.tag;
      toggleTagFilter(tag);
    });
  });
}

/**
 * Toggle tag filter
 */
function toggleTagFilter(tag) {
  if (selectedTagFilters.includes(tag)) {
    selectedTagFilters = selectedTagFilters.filter(t => t !== tag);
  } else {
    selectedTagFilters.push(tag);
  }
  updateTagsSidebar();
  filterAndRenderDocuments();
}

// ============ Filter Tabs Functions ============

/**
 * Setup filter tabs (All, Starred)
 */
function setupFilterTabs() {
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filterAndRenderDocuments();
    });
  });
}

// ============ Group Modal Functions ============

/**
 * Setup group creation modal
 */
function setupGroupModal() {
  const closeBtn = document.getElementById('groupModalClose');
  const cancelBtn = document.getElementById('groupModalCancel');
  const groupForm = document.getElementById('groupForm');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeGroupModal();
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeGroupModal();
    });
  }
  
  if (groupForm) {
    groupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await createGroup();
    });
  }
  
  // Close on backdrop click
  if (groupModal) {
    groupModal.addEventListener('click', (e) => {
      if (e.target === groupModal || e.target.classList.contains('modal-backdrop')) {
        closeGroupModal();
      }
    });
  }
  
  // Setup color options
  setupColorPicker();
}

/**
 * Open group creation modal
 */
function openGroupModal() {
  if (groupModal) {
    groupModal.style.display = 'flex';
    // Trigger reflow
    groupModal.offsetHeight;
    groupModal.classList.add('show');
    const nameInput = document.getElementById('groupName');
    if (nameInput) {
      nameInput.value = '';
      setTimeout(() => nameInput.focus(), 100);
    }
  }
}

/**
 * Close group creation modal
 */
function closeGroupModal() {
  if (groupModal) {
    groupModal.classList.remove('show');
    setTimeout(() => {
      groupModal.style.display = 'none';
    }, 200);
  }
}

/**
 * Setup color picker in modal
 */
function setupColorPicker() {
  const colorOptions = groupModal?.querySelectorAll('.color-option');
  colorOptions?.forEach(option => {
    option.addEventListener('click', () => {
      colorOptions.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
    });
  });
}

/**
 * Setup icon picker in modal
 */
function setupIconPicker() {
  const iconOptions = groupModal?.querySelectorAll('.icon-option');
  iconOptions?.forEach(option => {
    option.addEventListener('click', () => {
      iconOptions.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
    });
  });
}

/**
 * Create new group
 */
async function createGroup() {
  const nameInput = document.getElementById('groupName');
  const name = nameInput?.value.trim();
  
  if (!name) {
    showToast('error', 'Please enter a group name');
    return;
  }
  
  const selectedColor = groupModal?.querySelector('.color-option.selected');
  
  const group = {
    groupId: 'group_' + Date.now(),
    name: name,
    color: selectedColor?.dataset.color || '#4A90D9',
    icon: '📁',
    createdAt: Date.now()
  };
  
  try {
    if (typeof storageManager !== 'undefined' && storageManager.saveGroup) {
      await storageManager.saveGroup(group);
      await loadGroups();
      closeGroupModal();
      showToast('success', `Group "${name}" created`);
    } else {
      console.error('StorageManager not available');
      showToast('error', 'Storage not available');
    }
  } catch (error) {
    console.error('Failed to create group:', error);
    showToast('error', 'Failed to create group');
  }
}

/**
 * Rename a group
 */
async function renameGroup(groupId) {
  const group = allGroups.find(g => g.groupId === groupId);
  if (!group) return;
  
  const newName = prompt('Enter new group name:', group.name);
  if (!newName || newName.trim() === '') return;
  
  const trimmedName = newName.trim();
  if (trimmedName === group.name) return;
  
  try {
    group.name = trimmedName;
    group.updatedAt = Date.now();
    
    if (typeof storageManager !== 'undefined' && storageManager.saveGroup) {
      await storageManager.saveGroup(group);
      
      // Update all documents with this group
      const docsToUpdate = savedDocuments.filter(d => d.groupId === groupId);
      for (const doc of docsToUpdate) {
        doc.groupName = trimmedName;
        await storageManager.saveDraft(doc);
      }
      
      await loadGroups();
      await loadSavedDocuments();
      showToast('success', `Group renamed to "${trimmedName}"`);
    } else {
      showToast('error', 'Storage not available');
    }
  } catch (error) {
    console.error('Failed to rename group:', error);
    showToast('error', 'Failed to rename group');
  }
}

/**
 * Delete a group
 */
async function deleteGroup(groupId) {
  const group = allGroups.find(g => g.groupId === groupId);
  if (!group) return;
  
  const docsInGroup = savedDocuments.filter(d => d.groupId === groupId).length;
  const message = docsInGroup > 0
    ? `Delete group "${group.name}"? ${docsInGroup} document(s) will be moved to "No Group".`
    : `Delete group "${group.name}"?`;
  
  if (!confirm(message)) return;
  
  try {
    if (typeof storageManager !== 'undefined' && storageManager.deleteGroup) {
      // Remove group assignment from documents
      const docsToUpdate = savedDocuments.filter(d => d.groupId === groupId);
      for (const doc of docsToUpdate) {
        doc.groupId = null;
        doc.groupName = null;
        await storageManager.saveDraft(doc);
      }
      
      // Delete the group
      await storageManager.deleteGroup(groupId);
      
      // Reset current group if it was deleted
      if (currentGroup === groupId) {
        currentGroup = null;
      }
      
      await loadGroups();
      await loadSavedDocuments();
      showToast('success', `Group "${group.name}" deleted`);
    } else {
      showToast('error', 'Storage not available');
    }
  } catch (error) {
    console.error('Failed to delete group:', error);
    showToast('error', 'Failed to delete group');
  }
}

// ============ Auth UI Functions ============

/**
 * Setup auth UI event listeners
 */
function setupAuthUI() {
  // Show/hide form switching
  if (showSignupBtn) {
    showSignupBtn.addEventListener('click', () => {
      if (loginForm) loginForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'block';
      if (showSignupBtn) showSignupBtn.style.display = 'none';
    });
  }
  
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', () => {
      if (signupForm) signupForm.style.display = 'none';
      if (loginForm) loginForm.style.display = 'block';
      if (showSignupBtn) showSignupBtn.style.display = 'block';
    });
  }
  
  // Form submissions
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
  
  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

/**
 * Switch auth forms
 */
function switchAuthTab(tab) {
  if (tab === 'login') {
    if (loginForm) loginForm.style.display = 'block';
    if (signupForm) signupForm.style.display = 'none';
    if (showSignupBtn) showSignupBtn.style.display = 'block';
  } else {
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'block';
    if (showSignupBtn) showSignupBtn.style.display = 'none';
  }
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail')?.value;
  const password = document.getElementById('loginPassword')?.value;
  const submitBtn = loginForm?.querySelector('button[type="submit"]');
  
  if (!email || !password) {
    showToast('error', 'Please fill in all fields');
    return;
  }
  
  submitBtn?.classList.add('loading');
  
  try {
    if (typeof authManager !== 'undefined' && authManager.login) {
      await authManager.login(email, password);
      showToast('success', 'Logged in successfully');
    } else {
      showToast('error', 'Auth module not loaded');
    }
  } catch (error) {
    showToast('error', error.message || 'Login failed');
  } finally {
    submitBtn?.classList.remove('loading');
  }
}

/**
 * Handle signup form submission
 */
async function handleSignup(e) {
  e.preventDefault();
  
  const email = document.getElementById('signupEmail')?.value;
  const password = document.getElementById('signupPassword')?.value;
  const confirmPassword = document.getElementById('signupConfirmPassword')?.value;
  const submitBtn = signupForm?.querySelector('button[type="submit"]');
  
  if (!email || !password || !confirmPassword) {
    showToast('error', 'Please fill in all fields');
    return;
  }
  
  if (password !== confirmPassword) {
    showToast('error', 'Passwords do not match');
    return;
  }
  
  if (password.length < 8) {
    showToast('error', 'Password must be at least 8 characters');
    return;
  }
  
  submitBtn?.classList.add('loading');
  
  try {
    if (typeof authManager !== 'undefined' && authManager.register) {
      await authManager.register(email, password);
      showToast('success', 'Account created successfully');
    } else {
      showToast('error', 'Auth module not loaded');
    }
  } catch (error) {
    showToast('error', error.message || 'Signup failed');
  } finally {
    submitBtn?.classList.remove('loading');
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  try {
    if (typeof authManager !== 'undefined' && authManager.logout) {
      await authManager.logout();
      showToast('info', 'Logged out');
    } else {
      showToast('info', 'Already logged out');
    }
  } catch (error) {
    showToast('error', 'Logout failed');
  }
}

/**
 * Handle auth state change
 */
function handleAuthStateChange(isAuthenticated) {
  if (isAuthenticated) {
    // Show logged in state
    if (authNotLoggedIn) authNotLoggedIn.style.display = 'none';
    if (authLoggedIn) authLoggedIn.style.display = 'block';
    
    // Update user info
    if (userName && authManager?.getUser) {
      userName.textContent = authManager.getUser()?.name || 'User';
    }
    if (userEmail && authManager?.getUser) {
      userEmail.textContent = authManager.getUser()?.email || 'user@example.com';
    }
    
    // Start sync
    if (typeof syncManager !== 'undefined' && syncManager.start) {
      syncManager.start();
    }
  } else {
    // Show not logged in state
    if (authNotLoggedIn) authNotLoggedIn.style.display = 'block';
    if (authLoggedIn) authLoggedIn.style.display = 'none';
    
    // Stop sync
    if (typeof syncManager !== 'undefined' && syncManager.stop) {
      syncManager.stop();
    }
  }
  
  updateSyncStatus();
  updatePublishStatus();
}

// ============ Sync UI Functions ============

/**
 * Setup sync UI event listeners
 */
function setupSyncUI() {
  if (syncNowBtn) {
    syncNowBtn.addEventListener('click', handleSyncNow);
  }
}

/**
 * Handle sync now button
 */
async function handleSyncNow() {
  if (typeof syncManager === 'undefined' || !syncManager.syncNow) {
    showToast('error', 'Sync module not available');
    return;
  }
  
  if (typeof authManager === 'undefined' || !authManager.isAuthenticated || !authManager.isAuthenticated()) {
    showToast('error', 'Please log in to sync');
    return;
  }
  
  syncNowBtn?.classList.add('loading');
  
  try {
    await syncManager.syncNow();
    showToast('success', 'Synced successfully');
    updateSyncStatus();
  } catch (error) {
    showToast('error', error.message || 'Sync failed');
  } finally {
    syncNowBtn?.classList.remove('loading');
  }
}

/**
 * Update sync status display
 */
function updateSyncStatus() {
  const isOnline = navigator.onLine;
  const isAuthenticated = typeof authManager !== 'undefined' && authManager.isAuthenticated && authManager.isAuthenticated();
  
  if (!isAuthenticated) {
    if (syncStatusDetail) {
      syncStatusDetail.innerHTML = `
        <span class="sync-indicator"></span>
        Not connected
      `;
    }
    if (lastSyncTime) lastSyncTime.textContent = 'Last sync: Never';
    return;
  }
  
  if (!isOnline) {
    if (syncStatusDetail) {
      syncStatusDetail.innerHTML = `
        <span class="sync-indicator offline"></span>
        Offline
      `;
    }
  } else {
    if (syncStatusDetail) {
      syncStatusDetail.innerHTML = `
        <span class="sync-indicator synced"></span>
        Connected
      `;
    }
  }
  
  // Update last sync time
  const lastSync = localStorage.getItem('inkshelf-last-sync');
  if (lastSync && lastSyncTime) {
    lastSyncTime.textContent = 'Last sync: ' + formatRelativeTime(parseInt(lastSync));
  } else if (lastSyncTime) {
    lastSyncTime.textContent = 'Last sync: Never';
  }
}

// ============ Publish UI Functions ============

/**
 * Setup publish UI event listeners
 */
function setupPublishUI() {
  if (publishArticleBtn) {
    publishArticleBtn.addEventListener('click', handlePublish);
  }
  if (myPublishedBtn) {
    myPublishedBtn.addEventListener('click', () => {
      // Open published articles page
      window.open('https://tulis.app/dashboard', '_blank');
    });
  }
}

/**
 * Handle publish button
 */
async function handlePublish() {
  if (!authManager?.isAuthenticated || !authManager.isAuthenticated()) {
    showToast('error', 'Please log in to publish');
    return;
  }
  
  if (!currentDocId) {
    showToast('error', 'No document selected');
    return;
  }
  
  publishArticleBtn?.classList.add('loading');
  
  try {
    // Get current document
    const doc = await storageManager.getDraft(currentDocId);
    if (!doc) throw new Error('Document not found');
    
    // Publish via API (assuming authManager has apiRequest method)
    if (typeof authManager !== 'undefined' && authManager.apiRequest) {
      const response = await authManager.apiRequest('/documents/' + (doc.cloudId || 'new') + '/publish', {
        method: 'POST',
        body: JSON.stringify({
          title: doc.title,
          content: doc.content
        })
      });
      
      // Update document with publish info
      doc.isPublished = true;
      doc.publishUrl = response.url;
      doc.cloudId = response.id;
      await storageManager.saveDraft(doc);
      
      showToast('success', 'Document published!');
    } else {
      showToast('info', 'Publishing feature will be available when connected to Tulis.app');
    }
    
    updatePublishStatus();
  } catch (error) {
    showToast('error', error.message || 'Publish failed');
  } finally {
    publishArticleBtn?.classList.remove('loading');
  }
}

/**
 * Handle unpublish button
 */
async function handleUnpublish() {
  if (!currentDocId) return;
  
  unpublishBtn?.classList.add('loading');
  
  try {
    const doc = await storageManager.getDraft(currentDocId);
    if (!doc?.cloudId) throw new Error('Document not synced');
    
    await authManager.apiRequest('/documents/' + doc.cloudId + '/unpublish', {
      method: 'POST'
    });
    
    doc.isPublished = false;
    doc.publishUrl = null;
    await storageManager.saveDraft(doc);
    
    showToast('success', 'Document unpublished');
    updatePublishStatus();
  } catch (error) {
    showToast('error', error.message || 'Unpublish failed');
  } finally {
    unpublishBtn?.classList.remove('loading');
  }
}

/**
 * Handle view published button
 */
async function handleViewPublished() {
  if (!currentDocId) return;
  
  const doc = await storageManager.getDraft(currentDocId);
  if (doc?.publishUrl) {
    window.open(doc.publishUrl, '_blank');
  }
}

/**
 * Update publish status display
 */
async function updatePublishStatus() {
  if (!currentDocId) return;
  
  const doc = await storageManager.getDraft(currentDocId);
  const isPublished = doc?.isPublished;
  
  // For now, we just update the publish button text
  // The actual status display can be added to the UI later
  if (publishArticleBtn) {
    if (isPublished) {
      publishArticleBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Published
      `;
      publishArticleBtn.disabled = true;
    } else {
      publishArticleBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
        Publish Article
      `;
      publishArticleBtn.disabled = false;
    }
  }
}

// ============ Online/Offline Status ============

/**
 * Handle online/offline status change
 */
function handleOnlineStatus() {
  if (navigator.onLine) {
    document.body.classList.remove('offline');
  } else {
    document.body.classList.add('offline');
  }
  updateSyncStatus();
}

// ============ Toast Notifications ============

/**
 * Show toast notification
 */
function showToast(type, message) {
  if (!toastContainer) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffc107" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066cc" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close">&times;</button>
  `;
  
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });
  
  toastContainer.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// ============ Utility Functions ============

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============ Override loadDocument to load tags ============

const originalLoadDocument = loadDocument;
loadDocument = async function(docId) {
  await originalLoadDocument(docId);
  
  // Load document-specific data
  const doc = await storageManager.getDraft(docId);
  if (doc) {
    loadDocumentTags(doc);
    
    // Update group select
    if (groupSelect) {
      groupSelect.value = doc.groupId || '';
    }
    
    updatePublishStatus();
  }
};

// ============ Override loadSavedDocuments to update UI ============

const originalLoadSavedDocuments = loadSavedDocuments;
loadSavedDocuments = async function() {
  await originalLoadSavedDocuments();
  renderGroupsList();
  updateTagsSidebar();
  filterAndRenderDocuments();
};

// ============ AI Features ============

/**
 * Initialize AI features
 */
async function initializeAI() {
  if (typeof aiManager === 'undefined') {
    console.warn('AI Manager not available');
    return;
  }
  
  try {
    await aiManager.init();
    
    // Listen for AI state changes
    aiManager.onStateChange((state) => {
      updateAIButtonState(state.isAvailable);
    });
    
    // Initial state update
    updateAIButtonState(aiManager.isAvailable());
  } catch (error) {
    console.error('Failed to initialize AI:', error);
  }
}

/**
 * Setup AI event listeners
 */
function setupAIEventListeners() {
  const aiHelpWriteBtn = document.getElementById('aiHelpWriteBtn');
  
  if (aiHelpWriteBtn) {
    aiHelpWriteBtn.addEventListener('click', handleAIHelpWrite);
  }
}

/**
 * Update AI button state based on availability
 */
function updateAIButtonState(isAvailable) {
  const aiHelpWriteBtn = document.getElementById('aiHelpWriteBtn');
  if (aiHelpWriteBtn) {
    aiHelpWriteBtn.disabled = !isAvailable;
    aiHelpWriteBtn.title = isAvailable 
      ? 'Polish and enhance content with AI' 
      : 'Configure AI in settings to enable this feature';
  }
}

/**
 * Handle AI Polish operation
 */
async function handleAIPolish() {
  const content = markdownEditor?.value || '';
  const aiAssistantBtn = document.getElementById('aiAssistantBtn');
  
  if (!content.trim()) {
    showToast('warning', 'Please add some content first before polishing.');
    return;
  }
  
  if (!aiManager.canMakeRequest()) {
    const seconds = aiManager.getTimeUntilNextRequest();
    showToast('warning', `Rate limit: Please wait ${seconds} seconds before making another request.`);
    return;
  }
  
  try {
    // Show loading state on AI button
    if (aiAssistantBtn) {
      aiAssistantBtn.classList.add('loading');
      aiAssistantBtn.disabled = true;
    }
    
    // Open modal with original content
    openAIPreviewModal('Polish Content', content, 'polish');
    
    // Call AI API
    const result = await aiManager.polishContent(content);
    
    if (result.success) {
      displayAIResult(result.content);
      showToast('success', 'Content polished successfully!');
    } else {
      displayAIError(result.error);
      showToast('error', 'Failed to polish content: ' + result.error);
    }
  } catch (error) {
    console.error('AI Polish error:', error);
    displayAIError(error.message || 'An unexpected error occurred');
    showToast('error', 'An unexpected error occurred. Please try again.');
  } finally {
    // Remove loading state from AI button
    if (aiAssistantBtn) {
      aiAssistantBtn.classList.remove('loading');
      aiAssistantBtn.disabled = false;
    }
  }
}

/**
 * Auto-process captured content with AI translation and enhancement
 */
async function autoProcessCapturedContent() {
  // Check if AI is available
  if (!aiManager || !aiManager.isAvailable()) {
    console.log('AI not available for auto-processing');
    return;
  }
  
  const content = markdownEditor?.value || '';
  if (!content.trim()) {
    return;
  }
  
  // Check rate limit
  if (!aiManager.canMakeRequest()) {
    console.log('Rate limit reached, skipping auto-processing');
    return;
  }
  
  const aiHelpWriteBtn = document.getElementById('aiHelpWriteBtn');
  
  try {
    // Show loading state
    if (aiHelpWriteBtn) {
      aiHelpWriteBtn.classList.add('processing');
      aiHelpWriteBtn.disabled = true;
    }
    
    showToast('info', 'Auto-processing captured content with AI... Translating to English...');
    
    // Call AI API
    const result = await aiManager.helpWrite(content);
    
    if (result.success) {
      // Replace content with AI-generated version
      markdownEditor.value = result.content;
      
      // Parse front matter to update title, tags, etc.
      await parseAndUpdateMetadata(result.content);
      
      // Trigger content change and preview
      handleContentChange();
      renderPreview();
      
      // Auto-save the document
      await saveDocument();
      
      showToast('success', 'Content translated to English and enhanced successfully!');
    } else {
      showToast('warning', 'Auto-processing failed: ' + result.error + '. You can edit manually or try again.');
    }
  } catch (error) {
    console.error('Auto-processing error:', error);
    showToast('warning', 'Auto-processing failed. You can edit the content manually.');
  } finally {
    // Remove loading state
    if (aiHelpWriteBtn) {
      aiHelpWriteBtn.classList.remove('processing');
      // Re-enable based on AI availability
      updateAIButtonState(aiManager.isAvailable());
    }
  }
}

/**
 * Handle AI Help Write operation
 */
async function handleAIHelpWrite() {
  const content = markdownEditor?.value || '';
  const aiHelpWriteBtn = document.getElementById('aiHelpWriteBtn');
  
  if (!content.trim()) {
    showToast('warning', 'Please add some content first.');
    return;
  }
  
  if (!aiManager.canMakeRequest()) {
    const seconds = aiManager.getTimeUntilNextRequest();
    showToast('warning', `Rate limit: Please wait ${seconds} seconds before making another request.`);
    return;
  }
  
  try {
    // Show loading state on AI button
    if (aiHelpWriteBtn) {
      aiHelpWriteBtn.classList.add('processing');
      aiHelpWriteBtn.disabled = true;
    }
    
    showToast('info', 'AI is processing your content... This may take 10-30 seconds.');
    
    // Call AI API
    const result = await aiManager.helpWrite(content);
    
    if (result.success) {
      // Replace content with AI-generated version
      markdownEditor.value = result.content;
      
      // Parse front matter to update title, tags, etc.
      await parseAndUpdateMetadata(result.content);
      
      // Trigger content change and preview
      handleContentChange();
      renderPreview();
      
      // Auto-save the document
      await saveDocument();
      
      showToast('success', 'Content enhanced and saved successfully!');
    } else {
      showToast('error', 'Failed to process content: ' + result.error);
    }
  } catch (error) {
    console.error('AI Help Write error:', error);
    showToast('error', 'An unexpected error occurred. Please try again.');
  } finally {
    // Remove loading state from AI button
    if (aiHelpWriteBtn) {
      aiHelpWriteBtn.classList.remove('processing');
      aiHelpWriteBtn.disabled = false;
      updateAIButtonState(aiManager.isAvailable());
    }
  }
}

/**
 * Parse YAML front matter and update document metadata
 */
async function parseAndUpdateMetadata(content) {
  try {
    // Extract YAML front matter
    const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontMatterMatch) {
      console.log('No front matter found');
      return;
    }
    
    const frontMatterText = frontMatterMatch[1];
    const lines = frontMatterText.split('\n');
    const metadata = {};
    let currentKey = null;
    const tagsArray = [];
    
    // Parse YAML with support for arrays
    lines.forEach(line => {
      // Check for array items (tags)
      const arrayMatch = line.match(/^\s*-\s+(.+)$/);
      if (arrayMatch && currentKey === 'tags') {
        tagsArray.push(arrayMatch[1].trim());
        return;
      }
      
      // Check for key: value pairs
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        currentKey = key;
        
        if (key === 'tags' && !value) {
          // Tags array starts on next lines
          metadata[key] = [];
        } else if (value) {
          metadata[key] = value;
        }
      }
    });
    
    // Add collected tags to metadata
    if (tagsArray.length > 0) {
      metadata.tags = tagsArray;
    }
    
    // Update title if available
    if (metadata.title) {
      currentTitle = metadata.title;
      const titleElement = document.getElementById('docTitle');
      if (titleElement) {
        titleElement.textContent = metadata.title;
      }
    }
    
    // Update source URL if available
    if (metadata.source) {
      currentUrl = metadata.source;
      const sourceUrlElement = document.getElementById('sourceUrl');
      if (sourceUrlElement) {
        sourceUrlElement.textContent = metadata.source;
        sourceUrlElement.style.display = metadata.source ? 'block' : 'none';
      }
    }
    
    // Update tags if available
    if (metadata.tags && Array.isArray(metadata.tags)) {
      currentTags = metadata.tags;
      renderCurrentTags();
    }
    
    console.log('Metadata updated:', metadata);
  } catch (error) {
    console.error('Error parsing front matter:', error);
  }
}

/**
 * Open AI preview modal
 */
function openAIPreviewModal(title, originalContent, operation) {
  const modal = document.getElementById('aiPreviewModal');
  const modalTitle = document.getElementById('aiPreviewTitle');
  const originalPreview = document.getElementById('aiPreviewOriginal');
  const generatedPreview = document.getElementById('aiPreviewGenerated');
  const appendBtn = document.getElementById('aiPreviewAppend');
  const replaceBtn = document.getElementById('aiPreviewReplace');
  
  if (!modal) {
    console.error('AI Preview Modal not found in DOM');
    showToast('error', 'AI modal not available. Please refresh the page.');
    return;
  }
  
  // Set title
  if (modalTitle) modalTitle.textContent = title;
  
  // Set original content (render as markdown preview)
  if (originalPreview) {
    try {
      originalPreview.innerHTML = marked.parse(originalContent);
    } catch (error) {
      console.error('Error parsing original content:', error);
      originalPreview.textContent = originalContent;
    }
  }
  
  // Show loading state for generated content
  if (generatedPreview) {
    generatedPreview.className = 'ai-preview-content ai-preview-loading';
    generatedPreview.innerHTML = `
      <div class="loading-spinner"></div>
      <p>Processing your content...</p>
      <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">This may take 10-30 seconds</p>
    `;
  }
  
  // Disable action buttons
  if (appendBtn) appendBtn.disabled = true;
  if (replaceBtn) replaceBtn.disabled = true;
  
  // Store operation type for later use
  modal.dataset.operation = operation;
  modal.dataset.originalContent = originalContent;
  
  // Show modal with slight delay to ensure DOM is ready
  requestAnimationFrame(() => {
    modal.style.display = 'flex';
    // Ensure modal is visible
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
  });
}

/**
 * Display AI result in preview modal
 */
function displayAIResult(content) {
  const generatedPreview = document.getElementById('aiPreviewGenerated');
  const appendBtn = document.getElementById('aiPreviewAppend');
  const replaceBtn = document.getElementById('aiPreviewReplace');
  const modal = document.getElementById('aiPreviewModal');
  
  if (!generatedPreview) {
    console.error('Generated preview element not found');
    return;
  }
  
  // Store generated content
  if (modal) modal.dataset.generatedContent = content;
  
  // Render generated content
  generatedPreview.className = 'ai-preview-content';
  try {
    generatedPreview.innerHTML = marked.parse(content);
  } catch (error) {
    console.error('Error parsing generated content:', error);
    generatedPreview.textContent = content;
  }
  
  // Enable action buttons
  if (appendBtn) appendBtn.disabled = false;
  if (replaceBtn) replaceBtn.disabled = false;
}

/**
 * Display AI error in preview modal
 */
function displayAIError(error) {
  const generatedPreview = document.getElementById('aiPreviewGenerated');
  const appendBtn = document.getElementById('aiPreviewAppend');
  const replaceBtn = document.getElementById('aiPreviewReplace');
  
  if (!generatedPreview) {
    console.error('Generated preview element not found');
    return;
  }
  
  // Ensure buttons stay disabled on error
  if (appendBtn) appendBtn.disabled = true;
  if (replaceBtn) replaceBtn.disabled = true;
  
  generatedPreview.className = 'ai-preview-content';
  generatedPreview.innerHTML = `
    <div style="color: var(--text-secondary); text-align: center; padding: 40px;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px; opacity: 0.5; color: #dc3545;">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p style="font-size: 14px; font-weight: 500; margin-bottom: 8px; color: var(--text-primary);">Request Failed</p>
      <p style="font-size: 13px; color: var(--text-secondary);">${escapeHtml(error)}</p>
      <p style="font-size: 12px; color: var(--text-secondary); margin-top: 16px;">Please check your API key and try again.</p>
    </div>
  `;
}

/**
 * Close AI preview modal
 */
function closeAIPreviewModal() {
  const modal = document.getElementById('aiPreviewModal');
  if (modal) {
    modal.style.display = 'none';
    modal.dataset.operation = '';
    modal.dataset.originalContent = '';
    modal.dataset.generatedContent = '';
  }
}

/**
 * Handle append AI content to bottom
 */
function handleAIAppend() {
  const modal = document.getElementById('aiPreviewModal');
  const generatedContent = modal?.dataset.generatedContent;
  
  if (!generatedContent || !markdownEditor) {
    showToast('error', 'No content to append');
    return;
  }
  
  try {
    const currentContent = markdownEditor.value;
    const separator = currentContent.trim() ? '\n\n---\n\n' : '';
    
    markdownEditor.value = currentContent + separator + generatedContent;
    
    // Trigger content change handling
    handleContentChange();
    renderPreview();
    
    closeAIPreviewModal();
    showToast('success', 'AI-generated content appended to the bottom.');
  } catch (error) {
    console.error('Error appending content:', error);
    showToast('error', 'Failed to append content. Please try again.');
  }
}

/**
 * Handle replace content with AI content
 */
function handleAIReplace() {
  const modal = document.getElementById('aiPreviewModal');
  const generatedContent = modal?.dataset.generatedContent;
  
  if (!generatedContent || !markdownEditor) {
    showToast('error', 'No content to replace');
    return;
  }
  
  // Confirm replacement
  if (!confirm('Are you sure you want to replace the entire content with the AI-generated version?')) {
    return;
  }
  
  try {
    markdownEditor.value = generatedContent;
    
    // Trigger content change handling
    handleContentChange();
    renderPreview();
    
    closeAIPreviewModal();
    showToast('success', 'Content replaced with AI-generated version.');
  } catch (error) {
    console.error('Error replacing content:', error);
    showToast('error', 'Failed to replace content. Please try again.');
  }
}
