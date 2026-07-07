import { ChevronDown } from "lucide-react";
import type { WorkItem, WorkItemInput, WorkStatus } from "../../types/dashboard";
import { WORK_STATUSES } from "../../types/dashboard";

interface WorkStatusSelectProps {
  item: WorkItem;
  onUpdate: (id: string, input: WorkItemInput) => void;
}

export function WorkStatusSelect({ item, onUpdate }: WorkStatusSelectProps) {
  function updateStatus(status: WorkStatus) {
    if (status === item.status) return;
    onUpdate(item.id, toWorkItemInput(item, status));
  }

  return (
    <span
      className="chip status status-select-shell"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <select
        className="status-select-control"
        value={item.status}
        aria-label={`修改 ${item.title} 的状态`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onChange={(event) => {
          event.stopPropagation();
          updateStatus(event.target.value as WorkStatus);
        }}
      >
        {WORK_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </span>
  );
}

function toWorkItemInput(item: WorkItem, status: WorkStatus): WorkItemInput {
  return {
    title: item.title,
    categoryId: item.categoryId,
    status,
    content: item.content,
    date: item.date,
    plannedDate: item.plannedDate || "",
    projectId: item.projectId,
    linkedProjectIds: item.linkedProjectIds,
    sourceTemplateId: item.sourceTemplateId,
    sourceTemplateType: item.sourceTemplateType,
    sourceTemplateName: item.sourceTemplateName,
    sourceProjectType: item.sourceProjectType,
    sourceProjectId: item.sourceProjectId,
    sourceProjectProgressItemId: item.sourceProjectProgressItemId,
    sourceProjectProgressItemName: item.sourceProjectProgressItemName,
    routineRuleId: item.routineRuleId,
    routineOriginalDate: item.routineOriginalDate,
    routineActualDate: item.routineActualDate,
    routineHolidayPostponed: item.routineHolidayPostponed,
    routineManualPostponed: item.routineManualPostponed,
    routineSkipped: status === "已跳过" ? true : item.routineSkipped,
    routineSkippedAt: status === "已跳过" ? item.routineSkippedAt || new Date().toISOString().slice(0, 10) : item.routineSkippedAt,
    routineSkipReason: item.routineSkipReason,
    routineMerged: item.routineMerged,
    routineMergedTriggerDates: item.routineMergedTriggerDates,
    routineDetachedFromRuleId: item.routineDetachedFromRuleId,
    images: item.images,
    completedAt: item.completedAt,
  };
}
