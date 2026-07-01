"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form);
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "ثبت‌نام انجام نشد.");
      setLoading(false);
      return;
    }
    const login = await signIn("credentials", { email: body.email, password: body.password, redirect: false });
    if (login?.error) window.location.assign("/login");
    else window.location.assign("/dashboard");
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
      <h1 className="text-3xl font-black text-slate-950">ساخت حساب کاربری</h1>
      <p className="mt-2 text-sm text-slate-500">رمز عبور باید حداقل ۱۰ کاراکتر و شامل حروف کوچک، بزرگ و عدد باشد.</p>
      {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input name="name" label="نام و نام خانوادگی" autoComplete="name" />
        <Input name="email" label="ایمیل" type="email" autoComplete="email" />
        <Input name="password" label="رمز عبور" type="password" autoComplete="new-password" minLength={10} />
        <Input name="confirmPassword" label="تکرار رمز عبور" type="password" autoComplete="new-password" minLength={10} />
        <button disabled={loading} className="h-12 w-full rounded-xl bg-primary font-bold text-white disabled:opacity-60">{loading ? "در حال ساخت حساب..." : "ثبت‌نام"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">قبلاً ثبت‌نام کرده‌اید؟ <Link href="/login" className="font-bold text-primary">ورود</Link></p>
    </div>
  );
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block text-sm font-bold text-slate-700">{label}<input required {...props} className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-primary" /></label>;
}
