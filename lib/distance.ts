/**
 * Distance utilities for Kitchio.
 * Includes Haversine formula and postcode coordinate fetching from postcodes.io
 */

export interface PostcodeResult {
  postcode: string;
  latitude: number;
  longitude: number;
}

export function getDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function fetchPostcodeCoordinates(postcode: string): Promise<{ lat: number; lng: number; formattedPostcode: string }> {
  const cleanPostcode = postcode.trim().replace(/\s+/g, "").toUpperCase();
  
  if (!cleanPostcode) {
    throw new Error("Postcode cannot be empty");
  }

  const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Invalid UK postcode: "${postcode}". Please verify and try again.`);
    }
    throw new Error("Could not check delivery postcode at this time. Please try again.");
  }

  const data = await response.json();

  if (data.status === 200 && data.result) {
    return {
      lat: Number(data.result.latitude),
      lng: Number(data.result.longitude),
      formattedPostcode: String(data.result.postcode)
    };
  }

  throw new Error("Invalid response format received from coordinate resolver.");
}
