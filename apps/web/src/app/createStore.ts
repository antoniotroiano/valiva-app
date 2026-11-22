import { APP_VERSION, WORKSPACE_FORMAT } from './appConfig';
import { de } from '../i18n/de';
import { CURRENT_YEAR, defaultGlobalAssumptions } from '../state/useHousehold';
import { BrowserWorkspaceStore } from '../state/workspaceStore';

export function createStore(): BrowserWorkspaceStore {
  return new BrowserWorkspaceStore({
    storage: localStorage,
    currentYear: CURRENT_YEAR,
    format: WORKSPACE_FORMAT,
    appVersion: APP_VERSION,
    defaults: defaultGlobalAssumptions(),
    defaultPersonName: de.household.firstPersonName,
  });
}
