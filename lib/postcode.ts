// Valid postcode prefixes and tier fees for delivery
const ZONE_FEES: Record<string, number> = {
  // Near Zone: £1.50
  "E1": 1.50, "E2": 1.50, "E3": 1.50, "E8": 1.50, "E9": 1.50, "E14": 1.50, 
  "EC1": 1.50, "EC2": 1.50, "EC3": 1.50, "EC4": 1.50,
  
  // Mid Zone: £3.00
  "E5": 3.00, "E6": 3.00, "E7": 3.00, "E10": 3.00, "E13": 3.00, "E15": 3.00, "E20": 3.00,
  "N1": 3.00, "N5": 3.00, "N7": 3.00, "N16": 3.00, "SE1": 3.00,
  
  // Outer Zone: £4.50
  "E4": 4.50, "E11": 4.50, "E12": 4.50, "E16": 4.50, "E17": 4.50, "E18": 4.50, "E19": 4.50,
  "N4": 4.50
};

function normalizePostcode(postcode: string): string {
  return postcode.toUpperCase().replace(/\s+/g, "");
}

export function getPostcodeDeliveryFee(postcode: string): number | null {
  const normalized = normalizePostcode(postcode);
  if (normalized.length < 2) return null;

  // Find matching prefix in ZONE_FEES, starting from longest to shortest key
  const sortedPrefixes = Object.keys(ZONE_FEES).sort((a, b) => b.length - a.length);
  for (const prefix of sortedPrefixes) {
    const normalizedPrefix = prefix.replace(/\s+/g, "");
    if (normalized.startsWith(normalizedPrefix)) {
      return ZONE_FEES[prefix];
    }
  }
  return null; // Delivery not available
}

export function isPostcodeInDeliveryRange(postcode: string): boolean {
  return getPostcodeDeliveryFee(postcode) !== null;
}

export function formatPostcode(postcode: string): string {
  const clean = postcode.toUpperCase().replace(/\s+/g, "");
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, -3)} ${clean.slice(-3)}`;
}
