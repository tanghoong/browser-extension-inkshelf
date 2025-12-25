// Settings Script for InkShelf

// DOM elements
const backButton = document.getElementById('backButton');
const themeToggle = document.getElementById('themeToggle');
const autoSaveToggle = document.getElementById('autoSaveToggle');
const wordCountToggle = document.getElementById('wordCountToggle');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const exportFormatSelect = document.getElementById('exportFormatSelect');
const configurePlatformsBtn = document.getElementById('configurePlatformsBtn');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');

// Backup elements
const exportBackupBtn = document.getElementById('exportBackupBtn');
const importBackupBtn = document.getElementById('importBackupBtn');
const importBackupInput = document.getElementById('importBackupInput');
const autoBackupToggle = document.getElementById('autoBackupToggle');
const backupIntervalSetting = document.getElementById('backupIntervalSetting');
const backupIntervalSelect = document.getElementById('backupIntervalSelect');
const lastBackupTime = document.getElementById('lastBackupTime');

// AI elements
const aiEnabledToggle = document.getElementById('aiEnabledToggle');
const aiProviderSetting = document.getElementById('aiProviderSetting');
const aiProviderSelect = document.getElementById('aiProviderSelect');
const aiApiKeySetting = document.getElementById('aiApiKeySetting');
const aiApiKeyInput = document.getElementById('aiApiKeyInput');
const aiModelSetting = document.getElementById('aiModelSetting');
const aiModelSelect = document.getElementById('aiModelSelect');
const aiRateLimitInfo = document.getElementById('aiRateLimitInfo');

// Initialize settings on load
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize AI manager first
  if (typeof aiManager !== 'undefined') {
    await aiManager.init();
  }
  
  loadSettings();
  setupEventListeners();
  loadBackupSettings();
  await loadAISettings();
});

/**
 * Load settings from storage
 */
function loadSettings() {
  // Load theme
  const theme = localStorage.getItem('inkshelf-theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.classList.toggle('active', theme === 'dark');

  // Load other settings
  const autoSave = localStorage.getItem('inkshelf-autosave') !== 'false';
  autoSaveToggle.classList.toggle('active', autoSave);

  const showWordCount = localStorage.getItem('inkshelf-wordcount') !== 'false';
  wordCountToggle.classList.toggle('active', showWordCount);

  const fontSize = localStorage.getItem('inkshelf-fontsize') || 'medium';
  fontSizeSelect.value = fontSize;

  const exportFormat = localStorage.getItem('inkshelf-exportformat') || 'markdown';
  exportFormatSelect.value = exportFormat;
}

/**
 * Load backup settings
 */
function loadBackupSettings() {
  // Load auto backup setting
  const autoBackup = localStorage.getItem('inkshelf-autobackup') === 'true';
  if (autoBackupToggle) {
    autoBackupToggle.classList.toggle('active', autoBackup);
  }
  if (backupIntervalSetting) {
    backupIntervalSetting.style.display = autoBackup ? 'flex' : 'none';
  }
  
  // Load backup interval
  const backupInterval = localStorage.getItem('inkshelf-backup-interval') || 'daily';
  if (backupIntervalSelect) {
    backupIntervalSelect.value = backupInterval;
  }
  
  // Load last backup time
  const lastBackup = localStorage.getItem('inkshelf-last-backup');
  if (lastBackupTime) {
    if (lastBackup) {
      lastBackupTime.textContent = formatRelativeTime(parseInt(lastBackup));
    } else {
      lastBackupTime.textContent = 'Never';
    }
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Back button
  backButton.addEventListener('click', () => {
    window.close();
  });

  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);

  // Auto-save toggle
  autoSaveToggle.addEventListener('click', () => {
    const isActive = autoSaveToggle.classList.toggle('active');
    localStorage.setItem('inkshelf-autosave', isActive);
  });

  // Word count toggle
  wordCountToggle.addEventListener('click', () => {
    const isActive = wordCountToggle.classList.toggle('active');
    localStorage.setItem('inkshelf-wordcount', isActive);
  });

  // Font size select
  fontSizeSelect.addEventListener('change', () => {
    localStorage.setItem('inkshelf-fontsize', fontSizeSelect.value);
  });

  // Export format select
  exportFormatSelect.addEventListener('change', () => {
    localStorage.setItem('inkshelf-exportformat', exportFormatSelect.value);
  });

  // Configure platforms
  configurePlatformsBtn.addEventListener('click', () => {
    alert('Platform configuration coming soon!');
  });

  // Backup event listeners
  if (exportBackupBtn) {
    exportBackupBtn.addEventListener('click', handleExportBackup);
  }
  
  if (importBackupBtn) {
    importBackupBtn.addEventListener('click', () => {
      importBackupInput?.click();
    });
  }
  
  if (importBackupInput) {
    importBackupInput.addEventListener('change', handleImportBackup);
  }
  
  if (autoBackupToggle) {
    autoBackupToggle.addEventListener('click', toggleAutoBackup);
  }
  
  if (backupIntervalSelect) {
    backupIntervalSelect.addEventListener('change', () => {
      localStorage.setItem('inkshelf-backup-interval', backupIntervalSelect.value);
    });
  }

  // AI event listeners
  if (aiEnabledToggle) {
    aiEnabledToggle.addEventListener('click', toggleAIFeatures);
  }
  
  if (aiProviderSelect) {
    aiProviderSelect.addEventListener('change', handleAIProviderChange);
  }
  
  if (aiApiKeyInput) {
    aiApiKeyInput.addEventListener('change', saveAISettings);
    aiApiKeyInput.addEventListener('blur', saveAISettings);
  }
  
  if (aiModelSelect) {
    aiModelSelect.addEventListener('change', saveAISettings);
  }

  // Delete all documents
  deleteAllBtn.addEventListener('click', deleteAllDocuments);

  // Reset settings
  resetSettingsBtn.addEventListener('click', resetSettings);
}

/**
 * Toggle theme between light and dark
 */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('inkshelf-theme', newTheme);
  themeToggle.classList.toggle('active', newTheme === 'dark');
}

