import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

interface PlaceCategory {
  type: string;
  displayName: string;
  icon: string;
  priority: number;
}

const PLACE_CATEGORIES: PlaceCategory[] = [
  { type: 'restaurant', displayName: 'Restaurants', icon: '🍽️', priority: 1 },
  { type: 'gas_station', displayName: 'Gas Stations', icon: '⛽', priority: 2 },
  { type: 'hospital', displayName: 'Hospitals', icon: '🏥', priority: 3 },
  { type: 'pharmacy', displayName: 'Pharmacies', icon: '💊', priority: 4 },
  { type: 'bank', displayName: 'Banks & ATMs', icon: '🏦', priority: 5 },
  { type: 'grocery_or_supermarket', displayName: 'Grocery Stores', icon: '🛒', priority: 6 },
  { type: 'tourist_attraction', displayName: 'Attractions', icon: '🎯', priority: 7 },
  { type: 'lodging', displayName: 'Hotels', icon: '🏨', priority: 8 },
  { type: 'shopping_mall', displayName: 'Shopping', icon: '🛍️', priority: 9 },
  { type: 'cafe', displayName: 'Cafes', icon: '☕', priority: 10 },
];

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatPriceLevel = (priceLevel: number | undefined): string => {
  if (priceLevel === undefined || priceLevel === null) return 'Not Available';
  switch (priceLevel) {
    case 0: return 'Free';
    case 1: return 'Inexpensive';
    case 2: return 'Moderate';
    case 3: return 'Expensive';
    case 4: return 'Very Expensive';
    default: return 'Not Available';
  }
};

