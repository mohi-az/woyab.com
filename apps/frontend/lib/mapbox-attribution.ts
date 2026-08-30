export function removeMapboxLogoLink(container: HTMLElement) {
  const logo = container.querySelector<HTMLAnchorElement>(".mapboxgl-ctrl-logo");
  if (!logo) return;

  logo.removeAttribute("href");
  logo.removeAttribute("target");
  logo.removeAttribute("rel");
  logo.tabIndex = -1;
  logo.setAttribute("role", "img");
  logo.setAttribute("aria-label", "Mapbox");
}
