export const API_ERROR_CODES = {
  REAUTH_REQUIRED: 'REAUTH_REQUIRED',
  REFRESH_ALREADY_ROTATED: 'REFRESH_ALREADY_ROTATED',
  DB_UNAVAILABLE: 'DB_UNAVAILABLE',
  UNSUPPORTED_EXPORT_OPTION: 'UNSUPPORTED_EXPORT_OPTION',
  UNSUPPORTED_MONITORING_MODE: 'UNSUPPORTED_MONITORING_MODE'
};

export const UNSUPPORTED_STATUS = 422;

export const CAPABILITY_KEYS = {
  EXPORT_JSON: 'exportJson',
  EXPORT_CSV: 'exportCsv',
  EXPORT_PDF: 'exportPdf',
  EXPORT_EXCEL: 'exportExcel',
  EXPORT_ENCRYPTION: 'exportEncryption',
  EXPORT_COMPRESSION: 'exportCompression',
  CONTINUOUS_MONITORING: 'continuousMonitoring'
};

export const UNSUPPORTED_ERROR_CODES = [
  API_ERROR_CODES.UNSUPPORTED_EXPORT_OPTION,
  API_ERROR_CODES.UNSUPPORTED_MONITORING_MODE
];

export const VERIFIED_EXPORT_FORMATS = ['json', 'csv'];

/**
 * Canonical request option names for the export endpoint.
 *
 * The baseline backend service (`src/services/auditExportService`) reads `encrypt`/`compress`.
 * `encrypted`/`compressed` are the names this frontend had been sending, and a gate that only
 * checked the latter let an unsupported option through unverified (review OF-07). Only the
 * canonical names are accepted now; an alias is rejected here instead of being normalised into a
 * request the backend would not recognise. This is recorded as an assumption in
 * FRONTEND-CONTRACT-ASSUMPTIONS.vi.md until the backend contract manifest confirms it.
 */
export const EXPORT_OPTION_KEYS = Object.freeze({
  ENCRYPT: 'encrypt',
  COMPRESS: 'compress'
});

/**
 * Every spelling this frontend has ever sent, **scoped to the option it actually aliases**.
 *
 * A single shared list made `{compressed: true}` look like a request for `encrypt` as well, so the
 * UI could ask the backend for a capability that was never selected (review FA-04).
 */
export const EXPORT_OPTION_ALIASES = Object.freeze({
  [EXPORT_OPTION_KEYS.ENCRYPT]: Object.freeze(['encrypted', 'encryption']),
  [EXPORT_OPTION_KEYS.COMPRESS]: Object.freeze(['compressed', 'compression'])
});

export const REJECTED_EXPORT_OPTION_ALIASES = Object.freeze(
  Object.values(EXPORT_OPTION_ALIASES).flat()
);

export const isRequestedExportOption = (value) => value === true;

/**
 * Reads a boolean request option for one canonical key and reports which spelling was used.
 *
 * Aliases are only consulted for the key they alias, so an encryption request can never be read
 * from a compression option and vice versa.
 *
 * Precedence, in this order, so a caller never has to guess which of two conflicting spellings
 * wins:
 * 1. the canonical key set to `true` — the alias is ignored;
 * 2. the canonical key set to `false` — an explicit opt-out is a decision and no alias overrides it;
 * 3. the first alias of *this* option set to `true`.
 *
 * @returns {{requested: boolean, alias: string|null, key: string}}
 */
export function readExportOption(params, canonicalKey) {
  const source = params && typeof params === 'object' ? params : {};

  if (isRequestedExportOption(source[canonicalKey])) {
    return { requested: true, alias: null, key: canonicalKey };
  }

  if (source[canonicalKey] === false) {
    return { requested: false, alias: null, key: canonicalKey };
  }

  for (const alias of EXPORT_OPTION_ALIASES[canonicalKey] || []) {
    if (isRequestedExportOption(source[alias])) {
      return { requested: true, alias, key: canonicalKey };
    }
  }

  return { requested: false, alias: null, key: canonicalKey };
}

const CAPABILITY_PATHS = [
  'capabilities',
  'data.capabilities',
  'data.data.capabilities',
  'payload.capabilities',
  'data.payload.capabilities'
];

const CAPABILITY_REVISION_PATHS = [
  'contractRevision',
  'contract_revision',
  'data.contractRevision',
  'data.contract_revision',
  'capabilities.contractRevision',
  'capabilities.revision'
];

const ERROR_CODE_PATHS = [
  'code',
  'errorCode',
  'data.code',
  'data.errorCode',
  'data.error.code',
  'error.code',
  'data.data.code',
  'data.data.error.code'
];

