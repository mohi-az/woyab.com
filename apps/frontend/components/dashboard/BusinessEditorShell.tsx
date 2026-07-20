"use client";

import { cn } from "@/lib/utils";
import type { BusinessDraft } from "@/components/business/BusinessListingPreview";
import { BusinessListingPreview } from "@/components/business/BusinessListingPreview";

type Props = {
  draft: BusinessDraft;
  children: React.ReactNode;
};

export function BusinessEditorShell({ draft, children }: Props) {
  return (
    <div className="relative">
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0">{children}</div>

        <div>
          <div className="sticky top-28">
            <BusinessListingPreview draft={draft} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export for convenience
export type { BusinessDraft };
export { cn };
