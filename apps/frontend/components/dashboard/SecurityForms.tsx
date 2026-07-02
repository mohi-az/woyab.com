"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function SecurityForms({ hasPassword }: { hasPassword: boolean }) {
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");

  async function requestPasswordLink() {
    setLoading(true);
    setMessage("");
    setDevLink("");
    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = await response.json();
    setMessage("لینک امن تنظیم رمز برای ایمیل حساب شما ارسال شد.");
    if (result.devLink) setDevLink(result.devLink);
    setLoading(false);
  }

  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("حذف حساب دائمی است. ادامه می‌دهید؟")) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) return setDeleteMessage(result.error ?? "حذف حساب انجام نشد.");
    await signOut({ redirectTo: "/" });
  }

  return <div className="space-y-6">
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black">رمز عبور</h2>
      <p className="text-sm leading-6 text-slate-600">
        {hasPassword
          ? "برای تغییر رمز، لینک امن و یک‌بارمصرف به ایمیل شما ارسال می‌شود."
          : "این حساب با Google ساخته شده است. اگر بخواهید، می‌توانید با تأیید ایمیل یک رمز محلی هم برای ورود با ایمیل و رمز بسازید."}
      </p>
      {message ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p> : null}
      {devLink ? <a href={devLink} className="block break-all text-sm font-bold text-primary">{devLink}</a> : null}
      <button type="button" onClick={requestPasswordLink} disabled={loading} className="rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-60">
        {loading ? "در حال ارسال..." : hasPassword ? "ارسال لینک تغییر رمز" : "ارسال لینک ساخت رمز"}
      </button>
    </section>
    <form onSubmit={deleteAccount} className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-black text-red-800">حذف حساب</h2>
      <p className="text-sm text-red-700">این کار دائمی است و اطلاعات وابسته حساب نیز حذف می‌شود.</p>
      {hasPassword ? <Password name="password" label="برای تأیید، رمز فعلی را وارد کنید" /> : <label className="block text-sm font-bold text-red-800">برای تأیید DELETE بنویسید<input required name="confirmation" className="mt-2 h-11 w-full rounded-xl border border-red-300 px-3" /></label>}
      {deleteMessage ? <p className="text-sm text-red-700">{deleteMessage}</p> : null}
      <button className="rounded-xl bg-red-700 px-5 py-3 font-bold text-white">حذف دائمی حساب</button>
    </form>
  </div>;
}

function Password({ name, label }: { name: string; label: string }) {
  return <label className="block text-sm font-bold">{label}<input required name={name} type="password" autoComplete="current-password" className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>;
}
