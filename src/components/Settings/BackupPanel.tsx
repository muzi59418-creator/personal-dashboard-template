import { useRef, useState } from "react";
import { Download, RotateCcw, Trash2, Upload } from "lucide-react";
import type { DashboardData } from "../../types/dashboard";
import { createBackupFileName, downloadJsonFile, validateDashboardBackupJson } from "../../utils/backupUtils";
import { getLocalDataStatus } from "../../utils/storageHealth";
import { ChangelogPanel } from "./ChangelogPanel";

interface BackupPanelProps {
  data: DashboardData;
  onExport: () => string;
  onImport: (payload: string | DashboardData) => DashboardData | undefined;
  onClear: () => void;
}

export function BackupPanel({ data, onExport, onImport, onClear }: BackupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const dataStatus = getLocalDataStatus(data);

  function exportJson() {
    const fileName = createBackupFileName("个人工作仪表板备份");
    if (!downloadJsonFile(onExport(), fileName)) {
      showMessage("导出失败：浏览器未能创建备份文件，请稍后重试。", "error");
      return;
    }
    showMessage(`已导出 JSON 备份：${fileName}`, "success");
  }

  function importJson(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      showMessage("导入失败：请选择 JSON 文件，当前数据未被修改。", "error");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const validation = validateDashboardBackupJson(String(reader.result || ""));
      if (!validation.ok) {
        showMessage(validation.message, "error");
        return;
      }

      const backupFileName = createBackupFileName("导入前自动备份_个人工作仪表板");
      if (!downloadJsonFile(onExport(), backupFileName)) {
        showMessage("导入前自动备份下载失败，当前数据未被修改。", "error");
        return;
      }

      const imported = onImport(validation.data);
      if (!imported) {
        showMessage("导入失败：当前数据未被修改。", "error");
        return;
      }

      showMessage("导入成功，数据已恢复。", "success");
    };
    reader.onerror = () => showMessage("导入失败：文件读取失败，当前数据未被修改。", "error");
    reader.readAsText(file, "utf-8");
    event.target.value = "";
  }

  function refreshStorage() {
    const refreshed = onImport(onExport());
    showMessage(refreshed ? "已重新写入当前数据。" : "刷新存储失败，当前数据未被修改。", refreshed ? "success" : "error");
  }

  function showMessage(nextMessage: string, tone: "success" | "error") {
    setMessage(nextMessage);
    setMessageTone(tone);
  }

  return (
    <section className="page-section">
      <div className="page-head">
        <div>
          <h2>设置 / 备份</h2>
        </div>
      </div>
      <section className="panel settings-grid">
        <article className="settings-card">
          <h3>当前存储模式</h3>
          <p>localStorage 本地原型</p>
          <span>
            应用版本：v{data.appVersion || data.version}。数据只保存在当前浏览器本地。最近更新：
            {new Date(data.updatedAt).toLocaleString("zh-CN")}
          </span>
        </article>
        <article className="settings-card">
          <h3>后续计划</h3>
          <p>云端数据库、自动保存、多设备同步、访问控制</p>
          <span>当前版本不接入真实云端服务，也不写入账号、密码、API Key 或 token。</span>
        </article>
      </section>
      <section className="panel local-data-status-card">
        <div className="local-data-status-head">
          <h3>本地数据状态</h3>
          <span className={`storage-status-pill ${dataStatus.risk.level}`} title={dataStatus.risk.message}>
            状态：{dataStatus.risk.label}
          </span>
        </div>
        <div className="data-status-inline" aria-label={dataStatus.risk.message}>
          <DataStatusItem label="数据" value={dataStatus.formattedSize} />
          <DataStatusItem label="图片" value={`${dataStatus.imageCount} 张`} />
          <DataStatusItem label="工作" value={`${dataStatus.workItemCount} 条`} />
          <DataStatusItem label="日记" value={`${dataStatus.diaryEntryCount} 篇`} />
          <DataStatusItem label="灵感" value={`${dataStatus.ideaCount} 条`} />
          <DataStatusItem label="项目" value={`${dataStatus.projectCount} 个`} />
          <DataStatusItem label="职责" value={`${dataStatus.workResponsibilityCount} 类`} />
        </div>
      </section>
      <section className="panel">
        <div className="section-head">
          <h3>数据操作</h3>
        </div>
        <div className="backup-actions">
          <button className="primary-button" type="button" onClick={exportJson}>
            <Download size={16} />
            导出 JSON
          </button>
          <button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            导入 JSON
          </button>
          <button className="secondary-button" type="button" onClick={refreshStorage}>
            <RotateCcw size={16} />
            刷新存储
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={() => {
              if (window.confirm("确认清空本地数据？清空后当前页面无法撤回。")) {
                onClear();
                showMessage("本地数据已清空。", "success");
              }
            }}
          >
            <Trash2 size={16} />
            清空本地数据
          </button>
          <input ref={fileInputRef} className="hidden-input" type="file" accept="application/json,.json" onChange={importJson} />
        </div>
        {message && <p className={`message-text ${messageTone}`}>{message}</p>}
      </section>
      <ChangelogPanel />
    </section>
  );
}

function DataStatusItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="data-status-item">
      <strong>{value}</strong>
      <span>{label}</span>
    </span>
  );
}
