import { Edit3, Trash2 } from "lucide-react";
import type { Category, Project, WorkItem, WorkItemInput } from "../../types/dashboard";
import { formatDate, formatDateTime } from "../../utils/date";
import { getChinaWorkdayCheck } from "../../data/chinaWorkCalendar";
import { ImageGallery } from "../Common/ImageGallery";
import { Modal } from "../Common/Modal";
import { WorkItemForm } from "./WorkItemForm";

interface WorkItemDetailModalProps {
  item: WorkItem;
  categories: Category[];
  projects: Project[];
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onUpdate: (input: WorkItemInput) => void;
  onDelete: () => void;
  onSkipRoutine?: () => void;
  onPostponeRoutine?: (targetDate: string) => void;
  onPauseRoutine?: () => void;
  onOpenRoutineRule?: () => void;
}

export function WorkItemDetailModal({
  item,
  categories,
  projects,
  editing,
  onEdit,
  onCancelEdit,
  onClose,
  onUpdate,
  onDelete,
  onSkipRoutine,
  onPostponeRoutine,
  onPauseRoutine,
  onOpenRoutineRule,
}: WorkItemDetailModalProps) {
  const category = categories.find((entry) => entry.id === item.categoryId);
  const project = projects.find((entry) => entry.id === item.projectId);
  const isRoutine = item.sourceTemplateType === "routine" || Boolean(item.sourceTemplateId && item.sourceTemplateType !== "work");

  return (
    <Modal title={editing ? "编辑工作内容" : "工作内容详情"} onClose={onClose}>
      {editing ? (
        <WorkItemForm item={item} categories={categories} projects={projects} onCancel={onCancelEdit} onSubmit={onUpdate} />
      ) : (
        <div className="detail-stack">
          <div className="detail-title-row">
            <div>
              <h3>{item.title}</h3>
            </div>
            <div className="icon-actions">
              <button className="secondary-button" type="button" onClick={onEdit}>
                <Edit3 size={16} />
                编辑
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() => {
                  if (window.confirm("确认删除这条工作内容？")) onDelete();
                }}
              >
                <Trash2 size={16} />
                删除
              </button>
            </div>
          </div>
          {isRoutine && (
            <div className="routine-instance-actions">
              <button className="secondary-button" type="button" onClick={() => onUpdate({ ...toWorkItemInput(item), status: "已完成" })}>
                完成
              </button>
              <button className="secondary-button" type="button" onClick={() => onPostponeRoutine?.(getTomorrow(item.date))}>
                顺延到明天
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  const targetDate = window.prompt("选择其他日期，格式 YYYY-MM-DD。允许选择周末或法定节假日。", item.date);
                  if (!targetDate) return;
                  const check = getChinaWorkdayCheck(targetDate);
                  if (check.ok && !check.isWorkingDay) {
                    window.alert("已手动安排至非工作日，系统不会再次自动改期。");
                  }
                  onPostponeRoutine?.(targetDate);
                }}
              >
                选择其他日期
              </button>
              <button className="secondary-button" type="button" onClick={onSkipRoutine}>
                本次跳过
              </button>
              <button className="secondary-button" type="button" onClick={onPauseRoutine}>
                暂停例行工作
              </button>
              <button className="secondary-button" type="button" onClick={onOpenRoutineRule}>
                查看 / 编辑例行规则
              </button>
            </div>
          )}
          <div className="detail-meta-grid">
            <DetailMeta label="分类" value={category?.name || "未分类"} />
            <DetailMeta label="状态" value={item.status} />
            <DetailMeta label="截止日期" value={formatDate(item.date)} />
            <DetailMeta label="计划执行日" value={item.plannedDate ? formatDate(item.plannedDate) : "未设置"} />
            <DetailMeta label="关联项目" value={project?.name || "不关联"} />
            {item.sourceTemplateType === "work" && <DetailMeta label="来源模板" value={item.sourceTemplateName || "已删除模板"} />}
            {item.sourceProjectType === "progressItem" && (
              <DetailMeta label="来源" value={`项目推进事项：${getProgressItemSourceName(item, projects)}`} />
            )}
            {item.sourceProjectType === "nextAction" && <DetailMeta label="来源" value="项目下一步动作" />}
            {isRoutine && <DetailMeta label="来源例行规则" value={item.sourceTemplateName || "已删除规则"} />}
            {isRoutine && <DetailMeta label="原计划触发日期" value={item.routineOriginalDate ? formatDate(item.routineOriginalDate) : "未记录"} />}
            {isRoutine && <DetailMeta label="实际安排日期" value={formatDate(item.routineActualDate || item.date)} />}
            {isRoutine && <DetailMeta label="顺延说明" value={getRoutineTraceText(item)} />}
            {item.routineSkipped && <DetailMeta label="跳过记录" value={`${item.routineSkippedAt || "未记录"} ${item.routineSkipReason || ""}`.trim()} />}
            <DetailMeta label="创建时间" value={formatDateTime(item.createdAt)} />
            <DetailMeta label="更新时间" value={formatDateTime(item.updatedAt)} />
          </div>
          <p className="detail-content">{item.content}</p>
          <ImageGallery images={item.images || []} />
        </div>
      )}
    </Modal>
  );
}

function DetailMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function toWorkItemInput(item: WorkItem): WorkItemInput {
  return {
    title: item.title,
    categoryId: item.categoryId,
    status: item.status,
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
    routineSkipped: item.routineSkipped,
    routineSkippedAt: item.routineSkippedAt,
    routineSkipReason: item.routineSkipReason,
    routineMerged: item.routineMerged,
    routineMergedTriggerDates: item.routineMergedTriggerDates,
    routineDetachedFromRuleId: item.routineDetachedFromRuleId,
    images: item.images,
    completedAt: item.completedAt,
  };
}

function getProgressItemSourceName(item: WorkItem, projects: Project[]): string {
  const project = projects.find((entry) => entry.id === item.sourceProjectId);
  const progressItem = project?.executionSteps?.find((entry) => entry.id === item.sourceProjectProgressItemId);
  if (progressItem) return progressItem.name || item.sourceProjectProgressItemName || "未命名推进事项";
  return item.sourceProjectProgressItemName ? `${item.sourceProjectProgressItemName}（原推进事项已删除）` : "原推进事项已删除";
}

function getTomorrow(date: string): string {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function getRoutineTraceText(item: WorkItem): string {
  const parts: string[] = [];
  if (item.routineHolidayPostponed) parts.push("因法定节假日顺延");
  if (item.routineManualPostponed) parts.push("已手动顺延");
  if (item.routineMerged && item.routineMergedTriggerDates?.length) parts.push(`合并触发日期：${item.routineMergedTriggerDates.join("、")}`);
  return parts.join("；") || "未顺延";
}
