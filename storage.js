// Storage Manager for InkShelf v2.0
// Handles document storage using sessionStorage and IndexedDB
// Includes: Groups, Tags, Sync Queue, Data Migration

class StorageManager {
  constructor() {
    this.DB_NAME = 'InkShelfDB';
    this.DB_VERSION = 2; // Upgraded from v1 to v2
    this.STORE_NAME = 'drafts';
    this.GROUPS_STORE = 'groups';
    this.SYNC_QUEUE_STORE = 'syncQueue';
    this.db = null;
    this.initDB();
  }
  
  /**
   * Initialize IndexedDB with v2 schema
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
        const oldVersion = event.oldVersion;
        
        console.log(`Upgrading database from v${oldVersion} to v${this.DB_VERSION}`);
        
        // Create or upgrade drafts store
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const objectStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'docId' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('status', 'status', { unique: false });
          objectStore.createIndex('groupId', 'groupId', { unique: false });
          objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          objectStore.createIndex('starred', 'starred', { unique: false });
        } else if (oldVersion < 2) {
          // Migrate existing store - add new indexes
          const transaction = event.target.transaction;
          const objectStore = transaction.objectStore(this.STORE_NAME);
          
          if (!objectStore.indexNames.contains('groupId')) {
            objectStore.createIndex('groupId', 'groupId', { unique: false });
          }
          if (!objectStore.indexNames.contains('updatedAt')) {
            objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!objectStore.indexNames.contains('starred')) {
            objectStore.createIndex('starred', 'starred', { unique: false });
          }
        }
        
        // Create groups store (new in v2)
        if (!db.objectStoreNames.contains(this.GROUPS_STORE)) {
          const groupsStore = db.createObjectStore(this.GROUPS_STORE, { keyPath: 'groupId' });
          groupsStore.createIndex('order', 'order', { unique: false });
          groupsStore.createIndex('name', 'name', { unique: false });
        }
        
        // Create sync queue store (new in v2)
        if (!db.objectStoreNames.contains(this.SYNC_QUEUE_STORE)) {
          const syncStore = db.createObjectStore(this.SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('docId', 'docId', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
        }
        
        // If upgrading from v1, trigger data migration after upgrade
        if (oldVersion < 2 && oldVersion > 0) {
          this._pendingMigration = true;
        }
      };
    });
  }
  
  /**
   * Run data migration from v1 to v2 schema
   * Adds default values for new fields
   */
  async migrateToV2() {
    await this.ensureDB();
    
    console.log('Starting migration to v2...');
    
    // Create default group if it doesn't exist
    await this.ensureDefaultGroup();
    
    // Get all existing documents
    const allDrafts = await this.getAllDrafts();
    let migrated = 0;
    
    for (const draft of allDrafts) {
      let needsUpdate = false;
      
      // Add groupId if missing
      if (!draft.groupId) {
        draft.groupId = 'default';
        draft.groupName = 'Uncategorized';
        needsUpdate = true;
      }
      
      // Add tags array if missing
      if (!draft.tags) {
        draft.tags = this._extractTagsFromFrontmatter(draft.content) || [];
        needsUpdate = true;
      }
      
      // Add sync-related fields if missing
      if (draft.syncedAt === undefined) {
        draft.syncedAt = null;
        draft.cloudId = null;
        draft.syncStatus = 'pending';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await this.saveDraft(draft);
        migrated++;
      }
    }
    
    console.log(`Migration complete. ${migrated} documents updated.`);
    localStorage.setItem('inkshelf-migration-v2', Date.now().toString());
    
    return { migrated, total: allDrafts.length };
  }
  
  /**
   * Extract tags from YAML frontmatter
   * @private
   */
  _extractTagsFromFrontmatter(content) {
    if (!content) return [];
    
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return [];
    
    const frontmatter = frontmatterMatch[1];
    const tagsMatch = frontmatter.match(/tags:\s*\n((?:\s*-\s*.+\n?)*)/);
    if (!tagsMatch) return [];
    
    const tags = [];
    const tagLines = tagsMatch[1].match(/^\s*-\s*(.+)$/gm) || [];
    tagLines.forEach(line => {
      const tag = line.replace(/^\s*-\s*/, '').trim();
      if (tag) tags.push(tag);
    });
    
    return tags;
  }
  
  /**
   * Ensure default group exists
   */
  async ensureDefaultGroup() {
    const defaultGroup = await this.getGroup('default');
    if (!defaultGroup) {
      await this.saveGroup({
        groupId: 'default',
        name: 'Uncategorized',
        color: '#808080',
        icon: 'folder',
        order: -1,
        createdAt: Date.now()
      });
    }
  }
  
