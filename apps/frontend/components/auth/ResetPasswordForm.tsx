"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { FiEye, FiEyeOff, FiCheck, FiX } from "react-icons/fi";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasMinLength = password.length >= 10;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isMatch = password === confirmPassword && password.length > 0;

  const isValid = hasMinLength && hasLower && hasUpper && hasNumber && isMatch;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) {
      setMessage("لطفاً تمامی قوانین رمز عبور را رعایت کنید.");
      return;
    }
    
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    const result = await response.json();
    setSuccess(response.ok);
    
    if (response.ok) {
      setMessage("رمز با موفقیت تنظیم شد. حالا می‌توانید وارد شوید.");
    } else {
      // Handle known English errors and show Persian messages instead
      if (result.error === "Please check the submitted fields.") {
        setMessage("اطلاعات وارد شده نامعتبر است. قوانین رمز را بررسی کنید.");
      } else if (result.error === "This password reset link is invalid or expired.") {
        setMessage("این لینک منقضی یا نامعتبر است. لطفاً دوباره درخواست دهید.");
      } else {
        setMessage(result.error ?? "تنظیم رمز انجام نشد.");
      }
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
      <h1 className="text-3xl font-black text-slate-950">تنظیم رمز جدید</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">رمز عبور قدرتمندی برای حساب خود انتخاب کنید.</p>
      
      <PasswordInput name="password" label="رمز جدید" value={password} onChange={setPassword} />
      <PasswordInput name="confirmPassword" label="تکرار رمز جدید" value={confirmPassword} onChange={setConfirmPassword} />
      
      <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-sm font-medium">
        <Rule passed={hasMinLength} text="حداقل ۱۰ کاراکتر" />
        <Rule passed={hasLower} text="حداقل یک حرف کوچک انگلیسی (a-z)" />
        <Rule passed={hasUpper} text="حداقل یک حرف بزرگ انگلیسی (A-Z)" />
        <Rule passed={hasNumber} text="حداقل یک عدد (0-9)" />
        <Rule passed={isMatch} text="تکرار رمز عبور یکسان است" />
      </div>

      {message ? <p className={`mt-4 rounded-xl p-3 text-sm ${success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message}</p> : null}
      
      {success ? <Link href="/login" className="mt-5 flex h-12 items-center justify-center rounded-xl bg-primary font-bold text-white transition hover:opacity-90">رفتن به ورود</Link> : (
        <button disabled={loading || !token || !isValid} className="mt-5 h-12 w-full rounded-xl bg-primary font-bold text-white transition disabled:opacity-60 hover:opacity-90">
          {loading ? "در حال ذخیره..." : "ذخیره رمز جدید"}
        </button>
      )}
    </form>
  );
}

function PasswordInput({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <label className="mt-5 block text-sm font-bold text-slate-700">
      {label}
      <div className="relative mt-2">
        <input 
          required 
          name={name} 
          type={show ? "text" : "password"} 
          autoComplete="new-password" 
          dir="ltr" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-xl border border-slate-300 px-4 pr-12 text-left outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition" 
        />
        <button 
          type="button" 
          onClick={() => setShow(!show)} 
          className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-primary transition"
        >
          {show ? <FiEyeOff size={20} /> : <FiEye size={20} />}
        </button>
      </div>
    </label>
  );
}

function Rule({ passed, text }: { passed: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 transition-colors ${passed ? "text-emerald-600" : "text-slate-500"}`}>
      {passed ? <FiCheck className="shrink-0" /> : <FiX className="shrink-0 opacity-50" />}
      <span>{text}</span>
    </div>
  );
}
