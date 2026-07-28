const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.de",
  "gmx.de",
  "gmx.net",
  "gmx.at",
  "gmx.ch",
  "web.de",
  "t-online.de",
  "freenet.de",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "mail.ru",
  "yandex.ru",
  "yandex.com",
  "zoho.com",
]);

export function claimVerificationDecision(input: {
  emailMatchesListing: boolean;
  officialBusinessEmail: string;
  hasOwner: boolean;
  businessWebsite?: string | null;
}) {
  const domain = input.officialBusinessEmail.slice(input.officialBusinessEmail.lastIndexOf("@") + 1).toLowerCase();
  const publicMailbox = PUBLIC_EMAIL_DOMAINS.has(domain);
  
  if (input.emailMatchesListing && !input.hasOwner && !publicMailbox) {
    return "APPROVED" as const;
  }

  // Domain matching logic
  if (input.businessWebsite && !input.hasOwner && !publicMailbox) {
    const match = input.businessWebsite.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
    if (match && match[1]) {
      const websiteDomain = match[1].toLowerCase();
      if (domain === websiteDomain) {
        return "APPROVED" as const;
      }
    }
  }

  return "UNDER_REVIEW" as const;
}

export function otpFailureState(attempts: number, nowMs: number, blockMs: number) {
  return {
    attempts,
    blockedUntil: attempts >= 3 ? new Date(nowMs + blockMs) : null,
    attemptsRemaining: Math.max(0, 3 - attempts),
  };
}

export function claimResendDecision(input: {
  nowMs: number;
  sentAtMs?: number | null;
  windowStartedAtMs?: number | null;
  sendCount: number;
  cooldownMs: number;
  windowMs: number;
  maxSends: number;
}) {
  if (input.sentAtMs && input.nowMs - input.sentAtMs < input.cooldownMs) return "COOLDOWN" as const;
  const inWindow = Boolean(input.windowStartedAtMs && input.nowMs - input.windowStartedAtMs < input.windowMs);
  if (inWindow && input.sendCount >= input.maxSends) return "LIMIT" as const;
  return "ALLOWED" as const;
}
