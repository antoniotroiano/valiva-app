import { de } from '../../i18n/de';
import type { InputStatus } from '../../lib/inputStatus';
import { Icon, type IconName } from './Icon';

const ICON: Record<InputStatus, IconName> = { empty: 'open', done: 'ok', hint: 'warn' };

/**
 * Status mark of an input page: three shapes (dashed circle, check, triangle), never colour alone. The sidebar
 * shows the mark only, the phone sheet adds the word. Screen readers get the status as text after the page name
 * (the visible word would be read twice, so it is hidden from them).
 */
export function NavStatus({ status, withWord }: { status?: InputStatus; withWord?: boolean }) {
  if (!status) return null;
  return (
    <span className={`st ${status}${withWord ? ' wd' : ''}`}>
      <Icon name={ICON[status]} size="sm" />
      {withWord && (
        <span className="st-w" aria-hidden="true">
          {de.guidance.status[status]}
        </span>
      )}
      <span className="sr-only">, {de.guidance.statusSr[status]}</span>
    </span>
  );
}
