import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

function appendCookieFlag(cookie: string, flag: string) {
  return cookie.toLowerCase().includes(flag.toLowerCase()) ? cookie : `${cookie}; ${flag}`;
}

function hardenCookie(cookie: string, isProduction: boolean) {
  let hardened = appendCookieFlag(cookie, 'HttpOnly');
  hardened = appendCookieFlag(hardened, 'SameSite=Lax');
  if (isProduction) {
    hardened = appendCookieFlag(hardened, 'Secure');
  }
  return hardened;
}

export function securityHeaders(isProduction: boolean) {
  return helmet({
    // Disable COEP to avoid breaking MQTT/WebSocket integrations.
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        connectSrc: isProduction
          ? ["'self'", 'https:', 'wss:']
          : ["'self'", 'https:', 'http:', 'wss:', 'ws:'],
      },
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: isProduction
      ? {
          maxAge: 60 * 60 * 24 * 180, // 180 days
          includeSubDomains: true,
          preload: true,
        }
      : false,
  });
}

export function forceHttps(enabled: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled) return next();
    const forwardedProto = req.header('x-forwarded-proto');
    if (forwardedProto && forwardedProto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    return next();
  };
}

/**
 * If cookies are ever set, enforce secure defaults centrally:
 * - HttpOnly
 * - SameSite=Lax
 * - Secure (production)
 */
export function secureCookieFlags(isProduction: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSetHeader = res.setHeader.bind(res);

    res.setHeader = ((name: string, value: number | string | string[] | ReadonlyArray<string>) => {
      if (name.toLowerCase() !== 'set-cookie') {
        return originalSetHeader(name, value);
      }

      const cookies = Array.isArray(value) ? value : [String(value)];
      const hardenedCookies = cookies.map((cookie) => hardenCookie(cookie, isProduction));
      return originalSetHeader(name, hardenedCookies);
    }) as typeof res.setHeader;

    next();
  };
}
