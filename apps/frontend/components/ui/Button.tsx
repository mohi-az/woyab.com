import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Button appearance variants
type ButtonVariant = "primary" | "outlined" | "ghost" | "secondary";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
}

/**
 * Reusable Button component with DaisyUI
 * Base button component across the project
 */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "btn",
        {
          "btn-primary": variant === "primary",
          "btn-outline btn-primary": variant === "outlined",
          "btn-ghost": variant === "ghost",
          "btn-secondary": variant === "secondary",
          "btn-xs": size === "xs",
          "btn-sm": size === "sm",
          "btn-lg": size === "lg",
        },
        className
      )}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? (
        <span className="loading loading-spinner loading-xs" />
      ) : (
        icon && <span className="text-[1.1em]">{icon}</span>
      )}
      {children}
    </button>
  );
}
