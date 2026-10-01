/**
 * The backend contract, proven in a real browser, with no owner credentials and no backend.
 *
 * `backend-capabilities.spec.mjs` answers a different question: "does the real backend support this".
 * That one legitimately needs a prepared backend and an owner-approved session, and it is skipped
 * without one. But its assertions are mostly about the **client** — that an unconfirmed capability
 * fails closed, that a disabled export explains itself instead of reporting a false success, that a
 * secret value never reaches the DOM, and that unconfirmed monitoring stays unconfirmed. None of that
 * needs a backend, and a skipped suite is not evidence for any of it.
 *
 * So this suite drives the same pages against the loopback stand-in, which is told what to answer
 * through `/__fake/config`. The default answer is "the backend said nothing", the state that has to
 * fail closed. A test then supplies a real answer and the control has to follow it — which is what
 * makes the default meaningful instead of a stub that always says yes.
 */

// The shared fixture, not Playwright's: it installs the egress guard on the context before any
// page exists and fails the run if the guard refused something (FA8-03).
import { test, expect } from './fixtures.js';

const API_BASE = `http://127.0.0.1:${process.env.FRONTEND_API_PORT || 18788}`;
const RECORD_KEY = 'auth-session-record';

// Hash history, per assets/js/router.js. The compliance tab is deep-linked, which is the barrier that
// replaces a sleep: the report is requested by navigation, not by hoping a timer fired.
const PAGES = {
  advancedAuditCompliance: '/admin/advanced-audit?tab=compliance',
  monitoring: '/admin/monitoring',
  envComparison: '/admin/kv/env-comparison'
};