/**
 * Toggle auto backup
 */
function toggleAutoBackup() {
  const isActive = autoBackupToggle.classList.toggle('active');
  localStorage.setItem('inkshelf-autobackup', isActive);
  
  if (backupIntervalSetting) {
    backupIntervalSetting.style.display = isActive ? 'flex' : 'none';
  }
}

/**
 * Handle export backup
 */
async function handleExportBackup() {
  const originalText = exportBackupBtn.innerHTML;
  exportBackupBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; animation: spin 1s linear infinite;">
      <circle cx="12" cy="12" r="10"></circle>
    </svg>
    Exporting...
  `;
  exportBackupBtn.disabled = true;
  
  try {
    if (typeof backupManager !== 'undefined') {
      await backupManager.exportBackup();
      
      // Update last backup time
      localStorage.setItem('inkshelf-last-backup', Date.now().toString());
      loadBackupSettings();
      
      showNotification('Backup exported successfully!', 'success');
    } else {
      // Fallback if backup manager not available
      await exportBackupFallback();
    }
  } catch (error) {
    console.error('Export failed:', error);
    showNotification('Failed to export backup: ' + error.message, 'error');
  } finally {
    exportBackupBtn.innerHTML = originalText;
    exportBackupBtn.disabled = false;
  }
}

/**
 * Fallback export function if backupManager is not available
 */
async function exportBackupFallback() {
  // Get all documents
  const documents = await storageManager.getAllDrafts();
  const groups = await storageManager.getAllGroups();
  
  // Create metadata
  const metadata = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    documentCount: documents.length,
    groupCount: groups.length
  };
  
  // Create a simple JSON backup
  const backup = {
    metadata,
    documents,
    groups
  };
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inkshelf-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Handle import backup
 */
async function handleImportBackup(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  
  const confirmed = confirm(
    'Importing a backup will add documents to your existing collection. Continue?'
  );
  
  if (!confirmed) {
    importBackupInput.value = '';
    return;
  }
  
  const originalText = importBackupBtn.innerHTML;
  importBackupBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; animation: spin 1s linear infinite;">
      <circle cx="12" cy="12" r="10"></circle>
    </svg>
    Importing...
  `;
  importBackupBtn.disabled = true;
  
  try {
    if (typeof backupManager !== 'undefined' && file.name.endsWith('.zip')) {
      const result = await backupManager.importBackup(file);
      showNotification(`Imported ${result.imported} documents successfully!`, 'success');
    } else if (file.name.endsWith('.json')) {
      // Handle JSON backup
      await importJsonBackup(file);
    } else {
      throw new Error('Please select a valid backup file (.zip or .json)');
    }
  } catch (error) {
    console.error('Import failed:', error);
    showNotification('Failed to import backup: ' + error.message, 'error');
  } finally {
    importBackupBtn.innerHTML = originalText;
    importBackupBtn.disabled = false;
    importBackupInput.value = '';
  }
}

/**
 * Import JSON backup
 */
async function importJsonBackup(file) {
  const text = await file.text();
  const backup = JSON.parse(text);
  
  let imported = 0;
  
  // Import groups first
  if (backup.groups) {
    for (const group of backup.groups) {
      try {
        await storageManager.saveGroup(group);
      } catch (e) {
        console.warn('Failed to import group:', e);
      }
    }
  }
  
  // Import documents
  if (backup.documents) {
    for (const doc of backup.documents) {
      try {
        // Generate new docId to avoid conflicts
        doc.docId = 'imported_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await storageManager.saveDraft(doc);
        imported++;
      } catch (e) {
        console.warn('Failed to import document:', e);
      }
    }
  }
  
  showNotification(`Imported ${imported} documents successfully!`, 'success');
}

/**
 * Delete all documents
 */
