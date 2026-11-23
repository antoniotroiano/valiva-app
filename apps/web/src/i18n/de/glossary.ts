export const glossary = {
  title: 'Begriffe',
  rowTitle: 'Fachbegriffe erklärt',
  termCount: (count: number) => `${count} Begriffe`,
  intro:
    'Fachbegriffe, die in der App vorkommen. Im Text sind sie gestrichelt unterstrichen; die Erklärung erscheint beim Darüberfahren oder Fokussieren.',
  terms: {
    KVdR: 'Krankenversicherung der Rentner: Pflichtversicherung für die meisten Rentner. Beiträge fallen auf gesetzliche Rente und Betriebsrente an, nicht auf Kapitalerträge aus ETFs.',
    bAV: 'Betriebliche Altersvorsorge: Vorsorge über den Arbeitgeber, meist per Entgeltumwandlung.',
    Entgeltumwandlung:
      'Du verzichtest auf einen Teil des Bruttolohns, der Betrag fließt in die betriebliche Altersvorsorge. Das spart Steuern und Sozialabgaben, mindert aber die gesetzliche Rente etwas.',
    Teilfreistellung:
      'Bei Aktienfonds bleibt ein gesetzlich festgelegter Teil der Erträge steuerfrei. Der Satz steht auf der Seite „Annahmen“.',
    Vorabpauschale:
      'Pauschal angenommener Ertrag, der bei thesaurierenden Fonds jährlich vorab versteuert wird. In der App nur, wenn du sie im ETF-Sparplan einschaltest (Standard: aus).',
    Besteuerungsanteil:
      'Der Teil der gesetzlichen Rente, der versteuert werden muss. Er hängt vom Jahr des Rentenbeginns ab und steigt für neue Rentenjahrgänge.',
    Zugangsfaktor:
      'Faktor, der die gesetzliche Rente bei frühem Beginn mindert (Abschlag) oder bei spätem Beginn erhöht (Zuschlag).',
    'Glide Path':
      'Schrittweise Umschichtung in sicherere Anlagen kurz vor dem Rentenbeginn. In der App nicht berechnet.',
  } as Record<string, string>,
} as const;
