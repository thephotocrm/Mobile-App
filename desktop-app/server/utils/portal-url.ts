/**
 * Centralized Portal URL Resolver
 * Single source of truth for all production URL generation
 * Used by automations, scheduler, and any other code that generates client-facing URLs
 */

export function resolvePortalBaseUrl(portalSlug?: string | null, context?: string): string {
  // Production detection: Check NODE_ENV first, but also detect Railway since it
  // may not always set NODE_ENV=production
  const isRailway = !!process.env.RAILWAY_PROJECT_ID || !!process.env.RAILWAY_ENVIRONMENT_NAME;
  const isProduction = process.env.NODE_ENV === 'production' || isRailway;
  
  let baseUrl: string;
  
  if (isProduction) {
    // Production: use tpcportal.co with photographer's slug or 'app' fallback
    baseUrl = `https://${portalSlug || 'app'}.tpcportal.co`;
  } else {
    // Development: use Replit dev domain or localhost
    baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';
  }
  
  console.log(`🔍 resolvePortalBaseUrl [${context || 'unknown'}]:`, {
    isProduction,
    isRailway,
    NODE_ENV: process.env.NODE_ENV,
    portalSlug,
    resultUrl: baseUrl
  });
  
  return baseUrl;
}

/**
 * Get the app base URL (app.tpcportal.co in production)
 * Use this when you don't have a specific photographer's portal slug
 */
export function getAppBaseUrl(context?: string): string {
  return resolvePortalBaseUrl(null, context);
}