// The control plane is a plain loopback call: it needs no browser context, and it cannot be confused
// with something the page did.
const control = (path, patch = {}) => fetch(`${API_BASE}${path}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(patch)
});

const setConfig = async (patch) => {
  const response = await control('/__fake/config', patch);
  expect(response.ok, `the fake API refused the config patch: ${await response.text()}`).toBe(true);
};

const apiRequests = async () => (await (await fetch(`${API_BASE}/__fake/requests`)).json()).requests;

const readRecord = (page) => page.evaluate((key) => {
  const raw = window.localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}, RECORD_KEY);

/**
 * Signs in through the real form, so the page is authenticated the way a user authenticates: with a
 * session the app wrote itself, under the real writer lock, and with a `user` the app can gate on.
 */
async function signIn(page, { role = 'admin' } = {}) {
  await setConfig({ userRole: role });
  await page.addInitScript((apiBase) => {
    window.localStorage.setItem('api-base-url', apiBase);
    window.localStorage.setItem('mock-api', 'false');
  }, API_BASE);

  await page.goto('/');
  await page.waitForFunction(() => window.localStorage.getItem('api-base-url') !== null, null, { timeout: 45_000 });

  const loginButton = page.locator('button[title]', { hasText: /login|đăng nhập/i }).first();
  await loginButton.waitFor({ state: 'visible', timeout: 30_000 });
  await loginButton.click();
  await page.locator('#email').fill('browser@example.test');
  await page.locator('#password').fill('fake-password');
  await page.getByTestId('login-submit').click();

  await page.waitForFunction(
    (key) => JSON.parse(window.localStorage.getItem(key) || 'null')?.state === 'active',
    RECORD_KEY,
    { timeout: 20_000 }
  );
}

const pdfButton = (page) => page.locator('button:has(i.bi-file-earmark-pdf)').first();
const startButton = (page) => page.locator('button:has(i.bi-play-fill)').first();

const waitForRecordState = (page, state) => page.waitForFunction(
  ({ key, expected }) => JSON.parse(window.localStorage.getItem(key) || 'null')?.state === expected,
  { key: RECORD_KEY, expected: state },
  { timeout: 20_000 }
);

test.describe('the backend contract, against a peer that can be told the answer', () => {
  test.beforeEach(async () => {
    await control('/__fake/reset');
  });

  test('the session record and the contract answers belong to the same API identity', async ({ page }) => {
    await signIn(page);
    const record = await readRecord(page);
    expect(record.identity).toBe(API_BASE);
    expect(record.state).toBe('active');
  });

  test('an unconfirmed PDF export is disabled, and no export request is even sent', async ({ page }) => {
    await signIn(page);
    await page.goto(`/#${PAGES.advancedAuditCompliance}`);

    const pdf = pdfButton(page);
    await expect(pdf).toBeVisible();
    await expect(pdf).toBeDisabled();

    // The gate must not be decorative: the request log has to be empty for that format.
    const requests = await apiRequests();
    expect(requests.filter((entry) => entry.path.includes('export-advanced'))).toEqual([]);
  });

  test('a refused export always explains itself, and never claims the backend refused it', async ({ page }) => {
    await signIn(page);

    // The backend said nothing about PDF: the control is off, and the reason says the answer is
    // missing rather than inventing a refusal the backend never made.
    await page.goto(`/#${PAGES.advancedAuditCompliance}`);
    await expect(pdfButton(page)).toBeDisabled();
    const unconfirmed = await pdfButton(page).getAttribute('title');
    expect(unconfirmed, 'a refused export must carry a reason').toBeTruthy();
    expect(unconfirmed, 'and must not claim the backend said no when it said nothing')
      .toMatch(/not verified|unconfirmed|not confirmed|chưa xác minh|chưa xác nhận/i);

    // The backend answered "no": still off, still with a reason. (The export gate has one reason for
    // both refusals; the monitoring gate below is the one that distinguishes them, and that test is
    // where the two states are asserted to be told apart.)
    await setConfig({ capabilities: { exportPdf: false } });
    await page.reload();
    await expect(pdfButton(page)).toBeDisabled();
    expect(await pdfButton(page).getAttribute('title'), 'a refused export must always carry a reason')
      .toBeTruthy();
  });

  test('a confirmed PDF export is enabled, because the backend said so', async ({ page }) => {
    await signIn(page);
    await setConfig({ capabilities: { exportPdf: true } });
    await page.goto(`/#${PAGES.advancedAuditCompliance}`);

    const pdf = pdfButton(page);
    await expect(pdf).toBeVisible();
    await expect(pdf).toBeEnabled();
    expect(await pdf.getAttribute('title'), 'an enabled control must not carry a stale blocked reason').toBeFalsy();
  });

  test('an export the backend refuses is reported, not swallowed into a false success', async ({ page }) => {
    await signIn(page);
    // The page believes PDF is supported; the backend disagrees. The UI has to surface the refusal
    // instead of the button quietly doing nothing.
    await setConfig({ capabilities: { exportPdf: true }, exportFormats: ['json', 'csv'] });
    await page.goto(`/#${PAGES.advancedAuditCompliance}`);

    const pdf = pdfButton(page);
    await expect(pdf).toBeEnabled();
    await pdf.click();

    // The refusal has to arrive as a failure, not as the success message the same handler shows when
    // the export really was accepted.
    const errorToast = page.locator('div:has(> i.bi-x-circle-fill)').last();
    await expect(errorToast).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText(/PDF export requested|Compliance PDF export requested/i);

    expect((await apiRequests()).filter((entry) => entry.path.includes('export-advanced')).length)
      .toBeGreaterThan(0);
  });

  test('continuous monitoring stays refused while the backend has not confirmed it', async ({ page }) => {
    await signIn(page, { role: 'super_admin' });
    await page.goto(`/#${PAGES.monitoring}`);

    const start = startButton(page);
    await expect(start).toBeVisible();
    await expect(start).toBeDisabled();
    expect(await start.getAttribute('title')).toMatch(/unconfirmed|not confirmed|chưa xác nhận|không được xác nhận/i);

    // And no start request was made: the refusal is the client's, and it is a real one.
    const requests = await apiRequests();
    expect(requests.filter((entry) => entry.path.endsWith('/monitoring/start'))).toEqual([]);
  });

  test('an explicitly unsupported capability is refused even though the backend answered', async ({ page }) => {
    await signIn(page, { role: 'super_admin' });
    await setConfig({ capabilities: { continuousMonitoring: false } });
    await page.goto(`/#${PAGES.monitoring}`);

    const start = startButton(page);
    await expect(start).toBeDisabled();
    // A gate that only checked for the presence of an answer would enable this control.
    expect(await start.getAttribute('title')).toMatch(/disabled|không hỗ trợ/i);
    expect(await start.getAttribute('title')).not.toMatch(/unconfirmed/i);
  });

  test('confirmed monitoring enables the control and a real start reaches the backend', async ({ page }) => {
    await signIn(page, { role: 'super_admin' });
    await setConfig({ capabilities: { continuousMonitoring: true } });
    await page.goto(`/#${PAGES.monitoring}`);

    const start = startButton(page);
    await expect(start).toBeEnabled();
    await start.click();

    // The backend confirms it is running, so the control is replaced by the stop control.
    await expect(page.locator('button:has(i.bi-stop-fill)').first()).toBeVisible({ timeout: 20_000 });
    expect((await apiRequests()).filter((entry) => entry.path.endsWith('/monitoring/start')).length)
      .toBeGreaterThan(0);
  });

  test('a capability answer from one session is not inherited by the next one', async ({ page }) => {
    await signIn(page, { role: 'super_admin' });
    await setConfig({ capabilities: { continuousMonitoring: true } });
    await page.goto(`/#${PAGES.monitoring}`);
    await expect(startButton(page)).toBeEnabled();

    // Sign out and back in. The new session has its own context, so a capability map cached for the
    // old one must not still be on screen when the backend has since gone quiet.
    await page.getByTestId('user-menu-toggle').first().click({ timeout: 20_000 });
    await page.getByTestId('logout-menu-item').first().click();
    await page.getByTestId('confirm-modal-confirm').click();
    await waitForRecordState(page, 'ended');

    await control('/__fake/reset');
    await signIn(page, { role: 'super_admin' });
    await page.goto(`/#${PAGES.monitoring}`);
    await expect(startButton(page)).toBeDisabled();
  });

  test('a raw secret in the env comparison is never rendered', async ({ page }) => {
    await signIn(page, { role: 'super_admin' });
    // A backend that leaks: the secret arrives in a field the contract does not define, next to a
    // perfectly plausible mask.
    await setConfig({
      envComparison: {
        LEAKED_KEY: {
          source: 'kv',
          kv: { configured: true, masked: 'sk_li*****ve', value: 'sk_live_REAL_LOOKING_SECRET' },
          env: { configured: true, masked: null, secret: 'sk_live_ANOTHER_REAL_SECRET' }
        }
      }
    });
    await page.goto(`/#${PAGES.envComparison}`);

    await expect(page.locator('body')).toContainText('LEAKED_KEY', { timeout: 20_000 });

    const body = await page.locator('body').innerText();
    expect(body, 'a real-looking secret reached the DOM').not.toContain('sk_live_REAL_LOOKING_SECRET');
    expect(body, 'and so did the one sitting beside the mask').not.toContain('sk_live_ANOTHER_REAL_SECRET');
    // The bounded preview is still a preview, and is kept: the fix is not "hide every mask".
    expect(body).toContain('sk_li*****ve');
  });

  test('a secret that is only almost masked is not shown either', async ({ page }) => {
    await signIn(page, { role: 'super_admin' });
    await setConfig({
      envComparison: {
        // The review probe: a full fake secret with two trailing asterisks. "A few asterisks" is not
        // proof of a mask, and the old pattern accepted exactly this.
        PARTIAL_MASK: {
          source: 'kv',
          kv: { configured: true, masked: 'sk_live_REAL_LOOKING_SECRET**' },
          env: { configured: true, masked: null }
        }
      }
    });
    await page.goto(`/#${PAGES.envComparison}`);

    await expect(page.locator('body')).toContainText('PARTIAL_MASK', { timeout: 20_000 });
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('sk_live_REAL_LOOKING_SECRET');
  });

  test('a missing value is reported as absent rather than as an empty success', async ({ page }) => {
    await signIn(page, { role: 'super_admin' });
    await setConfig({
      envComparison: {
        NOT_CONFIGURED: { source: 'env', kv: { configured: false, masked: null }, env: { configured: false, masked: null } }
      }
    });
    await page.goto(`/#${PAGES.envComparison}`);

    // The comparison holds exactly this one key, so the value text on the page can only be its row.
    await expect(page.locator('body')).toContainText('NOT_CONFIGURED', { timeout: 20_000 });
    const body = await page.locator('body').innerText();
    expect(body, 'a value that is not configured must be reported as absent, not as an empty success')
      .toMatch(/empty string|chuỗi rỗng|\- none -/i);
    expect(body).not.toMatch(/sk_li\*+|\*{6,}/);
  });
});

