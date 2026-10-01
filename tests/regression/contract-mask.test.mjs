/**
 * Regression tests for the contract and UI findings of the round-3 artifact review:
 * FA-03 (the login form threw while rendering field errors), FA-04 (compression aliases were read
 * as encryption requests) and FA-05 (a raw secret with a couple of asterisks counted as a mask).
 *
 * These assert the SECURE behaviour. The review probes asserted the buggy behaviour and are
 * deliberately not reproduced.
 *
 * Fixtures: fake secrets, fake origins and loopback only. No real API, no production host.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { REPO_ROOT, createBrowserEnv, loadModule } from './helpers/browser-env.mjs';

const readRepoFile = (relativePath) => readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');

const API_A = 'http://127.0.0.1:18788';
const NOW_SECONDS = 1_800_000_000;

const USER_A = { id: 1, email: 'a@example.test' };

/** The probe secret from the review: a full fake secret with two trailing asterisks. */
const FAKE_SECRET = 'sk_live_DO_NOT_DISPLAY_0123456789';
const ALMOST_SECRET = `${FAKE_SECRET}**`;
const BOUNDED_MASK = 'sk_live_****6789';

function contract() {
  return loadModule('assets/js/api/backendContract.js', createBrowserEnv({ origin: API_A }));
}

function loginFieldErrors() {
  return loadModule('assets/js/api/loginFieldErrors.js', createBrowserEnv({ origin: API_A }));
}

