import { NamakdanAdminClient } from "./backendClient.mjs";
import { createOwnerSession } from "./ownerSession.mjs";
import { createNamakdanTools } from "./tools.mjs";

const TRUTHY = new Set(["1", "true", "yes", "on"]);

export function loadConfig(env = process.env) {
  const apiBaseUrl = trimSlash(env.NAMAKDAN_API_BASE_URL || "http://localhost:8080/api/v1");
  return {
    apiBaseUrl,
    publicUrl: trimSlash(env.NAMAKDAN_PUBLIC_URL || deriveDefaultPublicUrl(apiBaseUrl)),
    adminToken: env.NAMAKDAN_ADMIN_MCP_TOKEN || env.NAMAKDAN_ADMIN_TOKEN || undefined,
    ownerEmail: blankToUndefined(env.NAMAKDAN_OWNER_EMAIL),
    ownerPassword: env.NAMAKDAN_OWNER_PASSWORD || undefined,
    ownerToken: blankToUndefined(env.NAMAKDAN_OWNER_TOKEN),
    readOnly: TRUTHY.has(String(env.NAMAKDAN_MCP_READ_ONLY ?? "").trim().toLowerCase()),
    businessAllowList: parseBusinessIds(env.NAMAKDAN_MCP_BUSINESS_IDS),
    requestTimeoutMs: positiveInt(env.NAMAKDAN_MCP_REQUEST_TIMEOUT_MS, 30000),
    webhookHost: env.NAMAKDAN_MCP_WEBHOOK_HOST || "127.0.0.1",
    webhookPort: positiveInt(env.NAMAKDAN_MCP_WEBHOOK_PORT, 3977),
    webhookSecret: env.NAMAKDAN_MCP_WEBHOOK_SECRET,
    allowInsecureHttp: TRUTHY.has(String(env.NAMAKDAN_MCP_ALLOW_INSECURE_HTTP ?? "").trim().toLowerCase()),
  };
}

/**
 * Refuses to send credentials in clear text. The admin token, the owner
 * password and the owner session JWT all travel in request headers or bodies,
 * so a credentialed client needs an https:// API base unless the host is
 * loopback (localhost, *.localhost, 127.0.0.0/8, ::1).
 * NAMAKDAN_MCP_ALLOW_INSECURE_HTTP=true overrides this for a trusted private
 * network such as a Compose network.
 */
export function assertTransportSafe(config) {
  let url;
  try {
    url = new URL(config.apiBaseUrl);
  } catch {
    throw new Error(`NAMAKDAN_API_BASE_URL is not a valid URL: ${config.apiBaseUrl}`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`NAMAKDAN_API_BASE_URL must use https:// (got ${url.protocol})`);
  }
  const credentialed = Boolean(config.adminToken || config.ownerEmail || config.ownerPassword || config.ownerToken);
  if (url.protocol === "https:" || !credentialed || config.allowInsecureHttp || isLoopbackHost(url.hostname)) {
    return;
  }
  throw new Error(
    `refusing to send Namakdan credentials over plain http to ${url.host}. ` +
      "Use an https:// NAMAKDAN_API_BASE_URL, or set NAMAKDAN_MCP_ALLOW_INSECURE_HTTP=true " +
      "only for a trusted private network.",
  );
}

export function isLoopbackHost(hostname) {
  const host = String(hostname ?? "").toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1") return true;
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

/**
 * Builds the API clients and the tool registry.
 *
 *   client        platform-admin token client (/api/v1/admin/*), only when
 *                 NAMAKDAN_ADMIN_MCP_TOKEN is set;
 *   ownerClient   restaurant-owner session (/api/v1/inside/*), only when owner
 *                 credentials are set;
 *   publicClient  anonymous client for /instance and /health/*, always.
 */
export function createRuntime(config = loadConfig(), { fetchImpl } = {}) {
  const common = {
    baseUrl: config.apiBaseUrl,
    timeoutMs: config.requestTimeoutMs,
    ...(fetchImpl ? { fetchImpl } : {}),
  };

  if (Boolean(config.ownerEmail) !== Boolean(config.ownerPassword)) {
    throw new Error("set both NAMAKDAN_OWNER_EMAIL and NAMAKDAN_OWNER_PASSWORD, or neither");
  }
  assertTransportSafe(config);

  const client = config.adminToken
    ? new NamakdanAdminClient({ ...common, token: config.adminToken })
    : undefined;

  let ownerSession;
  let ownerClient;
  if (config.ownerEmail || config.ownerToken) {
    ownerSession = createOwnerSession({
      baseUrl: config.apiBaseUrl,
      email: config.ownerEmail,
      password: config.ownerPassword,
      staticToken: config.ownerToken,
      timeoutMs: config.requestTimeoutMs,
      ...(fetchImpl ? { fetchImpl } : {}),
    });
    ownerClient = new NamakdanAdminClient({ ...common, tokenProvider: ownerSession, label: "Namakdan API" });
  }

  const publicClient = new NamakdanAdminClient({ ...common, anonymous: true, label: "Namakdan API" });

  const tools = createNamakdanTools({
    client,
    ownerClient,
    publicClient,
    options: {
      apiBaseUrl: config.apiBaseUrl,
      publicUrl: config.publicUrl,
      readOnly: config.readOnly,
      businessAllowList: config.businessAllowList,
      ownerSession,
    },
  });
  return { config, client, ownerClient, ownerSession, publicClient, tools };
}

export function parseBusinessIds(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return undefined;
  const ids = text.split(/[\s,]+/).filter(Boolean).map((part) => {
    if (!/^[1-9][0-9]*$/.test(part)) {
      throw new Error(`NAMAKDAN_MCP_BUSINESS_IDS must be a comma-separated list of numeric business ids (got "${part}")`);
    }
    return Number(part);
  });
  return [...new Set(ids)];
}

// The API is served same-origin at ${PUBLIC_URL}/api/v1, so the public URL is
// the API base without that suffix. A split-origin dev setup
// (http://localhost:8080/api/v1 vs a frontend on :3000) must set
// NAMAKDAN_PUBLIC_URL explicitly.
function deriveDefaultPublicUrl(apiBaseUrl) {
  return apiBaseUrl.replace(/\/api\/v1$/, "");
}

function trimSlash(value) {
  return String(value ?? "").replace(/\/+$/, "");
}

function blankToUndefined(value) {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}

function positiveInt(raw, fallback) {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
