#!/usr/bin/env node

/**
 * Vue File Size Check Tool
 *
 * EN: Check Vue page/component file line limits.
 * VI: Kiểm tra giới hạn số dòng cho file page/component Vue.
 *
 * Usage:
 *   node tools/vue-file-size-check.cjs
 *   node tools/vue-file-size-check.cjs --warn-only
 *   node tools/vue-file-size-check.cjs --lang=en
 *   node tools/vue-file-size-check.cjs --lang=vi --page-limit=600 --component-limit=450
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const VUE_ROOT = path.join(PROJECT_ROOT, 'vue');
const PAGE_DIR = path.join(VUE_ROOT, 'pages');
const COMPONENT_DIR = path.join(VUE_ROOT, 'components');

const args = process.argv.slice(2);
const pageLimitArg = args.find((arg) => arg.startsWith('--page-limit='));
const componentLimitArg = args.find((arg) => arg.startsWith('--component-limit='));
const langArg = args.find((arg) => arg.startsWith('--lang='));
const warnOnly = args.includes('--warn-only');

const PAGE_LINE_LIMIT = Number(pageLimitArg?.split('=')[1] || 600);
const COMPONENT_LINE_LIMIT = Number(componentLimitArg?.split('=')[1] || 450);
const ACTIVE_LANG = (langArg?.split('=')[1] || (process.env.LANG?.startsWith('vi') ? 'vi' : 'en')) === 'vi' ? 'vi' : 'en';

const color = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

// EN: Localized CLI messages (English/Vietnamese).
// VI: Thông điệp CLI bản địa hóa (Anh/Việt).
const messages = {
  en: {
    title: 'Vue File Size Check',
    checkedFiles: 'Checked files',
    limits: 'Limits',
    pagesLabel: 'pages',
    componentsLabel: 'components',
    linesUnit: 'lines',
    allWithinLimits: '✓ All files are within limits.',
    foundExceeding: 'Found {count} file(s) exceeding limits:',
    pageScope: 'page',
    componentScope: 'component',
  },
  vi: {
    title: 'Kiểm tra kích thước file Vue',
    checkedFiles: 'Số file đã kiểm tra',
    limits: 'Giới hạn',
    pagesLabel: 'trang',
    componentsLabel: 'component',
    linesUnit: 'dòng',
    allWithinLimits: '✓ Tất cả file đều nằm trong giới hạn.',
    foundExceeding: 'Phát hiện {count} file vượt giới hạn:',
    pageScope: 'trang',
    componentScope: 'component',
  },
};

function tt(key, params = {}) {
  const template = messages[ACTIVE_LANG]?.[key] || messages.en[key] || key;
  return Object.entries(params).reduce((text, [param, value]) => {
    return text.replace(`{${param}}`, String(value));
  }, template);
}

function walkVueFiles(dirPath, collector = []) {
  if (!fs.existsSync(dirPath)) return collector;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkVueFiles(absolutePath, collector);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.vue')) {
      collector.push(absolutePath);
    }
  }

  return collector;
}

function getLineCount(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function buildViolations(files, maxLines, scope) {
  return files
    .map((filePath) => {
      const lines = getLineCount(filePath);
      return {
        scope,
        filePath,
        relativePath: path.relative(PROJECT_ROOT, filePath).replaceAll('\\', '/'),
        lines,
        limit: maxLines,
      };
    })
    .filter((item) => item.lines > item.limit)
    .sort((a, b) => b.lines - a.lines);
}

function printSummary(violations, totalChecked) {
  console.log(`\n${color.bright}${color.cyan}${tt('title')}${color.reset}`);
  console.log(`${tt('checkedFiles')}: ${totalChecked}`);
  console.log(`${tt('limits')}: ${tt('pagesLabel')} <= ${PAGE_LINE_LIMIT} ${tt('linesUnit')}, ${tt('componentsLabel')} <= ${COMPONENT_LINE_LIMIT} ${tt('linesUnit')}`);

  if (!violations.length) {
    console.log(`${color.green}${tt('allWithinLimits')}${color.reset}\n`);
    return;
  }

  const redOrYellow = warnOnly ? color.yellow : color.red;
  console.log(`\n${redOrYellow}${warnOnly ? '⚠' : '✖'} ${tt('foundExceeding', { count: violations.length })}${color.reset}`);

  violations.forEach((item) => {
    const localizedScope = item.scope === 'page' ? tt('pageScope') : tt('componentScope');
    console.log(
      `  - [${localizedScope}] ${item.relativePath}: ${item.lines} ${tt('linesUnit')} (limit ${item.limit})`
    );
  });

  console.log('');
}

function main() {
  const pageFiles = walkVueFiles(PAGE_DIR);
  const componentFiles = walkVueFiles(COMPONENT_DIR);

  const violations = [
    ...buildViolations(pageFiles, PAGE_LINE_LIMIT, 'page'),
    ...buildViolations(componentFiles, COMPONENT_LINE_LIMIT, 'component'),
  ];

  printSummary(violations, pageFiles.length + componentFiles.length);

  if (violations.length && !warnOnly) {
    process.exit(1);
  }

  process.exit(0);
}

main();
