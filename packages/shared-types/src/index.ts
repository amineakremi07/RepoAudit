/**
 * @repoaudit/shared-types
 * Single source of truth for data contracts between web, api, scanner and ai-advisor.
 * Changing a schema here is a cross-team change: the Lead and the affected domain owner review (see .github/CODEOWNERS).
 */
export * from "./severity";
export * from "./repository";
export * from "./scan";
export * from "./finding";
export * from "./remediation";
