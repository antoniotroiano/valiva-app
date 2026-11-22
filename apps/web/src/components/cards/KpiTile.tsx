export function KpiTile({
  label,
  value,
  note,
  hero = false,
}: {
  label: string;
  value: string;
  note?: string;
  /** The one main figure of a page: larger number on a raised card. */
  hero?: boolean;
}) {
  return (
    <div className={hero ? 'card kpi kpi-hero' : 'card kpi'}>
      <span className="kpi-label">{label}</span>
      <b className="kpi-value">{value}</b>
      {note && <span className="kpi-label">{note}</span>}
    </div>
  );
}
