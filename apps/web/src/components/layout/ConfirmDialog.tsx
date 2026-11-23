import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

/** Modal dialog; the native element traps focus and closes on Esc. Focus starts on the element marked `data-autofocus` (the safe action). */
export function ConfirmDialog({
  open,
  title,
  onClose,
  children,
  actions,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // React's `autoFocus` runs while the dialog is still closed, so the safe action is marked instead.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} onClose={onClose}>
      <h2 id={titleId}>{title}</h2>
      {children}
      <div className="actions">{actions}</div>
    </dialog>
  );
}
