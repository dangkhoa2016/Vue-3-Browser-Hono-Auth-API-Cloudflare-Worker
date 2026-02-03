#!/usr/bin/env node

/**
 * i18n Management CLI
 * 
 * Quản lý i18n locales - kiểm tra, so sánh, xuất báo cáo
 * 
 * Usage:
 *   node tools/i18n.js audit                    - Kiểm tra consistency
 *   node tools/i18n.js audit --sort             - Kiểm tra + hiển thị danh sách key
 *   node tools/i18n.js audit --export           - Kiểm tra + export JSON
 *   node tools/i18n.js audit --csv              - Kiểm tra + export CSV
 *   node tools/i18n.js keys [lang]              - Liệt kê tất cả key
 *   node tools/i18n.js count                    - Đếm key theo ngôn ngữ
 *   node tools/i18n.js help                     - Hiển thị trợ giúp
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect locale from args or environment
const args = process.argv.slice(2);
const langArg = args.find(a => a.startsWith('--lang='));
const LOCALE = langArg ? langArg.split('=')[1] : (process.env.LANG?.startsWith('vi') ? 'vi' : 'en');

// i18n translations
const translations = {
  en: {
    helpTitle: 'i18n Management CLI - Help & Usage',
    availableCommands: 'Available Commands',
    audit: {
      title: 'audit',
      description: 'Check and compare consistency between locale files',
      options: 'Options',
      sortDesc: 'Display sorted key list',
      exportDesc: 'Export report to JSON',
      csvDesc: 'Export report to CSV',
      examples: 'Examples',
    },
    keys: {
      title: 'keys',
      description: 'List all keys from a locale',
      arguments: 'Arguments',
      langDesc: 'Language code (en, vi, ko, ja, de). If not provided, use en',
      examples: 'Examples',
    },
    count: {
      title: 'count',
      description: 'Count and display number of keys by language',
      examples: 'Examples',
    },
    help: {
      title: 'help',
      description: 'Display this help',
      examples: 'Examples',
    },
    quickTips: 'Quick Tips',
    tip1: 'Run',
    tip1b: 'regularly to check consistency',
    tip2: 'Use',
    tip2b: 'to review key list',
    tip3: 'Export reports to share or archive',
    tip4: 'Check',
    tip4b: 'for details',
    localeFiles: 'Locale Files',
    location: 'Location',
    supported: 'Supported',
    auditOutputExamples: 'Audit Output Examples',
    localeComplete: 'Locale is complete',
    localeMissing: 'Locale has missing keys',
    extraKeysFound: 'Extra keys found',
    errorFound: 'Type mismatch or other error',
    inconsistentEllipsis: 'Inconsistent ellipsis (...)',
    inconsistentCapitalization: 'Inconsistent capitalization',
    runningAudit: 'Running audit...',
    notImplemented: 'not yet implemented',
    unknownCommand: 'Unknown command',
  },
  vi: {
    helpTitle: 'Công cụ Quản lý i18n - Trợ giúp & Cách dùng',
    availableCommands: 'Các lệnh khả dụng',
    audit: {
      title: 'audit',
      description: 'Kiểm tra và so sánh tính nhất quán giữa các file locale',
      options: 'Tùy chọn',
      sortDesc: 'Hiển thị danh sách key được sắp xếp',
      exportDesc: 'Xuất báo cáo sang JSON',
      csvDesc: 'Xuất báo cáo sang CSV',
      examples: 'Ví dụ',
    },
    keys: {
      title: 'keys',
      description: 'Liệt kê tất cả key từ một locale',
      arguments: 'Tham số',
      langDesc: 'Mã ngôn ngữ (en, vi, ko, ja, de). Nếu không có, dùng en',
      examples: 'Ví dụ',
    },
    count: {
      title: 'count',
      description: 'Đếm và hiển thị số lượng key theo ngôn ngữ',
      examples: 'Ví dụ',
    },
    help: {
      title: 'help',
      description: 'Hiển thị trợ giúp này',
      examples: 'Ví dụ',
    },
    quickTips: 'Mẹo nhanh',
    tip1: 'Chạy',
    tip1b: 'thường xuyên để kiểm tra tính nhất quán',
    tip2: 'Sử dụng',
    tip2b: 'để xem lại danh sách key',
    tip3: 'Xuất báo cáo để chia sẻ hoặc lưu trữ',
    tip4: 'Kiểm tra',
    tip4b: 'để xem chi tiết',
    localeFiles: 'Các file Locale',
    location: 'Vị trí',
    supported: 'Hỗ trợ',
    auditOutputExamples: 'Ví dụ kết quả Audit',
    localeComplete: 'Locale đầy đủ',
    localeMissing: 'Locale có keys bị thiếu',
    extraKeysFound: 'Tìm thấy keys thừa',
    errorFound: 'Kiểu dữ liệu không khớp hoặc lỗi khác',
    inconsistentEllipsis: 'Dấu ba chấm (...) không nhất quán',
    inconsistentCapitalization: 'Chữ hoa/thường không nhất quán',
    runningAudit: 'Đang chạy audit...',
    notImplemented: 'chưa được triển khai',
    unknownCommand: 'Lệnh không xác định',
  },
};

// Translation function
const t = (key, subkey = null) => {
  if (subkey) {
    return translations[LOCALE]?.[key]?.[subkey] || translations.en[key]?.[subkey] || `${key}.${subkey}`;
  }
  return translations[LOCALE]?.[key] || translations.en[key] || key;
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function help() {
  const title = t('helpTitle').padEnd(59);
  console.log(`
${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}
${colors.bright}${colors.cyan}║        ${title}║${colors.reset}
${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}${t('availableCommands')}:${colors.reset}

  ${colors.cyan}${t('audit', 'title')}${colors.reset}
    ${t('audit', 'description')}
    ${colors.gray}${t('audit', 'options')}:${colors.reset}
      --sort      ${t('audit', 'sortDesc')}
      --export    ${t('audit', 'exportDesc')}
      --csv       ${t('audit', 'csvDesc')}
    
    ${colors.dim}${t('audit', 'examples')}:${colors.reset}
      node tools/i18n.js audit
      node tools/i18n.js audit --sort
      node tools/i18n.js audit --export --csv

  ${colors.cyan}${t('keys', 'title')}${colors.reset} [lang]
    ${t('keys', 'description')}
    ${colors.gray}${t('keys', 'arguments')}:${colors.reset}
      lang        ${t('keys', 'langDesc')}
    
    ${colors.dim}${t('keys', 'examples')}:${colors.reset}
      node tools/i18n.js keys
      node tools/i18n.js keys vi
      node tools/i18n.js keys ja

  ${colors.cyan}${t('count', 'title')}${colors.reset}
    ${t('count', 'description')}
    
    ${colors.dim}${t('count', 'examples')}:${colors.reset}
      node tools/i18n.js count

  ${colors.cyan}${t('help', 'title')}${colors.reset}
    ${t('help', 'description')}
    
    ${colors.dim}${t('help', 'examples')}:${colors.reset}
      node tools/i18n.js help

${colors.bright}${t('quickTips')}:${colors.reset}
  • ${t('tip1')} ${colors.cyan}audit${colors.reset} ${t('tip1b')}
  • ${t('tip2')} ${colors.cyan}--sort${colors.reset} ${t('tip2b')}
  • ${t('tip3')}
  • ${t('tip4')} ${colors.cyan}tools/i18n-audit-result.json${colors.reset} ${t('tip4b')}

${colors.bright}${t('localeFiles')}:${colors.reset}
  📍 ${t('location')}: assets/js/locales/
  📝 ${t('supported')}: de.js, en.js, ja.js, ko.js, vi.js

${colors.bright}${t('auditOutputExamples')}:${colors.reset}
  ✓ ${t('localeComplete')}
  ✗ ${t('localeMissing')}
  ⚠️  ${t('extraKeysFound')}
  ❌ ${t('errorFound')}
  ⏭️  ${t('inconsistentEllipsis')}
  🔤 ${t('inconsistentCapitalization')}

`);
}

function runAudit(args) {
  console.log(`${colors.gray}${t('runningAudit')}${colors.reset}\n`);
  // Pass language parameter to i18n-audit.js
  const auditArgs = langArg ? [...args, langArg] : args;
  const child = spawn('node', [path.join(__dirname, 'i18n-audit.js'), ...auditArgs], {
    stdio: 'inherit',
  });
  child.on('exit', (code) => process.exit(code));
}

function main() {
  const command = args.find(a => !a.startsWith('--'))?.toLowerCase();

  switch (command) {
    case 'audit':
      runAudit(args.filter(a => !a.startsWith('--lang=')));
      break;
    case 'keys':
      console.log(`${colors.yellow}${t('notImplemented', 'keys')}: 'keys'${colors.reset}`);
      process.exit(1);
      break;
    case 'count':
      console.log(`${colors.yellow}${t('notImplemented', 'count')}: 'count'${colors.reset}`);
      process.exit(1);
      break;
    case 'help':
    case '--help':
    case '-h':
      help();
      break;
    default:
      if (command) {
        console.error(`${colors.red}${t('unknownCommand')}: ${command}${colors.reset}\n`);
      }
      help();
      process.exit(command ? 1 : 0);
  }
}

main();
