import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-logger'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { randomUUID } from 'crypto'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  trustHost: true,
  providers: [
    Credentials({
      async authorize(credentials, req) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(6),
        }).safeParse(credentials)

        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, name: true, email: true, password: true, role: true, isActive: true, sessionTimeoutMins: true },
        })

        if (!user || !user.isActive) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null

        // Get session timeout setting
        const globalSetting = await prisma.setting.findUnique({ where: { key: 'session_timeout_mins' } })
        const timeoutMins = user.sessionTimeoutMins ?? parseInt(globalSetting?.value ?? '120')
        const expiresAt = new Date(Date.now() + timeoutMins * 60 * 1000)
        const sessionToken = randomUUID()

        // Read headers correctly — req is a Request object, headers use .get()
        const ua = (req as any)?.headers?.get?.('user-agent') ?? undefined
        const ip = (req as any)?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined

        // Critical: save session token to DB — login still succeeds even if this fails
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { currentSessionToken: sessionToken },
          })
        } catch {
          // DB error: session validation won't work but login proceeds
        }

        // Fire-and-forget: session record tracking & cleanup
        prisma.userSession.updateMany({
          where: { userId: user.id, isActive: true },
          data: { isActive: false },
        }).catch(() => {})

        prisma.userSession.create({
          data: { userId: user.id, sessionToken, expiresAt, isActive: true, deviceInfo: ua, ipAddress: ip },
        }).catch(() => {})

        logActivity({
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          userRole: user.role,
          action: 'LOGIN',
          resource: 'auth',
          details: { timeoutMins },
          ipAddress: ip,
          userAgent: ua,
        })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionToken,
          sessionTimeoutMins: timeoutMins,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
        token.sessionToken = (user as any).sessionToken
        const timeoutMins: number = (user as any).sessionTimeoutMins ?? 120
        token.exp = Math.floor(Date.now() / 1000) + timeoutMins * 60
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.role = token.role as any
        session.user.id = token.id as string
        session.user.sessionToken = token.sessionToken as string | undefined
      }
      return session
    },
  },
})
