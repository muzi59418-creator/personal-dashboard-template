import { supabase } from "../lib/supabase";
import { getDashboardData } from "./repository";

const CLOUD_SYNC_META_KEY = "personal-dashboard-template:cloud-sync-meta";

export interface CloudDashboardRecord {
  data: unknown;
  dataVersion: string;
  updatedAt: string;
}

export type CloudDashboardProbeResult =
  | { status: "cloud_exists"; cloudExists: true; record: CloudDashboardRecord }
  | { status: "cloud_empty"; cloudExists: false; record: null }
  | { status: "error"; cloudExists: false; record: null; error: string };

interface CloudDashboardRow {
  data: unknown;
  data_version: string;
  updated_at: string;
}

export interface CloudSyncMeta {
  lastSyncAt: string;
  lastCloudReadAt: string;
  lastCloudUpdatedAt: string;
  syncStatus: "initialized" | "saved" | "restored";
  cloudInitialized: true;
}

export type InitialDashboardUploadResult =
  | { ok: true; record: CloudDashboardRecord; metaSaved: true }
  | { ok: true; record: CloudDashboardRecord; metaSaved: false; warning: string }
  | { ok: false; error: string };

export type DashboardCloudSaveResult =
  | { ok: true; record: CloudDashboardRecord; metaSaved: true }
  | { ok: true; record: CloudDashboardRecord; metaSaved: false; warning: string }
  | { ok: false; reason: "conflict"; error: string; record?: CloudDashboardRecord }
  | { ok: false; reason: "error"; error: string };

export async function getCloudDashboardData(): Promise<CloudDashboardProbeResult> {
  if (!supabase) return createCloudReadError("Supabase 云端模式尚未配置。");

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return createCloudReadError(userError?.message || "未获取到当前登录用户。");
    }

    const { data, error } = await supabase
      .from("dashboard_data")
      .select("data,data_version,updated_at")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (error) return createCloudReadError(error.message);
    if (!data) return { status: "cloud_empty", cloudExists: false, record: null };

    const record = toCloudDashboardRecord(data as CloudDashboardRow);
    recordCloudRead(record.updatedAt);
    return {
      status: "cloud_exists",
      cloudExists: true,
      record,
    };
  } catch (error) {
    return createCloudReadError(error instanceof Error ? error.message : "云端读取失败。");
  }
}

export async function uploadInitialDashboardData(): Promise<InitialDashboardUploadResult> {
  if (!supabase) return createInitialUploadError("Supabase 云端模式尚未配置。");

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return createInitialUploadError(userError?.message || "未获取到当前登录用户。");
    }

    const dashboardData = getDashboardData();
    const syncedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("dashboard_data")
      .insert({
        user_id: userData.user.id,
        data: dashboardData,
        data_version: dashboardData.schemaVersion,
        updated_at: syncedAt,
      })
      .select("data,data_version,updated_at")
      .single();

    if (error) return createInitialUploadError(error.message);

    const record = toCloudDashboardRecord(data as CloudDashboardRow);
    const meta: CloudSyncMeta = {
      lastSyncAt: record.updatedAt,
      lastCloudReadAt: new Date().toISOString(),
      lastCloudUpdatedAt: record.updatedAt,
      syncStatus: "initialized",
      cloudInitialized: true,
    };

    if (persistCloudSyncMeta(meta)) {
      return { ok: true, record, metaSaved: true };
    }
    return {
      ok: true,
      record,
      metaSaved: false,
      warning: "云端初始化完成，但本地同步状态记录失败。",
    };
  } catch (error) {
    return createInitialUploadError(error instanceof Error ? error.message : "首次云端上传失败。");
  }
}

