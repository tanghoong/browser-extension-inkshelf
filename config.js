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
    TAGS: true,
    AI_FEATURES: true
  },
  
  // AI Settings
  AI: {
    STORAGE_KEYS: {
      ENABLED: 'inkshelf-ai-enabled',
      PROVIDER: 'inkshelf-ai-provider',
      API_KEY: 'inkshelf-ai-key',
      MODEL: 'inkshelf-ai-model',
      LAST_REQUEST_TIME: 'inkshelf-ai-last-request'
    },
    PROVIDERS: {
      OPENAI: {
        name: 'OpenAI',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-4o-mini'
      },
      DEEPSEEK: {
        name: 'DeepSeek',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        models: ['deepseek-chat', 'deepseek-coder'],
        defaultModel: 'deepseek-chat'
      },
      CUSTOM: {
        name: 'Custom',
        endpoint: '',
        models: [],
        defaultModel: ''
      }
    },
    RATE_LIMIT: {
      MAX_REQUESTS_PER_MINUTE: 5,
      MIN_INTERVAL_MS: 12000 // 12 seconds (60000ms / 5 requests)
    },
    PROMPTS: {
      POLISH: 'You are a professional content editor. Polish the following content while maintaining its original language and meaning. Format it in proper markdown with YAML front matter at the beginning (including title, date, tags, and description). Remove ads/banners/irrelevant content, keep only the pure content with references. Structure: Start with ---\ntitle: [title]\ndate: [date]\ntags: [relevant tags]\ndescription: [brief description]\n---\n\nThen the polished markdown content. Return ONLY the complete markdown with front matter, without any explanations or meta-commentary.',
      HELP_WRITE: 'You are a professional content creator and editor. Transform the provided content into an engaging, well-structured article IN ENGLISH with:\n\n1. LANGUAGE CONVERSION:\n- Detect the source language automatically\n- Translate ALL content to English\n- Use natural, native English grammar and expressions\n- NOT just direct word-for-word translation\n- Adapt idioms, phrases, and cultural references to English equivalents\n- Maintain the original meaning while making it sound naturally written in English\n\n2. YAML Front Matter (required structure):\n---\ntitle: [catchy, engaging English title]\ncreated_at: [current date in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ]\nupdated_at: [current date in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ]\ntags:\n  - [tag1]\n  - [tag2]\n  - [tag3]\nsource: [original source URL if available, otherwise omit this field]\ndescription: [compelling 1-2 sentence English summary]\n---\n\n3. Content Guidelines:\n- Rewrite with better wording and professional English tone\n- Create catchy, attention-grabbing English title\n- Organize into clear sections with proper markdown headings (##, ###)\n- Enhance readability with proper formatting (bold, italics, lists, quotes)\n- Add context and insights to make it informative and valuable\n- Remove ads, banners, and irrelevant content\n- Keep factual accuracy - NO hallucinations or made-up information\n- Maintain original facts and data\n- Expand explanations where helpful\n- Use current date/time for created_at and updated_at fields\n\n4. Style: Write as a native English content creator would - engaging, clear, and reader-friendly while maintaining professionalism.\n\nReturn ONLY the complete English markdown with YAML front matter, without any explanations or meta-commentary.'
    }
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
Object.freeze(CONFIG.AI);
Object.freeze(CONFIG.AI.STORAGE_KEYS);
Object.freeze(CONFIG.AI.PROVIDERS);
Object.freeze(CONFIG.AI.RATE_LIMIT);
Object.freeze(CONFIG.AI.PROMPTS);
