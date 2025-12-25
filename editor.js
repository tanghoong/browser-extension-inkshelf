// Editor Script for InkShelf
// Handles editor UI, preview/edit toggle, and file operations

let currentDocId = null;
let currentContent = '';
let currentTitle = '';
let currentUrl = '';
let viewMode = 'preview'; // 'preview', 'edit', 'split'
let savedDocuments = [];
let isScrollSyncing = false; // Prevent scroll feedback loop

// DOM elements
const previewPanel = document.getElementById('previewPanel');
const editPanel = document.getElementById('editPanel');
const mainContent = document.getElementById('mainContent');
const previewContent = document.getElementById('previewContent');
const markdownEditor = document.getElementById('markdownEditor');
const previewModeBtn = document.getElementById('previewModeBtn');
const editModeBtn = document.getElementById('editModeBtn');
const splitModeBtn = document.getElementById('splitModeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const docTitle = document.getElementById('docTitle');
const sourceUrl = document.getElementById('sourceUrl');
const statusText = document.getElementById('statusText');
const wordCount = document.getElementById('wordCount');
const dropZone = document.getElementById('dropZone');
const themeToggle = document.getElementById('themeToggle');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarToggleFloat = document.getElementById('sidebarToggleFloat');
const newDocBtn = document.getElementById('newDocBtn');
const documentList = document.getElementById('documentList');
const sidebarRight = document.getElementById('sidebarRight');
const sidebarRightToggle = document.getElementById('sidebarRightToggle');
const sidebarRightToggleFloat = document.getElementById('sidebarRightToggleFloat');

// Initialize editor
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  setupEventListeners();
  setupDragAndDrop();
  
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
  currentUrl = data.url || '';
  
  // Update UI
  docTitle.textContent = currentTitle;
  docTitle.setAttribute('contenteditable', 'true');
  sourceUrl.textContent = currentUrl;
  
  // Check for existing draft in session storage
  const sessionContent = storageManager.getFromSession(currentDocId);
  if (sessionContent) {
    currentContent = sessionContent;
  } else {
    // Check IndexedDB for existing draft
    const savedDraft = await storageManager.getDraft(currentDocId);
    if (savedDraft) {
      currentContent = savedDraft.content;
    }
  }
  
  // Set editor content
  markdownEditor.value = currentContent;
  
  // Render preview
  renderPreview();
  
  // Save to IndexedDB
  await storageManager.saveDraft({
    docId: currentDocId,
    content: currentContent,
    title: currentTitle,
    url: currentUrl,
    mode: data.mode
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  
  // View mode toggles
  previewModeBtn.addEventListener('click', () => setViewMode('preview'));
  editModeBtn.addEventListener('click', () => setViewMode('edit'));
  splitModeBtn.addEventListener('click', () => setViewMode('split'));
  
  // Sidebar
  sidebarToggle.addEventListener('click', toggleSidebar);
  sidebarToggleFloat.addEventListener('click', toggleSidebar);
  newDocBtn.addEventListener('click', createNewDocument);
  
  // Right Sidebar
  sidebarRightToggle.addEventListener('click', toggleRightSidebar);
  sidebarRightToggleFloat.addEventListener('click', toggleRightSidebar);
  
  // Document actions
  saveBtn.addEventListener('click', saveDocument);
  downloadBtn.addEventListener('click', downloadMarkdown);
  copyBtn.addEventListener('click', copyMarkdown);
  deleteBtn.addEventListener('click', deleteDocument);
  
  // Auto-save on content change
  markdownEditor.addEventListener('input', handleContentChange);
  
  // Auto-update preview in split mode
  markdownEditor.addEventListener('input', () => {
    if (viewMode === 'split') {
      renderPreview();
    }
  });
  
  // Synchronized scrolling in split mode with debouncing
  let scrollTimeout;
  previewPanel.addEventListener('scroll', () => {
    if (viewMode === 'split' && !isScrollSyncing) {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        syncScroll('preview');
      }, 10);
    }
  });
  
  markdownEditor.addEventListener('scroll', () => {
    if (viewMode === 'split' && !isScrollSyncing) {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        syncScroll('edit');
      }, 10);
    }
  });
  
  // Handle title editing
  docTitle.addEventListener('blur', () => {
    const newTitle = docTitle.textContent.trim();
    if (newTitle && newTitle !== currentTitle) {
      currentTitle = newTitle;
      // Auto-save when title changes
      if (currentDocId) {
        saveDocument();
      }
    }
  });
  
  // Handle Enter key in title (blur instead of new line)
  docTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      docTitle.blur();
    }
  });
  
  // Handle tab close
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Load saved documents
  loadSavedDocuments();
}

