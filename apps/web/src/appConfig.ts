import pkg from '../package.json';

/** App name, kept in one place so renaming stays cheap. */
export const APP_NAME = 'Valiva';
export const APP_VERSION: string = pkg.version;
/** Identifies workspace files of this app; changing it makes older files unreadable. */
export const WORKSPACE_FORMAT = 'valiva-workspace';
export const WORKSPACE_FILE_SUFFIX = '.workspace.json';
export const APP_FILE_PREFIX = APP_NAME.toLowerCase();
