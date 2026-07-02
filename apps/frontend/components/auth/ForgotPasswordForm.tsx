"use client";

import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setDevLink("");
    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    setMessage("اگر حسابی با این ایمیل وجود داشته باشد، لینک تنظیم رمز برایتان ارسال شد.");
    if (result.devLink) setDevLink(result.devLink);
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
      <h1 className="text-3xl font-black text-slate-950">فراموشی یا تنظیم رمز</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">ایمیل حساب را وارد کنید تا لینک امن و یک‌بارمصرف برای تنظیم رمز ارسال شود.</p>
      <label className="mt-6 block text-sm font-bold text-slate-700">
        ایمیل
        <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" dir="ltr" className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-left outline-none focus:border-primary" />
      </label>
      {message ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p> : null}
      {devLink ? <a href={devLink} className="mt-3 block break-all text-sm font-bold text-primary">{devLink}</a> : null}
      <button disabled={loading} className="mt-5 h-12 w-full rounded-xl bg-primary font-bold text-white disabled:opacity-60">
        {loading ? "در حال ارسال..." : "ارسال لینک تنظیم رمز"}
      </button>
    </form>
  );
}