/**
 * Set view mode (preview, edit, or split)
 */
function setViewMode(mode) {
  viewMode = mode;
  
  // Update button states
  previewModeBtn.classList.remove('active');
  editModeBtn.classList.remove('active');
  splitModeBtn.classList.remove('active');
  
  if (mode === 'preview') {
    previewModeBtn.classList.add('active');
    mainContent.classList.remove('split-view');
    previewPanel.style.display = 'block';
    editPanel.style.display = 'none';
    statusText.textContent = 'Preview Mode';
    renderPreview();
  } else if (mode === 'edit') {
    editModeBtn.classList.add('active');
    mainContent.classList.remove('split-view');
    previewPanel.style.display = 'none';
    editPanel.style.display = 'block';
    statusText.textContent = 'Edit Mode';
    markdownEditor.focus();
  } else if (mode === 'split') {
    splitModeBtn.classList.add('active');
    mainContent.classList.add('split-view');
    editPanel.style.display = 'block';
    previewPanel.style.display = 'block';
    statusText.textContent = 'Split View';
    renderPreview();
  }
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
  currentContent = markdownEditor.value;
  
  // Save to session storage
  storageManager.saveToSession(currentDocId, currentContent);
  
  // Debounced save to IndexedDB
  clearTimeout(window.saveTimeout);
  window.saveTimeout = setTimeout(async () => {
    await storageManager.saveDraft({
      docId: currentDocId,
      content: currentContent,
      title: currentTitle,
      url: currentUrl
    });
  }, 1000);
  
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
    
    // Visual feedback
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    copyBtn.style.background = '#28a745';
    
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.style.background = '';
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
    alert('Failed to copy to clipboard');
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
          <button class="menu-item star-btn ${starClass}" data-doc-id="${doc.docId}">
            <span class="star-icon">${starIcon}</span>
            <span>${doc.starred ? 'Unstar' : 'Star'}</span>
          </button>
          <button class="menu-item delete-btn" data-doc-id="${doc.docId}">
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
    deleteBtn.style.display = 'inline-block';
    renderDocumentList();
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
  
  // If deleting current document, create new one
  if (docId === currentDocId) {
    const newDocId = StorageManager.generateTempDocId();
    currentDocId = newDocId;
    currentContent = '';
    currentTitle = 'Untitled';
    currentUrl = '';
    markdownEditor.value = '';
    docTitle.textContent = currentTitle;
    sourceUrl.textContent = '';
    renderPreview();
    deleteBtn.style.display = 'none';
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
  
  // Extract title from content or use default
  const firstLine = currentContent.split('\n')[0];
  if (firstLine.startsWith('# ')) {
    currentTitle = firstLine.substring(2).trim();
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
  
  // Visual feedback
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saved!';
  saveBtn.style.background = '#28a745';
  
  setTimeout(() => {
    saveBtn.textContent = originalText;
    saveBtn.style.background = '';
  }, 2000);
  
  await loadSavedDocuments();
  deleteBtn.style.display = 'inline-block';
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
  
  // Hide delete button for new doc
  deleteBtn.style.display = 'none';
  
  // Switch to edit mode
  setViewMode('edit');
}
