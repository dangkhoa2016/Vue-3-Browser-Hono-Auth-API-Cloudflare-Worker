#!/usr/bin/env node

/**
 * i18n Audit & Compare Tool
 * 
 * Kiểm tra và so sánh consistency giữa các file locale
 * Usage: node tools/i18n-audit.js [--sort] [--export] [--detail]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '../assets/js/locales');

// Detect locale from args or environment
const args = process.argv.slice(2);
const langArg = args.find(a => a.startsWith('--lang='));
const LOCALE = langArg ? langArg.split('=')[1] : (process.env.LANG?.startsWith('vi') ? 'vi' : 'en');

// i18n translations
const translations = {
  en: {
    loading: 'Loading locale files from',
    noFiles: 'No locale files found!',
    found: 'Found',
    localeFiles: 'locale file(s)',
    reportTitle: 'i18n AUDIT & COMPARISON REPORT',
    summary: 'Summary',
    referenceLocale: 'Reference Locale',
    totalKeys: 'Total Keys',
    localeOverview: 'Locale Overview',
    keys: 'keys',
    missingKeys: 'Missing Keys',
    missing: 'missing',
    extraKeys: 'Extra Keys',
    extra: 'extra',
    typeMismatches: 'Type Mismatches',
    inconsistentEllipsis: 'Inconsistent Ellipsis (...)',
    inconsistentCapitalization: 'Inconsistent Capitalization',
    andMore: 'and',
    more: 'more',
    inconsistencies: 'inconsistencies',
    allPassed: 'All checks passed! All locales are consistent.',
    sortedKeyList: 'Sorted Key List (Reference',
    key: 'Key',
    reportExported: 'Report exported to',
    errorLoading: 'Error loading',
  },
  vi: {
    loading: 'Đang tải các file locale từ',
    noFiles: 'Không tìm thấy file locale nào!',
    found: 'Tìm thấy',
    localeFiles: 'file(s) locale',
    reportTitle: 'BÁO CÁO KIỂM TRA & SO SÁNH i18n',
    summary: 'Tóm tắt',
    referenceLocale: 'Locale tham chiếu',
    totalKeys: 'Tổng số Keys',
    localeOverview: 'Tổng quan Locales',
    keys: 'keys',
    missingKeys: 'Keys bị thiếu',
    missing: 'thiếu',
    extraKeys: 'Keys thừa',
    extra: 'thừa',
    typeMismatches: 'Kiểu dữ liệu không khớp',
    inconsistentEllipsis: 'Dấu ba chấm (...) không nhất quán',
    inconsistentCapitalization: 'Chữ hoa/thường không nhất quán',
    andMore: 'và',
    more: 'nữa',
    inconsistencies: 'không nhất quán',
    allPassed: 'Tất cả kiểm tra đều đạt! Các locales nhất quán.',
    sortedKeyList: 'Danh sách Keys đã sắp xếp (Tham chiếu',
    key: 'Key',
    reportExported: 'Báo cáo đã xuất tới',
    errorLoading: 'Lỗi khi tải',
  },
};

// Translation function
const t = (key) => translations[LOCALE]?.[key] || translations.en[key] || key;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Flatten nested object to dot notation
 * @param {Object} obj - Object to flatten
 * @param {string} prefix - Key prefix
 * @returns {Object} Flattened object
 */
function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Load locale file
 * @param {string} filename - Locale filename
 * @returns {Object} Parsed locale data
 */
function loadLocale(filename) {
  try {
    const content = fs.readFileSync(path.join(LOCALES_DIR, filename), 'utf-8');
    const moduleCode = content.replace('export default', 'const localeData =') + '\nlocaleData;';
    const localeData = eval(moduleCode);
    return localeData;
  } catch (error) {
    console.error(`${colors.red}${t('errorLoading')} ${filename}:${colors.reset} ${error.message}`);
    return null;
  }
}

/**
 * Get all locale files
 * @returns {string[]} Array of locale filenames
 */
