import { APP_FILE_PREFIX, WORKSPACE_FILE_SUFFIX } from './appConfig';

export function workspaceFileName(date: Date, kind: 'export' | 'backup' = 'export'): string {
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  const stem = kind === 'backup' ? `${APP_FILE_PREFIX}-backup-${day}` : `${APP_FILE_PREFIX}-${day}`;
  return `${stem}${WORKSPACE_FILE_SUFFIX}`;
}

/** Starts a browser download of the text. */
export function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
