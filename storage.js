// Storage Manager for InkShelf
// Handles document storage using sessionStorage and IndexedDB

class StorageManager {
  constructor() {
    this.DB_NAME = 'InkShelfDB';
    this.DB_VERSION = 1;
    this.STORE_NAME = 'drafts';
    this.db = null;
    this.initDB();
  }
  
  /**
   * Initialize IndexedDB
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const objectStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'docId' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }
  
  /**
   * Save draft to IndexedDB
   * @param {Object} draft - Draft object
   */
  async saveDraft(draft) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      
      const draftData = {
        docId: draft.docId,
        content: draft.content,
        title: draft.title || 'Untitled',
        url: draft.url || '',
        mode: draft.mode || 'clean',
        timestamp: draft.timestamp || Date.now(),
        updatedAt: Date.now(),
        status: 'draft',
        starred: draft.starred !== undefined ? draft.starred : false
      };
      
      const request = objectStore.put(draftData);
      
      request.onsuccess = () => {
        resolve(draftData);
      };
      
      request.onerror = () => {
        console.error('Failed to save draft:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get draft from IndexedDB
   * @param {string} docId - Document ID
   */
  async getDraft(docId) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const request = objectStore.get(docId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to get draft:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Delete draft from IndexedDB
   * @param {string} docId - Document ID
   */
  async deleteDraft(docId) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const request = objectStore.delete(docId);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        console.error('Failed to delete draft:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get all drafts
   */
  async getAllDrafts() {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const request = objectStore.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to get all drafts:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Save to sessionStorage (for current tab)
   * @param {string} docId - Document ID
   * @param {string} content - Markdown content
   */
  saveToSession(docId, content) {
    try {
      sessionStorage.setItem(`inkshelf_${docId}`, content);
      sessionStorage.setItem('inkshelf_current_doc', docId);
    } catch (error) {
      console.error('Failed to save to sessionStorage:', error);
    }
  }
  
  /**
   * Get from sessionStorage
   * @param {string} docId - Document ID
   */
  getFromSession(docId) {
    try {
      return sessionStorage.getItem(`inkshelf_${docId}`);
    } catch (error) {
      console.error('Failed to get from sessionStorage:', error);
      return null;
    }
  }
  
  /**
   * Clear session storage for document
   * @param {string} docId - Document ID
   */
  clearSession(docId) {
    try {
      sessionStorage.removeItem(`inkshelf_${docId}`);
      if (sessionStorage.getItem('inkshelf_current_doc') === docId) {
        sessionStorage.removeItem('inkshelf_current_doc');
      }
    } catch (error) {
      console.error('Failed to clear sessionStorage:', error);
    }
  }
  
  /**
   * Ensure DB is initialized
   */
  async ensureDB() {
    if (!this.db) {
      await this.initDB();
    }
  }
  
  /**
   * Generate document ID from file
   * @param {File} file - File object
   */
  static generateFileDocId(file) {
    const hash = `${file.name}_${file.size}_${file.lastModified}`;
    return `file:${btoa(hash).substring(0, 16)}`;
  }
  
  /**
   * Generate temporary document ID
   */
  static generateTempDocId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `temp:${timestamp}_${random}`;
  }
}

// Export singleton instance
const storageManager = new StorageManager();
