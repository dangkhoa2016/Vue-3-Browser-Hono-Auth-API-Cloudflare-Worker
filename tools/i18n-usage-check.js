#!/usr/bin/env node

/**
 * i18n Usage Check Tool
 *
 * EN: Scan source files for i18n key usage ($t, t, tf)
 *     and validate keys exist in locale files.
 * VI: Quét source để lấy key i18n đang dùng ($t, t, tf)
 *     và kiểm tra key có tồn tại trong file locale.
 *
 * Commands:
 *   node tools/i18n-usage-check.js                         - EN: Check all locales / VI: Kiểm tra tất cả locale
 *   node tools/i18n-usage-check.js --detail                - EN: Show file references / VI: Hiển thị file tham chiếu
 *   node tools/i18n-usage-check.js --export                - EN: Export JSON report / VI: Xuất báo cáo JSON
 *   node tools/i18n-usage-check.js --lang=en|vi            - EN: CLI output language / VI: Ngôn ngữ hiển thị CLI
 *   node tools/i18n-usage-check.js --locale=vi             - EN: Check one locale / VI: Chỉ kiểm tra một locale
 *   node tools/i18n-usage-check.js --target-lang=vi        - EN: Alias for --locale / VI: Bí danh của --locale
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const LOCALES_DIR = path.join(PROJECT_ROOT, 'assets/js/locales');
const EXPORT_PATH = path.join(__dirname, 'i18n-usage-report.json');

// EN: CLI argument parsing (display language, target locale, detail/export flags).
// VI: Parse tham số CLI (ngôn ngữ hiển thị, locale mục tiêu, cờ detail/export).
const args = process.argv.slice(2);
const langArg = args.find((arg) => arg.startsWith('--lang='));
const localeArg = args.find((arg) => arg.startsWith('--locale=')) || args.find((arg) => arg.startsWith('--target-lang='));
const uiLang = langArg ? langArg.split('=')[1] : (process.env.LANG?.startsWith('vi') ? 'vi' : 'en');
const targetLocale = localeArg ? localeArg.split('=')[1] : null;
const showDetail = args.includes('--detail');
const exportJson = args.includes('--export');

// EN: Localized CLI messages (English/Vietnamese).
// VI: Thông điệp CLI đã bản địa hóa (Anh/Việt).
const messages = {
  en: {
    title: 'i18n Usage Check',
    checkedLocales: 'Checked locales',
    detectedKeys: 'Detected keys in source',
    allGood: '✓ All used i18n keys exist in checked locale files.',
    missingDetected: '❌ Missing keys detected:',
    missingSuffix: 'missing',
    andMore: '... and {count} more',
    localeNotFound: "Locale '{locale}' not found in {dir}",
    noLocaleFiles: 'No locale files found in {dir}',
    exportDone: '✓ Report exported: {path}',
  },
  vi: {
    title: 'Kiểm tra i18n Usage',
    checkedLocales: 'Locale đã kiểm tra',
    detectedKeys: 'Số key phát hiện trong source',
    allGood: '✓ Tất cả key i18n đang dùng đều tồn tại trong locale đã kiểm tra.',
    missingDetected: '❌ Phát hiện key bị thiếu:',
    missingSuffix: 'thiếu',
    andMore: '... và {count} key khác',
    localeNotFound: "Không tìm thấy locale '{locale}' trong {dir}",
    noLocaleFiles: 'Không tìm thấy file locale trong {dir}',
    exportDone: '✓ Đã xuất báo cáo: {path}',
  },
};

const ACTIVE_LANG = uiLang === 'vi' ? 'vi' : 'en';
// EN: Translation helper with English fallback.
// VI: Hàm dịch với fallback sang tiếng Anh.
const tt = (key, params = {}) => {
  const template = messages[ACTIVE_LANG]?.[key] || messages.en[key] || key;
  return Object.entries(params).reduce((text, [param, value]) => {
    return text.replace(`{${param}}`, String(value));
  }, template);
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const SOURCE_DIRS = ['vue', 'assets/js'];
const ALLOWED_EXTENSIONS = new Set(['.vue', '.js', '.ts']);

function walkFiles(dirPath, collector = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(dirPath, entry.name);
    const relative = path.relative(PROJECT_ROOT, absolute);

    if (entry.isDirectory()) {
      if (relative.startsWith('assets/js/locales')) continue;
      if (relative.startsWith('node_modules')) continue;
      if (relative.startsWith('.git')) continue;
      walkFiles(absolute, collector);
      continue;
    }

    const ext = path.extname(entry.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;
    collector.push(absolute);
  }
  return collector;
}

function loadLocaleFile(filename) {
  const fullPath = path.join(LOCALES_DIR, filename);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const moduleCode = content.replace('export default', 'const localeData =') + '\nlocaleData;';
  return eval(moduleCode);
}

function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj || {})) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function extractQuotedKeys(text) {
  const keys = [];
  const quotedKeyRegex = /['"`]([A-Za-z0-9_.-]+)['"`]/g;
  let match;
  while ((match = quotedKeyRegex.exec(text)) !== null) {
    const candidate = match[1];
    if (candidate.includes('.')) {
      keys.push(candidate);
    }
  }
  return keys;
}

function extractUsedKeysFromContent(content) {
  const foundKeys = new Set();

  const simpleCallPatterns = [
    /\$t\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /\btf\s*\(\s*['"`]([^'"`]+)['"`]/g
  ];

  for (const regex of simpleCallPatterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const key = String(match[1] || '').trim();
      if (key && key.includes('.')) {
        foundKeys.add(key);
      }
    }
  }

  const tfArrayPattern = /\btf\s*\(\s*\[([\s\S]*?)\]/g;
  let arrayMatch;
  while ((arrayMatch = tfArrayPattern.exec(content)) !== null) {
    const keys = extractQuotedKeys(arrayMatch[1]);
    keys.forEach((key) => foundKeys.add(key));
  }

  return foundKeys;
}

function collectUsedKeys() {
  const files = SOURCE_DIRS.flatMap((dir) => walkFiles(path.join(PROJECT_ROOT, dir)));
  const keyUsageMap = new Map();

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const keys = extractUsedKeysFromContent(content);
    if (!keys.size) continue;

    const relativeFilePath = path.relative(PROJECT_ROOT, filePath).replaceAll('\\', '/');
    for (const key of keys) {
      if (!keyUsageMap.has(key)) {
        keyUsageMap.set(key, new Set());
      }
      keyUsageMap.get(key).add(relativeFilePath);
    }
  }

  return keyUsageMap;
}

function buildReport(usedKeyMap, localeKeySets) {
  const localeNames = Object.keys(localeKeySets);
  const checkedLocales = targetLocale
    ? localeNames.filter((name) => name === targetLocale)
    : localeNames;

  if (targetLocale && checkedLocales.length === 0) {
    throw new Error(tt('localeNotFound', { locale: targetLocale, dir: LOCALES_DIR }));
  }

  const usedKeys = Array.from(usedKeyMap.keys()).sort();
  const missingByLocale = {};

  for (const locale of checkedLocales) {
    const localeSet = localeKeySets[locale] || new Set();
    const missingKeys = usedKeys.filter((key) => !localeSet.has(key));
    if (missingKeys.length > 0) {
      missingByLocale[locale] = missingKeys;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    checkedLocales,
    sourceDirectories: SOURCE_DIRS,
    usedKeyCount: usedKeys.length,
    missingByLocale,
    keyUsage: Object.fromEntries(
      Array.from(usedKeyMap.entries()).map(([key, files]) => [key, Array.from(files).sort()])
    )
  };
}

function printReport(report) {
  console.log(`\n${colors.bright}${colors.cyan}${tt('title')}${colors.reset}`);
  console.log(`${colors.gray}${tt('checkedLocales')}: ${report.checkedLocales.join(', ')}${colors.reset}`);
  console.log(`${colors.gray}${tt('detectedKeys')}: ${report.usedKeyCount}${colors.reset}\n`);

  const localesWithMissing = Object.keys(report.missingByLocale);
  if (localesWithMissing.length === 0) {
    console.log(`${colors.green}${tt('allGood')}${colors.reset}\n`);
    return;
  }

  console.log(`${colors.red}${tt('missingDetected')}${colors.reset}`);
  for (const locale of localesWithMissing) {
    const keys = report.missingByLocale[locale];
    console.log(`\n  ${colors.yellow}${locale}${colors.reset} (${keys.length} ${tt('missingSuffix')}):`);
    keys.slice(0, showDetail ? keys.length : 10).forEach((key) => {
      const files = report.keyUsage[key] || [];
      if (showDetail) {
        console.log(`    - ${key}`);
        files.slice(0, 5).forEach((file) => console.log(`      · ${colors.gray}${file}${colors.reset}`));
      } else {
        console.log(`    - ${key}`);
      }
    });
    if (!showDetail && keys.length > 10) {
      console.log(`    ${colors.gray}${tt('andMore', { count: keys.length - 10 })}${colors.reset}`);
    }
  }
  console.log();
}

function main() {
  const localeFiles = fs.readdirSync(LOCALES_DIR).filter((file) => file.endsWith('.js')).sort();
  if (localeFiles.length === 0) {
    console.error(`${colors.red}${tt('noLocaleFiles', { dir: LOCALES_DIR })}${colors.reset}`);
    process.exit(1);
  }

  const localeKeySets = {};
  for (const file of localeFiles) {
    const locale = path.basename(file, '.js');
    const data = loadLocaleFile(file);
    const flattened = flattenKeys(data || {});
    localeKeySets[locale] = new Set(Object.keys(flattened));
  }

  const usedKeyMap = collectUsedKeys();
  const report = buildReport(usedKeyMap, localeKeySets);

  if (exportJson) {
    fs.writeFileSync(EXPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`${colors.green}${tt('exportDone', { path: EXPORT_PATH })}${colors.reset}`);
  }

  printReport(report);

  const hasIssues = Object.keys(report.missingByLocale).length > 0;
  process.exit(hasIssues ? 1 : 0);
}

main();
