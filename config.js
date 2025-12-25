// Configuration for InkShelf v2.0
// Tulis.app cloud integration settings

const CONFIG = {
  // API Configuration
  API_BASE_URL: 'https://api.tulis.app',
  // API_BASE_URL: 'http://localhost:3000', // Uncomment for development
  
  // Sync Settings
  SYNC_INTERVAL: 30000,           // 30 seconds between sync attempts
  SYNC_RETRY_DELAY: 5000,         // 5 seconds delay before retry
  SYNC_MAX_RETRIES: 3,            // Maximum retry attempts per item
  OFFLINE_QUEUE_MAX: 100,         // Maximum items in offline queue
  
  // Backup Settings
  AUTO_BACKUP_INTERVAL: 86400000, // 24 hours
  BACKUP_VERSION: '2.0',
  
  // Token Settings
  ACCESS_TOKEN_KEY: 'inkshelf-access-token',
  REFRESH_TOKEN_KEY: 'inkshelf-refresh-token',
  USER_DATA_KEY: 'inkshelf-user',
  
  // Feature Flags
  FEATURES: {
    CLOUD_SYNC: true,
    PUBLISHING: true,
    BACKUP: true,
    GROUPS: true,
    TAGS: true
  },
  
  // UI Settings
  SIDEBAR_WIDTH: 280,
  RIGHT_SIDEBAR_WIDTH: 260,
  
  // Default Group Colors
  GROUP_COLORS: [
    '#4A90D9', // Blue
    '#50C878', // Green
    '#FF6B6B', // Red
    '#FFD700', // Gold
    '#9B59B6', // Purple
    '#E67E22', // Orange
    '#1ABC9C', // Teal
    '#34495E', // Dark Gray
  ],
  
  // Default Group Icons
  GROUP_ICONS: [
    'folder',
    'book',
    'code',
    'star',
    'archive',
    'bookmark',
    'file-text',
    'globe'
  ]
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.FEATURES);
Object.freeze(CONFIG.GROUP_COLORS);
Object.freeze(CONFIG.GROUP_ICONS);
