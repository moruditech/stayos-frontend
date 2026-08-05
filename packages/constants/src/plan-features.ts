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
} as const;
export type PlanFeature = (typeof PLAN_FEATURES)[keyof typeof PLAN_FEATURES];

// A PlanGate usage is only valid if `feature` is a value the backend
// actually populates into planId.features (session bootstrap). A feature
// key with no corresponding backend value renders PlanGate permanently
// locked for every tenant — silent, not fail-safe.
//
// Also see the divergence note in @stayos/types session.ts:
// planId.features from GET /properties/me can disagree with what
// checkPlanFeature actually enforces server-side while a property is
// under an active mandate. PlanGate correctness is not guaranteed in
// that state until the backend fix lands.
