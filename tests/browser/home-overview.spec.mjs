import { test, expect } from './fixtures.js';
import { control, useLiveApi, submitLoginForm } from './helpers/browser-fixture.mjs';

const FRONTEND = 'https://github.com/dangkhoa2016/Vue-3-Browser-Hono-Auth-API-Cloudflare-Worker';
const BACKEND = 'https://github.com/dangkhoa2016/Hono-Auth-API-Cloudflare-Worker';

test.beforeEach(async () => { await control.reset(); });

test('returning browser ignores an obsolete SFC cache without losing preferences', async ({ page }) => {
  await useLiveApi(page);
  await page.addInitScript(() => {
    localStorage.setItem('user-locale', 'en');
    localStorage.setItem('theme', 'dark');
  });
  await page.goto('/');
  await expect(page.locator('main h1')).toContainText('browser-first');
  await page.evaluate(async () => {
    const cache = await caches.open('vue-sfc-cache-v2');
    await cache.put('/vue/pages/Home.vue', new Response('<template><h1>{{ $t("message.home.hero.title_start") }}</h1></template>'));
    localStorage.setItem('returning-browser-preference', 'keep');
  });
  await page.reload();
  await expect(page.locator('main h1')).toContainText('browser-first');
  await expect(page.locator('main')).not.toContainText('message.home.');
  expect(await page.evaluate(() => localStorage.getItem('returning-browser-preference'))).toBe('keep');
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('architecture and source links explain the two real projects', async ({ page }) => {
  await useLiveApi(page);
  await page.addInitScript(() => localStorage.setItem('user-locale', 'en'));
  await page.goto('/');
  const main = page.locator('main');
  await expect(main.getByRole('heading', { level: 1 })).toContainText('browser-first');
  await expect(main.getByRole('heading', { name: 'From browser to edge.' })).toBeVisible();
  await expect(main.locator('a', { hasText: 'Frontend source' }).first()).toHaveAttribute('href', FRONTEND);
  await expect(main.locator('a', { hasText: 'Backend source' })).toHaveAttribute('href', BACKEND);
  await expect(main.locator('a[href$="/documents/DOCUMENTATION_INDEX.md"]')).toHaveCount(1);
  await expect(main.locator('a[href$="/documents/AUTH_AND_SESSION_FLOW.md"]')).toHaveCount(1);
  await main.getByRole('button', { name: 'Explore architecture' }).focus();
  await page.keyboard.press('Enter');
  await expect(main.locator('#architecture')).toBeFocused();
  await expect.poll(() => main.locator('#architecture').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBeLessThan(180);
  await expect(page).toHaveURL(/\/#\/$/);
  await main.getByRole('link', { name: 'API health', exact: true }).click();
  await expect(page).toHaveURL(/#\/health$/);
});

test('home sign-in opens the existing form and becomes a profile link', async ({ page }) => {
  await useLiveApi(page);
  await page.addInitScript(() => localStorage.setItem('user-locale', 'en'));
  await page.goto('/');
  const action = page.getByTestId('home-session-action');
  await expect(action).toHaveText(/Sign in/);
  await action.click();
  await expect(page.locator('#email')).toBeVisible();
  await submitLoginForm(page);
  await expect(action).toHaveText(/Open your profile/);
  await expect(action).toHaveAttribute('href', '#/profile');
  await action.click();
  await expect(page).toHaveURL(/#\/profile$/);
});

test('keyboard sign-in contains focus, switches forms and restores the opener', async ({ page }) => {
  await useLiveApi(page);
  await page.addInitScript(() => localStorage.setItem('user-locale', 'en'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const action = page.getByTestId('home-session-action');
  await action.scrollIntoViewIfNeeded();
  await action.focus();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('Enter');
  await expect(page.locator('#email')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#password')).toBeFocused();
  let dialog = page.getByRole('dialog');
  const register = dialog.getByRole('button', { name: 'Register now' });
  await register.focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(register).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#fullname')).toBeFocused();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Login now' }).click();
  await expect(page.locator('#email')).toBeFocused();
  await page.getByRole('dialog', { name: 'Login', exact: true }).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(action).toBeFocused();
  await expect(page).toHaveURL(/\/#\/$/);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
});

const titles = {
  en: 'A browser-first console',
  vi: 'Giao diện quản trị trên trình duyệt',
  ja: 'ブラウザで使う管理コンソール',
  ko: '브라우저에서 사용하는 관리 콘솔',
  de: 'Eine Verwaltungskonsole im Browser',
};

for (const locale of Object.keys(titles)) {
  for (const theme of ['light', 'dark']) {
    test(`mobile ${locale} ${theme} stays translated and within the viewport`, async ({ page }) => {
      await useLiveApi(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(({ locale, theme }) => {
        localStorage.setItem('user-locale', locale);
        localStorage.setItem('theme', theme);
      }, { locale, theme });
      await page.goto('/');
      const main = page.locator('main');
      await expect(main.getByRole('heading', { level: 1 })).toContainText(titles[locale]);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect.poll(() => page.locator('html').evaluate(el => el.classList.contains('dark'))).toBe(theme === 'dark');
      await expect(main).not.toContainText('message.home.');
      await expect(main.locator('h2')).toHaveCount(5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await main.getByTestId('home-session-action').scrollIntoViewIfNeeded();
      await main.getByTestId('home-session-action').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#email')).toBeVisible();
    });
  }
}
