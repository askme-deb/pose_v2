// Production splits this one build across two hosts:
//   VITE_LANDING_URL (e.g. https://mypospe.com)     -> marketing landing page only
//   VITE_APP_URL     (e.g. https://app.mypospe.com) -> login + the admin portal
// Leave both unset (local dev) and everything is served from one host as before.

const landingUrl = (import.meta.env.VITE_LANDING_URL as string | undefined)?.replace(/\/+$/, '');
const appUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/+$/, '');

const bareHost = (host: string) => host.toLowerCase().replace(/^www\./, '');
const hostOf = (url: string) => {
  try {
    return bareHost(new URL(url).host);
  } catch {
    return null;
  }
};

export const isSplitSite = Boolean(landingUrl && appUrl);

/** True when this page was served from the landing host (mypospe.com / www.). */
export const isLandingHost = isSplitSite && bareHost(window.location.host) === hostOf(landingUrl!);

/** "/" belongs to the landing site; every other path belongs to the portal. */
export function siteHref(to: string): { external: boolean; href: string } {
  if (!isSplitSite) return { external: false, href: to };
  const landingPath = to === '/' || to.startsWith('/#');
  if (landingPath) return isLandingHost ? { external: false, href: to } : { external: true, href: `${landingUrl}${to}` };
  return isLandingHost ? { external: true, href: `${appUrl}${to}` } : { external: false, href: to };
}

export const APP_URL = appUrl;