  /**
   * Save draft to IndexedDB (v2 schema)
   * @param {Object} draft - Draft object
   */
  async saveDraft(draft) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      
      // Extract tags from content if not explicitly provided
      const tags = draft.tags || this._extractTagsFromFrontmatter(draft.content) || [];
      
      const draftData = {
        docId: draft.docId,
        content: draft.content,
        title: draft.title || 'Untitled',
        url: draft.url || '',
        mode: draft.mode || 'clean',
        timestamp: draft.timestamp || Date.now(),
        updatedAt: Date.now(),
        status: draft.status || 'draft',
        starred: draft.starred !== undefined ? draft.starred : false,
        // v2 fields
        groupId: draft.groupId || 'default',
        groupName: draft.groupName || 'Uncategorized',
        tags: tags,
        syncedAt: draft.syncedAt || null,
        cloudId: draft.cloudId || null,
        syncStatus: draft.syncStatus || 'pending'
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
   * Get drafts by group
   * @param {string} groupId - Group ID
   */
  async getDraftsByGroup(groupId) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const index = objectStore.index('groupId');
      const request = index.getAll(groupId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to get drafts by group:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get drafts by tag
   * @param {string} tag - Tag name
   */
  async getDraftsByTag(tag) {
    await this.ensureDB();
    
    const allDrafts = await this.getAllDrafts();
    return allDrafts.filter(draft => 
      draft.tags && draft.tags.includes(tag)
    );
  }
  
  /**
   * Get starred drafts
   */
  async getStarredDrafts() {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const index = objectStore.index('starred');
      const request = index.getAll(true);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to get starred drafts:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get all unique tags with counts
   */
  async getAllTags() {
    const allDrafts = await this.getAllDrafts();
    const tagCounts = {};
    
    allDrafts.forEach(draft => {
      if (draft.tags && Array.isArray(draft.tags)) {
        draft.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    return Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  /**
   * Update document tags
   * @param {string} docId - Document ID
   * @param {string[]} tags - Array of tags
   * @param {string} currentContent - Optional current content to avoid fetching stale data
   */
  async updateTags(docId, tags, currentContent = null) {
    const draft = await this.getDraft(docId);
    if (draft) {
      draft.tags = tags;
      // Use provided current content if available, otherwise use draft content
      const contentToUpdate = currentContent !== null ? currentContent : draft.content;
      // Also update frontmatter in content
      draft.content = this._updateFrontmatterTags(contentToUpdate, tags);
      await this.saveDraft(draft);
    }
    return draft;
  }
  
  /**
   * Update YAML frontmatter tags in content
   * @private
   */
  _updateFrontmatterTags(content, tags) {
    if (!content) return content;
    
    const frontmatterMatch = content.match(/^(---\n)([\s\S]*?)(\n---)/);
    if (!frontmatterMatch) {
      // No frontmatter, create one
      const tagsYaml = tags.length > 0 
        ? `tags:\n${tags.map(t => `  - ${t}`).join('\n')}\n`
        : '';
      return `---\n${tagsYaml}---\n\n${content}`;
    }
    
    let frontmatter = frontmatterMatch[2];
    
    // Remove existing tags
    frontmatter = frontmatter.replace(/tags:\s*\n((?:\s*-\s*.+\n?)*)/g, '');
    frontmatter = frontmatter.replace(/tags:\s*\[.*\]\n?/g, '');
    
    // Add new tags
    if (tags.length > 0) {
      const tagsYaml = `tags:\n${tags.map(t => `  - ${t}`).join('\n')}\n`;
      frontmatter = frontmatter.trim() + '\n' + tagsYaml;
    }
    
    return `---\n${frontmatter.trim()}\n---${content.substring(frontmatterMatch[0].length)}`;
  }
  
  /**
   * Move document to group
   * @param {string} docId - Document ID
   * @param {string} groupId - Target group ID
   */
  async moveToGroup(docId, groupId) {
    const draft = await this.getDraft(docId);
    const group = await this.getGroup(groupId);
    
    if (draft && group) {
      draft.groupId = groupId;
      draft.groupName = group.name;
      // Update frontmatter
      draft.content = this._updateFrontmatterGroup(draft.content, group.name);
      await this.saveDraft(draft);
    }
    return draft;
  }
  
  /**
   * Update YAML frontmatter group in content
   * @private
   */
  _updateFrontmatterGroup(content, groupName) {
    if (!content) return content;
    
    const frontmatterMatch = content.match(/^(---\n)([\s\S]*?)(\n---)/);
    if (!frontmatterMatch) {
      return `---\ngroup: "${groupName}"\n---\n\n${content}`;
    }
    
    let frontmatter = frontmatterMatch[2];
    
    // Remove existing group
    frontmatter = frontmatter.replace(/group:\s*["']?[^"'\n]*["']?\n?/g, '');
    
    // Add new group
    frontmatter = `group: "${groupName}"\n` + frontmatter.trim();
    
    return `---\n${frontmatter.trim()}\n---${content.substring(frontmatterMatch[0].length)}`;
  }

  // ============================================
  // GROUP MANAGEMENT
  // ============================================
  
  /**
   * Save group to IndexedDB
   * @param {Object} group - Group object
   */
  async saveGroup(group) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.GROUPS_STORE], 'readwrite');
      const objectStore = transaction.objectStore(this.GROUPS_STORE);
      
      const groupData = {
        groupId: group.groupId || `group:${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: group.name || 'New Group',
        color: group.color || '#4A90D9',
        icon: group.icon || 'folder',
        order: group.order !== undefined ? group.order : 0,
        createdAt: group.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      
      const request = objectStore.put(groupData);
      
      request.onsuccess = () => {
        resolve(groupData);
      };
      
      request.onerror = () => {
        console.error('Failed to save group:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get group by ID
   * @param {string} groupId - Group ID
   */
  async getGroup(groupId) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.GROUPS_STORE], 'readonly');
      const objectStore = transaction.objectStore(this.GROUPS_STORE);
      const request = objectStore.get(groupId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to get group:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get all groups
   */
  async getAllGroups() {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.GROUPS_STORE], 'readonly');
      const objectStore = transaction.objectStore(this.GROUPS_STORE);
      const request = objectStore.getAll();
      
      request.onsuccess = () => {
        // Sort by order
        const groups = request.result.sort((a, b) => a.order - b.order);
        resolve(groups);
      };
      
      request.onerror = () => {
        console.error('Failed to get all groups:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Delete group (moves documents to default)
   * @param {string} groupId - Group ID
   */
  async deleteGroup(groupId) {
    if (groupId === 'default') {
      throw new Error('Cannot delete default group');
    }
    
    await this.ensureDB();
    
    // Move all documents in this group to default
    const drafts = await this.getDraftsByGroup(groupId);
    for (const draft of drafts) {
      await this.moveToGroup(draft.docId, 'default');
    }
    
    // Delete the group
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.GROUPS_STORE], 'readwrite');
      const objectStore = transaction.objectStore(this.GROUPS_STORE);
      const request = objectStore.delete(groupId);
      
      request.onsuccess = () => {
        resolve({ movedDocuments: drafts.length });
      };
      
      request.onerror = () => {
        console.error('Failed to delete group:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get groups with document counts
   */
  async getGroupsWithCounts() {
    const groups = await this.getAllGroups();
    const allDrafts = await this.getAllDrafts();
    
    const countsByGroup = {};
    allDrafts.forEach(draft => {
      const gid = draft.groupId || 'default';
      countsByGroup[gid] = (countsByGroup[gid] || 0) + 1;
    });
    
    return groups.map(group => ({
      ...group,
      documentCount: countsByGroup[group.groupId] || 0
    }));
  }

  // ============================================
  // SYNC QUEUE MANAGEMENT
  // ============================================
  
  /**
   * Add item to sync queue
   * @param {Object} item - Sync queue item
   */
  async addToSyncQueue(item) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.SYNC_QUEUE_STORE], 'readwrite');
      const objectStore = transaction.objectStore(this.SYNC_QUEUE_STORE);
      
      const queueItem = {
        docId: item.docId,
        action: item.action, // 'create', 'update', 'delete'
        data: item.data || null,
        timestamp: Date.now(),
        status: 'pending', // 'pending', 'syncing', 'completed', 'failed'
        retryCount: 0,
        error: null
      };
      
      const request = objectStore.add(queueItem);
      
      request.onsuccess = () => {
        queueItem.id = request.result;
        resolve(queueItem);
      };
      
      request.onerror = () => {
        console.error('Failed to add to sync queue:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get pending sync queue items
   */
  async getPendingSyncItems() {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.SYNC_QUEUE_STORE], 'readonly');
      const objectStore = transaction.objectStore(this.SYNC_QUEUE_STORE);
      const index = objectStore.index('status');
      const request = index.getAll('pending');
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to get pending sync items:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Update sync queue item status
   * @param {number} id - Queue item ID
   * @param {string} status - New status
   * @param {string} error - Error message (optional)
   */
  async updateSyncQueueItem(id, status, error = null) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.SYNC_QUEUE_STORE], 'readwrite');
      const objectStore = transaction.objectStore(this.SYNC_QUEUE_STORE);
      const getRequest = objectStore.get(id);
      
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.status = status;
          item.error = error;
          if (status === 'failed') {
            item.retryCount = (item.retryCount || 0) + 1;
          }
          
          const putRequest = objectStore.put(item);
          putRequest.onsuccess = () => resolve(item);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(null);
        }
      };
      
      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }
  
  /**
   * Remove completed sync queue items
   */
  async clearCompletedSyncItems() {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.SYNC_QUEUE_STORE], 'readwrite');
      const objectStore = transaction.objectStore(this.SYNC_QUEUE_STORE);
      const index = objectStore.index('status');
      const request = index.openCursor(IDBKeyRange.only('completed'));
      
      let deleted = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          resolve({ deleted });
        }
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  /**
   * Get sync queue count by status
   */
  async getSyncQueueCounts() {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.SYNC_QUEUE_STORE], 'readonly');
      const objectStore = transaction.objectStore(this.SYNC_QUEUE_STORE);
      const request = objectStore.getAll();
      
      request.onsuccess = () => {
        const items = request.result;
        const counts = {
          pending: 0,
          syncing: 0,
          completed: 0,
          failed: 0,
          total: items.length
        };
        
        items.forEach(item => {
          counts[item.status] = (counts[item.status] || 0) + 1;
        });
        
        resolve(counts);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // ============================================
  // SESSION STORAGE (unchanged)
  // ============================================
  
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
    
    // Check for pending migration
    if (this._pendingMigration) {
      this._pendingMigration = false;
      await this.migrateToV2();
    }
  }

  // ============================================
  // BACKUP & EXPORT
  // ============================================
  
  /**
   * Export all data for backup
   * Returns object with all documents, groups, and settings
   */
  async exportAllData() {
    const drafts = await this.getAllDrafts();
    const groups = await this.getAllGroups();
    
    return {
      version: this.DB_VERSION,
      exportedAt: new Date().toISOString(),
      documents: drafts,
      groups: groups,
      settings: this._getSettings()
    };
  }
  
  /**
   * Import data from backup
   * @param {Object} data - Backup data
   * @param {string} strategy - 'merge' or 'replace'
   */
  async importData(data, strategy = 'merge') {
    const results = {
      imported: 0,
      skipped: 0,
      groups: 0,
      errors: []
    };
    
    // Import groups first
    if (data.groups && Array.isArray(data.groups)) {
      for (const group of data.groups) {
        try {
          if (strategy === 'replace' || !(await this.getGroup(group.groupId))) {
            await this.saveGroup(group);
            results.groups++;
          }
        } catch (error) {
          results.errors.push(`Group ${group.name}: ${error.message}`);
        }
      }
    }
    
    // Import documents
    if (data.documents && Array.isArray(data.documents)) {
      for (const doc of data.documents) {
        try {
          const existing = await this.getDraft(doc.docId);
          
          if (strategy === 'replace' || !existing) {
            await this.saveDraft(doc);
            results.imported++;
          } else if (strategy === 'merge' && existing) {
            // Keep newer version
            if (doc.updatedAt > existing.updatedAt) {
              await this.saveDraft(doc);
              results.imported++;
            } else {
              results.skipped++;
            }
          }
        } catch (error) {
          results.errors.push(`Document ${doc.title}: ${error.message}`);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Get settings from localStorage
   * @private
   */
  _getSettings() {
    return {
      theme: localStorage.getItem('inkshelf-theme') || 'light',
      autosave: localStorage.getItem('inkshelf-autosave') !== 'false',
      wordcount: localStorage.getItem('inkshelf-wordcount') !== 'false',
      fontsize: localStorage.getItem('inkshelf-fontsize') || 'medium',
      exportformat: localStorage.getItem('inkshelf-exportformat') || 'markdown',
      wordwrap: localStorage.getItem('inkshelf-wordwrap') !== 'false'
    };
  }
  
  /**
   * Delete all data (danger zone)
   */
  async deleteAllData() {
    await this.ensureDB();
    
    const transaction = this.db.transaction(
      [this.STORE_NAME, this.GROUPS_STORE, this.SYNC_QUEUE_STORE], 
      'readwrite'
    );
    
    await Promise.all([
      new Promise((resolve, reject) => {
        const req = transaction.objectStore(this.STORE_NAME).clear();
        req.onsuccess = resolve;
        req.onerror = reject;
      }),
      new Promise((resolve, reject) => {
        const req = transaction.objectStore(this.GROUPS_STORE).clear();
        req.onsuccess = resolve;
        req.onerror = reject;
      }),
      new Promise((resolve, reject) => {
        const req = transaction.objectStore(this.SYNC_QUEUE_STORE).clear();
        req.onsuccess = resolve;
        req.onerror = reject;
      })
    ]);
    
    // Recreate default group
    await this.ensureDefaultGroup();
    
    return { success: true };
  }

  // ============================================
  // STATIC UTILITIES
  // ============================================
  
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
  
  /**
   * Generate group ID
   */
  static generateGroupId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `group:${timestamp}_${random}`;
  }
}

// Export singleton instance
const storageManager = new StorageManager();

