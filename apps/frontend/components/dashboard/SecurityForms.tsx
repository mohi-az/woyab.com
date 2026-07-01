"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function SecurityForms({ hasPassword }: { hasPassword: boolean }) {
  const [message, setMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/account/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "تغییر رمز انجام نشد.");
    setMessage("رمز تغییر کرد؛ همه نشست‌ها بسته شدند.");
    setTimeout(() => signOut({ redirectTo: "/login" }), 900);
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
    <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black">تغییر رمز عبور</h2>
      {hasPassword ? <><Password name="currentPassword" label="رمز فعلی" /><Password name="newPassword" label="رمز جدید" /><Password name="confirmPassword" label="تکرار رمز جدید" />{message ? <p className="text-sm text-slate-600">{message}</p> : null}<button className="rounded-xl bg-primary px-5 py-3 font-bold text-white">تغییر رمز و خروج از همه دستگاه‌ها</button></> : <p className="text-sm text-slate-600">این حساب با Google ساخته شده و رمز محلی ندارد.</p>}
    </form>
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
  return <label className="block text-sm font-bold">{label}<input required name={name} type="password" autoComplete={name === "currentPassword" ? "current-password" : "new-password"} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>;
}
