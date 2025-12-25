// AI Manager Module for InkShelf
// Handles LLM API integration with BYOK support (OpenAI, DeepSeek, Custom)

class AIManager {
  constructor() {
    this.enabled = false;
    this.provider = null;
    this.apiKey = null;
    this.model = null;
    this.isInitialized = false;
    this.lastRequestTime = 0;
    this.listeners = [];
  }

  /**
   * Initialize AI manager from chrome.storage.local
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      // Load settings from chrome.storage.local
      const result = await chrome.storage.local.get([
        CONFIG.AI.STORAGE_KEYS.ENABLED,
        CONFIG.AI.STORAGE_KEYS.PROVIDER,
        CONFIG.AI.STORAGE_KEYS.API_KEY,
        CONFIG.AI.STORAGE_KEYS.MODEL,
        CONFIG.AI.STORAGE_KEYS.LAST_REQUEST_TIME
      ]);
      
      this.enabled = result[CONFIG.AI.STORAGE_KEYS.ENABLED] === true;
      this.provider = result[CONFIG.AI.STORAGE_KEYS.PROVIDER] || 'OPENAI';
      this.apiKey = result[CONFIG.AI.STORAGE_KEYS.API_KEY] || '';
      this.model = result[CONFIG.AI.STORAGE_KEYS.MODEL] || CONFIG.AI.PROVIDERS.OPENAI.defaultModel;
      this.lastRequestTime = result[CONFIG.AI.STORAGE_KEYS.LAST_REQUEST_TIME] || 0;
      
      this.isInitialized = true;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to initialize AI manager:', error);
      this.enabled = false;
    }
  }

  /**
   * Check if AI features are available
   */
  isAvailable() {
    return this.enabled && this.apiKey && this.provider;
  }

  /**
   * Check rate limiting
   */
  canMakeRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    return timeSinceLastRequest >= CONFIG.AI.RATE_LIMIT.MIN_INTERVAL_MS;
  }

  /**
   * Get time until next request allowed (in seconds)
   */
  getTimeUntilNextRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const timeRemaining = CONFIG.AI.RATE_LIMIT.MIN_INTERVAL_MS - timeSinceLastRequest;
    return Math.ceil(timeRemaining / 1000);
  }

  /**
   * Update last request time
   */
  async updateLastRequestTime() {
    this.lastRequestTime = Date.now();
    await chrome.storage.local.set({
      [CONFIG.AI.STORAGE_KEYS.LAST_REQUEST_TIME]: this.lastRequestTime
    });
  }

  /**
   * Save AI configuration
   */
  async saveConfig(config) {
    try {
      const updates = {};
      
      if (config.enabled !== undefined) {
        this.enabled = config.enabled;
        updates[CONFIG.AI.STORAGE_KEYS.ENABLED] = config.enabled;
      }
      
      if (config.provider !== undefined) {
        this.provider = config.provider;
        updates[CONFIG.AI.STORAGE_KEYS.PROVIDER] = config.provider;
        
        // Set default model for provider if not specified
        if (!config.model) {
          const providerConfig = CONFIG.AI.PROVIDERS[config.provider];
          this.model = providerConfig?.defaultModel || '';
          updates[CONFIG.AI.STORAGE_KEYS.MODEL] = this.model;
        }
      }
      
      if (config.apiKey !== undefined) {
        this.apiKey = config.apiKey;
        updates[CONFIG.AI.STORAGE_KEYS.API_KEY] = config.apiKey;
      }
      
      if (config.model !== undefined) {
        this.model = config.model;
        updates[CONFIG.AI.STORAGE_KEYS.MODEL] = config.model;
      }
      
      await chrome.storage.local.set(updates);
      this.notifyListeners();
      
      return { success: true };
    } catch (error) {
      console.error('Failed to save AI config:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current provider configuration
   */
  getProviderConfig() {
    return CONFIG.AI.PROVIDERS[this.provider] || null;
  }

  /**
   * Call LLM API with content and operation type
   * @param {string} content - Content to process
   * @param {string} operation - 'polish' or 'help_write'
   */
  async callAPI(content, operation) {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'AI features not configured. Please set up your API key in settings.'
      };
    }

    if (!this.canMakeRequest()) {
      const timeRemaining = this.getTimeUntilNextRequest();
      return {
        success: false,
        error: `Rate limit exceeded. Please wait ${timeRemaining} seconds before trying again.`
      };
    }

    const providerConfig = this.getProviderConfig();
    if (!providerConfig || !providerConfig.endpoint) {
      return {
        success: false,
        error: 'Invalid provider configuration.'
      };
    }

    // Get system prompt based on operation
    const systemPrompt = operation === 'polish' 
      ? CONFIG.AI.PROMPTS.POLISH 
      : CONFIG.AI.PROMPTS.HELP_WRITE;

    try {
      // Update rate limit
      await this.updateLastRequestTime();

      const response = await fetch(providerConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: content
            }
          ],
          temperature: operation === 'polish' ? 0.3 : 0.7,
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Extract content from response (OpenAI/DeepSeek compatible)
      const resultContent = data.choices?.[0]?.message?.content;
      
      if (!resultContent) {
        throw new Error('No content returned from API');
      }

      return {
        success: true,
        content: resultContent,
        usage: data.usage
      };
    } catch (error) {
      console.error('AI API error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Polish content (remove ads, format markdown, maintain language)
   */
  async polishContent(content) {
    return await this.callAPI(content, 'polish');
  }

  /**
   * Help write (expand draft into complete content)
   */
  async helpWrite(content) {
    return await this.callAPI(content, 'help_write');
  }

  /**
   * Register state change listener
   */
  onStateChange(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notify all listeners of state change
   */
  notifyListeners() {
    const state = {
      enabled: this.enabled,
      provider: this.provider,
      hasApiKey: !!this.apiKey,
      model: this.model,
      isAvailable: this.isAvailable()
    };
    
    this.listeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Clear AI configuration (for logout/reset)
   */
  async clearConfig() {
    this.enabled = false;
    this.provider = null;
    this.apiKey = null;
    this.model = null;
    this.lastRequestTime = 0;
    
    await chrome.storage.local.remove([
      CONFIG.AI.STORAGE_KEYS.ENABLED,
      CONFIG.AI.STORAGE_KEYS.PROVIDER,
      CONFIG.AI.STORAGE_KEYS.API_KEY,
      CONFIG.AI.STORAGE_KEYS.MODEL,
      CONFIG.AI.STORAGE_KEYS.LAST_REQUEST_TIME
    ]);
    
    this.notifyListeners();
  }
}

// Create global instance
const aiManager = new AIManager();
