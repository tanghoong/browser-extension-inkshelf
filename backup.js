// Backup Module for InkShelf v2.0
// Handles offline backup and restore functionality

class BackupManager {
  constructor() {
    this.BACKUP_PREFIX = 'inkshelf-backup';
  }

  /**
   * Export all documents as a ZIP file
   * @param {Object} options - Export options
   */
  async exportToZip(options = {}) {
    const { includeSettings = true } = options;
    
    // Check if JSZip is available
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library not loaded');
    }
    
    const zip = new JSZip();
    
    // Get all data
    const allDrafts = await storageManager.getAllDrafts();
    const allGroups = await storageManager.getAllGroups();
    
    // Create documents folder
    const docsFolder = zip.folder('documents');
    
    // Add each document as a .md file
    for (const draft of allDrafts) {
      const filename = this._sanitizeFilename(draft.title || draft.docId) + '.md';
      
      // Ensure frontmatter is complete
      const content = this._ensureCompleteFrontmatter(draft);
      docsFolder.file(filename, content);
    }
    
    // Create metadata.json with all structured data
    const metadata = {
      version: CONFIG.BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      documentCount: allDrafts.length,
      groupCount: allGroups.length,
      documents: allDrafts.map(d => ({
        docId: d.docId,
        title: d.title,
        url: d.url,
        groupId: d.groupId,
        groupName: d.groupName,
        tags: d.tags,
        starred: d.starred,
        status: d.status,
        timestamp: d.timestamp,
        updatedAt: d.updatedAt,
        syncedAt: d.syncedAt,
        cloudId: d.cloudId
      })),
      groups: allGroups
    };
    
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));
    
    // Add settings if requested
    if (includeSettings) {
      const settings = {
        theme: localStorage.getItem('inkshelf-theme') || 'light',
        autosave: localStorage.getItem('inkshelf-autosave'),
        wordcount: localStorage.getItem('inkshelf-wordcount'),
        fontsize: localStorage.getItem('inkshelf-fontsize'),
        exportformat: localStorage.getItem('inkshelf-exportformat'),
        wordwrap: localStorage.getItem('inkshelf-wordwrap')
      };
      zip.file('settings.json', JSON.stringify(settings, null, 2));
    }
    
    // Create manifest
    const manifest = {
      name: 'InkShelf Backup',
      version: CONFIG.BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      extensionVersion: chrome.runtime.getManifest?.()?.version || '2.0.0',
      documentCount: allDrafts.length,
      groupCount: allGroups.length,
      includesSettings: includeSettings
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    
    // Generate ZIP blob
    const blob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    return {
      blob,
      filename: this._generateBackupFilename(),
      documentCount: allDrafts.length,
      groupCount: allGroups.length,
      size: blob.size
    };
  }

  /**
   * Download backup as ZIP file
   */
  async downloadBackup(options = {}) {
    const result = await this.exportToZip(options);
    
    // Create download link
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Update last backup time
    localStorage.setItem('inkshelf-last-backup', Date.now().toString());
    
    return result;
  }

  /**
   * Import from ZIP file
   * @param {File} file - ZIP file to import
   * @param {string} strategy - 'merge' or 'replace'
   */
  async importFromZip(file, strategy = 'merge') {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library not loaded');
    }
    
    const results = {
      imported: 0,
      skipped: 0,
      groups: 0,
      errors: [],
      warnings: []
    };
    
    try {
      const zip = await JSZip.loadAsync(file);
      
      // Verify it's a valid InkShelf backup
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) {
        throw new Error('Invalid backup file: missing manifest.json');
      }
      
      const manifest = JSON.parse(await manifestFile.async('string'));
      if (manifest.name !== 'InkShelf Backup') {
        throw new Error('Invalid backup file: not an InkShelf backup');
      }
      
      // Load metadata
      const metadataFile = zip.file('metadata.json');
      let metadata = null;
      if (metadataFile) {
        metadata = JSON.parse(await metadataFile.async('string'));
      }
      
      // If replace strategy, clear existing data first
      if (strategy === 'replace') {
        await storageManager.deleteAllData();
      }
      
      // Import groups first
      if (metadata?.groups) {
        for (const group of metadata.groups) {
          try {
            const existing = await storageManager.getGroup(group.groupId);
            if (!existing || strategy === 'replace') {
              await storageManager.saveGroup(group);
              results.groups++;
            }
          } catch (error) {
            results.errors.push(`Group ${group.name}: ${error.message}`);
          }
        }
      }
      
      // Import documents
      const docsFolder = zip.folder('documents');
      if (docsFolder) {
        const filePromises = [];
        
        docsFolder.forEach((relativePath, zipEntry) => {
          if (relativePath.endsWith('.md')) {
            filePromises.push(this._importDocument(zipEntry, metadata, strategy, results));
          }
        });
        
        await Promise.all(filePromises);
      }
      
      // Import settings if present and strategy is replace
      if (strategy === 'replace') {
        const settingsFile = zip.file('settings.json');
        if (settingsFile) {
          const settings = JSON.parse(await settingsFile.async('string'));
          Object.entries(settings).forEach(([key, value]) => {
            if (value !== null) {
              localStorage.setItem(`inkshelf-${key}`, value);
            }
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Import error:', error);
      results.errors.push(error.message);
      return results;
    }
  }

  /**
   * Import a single document from ZIP
   * @private
   */
  async _importDocument(zipEntry, metadata, strategy, results) {
    try {
      const content = await zipEntry.async('string');
      const filename = zipEntry.name.replace('documents/', '');
      
      // Extract frontmatter to get docId
      const { frontmatter, body } = this._parseFrontmatter(content);
      
      // Find metadata for this document
      let docMetadata = null;
      if (metadata?.documents) {
        // Try to match by title from filename
        const titleFromFile = filename.replace('.md', '');
        docMetadata = metadata.documents.find(d => 
          d.title === titleFromFile || 
          this._sanitizeFilename(d.title) === titleFromFile
        );
      }
      
      // Generate docId if not found
      const docId = docMetadata?.docId || `import:${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Check if document exists
      const existing = await storageManager.getDraft(docId);
      
      if (existing && strategy === 'merge') {
        // Compare timestamps
        const importUpdatedAt = docMetadata?.updatedAt || 0;
        if (importUpdatedAt <= existing.updatedAt) {
          results.skipped++;
          return;
        }
      }
      
      // Create document object
      const draft = {
        docId,
        content,
        title: frontmatter.title || docMetadata?.title || filename.replace('.md', ''),
        url: frontmatter.source || docMetadata?.url || '',
        mode: 'import',
        timestamp: docMetadata?.timestamp || Date.now(),
        updatedAt: docMetadata?.updatedAt || Date.now(),
        status: docMetadata?.status || 'draft',
        starred: docMetadata?.starred || false,
        groupId: frontmatter.group ? 
          await this._findGroupIdByName(frontmatter.group) : 
          (docMetadata?.groupId || 'default'),
        groupName: frontmatter.group || docMetadata?.groupName || 'Uncategorized',
        tags: frontmatter.tags || docMetadata?.tags || [],
        syncedAt: null,
        cloudId: null,
        syncStatus: 'pending'
      };
      
      await storageManager.saveDraft(draft);
      results.imported++;
    } catch (error) {
      results.errors.push(`File ${zipEntry.name}: ${error.message}`);
    }
  }

  /**
   * Find group ID by name
   * @private
   */
  async _findGroupIdByName(groupName) {
    const groups = await storageManager.getAllGroups();
    const group = groups.find(g => g.name === groupName);
    return group?.groupId || 'default';
  }

  /**
   * Parse YAML frontmatter from markdown
   * @private
   */
  _parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    
    if (!match) {
      return { frontmatter: {}, body: content };
    }
    
    const frontmatterStr = match[1];
    const body = match[2];
    const frontmatter = {};
    
    // Simple YAML parsing
    const lines = frontmatterStr.split('\n');
    let currentKey = null;
    let arrayValues = [];
    
    for (const line of lines) {
      const keyMatch = line.match(/^(\w+):\s*(.*)$/);
      
      if (keyMatch) {
        // Save previous array if any
        if (currentKey && arrayValues.length > 0) {
          frontmatter[currentKey] = arrayValues;
          arrayValues = [];
        }
        
        currentKey = keyMatch[1];
        const value = keyMatch[2].trim();
        
        if (value && !value.startsWith('[')) {
          // Remove quotes if present
          frontmatter[currentKey] = value.replace(/^["']|["']$/g, '');
          currentKey = null;
        }
      } else if (line.match(/^\s*-\s+(.+)$/)) {
        // Array item
        const itemMatch = line.match(/^\s*-\s+(.+)$/);
        if (itemMatch) {
          arrayValues.push(itemMatch[1].trim());
        }
      }
    }
    
    // Save last array if any
    if (currentKey && arrayValues.length > 0) {
      frontmatter[currentKey] = arrayValues;
    }
    
    return { frontmatter, body };
  }

  /**
   * Ensure document has complete frontmatter
   * @private
   */
  _ensureCompleteFrontmatter(draft) {
    const { frontmatter, body } = this._parseFrontmatter(draft.content);
    
    // Build complete frontmatter
    const newFrontmatter = {
      title: frontmatter.title || draft.title,
      date: frontmatter.date || new Date(draft.timestamp).toISOString().split('T')[0],
      source: frontmatter.source || draft.url,
      group: draft.groupName || frontmatter.group || 'Uncategorized',
      tags: draft.tags || frontmatter.tags || []
    };
    
    // Convert to YAML
    let yaml = '---\n';
    yaml += `title: "${newFrontmatter.title}"\n`;
    yaml += `date: ${newFrontmatter.date}\n`;
    if (newFrontmatter.source) {
      yaml += `source: ${newFrontmatter.source}\n`;
    }
    yaml += `group: "${newFrontmatter.group}"\n`;
    if (newFrontmatter.tags.length > 0) {
      yaml += 'tags:\n';
      newFrontmatter.tags.forEach(tag => {
        yaml += `  - ${tag}\n`;
      });
    }
    yaml += '---\n\n';
    
    // If original had frontmatter, use body only; otherwise use full content
    const contentBody = draft.content.startsWith('---') ? body : draft.content;
    
    return yaml + contentBody.trim();
  }

  /**
   * Sanitize filename
   * @private
   */
  _sanitizeFilename(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  /**
   * Generate backup filename with timestamp
   * @private
   */
  _generateBackupFilename() {
    const date = new Date();
    const timestamp = date.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .substring(0, 19);
    return `inkshelf-backup_${timestamp}.zip`;
  }

  /**
   * Get last backup info
   */
  getLastBackupInfo() {
    const lastBackup = localStorage.getItem('inkshelf-last-backup');
    if (!lastBackup) {
      return null;
    }
    
    const timestamp = parseInt(lastBackup);
    return {
      timestamp,
      date: new Date(timestamp),
      timeAgo: this._timeAgo(timestamp)
    };
  }

  /**
   * Create auto-backup before migration
   */
  async createAutoBackup() {
    try {
      const result = await this.exportToZip();
      
      // Store in localStorage (limited size, so we store just metadata)
      const backupInfo = {
        timestamp: Date.now(),
        documentCount: result.documentCount,
        groupCount: result.groupCount
      };
      
      localStorage.setItem('inkshelf-auto-backup-info', JSON.stringify(backupInfo));
      
      // Also trigger download for safety
      await this.downloadBackup();
      
      return { success: true, ...backupInfo };
    } catch (error) {
      console.error('Auto-backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format time ago string
   * @private
   */
  _timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
    return `${Math.floor(seconds / 2592000)} months ago`;
  }
}

// Export singleton instance
const backupManager = new BackupManager();
