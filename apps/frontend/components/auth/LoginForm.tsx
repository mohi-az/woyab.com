"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    if (result?.error) {
      setError("ایمیل یا رمز عبور صحیح نیست.");
      setLoading(false);
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
      <h1 className="text-3xl font-black text-slate-950">ورود به فارگو</h1>
      <p className="mt-2 text-sm text-slate-500">برای مدیریت حساب و علاقه‌مندی‌ها وارد شوید.</p>
      {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field name="email" label="ایمیل" type="email" autoComplete="email" />
        <Field name="password" label="رمز عبور" type="password" autoComplete="current-password" />
        <button disabled={loading} className="h-12 w-full rounded-xl bg-primary font-bold text-white disabled:opacity-60">
          {loading ? "در حال ورود..." : "ورود"}
        </button>
      </form>
      {googleEnabled ? (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />یا<span className="h-px flex-1 bg-slate-200" /></div>
          <button onClick={() => signIn("google", { redirectTo: "/dashboard" })} className="h-12 w-full rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50">
            ورود با Google
          </button>
        </>
      ) : null}
      <p className="mt-6 text-center text-sm text-slate-600">حساب ندارید؟ <Link href="/register" className="font-bold text-primary">ثبت‌نام</Link></p>
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return <label className="block text-sm font-bold text-slate-700">{label}<input required {...inputProps} className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-primary" /></label>;
}
