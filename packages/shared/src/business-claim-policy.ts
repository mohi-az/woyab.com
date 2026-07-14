export function claimVerificationDecision(input: {
  emailMatchesListing: boolean;
  officialBusinessEmail: string;
  hasOwner: boolean;
}) {
  const domain = input.officialBusinessEmail.slice(input.officialBusinessEmail.lastIndexOf("@") + 1).toLowerCase();
  const publicMailbox = domain === "gmail.com" || domain === "googlemail.com";
  return input.emailMatchesListing && !input.hasOwner && !publicMailbox ? "APPROVED" as const : "UNDER_REVIEW" as const;
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
