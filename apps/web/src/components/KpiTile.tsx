export function KpiTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card kpi">
      <span className="kpi-label">{label}</span>
      <b className="kpi-value">{value}</b>
      {note && <span className="kpi-label">{note}</span>}
    </div>
  );
}
