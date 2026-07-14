export function safeCallbackPath(value: string | string[] | undefined, fallback = "/dashboard") {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(candidate, "https://fargo.local");
    if (url.origin !== "https://fargo.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
