import { changelogEntries } from "../../data/changelog";

export function ChangelogPanel() {
  const groupedEntries = groupChangelogByDate();

  return (
    <section className="panel changelog-panel">
      <div className="section-head">
        <h3>更新日志</h3>
      </div>
      <div className="changelog-timeline">
        {groupedEntries.map((group) => (
          <section className="changelog-date-group" key={group.date}>
            <div className="changelog-date-head">
              <time>{group.date}</time>
              <span>{group.entries.length} 项更新</span>
            </div>
            <div className="changelog-date-items">
              {group.entries.map((entry, index) => (
                <article className="changelog-item" key={`${entry.date}-${entry.title}`}>
                  <span className="changelog-node" aria-hidden="true" />
                  <div className="changelog-item-body">
                    <div className="changelog-item-title">
                      <strong>{index + 1}</strong>
                      <h4>{entry.title}</h4>
                      <span className={`changelog-type ${entry.type}`}>{entry.type}</span>
                    </div>
                    <p>{entry.summary}</p>
                    <div className="changelog-meta">
                      <span>{entry.modules.join(" / ")}</span>
                      <span>{entry.status}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function groupChangelogByDate() {
  const groups = new Map<string, typeof changelogEntries>();
  [...changelogEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((entry) => {
      groups.set(entry.date, [...(groups.get(entry.date) || []), entry]);
    });

  return Array.from(groups, ([date, entries]) => ({ date, entries }));
}