export const readJsonPath = (payload, path) => {
  if (!payload || typeof payload !== 'object') return undefined;

  return String(path)
    .split('.')
    .reduce((value, segment) => {
      if (value === null || value === undefined) return undefined;
      if (typeof value !== 'object') return undefined;
      return value[segment];
    }, payload);
};

export const readCapabilityMap = (payload) => {
  for (const path of CAPABILITY_PATHS) {
    const value = readJsonPath(payload, path);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }

  return null;
};

export const mergeCapabilityMap = (current, payload) => {
  const incoming = readCapabilityMap(payload);
  if (!incoming) return current || null;

  return { ...(current && typeof current === 'object' ? current : {}), ...incoming };
};

export const readCapability = (capabilityMap, key) => {
  if (!capabilityMap || typeof capabilityMap !== 'object') return null;

  const value = readJsonPath(capabilityMap, key);
  return typeof value === 'boolean' ? value : null;
};

export const isCapabilitySupported = (capabilityMap, key) => readCapability(capabilityMap, key) === true;

/**
 * Reads the contract revision advertised alongside the capability map. When the backend publishes
 * one, the capability map is only reused for the revision it was fetched for.
 */
export const readContractRevision = (payload) => {
  for (const path of CAPABILITY_REVISION_PATHS) {
    const value = readJsonPath(payload, path);
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }

  return null;
};

/**
 * Keys a capability map by the session context it belongs to.
 *
 * The capability map is server state, so it is only valid for the API identity and the
 * user/session it was fetched for. A flat map survived a sign-out and a later sign-in, which let
 * the next user inherit a previous user's or a previous server's answers (review OF-08).
 */
export const buildCapabilityContextKey = ({ identity, sessionId, revision } = {}) => {
  const scope = [identity || '', sessionId || ''].join('|');

  // A scope is what a cached answer is compared against, so it must not carry a revision: the
  // revision is recorded next to it and re-verified separately.
  return revision ? `${scope}|${revision}` : scope;
};

export const isCapabilityContextCurrent = (capabilityContextKey, currentKey) =>
  !!capabilityContextKey && capabilityContextKey === currentKey;

const errorPayloadOf = (source) => {
  if (!source || typeof source !== 'object') return null;
  if (source.response && typeof source.response === 'object') return source.response.data || null;
  if (source.data !== undefined) return source.data || null;
  return source;
};

export const readErrorCode = (source) => {
  const payload = errorPayloadOf(source);
  if (!payload || typeof payload !== 'object') return null;

  for (const path of ERROR_CODE_PATHS) {
    const value = readJsonPath(payload, path);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
};

export const readErrorStatus = (source) => {
  const status = source?.response?.status ?? source?.status;
  return Number.isInteger(status) ? status : null;
};

export const isUnsupportedError = (source) => {
  const code = readErrorCode(source);
  if (code && UNSUPPORTED_ERROR_CODES.includes(code)) return true;

  return readErrorStatus(source) === UNSUPPORTED_STATUS;
};

export const createUnsupportedError = (code, details = {}) => {
  const error = new Error(details.reason || code);

  error.code = code;
  error.isUnsupported = true;
  error.capability = details.capability || null;
  error.format = details.format || null;

  if (Number.isInteger(details.status)) error.status = details.status;
  if (details.cause) error.cause = details.cause;

  return error;
};

export const describeUnsupportedCapability = (capabilityMap, key) => {
  const state = readCapability(capabilityMap, key);
  if (state === false) return 'disabled';
  if (state === true) return null;
  return 'unconfirmed';
};

/**
 * What the client is willing to call "a mask".
 *
 * A few asterisks anywhere are **not** proof that a string is a mask: the probe used for review
 * FA-05 was a full fake secret with two trailing `*`, which the old `MASKED_PATTERN` accepted and
 * then rendered. A preview is therefore only accepted when the whole string looks like the
 * contract's bounded form: short overall, a real run of at least three mask characters, and only a
 * small, split visible part. Recorded as an assumption in FRONTEND-CONTRACT-ASSUMPTIONS.vi.md.
 */
const MASK_CHARACTER = /[*•·]/;
const MASK_RUN_PATTERN = /[*•·]{3,}/;
const MASK_FIELD_NAMES = ['masked', 'maskedValue', 'display'];
const BOOLEAN_FLAG_FIELDS = ['configured', 'configuredFlag', 'hasValue', 'exists'];
const SAFE_SECRET_FIELDS = [...BOOLEAN_FLAG_FIELDS, ...MASK_FIELD_NAMES, 'source'];

/** The longest string that may still be shown as a mask preview. */
export const MAX_MASK_PREVIEW_LENGTH = 24;
/** The longest uninterrupted run of visible characters a preview may contain. */
export const MAX_MASK_VISIBLE_RUN = 8;
/** The total number of visible characters a preview may contain. */
export const MAX_MASK_VISIBLE_TOTAL = 12;

/**
 * Whether `value` is a bounded mask preview rather than arbitrary text.
 *
 * @param {*} value
 * @returns {boolean}
 */
export const isBoundedMaskPreview = (value) => {
  if (typeof value !== 'string') return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  // A string made only of mask characters carries no secret at all, whatever its length.
  if ([...trimmed].every((character) => MASK_CHARACTER.test(character))) return true;

  if (trimmed.length > MAX_MASK_PREVIEW_LENGTH) return false;
  if (!MASK_RUN_PATTERN.test(trimmed)) return false;

  const visibleParts = trimmed.split(/[*•·]+/).filter((part) => part.length > 0);
  if (visibleParts.some((part) => part.length > MAX_MASK_VISIBLE_RUN)) return false;

  return visibleParts.reduce((total, part) => total + part.length, 0) <= MAX_MASK_VISIBLE_TOTAL;
};

/** A non-empty string that is not a mask preview: raw material, and therefore a disclosure. */
const isRawSecretText = (value) => typeof value === 'string'
  && value.trim() !== ''
  && !isBoundedMaskPreview(value);

const toBooleanOrNull = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
};

