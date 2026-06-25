"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ChefHat, Eye, EyeOff } from "lucide-react"

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const res = await signIn("credentials", { email: data.email, password: data.password, redirect: false })
    setLoading(false)
    if (res?.error) { toast.error("Email atau password salah"); return }
    router.push("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex bg-sidebar">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-96 p-10 border-r border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <span className="text-white font-bold text-lg">POS Restoran</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white leading-tight">
            Kelola restoran Anda lebih mudah & efisien
          </h1>
          <p className="text-sidebar-foreground/60 text-sm leading-relaxed">
            Sistem kasir modern dengan manajemen meja, dapur, laporan, dan loyalitas pelanggan dalam satu platform.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {[
              { label: "Transaksi Cepat", desc: "≤3 tap per order" },
              { label: "Kitchen Display", desc: "Real-time ke dapur" },
              { label: "Loyalty Points", desc: "Program member" },
              { label: "Laporan Detail", desc: "Export PDF & CSV" },
            ].map(f => (
              <div key={f.label} className="bg-sidebar-accent rounded-lg p-3">
                <p className="text-white text-xs font-semibold">{f.label}</p>
                <p className="text-sidebar-foreground/50 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sidebar-foreground/30 text-xs">© 2026 POS Restoran</p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold">POS Restoran</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold">Selamat datang 👋</h2>
            <p className="text-muted-foreground mt-1">Masuk ke akun Anda untuk melanjutkan</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="admin@pos.com" autoComplete="email" className="h-11" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPass ? "text" : "password"} placeholder="••••••••" autoComplete="current-password" className="h-11 pr-10" {...register("password")} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/30" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Masuk..." : "Masuk"}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Hubungi admin untuk mendapatkan akun
          </p>
        </div>
      </div>
    </div>
  )
}