test('FR12 N6: native reset clears the AdvancedAudit SFC store and late A cannot refill login B', async ({page}) => {
  await control('/__fake/reset');
  await signIn(page);
  await setConfig({capabilities:{exportPdf:true}});
  await page.goto(`/#${PAGES.advancedAuditCompliance}`);
  await expect(pdfButton(page)).toBeEnabled();
  const state = () => page.evaluate(() => {
    const s=Pinia.getActivePinia()._s.get('advancedAudit');
    return {compliance:s.compliance,capabilities:s.capabilities,error:s.error,loading:s.loading};
  });
  expect((await state()).compliance).not.toBeNull();
  let accept; const accepted=new Promise(r=>accept=r);
  let release; const released=new Promise(r=>release=r);
  let held=false;
  await page.route('**/api/advanced-audit/compliance/report?*',async route=>{
    if(held) return route.continue();held=true;
    const response=await route.fetch(); // A accepted by actual client/fixture before the transition.
    accept();await released;await route.fulfill({response});
  });
  await page.evaluate(()=>{
    const store=Pinia.getActivePinia()._s.get('advancedAudit');
    window.__r11Settled=0;
    store.fetchCompliance().catch(()=>{}).finally(()=>window.__r11Settled++);
  });
  await accepted;
  try {
    const reset=await page.evaluate(async()=> (await import('/assets/js/api/protectedState.js')).resetProtectedState('r11-native-reset'));
    expect(reset.failures).toEqual([]);
    expect(await state()).toEqual({compliance:null,capabilities:null,error:null,loading:false});
    await page.getByTestId('user-menu-toggle').first().click();
    await page.getByTestId('logout-menu-item').first().click();
    await page.getByTestId('confirm-modal-confirm').click();
    await waitForRecordState(page,'ended');
    await setConfig({reset:true});
    await page.locator('button[title]',{hasText:/login|đăng nhập/i}).first().click();
    await page.locator('#email').fill('second@example.test');
    await page.locator('#password').fill('fake-password');
    await page.getByTestId('login-submit').click();
    await waitForRecordState(page,'active');
    await expect.poll(async()=> (await state()).loading).toBe(false);
    const before=await state();
    release();
    await page.waitForFunction(()=>window.__r11Settled===1);
    expect(await state()).toEqual(before);
    expect((await state()).capabilities?.exportPdf).not.toBe(true);
  } finally {release();}
});