async function deleteAllDocuments() {
  const confirmed = confirm(
    'Are you sure you want to delete ALL documents? This action cannot be undone!'
  );

  if (!confirmed) return;

  const doubleConfirm = confirm(
    'This will permanently delete all your saved documents. Are you absolutely sure?'
  );

  if (!doubleConfirm) return;

  try {
    // Clear IndexedDB
    const request = indexedDB.deleteDatabase('InkShelfDB');
    
    request.onsuccess = () => {
      showNotification('All documents have been deleted successfully.', 'success');
    };

    request.onerror = () => {
      showNotification('Failed to delete documents. Please try again.', 'error');
    };
  } catch (error) {
    console.error('Error deleting documents:', error);
    showNotification('An error occurred while deleting documents.', 'error');
  }
}

/**
 * Reset all settings to default
 */
function resetSettings() {
  const confirmed = confirm('Reset all settings to default values?');
  
  if (!confirmed) return;

  // Clear all settings
  localStorage.removeItem('inkshelf-theme');
  localStorage.removeItem('inkshelf-autosave');
  localStorage.removeItem('inkshelf-wordcount');
  localStorage.removeItem('inkshelf-fontsize');
  localStorage.removeItem('inkshelf-exportformat');
  localStorage.removeItem('inkshelf-autobackup');
  localStorage.removeItem('inkshelf-backup-interval');

  // Reload settings
  loadSettings();
  loadBackupSettings();
  
  showNotification('Settings have been reset to default values.', 'info');
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  // Create toast container if not exists
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
    `;
    document.body.appendChild(toastContainer);
  }
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 12px 16px;
    margin-top: 8px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-left: 4px solid ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#0066cc'};
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Load AI settings from chrome.storage.local
 */
async function loadAISettings() {
  if (typeof aiManager === 'undefined') return;
  
  try {
    // Get current AI state
    const enabled = aiManager.enabled;
    const provider = aiManager.provider || 'OPENAI';
    const apiKey = aiManager.apiKey || '';
    const model = aiManager.model || '';
    
    // Update UI
    if (aiEnabledToggle) {
      aiEnabledToggle.classList.toggle('active', enabled);
    }
    
    if (aiProviderSelect) {
      aiProviderSelect.value = provider;
    }
    
    if (aiApiKeyInput) {
      aiApiKeyInput.value = apiKey;
    }
    
    // Populate model dropdown based on provider
    populateModelSelect(provider);
    
    if (aiModelSelect && model) {
      aiModelSelect.value = model;
    }
    
    // Show/hide AI settings based on enabled state
    updateAISettingsVisibility(enabled);
  } catch (error) {
    console.error('Failed to load AI settings:', error);
  }
}

/**
 * Populate model select dropdown based on provider
 */
function populateModelSelect(provider) {
  if (!aiModelSelect) return;
  
  const providerConfig = CONFIG.AI.PROVIDERS[provider];
  if (!providerConfig) return;
  
  // Clear existing options
  aiModelSelect.innerHTML = '';
  
  // Add models
  providerConfig.models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    aiModelSelect.appendChild(option);
  });
  
  // Set default model
  if (providerConfig.defaultModel) {
    aiModelSelect.value = providerConfig.defaultModel;
  }
}

/**
 * Toggle AI features on/off
 */
async function toggleAIFeatures() {
  const isActive = aiEnabledToggle.classList.toggle('active');
  
  try {
    await aiManager.saveConfig({ enabled: isActive });
    updateAISettingsVisibility(isActive);
    
    if (isActive) {
      showNotification('AI features enabled. Configure your API key below.', 'info');
    } else {
      showNotification('AI features disabled.', 'info');
    }
  } catch (error) {
    console.error('Failed to toggle AI features:', error);
    showNotification('Failed to update AI settings.', 'error');
  }
}

/**
 * Update visibility of AI settings based on enabled state
 */
function updateAISettingsVisibility(enabled) {
  const settingsToToggle = [
    aiProviderSetting,
    aiApiKeySetting,
    aiModelSetting,
    aiRateLimitInfo
  ];
  
  settingsToToggle.forEach(element => {
    if (element) {
      element.style.display = enabled ? 'flex' : 'none';
    }
  });
}

/**
 * Handle AI provider change
 */
async function handleAIProviderChange() {
  const provider = aiProviderSelect.value;
  
  // Populate models for new provider
  populateModelSelect(provider);
  
  // Save to aiManager
  await saveAISettings();
}

/**
 * Save AI settings
 */
async function saveAISettings() {
  if (typeof aiManager === 'undefined') return;
  
  try {
    const config = {
      provider: aiProviderSelect?.value || 'OPENAI',
      apiKey: aiApiKeyInput?.value || '',
      model: aiModelSelect?.value || ''
    };
    
    const result = await aiManager.saveConfig(config);
    
    if (result.success) {
      // Don't show notification on every keystroke, only on blur or explicit save
      console.log('AI settings saved');
    } else {
      showNotification('Failed to save AI settings: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Failed to save AI settings:', error);
    showNotification('Failed to save AI settings.', 'error');
  }
}

