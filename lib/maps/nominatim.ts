// OpenStreetMap Nominatim geocoding service (free, no API key required)
// Rate limit: 1 request per second (respect usage policy)

export interface NominatimResult {
  place_id: number
  licence: string
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  display_name: string
  address: {
    house_number?: string
    road?: string
    neighbourhood?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    hamlet?: string
    municipality?: string
    county?: string
    state?: string
    postcode?: string
    country?: string
    country_code?: string
  }
  boundingbox: string[]
}

function resolveCity(address: NominatimResult["address"], displayName: string): string {
  const directCity =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.municipality ||
    address.county

  if (directCity) {
    return directCity
  }

  const parts = displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)

  // Nominatim display_name commonly looks like:
  // "street, city, county, state, zip, country"
  return parts[1] || parts[0] || ""
}

export interface GeocodedAddress {
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  coordinates: {
    lat: number
    lng: number
  }
  displayName: string
}

// Rate limiting
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1100 // 1.1 seconds to be safe

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  
  lastRequestTime = Date.now()
  
  return fetch(url, {
    headers: {
      "User-Agent": "MoveSmart/1.0 (freight shipping platform)",
    },
  })
}

export async function searchAddress(query: string, limit = 5): Promise<GeocodedAddress[]> {
  if (!query || query.length < 3) {
    return []
  }

  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&limit=${limit}&countrycodes=in`
    
    const response = await rateLimitedFetch(url)
    
    if (!response.ok) {
      console.error("Nominatim API error:", response.status)
      return []
    }

    const results: NominatimResult[] = await response.json()
    
    return results.map(result => ({
      address: [result.address.house_number, result.address.road]
        .filter(Boolean)
        .join(" ") || result.display_name.split(",")[0],
      city: resolveCity(result.address, result.display_name),
      state: result.address.state || "",
      zipCode: result.address.postcode || "",
      country: result.address.country || "India",
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      },
      displayName: result.display_name,
    }))
  } catch (error) {
    console.error("Error searching address:", error)
    return []
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
    
    const response = await rateLimitedFetch(url)
    
    if (!response.ok) {
      console.error("Nominatim reverse geocode error:", response.status)
      return null
    }

    const result: NominatimResult = await response.json()
    
    return {
      address: [result.address.house_number, result.address.road]
        .filter(Boolean)
        .join(" ") || result.display_name.split(",")[0],
      city: resolveCity(result.address, result.display_name),
      state: result.address.state || "",
      zipCode: result.address.postcode || "",
      country: result.address.country || "India",
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      },
      displayName: result.display_name,
    }
  } catch (error) {
    console.error("Error reverse geocoding:", error)
    return null
  }
}

// Calculate distance between two points using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Calculate estimated route distance (simplified - straight line * 1.3 factor)
export function estimateRouteDistance(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): number {
  const straightLineDistance = calculateDistance(startLat, startLng, endLat, endLng)
  return straightLineDistance * 1.3 // Approximate road distance factor
}

// Convert km to miles
export function kmToMiles(km: number): number {
  return km * 0.621371
}

// Convert miles to km
export function milesToKm(miles: number): number {
  return miles * 1.60934
}
