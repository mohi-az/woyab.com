"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function AdminTwoFactorSetup({ enabled }: { enabled: boolean }) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function start(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/admin/two-factor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = await response.json();
    if (response.ok) {
      setSecret(result.secret);
      setUri(result.uri);
    } else setMessage(result.error || "Setup could not be started.");
    setPending(false);
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/admin/two-factor", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Code could not be verified.");
      setPending(false);
      return;
    }
    await signOut({ redirectTo: "/login?twoFactor=enabled&callbackUrl=/admin" });
  }

  if (enabled) {
    return <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">Two-factor authentication is enabled. Sign in with your authenticator code to enter the admin panel.</p>;
  }

  return (
    <div className="space-y-5">
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        Two-factor authentication is mandatory for administrators. Google sign-in cannot be used for administrator accounts.
      </p>
      {!secret ? (
        <form onSubmit={start} className="space-y-4 rounded-2xl border bg-white p-6">
          <label className="block text-sm font-bold">Current password
            <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full rounded-xl border px-4" />
          </label>
          <button disabled={pending} className="rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-60">Start secure setup</button>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-4 rounded-2xl border bg-white p-6">
          <p className="text-sm leading-6">Add this secret to Google Authenticator, 1Password, Authy or another TOTP app:</p>
          <code className="block break-all rounded-xl bg-slate-100 p-4 font-bold" dir="ltr">{secret}</code>
          <details className="text-sm"><summary className="cursor-pointer font-bold">Authenticator URI</summary><code className="mt-2 block break-all rounded bg-slate-100 p-3" dir="ltr">{uri}</code></details>
          <label className="block text-sm font-bold">Six-digit code
            <input inputMode="numeric" pattern="[0-9]{6}" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 h-12 w-full rounded-xl border px-4 text-left tracking-[0.4em]" dir="ltr" />
          </label>
          <button disabled={pending} className="rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-60">Enable two-factor authentication</button>
        </form>
      )}
      {message ? <p className="text-sm text-red-700">{message}</p> : null}
    </div>
  );
}
