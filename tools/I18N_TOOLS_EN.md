# i18n Management Tools - Complete Guide

> 🌍 **Language:** [English](I18N_TOOLS_EN.md) | [Tiếng Việt](I18N_TOOLS_VI.md)

i18n locale management toolkit for Hono Auth API project.

---

## 📦 Files Created

### Core Tools
1. **`i18n-audit.js`** (14 KB)
   - Main audit engine
   - Load all locale files
   - Compare keys and detect errors
   - Export JSON/CSV reports
   - CLI interface

2. **`i18n.js`** (4.5 KB)
   - User-friendly CLI wrapper
   - Route audit commands
   - Help system
   - Future commands (keys, count)

3. **`i18n-quick.sh`** (2.2 KB)
   - Bash helper script
   - Quick access to common commands
   - Convenient shortcuts
   - CI/CD integration

### Documentation
- **`I18N_TOOLS_EN.md`** (this file) - Complete documentation (English)
- **`I18N_TOOLS_VI.md`** - Complete documentation (Vietnamese)

---

## 🎯 Purpose

- ✅ **Check consistency** between locale files (en, vi, ko, ja, de)
- 📊 **Compare keys** and detect missing or extra keys
- 🔍 **Detect errors** such as:
  - Missing keys in some languages
  - Type mismatches (string vs number)
  - Inconsistent ellipsis (`...`)
  - Inconsistent capitalization
- 📁 **Export reports** to JSON or CSV

---

## 🚀 Quick Start

### Basic Commands

**Node.js:**
```bash
# Run audit
node tools/i18n.js audit

# Display sorted keys
node tools/i18n.js audit --sort

# Export results (JSON + CSV)
node tools/i18n.js audit --export --csv

# Show help
node tools/i18n.js help
```

**Bash:**
```bash
# Run audit
bash tools/i18n-quick.sh audit

# Display sorted keys
bash tools/i18n-quick.sh audit-sort

# Export results
bash tools/i18n-quick.sh export

# Check (exit on error)
bash tools/i18n-quick.sh check

# Show help
bash tools/i18n-quick.sh help
```

### Expected Output

```
╔════════════════════════════════════════════════════════════╗
║        i18n AUDIT & COMPARISON REPORT                      ║
╚════════════════════════════════════════════════════════════╝

📊 Summary:
  Reference Locale: de
  Total Keys: 103

📚 Locale Overview:
  ✓ DE: 103 keys
  ✗ EN: 112 keys (9 extra)
  ✓ JA: 103 keys
  ✓ KO: 103 keys
  ✗ VI: 112 keys (9 extra)

⚠️  Extra Keys:
  en (9 extra):
    - home.badge
    - home.cta.documentation
    ... and 7 more
```

---

## 📊 Output Symbols

| Symbol | Meaning |
|--------|---------|
| ✓ | Key exists in locale |
| ✗ | Key missing in locale |
| ✅ | All checks passed |
| ❌ | Missing keys or errors |
| ⚠️ | Extra keys found |
| 🔴 | Type mismatch |
| ⏭️ | Inconsistent ellipsis (...) |
| 🔤 | Inconsistent capitalization |

---

## 🔍 What It Checks

### Completeness
- ✓ All locales have the same number of keys
- ✓ No keys are missing in any locale
- ✓ No extra keys in any locale

### Consistency
- ✓ Types match (string = string, object = object)
- ✓ Ellipsis usage (`...`) is consistent
- ✓ Capitalization is consistent

### Syntax
- ✓ Valid JavaScript modules
- ✓ Proper exports
- ✓ No parsing errors

---

## 📁 Output Format

### JSON Report

```json
{
  "referenceLocale": "en",
  "totalKeys": 103,
  "byLocale": {
    "en": {
      "total": 103,
      "keys": ["about.advanced...", "about.features...", ...]
    }
  },
  "missing": {
    "vi": ["key1", "key2", ...]
  },
  "extra": {
    "de": ["key3", "key4", ...]
  },
  "mismatchType": {},
  "inconsistentEllipsis": [
    {
      "key": "loader.initializing",
      "en": "Initializing...",
      "de": "Initialisierung"
    }
  ],
  "inconsistentCase": [
    {
      "key": "home.badge",
      "ref": "en: Production-ready...",
      "loc": "vi: production-ready..."
    }
  ]
}
```

