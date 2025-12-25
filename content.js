// Content Script for InkShelf
// Handles page content extraction and conversion to Markdown

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_PAGE') {
    capturePage(message.mode).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
});

/**
 * Capture page content based on mode
 * @param {string} mode - Capture mode: 'clean', 'selection', 'snapshot'
 */
async function capturePage(mode) {
  try {
    let content = '';
    let title = document.title;
    const url = window.location.href;
    
    switch (mode) {
      case 'clean':
        content = await captureCleanArticle();
        break;
      
      case 'selection':
        content = captureSelection();
        break;
      
      case 'snapshot':
        content = captureSnapshot();
        break;
      
      default:
        content = await captureCleanArticle();
    }
    
    // Generate document ID
    const docId = generateDocId(url, mode);
    
    // Send captured content to background script
    chrome.runtime.sendMessage({
      type: 'CAPTURE_CONTENT',
      data: {
        docId: docId,
        content: content,
        title: title,
        url: url,
        mode: mode,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Failed to capture page:', error);
    alert('Failed to capture page content. Please try again.');
  }
}

/**
 * Capture clean article using Readability.js
 * @returns {string} Markdown content
 */
async function captureCleanArticle() {
  try {
    // Clone the document for Readability
    const documentClone = document.cloneNode(true);
    
    // Use Readability to extract article content
    const reader = new Readability(documentClone);
    const article = reader.parse();
    
    if (!article) {
      throw new Error('Failed to parse article content');
    }
    
    // Convert HTML to Markdown
    const markdown = htmlToMarkdown(article.content, article.title);
    
    return markdown;
  } catch (error) {
    console.error('Readability parsing failed:', error);
    // Fallback to snapshot mode
    return captureSnapshot();
  }
}

/**
 * Capture only selected text
 * @returns {string} Markdown content
 */
function captureSelection() {
  const selection = window.getSelection();
  
  if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
    alert('Please select some text to capture.');
    throw new Error('No text selected');
  }
  
  const range = selection.getRangeAt(0);
  const container = range.cloneContents();
  const div = document.createElement('div');
  div.appendChild(container);
  
  // If selection is just text nodes, wrap in paragraph
  let html = div.innerHTML;
  if (!html || html.trim() === '') {
    html = `<p>${selection.toString()}</p>`;
  }
  
  return htmlToMarkdown(html);
}

/**
 * Capture entire page snapshot
 * @returns {string} Markdown content
 */
function captureSnapshot() {
  const mainContent = document.querySelector('main') || 
                     document.querySelector('article') || 
                     document.body;
  
  return htmlToMarkdown(mainContent.innerHTML);
}

/**
 * Convert HTML to Markdown
 * @param {string} html - HTML content
 * @param {string} title - Optional title
 * @returns {string} Markdown content
 */
function htmlToMarkdown(html, title = '') {
  let markdown = '';
  
  // Add Obsidian-style frontmatter
  if (title) {
    const now = new Date().toISOString().split('T')[0];
    const url = window.location.href;
    const domain = new URL(url).hostname;
    
    markdown += '---\n';
    markdown += `title: "${title.replace(/"/g, '\\"')}"\n`;
    markdown += `date: ${now}\n`;
    markdown += `source: ${url}\n`;
    markdown += `tags:\n  - web-capture\n  - ${domain}\n`;
    markdown += '---\n\n';
    markdown += `# ${title}\n\n`;
  }
  
  // Create temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Process nodes recursively
  markdown += processNode(temp);
  
  // Clean up extra newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
  
  return markdown;
}

/**
 * Process DOM node and convert to Markdown
 * @param {Node} node - DOM node
 * @param {number} level - Heading level for nested lists
 * @returns {string} Markdown text
 */
function processNode(node, level = 0) {
  let result = '';
  
  for (const child of node.childNodes) {
    switch (child.nodeType) {
      case Node.TEXT_NODE:
        const text = child.textContent.trim();
        if (text) {
          result += text + ' ';
        }
        break;
      
      case Node.ELEMENT_NODE:
        result += processElement(child, level);
        break;
    }
  }
  
  return result;
}

/**
 * Process element node and convert to Markdown
 * @param {Element} element - DOM element
 * @param {number} level - Current nesting level
 * @returns {string} Markdown text
 */
function processElement(element, level = 0) {
  const tagName = element.tagName.toLowerCase();
  let result = '';
  
  switch (tagName) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      const hLevel = parseInt(tagName[1]);
      result = '\n' + '#'.repeat(hLevel) + ' ' + element.textContent.trim() + '\n\n';
      break;
    
    case 'p':
      result = processNode(element, level) + '\n\n';
      break;
    
    case 'br':
      result = '\n';
      break;
    
    case 'strong':
    case 'b':
      result = '**' + element.textContent.trim() + '**';
      break;
    
    case 'em':
    case 'i':
      result = '*' + element.textContent.trim() + '*';
      break;
    
    case 'code':
      if (element.parentElement?.tagName.toLowerCase() === 'pre') {
        // Code block
        result = '\n```\n' + element.textContent + '\n```\n\n';
      } else {
        // Inline code
        result = '`' + element.textContent + '`';
      }
      break;
    
    case 'pre':
      if (element.querySelector('code')) {
        result = processNode(element, level);
      } else {
        result = '\n```\n' + element.textContent + '\n```\n\n';
      }
      break;
    
    case 'a':
      const href = element.getAttribute('href') || '';
      const text = element.textContent.trim();
      result = `[${text}](${href})`;
      break;
    
    case 'img':
      const src = element.getAttribute('src') || '';
      const alt = element.getAttribute('alt') || 'image';
      result = `\n![${alt}](${src})\n\n`;
      break;
    
    case 'ul':
    case 'ol':
      result = '\n' + processList(element, level, tagName === 'ol') + '\n';
      break;
    
    case 'li':
      // Handled by processList
      break;
    
    case 'blockquote':
      const lines = element.textContent.trim().split('\n');
      result = '\n' + lines.map(line => '> ' + line.trim()).join('\n') + '\n\n';
      break;
    
    case 'table':
      result = '\n' + processTable(element) + '\n\n';
      break;
    
    case 'hr':
      result = '\n---\n\n';
      break;
    
    case 'div':
    case 'section':
    case 'article':
    case 'main':
      result = processNode(element, level);
      break;
    
    default:
      result = processNode(element, level);
  }
  
  return result;
}

/**
 * Process list elements
 * @param {Element} list - UL or OL element
 * @param {number} level - Nesting level
 * @param {boolean} ordered - Is ordered list
 * @returns {string} Markdown list
 */
function processList(list, level = 0, ordered = false) {
  let result = '';
  const items = list.querySelectorAll(':scope > li');
  
  items.forEach((item, index) => {
    const indent = '  '.repeat(level);
    const marker = ordered ? `${index + 1}.` : '-';
    const text = Array.from(item.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE || 
              (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() !== 'ul' && node.tagName.toLowerCase() !== 'ol'))
      .map(node => node.textContent)
      .join(' ')
      .trim();
    
    result += `${indent}${marker} ${text}\n`;
    
    // Process nested lists
    const nestedLists = item.querySelectorAll(':scope > ul, :scope > ol');
    nestedLists.forEach(nestedList => {
      const isOrdered = nestedList.tagName.toLowerCase() === 'ol';
      result += processList(nestedList, level + 1, isOrdered);
    });
  });
  
  return result;
}

/**
 * Process table element
 * @param {Element} table - Table element
 * @returns {string} Markdown table
 */
function processTable(table) {
  let result = '';
  const rows = table.querySelectorAll('tr');
  
  if (rows.length === 0) return '';
  
  rows.forEach((row, rowIndex) => {
    const cells = row.querySelectorAll('th, td');
    const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
    
    result += '| ' + cellTexts.join(' | ') + ' |\n';
    
    // Add separator after header row
    if (rowIndex === 0) {
      result += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
    }
  });
  
  return result;
}

/**
 * Generate unique document ID
 * @param {string} url - Page URL
 * @param {string} mode - Capture mode
 * @returns {string} Document ID
 */
function generateDocId(url, mode) {
  const hash = simpleHash(url);
  return `capture:${mode}:${hash}`;
}

/**
 * Simple hash function for URL
 * @param {string} str - String to hash
 * @returns {string} Hash string
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
