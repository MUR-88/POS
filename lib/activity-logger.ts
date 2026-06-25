import { prisma } from "@/lib/prisma"

export interface ActivityLogInput {
  userId?: string
  userEmail?: string
  userName?: string
  userRole?: string
  action: string
  resource: string
  resourceId?: string
  details?: object
  ipAddress?: string
  userAgent?: string
  method?: string
  path?: string
  statusCode?: number
  duration?: number
}

export function logActivity(data: ActivityLogInput) {
  prisma.activityLog
    .create({
      data: {
        ...data,
        details: data.details ? JSON.stringify(data.details) : undefined,
      },
    })
    .catch(() => {})
}

export function getClientInfo(req: Request) {
  const headers = req instanceof Request ? req.headers : new Headers()
  const forwarded = headers.get("x-forwarded-for")
  const ipAddress = forwarded ? forwarded.split(",")[0].trim() : headers.get("x-real-ip") ?? undefined
  const userAgent = headers.get("user-agent") ?? undefined
  return { ipAddress, userAgent }
}
