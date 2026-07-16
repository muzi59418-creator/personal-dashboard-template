import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AutoCloudSyncController } from "../src/data/autoCloudSync";
import { CloudSyncPanel } from "../src/components/Settings/CloudSyncPanel";
import type { CloudDashboardProbeResult, DashboardCloudSaveResult } from "../src/data/cloudSync";

function cloudExists(updatedAt: string): CloudDashboardProbeResult {
  return {
    status: "cloud_exists",
    cloudExists: true,
    record: { data: {}, dataVersion: "1.3.0", updatedAt },
  };
}

function saveOk(updatedAt: string): DashboardCloudSaveResult {
  return {
    ok: true,
    record: { data: {}, dataVersion: "1.3.0", updatedAt },
    metaSaved: true,
  };
}

async function testDefaultOff() {
  let saves = 0;
  const controller = new AutoCloudSyncController({
    enabled: false,
    readCloud: async () => cloudExists("t1"),
    saveCloud: async () => {
      saves += 1;
      return saveOk("t2");
    },
    getBaseCloudUpdatedAt: () => "t1",
    isOnline: () => true,
  });
  controller.notifyLocalChange("regular");
  await controller.flushNow();
  assert.equal(saves, 0);
  assert.equal(controller.getState().status, "disabled");
}

async function testOrdinaryChangeUploadsOnce() {
  let saves = 0;
  let base = "t1";
  const controller = new AutoCloudSyncController({
    enabled: true,
    readCloud: async () => cloudExists(base),
    saveCloud: async (expected) => {
      assert.equal(expected, "t1");
      saves += 1;
      base = "t2";
      return saveOk(base);
    },
    getBaseCloudUpdatedAt: () => base,
    isOnline: () => true,
  });
  controller.notifyLocalChange("regular");
  await controller.flushNow();
  assert.equal(saves, 1);
  assert.equal(controller.getState().status, "synced");
  assert.equal(controller.getState().pending, false);
}

async function testChangesDuringUploadAreCoalesced() {
  let saves = 0;
  let base = "t1";
  let finishFirstSave: (() => void) | undefined;
  const controller = new AutoCloudSyncController({
    enabled: true,
    debounceMs: 60_000,
    readCloud: async () => cloudExists(base),
    saveCloud: async () => {
      saves += 1;
      if (saves === 1) {
        await new Promise<void>((resolve) => {
          finishFirstSave = resolve;
        });
      }
      base = saves === 1 ? "t2" : "t3";
      return saveOk(base);
    },
    getBaseCloudUpdatedAt: () => base,
    isOnline: () => true,
  });
  controller.notifyLocalChange("regular");
  const firstFlush = controller.flushNow();
  await Promise.resolve();
  await Promise.resolve();
  controller.notifyLocalChange("regular");
  finishFirstSave?.();
  await firstFlush;
  assert.equal(saves, 1);
  assert.equal(controller.getState().status, "pending");
  await controller.flushNow();
  assert.equal(saves, 2);
  assert.equal(controller.getState().status, "synced");
  controller.dispose();
}

async function testOfflinePreservesPendingWork() {
  let saves = 0;
  const controller = new AutoCloudSyncController({
    enabled: true,
    readCloud: async () => cloudExists("t1"),
    saveCloud: async () => {
      saves += 1;
      return saveOk("t2");
    },
    getBaseCloudUpdatedAt: () => "t1",
    isOnline: () => false,
  });
  controller.notifyLocalChange("regular");
  await controller.flushNow();
  assert.equal(saves, 0);
  assert.equal(controller.getState().status, "offline");
  assert.equal(controller.getState().pending, true);
}

async function testConflictStopsAutomaticSync() {
  let enabledPreference = true;
  let saves = 0;
  const controller = new AutoCloudSyncController({
    enabled: true,
    readCloud: async () => cloudExists("t2"),
    saveCloud: async () => {
      saves += 1;
      return saveOk("t3");
    },
    getBaseCloudUpdatedAt: () => "t1",
    isOnline: () => true,
    onStateChange: (state) => {
      enabledPreference = state.enabled;
    },
  });
  controller.notifyLocalChange("regular");
  await controller.flushNow();
  assert.equal(saves, 0);
  assert.equal(enabledPreference, false);
  assert.equal(controller.getState().enabled, false);
  assert.equal(controller.getState().status, "conflict");
}

