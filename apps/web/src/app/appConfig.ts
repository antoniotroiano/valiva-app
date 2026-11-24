/** App name, kept in one place so renaming stays cheap. */
export const APP_NAME = 'Valiva';
/** Version of the root package.json, injected at build time (Vite `define`), informational only. */
export const APP_VERSION: string = __APP_VERSION__;
/** Identifies workspace files of this app; changing it makes older files unreadable. */
export const WORKSPACE_FORMAT = 'valiva-workspace';
export const WORKSPACE_FILE_SUFFIX = '.workspace.json';
export const APP_FILE_PREFIX = APP_NAME.toLowerCase();
