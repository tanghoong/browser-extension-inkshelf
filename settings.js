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

// Initialize settings on load
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
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
      alert('All documents have been deleted successfully.');
    };

    request.onerror = () => {
      alert('Failed to delete documents. Please try again.');
    };
  } catch (error) {
    console.error('Error deleting documents:', error);
    alert('An error occurred while deleting documents.');
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

  // Reload settings
  loadSettings();
  
  alert('Settings have been reset to default values.');
}
