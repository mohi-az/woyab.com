"use client";

import Link from "next/link";
import { useState } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password: form.get("password"),
        confirmPassword: form.get("confirmPassword"),
      }),
    });
    const result = await response.json();
    setSuccess(response.ok);
    setMessage(response.ok ? "رمز با موفقیت تنظیم شد. حالا می‌توانید وارد شوید." : result.error ?? "تنظیم رمز انجام نشد.");
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
      <h1 className="text-3xl font-black text-slate-950">تنظیم رمز جدید</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">رمز جدید باید حداقل ۱۰ کاراکتر و شامل حرف کوچک، حرف بزرگ و عدد باشد.</p>
      <Password name="password" label="رمز جدید" />
      <Password name="confirmPassword" label="تکرار رمز جدید" />
      {message ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p> : null}
      {success ? <Link href="/login" className="mt-5 flex h-12 items-center justify-center rounded-xl bg-primary font-bold text-white">رفتن به ورود</Link> : (
        <button disabled={loading || !token} className="mt-5 h-12 w-full rounded-xl bg-primary font-bold text-white disabled:opacity-60">
          {loading ? "در حال ذخیره..." : "ذخیره رمز جدید"}
        </button>
      )}
    </form>
  );
}

function Password({ name, label }: { name: string; label: string }) {
  return (
    <label className="mt-5 block text-sm font-bold text-slate-700">
      {label}
      <input required name={name} type="password" autoComplete="new-password" dir="ltr" className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-left outline-none focus:border-primary" />
    </label>
  );
}
