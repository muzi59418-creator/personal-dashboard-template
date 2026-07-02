import type { DashboardData } from "../types/dashboard";

const REQUIRED_COLLECTION_KEYS = ["diaryEntries", "workItems", "ideas", "categories", "projects"] as const;
const OPTIONAL_COLLECTION_KEYS = ["migrations", "workResponsibilities", "routineWorkTemplates"] as const;

export type BackupValidationResult =
  | { ok: true; data: DashboardData }
  | { ok: false; message: string };

export function createBackupFileName(prefix: string, date = new Date()): string {
  return `${prefix}_${formatLocalTimestamp(date)}.json`;
}

export function downloadJsonFile(json: string, fileName: string): boolean {
  try {
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = sanitizeFileName(fileName);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
}

export function validateDashboardBackupJson(json: string): BackupValidationResult {
  if (!json.trim()) {
    return { ok: false, message: "导入失败：文件内容为空，当前数据未被修改。" };
  }

  try {
    return validateDashboardBackupData(JSON.parse(json));
  } catch {
    return { ok: false, message: "导入失败：文件格式不正确，当前数据未被修改。" };
  }
}

export function validateDashboardBackupData(value: unknown): BackupValidationResult {
  if (!isRecord(value)) {
    return { ok: false, message: "导入失败：未识别到有效的工作仪表板备份数据。" };
  }

  const missingRequiredKey = REQUIRED_COLLECTION_KEYS.find((key) => !Array.isArray(value[key]));
  if (missingRequiredKey) {
    return { ok: false, message: "导入失败：未识别到有效的工作仪表板备份数据。" };
  }

  const invalidCollectionKey = [...REQUIRED_COLLECTION_KEYS, ...OPTIONAL_COLLECTION_KEYS].find(
    (key) => value[key] !== undefined && !Array.isArray(value[key]),
  );
  if (invalidCollectionKey) {
    return { ok: false, message: "导入失败：备份数据结构不完整，当前数据未被修改。" };
  }

  const invalidEntryKey = REQUIRED_COLLECTION_KEYS.find((key) => !getCollection(value, key).every(isRecord));
  if (invalidEntryKey) {
    return { ok: false, message: "导入失败：备份数据明细格式不正确，当前数据未被修改。" };
  }

  const workResponsibilities = value.workResponsibilities;
  if (Array.isArray(workResponsibilities) && !workResponsibilities.every(isRecord)) {
    return { ok: false, message: "导入失败：长期职责数据格式不正确，当前数据未被修改。" };
  }

  const routineWorkTemplates = value.routineWorkTemplates;
  if (Array.isArray(routineWorkTemplates) && !routineWorkTemplates.every(isRecord)) {
    return { ok: false, message: "导入失败：例行工作数据格式不正确，当前数据未被修改。" };
  }

  if (value.version !== undefined && typeof value.version !== "string") {
    return { ok: false, message: "导入失败：备份版本字段格式不正确，当前数据未被修改。" };
  }

  if (value.updatedAt !== undefined && typeof value.updatedAt !== "string") {
    return { ok: false, message: "导入失败：更新时间字段格式不正确，当前数据未被修改。" };
  }

  return { ok: true, data: value as unknown as DashboardData };
}

function formatLocalTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${year}-${month}-${day}_${hour}${minute}`;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*]/g, "-");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getCollection(value: Record<string, unknown>, key: string): unknown[] {
  const collection = value[key];
  return Array.isArray(collection) ? collection : [];
}
