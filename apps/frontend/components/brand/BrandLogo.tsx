import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandImageProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandImageProps) {
  return (
    <Image
      src="/brand/woyab-logo.png"
      alt="WoYab"
      width={1305}
      height={535}
      className={cn("object-contain", className)}
      priority={priority}
    />
  );
}

export function BrandMark({ className, priority = false }: BrandImageProps) {
  return (
    <Image
      src="/brand/woyab-mark.png"
      alt=""
      width={512}
      height={512}
      className={cn("object-contain", className)}
      priority={priority}
      aria-hidden="true"
    />
  );
}
