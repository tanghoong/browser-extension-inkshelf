// Popup script for Tulis.my

document.addEventListener('DOMContentLoaded', () => {
  const captureClean = document.getElementById('captureClean');
  const openDashboard = document.getElementById('openDashboard');
  const openSettings = document.getElementById('openSettings');
  
  // Capture clean article
  captureClean.addEventListener('click', () => {
    captureCurrentPage('clean');
  });
  
  // Open Tulis.my dashboard
  openDashboard.addEventListener('click', () => {
    openDashboardPage();
  });
  
  // Open settings page
  openSettings.addEventListener('click', () => {
    openSettingsPage();
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

/**
 * Open Tulis.my dashboard (editor without content)
 */
async function openDashboardPage() {
  try {
    const editorUrl = chrome.runtime.getURL('editor.html');
    await chrome.tabs.create({ url: editorUrl, active: true });
    window.close();
  } catch (error) {
    console.error('Failed to open dashboard:', error);
  }
}

/**
 * Open settings page
 */
async function openSettingsPage() {
  try {
    const settingsUrl = chrome.runtime.getURL('settings.html');
    await chrome.tabs.create({ url: settingsUrl, active: true });
    window.close();
  } catch (error) {
    console.error('Failed to open settings:', error);
  }
}
