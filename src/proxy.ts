import { NextResponse, type NextRequest } from "next/server";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function publicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  if (forwardedHost) return `${forwardedProtocol ?? request.nextUrl.protocol.replace(":", "")}://${forwardedHost}`;
  return request.nextUrl.origin;
}

function hasTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  const configured = process.env.APP_ORIGIN;
  return origin === (configured ?? publicOrigin(request));
}

function csp(nonce: string): string {
  const mapHosts = "https://tiles.openfreemap.org https://*.openfreemap.org";
  const developmentEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentEval}`,
    // MapLibre creates runtime style nodes; restricting its external sources remains intact.
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${mapHosts}`,
    `font-src 'self' data: ${mapHosts}`,
    `connect-src 'self' ${mapHosts}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && mutatingMethods.has(request.method) && !hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Cross-site mutation request denied." }, { status: 403 });
  }

  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  if (process.env.NODE_ENV === "production" && (request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https")) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
