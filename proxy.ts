import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Routes only SUPER_ADMIN can access
const SUPER_ADMIN_ONLY = ["/superadmin"]

// Routes MANAGER + ADMIN (+ SUPER_ADMIN) can access
const MANAGER_ADMIN = ["/laporan", "/stok", "/menu", "/diskon", "/pengaturan"]

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = req.auth.user?.role as string

  // Super Admin exclusive routes
  for (const route of SUPER_ADMIN_ONLY) {
    if (pathname.startsWith(route) && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  // Manager + Admin routes (SUPER_ADMIN bypasses all restrictions)
  if (role !== "SUPER_ADMIN") {
    for (const route of MANAGER_ADMIN) {
      if (pathname.startsWith(route) && !["ADMIN", "MANAGER"].includes(role)) {
        return NextResponse.redirect(new URL("/kasir", req.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
}
