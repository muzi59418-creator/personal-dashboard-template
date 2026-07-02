import { STORAGE_KEY } from "../data/storage";
import { SIDEBAR_COLLAPSED_KEY } from "../data/uiPreferences";
import type { DashboardData } from "../types/dashboard";

const PROJECT_LOCAL_STORAGE_KEYS = [STORAGE_KEY, SIDEBAR_COLLAPSED_KEY] as const;
const ONE_MB = 1024 * 1024;

export interface LocalDataStatus {
  formattedSize: string;
  sizeBytes: number;
  imageCount: number;
  workItemCount: number;
  diaryEntryCount: number;
  ideaCount: number;
  projectCount: number;
  workResponsibilityCount: number;
  risk: {
    level: "normal" | "backup" | "high";
    label: string;
    message: string;
  };
}

export function getLocalDataStatus(data: DashboardData): LocalDataStatus {
  const sizeBytes = calculateProjectLocalStorageBytes();

  return {
    formattedSize: formatDataSize(sizeBytes),
    sizeBytes,
    imageCount: countImageAttachments(data),
    workItemCount: data.workItems.length,
    diaryEntryCount: data.diaryEntries.length,
    ideaCount: data.ideas.length,
    projectCount: data.projects.length,
    workResponsibilityCount: data.workResponsibilities.length,
    risk: getStorageRisk(sizeBytes),
  };
}

export function calculateProjectLocalStorageBytes(): number {
  if (typeof localStorage === "undefined") return 0;

  return PROJECT_LOCAL_STORAGE_KEYS.reduce((total, key) => {
    const value = localStorage.getItem(key);
    if (value === null) return total;
    return total + getUtf8Bytes(key) + getUtf8Bytes(value);
  }, 0);
}

export function formatDataSize(bytes: number): string {
  if (bytes < ONE_MB) {
    const kb = bytes / 1024;
    if (kb < 10) return `${Math.max(kb, 0.1).toFixed(1)} KB`;
    return `${Math.round(kb)} KB`;
  }

  const mb = bytes / ONE_MB;
  return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB`;
}

export function countImageAttachments(data: DashboardData): number {
  const workImages = data.workItems.reduce((total, item) => total + countImages(item.images), 0);
  const diaryImages = data.diaryEntries.reduce((total, entry) => total + countImages(entry.images), 0);
  const ideaImages = data.ideas.reduce((total, idea) => total + countImages(idea.attachments?.length ? idea.attachments : idea.imageDataUrl ? [idea.imageDataUrl] : []), 0);
  return workImages + diaryImages + ideaImages;
}

function getStorageRisk(bytes: number): LocalDataStatus["risk"] {
  if (bytes >= 4 * ONE_MB) {
    return {
      level: "high",
      label: "高风险",
      message: "数据接近浏览器本地存储上限，请立即导出备份，谨慎继续保存大量截图。",
    };
  }

  if (bytes >= 3 * ONE_MB) {
    return {
      level: "backup",
      label: "建议备份",
      message: "数据量较大，建议及时导出备份。",
    };
  }

  return {
    level: "normal",
    label: "正常",
    message: "当前数据量正常。",
  };
}

function countImages(images?: string[]): number {
  if (!Array.isArray(images)) return 0;
  return images.filter(Boolean).length;
}

function getUtf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}
