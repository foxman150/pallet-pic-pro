import * as React from "react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

export interface MobileOptimizedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  touchOptimized?: boolean
}

const MobileOptimizedInput = React.forwardRef<HTMLInputElement, MobileOptimizedInputProps>(
  ({ className, type, touchOptimized = true, ...props }, ref) => {
    const isMobile = useIsMobile()

    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // Mobile optimizations
          isMobile && touchOptimized && [
            "min-h-touch", // Ensure touch target is large enough
            "text-base", // Prevent zoom on iOS
            "focus:ring-2", // Better focus visibility on mobile
          ],
          // Desktop optimizations
          !isMobile && "md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
MobileOptimizedInput.displayName = "MobileOptimizedInput"

export { MobileOptimizedInput }