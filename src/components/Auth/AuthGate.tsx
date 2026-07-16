import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getCloudSyncMeta,
  getCloudDashboardData,
  type CloudDashboardProbeResult,
  type CloudDashboardRecord,
} from "../../data/cloudSync";
import { supabase } from "../../lib/supabase";
import { LoginPage } from "./LoginPage";

export interface AuthenticatedCloudContext {
  onSignOut: () => Promise<void>;
  cloudProbe: CloudDashboardProbeResult;
  onCloudInitialized: (record: CloudDashboardRecord) => void;
}

interface AuthGateProps {
  children: (context: AuthenticatedCloudContext) => ReactNode;
}

type CloudProbeState = { status: "idle" | "checking" } | CloudDashboardProbeResult;

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState("");
  const [cloudProbe, setCloudProbe] = useState<CloudProbeState>({ status: "idle" });

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(data.session);
      setStartupError(error?.message || "");
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setStartupError("");
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setCloudProbe({ status: "idle" });
      return;
    }

    let active = true;
    setCloudProbe({ status: "checking" });
    void getCloudDashboardData().then((result) => {
      if (active) setCloudProbe(result);
    });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  async function signIn(email: string, password: string) {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) window.alert(`退出登录失败：${error.message}`);
  }

  if (loading || (session && (cloudProbe.status === "idle" || cloudProbe.status === "checking"))) {
    return (
      <main className="auth-shell auth-loading" aria-live="polite">
        <p>{loading ? "正在检查登录状态…" : "正在检查云端数据…"}</p>
      </main>
    );
  }

  if (!session) return <LoginPage startupError={startupError} onSignIn={signIn} />;

  const resolvedCloudProbe = cloudProbe as CloudDashboardProbeResult;

  return (
    <>
      {import.meta.env.DEV && <CloudProbeDebugStatus result={resolvedCloudProbe} />}
      {children({
        onSignOut: signOut,
        cloudProbe: resolvedCloudProbe,
        onCloudInitialized: (record) => setCloudProbe({ status: "cloud_exists", cloudExists: true, record }),
      })}
    </>
  );
}

function CloudProbeDebugStatus({ result }: { result: CloudDashboardProbeResult }) {
  const label = result.status === "cloud_exists" ? "云端已有数据" : result.status === "cloud_empty" ? "云端暂无数据" : "云端读取失败";
  const title = result.status === "error" ? result.error : undefined;
  const lastSavedAt = result.status === "cloud_exists" ? getCloudSyncMeta()?.lastSyncAt : "";
  const savedLabel = lastSavedAt ? ` · 最近保存 ${formatCloudStatusTime(lastSavedAt)}` : "";
  return <div className={`cloud-probe-debug ${result.status}`} title={title}>云同步状态：{label}{savedLabel}</div>;
}

function formatCloudStatusTime(value: string): string {
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
