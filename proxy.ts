import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Routes only ADMIN can access
const ADMIN_ONLY: string[] = []

// Routes MANAGER + ADMIN can access
const MANAGER_ADMIN = ["/laporan", "/stok", "/menu", "/diskon", "/pengaturan"]

// Routes all authenticated users can access
// (kasir, meja, kds, member, shift, dashboard, kasir are open to all roles)

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = req.auth.user?.role as string

  // Admin-only routes
  for (const route of ADMIN_ONLY) {
    if (pathname.startsWith(route) && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  // Manager + Admin routes
  for (const route of MANAGER_ADMIN) {
    if (pathname.startsWith(route) && !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.redirect(new URL("/kasir", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
}
