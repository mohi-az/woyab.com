import { NextResponse } from "next/server";

// میدل‌ویر صفحات محافظت‌شده
// در حال حاضر همه درخواست‌ها عبور می‌کنند
export function middleware() {
  return NextResponse.next();
}

export const config = {
  // مسیرهایی که میدل‌ویر روی آنها اجرا می‌شود
  matcher: ["/dashboard/:path*", "/vendor/:path*", "/profile/:path*"],
};
