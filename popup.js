// Popup script for InkShelf

document.addEventListener('DOMContentLoaded', () => {
  const captureClean = document.getElementById('captureClean');
  const captureSelection = document.getElementById('captureSelection');
  const captureSnapshot = document.getElementById('captureSnapshot');
  
  // Capture clean article
  captureClean.addEventListener('click', () => {
    captureCurrentPage('clean');
  });
  
  // Capture selection only
  captureSelection.addEventListener('click', () => {
    captureCurrentPage('selection');
  });
  
  // Capture page snapshot
  captureSnapshot.addEventListener('click', () => {
    captureCurrentPage('snapshot');
  });
});

/**
 * Capture current page with specified mode
 * @param {string} mode - Capture mode: 'clean', 'selection', 'snapshot'
 */
async function captureCurrentPage(mode) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.error('No active tab found');
      return;
    }
    
    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['libs/Readability.js', 'content.js']
    });
    
    // Send capture message
    await chrome.tabs.sendMessage(tab.id, {
      type: 'CAPTURE_PAGE',
      mode: mode
    });
    
    // Close popup
    window.close();
  } catch (error) {
    console.error('Failed to capture page:', error);
  }
}
