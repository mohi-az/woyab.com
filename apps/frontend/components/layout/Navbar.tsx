"use client";

import { useState } from "react";
import Link from "next/link";
import { FiChevronDown, FiMenu, FiX, FiGlobe, FiUser } from "react-icons/fi";
import { FaClipboardList } from "react-icons/fa";
import { NAV_LINKS } from "@/constants";
import { Button } from "@/components/ui/Button";

/**
 * نوار ناوبری اصلی - Sticky در بالای صفحه
 * شامل لوگو، لینک‌های ناوبری، انتخاب زبان، و دکمه‌های User/Vendor
 */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between lg:h-20">

          {/* لوگو */}
          <Link href="/" className="flex flex-shrink-0 items-center gap-2">
            <FaClipboardList className="text-primary text-2xl" />
            <span className="text-xl font-bold tracking-tight text-primary">Fargo</span>
          </Link>

          {/* ناوبری دسکتاپ */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {NAV_LINKS.map((link) =>
              link.hasDropdown ? (
                <div key={link.href} className="dropdown dropdown-hover">
                  <div
                    tabIndex={0}
                    role="button"
                    className="btn btn-ghost btn-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5"
                  >
                    {link.label}
                    <FiChevronDown className="text-xs opacity-60" />
                  </div>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-50 menu mt-1 w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-xl"
                  >
                    {link.children?.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className="rounded-lg text-gray-700 hover:text-primary hover:bg-primary/5"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="btn btn-ghost btn-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* اکشن‌های سمت راست - دسکتاپ */}
          <div className="hidden items-center gap-2 lg:flex">
            {/* سوئیچ زبان */}
            <button className="btn btn-ghost btn-sm gap-1.5 font-medium text-gray-600 hover:text-primary">
              <FiGlobe className="text-base" />
              English
            </button>

            {/* دراپ‌داون کاربر */}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button">
                <Button variant="outlined" size="sm" className="gap-1.5 rounded-full border-primary px-5">
                  <FiUser className="text-sm" />
                  User
                  <FiChevronDown className="text-xs opacity-70" />
                </Button>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content z-50 menu mt-2 w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-xl"
              >
                <li><Link href="/login" className="rounded-lg hover:text-primary">Login</Link></li>
                <li><Link href="/register" className="rounded-lg hover:text-primary">Register</Link></li>
                <li><Link href="/profile" className="rounded-lg hover:text-primary">My Profile</Link></li>
              </ul>
            </div>

            {/* دراپ‌داون فروشنده */}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button">
                <Button variant="primary" size="sm" className="gap-1.5 rounded-full px-5">
                  Vendor
                  <FiChevronDown className="text-xs opacity-80" />
                </Button>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content z-50 menu mt-2 w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-xl"
              >
                <li><Link href="/vendor/register" className="rounded-lg hover:text-primary">Become a Vendor</Link></li>
                <li><Link href="/vendor/login" className="rounded-lg hover:text-primary">Vendor Login</Link></li>
                <li><Link href="/vendor/dashboard" className="rounded-lg hover:text-primary">Dashboard</Link></li>
              </ul>
            </div>
          </div>

          {/* دکمه منوی موبایل */}
          <button
            className="btn btn-ghost btn-square btn-sm lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
          </button>
        </div>

        {/* ناوبری موبایل */}
        {mobileOpen && (
          <nav className="border-t border-gray-100 py-4 lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-gray-700 hover:bg-primary/5 hover:text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="font-medium">{link.label}</span>
                  {link.hasDropdown && <FiChevronDown className="text-gray-400 text-sm" />}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
              <Button variant="outlined" size="sm" className="flex-1 rounded-full border-primary">
                <FiUser className="text-sm" />
                User
              </Button>
              <Button variant="primary" size="sm" className="flex-1 rounded-full">
                Vendor
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
