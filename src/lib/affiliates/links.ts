export function referralUrl(storefrontUrl: string, appOrigin: string, code: string) {
  const url = new URL(storefrontUrl || `${appOrigin}/embed-example.html`);
  url.searchParams.set("aff", code);
  url.searchParams.set("nw_popup", "1");
  return url.toString();
}
