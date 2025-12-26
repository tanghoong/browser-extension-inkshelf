# Thirdparty Libraries

This directory contains third-party libraries used by InkShelf.

## Required Libraries

### 1. marked.js
- **Purpose**: Markdown to HTML conversion for preview mode
- **Download**: https://cdn.jsdelivr.net/npm/marked/marked.min.js
- **File**: `marked.min.js`
- **Installation**:
  ```bash
  curl -o libs/marked.min.js https://cdn.jsdelivr.net/npm/marked/marked.min.js
  ```

### 2. Readability.js
- **Purpose**: Clean article content extraction from web pages
- **Download**: https://github.com/mozilla/readability
- **File**: `Readability.js`
- **Installation**:
  ```bash
  curl -o libs/Readability.js https://raw.githubusercontent.com/mozilla/readability/main/Readability.js
  ```

### 3. JSZip (Optional - for backup features)
- **Purpose**: Create and extract ZIP files for backup/restore functionality
- **Download**: https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
- **File**: `jszip.min.js`
- **Installation**:
  ```bash
  curl -o libs/jszip.min.js https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
  ```
- **Note**: Only required if you want to use the backup/restore features. Without this library, backup will fall back to JSON format.

## Quick Setup

Run these commands from the extension root directory:

```bash
# Download marked.js
curl -o libs/marked.min.js https://cdn.jsdelivr.net/npm/marked/marked.min.js

# Download Readability.js
curl -o libs/Readability.js https://raw.githubusercontent.com/mozilla/readability/main/Readability.js

# Download JSZip (optional, for backup features)
curl -o libs/jszip.min.js https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
```

Or manually download:
1. Visit the URLs above
2. Save files to the `libs/` directory
3. Ensure filenames match exactly

## License Information

- **marked.js**: MIT License
- **Readability.js**: Apache License 2.0
- **JSZip**: MIT License (dual license with GPLv3)

All libraries are compatible with InkShelf's MIT license.
