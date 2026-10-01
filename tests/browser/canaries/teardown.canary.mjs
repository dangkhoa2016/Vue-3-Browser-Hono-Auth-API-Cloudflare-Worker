// Expected failures, excluded from the canonical positive testMatch.
import {test} from '../fixtures.js';
import {collectPageProblems} from '../helpers/browser-fixture.mjs';
async function pageError(page,marker) {
  const observed=page.waitForEvent('pageerror');
  await page.evaluate(marker=>setTimeout(()=>{throw Error(marker);},0),marker);
  await observed;
}
test('CANARY_FORGOT_CLEAN',async({page})=>{collectPageProblems(page);await pageError(page,'CANARY_FORGOT_CLEAN');});
test('CANARY_LATE_AFTER_CLEAN',async({page})=>{const p=collectPageProblems(page);p.expectClean();await pageError(page,'CANARY_LATE_AFTER_CLEAN');});
test('CANARY_BODY_THROW',async({page})=>{await pageError(page,'CANARY_BODY_THROW_COLLECTED');throw Error('CANARY_BODY_THROW');});
test('CANARY_MANUAL_CONTEXT',async({browser})=>{const c=await browser.newContext();const p=await c.newPage();await pageError(p,'CANARY_MANUAL_CONTEXT');});
test('CANARY_POPUP',async({page})=>{await page.goto('about:blank');const next=page.waitForEvent('popup');await page.evaluate(()=>window.open('about:blank'));await pageError(await next,'CANARY_POPUP');});
test('CANARY_TYPED_ALLOWANCE',async({page})=>{const p=collectPageProblems(page);p.allowError({kind:'console',count:1},/CANARY_TYPED_ALLOWANCE/,'wrong type deliberately');await pageError(page,'CANARY_TYPED_ALLOWANCE');});
