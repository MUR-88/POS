"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  "data-state"?: "checked" | "unchecked" | "indeterminate"
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, "data-state": dataState, onCheckedChange, onChange, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Handle indeterminate state (Select All with partial selection)
    React.useEffect(() => {
      const el = (ref as any)?.current ?? inputRef.current
      if (el) el.indeterminate = dataState === "indeterminate"
    }, [dataState, ref])

    return (
      <input
        type="checkbox"
        ref={ref ?? inputRef}
        className={cn(
          "h-4 w-4 rounded border border-input bg-background accent-purple-600 cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-purple-500/40",
          className
        )}
        onChange={(e) => {
          onChange?.(e)
          onCheckedChange?.(e.target.checked)
        }}
        {...props}
      />
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
