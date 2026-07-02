import { CalendarCheck, CheckCircle2, Clock3, FolderKanban, Inbox, ListTodo } from "lucide-react";
import { useState } from "react";
import type { DashboardData, WorkItemInput } from "../../types/dashboard";
import { calculateStats, type StatCardKey, type StatRecord } from "../../utils/stats";
import { StatDetailModal } from "./StatDetailModal";

interface StatCardsProps {
  data: DashboardData;
  onOpenRecordDetail: (record: StatRecord) => void;
  onUpdateWork: (id: string, input: WorkItemInput) => void;
}

export function StatCards({ data, onOpenRecordDetail, onUpdateWork }: StatCardsProps) {
  const stats = calculateStats(data);
  const [activeCard, setActiveCard] = useState<StatCardKey | null>(null);
  const cards = [
    { key: "todayRecords", label: "今日记录", value: stats.todayRecords, icon: CalendarCheck, tone: "blue" },
    { key: "weeklyWork", label: "本周工作", value: stats.weeklyWork, icon: Clock3, tone: "green" },
    { key: "weeklyCompleted", label: "本周完成", value: stats.weeklyCompleted, icon: CheckCircle2, tone: "teal" },
    { key: "pendingWork", label: "待处理工作", value: stats.pendingWork, icon: ListTodo, tone: "rose" },
    { key: "activeProjects", label: "进行中项目", value: stats.activeProjects, icon: FolderKanban, tone: "amber" },
    { key: "unorganizedIdeas", label: "待整理内容", value: stats.unorganizedIdeas, icon: Inbox, tone: "slate" },
  ] satisfies Array<{
    key: StatCardKey;
    label: string;
    value: number;
    icon: typeof CalendarCheck;
    tone: string;
  }>;
  const activeConfig = activeCard ? cards.find((card) => card.key === activeCard) : null;

  return (
    <>
      <section className="stat-grid" aria-label="数据概览">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button className={`stat-card ${card.tone}`} type="button" key={card.key} onClick={() => setActiveCard(card.key)}>
              <span className="stat-title">{card.label}</span>
              <span className="stat-main">
                <span className="stat-icon">
                  <Icon size={19} />
                </span>
                <strong>{card.value}</strong>
              </span>
            </button>
          );
        })}
      </section>
      {activeCard && activeConfig && (
        <StatDetailModal
          title={activeConfig.label}
          sections={stats.details[activeCard]}
          workItems={data.workItems}
          onUpdateWork={onUpdateWork}
          onClose={() => setActiveCard(null)}
          onOpenRecord={(record) => {
            onOpenRecordDetail(record);
            setActiveCard(null);
          }}
        />
      )}
    </>
  );
}