for (const target of ['same-origin-basepath','localhost-alias']) test(`N6 endpoint transition holds accepted A through Settings Save: ${target}`, async ({context,page}) => {
  await control('/__fake/reset');
  await signIn(page);
  const session=await readRecord(page);
  const next=target==='same-origin-basepath'?`${API_BASE}/tenant-b`:API_BASE.replace('127.0.0.1','localhost');
  const peer=await context.newPage();await peer.goto('/#/');
  await expect(peer.getByTestId('user-menu-toggle').first()).toBeVisible();
  await page.goto(`/#${PAGES.advancedAuditCompliance}`);
  await expect(pdfButton(page)).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>Pinia.getActivePinia()._s.get('advancedAudit').loading)).toBe(false);
  let accepted,release;
  const ready=new Promise(r=>accepted=r), held=new Promise(r=>release=r);
  let intercepted=false;
  await page.route('**/api/advanced-audit/compliance/report?*',async route=>{
    if(intercepted)return route.continue();intercepted=true;
    const response=await route.fetch();accepted();await held;await route.fulfill({response});
  });
  await page.evaluate(()=>{window.__r11EndpointSettled=0;Pinia.getActivePinia()._s.get('advancedAudit').fetchCompliance().catch(()=>{}).finally(()=>window.__r11EndpointSettled++);});
  await ready;
  try {
    await page.goto('/#/settings');
    await page.getByRole('button',{name:/system/i}).first().click();
    const endpoint=page.locator('input[type="url"]').first();await endpoint.fill(next);
    const cursor=(await apiRequests()).length;
    await page.locator('section').filter({has:endpoint}).last().getByRole('button',{name:/save/i}).click();
    const identity=p=>p.evaluate(async()=>({identity:(await import('/assets/js/api/apiIdentity.js')).getApiIdentity(),base:(await import('/assets/js/api/httpClient.js')).apiClient.defaults.baseURL}));
    for(const p of [page,peer])await expect.poll(()=>identity(p)).toEqual({identity:next,base:next});
    release();await page.waitForFunction(()=>window.__r11EndpointSettled===1);
    const attempts=await page.evaluate(async()=>{
      const {apiClient}=await import('/assets/js/api/httpClient.js');let settled=0;
      await Promise.all([apiClient.get('/api/auth/profile'),apiClient.get('/api/advanced-audit/compliance/report')].map(p=>p.catch(()=>{}).finally(()=>settled++)));
      const s=Pinia.getActivePinia()._s.get('advancedAudit');return {settled,compliance:s.compliance,capabilities:s.capabilities,error:s.error};
    });
    expect(attempts).toEqual({settled:2,compliance:null,capabilities:null,error:null});
    expect((await apiRequests()).slice(cursor).filter(r=>r.authorization===`Bearer ${session.accessToken}`)).toEqual([]);
    await peer.reload();
    await expect(peer.locator('button[title]',{hasText:/login|đăng nhập/i}).first()).toBeVisible();
    await expect.poll(()=>identity(peer)).toEqual({identity:next,base:next});
  } finally {release();}
});

