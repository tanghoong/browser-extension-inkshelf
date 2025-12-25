// Background Service Worker for InkShelf
// Handles tab management, message relay, and editor tab creation

// Storage for active editor tabs
const editorTabs = new Map();

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  captureCurrentTab(tab, 'clean');
});

// Listen for keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-page') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        captureCurrentTab(tabs[0], 'clean');
      }
    });
  }
});

// Listen for messages from content script and editor
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'CAPTURE_CONTENT':
      handleCaptureContent(message.data, sender.tab);
      sendResponse({ success: true });
      break;
    
    case 'OPEN_EDITOR':
      openEditorTab(message.data);
      sendResponse({ success: true });
      break;
    
    case 'EDITOR_CLOSED':
      handleEditorClosed(message.tabId);
      sendResponse({ success: true });
      break;
    
    case 'GET_TAB_STATE':
      sendResponse({ editorTabs: Array.from(editorTabs.entries()) });
      break;
    
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
      break;
  }
  
  return true; // Keep message channel open for async response
});

// Listen for tab closure to clean up
chrome.tabs.onRemoved.addListener((tabId) => {
  if (editorTabs.has(tabId)) {
    editorTabs.delete(tabId);
  }
});

/**
 * Capture content from current tab
 * @param {Object} tab - Chrome tab object
 * @param {string} mode - Capture mode: 'clean', 'selection', 'snapshot'
 */
async function captureCurrentTab(tab, mode = 'clean') {
  try {
    // Inject content script if not already present
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['libs/Readability.js', 'content.js']
    });
    
    // Send capture command to content script
    await chrome.tabs.sendMessage(tab.id, {
      type: 'CAPTURE_PAGE',
      mode: mode
    });
  } catch (error) {
    console.error('Failed to capture page:', error);
  }
}

/**
 * Open editor tab with captured content
 * @param {Object} data - Contains docId, content, title, url, mode
 */
function openEditorTab(data) {
  const editorUrl = chrome.runtime.getURL('editor.html');
  
  // Check if editor tab for this docId already exists
  let existingTabId = null;
  for (const [tabId, tabData] of editorTabs.entries()) {
    if (tabData.docId === data.docId) {
      existingTabId = tabId;
      break;
    }
  }
  
  if (existingTabId) {
    // Focus existing tab
    chrome.tabs.update(existingTabId, { active: true });
  } else {
    // Create new editor tab
    chrome.tabs.create({
      url: editorUrl,
      active: true
    }, (tab) => {
      // Store tab info
      editorTabs.set(tab.id, {
        docId: data.docId,
        created: Date.now()
      });
      
      // Wait for tab to load, then send data
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.sendMessage(tab.id, {
            type: 'INIT_EDITOR',
            data: data
          });
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    });
  }
}

/**
 * Handle editor tab closure
 * @param {number} tabId - Tab ID
 */
function handleEditorClosed(tabId) {
  editorTabs.delete(tabId);
}

/**
 * Handle captured content from content script
 * @param {Object} data - Captured content data
 * @param {Object} tab - Source tab
 */
function handleCaptureContent(data, tab) {
  openEditorTab({
    ...data,
    sourceTabId: tab.id,
    isNewCapture: true  // Flag to trigger auto-processing
  });
}
