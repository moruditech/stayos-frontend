// Every key below is confirmed directly in the backend's utils/constants.js
// or, for MULTI_PROPERTY, in owner.service.js#addProperty. Two are
// enforced server-side via checkPlanFeature middleware on their routes;
// the rest gate UI only, which makes getting the exact string right here
// more important, not less — a typo fails silently instead of getting
// caught by a 403.

export const PLAN_FEATURES = {
  UNIVERSITY_MODULE: 'university_module', // enforced server-side (checkPlanFeature)
  OUTBOUND_WEBHOOKS: 'outbound_webhooks', // enforced server-side (checkPlanFeature)
  ADVANCED_REPORTING: 'advanced_reporting', // UI-gate only
  AI_PRICING: 'ai_pricing', // UI-gate only
  WHITE_LABEL: 'white_label', // UI-gate only
  OPEN_API: 'open_api', // UI-gate only
  MULTI_PROPERTY: 'multi_property', // UI-gate only — confirmed in owner.service.js#addProperty, gates the Owner Portal's second-property flow
  // enforced server-side (checkPlanFeature) via AddonSubscription. Fixed:
  // AddonSubscription.model.js's addonKey enum now includes
  // 'restaurant_module', and GET /properties/me (tenants.service.js#getProfile)
  // now calls the same resolveFeatures() checkPlanFeature uses internally,
  // instead of returning raw planId.features — so an active add-on shows up
  // in session.features correctly, same as every other add-on-only feature.
  RESTAURANT_MODULE: 'restaurant_module',
} as const;
export type PlanFeature = (typeof PLAN_FEATURES)[keyof typeof PLAN_FEATURES];

// Add-on module keys — must match AddonSubscription.addonKey enum on the
// backend exactly. Several overlap with PLAN_FEATURES values above (a
// feature can be baked into a plan tier OR sold as a standalone add-on;
// they're the same underlying capability, granted two different ways).
export const ADDON_KEYS = {
  UNIVERSITY_MODULE: 'university_module',
  AI_PRICING:        'ai_pricing',
  WHITE_LABEL:       'white_label',
  EXTRA_STORAGE:     'extra_storage',
  RESTAURANT_MODULE: 'restaurant_module',
} as const;
export type AddonKeyConstant = (typeof ADDON_KEYS)[keyof typeof ADDON_KEYS];

// Suggested starting price (ZAR ex VAT per month) — mirrors ADDON_PRICES in
// stayos-api/src/utils/constants.js exactly. Purely a UI convenience to
// pre-fill the grant form; monthlyPrice is still required explicitly on
// every AddonSubscription row, same as the backend.
export const ADDON_PRICES: Record<AddonKeyConstant, { base: number; note?: string }> = {
  university_module: { base: 399, note: '+ R149/mo per extra 30-bed block' },
  ai_pricing:        { base: 299 },
  white_label:       { base: 599 },
  extra_storage:     { base: 49, note: 'per 10GB block' },
  restaurant_module: { base: 799, note: 'Starting estimate — not yet confirmed in the pricing strategy doc' },
};

// A PlanGate usage is only valid if `feature` is a value the backend
// actually populates into planId.features (session bootstrap). A feature
// key with no corresponding backend value renders PlanGate permanently
// locked for every tenant — silent, not fail-safe.
//
// GET /properties/me (tenants.service.js#getProfile) now resolves
// planId.features through the same resolveFeatures() checkPlanFeature uses
// for route enforcement — add-ons and the agency-mandate substitution both
// correctly reflect in session.features. See @stayos/types session.ts for
// the (now resolved) history of this divergence.
