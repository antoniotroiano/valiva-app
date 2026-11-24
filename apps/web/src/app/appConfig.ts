/**
 * Build channel, injected by Vite `define`: the beta build (`VALIVA_CHANNEL=beta`, published to the beta repo)
 * uses its own storage prefix, so it never reads or writes the data of the released app on the same origin.
 */
export const IS_BETA: boolean = __IS_BETA__;
/** Prefix of every `localStorage` key of this build: `valiva.` (release) or `valiva-beta.` (beta). */
export const STORAGE_PREFIX: string = __STORAGE_PREFIX__;

/** App name, kept in one place so renaming stays cheap. */
const BASE_NAME = 'Valiva';
export const APP_NAME = IS_BETA ? `${BASE_NAME} Beta` : BASE_NAME;
/** Version of the root package.json, injected at build time (Vite `define`), informational only. */
export const APP_VERSION: string = __APP_VERSION__;
/** Identifies workspace files of this app; changing it makes older files unreadable. */
export const WORKSPACE_FORMAT = 'valiva-workspace';
export const WORKSPACE_FILE_SUFFIX = '.workspace.json';
export const APP_FILE_PREFIX = IS_BETA
  ? `${BASE_NAME.toLowerCase()}-beta`
  : BASE_NAME.toLowerCase();