### CSV Report

```csv
Key,de (Keys),en (Keys),ja (Keys),ko (Keys),vi (Keys)
about.advanced.admin_roles.body,✓,✓,✓,✓,✓
about.advanced.admin_roles.title,✓,✓,✓,✓,✓
about.advanced.audit_system.body,✓,✓,✓,✓,✓
...
```

**Export Files:**
```
tools/
├── i18n-audit-result.json  # Detailed report
└── i18n-audit-result.csv   # Comparison table
```

---

## 💡 Usage Examples

### Scenario 1: Detect missing keys

```bash
$ node tools/i18n.js audit

❌ Missing Keys:

  vi (2 missing):
    - home.badge
    - home.cta.documentation

# Need to add these 2 keys to vi.js
```

### Scenario 2: Inconsistent ellipsis

```bash
$ node tools/i18n.js audit

⏭️  Inconsistent Ellipsis (...):

  Key: loader.initializing
    en: "Initializing..."
    de: "Initialisierung"

# Need to add "..." to DE
```

### Scenario 3: Inconsistent capitalization

```bash
$ node tools/i18n.js audit

🔤 Inconsistent Capitalization:

  about.testing_items.system_integration
    en: System integration tests
    vi: hệ thống tích hợp

# Need to standardize capitalization
```

### Scenario 4: Export for team review

```bash
$ node tools/i18n.js audit --export --csv
# Open CSV in Excel/Google Sheets for team review
```

---

## 🔧 Integration

### Pre-commit Hook

```bash
#!/bin/bash
node tools/i18n-audit.js
if [ $? -ne 0 ]; then
  echo "❌ i18n audit failed. Please fix issues before committing."
  exit 1
fi
```

Save to `.git/hooks/pre-commit` and make executable:
```bash
chmod +x .git/hooks/pre-commit
```

### CI/CD Pipeline

**GitHub Actions:**
```yaml
- name: Check i18n consistency
  run: node tools/i18n-audit.js
  working-directory: vue-hono-auth-api-cloudflare-worker
```

**GitLab CI:**
```yaml
i18n-check:
  script:
    - cd vue-hono-auth-api-cloudflare-worker
    - node tools/i18n-audit.js
```

### NPM Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "i18n:audit": "node tools/i18n-audit.js",
    "i18n:sort": "node tools/i18n.js audit --sort",
    "i18n:export": "node tools/i18n.js audit --export --csv"
  }
}
```

---

## 📚 Best Practices

### 1. Regular Checks

Run audit before merging PR:
```bash
node tools/i18n.js audit
```

Exit codes:
- `0` = All OK
- `1` = Issues need fixing

### 2. Review Keys

View key list to detect issues:
```bash
node tools/i18n.js audit --sort
```

### 3. Keep Consistent

**Ellipsis rule:**
- If key means "doing something...", always add `...`
- Examples: `"Loading..."`, `"Initializing..."`, `"Finalizing..."`

**Capitalization:**
- Always lowercase unless it's a proper noun
- Examples: `"error details"` not `"Error Details"`

**Format:**
- Always use dot notation (`.`) for nested keys
- Examples: `message.home.title`, `message.errors.not_found`

### 4. When Adding New Keys

```bash
# 1. Add to en.js (reference locale)
# 2. Translate to other locales (vi, ko, ja, de)
# 3. Run audit to confirm
node tools/i18n.js audit
# Should pass all checks
```

### 5. Export for Review

When large review is needed:
```bash
node tools/i18n.js audit --export --csv
# Open tools/i18n-audit-result.csv in Excel/Sheets
```

---

## 🛠️ Troubleshooting

### "No locale files found"

Check that `assets/js/locales/` path exists and has `.js` files:
```bash
ls -la assets/js/locales/
# Should show: de.js, en.js, ja.js, ko.js, vi.js
```

### "Error loading en.js: Unexpected token..."

Locale file has syntax error. Check:
- Curly braces `{}` are balanced
- Commas `,` in correct positions
- Quotes `'` or `"` are balanced

