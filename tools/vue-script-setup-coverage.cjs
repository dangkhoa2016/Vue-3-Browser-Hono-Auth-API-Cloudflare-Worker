#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const VUE_ROOT = path.join(PROJECT_ROOT, 'vue');
const PAGES_DIR = path.join(VUE_ROOT, 'pages');
const COMPONENTS_DIR = path.join(VUE_ROOT, 'components');

const args = process.argv.slice(2);
const warnOnly = args.includes('--warn-only');

const pagesThresholdArg = args.find((arg) => arg.startsWith('--pages-threshold='));
const componentsThresholdArg = args.find((arg) => arg.startsWith('--components-threshold='));
const globalThresholdArg = args.find((arg) => arg.startsWith('--global-threshold='));

const pagesThreshold = Number(pagesThresholdArg?.split('=')[1] || 100);
const componentsThreshold = Number(componentsThresholdArg?.split('=')[1] || 100);
const globalThreshold = Number(globalThresholdArg?.split('=')[1] || 100);

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

function hasScriptSetup(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes('<script setup>');
}

function toPercent(count, total) {
  if (!total) return 0;
  return Number(((count / total) * 100).toFixed(1));
}

function printBlock(label, total, setupCount, percent, threshold) {
  console.log(`${label}: ${setupCount}/${total} (${percent}%) | threshold ${threshold}%`);
}

function main() {
  const pageFiles = collectVueFiles(PAGES_DIR);
  const componentFiles = collectVueFiles(COMPONENTS_DIR);
  const allFiles = [...pageFiles, ...componentFiles];

  const pageSetupCount = pageFiles.filter(hasScriptSetup).length;
  const componentSetupCount = componentFiles.filter(hasScriptSetup).length;
  const allSetupCount = allFiles.filter(hasScriptSetup).length;

  const pagePercent = toPercent(pageSetupCount, pageFiles.length);
  const componentPercent = toPercent(componentSetupCount, componentFiles.length);
  const globalPercent = toPercent(allSetupCount, allFiles.length);

  console.log('\nVue Script Setup Coverage');
  printBlock('Pages', pageFiles.length, pageSetupCount, pagePercent, pagesThreshold);
  printBlock('Components', componentFiles.length, componentSetupCount, componentPercent, componentsThreshold);
  printBlock('Global', allFiles.length, allSetupCount, globalPercent, globalThreshold);

  const failures = [];
  if (pagePercent < pagesThreshold) failures.push(`Pages ${pagePercent}% < ${pagesThreshold}%`);
  if (componentPercent < componentsThreshold) failures.push(`Components ${componentPercent}% < ${componentsThreshold}%`);
  if (globalPercent < globalThreshold) failures.push(`Global ${globalPercent}% < ${globalThreshold}%`);

  if (!failures.length) {
    console.log('✓ Coverage thresholds satisfied.\n');
    process.exit(0);
  }

  console.log(`⚠ Threshold gaps: ${failures.join(' | ')}\n`);
  process.exit(warnOnly ? 0 : 1);
}

main();
