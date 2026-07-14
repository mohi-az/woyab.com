"use client";

import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { isAppLocale, localizePathname } from "@/i18n/config";
import { Link } from "@/i18n/navigation";

export function LoginForm({ googleEnabled, callbackUrl }: { googleEnabled: boolean; callbackUrl: string }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const activeLocale = isAppLocale(locale) ? locale : "de";

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
      setError(t("login.invalidCredentials"));
      setLoading(false);
      return;
    }

    window.location.assign(localizePathname(callbackUrl, activeLocale));
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        <Link
          href="/login"
          aria-current="page"
          className="rounded-[calc(1rem-4px)] bg-white px-4 py-3 text-center text-sm font-bold text-slate-950 shadow-sm"
        >
          {t("tabs.login")}
        </Link>
        <Link
          href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="rounded-[calc(1rem-4px)] px-4 py-3 text-center text-sm font-bold text-slate-500 transition hover:text-slate-900"
        >
          {t("tabs.register")}
        </Link>
      </div>

      <h1 className="mt-6 text-3xl font-black text-slate-950">{t("login.title")}</h1>
      <p className="mt-2 text-sm text-slate-500">{t("login.description")}</p>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          disabled={!googleEnabled}
          onClick={() => signIn("google", { redirectTo: localizePathname(callbackUrl, activeLocale) })}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <FcGoogle className="text-xl" aria-hidden="true" />
          {t("google.login")}
        </button>
        {!googleEnabled ? <p className="text-xs text-amber-700">{t("google.unavailable")}</p> : null}
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        {t("divider")}
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <form onSubmit={submit} className="space-y-4">
        <Field name="email" label={t("fields.email")} type="email" autoComplete="email" />
        <Field
          name="password"
          label={t("fields.password")}
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          trailingButton={{
            label: showPassword ? t("password.hide") : t("password.show"),
            onClick: () => setShowPassword((current) => !current),
            icon: showPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />,
          }}
        />
        <button
          disabled={loading}
          className="h-12 w-full rounded-xl bg-primary font-bold text-white disabled:opacity-60"
        >
          {loading ? t("login.submitting") : t("login.submit")}
        </button>
      </form>

      <Link href="/forgot-password" className="mt-4 block text-center text-sm font-bold text-primary">
        فراموشی یا تنظیم رمز عبور
      </Link>

      <p className="mt-6 text-center text-sm text-slate-600">
        {t("login.noAccount")}{" "}
        <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-bold text-primary">
          {t("tabs.register")}
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  trailingButton,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  trailingButton?: {
    label: string;
    onClick: () => void;
    icon: React.ReactNode;
  };
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <span className="mt-2 block relative">
        <input
          required
          {...inputProps}
          dir="ltr"
          lang="en"
          spellCheck={false}
          className={`h-12 w-full rounded-xl border border-slate-300 px-4 font-normal text-left outline-none focus:border-primary ${trailingButton ? "pr-12" : ""}`}
        />
        {trailingButton ? (
          <button
            type="button"
            onClick={trailingButton.onClick}
            aria-label={trailingButton.label}
            title={trailingButton.label}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 transition hover:text-slate-800"
          >
            {trailingButton.icon}
          </button>
        ) : null}
      </span>
    </label>
  );
}