function getLocaleFiles() {
  return fs.readdirSync(LOCALES_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();
}

/**
 * Compare keys across locales
 * @param {Object} locales - Loaded locale data by language code
 * @returns {Object} Comparison result
 */
function compareLocales(locales) {
  const langCodes = Object.keys(locales);
  const allKeySets = {};

  // Get flattened keys for each locale
  for (const [lang, data] of Object.entries(locales)) {
    if (data?.message) {
      allKeySets[lang] = flattenKeys(data.message);
    }
  }

  // Find reference (first locale)
  const referenceLocale = langCodes[0];
  const referenceKeys = new Set(Object.keys(allKeySets[referenceLocale] || {}));

  const result = {
    referenceLocale,
    totalKeys: referenceKeys.size,
    byLocale: {},
    missing: {},    // Keys missing in each locale compared to reference
    extra: {},      // Extra keys in each locale
    mismatchType: {},  // Type mismatches
    inconsistentEllipsis: [],  // Keys with inconsistent ellipsis
    inconsistentCase: [],      // Keys with inconsistent case
  };

  for (const lang of langCodes) {
    const keys = allKeySets[lang];
    const keySet = new Set(Object.keys(keys || {}));

    result.byLocale[lang] = {
      total: keySet.size,
      keys: Array.from(keySet).sort(),
    };

    // Find missing keys
    const missing = Array.from(referenceKeys).filter(k => !keySet.has(k));
    if (missing.length > 0) {
      result.missing[lang] = missing.sort();
    }

    // Find extra keys
    const extra = Array.from(keySet).filter(k => !referenceKeys.has(k));
    if (extra.length > 0) {
      result.extra[lang] = extra.sort();
    }

    // Check type mismatches
    const typeErrors = [];
    for (const key of referenceKeys) {
      if (keySet.has(key)) {
        const refType = typeof allKeySets[referenceLocale][key];
        const locType = typeof keys[key];
        if (refType !== locType) {
          typeErrors.push(`${key}: ${referenceLocale}=${refType} vs ${lang}=${locType}`);
        }
      }
    }
    if (typeErrors.length > 0) {
      result.mismatchType[lang] = typeErrors;
    }

    // Check inconsistent ellipsis
    for (const key of referenceKeys) {
      if (keySet.has(key)) {
        const refVal = String(allKeySets[referenceLocale][key]);
        const locVal = String(keys[key]);
        const refHasEllipsis = refVal.endsWith('...');
        const locHasEllipsis = locVal.endsWith('...');
        if (refHasEllipsis !== locHasEllipsis) {
          result.inconsistentEllipsis.push({
            key,
            [referenceLocale]: refVal,
            [lang]: locVal,
          });
        }
      }
    }

    // Check inconsistent case (simple check for first letter)
    for (const key of referenceKeys) {
      if (keySet.has(key)) {
        const refVal = String(allKeySets[referenceLocale][key]);
        const locVal = String(keys[key]);
        // Only check if both values are not placeholders
        if (!refVal.includes('{') && !locVal.includes('{')) {
          const refFirstChar = refVal[0];
          const locFirstChar = locVal[0];
          if (/[a-z]/.test(refFirstChar) && /[A-Z]/.test(locFirstChar)) {
            result.inconsistentCase.push({
              key,
              ref: `${referenceLocale}: ${refVal.substring(0, 50)}`,
              loc: `${lang}: ${locVal.substring(0, 50)}`,
            });
          }
        }
      }
    }
  }

  return result;
}

/**
 * Print comparison report
 * @param {Object} comparison - Comparison result
 * @param {Object} options - Options
 */
function printReport(comparison, options = {}) {
  const title = t('reportTitle').padEnd(59);
  console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║        ${title}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Summary
  console.log(`${colors.bright}📊 ${t('summary')}:${colors.reset}`);
  console.log(`  ${t('referenceLocale')}: ${colors.cyan}${comparison.referenceLocale}${colors.reset}`);
  console.log(`  ${t('totalKeys')}: ${colors.yellow}${comparison.totalKeys}${colors.reset}\n`);

  // Locale overview
  console.log(`${colors.bright}📚 ${t('localeOverview')}:${colors.reset}`);
  for (const [lang, data] of Object.entries(comparison.byLocale)) {
    const status = data.total === comparison.totalKeys 
      ? `${colors.green}✓${colors.reset}` 
      : `${colors.red}✗${colors.reset}`;
    console.log(`  ${status} ${lang.toUpperCase()}: ${data.total} ${t('keys')}`);
  }
  console.log();

  // Missing keys
  if (Object.keys(comparison.missing).length > 0) {
    console.log(`${colors.bright}${colors.red}❌ ${t('missingKeys')}:${colors.reset}`);
    for (const [lang, keys] of Object.entries(comparison.missing)) {
      console.log(`\n  ${colors.yellow}${lang}${colors.reset} (${t('missing')} ${keys.length} ${t('keys')}):`);
      keys.slice(0, 5).forEach(k => console.log(`    - ${colors.gray}${k}${colors.reset}`));
      if (keys.length > 5) {
        console.log(`    ${colors.gray}... ${t('andMore')} ${keys.length - 5} ${t('keys')} ${t('more')}${colors.reset}`);
      }
    }
    console.log();
  }

  // Extra keys
  if (Object.keys(comparison.extra).length > 0) {
    console.log(`${colors.bright}${colors.yellow}⚠️  ${t('extraKeys')}:${colors.reset}`);
    for (const [lang, keys] of Object.entries(comparison.extra)) {
      console.log(`\n  ${colors.yellow}${lang}${colors.reset} (${t('extra')} ${keys.length} ${t('keys')}):`);
      keys.slice(0, 5).forEach(k => console.log(`    - ${colors.gray}${k}${colors.reset}`));
      if (keys.length > 5) {
        console.log(`    ${colors.gray}... ${t('andMore')} ${keys.length - 5} ${t('keys')} ${t('more')}${colors.reset}`);
      }
    }
    console.log();
  }

  // Type mismatches
  if (Object.keys(comparison.mismatchType).length > 0) {
    console.log(`${colors.bright}${colors.red}🔴 ${t('typeMismatches')}:${colors.reset}`);
    for (const [lang, errors] of Object.entries(comparison.mismatchType)) {
      console.log(`\n  ${colors.red}${lang}${colors.reset}:`);
      errors.slice(0, 5).forEach(e => console.log(`    - ${e}`));
      if (errors.length > 5) {
        console.log(`    ${colors.gray}... ${t('andMore')} ${errors.length - 5} ${t('more')}${colors.reset}`);
      }
    }
    console.log();
  }

  // Inconsistent ellipsis
  if (comparison.inconsistentEllipsis.length > 0) {
    console.log(`${colors.bright}${colors.yellow}⏭️  ${t('inconsistentEllipsis')}:${colors.reset}`);
    comparison.inconsistentEllipsis.slice(0, 5).forEach(item => {
      const key = item.key;
      const refLang = comparison.referenceLocale;
      const otherLangs = Object.keys(comparison.byLocale).filter(l => l !== refLang);
      
      console.log(`\n  ${t('key')}: ${colors.cyan}${key}${colors.reset}`);
      console.log(`    ${refLang}: "${item[refLang]}"`);
      for (const lang of otherLangs) {
        if (item[lang]) {
          console.log(`    ${lang}: "${item[lang]}"`);
        }
      }
    });
    if (comparison.inconsistentEllipsis.length > 5) {
      console.log(`\n  ${colors.gray}... ${t('andMore')} ${comparison.inconsistentEllipsis.length - 5} ${t('inconsistencies')} ${t('more')}${colors.reset}`);
    }
    console.log();
  }

  // Inconsistent case
  if (comparison.inconsistentCase.length > 0) {
    console.log(`${colors.bright}${colors.yellow}🔤 ${t('inconsistentCapitalization')}:${colors.reset}`);
    comparison.inconsistentCase.slice(0, 5).forEach(item => {
      console.log(`\n  ${colors.cyan}${item.key}${colors.reset}`);
      console.log(`    ${item.ref}`);
      console.log(`    ${item.loc}`);
    });
    if (comparison.inconsistentCase.length > 5) {
      console.log(`\n  ${colors.gray}... ${t('andMore')} ${comparison.inconsistentCase.length - 5} ${t('inconsistencies')} ${t('more')}${colors.reset}`);
    }
    console.log();
  }

  // All good
  if (Object.keys(comparison.missing).length === 0 &&
      Object.keys(comparison.extra).length === 0 &&
      Object.keys(comparison.mismatchType).length === 0 &&
      comparison.inconsistentEllipsis.length === 0 &&
      comparison.inconsistentCase.length === 0) {
    console.log(`${colors.bright}${colors.green}✅ ${t('allPassed')}${colors.reset}\n`);
  }

  // Sorted keys list (if requested)
  if (options.sort) {
    console.log(`${colors.bright}${colors.cyan}🔤 ${t('sortedKeyList')}: ${comparison.referenceLocale}):${colors.reset}\n`);
    const keys = comparison.byLocale[comparison.referenceLocale]?.keys || [];
    keys.forEach((key, idx) => {
      console.log(`  ${String(idx + 1).padStart(3, ' ')}. ${colors.gray}${key}${colors.reset}`);
    });
    console.log();
  }
}

/**
 * Export comparison result to JSON file
 * @param {Object} comparison - Comparison result
 */
function exportToJson(comparison) {
  const exportPath = path.join(LOCALES_DIR, '../../../tools/i18n-audit-result.json');
  fs.writeFileSync(exportPath, JSON.stringify(comparison, null, 2));
  console.log(`${colors.green}✓ ${t('reportExported')}: ${exportPath}${colors.reset}`);
}

/**
 * Export comparison result to CSV file
 * @param {Object} comparison - Comparison result
 */
function exportToCsv(comparison) {
  const langCodes = Object.keys(comparison.byLocale);
  const referenceLocale = comparison.referenceLocale;
  const keys = comparison.byLocale[referenceLocale]?.keys || [];

  let csv = t('key') + ',' + langCodes.map(l => `${l} (${t('keys')})`).join(',') + '\n';

  keys.forEach(key => {
    const row = [key];
    for (const lang of langCodes) {
      const hasKey = comparison.byLocale[lang].keys.includes(key);
      row.push(hasKey ? '✓' : '✗');
    }
    csv += row.join(',') + '\n';
  });

  const exportPath = path.join(LOCALES_DIR, '../../../tools/i18n-audit-result.csv');
  fs.writeFileSync(exportPath, csv);
  console.log(`${colors.green}✓ ${t('reportExported')}: ${exportPath}${colors.reset}`);
}

/**
 * Main function
 */
function main() {
  const options = {
    sort: args.includes('--sort'),
    export: args.includes('--export'),
    csv: args.includes('--csv'),
    detail: args.includes('--detail'),
  };

  console.log(`${colors.gray}${t('loading')}: ${LOCALES_DIR}${colors.reset}`);

  const localeFiles = getLocaleFiles();
  if (localeFiles.length === 0) {
    console.error(`${colors.red}${t('noFiles')}${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.gray}${t('found')} ${localeFiles.length} ${t('localeFiles')}: ${localeFiles.join(', ')}${colors.reset}\n`);

  // Load all locales
  const locales = {};
  for (const file of localeFiles) {
    const lang = path.basename(file, '.js');
    const data = loadLocale(file);
    if (data) {
      locales[lang] = data;
    }
  }

  // Run comparison
  const comparison = compareLocales(locales);

  // Print report
  printReport(comparison, options);

  // Export if requested
  if (options.export || options.csv) {
    if (options.csv) {
      exportToCsv(comparison);
    } else {
      exportToJson(comparison);
    }
  }

  // Exit with error code if issues found
  const hasIssues = Object.keys(comparison.missing).length > 0 ||
                   Object.keys(comparison.extra).length > 0 ||
                   Object.keys(comparison.mismatchType).length > 0 ||
                   comparison.inconsistentEllipsis.length > 0 ||
                   comparison.inconsistentCase.length > 0;

  process.exit(hasIssues ? 1 : 0);
}

main();