async function testProtectedOperationsNeverUpload() {
  let saves = 0;
  const controller = new AutoCloudSyncController({
    enabled: true,
    readCloud: async () => cloudExists("t1"),
    saveCloud: async () => {
      saves += 1;
      return saveOk("t2");
    },
    getBaseCloudUpdatedAt: () => "t1",
    isOnline: () => true,
  });
  controller.notifyLocalChange("manual_review");
  await controller.flushNow();
  assert.equal(saves, 0);
  assert.equal(controller.getState().status, "manual_review");
  controller.notifyLocalChange("cloud_restore");
  await controller.flushNow();
  assert.equal(saves, 0);
  assert.equal(controller.getState().pending, false);
}

async function testAutomaticRetriesAreLimited() {
  let saves = 0;
  let timerId = 0;
  const activeTimers = new Set<number>();
  const controller = new AutoCloudSyncController({
    enabled: true,
    retryDelaysMs: [1, 2],
    readCloud: async () => cloudExists("t1"),
    saveCloud: async () => {
      saves += 1;
      return { ok: false, reason: "error", error: "network failed" };
    },
    getBaseCloudUpdatedAt: () => "t1",
    isOnline: () => true,
    setTimer: () => {
      timerId += 1;
      activeTimers.add(timerId);
      return timerId as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: (timer) => activeTimers.delete(timer as unknown as number),
  });
  controller.notifyLocalChange("regular");
  await controller.flushNow();
  await controller.flushNow();
  await controller.flushNow();
  assert.equal(saves, 3);
  assert.equal(controller.getState().status, "error");
  assert.equal(activeTimers.size, 0);
}

async function testPersistedManualReviewRemainsBlocked() {
  let saves = 0;
  const controller = new AutoCloudSyncController({
    enabled: true,
    initialBlockedStatus: "manual_review",
    readCloud: async () => cloudExists("t1"),
    saveCloud: async () => {
      saves += 1;
      return saveOk("t2");
    },
    getBaseCloudUpdatedAt: () => "t1",
    isOnline: () => true,
  });
  controller.notifyLocalChange("regular");
  await controller.flushNow();
  assert.equal(saves, 0);
  assert.equal(controller.getState().status, "manual_review");
}

function testCloudUpdateSafetyContract() {
  const source = readFileSync("src/data/cloudSync.ts", "utf8");
  const saveSection = source.slice(source.indexOf("export async function saveDashboardDataToCloud"), source.indexOf("export function markCloudDashboardRestored"));
  const readSection = source.slice(source.indexOf("export async function getCloudDashboardData"), source.indexOf("export async function uploadInitialDashboardData"));
  assert.match(saveSection, /\.update\(/);
  assert.doesNotMatch(saveSection, /\.insert\(/);
  assert.doesNotMatch(readSection, /persistCloudSyncMeta|recordCloudRead/);
}

function testDefaultOffUi() {
  const html = renderToStaticMarkup(
    createElement(CloudSyncPanel, {
      probe: cloudExists("t1"),
      onInitialized: () => undefined,
      onCloudCommitted: () => undefined,
      onExport: () => "{}",
      onRestore: () => undefined,
      autoSyncState: {
        enabled: false,
        status: "disabled",
        pending: false,
        retryCount: 0,
        lastSyncedAt: "",
        error: "",
      },
      onAutoSyncToggle: () => undefined,
      onAutoSyncRetry: () => undefined,
    }),
  );
  assert.match(html, /自动保存到云端（仅上传）/);
  assert.match(html, /默认关闭，仅对当前设备生效/);
  assert.match(html, /状态：已关闭/);
  assert.match(html, /aria-pressed="false"/);
}

await testDefaultOff();
await testOrdinaryChangeUploadsOnce();
await testChangesDuringUploadAreCoalesced();
await testOfflinePreservesPendingWork();
await testConflictStopsAutomaticSync();
await testProtectedOperationsNeverUpload();
await testAutomaticRetriesAreLimited();
await testPersistedManualReviewRemainsBlocked();
testCloudUpdateSafetyContract();
testDefaultOffUi();

console.log("auto cloud sync tests passed");
