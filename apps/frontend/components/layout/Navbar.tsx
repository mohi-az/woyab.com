"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FiBriefcase, FiCheckCircle, FiChevronDown, FiGrid, FiLogIn, FiLogOut, FiMenu, FiPlusSquare, FiSettings, FiUserPlus, FiX } from "react-icons/fi";
import { FaClipboardList } from "react-icons/fa";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { stripLocalePrefix } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { CategoryIcon, FEATURED_CATEGORIES } from "@/lib/business-categories";
import { cn } from "@/lib/utils";

type ProfileOverride = { name?: string; email?: string; avatarUrl?: string };

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [directoryMenuOpen, setDirectoryMenuOpen] = useState(false);
  const [businessMenuOpen, setBusinessMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileDirectoryOpen, setMobileDirectoryOpen] = useState(false);
  const [mobileBusinessMenuOpen, setMobileBusinessMenuOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [profileOverride, setProfileOverride] = useState<ProfileOverride>({});
  const [scrolled, setScrolled] = useState(false);
  const t = useTranslations("Navbar");
  const tCategories = useTranslations("Home.categoriesSection");
  const locale = useLocale();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const internalPathname = stripLocalePrefix(pathname);
  const hasHeroOverlay =
    internalPathname === "/" ||
    internalPathname === "/businesses" ||
    internalPathname.startsWith("/businesses/");
  const isSolid = scrolled || mobileOpen;
  const isOverlay = hasHeroOverlay && !isSolid;
  const userName = profileOverride.name || session?.user?.name || session?.user?.email || t("accountMenu.fallbackName");
  const userEmail = profileOverride.email || session?.user?.email || "";
  const userAvatar = profileOverride.avatarUrl ?? session?.user?.image ?? "";

  useEffect(() => {
    const syncScrolled = () => setScrolled(window.scrollY > 12);

    syncScrolled();
    window.addEventListener("scroll", syncScrolled, { passive: true });
    return () => window.removeEventListener("scroll", syncScrolled);
  }, []);

  useEffect(() => {
    const syncProfile = (event: Event) => {
      const detail = (event as CustomEvent<ProfileOverride>).detail;
      if (detail) setProfileOverride(detail);
    };

    window.addEventListener("fargo:profile-updated", syncProfile);
    return () => window.removeEventListener("fargo:profile-updated", syncProfile);
  }, []);

  const headerClassName = cn(
    "fixed inset-x-0 top-0 z-50 transition-all duration-300",
    isSolid
      ? "border-b border-slate-200/80 bg-white/92 shadow-[0_6px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl"
      : "border-b border-transparent bg-transparent shadow-none backdrop-blur-0",
  );
  const brandTextClassName = isOverlay ? "text-white" : "text-slate-950";
  const navItemClassName = (active: boolean) =>
    cn(
      "relative py-2.5 text-sm font-bold transition-colors",
      active
        ? isOverlay
          ? "text-white"
          : "text-primary"
        : isOverlay
          ? "text-white/78 hover:text-white"
          : "text-slate-700 hover:text-primary",
    );
  const languageTriggerClassName = cn(
    "h-10 rounded-full border px-3 text-sm shadow-none transition-colors hover:text-current",
    isOverlay
      ? "border-white/15 bg-white/10 !text-white hover:bg-white/15 hover:!text-white [&_*]:!text-white"
      : "border-slate-200 bg-white text-slate-600 hover:border-primary/20 hover:bg-primary/5 hover:text-primary",
  );
  const secondaryActionClassName = cn(
    "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-all",
    isOverlay
      ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
      : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-primary/25 hover:text-primary",
  );
  const authLinkClassName = isOverlay ? "text-white/80 hover:text-white" : "text-slate-700 hover:text-primary";
  const accountLabels = {
    menu: t("accountMenu.menu"),
    settings: t("accountMenu.settings"),
    logout: t("auth.logout"),
  };

  if (internalPathname === "/add-business") {
    return (
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_6px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 lg:h-[4.75rem]">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Fargo">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-lg text-white shadow-[0_9px_22px_rgba(241,91,63,0.28)]">
              <FaClipboardList />
            </span>
            <span className="truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Fargo</span>
            <span className="hidden h-5 w-px bg-slate-200 min-[380px]:block" aria-hidden="true" />
            <span className="hidden whitespace-nowrap text-xs font-black uppercase tracking-[0.13em] text-slate-500 min-[380px]:inline sm:text-sm">{t("businessHeader.label")}</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSelector align="end" triggerClassName="h-9 rounded-full border border-slate-200 bg-white px-2 text-xs text-slate-600 shadow-sm sm:h-10 sm:px-3 sm:text-sm" />
            {status !== "loading" && (session?.user ? (
              <AccountMenu
                open={accountMenuOpen}
                onToggle={() => setAccountMenuOpen((value) => !value)}
                onClose={() => setAccountMenuOpen(false)}
                name={userName}
                email={userEmail}
                avatarUrl={userAvatar}
                locale={locale}
                labels={accountLabels}
              />
            ) : (
              <Link href="/login" className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 px-3 text-xs font-black text-slate-700 transition hover:border-primary/25 hover:text-primary sm:h-10 sm:px-4 sm:text-sm">
                <FiLogIn />
                <span className="hidden sm:inline">{t("auth.login")}</span>
              </Link>
            ))}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={headerClassName}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between lg:h-[4.75rem]">
          <Link href="/" className="flex flex-shrink-0 items-center gap-3" aria-label="Fargo">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg text-white shadow-[0_9px_22px_rgba(241,91,63,0.28)]">
              <FaClipboardList />
            </span>
            <span className={cn("text-2xl font-black tracking-tight transition-colors", brandTextClassName)}>Fargo</span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label={t("navigationLabel")}>
            <Link href="/" aria-current={internalPathname === "/" ? "page" : undefined} className={navItemClassName(internalPathname === "/")}>
              {t("nav.home")}
              <ActiveLine active={internalPathname === "/"} />
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setDirectoryMenuOpen(true)}
              onMouseLeave={() => setDirectoryMenuOpen(false)}
              onBlur={(event) => {
                if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDirectoryMenuOpen(false);
              }}
            >
              <button
                type="button"
                aria-expanded={directoryMenuOpen}
                aria-haspopup="menu"
                onClick={() => setDirectoryMenuOpen((value) => !value)}
                className={cn(navItemClassName(internalPathname.startsWith("/businesses")), "inline-flex items-center gap-1.5", isOverlay && "!text-white [&_*]:!text-white")}
              >
                {t("nav.businesses")}
                <FiChevronDown className={cn("transition-transform", directoryMenuOpen && "rotate-180")} />
              </button>
              <div className={cn("absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 transition", directoryMenuOpen ? "visible opacity-100" : "invisible opacity-0")}>
                <div className="w-[min(44rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.18)]" role="menu">
                  <div className="grid grid-cols-3 gap-0.5">
                    {FEATURED_CATEGORIES.map((category) => (
                      <Link
                        key={category.dbId}
                        href={`/businesses?categoryId=${category.dbId}`}
                        role="menuitem"
                        onClick={() => setDirectoryMenuOpen(false)}
                        className="group flex min-h-12 items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-slate-100 hover:text-primary"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center text-xl text-slate-700 transition group-hover:text-primary">
                          <CategoryIcon iconKey={category.iconKey} categorySlug={category.slug} />
                        </span>
                        <span className="text-sm font-bold leading-5">{tCategories(`items.${category.labelKey}`)}</span>
                      </Link>
                    ))}
                    <Link href="/businesses" role="menuitem" onClick={() => setDirectoryMenuOpen(false)} className="group flex min-h-12 items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-slate-100 hover:text-primary">
                      <span className="grid h-8 w-8 shrink-0 place-items-center text-xl text-slate-700 transition group-hover:text-primary"><FiGrid /></span>
                      <span className="text-sm font-bold leading-5">{t("nav.allBusinesses")}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="relative"
              onMouseEnter={() => setBusinessMenuOpen(true)}
              onMouseLeave={() => setBusinessMenuOpen(false)}
              onBlur={(event) => {
                if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setBusinessMenuOpen(false);
              }}
            >
              <button
                type="button"
                aria-expanded={businessMenuOpen}
                aria-haspopup="menu"
                onClick={() => setBusinessMenuOpen((value) => !value)}
                className={cn(navItemClassName(false), "inline-flex items-center gap-1.5", isOverlay && "!text-white [&_*]:!text-white")}
              >
                {t("businessMenu.label")}
                <FiChevronDown className={cn("transition-transform", businessMenuOpen && "rotate-180")} />
              </button>
              <div className={cn("absolute top-full z-50 pt-3 ltr:left-0 rtl:right-0", businessMenuOpen ? "visible opacity-100" : "invisible opacity-0")}>
                <div className="w-72 rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-[0_22px_60px_rgba(15,23,42,0.18)]" role="menu">
                  <Link href="/add-business?intent=add" role="menuitem" onClick={() => setBusinessMenuOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 font-bold transition hover:bg-slate-100 hover:text-primary">
                    <span className="grid h-8 w-8 shrink-0 place-items-center text-xl text-primary"><FiPlusSquare /></span>
                    <span className="text-sm font-black">{t("businessMenu.addBusiness")}</span>
                  </Link>
                  <Link href="/add-business?intent=claim" role="menuitem" onClick={() => setBusinessMenuOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 font-bold transition hover:bg-slate-100 hover:text-primary">
                    <span className="grid h-8 w-8 shrink-0 place-items-center text-xl text-primary"><FiCheckCircle /></span>
                    <span className="text-sm font-black">{t("businessMenu.claimBusinessFree")}</span>
                  </Link>
                  <Link href={`/login?callbackUrl=${encodeURIComponent("/dashboard")}`} role="menuitem" onClick={() => setBusinessMenuOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 font-bold transition hover:bg-slate-100 hover:text-primary">
                    <span className="grid h-8 w-8 shrink-0 place-items-center text-xl text-primary"><FiLogIn /></span>
                    <span className="text-sm font-black">{t("businessMenu.businessLogin")}</span>
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSelector triggerClassName={languageTriggerClassName} />
            {status !== "loading" && (session?.user ? (
              <>
                <Link href="/dashboard" className={secondaryActionClassName}>
                  <FiGrid className="text-base" />
                  {t("auth.dashboard")}
                </Link>
                <AccountMenu
                  open={accountMenuOpen}
                  onToggle={() => setAccountMenuOpen((value) => !value)}
                  onClose={() => setAccountMenuOpen(false)}
                  name={userName}
                  email={userEmail}
                  avatarUrl={userAvatar}
                  locale={locale}
                  labels={accountLabels}
                  overlay={isOverlay}
                />
              </>
            ) : (
              <>
                <Link href="/login" className={cn("inline-flex items-center gap-2 text-sm font-bold transition-colors", authLinkClassName)}>
                  <FiLogIn className="text-base" />
                  {t("auth.login")}
                </Link>
                <Link href="/register" className={secondaryActionClassName}>
                  <FiUserPlus className="text-base" />
                  {t("auth.register")}
                </Link>
              </>
            ))}
          </div>

          <button
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors lg:hidden",
              isOverlay ? "border-white/15 bg-white/10 text-white" : "border-slate-200 bg-white text-slate-800 shadow-sm",
            )}
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={t("toggleNavigation")}
          >
            {mobileOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
          </button>
        </div>

        {mobileOpen ? (
          <nav className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200/70 py-4 lg:hidden" aria-label={t("navigationLabel")}>
            <div className="flex flex-col gap-1.5">
              <Link href="/" className="flex items-center justify-between rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-primary/5 hover:text-primary" onClick={() => setMobileOpen(false)}>
                {t("nav.home")}
              </Link>

              <button type="button" aria-expanded={mobileDirectoryOpen} onClick={() => setMobileDirectoryOpen((value) => !value)} className="flex w-full items-center justify-between rounded-xl px-4 py-3 font-bold text-slate-700 hover:bg-primary/5 hover:text-primary">
                <span>{t("nav.businesses")}</span>
                <FiChevronDown className={cn("transition-transform", mobileDirectoryOpen && "rotate-180")} />
              </button>
              {mobileDirectoryOpen ? (
                <div className="mx-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                  <div className="grid grid-cols-2 gap-1">
                    {FEATURED_CATEGORIES.map((category) => (
                      <Link key={category.dbId} href={`/businesses?categoryId=${category.dbId}`} onClick={() => setMobileOpen(false)} className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-xs font-bold leading-4 text-slate-700 transition hover:bg-primary/5 hover:text-primary">
                        <CategoryIcon iconKey={category.iconKey} categorySlug={category.slug} className="shrink-0 text-lg text-primary" />
                        <span>{tCategories(`items.${category.labelKey}`)}</span>
                      </Link>
                    ))}
                    <Link href="/businesses" onClick={() => setMobileOpen(false)} className="col-span-2 flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-primary/5 hover:text-primary">
                      <FiGrid className="shrink-0 text-lg text-primary" />
                      <span>{t("nav.allBusinesses")}</span>
                    </Link>
                  </div>
                </div>
              ) : null}

              <button type="button" aria-expanded={mobileBusinessMenuOpen} onClick={() => setMobileBusinessMenuOpen((value) => !value)} className="flex w-full items-center justify-between rounded-xl px-4 py-3 font-bold text-slate-700 hover:bg-primary/5 hover:text-primary">
                <span className="inline-flex items-center gap-3 font-medium"><FiBriefcase />{t("businessMenu.label")}</span>
                <FiChevronDown className={cn("transition-transform", mobileBusinessMenuOpen && "rotate-180")} />
              </button>
              {mobileBusinessMenuOpen ? (
                <div className="mx-3 grid gap-1 rounded-2xl bg-slate-50 p-2">
                  <Link href="/add-business?intent=add" className="flex min-h-11 items-center gap-3 rounded-xl bg-white px-3 py-2 font-bold text-slate-700 hover:bg-primary/5 hover:text-primary" onClick={() => setMobileOpen(false)}>
                    <FiPlusSquare className="text-lg text-primary" />
                    <span>{t("businessMenu.addBusiness")}</span>
                  </Link>
                  <Link href="/add-business?intent=claim" className="flex min-h-11 items-center gap-3 rounded-xl bg-white px-3 py-2 font-bold text-slate-700 hover:bg-primary/5 hover:text-primary" onClick={() => setMobileOpen(false)}>
                    <FiCheckCircle className="text-lg text-primary" />
                    <span>{t("businessMenu.claimBusinessFree")}</span>
                  </Link>
                  <Link href={`/login?callbackUrl=${encodeURIComponent("/dashboard")}`} className="flex min-h-11 items-center gap-3 rounded-xl bg-white px-3 py-2 font-bold text-slate-700 hover:bg-primary/5 hover:text-primary" onClick={() => setMobileOpen(false)}>
                    <FiLogIn className="text-lg text-primary" />
                    <span>{t("businessMenu.businessLogin")}</span>
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="mt-4 border-t border-slate-100 px-4 pt-4">
              {session?.user ? (
                <div className="space-y-3">
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 font-bold text-slate-700">
                    <FiGrid className="text-base" />
                    {t("auth.dashboard")}
                  </Link>
                  <MobileAccountMenu
                    open={mobileAccountOpen}
                    onToggle={() => setMobileAccountOpen((value) => !value)}
                    onClose={() => {
                      setMobileAccountOpen(false);
                      setMobileOpen(false);
                    }}
                    name={userName}
                    email={userEmail}
                    avatarUrl={userAvatar}
                    locale={locale}
                    labels={accountLabels}
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 font-bold text-slate-700"><FiLogIn />{t("auth.login")}</Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 font-bold text-slate-700"><FiUserPlus />{t("auth.register")}</Link>
                </div>
              )}
              <div className={`mt-3 flex ${locale === "fa" ? "justify-end" : "justify-start"}`}>
                <LanguageSelector align="start" triggerClassName="h-10 rounded-full border border-slate-200 bg-white px-3 text-slate-600" />
              </div>
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}

function ActiveLine({ active }: { active: boolean }) {
  return <span className={cn("absolute inset-x-0 -bottom-0.5 mx-auto h-0.5 rounded-full bg-primary transition-all", active ? "w-full" : "w-0")} />;
}

type AccountMenuProps = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  name: string;
  email: string;
  avatarUrl: string;
  locale: string;
  labels: { menu: string; settings: string; logout: string };
  overlay?: boolean;
};

function AccountMenu({ open, onToggle, onClose, name, email, avatarUrl, locale, labels, overlay = false }: AccountMenuProps) {
  return (
    <div className="relative" onBlur={(event) => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) onClose();
    }}>
      <button type="button" aria-expanded={open} aria-haspopup="menu" aria-label={labels.menu} onClick={onToggle} className={cn("flex h-10 items-center gap-1.5 rounded-full border p-1 pe-2 transition", overlay ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-primary/30")}>
        <UserAvatar name={name} avatarUrl={avatarUrl} />
        <FiChevronDown className={cn("text-sm transition-transform", open && "rotate-180")} />
      </button>
      <div className={cn("absolute top-full z-[70] mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-[0_22px_60px_rgba(15,23,42,0.2)] ltr:right-0 rtl:left-0", open ? "visible opacity-100" : "invisible opacity-0")} role="menu">
        <div className="border-b border-slate-100 px-3 py-3">
          <p className="truncate text-sm font-black text-slate-950">{name}</p>
          {email ? <p className="mt-1 truncate text-xs text-slate-500" dir="ltr">{email}</p> : null}
        </div>
        <Link href="/dashboard/profile" role="menuitem" onClick={onClose} className="mt-1 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition hover:bg-slate-100 hover:text-primary">
          <FiSettings className="text-lg" />{labels.settings}
        </Link>
        <button type="button" role="menuitem" onClick={() => {
          onClose();
          void signOut({ redirectTo: `/${locale}` });
        }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50">
          <FiLogOut className="text-lg" />{labels.logout}
        </button>
      </div>
    </div>
  );
}

function MobileAccountMenu({ open, onToggle, onClose, name, email, avatarUrl, locale, labels }: AccountMenuProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-14 w-full items-center gap-3 px-3 text-start">
        <UserAvatar name={name} avatarUrl={avatarUrl} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-slate-950">{name}</span>
          {email ? <span className="mt-0.5 block truncate text-xs text-slate-500" dir="ltr">{email}</span> : null}
        </span>
        <FiChevronDown className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="grid gap-1 border-t border-slate-100 p-2">
          <Link href="/dashboard/profile" onClick={onClose} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-primary"><FiSettings />{labels.settings}</Link>
          <button type="button" onClick={() => {
            onClose();
            void signOut({ redirectTo: `/${locale}` });
          }} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-rose-600 hover:bg-rose-50"><FiLogOut />{labels.logout}</button>
        </div>
      ) : null}
    </div>
  );
}

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "F";
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-sm font-black text-primary ring-1 ring-white/70">
      {avatarUrl ? <span className="block h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${avatarUrl})` }} aria-label={name} /> : initial}
    </span>
  );
}
