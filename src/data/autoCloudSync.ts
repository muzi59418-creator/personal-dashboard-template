import type { CloudDashboardProbeResult, CloudDashboardRecord, DashboardCloudSaveResult } from "./cloudSync";

export const AUTO_CLOUD_SYNC_META_KEY = "personal-dashboard-template:auto-cloud-sync";

export type AutoCloudSyncStatus =
  | "disabled"
  | "synced"
  | "pending"
  | "syncing"
  | "offline"
  | "error"
  | "conflict"
  | "manual_review";

export type AutoCloudSyncChange = "regular" | "manual_review" | "cloud_restore";

export interface AutoCloudSyncState {
  enabled: boolean;
  status: AutoCloudSyncStatus;
  pending: boolean;
  retryCount: number;
  lastSyncedAt: string;
  error: string;
}

interface AutoCloudSyncControllerOptions {
  enabled: boolean;
  initialBlockedStatus?: "conflict" | "manual_review";
  debounceMs?: number;
  retryDelaysMs?: number[];
  readCloud: () => Promise<CloudDashboardProbeResult>;
  saveCloud: (expectedUpdatedAt: string) => Promise<DashboardCloudSaveResult>;
  getBaseCloudUpdatedAt: () => string;
  isOnline: () => boolean;
  onStateChange?: (state: AutoCloudSyncState) => void;
  onCloudSaved?: (record: CloudDashboardRecord) => void;
  setTimer?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

type StateListener = (state: AutoCloudSyncState) => void;

export class AutoCloudSyncController {
  private readonly debounceMs: number;
  private readonly retryDelaysMs: number[];
  private readonly readCloud: AutoCloudSyncControllerOptions["readCloud"];
  private readonly saveCloud: AutoCloudSyncControllerOptions["saveCloud"];
  private readonly getBaseCloudUpdatedAt: AutoCloudSyncControllerOptions["getBaseCloudUpdatedAt"];
  private readonly isOnline: AutoCloudSyncControllerOptions["isOnline"];
  private readonly onStateChange?: AutoCloudSyncControllerOptions["onStateChange"];
  private readonly onCloudSaved?: AutoCloudSyncControllerOptions["onCloudSaved"];
  private readonly setTimer: NonNullable<AutoCloudSyncControllerOptions["setTimer"]>;
  private readonly clearTimer: NonNullable<AutoCloudSyncControllerOptions["clearTimer"]>;
  private readonly listeners = new Set<StateListener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private revision = 0;
  private syncedRevision = 0;
  private state: AutoCloudSyncState;

