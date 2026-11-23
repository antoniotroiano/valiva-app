import { de } from '../../i18n/de';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * "Really remove?" dialog for deleting a person, goal or entry. Focus starts on "Abbrechen" (the safe
 * action), Escape cancels. Replaces the native `window.confirm`, which looks different on every browser.
 */
export function ConfirmRemove({
  open,
  title,
  text,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn" data-autofocus onClick={onClose}>
            {de.cancel}
          </button>
        </>
      }
    >
      <p>{text}</p>
    </ConfirmDialog>
  );
}
