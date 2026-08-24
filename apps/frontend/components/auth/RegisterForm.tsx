"use client";

import type { RegisterInput } from "@woyab/shared";
import { registerSchema } from "@woyab/shared";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { isAppLocale, localizePathname } from "@/i18n/config";
import { Link } from "@/i18n/navigation";

type RegisterValues = RegisterInput;
type RegisterErrors = Partial<Record<keyof RegisterValues, string>>;

const passwordChecks = {
  minLength: (password: string) => password.length >= 10,
  lowercase: (password: string) => /[a-z]/.test(password),
  uppercase: (password: string) => /[A-Z]/.test(password),
  number: (password: string) => /[0-9]/.test(password),
} as const;

export function RegisterForm({ googleEnabled, callbackUrl }: { googleEnabled: boolean; callbackUrl: string }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const activeLocale = isAppLocale(locale) ? locale : "de";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [devLink, setDevLink] = useState("");
  const [values, setValues] = useState<RegisterValues>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<RegisterErrors>({});

  const rules = [
    { key: "minLength", passed: passwordChecks.minLength(values.password) },
    { key: "lowercase", passed: passwordChecks.lowercase(values.password) },
    { key: "uppercase", passed: passwordChecks.uppercase(values.password) },
    { key: "number", passed: passwordChecks.number(values.password) },
    { key: "match", passed: values.confirmPassword.length > 0 && values.password === values.confirmPassword },
  ] as const;

  function getClientErrors(nextValues: RegisterValues) {
    const nextErrors: RegisterErrors = {};

    if (nextValues.name.trim().length < 2) nextErrors.name = t("validation.nameTooShort");
    if (!nextValues.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextValues.email)) {
      nextErrors.email = t("validation.emailInvalid");
    }
    if (!passwordChecks.minLength(nextValues.password)) nextErrors.password = t("validation.passwordTooShort");
    else if (!passwordChecks.lowercase(nextValues.password)) nextErrors.password = t("validation.passwordLowercase");
    else if (!passwordChecks.uppercase(nextValues.password)) nextErrors.password = t("validation.passwordUppercase");
    else if (!passwordChecks.number(nextValues.password)) nextErrors.password = t("validation.passwordNumber");

    if (!nextValues.confirmPassword || nextValues.password !== nextValues.confirmPassword) {
      nextErrors.confirmPassword = t("validation.passwordMismatch");
    }

    return nextErrors;
  }

  function validate(nextValues: RegisterValues) {
    const parsed = registerSchema.safeParse(nextValues);
    if (parsed.success) return {};
    return getClientErrors(nextValues);
  }

  function updateField<Key extends keyof RegisterValues>(key: Key, value: RegisterValues[Key]) {
    const nextValues = { ...values, [key]: value };
    setValues(nextValues);
    setErrors(validate(nextValues));
    if (error) setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setError("");

    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, callbackUrl }),
    });
    const result = await response.json();

    if (!response.ok) {
      const serverFieldErrors: RegisterErrors = result.fields ? getClientErrors(values) : {};
      const mergedErrors = response.status === 409
        ? { ...serverFieldErrors, email: t("validation.emailExists") }
        : serverFieldErrors;
      setErrors((current) => ({ ...current, ...mergedErrors }));
      setError(result.error ?? t("register.failed"));
      setLoading(false);
      return;
    }

    setDevLink(result.devLink || "");
    setVerificationSent(true);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="rounded-[calc(1rem-4px)] px-4 py-3 text-center text-sm font-bold text-slate-500 transition hover:text-slate-900"
        >
          {t("tabs.login")}
        </Link>
        <Link
          href="/register"
          aria-current="page"
          className="rounded-[calc(1rem-4px)] bg-white px-4 py-3 text-center text-sm font-bold text-slate-950 shadow-sm"
        >
          {t("tabs.register")}
        </Link>
      </div>

      <div className="mt-6 text-center">
        <h1 className="text-3xl font-black text-slate-950">{t("register.title")}</h1>
        <p className="mt-2 text-sm font-bold text-slate-950">{t("login.description")}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {t.rich("login.terms", {
            terms: (chunks) => <a href="/terms" className="text-primary hover:underline">{chunks}</a>,
            privacy: (chunks) => <a href="/privacy" className="text-primary hover:underline">{chunks}</a>,
          })}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          disabled={!googleEnabled}
          onClick={() => signIn("google", { redirectTo: localizePathname(callbackUrl, activeLocale) })}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <FcGoogle className="text-xl" aria-hidden="true" />
          {t("google.register")}
        </button>
        {!googleEnabled ? <p className="text-xs text-amber-700">{t("google.unavailable")}</p> : null}
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        {t("divider")}
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {verificationSent ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-bold">{t("register.verificationSent")}</p>
          <p>{t("register.verificationHelp")}</p>
          {devLink ? <a href={devLink} className="block break-all font-bold underline">{devLink}</a> : null}
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="inline-flex rounded-xl bg-primary px-4 py-2 font-bold text-white">{t("tabs.login")}</Link>
        </div>
      ) : <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField
          name="name"
          label={t("fields.name")}
          value={values.name}
          onChange={(value) => updateField("name", value)}
          error={errors.name}
          autoComplete="name"
          inputMode="text"
          dir={locale === "fa" ? "ltr" : undefined}
          lang="en"
          spellCheck={false}
        />
        <TextField
          name="email"
          label={t("fields.email")}
          value={values.email}
          onChange={(value) => updateField("email", value)}
          error={errors.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          lang="en"
          spellCheck={false}
        />
        <TextField
          name="password"
          label={t("fields.password")}
          value={values.password}
          onChange={(value) => updateField("password", value)}
          error={errors.password}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          minLength={10}
          dir="ltr"
          lang="en"
          spellCheck={false}
          trailingButton={{
            label: showPassword ? t("password.hide") : t("password.show"),
            onClick: () => setShowPassword((current) => !current),
            icon: showPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />,
          }}
        />
        <TextField
          name="confirmPassword"
          label={t("fields.confirmPassword")}
          value={values.confirmPassword}
          onChange={(value) => updateField("confirmPassword", value)}
          error={errors.confirmPassword}
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          minLength={10}
          dir="ltr"
          lang="en"
          spellCheck={false}
          trailingButton={{
            label: showConfirmPassword ? t("password.hide") : t("password.show"),
            onClick: () => setShowConfirmPassword((current) => !current),
            icon: showConfirmPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />,
          }}
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-800">{t("password.title")}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {rules.map((rule) => (
              <li key={rule.key} className={rule.passed ? "text-emerald-600" : "text-slate-500"}>
                {rule.passed ? "✓" : "•"} {t(`password.rules.${rule.key}`)}
              </li>
            ))}
          </ul>
        </div>

        <button
          disabled={loading}
          className="h-12 w-full rounded-xl bg-primary font-bold text-white disabled:opacity-60"
        >
          {loading ? t("register.submitting") : t("register.submit")}
        </button>
      </form>}

      <div className="mt-8 flex flex-col items-center gap-4">
        <p className="text-sm text-slate-600">
          {t("register.haveAccount")}{" "}
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-bold text-primary transition hover:text-primary-dark">
            {t("tabs.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}

function TextField({
  label,
  error,
  value,
  onChange,
  trailingButton,
  dir,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  error?: string;
  dir?: "ltr" | "rtl";
  onChange: (value: string) => void;
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
          {...props}
          value={value}
          dir={dir}
          onChange={(event) => onChange(event.target.value)}
          className={`h-12 w-full rounded-xl border px-4 font-normal outline-none focus:border-primary ${trailingButton ? "pr-12" : ""} ${dir === "ltr" ? "text-left" : ""} ${error ? "border-red-400 bg-red-50/40" : "border-slate-300"}`}
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
      {error ? <span className="mt-2 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}
