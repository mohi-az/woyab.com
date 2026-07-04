type DirectionsInput = {
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  travelMode?: "driving" | "walking" | "bicycling" | "transit";
};

function hasCoordinates(input: Pick<DirectionsInput, "latitude" | "longitude">) {
  return Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
}

function destinationFromAddress(input: Pick<DirectionsInput, "address" | "city">) {
  const parts = [input.address?.trim(), input.city?.trim()].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function buildDirectionsUrl(input: DirectionsInput) {
  const destination = hasCoordinates(input)
    ? `${input.latitude},${input.longitude}`
    : destinationFromAddress(input);

  if (!destination) return null;

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", destination);
  url.searchParams.set("travelmode", input.travelMode ?? "driving");
  url.searchParams.set("dir_action", "navigate");

  return url.toString();
}
