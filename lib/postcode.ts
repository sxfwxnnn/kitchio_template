// Valid postcode prefixes for delivery
// TODO PROMPT 3: Replace postcode radius check with Google Maps Distance Matrix API

const VALID_PREFIXES = [
  "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10",
  "E11", "E12", "E13", "E14", "E15", "E16", "E17", "E18", "E19", "E20",
  "EC1", "EC2", "EC3", "EC4",
  "N1", "N4", "N5", "N7", "N16",
  "SE1",
];

function normalizePostcode(postcode: string): string {
  return postcode.toUpperCase().replace(/\s+/g, "");
}

export function isPostcodeInDeliveryRange(postcode: string): boolean {
  const normalized = normalizePostcode(postcode);
  if (normalized.length < 2) return false;

  return VALID_PREFIXES.some((prefix) => {
    const normalizedPrefix = prefix.replace(/\s+/g, "");
    return normalized.startsWith(normalizedPrefix);
  });
}

export function formatPostcode(postcode: string): string {
  const clean = postcode.toUpperCase().replace(/\s+/g, "");
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, -3)} ${clean.slice(-3)}`;
}
