import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findMissingLinks } from '../../tools/check-history.mjs';

test('a Vue page cannot import a dialog introduced by a later snapshot', () => {
  const page = `import Dialog from '../components/Dialog.vue';\nexport default { components: { Dialog } };`;
  const files = new Map([['vue/pages/Users.vue', page]]);
  assert.deepEqual(findMissingLinks(files), [{ path: 'vue/pages/Users.vue', specifier: '../components/Dialog.vue', resolved: 'vue/components/Dialog.vue' }]);
  files.set('vue/components/Dialog.vue', '<template><div /></template>');
  assert.deepEqual(findMissingLinks(files), []);
});

test('literal page routes and external script sources are checked in their own snapshot', () => {
  const files = new Map([
    ['assets/js/router.js', `const route = load('/vue/pages/Home.vue');`],
    ['vue/Loader.vue', '<script src="./Loader.js"></script>']
  ]);
  assert.equal(findMissingLinks(files).length, 2);
  files.set('vue/pages/Home.vue', '<template>Home</template>');
  files.set('vue/Loader.js', 'export default {};');
  assert.deepEqual(findMissingLinks(files), []);
});

test('package imports and hosted modules are not mistaken for repository files', () => {
  const files = new Map([['assets/js/app.js', `import { ref } from 'vue';\nimport lib from 'https://example.test/lib.js';`]]);
  assert.deepEqual(findMissingLinks(files), []);
});
