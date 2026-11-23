export const household = {
  firstPersonName: 'Person 1',
  title: 'Haushalt',
  subtitle:
    'Personen des Haushalts verwalten. Jede Person hat eigene Einkommensquellen und Sparziele.',
  personsTitle: 'Personen',
  nameLabel: (n: number) => `Name von Person ${n}`,
  nameRequired: 'Bitte einen Namen eingeben.',
  active: 'aktiv',
  show: (name: string) => `${name} anzeigen`,
  add: 'Person hinzufügen',
  newPersonName: (n: number) => `Person ${n}`,
  remove: (name: string) => `${name} entfernen`,
  removeConfirm: (name: string) =>
    `${name} samt allen Einkommensquellen und Sparzielen dieser Person löschen? Das kann nicht rückgängig gemacht werden.`,
  sharedTitle: 'Gemeinsame Werte',
  sharedText:
    'Das Wunscheinkommen sowie Inflation, Renditeszenarien, Rentenanpassung und Entnahmerendite gelten für den ganzen Haushalt. Geburtsjahr, Rentenalter, Steuersatz im Ruhestand, Grenzsteuersatz, Sozialabgaben und Krankenversicherung gelten je Person.',
  sharedNote:
    'Wunscheinkommen, Inflation, Renditeszenarien, Rentenanpassung und Entnahmerendite gelten für den ganzen Haushalt, alles andere nur für die aktive Person.',
  openProfile: 'Zum Profil der aktiven Person',
  wishTitle: 'Wunscheinkommen',
  wishLabel: 'Wunscheinkommen im Ruhestand (Haushalt)',
  wishHint:
    'Monatliches Netto für den ganzen Haushalt in Kaufkraft von heute. Gilt ab dem Jahr, in dem die erste Person in Rente geht, solange mindestens eine Person lebt.',
  survivor: {
    title: 'Nach dem ersten Todesfall',
    intro:
      'Der Todesfall wird mit der Lebenserwartung der Personen angenommen. Die Einstellungen gelten nur für Haushalte mit genau zwei Personen.',
    needsTwo: 'Gilt nur für Haushalte mit genau zwei Personen.',
    enable:
      'Hinterbliebenenrente der gesetzlichen Rente berücksichtigen (Ehe oder eingetragene Lebenspartnerschaft)',
    lawLegend: 'Rechtslage',
    lawNew: 'Ehe ab 2002: 55 % der Rente des Verstorbenen',
    lawOld: 'Ehe vor 2002 und ein Partner vor 1962 geboren: 60 %',
    wishLabel: 'Wunscheinkommen nach dem ersten Todesfall (in % des bisherigen Wunsches)',
    wishUnit: '%',
    wishHint:
      'Ein Haushalt mit einer Person braucht meist weniger. 100 % heißt: keine Kürzung. Zulässig sind 10 bis 100 %.',
    creditNote:
      'Die Witwenrente wird auf das eigene Einkommen angerechnet: 40 % des Betrags über dem Freibetrag. Kapitalentnahmen aus dem ETF zählen dabei nicht. Die genauen Werte stehen auf der Seite „Annahmen“.',
  },
} as const;