  constructor(options: AutoCloudSyncControllerOptions) {
    this.debounceMs = options.debounceMs ?? 3000;
    this.retryDelaysMs = options.retryDelaysMs ?? [5000, 15000, 30000];
    this.readCloud = options.readCloud;
    this.saveCloud = options.saveCloud;
    this.getBaseCloudUpdatedAt = options.getBaseCloudUpdatedAt;
    this.isOnline = options.isOnline;
    this.onStateChange = options.onStateChange;
    this.onCloudSaved = options.onCloudSaved;
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay));
    this.clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer));
    this.state = {
      enabled: options.enabled,
      status: options.initialBlockedStatus || (options.enabled ? "synced" : "disabled"),
      pending: Boolean(options.initialBlockedStatus),
      retryCount: 0,
      lastSyncedAt: "",
      error: "",
    };
  }

  getState(): AutoCloudSyncState {
    return { ...this.state };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  setEnabled(enabled: boolean): void {
    this.cancelTimer();
    if (!enabled) {
      this.inFlight = false;
      this.updateState({ enabled: false, status: "disabled", pending: false, retryCount: 0, error: "" });
      return;
    }

    const baseUpdatedAt = this.getBaseCloudUpdatedAt();
    this.updateState({
      enabled: true,
      status: baseUpdatedAt ? "synced" : "manual_review",
      pending: false,
      retryCount: 0,
      error: baseUpdatedAt ? "" : "请先手动保存到云端或从云端恢复，再开启自动保存。",
    });
  }

  notifyLocalChange(change: AutoCloudSyncChange): void {
    if (change === "cloud_restore") {
      this.acceptManualCloudCommit();
      return;
    }
    if (change === "manual_review") {
      this.cancelTimer();
      if (this.state.enabled) {
        this.updateState({
          status: "manual_review",
          pending: false,
          retryCount: 0,
          error: "导入或清空后的数据不会自动上传，请手动确认保存或从云端恢复。",
        });
      }
      return;
    }
    if (!this.state.enabled || this.state.status === "conflict" || this.state.status === "manual_review") return;

    this.revision += 1;
    this.updateState({ pending: true, error: "" });
    if (this.inFlight) return;
    this.updateState({ status: "pending" });
    this.schedule(this.debounceMs);
  }

  acceptManualCloudCommit(): void {
    this.cancelTimer();
    this.syncedRevision = this.revision;
    this.updateState({
      status: this.state.enabled ? "synced" : "disabled",
      pending: false,
      retryCount: 0,
      lastSyncedAt: this.getBaseCloudUpdatedAt(),
      error: "",
    });
  }

  handleOnline(): void {
    if (!this.state.enabled || !this.state.pending || this.inFlight) return;
    if (this.state.status === "conflict" || this.state.status === "manual_review") return;
    this.schedule(0);
  }

  retry(): void {
    if (!this.state.enabled || !this.state.pending || this.inFlight) return;
    if (this.state.status === "conflict" || this.state.status === "manual_review") return;
    this.updateState({ retryCount: 0, error: "" });
    this.schedule(0);
  }

  async flushNow(): Promise<void> {
    this.cancelTimer();
    await this.syncPendingChanges();
  }

  dispose(): void {
    this.cancelTimer();
    this.listeners.clear();
  }

  private schedule(delay: number): void {
    this.cancelTimer();
    this.timer = this.setTimer(() => {
      this.timer = null;
      void this.syncPendingChanges();
    }, delay);
  }

  private async syncPendingChanges(): Promise<void> {
    if (!this.state.enabled || !this.state.pending || this.inFlight) return;
    if (this.state.status === "conflict" || this.state.status === "manual_review") return;
    if (!this.isOnline()) {
      this.updateState({ status: "offline", error: "当前设备离线，本地数据已保留，联网后将重试。" });
      return;
    }

    const baseUpdatedAt = this.getBaseCloudUpdatedAt();
    if (!baseUpdatedAt) {
      this.stopForConflict("缺少已应用的云端版本，请先手动保存或恢复。", "manual_review");
      return;
    }

    this.inFlight = true;
    const targetRevision = this.revision;
    this.updateState({ status: "syncing", error: "" });

    const latest = await this.readCloud();
    if (!this.state.enabled) {
      this.inFlight = false;
      return;
    }
    if (latest.status !== "cloud_exists") {
      this.inFlight = false;
      if (latest.status === "cloud_empty") {
        this.stopForConflict("云端记录不存在，自动保存已停止。", "conflict");
      } else {
        this.handleFailure(latest.error);
      }
      return;
    }
    if (latest.record.updatedAt !== baseUpdatedAt) {
      this.inFlight = false;
      this.stopForConflict("云端数据已变化，自动保存已停止，请先从云端恢复或手动确认。", "conflict");
      return;
    }

    const result = await this.saveCloud(baseUpdatedAt);
    this.inFlight = false;
    if (!this.state.enabled) return;
    if (!result.ok) {
      if (result.reason === "conflict") {
        this.stopForConflict("云端数据已变化，自动保存已停止，请先从云端恢复或手动确认。", "conflict");
      } else {
        this.handleFailure(result.error);
      }
      return;
    }

    this.syncedRevision = targetRevision;
    this.onCloudSaved?.(result.record);
    const hasNewerChanges = this.revision > this.syncedRevision;
    this.updateState({
      status: hasNewerChanges ? "pending" : "synced",
      pending: hasNewerChanges,
      retryCount: 0,
      lastSyncedAt: result.record.updatedAt,
      error: result.metaSaved ? "" : result.warning,
    });
    if (hasNewerChanges) this.schedule(this.debounceMs);
  }

  private handleFailure(error: string): void {
    const nextRetryCount = this.state.retryCount + 1;
    const canRetry = this.state.enabled && this.isOnline() && nextRetryCount <= this.retryDelaysMs.length;
    this.updateState({
      status: canRetry ? "pending" : this.isOnline() ? "error" : "offline",
      pending: true,
      retryCount: nextRetryCount,
      error: error || "自动保存失败，本地数据已保留。",
    });
    if (canRetry) this.schedule(this.retryDelaysMs[nextRetryCount - 1]);
  }

  private stopForConflict(error: string, status: "conflict" | "manual_review"): void {
    this.cancelTimer();
    this.updateState({ enabled: false, status, pending: true, error });
  }

  private cancelTimer(): void {
    if (this.timer === null) return;
    this.clearTimer(this.timer);
    this.timer = null;
  }

  private updateState(patch: Partial<AutoCloudSyncState>): void {
    this.state = { ...this.state, ...patch };
    this.onStateChange?.(this.getState());
    this.listeners.forEach((listener) => listener(this.getState()));
  }
}

export function readAutoCloudSyncPreference(): { enabled: boolean; blockedStatus?: "conflict" | "manual_review" } {
  if (typeof localStorage === "undefined") return { enabled: false };
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTO_CLOUD_SYNC_META_KEY) || "null") as {
      enabled?: unknown;
      blockedStatus?: unknown;
    } | null;
    const blockedStatus = parsed?.blockedStatus === "conflict" || parsed?.blockedStatus === "manual_review" ? parsed.blockedStatus : undefined;
    return { enabled: parsed?.enabled === true, blockedStatus };
  } catch {
    return { enabled: false };
  }
}

export function writeAutoCloudSyncPreference(state: Pick<AutoCloudSyncState, "enabled" | "status">): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const blockedStatus = state.status === "conflict" || state.status === "manual_review" ? state.status : "";
    localStorage.setItem(AUTO_CLOUD_SYNC_META_KEY, JSON.stringify({ enabled: state.enabled, blockedStatus }));
    return true;
  } catch {
    return false;
  }
}
