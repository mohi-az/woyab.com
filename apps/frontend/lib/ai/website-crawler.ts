import "server-only";

import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { load } from "cheerio";
import { getDomain } from "tldts";

const USER_AGENT = "WoyabBusinessImporter/1.0 (+https://woyab.com)";
const MAX_PAGES = 8;
const MAX_PAGE_BYTES = 1_000_000;
const MAX_PAGE_TEXT = 16_000;
const MAX_TOTAL_TEXT = 70_000;
const REQUEST_TIMEOUT_MS = 8_000;
const PRIORITY_PATH = /(kontakt|contact|impressum|about|ueber|über|service|services|leistung|leistungen|درباره|تماس)/i;

type SafeResponse = {
  url: string;
  status: number;
  contentType: string;
  body: string;
};

export type WebsiteEvidencePage = {
  url: string;
  title: string | null;
  text: string;
};

export type WebsiteEvidence = {
  rootUrl: string;
  finalRootUrl: string | null;
  pages: WebsiteEvidencePage[];
  emails: string[];
  phones: string[];
  socialLinks: string[];
  structuredData: Array<Record<string, unknown>>;
  warnings: string[];
  identityVerified?: boolean | null;
  fetchedAt: string;
};

function ipv4IsPublic(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && [0, 168].includes(b)) return false;
  if (a === 192 && b === 0) return false;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
  if (a === 203 && b === 0) return false;
  return true;
}

export function isPublicIpAddress(address: string) {
  const version = isIP(address);
  if (version === 4) return ipv4IsPublic(address);
  if (version !== 6) return false;
  const normalized = address.toLowerCase();
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return ipv4IsPublic(mapped);
  return !(
    normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || /^fe[89ab]/.test(normalized)
    || normalized.startsWith("ff")
    || normalized.startsWith("2001:db8")
  );
}

function registrableDomain(url: URL) {
  return getDomain(url.hostname) ?? url.hostname.toLowerCase();
}

function assertAllowedUrl(rawUrl: string, expectedDomain?: string) {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only public HTTP or HTTPS websites can be fetched.");
  if (url.username || url.password) throw new Error("Website URLs with embedded credentials are not allowed.");
  if (expectedDomain && registrableDomain(url) !== expectedDomain) throw new Error("The website redirected outside its official domain.");
  return url;
}

async function resolvePublicAddress(hostname: string) {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  const publicAddress = addresses.find((entry) => isPublicIpAddress(entry.address));
  if (!publicAddress || addresses.some((entry) => !isPublicIpAddress(entry.address))) {
    throw new Error("The website hostname does not resolve exclusively to public addresses.");
  }
  return publicAddress;
}

// Redirect handling needs access to response headers, so keep it separate from the exported crawler surface.
async function safeFetchWithRedirects(rawUrl: string, expectedDomain: string, redirectsLeft = 4): Promise<SafeResponse> {
  const url = assertAllowedUrl(rawUrl, expectedDomain);
  const resolved = await resolvePublicAddress(url.hostname);
  const transport = url.protocol === "https:" ? https : http;
  const response = await new Promise<SafeResponse & { location?: string }>((resolve, reject) => {
    const request = transport.request(url, {
      method: "GET",
      headers: { Accept: "text/html,application/xhtml+xml,text/plain;q=0.8", "Accept-Language": "de,en;q=0.9,fa;q=0.7", "User-Agent": USER_AGENT },
      lookup: (_hostname, _options, callback) => callback(null, resolved.address, resolved.family),
      servername: url.protocol === "https:" ? url.hostname : undefined,
    }, (incoming) => {
      const chunks: Buffer[] = [];
      let received = 0;
      incoming.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > MAX_PAGE_BYTES) return request.destroy(new Error("Website page exceeds the one megabyte limit."));
        chunks.push(chunk);
      });
      incoming.on("end", () => resolve({
        url: url.toString(),
        status: incoming.statusCode ?? 0,
        contentType: String(incoming.headers["content-type"] ?? "").toLowerCase(),
        body: Buffer.concat(chunks).toString("utf8"),
        location: typeof incoming.headers.location === "string" ? incoming.headers.location : undefined,
      }));
    });
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new Error("Website request timed out.")));
    request.on("error", reject);
    request.end();
  });
  if ([301, 302, 303, 307, 308].includes(response.status) && response.location) {
    if (!redirectsLeft) throw new Error("Website redirected too many times.");
    return safeFetchWithRedirects(new URL(response.location, url).toString(), expectedDomain, redirectsLeft - 1);
  }
  return response;
}

type RobotsRules = { disallow: string[] };

function parseRobots(body: string): RobotsRules {
  const groups: Array<{ agents: string[]; disallow: string[] }> = [];
  let current: { agents: string[]; disallow: string[] } | null = null;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (!current || current.disallow.length) {
        current = { agents: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "disallow" && current && value) {
      current.disallow.push(value);
    }
  }
  const relevant = groups.filter((group) => group.agents.some((agent) => agent === "*" || USER_AGENT.toLowerCase().startsWith(agent)));
  return { disallow: relevant.flatMap((group) => group.disallow) };
}

function robotsAllows(url: URL, rules: RobotsRules) {
  return !rules.disallow.some((path) => path === "/" || (path && url.pathname.startsWith(path.replace(/\*.*$/, ""))));
}

