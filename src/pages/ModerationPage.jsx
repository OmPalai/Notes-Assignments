export default function ModerationPage({ reports, onResolveReport }) {
  return (
    <section>
      <h2>Admin moderation queue</h2>
      <div className="stack">
        {reports.length === 0 && <p className="empty">No open reports.</p>}
        {reports.map((report) => (
          <article className="card" key={report.report_id}>
            <div className="card-head">
              <div>
                <p className="eyebrow">Reported by {report.reporter}</p>
                <h3>{report.title}</h3>
              </div>
              <span className="pill warn">Open</span>
            </div>
            <p>{report.reason}</p>
            <div className="actions">
              <button onClick={() => onResolveReport(report.report_id, 'take_down')}>Take Down</button>
              <button className="secondary" onClick={() => onResolveReport(report.report_id, 'dismiss')}>Dismiss</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
