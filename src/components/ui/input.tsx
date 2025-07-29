import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border-1 border-transparent bg-zinc-700 to-card px-4 py-2 text-white shadow-lg transition-all duration-300 outline-none",
          "focus:border-primary focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 focus:ring-offset-background",
          "hover:border-accent hover:shadow-accent/30 hover:shadow-xl",
          "placeholder:text-muted-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus:animate-pulse",
          "backdrop-blur-md bg-opacity-80 dark:bg-opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
