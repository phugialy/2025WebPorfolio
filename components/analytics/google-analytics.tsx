import Script from "next/script";

// Google Analytics loads only on the live site. Without this guard every local
// dev server, test run and preview deployment that carried the measurement ID
// sent its visits to the real property: in the first half of November, 759 of
// about 1,280 recorded sessions came from hostname "localhost" and made a fake
// traffic spike. Off the live hosts, gtag is never defined, so
// trackNavigationEvent (lib/analytics.ts) quietly does nothing there too.
export const LIVE_HOSTS = ["phugialy.com", "www.phugialy.com"];

// The inline script, as text, so a test can run it against a fake window.
export function analyticsSnippet(measurementId: string): string {
  return `
(function () {
  if (${JSON.stringify(LIVE_HOSTS)}.indexOf(window.location.hostname) === -1) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  var tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=${measurementId}';
  document.head.appendChild(tag);
  window.gtag('js', new Date());
  window.gtag('config', '${measurementId}');
})();
`;
}

export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId) {
    return null;
  }

  return (
    <Script id="google-analytics" strategy="afterInteractive">
      {analyticsSnippet(measurementId)}
    </Script>
  );
}
