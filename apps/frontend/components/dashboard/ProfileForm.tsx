"use client";

import { useState } from "react";

type Profile = { name: string; email: string; phone: string; avatarUrl: string };

export function ProfileForm({ initial }: { initial: Profile }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setMessage(response.ok ? "پروفایل با موفقیت ذخیره شد." : result.error ?? "ذخیره انجام نشد.");
    setLoading(false);
  }

  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <Field name="name" label="نام و نام خانوادگی" defaultValue={initial.name} />
    <Field name="email" label="ایمیل" defaultValue={initial.email} type="email" disabled />
    <Field name="phone" label="شماره تماس" defaultValue={initial.phone} autoComplete="tel" />
    <Field name="avatarUrl" label="آدرس تصویر پروفایل" defaultValue={initial.avatarUrl} type="url" />
    {message ? <p role="status" className="text-sm text-slate-600">{message}</p> : null}
    <button disabled={loading} className="h-11 rounded-xl bg-primary px-6 font-bold text-white disabled:opacity-60">{loading ? "در حال ذخیره..." : "ذخیره تغییرات"}</button>
  </form>;
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block text-sm font-bold text-slate-700">{label}<input required={props.name === "name"} {...props} className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-primary disabled:bg-slate-100" /></label>;
}
