import { useMemo, useState } from "react";
import type { WorkItem } from "../../types/dashboard";
import { todayInputValue } from "../../utils/date";

type RangeKey = "today" | "seven" | "thirty";

const ranges: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: "today", label: "今日", days: 1 },
  { key: "seven", label: "近7日", days: 7 },
  { key: "thirty", label: "近30日", days: 30 },
];

interface WorkCompletionOverviewProps {
  items: WorkItem[];
}

export function WorkCompletionOverview({ items }: WorkCompletionOverviewProps) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("today");
  const selectedRange = ranges.find((range) => range.key === rangeKey) || ranges[0];
  const stats = useMemo(() => getWorkCompletionStats(items, selectedRange.days), [items, selectedRange.days]);
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const chartBackground = makeChartBackground(stats);

  return (
    <section className="panel dashboard-equal-panel work-completion-overview">
      <div className="section-head work-completion-head">
        <div>
          <h2>工作完成概览</h2>
        </div>
        <div className="segmented-control compact-segmented-control" role="tablist" aria-label="工作完成概览时间范围">
          {ranges.map((range) => (
            <button
              className={range.key === rangeKey ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={range.key === rangeKey}
              key={range.key}
              onClick={() => setRangeKey(range.key)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="completion-chart-wrap">
        <div className={`completion-donut ${stats.total === 0 ? "empty" : ""}`} style={{ background: chartBackground }} aria-label={`完成率 ${completionRate}%`}>
          <div className="completion-donut-center">
            <strong>{completionRate}%</strong>
            <span>完成率</span>
          </div>
        </div>
        {stats.total === 0 && <p className="completion-empty-text">暂无工作数据</p>}
      </div>

      <div className="completion-stat-grid">
        <CompletionStat label="总工作" value={stats.total} />
        <CompletionStat label="已完成" value={stats.completed} tone="completed" />
        <CompletionStat label="进行中" value={stats.active} tone="active" />
        <CompletionStat label="待处理" value={stats.pending} tone="pending" />
      </div>
    </section>
  );
}

function CompletionStat({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className={`completion-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getWorkCompletionStats(items: WorkItem[], days: number) {
  const today = todayInputValue();
  const start = shiftLocalDate(today, -(days - 1));
  const scopedItems = items.filter((item) => item.date >= start && item.date <= today);
  const completed = scopedItems.filter((item) => item.status === "已完成").length;
  const active = scopedItems.filter((item) => item.status === "进行中").length;
  const pending = scopedItems.filter((item) => item.status === "待处理").length;

  return {
    total: scopedItems.length,
    completed,
    active,
    pending,
    other: Math.max(0, scopedItems.length - completed - active - pending),
  };
}

function makeChartBackground(stats: ReturnType<typeof getWorkCompletionStats>) {
  if (stats.total === 0) return "#e2e8f0";

  const completedEnd = (stats.completed / stats.total) * 100;
  const activeEnd = completedEnd + (stats.active / stats.total) * 100;
  const pendingEnd = activeEnd + (stats.pending / stats.total) * 100;

  return `conic-gradient(
    #14b8a6 0% ${completedEnd}%,
    #2563eb ${completedEnd}% ${activeEnd}%,
    #f59e0b ${activeEnd}% ${pendingEnd}%,
    #94a3b8 ${pendingEnd}% 100%
  )`;
}

function shiftLocalDate(value: string, offsetDays: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offsetDays);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}