const toMaskedText = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Anything that is not a bounded preview is dropped rather than shortened: a client-side ellipsis
  // of a raw secret would still have put part of it on screen and into the DOM.
  return isBoundedMaskPreview(trimmed) ? trimmed : null;
};

export const sanitizeSecretEntry = (entry) => {
  if (entry === null || entry === undefined) {
    return { configured: null, masked: null };
  }

  if (typeof entry !== 'object' || Array.isArray(entry)) {
    return { configured: entry !== '', masked: null };
  }

  const configured = toBooleanOrNull(entry.configured ?? entry.configuredFlag ?? entry.hasValue ?? entry.exists);
  const masked = toMaskedText(entry.masked ?? entry.maskedValue ?? entry.display);
  const hasDisclosure = Object.keys(entry).some((key) => !SAFE_SECRET_FIELDS.includes(key));
  const sanitized = {
    configured: configured ?? (hasDisclosure ? true : null),
    masked: masked ?? null
  };

  if (typeof entry.source === 'string' && entry.source) sanitized.source = entry.source;

  return sanitized;
};

/**
 * True when the payload discloses secret material. Any secret field is considered already
 * disclosed: an unmasked value in a log, a DOM node or a browser test report is a finding on its
 * own, whatever the render path happens to redact (review OF-09).
 */
export const containsSecretDisclosure = (comparison) => {
  if (!comparison || typeof comparison !== 'object' || Array.isArray(comparison)) return false;

  return Object.keys(comparison).some((key) => {
    const entry = comparison[key];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;

    return ['kv', 'env'].some((side) => {
      const value = entry[side];

      if (typeof value === 'string') {
        return isRawSecretText(value);
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Every field is checked. An object is not cleared just because it carries one plausible
        // mask: the old early return let `value`/`raw`/`secret` sit next to a valid `masked` field
        // and report "no disclosure" (review FA-05).
        return Object.keys(value).some((field) => {
          const fieldValue = value[field];

          if (BOOLEAN_FLAG_FIELDS.includes(field) || field === 'source') {
            // A boolean flag may arrive as a string; anything else there is raw material.
            if (typeof fieldValue === 'string') return isRawSecretText(fieldValue);
            return false;
          }

          if (MASK_FIELD_NAMES.includes(field)) {
            // A mask field only clears the entry when its value really is a bounded preview.
            return typeof fieldValue === 'string' && fieldValue.trim() !== '' && !isBoundedMaskPreview(fieldValue);
          }

          return isRawSecretText(fieldValue);
        });
      }

      return false;
    });
  });
};

export const sanitizeEnvComparison = (comparison) => {
  if (!comparison || typeof comparison !== 'object' || Array.isArray(comparison)) return {};

  return Object.keys(comparison).reduce((result, key) => {
    const entry = comparison[key];
    const source = entry && typeof entry === 'object' && !Array.isArray(entry) && typeof entry.source === 'string'
      ? entry.source
      : undefined;

    // R12 returns layer maps; older backends return nested env/kv metadata.
    const hasLayerMap = entry?.configured && typeof entry.configured === 'object'
      && !Array.isArray(entry.configured);
    const layer = (side) => hasLayerMap
      ? { configured: entry.configured[side], masked: entry.masked?.[side] }
      : entry?.[side];

    result[key] = {
      source: source || null,
      kv: sanitizeSecretEntry(layer('kv')),
      env: sanitizeSecretEntry(layer('env'))
    };

    return result;
  }, {});
};
