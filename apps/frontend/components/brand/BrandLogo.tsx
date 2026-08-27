import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandImageProps = {
  className?: string;
  priority?: boolean;
  variant?: "black" | "white";
};

export function BrandLogo({ className, priority = false, variant = "black" }: BrandImageProps) {
  return (
    <Image
      src={`/brand/woyab-logo-${variant}.png`}
      alt="WoYab"
      width={1840}
      height={661}
      className={cn("object-contain", className)}
      priority={priority}
    />
  );
}

export function BrandMark({ className, priority = false, variant = "black" }: BrandImageProps) {
  return (
    <Image
      src={`/brand/woyab-mark-${variant}.png`}
      alt=""
      width={512}
      height={512}
      className={cn("object-contain", className)}
      priority={priority}
      aria-hidden="true"
    />
  );
}