for(const [format,type,body] of [
  ['json','application/json','[{"action":"login","actor":"fixture"}]\n'],
  ['csv','text/csv','action,actor\nlogin,fixture\n']
]) test(`audit ${format} download preserves actual response bytes`,async({page})=>{
  await control('/__fake/reset');await signIn(page);
  await page.route('**/api/audit/export?**',route=>route.fulfill({status:200,contentType:type,body,
    headers:{'access-control-expose-headers':'Content-Disposition','content-disposition':`attachment; filename="fixture.${format}"`}}));
  const downloaded=page.waitForEvent('download');
  await page.evaluate(async format=>{
    const {useAuditStore}=await import('/assets/js/stores/auditStore.js');
    await useAuditStore().export(format);
  },format);
  const download=await downloaded;
  expect(download.suggestedFilename()).toBe(`fixture.${format}`);
  const stream=await download.createReadStream();const chunks=[];
  for await(const chunk of stream) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString('utf8')).toBe(body);
});

test('audit export HTML200 produces neither a download nor a success',async({page})=>{
  await control('/__fake/reset');await signIn(page);
  await page.route('**/api/audit/export?**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html>error</html>'}));
  const downloads=[];page.on('download',d=>downloads.push(d));
  await page.goto('/#/admin/audit-logs');
  const exportButton=page.locator('button:has(i.bi-download)').first();
  await expect(exportButton).toBeVisible();
  await exportButton.click();
  await expect(page.getByText('Export failed',{exact:true})).toBeVisible();
  await expect(page.getByText('Export started',{exact:true})).toHaveCount(0);
  expect(downloads).toHaveLength(0);
});

for (const [title, suffix, method, field] of [
  ['Create Rule', 'alerts/rules', 'POST', 'name'],
  ['Create Channel', 'alerts/channels', 'POST', 'name'],
  ['Clear Cache', 'dashboard/cache', 'DELETE', 'key'],
  ['Create Incident', 'incidents/create', 'POST', 'description']
]) test(`monitoring form submits entered data: ${title}`, async ({page}) => {
  await control('/__fake/reset');
  await signIn(page, {role:'super_admin'});
  await page.goto(`/#${PAGES.monitoring}`);
  const path = `/api/realtime-monitoring/${suffix}`;
  const received=[];
  await page.route(`**${path}*`, async route => {
    if(route.request().method() !== method) return route.continue();
    received.push(method === 'DELETE'
      ? {key:new URL(route.request().url()).searchParams.get('key')}
      : route.request().postDataJSON());
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{id:'r11-fixture'}})});
  });
  await page.getByRole('button',{name:new RegExp(`${title}$`)}).first().click();
  const form=page.locator('form:visible');
  await expect(form).toHaveCount(1);
  await form.locator(field === 'description' ? 'textarea' : 'input[type="text"]').first().fill('r11-entered-value');
  await form.locator('button[type="submit"]').click();
  await expect.poll(()=>received.length).toBe(1);
  expect(received[0][field]).toBe('r11-entered-value');
  await expect(form).toHaveCount(0);
});

