import { useState } from "react";
import { CloudDownload, CloudUpload } from "lucide-react";
import {
  getCloudSyncMeta,
  getCloudDashboardData,
  markCloudDashboardRestored,
  saveDashboardDataToCloud,
  uploadInitialDashboardData,
  type CloudDashboardProbeResult,
  type CloudDashboardRecord,
} from "../../data/cloudSync";
import type { DashboardData } from "../../types/dashboard";
import { createBackupFileName, downloadJsonFile, validateDashboardBackupData } from "../../utils/backupUtils";

interface CloudSyncPanelProps {
  probe: CloudDashboardProbeResult;
  onInitialized: (record: CloudDashboardRecord) => void;
  onExport: () => string;
  onRestore: (data: DashboardData) => DashboardData | undefined;
}

export function CloudSyncPanel({ probe, onInitialized, onExport, onRestore }: CloudSyncPanelProps) {
  const [dismissed, setDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [lastSavedAt, setLastSavedAt] = useState(() => getCloudSyncMeta()?.lastSyncAt || "");

  async function uploadInitialData() {
    if (!window.confirm("确认将当前设备数据作为云端初始数据？")) return;

    setSubmitting(true);
    setMessage("");
    const result = await uploadInitialDashboardData();
    setSubmitting(false);

    if (!result.ok) {
      setMessage(`上传失败：${result.error}。本地数据未被修改。`);
      setMessageTone("error");
      return;
    }

    setCompleted(true);
    setMessage(result.metaSaved ? "云端初始化完成" : result.warning);
    setMessageTone("success");
    onInitialized(result.record);
  }

  async function restoreFromCloud() {
    setRestoring(true);
    setMessage("");

    const latestCloudData = await getCloudDashboardData();
    if (latestCloudData.status === "error") {
      setMessage(`云端读取失败：${latestCloudData.error}。本机数据未被修改。`);
      setMessageTone("error");
      setRestoring(false);
      return;
    }
    if (latestCloudData.status === "cloud_empty") {
      setMessage("云端没有可恢复的数据，本机数据未被修改。");
      setMessageTone("error");
      setRestoring(false);
      return;
    }

    const validation = validateDashboardBackupData(latestCloudData.record.data);
    if (!validation.ok) {
      setMessage(`云端数据校验失败：${validation.message} 本机数据未被修改。`);
      setMessageTone("error");
      setRestoring(false);
      return;
    }

    const confirmed = window.confirm(
      "确认从云端恢复？这会覆盖当前设备的本地数据，但不会删除或修改云端数据。恢复前会自动下载一份本机 JSON 备份。",
    );
    if (!confirmed) {
      setRestoring(false);
      return;
    }

    const backupFileName = createBackupFileName("云端恢复前自动备份_个人工作仪表板");
    if (!downloadJsonFile(onExport(), backupFileName)) {
      setMessage("恢复前本机备份下载失败，云端数据未写入，本机数据未被修改。");
      setMessageTone("error");
      setRestoring(false);
      return;
    }

    const restored = onRestore(validation.data);
    if (!restored) {
      setMessage("云端恢复失败，本机数据未被修改。");
      setMessageTone("error");
      setRestoring(false);
      return;
    }

    markCloudDashboardRestored(latestCloudData.record.updatedAt);
    window.alert("从云端恢复成功，页面即将刷新。");
    window.location.reload();
  }

  async function saveToCloud() {
    if (probe.status !== "cloud_exists") return;

    setSaving(true);
    setMessage("");

    const latestCloudData = await getCloudDashboardData();
    if (latestCloudData.status === "error") {
      setMessage(`云端读取失败：${latestCloudData.error}。本机数据未被修改。`);
      setMessageTone("error");
      setSaving(false);
      return;
    }
    if (latestCloudData.status === "cloud_empty") {
      setMessage("云端记录不存在，已停止保存。本机数据未被修改。");
      setMessageTone("error");
      setSaving(false);
      return;
    }
    if (latestCloudData.record.updatedAt !== probe.record.updatedAt) {
      onInitialized(latestCloudData.record);
      setLastSavedAt(latestCloudData.record.updatedAt);
      setMessage("云端数据已变化，请先从云端恢复，或再次点击保存并重新确认覆盖。");
      setMessageTone("error");
      setSaving(false);
      return;
    }

    const confirmed = window.confirm(
      "确认使用当前设备数据覆盖云端数据？本操作只更新当前账号唯一一条云端记录，不会清空或修改本机数据。",
    );
    if (!confirmed) {
      setSaving(false);
      return;
    }

    const result = await saveDashboardDataToCloud(probe.record.updatedAt);
    setSaving(false);
    if (!result.ok) {
      if (result.reason === "conflict" && result.record) {
        onInitialized(result.record);
        setLastSavedAt(result.record.updatedAt);
      }
      setMessage(
        result.reason === "conflict"
          ? "云端数据已变化，请先从云端恢复，或再次点击保存并重新确认覆盖。"
          : `保存失败：${result.error}。本机数据未被修改。`,
      );
      setMessageTone("error");
      return;
    }

    onInitialized(result.record);
    setLastSavedAt(result.record.updatedAt);
    setMessage(result.metaSaved ? `已保存到云端。最近保存：${formatCloudTime(result.record.updatedAt)}` : result.warning);
    setMessageTone("success");
  }

  if (completed) {
    return (
      <section className="panel cloud-sync-panel" aria-live="polite">
        <div className="cloud-sync-panel-head">
          <CloudUpload size={20} />
          <h3>首次同步</h3>
        </div>
        <p className="message-text success">{message}</p>
      </section>
    );
  }

  if (probe.status === "cloud_exists") {
    return (
      <section className="panel cloud-sync-panel" aria-live="polite">
        <div className="cloud-sync-panel-head">
          <CloudUpload size={20} />
          <h3>云端数据管理</h3>
        </div>
        <p>云端已有当前账号的仪表板数据。</p>
        <span>可手动保存本机数据，或从云端恢复。保存前会检查云端版本，当前仍不启用自动同步。</span>
        {lastSavedAt && <span className="cloud-sync-last-saved">最近保存：{formatCloudTime(lastSavedAt)}</span>}
        <div className="cloud-sync-actions">
          <button className="primary-button" type="button" disabled={saving || restoring} onClick={() => void saveToCloud()}>
            <CloudUpload size={16} />
            {saving ? "正在检查并保存…" : "保存本机数据到云端"}
          </button>
          <button className="secondary-button" type="button" disabled={saving || restoring} onClick={() => void restoreFromCloud()}>
            <CloudDownload size={16} />
            {restoring ? "正在读取云端…" : "从云端恢复"}
          </button>
        </div>
        {message && <p className={`message-text ${messageTone}`}>{message}</p>}
      </section>
    );
  }

  if (probe.status !== "cloud_empty" || dismissed) return null;

  return (
    <section className="panel cloud-sync-panel" aria-live="polite">
      <div className="cloud-sync-panel-head">
        <CloudUpload size={20} />
        <h3>首次同步</h3>
      </div>
      <p>检测到当前设备已有本地数据，是否上传到云端？</p>
      <span>只有确认后才会新增云端初始记录。本步骤不会开启自动同步，也不会修改本地业务数据。</span>
      <div className="cloud-sync-actions">
        <button className="primary-button" type="button" disabled={submitting} onClick={() => void uploadInitialData()}>
          <CloudUpload size={16} />
          {submitting ? "正在上传…" : "上传到云端"}
        </button>
        <button className="secondary-button" type="button" disabled={submitting} onClick={() => setDismissed(true)}>
          取消
        </button>
      </div>
      {message && <p className={`message-text ${messageTone}`}>{message}</p>}
    </section>
  );
}

function formatCloudTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