const searchNearbyCategory = async (
  lat: number,
  lng: number,
  category: PlaceCategory,
  radius: number,
  maxResults: number = 5
) => {
  const googleApiKey = serverEnv.GOOGLE_MAPS_API_KEY;
  
  const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${category.type}&key=${googleApiKey}`;
  
  try {
    const response = await fetch(nearbyUrl);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.warn(`Failed to search ${category.type}: ${data.status}`);
      return [];
    }
    
    const places = await Promise.all(
      data.results.slice(0, maxResults).map(async (place: any) => {
        const distance = calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng);
        
        // Get additional details for important places
        let detailsData = {};
        if (distance < 2000) { // Only get details for places within 2km
          try {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,photos,price_level&key=${googleApiKey}`;
            const detailsResponse = await fetch(detailsUrl);
            const details = await detailsResponse.json();
            detailsData = details.status === 'OK' ? details.result : {};
          } catch (error) {
            console.warn(`Failed to get details for ${place.name}:`, error);
          }
        }
        
        return {
          place_id: place.place_id,
          name: place.name,
          category: category.displayName,
          category_icon: category.icon,
          category_type: category.type,
          formatted_address: (detailsData as any).formatted_address || place.vicinity,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          },
          distance: Math.round(distance),
          rating: place.rating || (detailsData as any).rating,
          price_level: formatPriceLevel(place.price_level || (detailsData as any).price_level),
          is_open: place.opening_hours?.open_now,
          photos: ((detailsData as any).photos || place.photos)?.slice(0, 2).map((photo: any) => ({
            photo_reference: photo.photo_reference,
            width: photo.width,
            height: photo.height,
            url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleApiKey}`,
          })) || [],
          phone: (detailsData as any).formatted_phone_number,
          website: (detailsData as any).website,
          opening_hours: (detailsData as any).opening_hours?.weekday_text || [],
          source: 'google_places',
        };
      })
    );
    
    return places.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error(`Error searching ${category.type}:`, error);
    return [];
  }
};

export const nearbyDiscoveryTool = tool({
  description: 'Discover comprehensive nearby places across multiple categories including restaurants, gas stations, hospitals, shopping, and attractions. Automatically detects user location or uses provided coordinates.',
  parameters: z.object({
    location: z.string().optional().describe('Location name or address (optional if user location is available)'),
    latitude: z.number().optional().describe('Latitude coordinate (will use user location if not provided)'),
    longitude: z.number().optional().describe('Longitude coordinate (will use user location if not provided)'),
    radius: z.number().default(2000).describe('Search radius in meters (default: 2000m, max: 5000m)'),
    categories: z.array(z.string()).optional().describe('Specific categories to search for (default: all essential categories)'),
    maxPerCategory: z.number().default(3).describe('Maximum results per category (default: 3, max: 5)'),
    prioritizeEssentials: z.boolean().default(true).describe('Prioritize essential services like gas, hospitals, pharmacies'),
  }),
  execute: async ({
    location,
    latitude,
    longitude,
    radius = 2000,
    categories,
    maxPerCategory = 3,
    prioritizeEssentials = true,
  }: {
    location?: string;
    latitude?: number;
    longitude?: number;
    radius: number;
    categories?: string[];
    maxPerCategory: number;
    prioritizeEssentials: boolean;
  }) => {
    try {
      const googleApiKey = serverEnv.GOOGLE_MAPS_API_KEY;
      
      if (!googleApiKey) {
        throw new Error('Google Maps API key not configured');
      }
      
      let searchLat = latitude;
      let searchLng = longitude;
      let searchLocation = location || 'your current location';
      
      // Geocode location if coordinates not provided
      if ((!searchLat || !searchLng) && location) {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${googleApiKey}`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
          searchLat = geocodeData.results[0].geometry.location.lat;
          searchLng = geocodeData.results[0].geometry.location.lng;
          searchLocation = location;
        } else {
          return {
            success: false,
            error: `Could not find location: ${location}`,
            categories: [],
            center: null,
          };
        }
      }
      
      if (!searchLat || !searchLng) {
        return {
          success: false,
          error: 'Location coordinates are required. Please provide latitude/longitude or a location name.',
          categories: [],
          center: null,
        };
      }
      
      // Limit radius to maximum of 5000m
      const searchRadius = Math.min(radius, 5000);
      const resultsPerCategory = Math.min(maxPerCategory, 5);
      
      // Determine which categories to search
      let categoriesToSearch = PLACE_CATEGORIES;
      
      if (categories && categories.length > 0) {
        categoriesToSearch = PLACE_CATEGORIES.filter(cat => 
          categories.includes(cat.type) || categories.includes(cat.displayName.toLowerCase())
        );
      }
      
      // If prioritizing essentials, put essential services first
      if (prioritizeEssentials) {
        categoriesToSearch = categoriesToSearch.sort((a, b) => a.priority - b.priority);
      }
      
      console.log(`Searching ${categoriesToSearch.length} categories near ${searchLocation} within ${searchRadius}m`);
      
      // Search all categories in parallel
      const searchPromises = categoriesToSearch.map(category =>
        searchNearbyCategory(searchLat!, searchLng!, category, searchRadius, resultsPerCategory)
      );
      
      const results = await Promise.all(searchPromises);
      
      // Organize results by category
      const categorizedResults = categoriesToSearch.map((category, index) => ({
        category: category.displayName,
        category_icon: category.icon,
        category_type: category.type,
        priority: category.priority,
        places: results[index] || [],
        count: (results[index] || []).length,
      })).filter(cat => cat.count > 0);
      
      // Get all places for overall statistics
      const allPlaces = results.flat();
      const totalPlaces = allPlaces.length;
      
      // Calculate some interesting insights
      const insights = {
        total_places_found: totalPlaces,
        categories_with_results: categorizedResults.length,
        average_distance: totalPlaces > 0 ? Math.round(allPlaces.reduce((sum, place) => sum + place.distance, 0) / totalPlaces) : 0,
        closest_place: allPlaces.length > 0 ? allPlaces.reduce((closest, place) => place.distance < closest.distance ? place : closest) : null,
        essential_services: categorizedResults.filter(cat => ['Hospitals', 'Pharmacies', 'Gas Stations', 'Banks & ATMs'].includes(cat.category)),
        food_and_drink: categorizedResults.filter(cat => ['Restaurants', 'Cafes'].includes(cat.category)),
        shopping_and_services: categorizedResults.filter(cat => ['Grocery Stores', 'Shopping'].includes(cat.category)),
      };
      
      return {
        success: true,
        location: searchLocation,
        center: { lat: searchLat, lng: searchLng },
        radius: searchRadius,
        insights,
        categories: categorizedResults.sort((a, b) => a.priority - b.priority),
        all_places: allPlaces.slice(0, 20), // Limit for performance
        search_summary: {
          query: `Nearby places around ${searchLocation}`,
          radius_km: (searchRadius / 1000).toFixed(1),
          categories_searched: categoriesToSearch.length,
          results_found: totalPlaces,
        },
      };
      
    } catch (error) {
      console.error('Nearby discovery error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during nearby discovery',
        categories: [],
        center: null,
      };
    }
  },
}); 