**Run syntax check:**
```bash
node -c assets/js/locales/en.js
node -c assets/js/locales/vi.js
# Repeat for all locales
```

### "Module not found"

Make sure to run from root directory:
```bash
cd /workspaces/devex/vue-hono-auth-api-cloudflare-worker
node tools/i18n.js audit
```

### Want to change reference locale?

Edit `i18n-audit.js` line ~150:
```javascript
// Current: const referenceLocale = langCodes[0];
// Change to:
const referenceLocale = 'en'; // Always use English as reference
```

---

## 🎓 Advanced Usage

### Custom Checks

Add new check functions in `i18n-audit.js`:

```javascript
// Example: Check for missing placeholders
const missingPlaceholders = [];
for (const key of referenceKeys) {
  const refVal = String(allKeySets[referenceLocale][key]);
  const refPlaceholders = (refVal.match(/\{[^}]+\}/g) || []);
  
  for (const lang of langCodes) {
    if (lang === referenceLocale) continue;
    const keys = allKeySets[lang];
    const keySet = new Set(Object.keys(keys));
    
    if (keySet.has(key)) {
      const locVal = String(keys[key]);
      const locPlaceholders = (locVal.match(/\{[^}]+\}/g) || []);
      
      if (refPlaceholders.length !== locPlaceholders.length) {
        missingPlaceholders.push({
          key,
          lang,
          ref: refVal,
          loc: locVal
        });
      }
    }
  }
}
result.missingPlaceholders = missingPlaceholders;
```

### Batch Operations

Process multiple projects:
```bash
#!/bin/bash
for project in project1 project2 project3; do
  cd $project
  echo "Checking $project..."
  node tools/i18n-audit.js || echo "❌ $project has issues"
  cd ..
done
```

---

## 💾 File Structure

```
tools/
├── i18n-audit.js           # Main audit engine (14 KB)
├── i18n.js                 # CLI wrapper (4.5 KB)
├── i18n-quick.sh           # Bash helper script (2.2 KB)
├── I18N_TOOLS_EN.md        # This documentation (English)
├── I18N_TOOLS_VI.md        # Documentation (Vietnamese)
├── i18n-audit-result.json  # Generated after export
└── i18n-audit-result.csv   # Generated after export

assets/js/locales/
├── de.js                   # German (reference locale)
├── en.js                   # English
├── ja.js                   # Japanese
├── ko.js                   # Korean
└── vi.js                   # Vietnamese
```

---

## ✨ Key Features

- ✓ Automatic reference locale detection
- ✓ Colored output for easy reading
- ✓ Multiple export formats (JSON + CSV)
- ✓ Detailed error reporting
- ✓ Exit codes for automation
- ✓ No external dependencies (pure Node.js)
- ✓ Shell script helper for quick access
- ✓ Comprehensive documentation
- ✓ Easy to extend with new checks

---

## 🎯 Common Use Cases

### 1. Before Committing
```bash
bash tools/i18n-quick.sh check
# Exit code 0 = OK, 1 = Issues
```

### 2. Before Merging PR
```bash
node tools/i18n.js audit
# Review report before merge
```

### 3. Team Review
```bash
node tools/i18n.js audit --export --csv
# Send CSV to team for review
```

### 4. Debugging
```bash
node tools/i18n.js audit --sort
# View all keys in alphabetical order
```

### 5. CI/CD Integration
```yaml
# Add to pipeline
- run: node tools/i18n-audit.js
```

---

## 📄 License

MIT

---

## 📞 Support & Feedback

For questions, improvements, or bug reports:
- Check inline comments in `i18n-audit.js`
- Review examples in this guide
- Submit feedback to the team

---

**Last updated:** 2026-02-03

Happy translating! 🌍
