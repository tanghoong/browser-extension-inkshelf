// File Handler for InkShelf
// Handles .md file drops and file:// protocol URLs

// Intercept file:// URLs that point to .md files
if (window.location.protocol === 'file:' && window.location.pathname.endsWith('.md')) {
  // Load the file and open in InkShelf editor
  loadLocalMarkdownFile();
}

/**
 * Load local markdown file
 */
async function loadLocalMarkdownFile() {
  try {
    const response = await fetch(window.location.href);
    const content = await response.text();
    const filename = window.location.pathname.split('/').pop();
    
    // Open in InkShelf editor
    chrome.runtime.sendMessage({
      type: 'OPEN_EDITOR',
      data: {
        docId: `file:${filename}_${Date.now()}`,
        content: content,
        title: filename.replace('.md', ''),
        url: window.location.href,
        mode: 'file',
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Failed to load markdown file:', error);
  }
}

// Enhanced drag and drop handler for the entire browser window
document.addEventListener('DOMContentLoaded', () => {
  // Prevent default file handling on all pages
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, (e) => {
      const items = e.dataTransfer?.items;
      if (items) {
        for (let item of items) {
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file && file.name.endsWith('.md')) {
              e.preventDefault();
              e.stopPropagation();
              
              if (eventName === 'drop') {
                handleMarkdownFileDrop(file);
              }
              return;
            }
          }
        }
      }
    }, true);
  });
});

/**
 * Handle markdown file drop
 * @param {File} file - Dropped file
 */
async function handleMarkdownFileDrop(file) {
  try {
    const content = await file.text();
    
    // Open in InkShelf
    chrome.runtime.sendMessage({
      type: 'OPEN_EDITOR',
      data: {
        docId: `file:${file.name}_${file.size}_${file.lastModified}`,
        content: content,
        title: file.name.replace('.md', ''),
        url: '',
        mode: 'file',
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Failed to load dropped file:', error);
  }
}
