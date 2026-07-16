import { useState } from "react";

interface LoginPageProps {
  startupError?: string;
  onSignIn: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ startupError = "", onSignIn }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(startupError);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);
    try {
      await onSignIn(email.trim(), password);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "登录失败，请检查邮箱和密码后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <span>个人工作仪表板</span>
          <h1 id="auth-title">登录</h1>
          <p>登录后进入你的本地工作台。云端业务数据同步尚未启用。</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>
            邮箱
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="form-error auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={submitting}>
            {submitting ? "正在登录…" : "登录"}
          </button>
        </form>
      </section>
    </main>
  );
}
