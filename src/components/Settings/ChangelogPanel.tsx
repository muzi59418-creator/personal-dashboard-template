import { useRef } from "react";
import { changelogEntries } from "../../data/changelog";

export function ChangelogPanel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupedEntries = groupChangelogByDate();
  const hasHiddenHistory = groupedEntries.length > 2;

  return (
    <section className="panel changelog-panel">
      <div className="section-head">
        <h3>更新日志</h3>
      </div>
      <div className="changelog-scroll-shell" ref={scrollRef}>
        <div className="changelog-list">
          {groupedEntries.map((group) => (
            <section className="changelog-date-group" key={group.date}>
              <div className="changelog-date-head">
                <time>{group.date}</time>
                <span>｜{group.entries.length} 项更新</span>
              </div>
              <div className="changelog-date-items">
                {group.entries.map((entry, index) => (
                  <article className="changelog-item" key={`${entry.date}-${entry.title}-${index}`}>
                    <div className="changelog-item-body">
                      <div className="changelog-item-title">
                        <span className="changelog-version-badge">{getEntryVersion(entry.title)}</span>
                        <h4>{getEntryTitle(entry.title)}</h4>
                        <span className={`changelog-type ${entry.type}`}>{entry.type}</span>
                      </div>
                      <p>{entry.summary}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      {hasHiddenHistory && (
        <button className="secondary-button compact-button changelog-more-button" type="button" onClick={() => scrollRef.current?.scrollBy({ top: 360, behavior: "smooth" })}>
          查看更多更新
        </button>
      )}
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

function getEntryVersion(title: string): string {
  return title.match(/^v\d+\.\d+\.\d+/)?.[0] || "更新";
}

function getEntryTitle(title: string): string {
  return title.replace(/^v\d+\.\d+\.\d+\s*/, "");
}
