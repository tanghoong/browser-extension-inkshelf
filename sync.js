// Sync Module for InkShelf v2.0
// Handles bidirectional sync with Tulis.app cloud

class SyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.syncInterval = null;
    this.lastSyncTimestamp = null;
    this.listeners = [];
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Load last sync timestamp
    this.lastSyncTimestamp = parseInt(localStorage.getItem('inkshelf-last-sync')) || null;
  }

  /**
   * Initialize sync manager
   */
  async init() {
    if (!CONFIG.FEATURES.CLOUD_SYNC) {
      console.log('Cloud sync is disabled');
      return;
    }
    
    // Start sync interval if logged in
    if (authManager.isLoggedIn()) {
      this.startSyncInterval();
      
      // Process any pending items
      if (this.isOnline) {
        await this.processSyncQueue();
      }
    }
    
    // Listen for auth changes
    authManager.onAuthStateChange((state) => {
      if (state.isLoggedIn) {
        this.startSyncInterval();
      } else {
        this.stopSyncInterval();
      }
    });
  }

  /**
   * Start automatic sync interval
   */
  startSyncInterval() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline && authManager.isLoggedIn() && !this.isSyncing) {
        this.sync();
      }
    }, CONFIG.SYNC_INTERVAL);
    
    console.log('Sync interval started');
  }

  /**
   * Stop automatic sync interval
   */
  stopSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Sync interval stopped');
    }
  }

  /**
   * Handle online event
   */
  async handleOnline() {
    this.isOnline = true;
    console.log('Network: Online');
    this.notifyListeners({ type: 'online' });
    
    // Process queued items
    if (authManager.isLoggedIn()) {
      await this.processSyncQueue();
    }
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    this.isOnline = false;
    console.log('Network: Offline');
    this.notifyListeners({ type: 'offline' });
  }

  /**
   * Perform full sync
   */
  async sync() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: false, reason: 'already_syncing' };
    }
    
    if (!this.isOnline) {
      console.log('Cannot sync: offline');
      return { success: false, reason: 'offline' };
    }
    
    if (!authManager.isLoggedIn()) {
      console.log('Cannot sync: not logged in');
      return { success: false, reason: 'not_logged_in' };
    }
    
    this.isSyncing = true;
    this.notifyListeners({ type: 'sync_start' });
    
    try {
      // 1. Process local queue first
      await this.processSyncQueue();
      
      // 2. Get local changes since last sync
      const localChanges = await this.getLocalChanges();
      
      // 3. Send to server and get server changes
      const response = await authManager.apiRequest('/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          clientTimestamp: Date.now(),
          lastSyncTimestamp: this.lastSyncTimestamp,
          changes: localChanges
        })
      });
      
      if (!response.ok) {
        throw new Error('Sync request failed');
      }
      
      const data = await response.json();
      
      // 4. Apply server changes locally
      await this.applyServerChanges(data.data);
      
      // 5. Update last sync timestamp
      this.lastSyncTimestamp = data.data.serverTimestamp;
      localStorage.setItem('inkshelf-last-sync', this.lastSyncTimestamp.toString());
      
      // 6. Clear completed sync queue items
      await storageManager.clearCompletedSyncItems();
      
      this.isSyncing = false;
      this.notifyListeners({ 
        type: 'sync_complete',
        applied: data.data.applied?.length || 0,
        received: data.data.serverChanges?.length || 0,
        conflicts: data.data.conflicts?.length || 0
      });
      
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Sync error:', error);
      this.isSyncing = false;
      this.notifyListeners({ type: 'sync_error', error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get local changes since last sync
   */
  async getLocalChanges() {
    const allDrafts = await storageManager.getAllDrafts();
    const changes = [];
    
    for (const draft of allDrafts) {
      // Check if modified since last sync
      if (!this.lastSyncTimestamp || draft.updatedAt > this.lastSyncTimestamp) {
        changes.push({
          docId: draft.docId,
          action: 'upsert',
          data: {
            title: draft.title,
            content: draft.content,
            url: draft.url,
            groupId: draft.groupId,
            groupName: draft.groupName,
            tags: draft.tags,
            starred: draft.starred,
            updatedAt: draft.updatedAt
          }
        });
      }
    }
    
    // Also include pending queue items
    const pendingItems = await storageManager.getPendingSyncItems();
    for (const item of pendingItems) {
      if (item.action === 'delete') {
        changes.push({
          docId: item.docId,
          action: 'delete',
          updatedAt: item.timestamp
        });
      }
    }
    
    return changes;
  }

  /**
   * Apply changes from server
   * @param {Object} data - Server sync response
   */
  async applyServerChanges(data) {
    // Handle applied items (update cloudId)
    if (data.applied) {
      for (const applied of data.applied) {
        const draft = await storageManager.getDraft(applied.docId);
        if (draft) {
          draft.cloudId = applied.cloudId;
          draft.syncedAt = Date.now();
          draft.syncStatus = 'synced';
          await storageManager.saveDraft(draft);
        }
      }
    }
    
    // Handle conflicts (last-write-wins, server data applied)
    if (data.conflicts) {
      for (const conflict of data.conflicts) {
        if (conflict.resolution === 'server_wins' && conflict.serverData) {
          const draft = await storageManager.getDraft(conflict.docId);
          if (draft) {
            // Update with server data
            Object.assign(draft, conflict.serverData);
            draft.syncedAt = Date.now();
            draft.syncStatus = 'synced';
            await storageManager.saveDraft(draft);
            
            // Notify about conflict resolution
            this.notifyListeners({
              type: 'conflict_resolved',
              docId: conflict.docId,
              resolution: 'server_wins'
            });
          }
        }
      }
    }
    
    // Handle server changes (new or updated from other devices)
    if (data.serverChanges) {
      for (const change of data.serverChanges) {
        if (change.action === 'upsert') {
          let draft = await storageManager.getDraft(change.docId);
          
          if (!draft) {
            // New document from server
            draft = {
              docId: change.docId,
              cloudId: change.cloudId,
              ...change.data,
              timestamp: change.data.createdAt || Date.now(),
              syncedAt: Date.now(),
              syncStatus: 'synced'
            };
          } else {
            // Update existing
            Object.assign(draft, change.data);
            draft.cloudId = change.cloudId;
            draft.syncedAt = Date.now();
            draft.syncStatus = 'synced';
          }
          
          await storageManager.saveDraft(draft);
        } else if (change.action === 'delete') {
          await storageManager.deleteDraft(change.docId);
        }
      }
    }
  }

  /**
   * Process pending sync queue
   */
  async processSyncQueue() {
    if (!this.isOnline || !authManager.isLoggedIn()) {
      return;
    }
    
    const pendingItems = await storageManager.getPendingSyncItems();
    
    for (const item of pendingItems) {
      if (item.retryCount >= CONFIG.SYNC_MAX_RETRIES) {
        await storageManager.updateSyncQueueItem(item.id, 'failed', 'Max retries exceeded');
        continue;
      }
      
      try {
        await storageManager.updateSyncQueueItem(item.id, 'syncing');
        
        // Process based on action
        if (item.action === 'delete') {
          const draft = await storageManager.getDraft(item.docId);
          if (draft?.cloudId) {
            await authManager.apiRequest(`/api/documents/${draft.cloudId}`, {
              method: 'DELETE'
            });
          }
        }
        
        await storageManager.updateSyncQueueItem(item.id, 'completed');
      } catch (error) {
        console.error('Failed to process sync queue item:', error);
        await storageManager.updateSyncQueueItem(item.id, 'pending', error.message);
      }
    }
  }

  /**
   * Queue document for sync
   * @param {string} docId - Document ID
   * @param {string} action - Action type
   * @param {Object} data - Optional data
   */
  async queueForSync(docId, action, data = null) {
    // Add to sync queue
    await storageManager.addToSyncQueue({ docId, action, data });
    
    // Update document sync status
    if (action !== 'delete') {
      const draft = await storageManager.getDraft(docId);
      if (draft) {
        draft.syncStatus = 'pending';
        await storageManager.saveDraft(draft);
      }
    }
    
    // Try to sync immediately if online
    if (this.isOnline && authManager.isLoggedIn() && !this.isSyncing) {
      setTimeout(() => this.sync(), 1000);
    }
    
    this.notifyListeners({ type: 'queued', docId, action });
  }

  /**
   * Get sync status
   */
  async getStatus() {
    const queueCounts = await storageManager.getSyncQueueCounts();
    
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      isLoggedIn: authManager.isLoggedIn(),
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastSyncTime: this.lastSyncTimestamp 
        ? new Date(this.lastSyncTimestamp).toLocaleString() 
        : 'Never',
      pendingChanges: queueCounts.pending,
      failedChanges: queueCounts.failed,
      totalQueued: queueCounts.total
    };
  }

  /**
   * Force sync now
   */
  async syncNow() {
    return this.sync();
  }

  /**
   * Add listener for sync events
   * @param {Function} callback - Callback function
   */
  onSyncEvent(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners
   * @private
   */
  notifyListeners(event) {
    this.listeners.forEach(callback => callback(event));
  }
}

// Export singleton instance
const syncManager = new SyncManager();
