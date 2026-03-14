#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const VUE_ROOT = path.join(PROJECT_ROOT, 'vue');
const warnOnly = process.argv.includes('--warn-only');

const rules = [
  {
    id: 'no-inline-i18n-fallback',
    description: 'Avoid inline i18n fallback (use centralized fallback utility instead).',
    patterns: [
      /\$t\([^\n)]*\)\s*\|\|/g,
      /\btf\([^\n)]*\)\s*\|\|/g
    ]
  }
];

function collectVueFiles(dirPath, collector = []) {
  if (!fs.existsSync(dirPath)) return collector;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectVueFiles(absolutePath, collector);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.vue')) {
      collector.push(absolutePath);
    }
  }

  return collector;
}

function getLineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function lintFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        violations.push({
          ruleId: rule.id,
          message: rule.description,
          line: getLineNumber(content, match.index)
        });
      }
    }
  }

  return violations;
}

function run() {
  const vueFiles = collectVueFiles(VUE_ROOT);
  const findings = [];

  for (const filePath of vueFiles) {
    const violations = lintFile(filePath);
    if (violations.length) findings.push({ filePath, violations });
  }

  console.log('\nVue Custom Lint');
  console.log(`Checked files: ${vueFiles.length}`);

  if (!findings.length) {
    console.log('✓ No custom lint violations found.\n');
    process.exit(0);
  }

  const marker = warnOnly ? '⚠' : '✖';
  const totalViolations = findings.reduce((sum, item) => sum + item.violations.length, 0);
  console.log(`\n${marker} Found ${totalViolations} custom lint violation(s) in ${findings.length} file(s).`);

  for (const fileFinding of findings) {
    const relativePath = path.relative(PROJECT_ROOT, fileFinding.filePath).replaceAll('\\', '/');
    console.log(`  - ${relativePath}`);
    for (const violation of fileFinding.violations) {
      console.log(`      [${violation.ruleId}] line ${violation.line}: ${violation.message}`);
    }
  }

  console.log('');
  process.exit(warnOnly ? 0 : 1);
}

run();
