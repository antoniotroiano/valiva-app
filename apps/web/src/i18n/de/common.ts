import { APP_NAME } from '../../app/appConfig';

export const common = {
  appName: APP_NAME,
  badge: 'Prognose, keine Garantie',
  printHeader: (title: string, date: string) => `${APP_NAME} – ${title}, Stand ${date}`,
  disclaimer: 'Keine Anlage- oder Steuerberatung. Prognosen sind keine Garantie.',
} as const;