export async function saveDashboardDataToCloud(expectedUpdatedAt: string): Promise<DashboardCloudSaveResult> {
  if (!supabase) return createCloudSaveError("Supabase 云端模式尚未配置。");
  if (!expectedUpdatedAt) return createCloudSaveConflict("缺少上次云端读取时间，请重新读取云端数据后再保存。");

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return createCloudSaveError(userError?.message || "未获取到当前登录用户。");
    }

    const dashboardData = getDashboardData();
    const syncedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("dashboard_data")
      .update({
        data: dashboardData,
        data_version: dashboardData.schemaVersion,
        updated_at: syncedAt,
      })
      .eq("user_id", userData.user.id)
      .eq("updated_at", expectedUpdatedAt)
      .select("data,data_version,updated_at")
      .maybeSingle();

    if (error) return createCloudSaveError(error.message);
    if (!data) {
      const latest = await getCloudDashboardData();
      return createCloudSaveConflict(
        "云端数据已变化，请先从云端恢复或重新确认。",
        latest.status === "cloud_exists" ? latest.record : undefined,
      );
    }

    const record = toCloudDashboardRecord(data as CloudDashboardRow);
    const meta: CloudSyncMeta = {
      lastSyncAt: record.updatedAt,
      lastCloudReadAt: new Date().toISOString(),
      lastCloudUpdatedAt: record.updatedAt,
      syncStatus: "saved",
      cloudInitialized: true,
    };
    if (persistCloudSyncMeta(meta)) return { ok: true, record, metaSaved: true };
    return {
      ok: true,
      record,
      metaSaved: false,
      warning: "已保存到云端，但本机同步状态记录失败。",
    };
  } catch (error) {
    return createCloudSaveError(error instanceof Error ? error.message : "保存到云端失败。");
  }
}

export function markCloudDashboardRestored(updatedAt: string): boolean {
  const now = new Date().toISOString();
  return persistCloudSyncMeta({
    lastSyncAt: updatedAt,
    lastCloudReadAt: now,
    lastCloudUpdatedAt: updatedAt,
    syncStatus: "restored",
    cloudInitialized: true,
  });
}

export function getCloudSyncMeta(): CloudSyncMeta | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(CLOUD_SYNC_META_KEY) || "null") as Partial<CloudSyncMeta> | null;
    if (!parsed || parsed.cloudInitialized !== true) return null;
    const lastSyncAt = typeof parsed.lastSyncAt === "string" ? parsed.lastSyncAt : "";
    const syncStatus = parsed.syncStatus === "saved" || parsed.syncStatus === "restored" ? parsed.syncStatus : "initialized";
    return {
      lastSyncAt,
      lastCloudReadAt: typeof parsed.lastCloudReadAt === "string" ? parsed.lastCloudReadAt : lastSyncAt,
      lastCloudUpdatedAt: typeof parsed.lastCloudUpdatedAt === "string" ? parsed.lastCloudUpdatedAt : lastSyncAt,
      syncStatus,
      cloudInitialized: true,
    };
  } catch {
    return null;
  }
}

function createCloudReadError(message: string): CloudDashboardProbeResult {
  return { status: "error", cloudExists: false, record: null, error: message };
}

function createInitialUploadError(message: string): InitialDashboardUploadResult {
  return { ok: false, error: message };
}

function createCloudSaveError(message: string): DashboardCloudSaveResult {
  return { ok: false, reason: "error", error: message };
}

function createCloudSaveConflict(message: string, record?: CloudDashboardRecord): DashboardCloudSaveResult {
  return { ok: false, reason: "conflict", error: message, record };
}

function toCloudDashboardRecord(row: CloudDashboardRow): CloudDashboardRecord {
  return { data: row.data, dataVersion: row.data_version, updatedAt: row.updated_at };
}

function recordCloudRead(updatedAt: string): void {
  const current = getCloudSyncMeta();
  persistCloudSyncMeta({
    lastSyncAt: current?.lastSyncAt || "",
    lastCloudReadAt: new Date().toISOString(),
    lastCloudUpdatedAt: updatedAt,
    syncStatus: current?.syncStatus || "initialized",
    cloudInitialized: true,
  });
}

function persistCloudSyncMeta(meta: CloudSyncMeta): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(CLOUD_SYNC_META_KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}