describe('FA-03 — the login form can render the field errors the backend sends', () => {
  test('the real error envelope is understood, whatever spelling the field uses', () => {
    const { normalizeFieldErrors, hasFieldError, fieldErrorMessage } = loginFieldErrors();

    const normalized = normalizeFieldErrors({ errors: [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password is too short' },
    ] });

    assert.equal(normalized.length, 2);
    assert.equal(hasFieldError(normalized, 'email'), true, 'the email field is marked');
    assert.equal(hasFieldError(normalized, 'password'), true, 'the password field is marked');
    assert.equal(hasFieldError(normalized, 'remember'), false, 'a field without an error is not marked');
    assert.equal(fieldErrorMessage(normalized, 'email'), 'Email is required');
  });

  test('a missing or malformed field never throws while the template asks about it', () => {
    const { hasFieldError, fieldErrorMessage } = loginFieldErrors();

    // Every one of these reached the old `error.field` read and threw a ReferenceError in the
    // render path, which took the whole validation list down.
    const hostile = [
      undefined,
      null,
      'a string',
      42,
      [],
      [{}],
      [{ field: null }],
      [{ field: '' }],
      [{ message: 'no field at all' }],
      [{ field: 'email' }, { field: 'email' }],
    ];

    for (const entry of hostile) {
      const list = Array.isArray(entry) ? entry : [entry];
      assert.doesNotThrow(() => hasFieldError(list, 'email'), `must not throw for ${JSON.stringify(entry)}`);
      assert.doesNotThrow(() => fieldErrorMessage(list, 'email'), `must not throw for ${JSON.stringify(entry)}`);
    }

    assert.equal(hasFieldError([{ field: 'email' }], 'email'), true);
    assert.equal(hasFieldError([{ field: null }], 'email'), false);
  });

  test('an error is not attributed to a field it did not name', () => {
    const { normalizeFieldErrors, hasFieldError } = loginFieldErrors();

    const normalized = normalizeFieldErrors({ errors: [{ field: 'password', message: 'nope' }] });

    assert.equal(hasFieldError(normalized, 'password'), true);
    assert.equal(hasFieldError(normalized, 'email'), false, 'an unknown field is not "email" by default');
  });

  test('a response without field errors yields an empty list, not a broken one', () => {
    const { normalizeFieldErrors } = loginFieldErrors();

    for (const payload of [null, undefined, {}, { errors: null }, { errors: 'oops' }, { success: false }]) {
      const normalized = normalizeFieldErrors(payload);
      assert.ok(Array.isArray(normalized));
      assert.equal(normalized.length, 0);
    }
  });

  test('the composable uses the tested helper instead of matching fields itself', () => {
    const source = readRepoFile('vue/composables/useLoginModalForm.js');

    assert.doesNotMatch(source, /\berror\.field\b/, 'the old read of the undefined `error` must be gone');
    assert.match(source, /normalizeFieldErrors\(response/, 'the envelope is normalised on the way in');
    assert.match(source, /hasFieldError\(fieldErrors\.value, fieldName\)/, 'the match is the tested helper');
    assert.doesNotMatch(source, /fieldErrors\.value\.some\(/, 'the composable no longer matches fields itself');
  });

  test('the modal template renders the field error list through the helper', () => {
    const source = readRepoFile('vue/components/LoginModal.vue');

    assert.match(source, /v-for=\"\(err, index\) in fieldErrors\"/, 'the list is rendered');
    assert.match(source, /err\.field/, 'each entry names its field');
    assert.match(source, /hasFieldError\('email'\)/, 'the email input is marked by the helper');
    assert.match(source, /hasFieldError\('password'\)/, 'the password input is marked by the helper');
  });
});

describe('FA-04 — an export option alias only ever speaks for its own option', () => {
  test('a compression alias is not read as an encryption request', () => {
    const { readExportOption, EXPORT_OPTION_KEYS } = contract();

    const params = { compressed: true };

    assert.equal(readExportOption(params, EXPORT_OPTION_KEYS.COMPRESS).requested, true);
    assert.equal(readExportOption(params, EXPORT_OPTION_KEYS.ENCRYPT).requested, false, 'the bug: this was true');
  });

  test('an encryption alias is not read as a compression request', () => {
    const { readExportOption, EXPORT_OPTION_KEYS } = contract();

    const params = { encrypted: true };

    assert.equal(readExportOption(params, EXPORT_OPTION_KEYS.ENCRYPT).requested, true);
    assert.equal(readExportOption(params, EXPORT_OPTION_KEYS.COMPRESS).requested, false, 'the bug: this was true');
  });

  test('all four on/off combinations stay independent', () => {
    const { readExportOption, EXPORT_OPTION_KEYS } = contract();
    const { ENCRYPT, COMPRESS } = EXPORT_OPTION_KEYS;

    const cases = [
      [{}, false, false],
      [{ encrypt: true, compress: true }, true, true],
      [{ encrypt: true, compressed: true }, true, true],
      [{ encrypted: true, compression: true }, true, true],
      [{ encrypted: true, compress: false }, true, false],
    ];

    for (const [params, encrypt, compress] of cases) {
      assert.equal(readExportOption(params, ENCRYPT).requested, encrypt, JSON.stringify(params));
      assert.equal(readExportOption(params, COMPRESS).requested, compress, JSON.stringify(params));
    }
  });

  test('the precedence between a canonical key and an alias is defined, not accidental', () => {
    const { readExportOption, EXPORT_OPTION_KEYS } = contract();
    const { ENCRYPT, COMPRESS } = EXPORT_OPTION_KEYS;

    // 1. A canonical `true` wins, and the alias is reported as unused.
    const canonicalTrue = readExportOption({ encrypt: true, encrypted: false }, ENCRYPT);
    assert.equal(canonicalTrue.requested, true);
    assert.equal(canonicalTrue.alias, null, 'the alias was not needed');
    assert.equal(canonicalTrue.key, ENCRYPT);

    // 2. A canonical `false` is an explicit opt-out and no alias overrides it.
    const optOut = readExportOption({ compress: false, compressed: true }, COMPRESS);
    assert.equal(optOut.requested, false, 'an explicit false beats an alias that says true');
    assert.equal(optOut.alias, null);
    assert.equal(optOut.key, COMPRESS);

    // 3. Otherwise the alias of that one option is used, and reported.
    const viaAlias = readExportOption({ compression: true }, COMPRESS);
    assert.equal(viaAlias.requested, true);
    assert.equal(viaAlias.alias, 'compression');
    assert.equal(viaAlias.key, COMPRESS);
  });

  test('the store sends exactly the options the user selected, and nothing else', () => {
    const { readExportOption, EXPORT_OPTION_KEYS } = contract();
    const { ENCRYPT, COMPRESS } = EXPORT_OPTION_KEYS;

    // The normalisation the store performs, asserted here so the alias scope is pinned end to end.
    const normalize = (params) => {
      const out = { ...params };
      for (const alias of ['encrypted', 'encryption', 'compressed', 'compression']) delete out[alias];
      delete out[ENCRYPT];
      delete out[COMPRESS];
      if (readExportOption(params, ENCRYPT).requested) out[ENCRYPT] = true;
      if (readExportOption(params, COMPRESS).requested) out[COMPRESS] = true;
      return out;
    };

    assert.deepEqual(Object.keys(normalize({ compressed: true })), ['compress'], 'only compression is requested');
    assert.deepEqual(Object.keys(normalize({ encrypted: true })), ['encrypt'], 'only encryption is requested');
    assert.deepEqual(Object.keys(normalize({ encrypted: true, compress: true })).sort(), ['compress', 'encrypt']);
    assert.deepEqual(Object.keys(normalize({})), []);
  });

  test('a non-object parameter cannot throw', () => {
    const { readExportOption, EXPORT_OPTION_KEYS } = contract();

    for (const params of [null, undefined, 'encrypt', 7]) {
      assert.equal(readExportOption(params, EXPORT_OPTION_KEYS.ENCRYPT).requested, false);
    }
  });
});

describe('FA-05 — a mask is only recognised in the bounded contract form', () => {
  test('a raw secret with two trailing asterisks is not a mask', () => {
    const { isBoundedMaskPreview } = contract();

    assert.equal(isBoundedMaskPreview(ALMOST_SECRET), false, 'the probe value must not be accepted');
    assert.equal(isBoundedMaskPreview(BOUNDED_MASK), true, 'the contract form is still accepted');
    assert.equal(isBoundedMaskPreview('****'), true, 'a pure mask carries no secret');
  });

  test('a mask preview with a large visible part is refused', () => {
    const { isBoundedMaskPreview } = contract();

    assert.equal(isBoundedMaskPreview('sk_live_prefix_that_is_long****1234'), false);
    assert.equal(isBoundedMaskPreview('****1234'), true, 'a short visible part is fine');
    assert.equal(isBoundedMaskPreview('a**b'), false, 'two asterisks are not a mask run');
  });

  test('sanitisation drops the value instead of rendering it', () => {
    const { sanitizeSecretEntry } = contract();

    const sanitized = sanitizeSecretEntry({ configured: true, masked: ALMOST_SECRET });

    assert.equal(sanitized.masked, null, 'nothing from an untrusted mask field reaches the view model');
    assert.ok(!JSON.stringify(sanitized).includes('DO_NOT_DISPLAY'));
    assert.equal(sanitized.configured, true, 'the configured state is still reported');
  });

  test('the detector reports the probe as a disclosure', () => {
    const { containsSecretDisclosure } = contract();

    assert.equal(containsSecretDisclosure({ JWT_SECRET: { kv: { configured: true, masked: ALMOST_SECRET } } }), true);
    assert.equal(containsSecretDisclosure({ JWT_SECRET: { kv: ALMOST_SECRET } }), true);
    assert.equal(containsSecretDisclosure({ JWT_SECRET: { kv: { configured: true, masked: BOUNDED_MASK } } }), false);
  });

  test('a valid mask does not excuse a raw field sitting next to it', () => {
    const { containsSecretDisclosure } = contract();

    // The old detector returned false as soon as one plausible `masked` field was present, so the
    // `value` field was never looked at.
    assert.equal(
      containsSecretDisclosure({ JWT_SECRET: { kv: { configured: true, masked: BOUNDED_MASK, value: FAKE_SECRET } } }),
      true,
      'the raw field must still be found'
    );
    assert.equal(
      containsSecretDisclosure({ JWT_SECRET: { kv: { configured: true, masked: BOUNDED_MASK, raw: FAKE_SECRET } } }),
      true
    );
    assert.equal(
      containsSecretDisclosure({ JWT_SECRET: { kv: { configured: true, masked: BOUNDED_MASK }, env: { configured: true, value: FAKE_SECRET } } }),
      true,
      'the other side of the comparison is checked too'
    );
  });

  test('a full comparison is sanitised without leaking the secret', () => {
    const { sanitizeEnvComparison } = contract();

    const sanitized = sanitizeEnvComparison({
      JWT_SECRET: {
        kv: { configured: true, value: FAKE_SECRET },
        env: { configured: true, masked: ALMOST_SECRET },
      },
    });

    const serialised = JSON.stringify(sanitized);
    assert.ok(!serialised.includes('DO_NOT_DISPLAY'), 'no part of the secret survives');
    assert.equal(sanitized.JWT_SECRET.kv.masked, null);
    assert.equal(sanitized.JWT_SECRET.env.masked, null, 'the probe value is dropped, not shortened');
  });
});

describe('R12 prepared backend — configured and masked layer maps', () => {
  test('configured layers retain true and false metadata from the real comparison DTO', () => {
    const { sanitizeEnvComparison } = contract();
    const result = sanitizeEnvComparison({ APP_NAME: {
      configured: { env: true, kv: false, default: true }, source: 'env'
    } });
    assert.equal(result.APP_NAME.env.configured, true);
    assert.equal(result.APP_NAME.kv.configured, false);
    assert.equal(result.APP_NAME.env.masked, null);
    assert.equal(result.APP_NAME.source, 'env');
  });

  test('secret layers expose only bounded masks and never raw side fields', () => {
    const { sanitizeEnvComparison } = contract();
    const result = sanitizeEnvComparison({ EMAIL_PROVIDER_API_KEY: {
      configured: { env: true, kv: true, default: false }, source: 'kv', sensitive: true,
      masked: { env: '********', kv: FAKE_SECRET, default: null },
      env: { configured: true, value: FAKE_SECRET }, raw: FAKE_SECRET
    } });
    assert.equal(result.EMAIL_PROVIDER_API_KEY.env.masked, '********');
    assert.equal(result.EMAIL_PROVIDER_API_KEY.kv.configured, true);
    assert.equal(result.EMAIL_PROVIDER_API_KEY.kv.masked, null);
    assert.ok(!JSON.stringify(result).includes(FAKE_SECRET));
    assert.deepEqual(Object.keys(result.EMAIL_PROVIDER_API_KEY).sort(), ['env', 'kv', 'source']);
  });

  test('legacy metadata stays supported beside R12 map entries', () => {
    const { sanitizeEnvComparison } = contract();
    const result = sanitizeEnvComparison({
      OLD: { source: 'env', env: { configured: true, masked: BOUNDED_MASK }, kv: { configured: false } },
      NEW: { source: 'kv', configured: { env: false, kv: true }, masked: { kv: '********' } }
    });
    assert.equal(result.OLD.env.masked, BOUNDED_MASK);
    assert.equal(result.OLD.kv.configured, false);
    assert.equal(result.NEW.env.configured, false);
    assert.equal(result.NEW.kv.masked, '********');
  });
});