test('monitoring rule channel checkboxes emit selected channels without resetting other fields',async({page})=>{
  await control('/__fake/reset');await signIn(page,{role:'super_admin'});
  await page.goto(`/#${PAGES.monitoring}`);
  await page.getByRole('button',{name:'Create Rule',exact:true}).first().click();
  const form=page.locator('form:visible');
  await form.locator('input[type="text"]').first().fill('r11-channel-selection');
  await expect(form.getByRole('checkbox')).toHaveCount(3);
  await form.getByRole('checkbox',{name:'email',exact:true}).uncheck();
  await form.getByRole('checkbox',{name:'webhook',exact:true}).check();
  await form.getByRole('checkbox',{name:'slack',exact:true}).check();
  await form.getByRole('checkbox',{name:'webhook',exact:true}).uncheck();
  await expect(form.getByRole('checkbox',{name:'slack',exact:true})).toBeChecked();
  await expect(form.getByRole('checkbox',{name:'email',exact:true})).not.toBeChecked();
  await expect(form.locator('input[type="text"]').first()).toHaveValue('r11-channel-selection');
  const received=[];
  await page.route('**/api/realtime-monitoring/alerts/rules',async route=>{
    if(route.request().method()!=='POST')return route.continue();
    received.push(route.request().postDataJSON());
    await route.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{"id":"r11-channels"}}'});
  });
  await form.locator('button[type="submit"]').click();
  await expect.poll(()=>received.length).toBe(1);
  expect(received[0].channels).toEqual(['slack']);
});

test('profile remount fetches the current response after its store counter has advanced',async({page})=>{
  await control('/__fake/reset');await signIn(page);
  let revision=1,requests=0;
  await page.route('**/api/user/profile',async route=>{
    if(route.request().method()!=='GET')return route.continue();
    requests++;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{id:1,email:'browser@example.test',full_name:`R11 profile revision ${revision}`,role:'admin',status:'active',created_at:'2026-01-01T00:00:00Z'}})});
  });
  await page.goto('/#/profile');
  await expect(page.getByText('R11 profile revision 1',{exact:true}).first()).toBeVisible();
  await page.goto('/#/');
  await expect(page.getByText('R11 profile revision 1',{exact:true})).toHaveCount(0);
  revision=2;
  await page.goto('/#/profile');
  await expect(page.getByText('R11 profile revision 2',{exact:true}).first()).toBeVisible();
  expect(requests).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(()=>Pinia.getActivePinia()._s.get('profile').loadingProfile)).toBe(false);
});


test('N6 stale export decoding produces no download or caller toast',async({page})=>{
  await control('/__fake/reset');await signIn(page);
  await page.route('**/api/audit/export?**',route=>route.fulfill({status:200,contentType:'text/csv',body:'action\nFAKE_A\n'}));
  await page.goto('/#/admin/audit-logs');
  await expect(page.locator('button:has(i.bi-download)').first()).toBeVisible();
  await page.evaluate(()=>{
    const original=Blob.prototype.text;
    Blob.prototype.text=async function(){
      const text=await original.call(this);
      if(this.type==='text/csv'){
        window.__decodeStarted=true;
        await new Promise(resolve=>window.__releaseDecode=resolve);
      }
      return text;
    };
    const store=Pinia.getActivePinia()._s.get('audit'),run=store.export.bind(store);
    store.export=(...args)=>run(...args).finally(()=>window.__exportSettled=true);
  });
  const downloads=[];page.on('download',download=>downloads.push(download));
  await page.locator('button:has(i.bi-download)').first().click();
  await page.waitForFunction(()=>window.__decodeStarted);
  await page.evaluate(async()=>{
    (await import('/assets/js/api/apiIdentity.js')).invalidateContext();
    window.__releaseDecode();
  });
  await page.waitForFunction(()=>window.__exportSettled);
  expect(downloads).toEqual([]);
  await expect(page.getByText('Export started',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Export failed',{exact:true})).toHaveCount(0);
});
