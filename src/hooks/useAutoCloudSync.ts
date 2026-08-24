import { useCallback, useEffect, useRef, useState } from "react";
import {
  AutoCloudSyncController,
  readAutoCloudSyncPreference,
  writeAutoCloudSyncPreference,
  type AutoCloudSyncChange,
  type AutoCloudSyncState,
} from "../data/autoCloudSync";
import { getCloudDashboardData, getCloudSyncMeta, saveDashboardDataToCloud } from "../data/cloudSync";
import type { CloudDashboardRecord } from "../data/cloudSync";

const DISABLED_STATE: AutoCloudSyncState = {
  enabled: false,
  status: "disabled",
  pending: false,
  retryCount: 0,
  lastSyncedAt: "",
  error: "",
};

export function useAutoCloudSync(active: boolean, onCloudSaved?: (record: CloudDashboardRecord) => void) {
  const onCloudSavedRef = useRef(onCloudSaved);
  onCloudSavedRef.current = onCloudSaved;
  const controllerRef = useRef<AutoCloudSyncController | null>(null);
  if (!controllerRef.current) {
    const preference = active ? readAutoCloudSyncPreference() : { enabled: false };
    controllerRef.current = new AutoCloudSyncController({
      enabled: preference.enabled,
      initialBlockedStatus: preference.blockedStatus,
      readCloud: getCloudDashboardData,
      saveCloud: saveDashboardDataToCloud,
      getBaseCloudUpdatedAt: () => getCloudSyncMeta()?.lastCloudUpdatedAt || "",
      isOnline: () => typeof navigator === "undefined" || navigator.onLine,
      onStateChange: writeAutoCloudSyncPreference,
      onCloudSaved: (record) => onCloudSavedRef.current?.(record),
    });
  }

  const [state, setState] = useState<AutoCloudSyncState>(() => controllerRef.current?.getState() || DISABLED_STATE);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    const unsubscribe = controller.subscribe(setState);
    const handleOnline = () => controller.handleOnline();
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
      unsubscribe();
      controller.dispose();
    };
  }, []);

  const setEnabled = useCallback((enabled: boolean) => controllerRef.current?.setEnabled(enabled), []);
  const notifyLocalChange = useCallback((change: AutoCloudSyncChange) => controllerRef.current?.notifyLocalChange(change), []);
  const acceptManualCloudCommit = useCallback(() => controllerRef.current?.acceptManualCloudCommit(), []);
  const retry = useCallback(() => controllerRef.current?.retry(), []);

  return { state, setEnabled, notifyLocalChange, acceptManualCloudCommit, retry };
}
