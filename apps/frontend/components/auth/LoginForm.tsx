"use client";

import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiEye, FiEyeOff, FiLoader } from "react-icons/fi";
import { isAppLocale, localizePathname } from "@/i18n/config";
import { Link } from "@/i18n/navigation";

export function LoginForm({ googleEnabled, callbackUrl, verification, authError }: { googleEnabled: boolean; callbackUrl: string; verification?: string; authError?: string }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const initialAuthError = authError === "AccessDenied"
    ? t("login.errors.accessDenied")
    : authError === "OAuthAccountNotLinked"
      ? t("login.errors.accountNotLinked")
      : authError === "Configuration"
        ? t("login.errors.configuration")
        : authError
          ? t("login.errors.googleFailed")
          : "";
  const [error, setError] = useState(initialAuthError);
  const [showPassword, setShowPassword] = useState(false);
  const activeLocale = isAppLocale(locale) ? locale : "de";

  async function signInWithGoogle() {
    setGoogleLoading(true);
    setError("");

    try {
      await signIn("google", { redirectTo: localizePathname(callbackUrl, activeLocale) });
    } catch {
      setError(t("login.errors.googleFailed"));
      setGoogleLoading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    // Step 1: Check credentials and whether 2FA is needed
    const challengeResponse = await fetch("/api/auth/two-factor/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!challengeResponse.ok) {
      const result = await challengeResponse.json().catch(() => ({}));
      if (challengeResponse.status === 429) {
        setError(t("login.tooManyAttempts"));
      } else {
        setError(result.error || t("login.invalidCredentials"));
      }
      setLoading(false);
      return;
    }

    const data = await challengeResponse.json();

    if (data.twoFactorRequired) {
      // Step 2: 2FA needed — redirect to verification page
      window.location.assign(
        localizePathname(`/verify-2fa?callbackUrl=${encodeURIComponent(callbackUrl)}`, activeLocale),
      );
      return;
    }

    // No 2FA — complete sign-in normally
    const result = await signIn("credentials", {
      email,
      password,
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
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
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

      <div className="mt-6 text-center">
        <h1 className="text-3xl font-black text-slate-950">{t("login.title")}</h1>
        <p className="mt-2 text-sm font-bold text-slate-950">{t("login.description")}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {t.rich("login.terms", {
            terms: (chunks) => <a href="/terms" className="text-primary hover:underline">{chunks}</a>,
            privacy: (chunks) => <a href="/privacy" className="text-primary hover:underline">{chunks}</a>,
          })}
        </p>
      </div>
      {verification === "success" ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{t("login.emailVerified")}</p> : null}
      {verification === "invalid" ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t("login.verificationInvalid")}</p> : null}

      <div className="mt-6 space-y-3">
        <button
          type="button"
          disabled={!googleEnabled || googleLoading || loading}
          onClick={() => void signInWithGoogle()}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        >
          {googleLoading ? <FiLoader className="animate-spin text-xl" aria-hidden="true" /> : <FcGoogle className="text-xl" aria-hidden="true" />}
          {googleLoading ? t("google.redirecting") : t("google.login")}
        </button>
        {!googleEnabled ? <p className="text-xs text-amber-700">{t("google.unavailable")}</p> : null}
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        {t("divider")}
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {error ? (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
          <FiAlertCircle className="mt-0.5 shrink-0 text-xl" aria-hidden="true" />
          <div>
            <p className="text-sm font-black">{t("login.errors.title")}</p>
            <p className="mt-1 text-sm leading-6">{error}</p>
          </div>
        </div>
      ) : null}

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
          className="h-12 w-full cursor-pointer rounded-xl bg-primary font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t("login.submitting") : t("login.submit")}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-4">
        <Link href="/forgot-password" className="text-sm font-bold text-slate-600 transition hover:text-slate-900">
          {t("login.forgotPassword")}
        </Link>
        <p className="text-sm text-slate-600">
          {t("login.noAccount")}{" "}
          <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-bold text-primary transition hover:text-primary-dark">
            {t("tabs.register")}
          </Link>
        </p>
      </div>
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