function normalizedText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function collectJsonLd(value: unknown, output: Array<Record<string, unknown>>) {
  if (Array.isArray(value)) return value.forEach((item) => collectJsonLd(item, output));
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record["@graph"])) collectJsonLd(record["@graph"], output);
  const type = record["@type"];
  const types = Array.isArray(type) ? type.map(String) : [String(type ?? "")];
  if (types.some((item) => /(Organization|LocalBusiness|Restaurant|Store|ProfessionalService)/i.test(item))) output.push(record);
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export async function crawlOfficialWebsite(rawUrl: string): Promise<WebsiteEvidence> {
  const seed = assertAllowedUrl(rawUrl);
  const expectedDomain = registrableDomain(seed);
  const warnings: string[] = [];
  let robots: RobotsRules = { disallow: [] };
  try {
    const response = await safeFetchWithRedirects(new URL("/robots.txt", seed).toString(), expectedDomain);
    if (response.status >= 200 && response.status < 300) robots = parseRobots(response.body);
  } catch (error) {
    warnings.push(`robots.txt could not be checked: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  const queue = [seed.toString()];
  const seen = new Set<string>();
  const pages: WebsiteEvidencePage[] = [];
  const emails: string[] = [];
  const phones: string[] = [];
  const socialLinks: string[] = [];
  const structuredData: Array<Record<string, unknown>> = [];
  let totalText = 0;
  let finalRootUrl: string | null = null;

  while (queue.length && pages.length < MAX_PAGES && totalText < MAX_TOTAL_TEXT) {
    const candidate = queue.shift()!;
    const candidateUrl = assertAllowedUrl(candidate, expectedDomain);
    candidateUrl.hash = "";
    const canonical = candidateUrl.toString();
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    if (!robotsAllows(candidateUrl, robots)) {
      warnings.push(`Skipped by robots.txt: ${candidateUrl.pathname}`);
      continue;
    }

    try {
      const response = await safeFetchWithRedirects(canonical, expectedDomain);
      if (!finalRootUrl) finalRootUrl = response.url;
      if (response.status < 200 || response.status >= 300) {
        warnings.push(`Skipped ${candidateUrl.pathname}: HTTP ${response.status}`);
        continue;
      }
      if (!response.contentType.includes("text/html") && !response.contentType.includes("text/plain") && !response.contentType.includes("application/xhtml+xml")) {
        warnings.push(`Skipped unsupported content type at ${candidateUrl.pathname}.`);
        continue;
      }

      const $ = load(response.body);
      $("script[type='application/ld+json']").each((_index, element) => {
        try { collectJsonLd(JSON.parse($(element).text()), structuredData); } catch { /* Ignore malformed publisher data. */ }
      });
      $("a[href]").each((_index, element) => {
        const href = String($(element).attr("href") ?? "").trim();
        if (/^mailto:/i.test(href)) emails.push(decodeURIComponent(href.replace(/^mailto:/i, "").split("?")[0]));
        if (/^tel:/i.test(href)) phones.push(decodeURIComponent(href.replace(/^tel:/i, "").split("?")[0]));
        try {
          const link = new URL(href, response.url);
          const socialDomain = getDomain(link.hostname) ?? link.hostname.toLowerCase();
          if (["instagram.com", "facebook.com", "linkedin.com", "youtube.com", "youtu.be", "t.me", "telegram.me", "wa.me", "whatsapp.com"].includes(socialDomain)) {
            socialLinks.push(link.toString());
            if (socialDomain === "wa.me") {
              const whatsappNumber = link.pathname.replace(/[^\d+]/g, "");
              if (whatsappNumber) phones.push(whatsappNumber);
            }
          } else if (registrableDomain(link) === expectedDomain && PRIORITY_PATH.test(`${link.pathname} ${$(element).text()}`)) {
            link.hash = "";
            queue.push(link.toString());
          }
        } catch { /* Ignore non-URL links. */ }
      });
      $("script,style,noscript,svg,canvas,template").remove();
      const title = normalizedText($("title").first().text()) || null;
      const text = normalizedText($("body").text()).slice(0, Math.min(MAX_PAGE_TEXT, MAX_TOTAL_TEXT - totalText));
      if (!text) {
        warnings.push(`No readable text was found at ${candidateUrl.pathname}.`);
        continue;
      }
      totalText += text.length;
      pages.push({ url: response.url, title, text });
    } catch (error) {
      warnings.push(`Could not read ${candidateUrl.pathname}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  for (const item of structuredData) {
    const email = item.email;
    const telephone = item.telephone;
    if (typeof email === "string") emails.push(email.replace(/^mailto:/i, ""));
    if (typeof telephone === "string") phones.push(telephone);
  }

  return {
    rootUrl: seed.toString(),
    finalRootUrl,
    pages,
    emails: unique(emails).filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)),
    phones: unique(phones),
    socialLinks: unique(socialLinks),
    structuredData: structuredData.slice(0, 20),
    warnings,
    fetchedAt: new Date().toISOString(),
  };
}

export function compactWebsiteEvidence(evidence: WebsiteEvidence, citedEvidence: Array<{ url: string | null; excerpt: string | null }>) {
  const excerptsByUrl = new Map<string, string[]>();
  for (const item of citedEvidence) {
    if (!item.url || !item.excerpt) continue;
    excerptsByUrl.set(item.url, [...(excerptsByUrl.get(item.url) ?? []), item.excerpt.slice(0, 500)]);
  }
  return {
    ...evidence,
    pages: evidence.pages.map((page) => ({ url: page.url, title: page.title, excerpts: excerptsByUrl.get(page.url) ?? [] })),
    structuredData: evidence.structuredData.slice(0, 10),
  };
}
