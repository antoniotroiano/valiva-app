import { useState } from 'react';
import { de } from '../i18n/de';
import { dismissLocalNotice, isLocalNoticeDismissed } from '../onboarding';

/** One-time hint once the user has entered data and never exported (data only lives in this browser). */
export function LocalDataNotice({
  neverExported,
  goToData,
}: {
  neverExported: boolean;
  goToData: () => void;
}) {
  const t = de.overview.localNotice;
  const [hidden, setHidden] = useState(isLocalNoticeDismissed);
  if (hidden || !neverExported) return null;
  return (
    <div className="notice info" role="note">
      <b>{t.text}</b>{' '}
      <button type="button" className="link" onClick={goToData}>
        {t.export}
      </button>{' '}
      <button
        type="button"
        className="link"
        onClick={() => {
          dismissLocalNotice();
          setHidden(true);
        }}
      >
        {t.dismiss}
      </button>
    </div>
  );
}
