const functions = require('firebase-functions');
const fetch = require('node-fetch');

// Free OpenStreetMap Overpass API - no API key needed
exports.searchRestaurants = functions.https.onCall(async (data, context) => {
  const { foodType, lat, lng, radius } = data;

  // Map food types to OpenStreetMap cuisine tags
  const cuisineMap = {
    'pizza': 'pizza',
    'chinese': 'chinese',
    'mexican': 'mexican',
    'italian': 'italian',
    'american': 'american',
    'asian': 'asian',
    'sandwich': 'sandwich',
    'indian': 'indian',
    'thai': 'thai',
    'mediterranean': 'greek',
    'japanese': 'japanese',
    'bbq': 'barbecue'
  };

  const cuisine = cuisineMap[foodType] || 'restaurant';

  // Overpass API query to find restaurants
  // This is 100% free with no API key required
  const query = `
    [out:json];
    (
      node["amenity"="restaurant"]["cuisine"="${cuisine}"](around:${radius},${lat},${lng});
      way["amenity"="restaurant"]["cuisine"="${cuisine}"](around:${radius},${lat},${lng});
    );
    out body;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' }
    });

    const osmData = await response.json();

    // If no results with specific cuisine, fallback to all restaurants
    let restaurants = osmData.elements;
    if (restaurants.length === 0) {
      const fallbackQuery = `
        [out:json];
        (
          node["amenity"="restaurant"](around:${radius},${lat},${lng});
          way["amenity"="restaurant"](around:${radius},${lat},${lng});
        );
        out body;
      `;

      const fallbackResponse = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: fallbackQuery,
        headers: { 'Content-Type': 'text/plain' }
      });

      const fallbackData = await fallbackResponse.json();
      restaurants = fallbackData.elements;
    }

    // Process and format the results
    const formattedRestaurants = restaurants
      .filter(place => place.tags && place.tags.name)
      .slice(0, 10)
      .map(place => {
        const tags = place.tags;
        const distance = calculateDistance(lat, lng, place.lat || place.center.lat, place.lon || place.center.lon);

        return {
          name: tags.name,
          address: formatAddress(tags),
          rating: tags.stars ? parseFloat(tags.stars) : 4.0,
          priceLevel: getPriceLevel(tags),
          distance: `${distance.toFixed(1)} miles`,
          takeout: tags.takeaway === 'yes' || tags.delivery === 'yes' || true,
          cuisine: tags.cuisine || foodType,
          phone: tags.phone || tags['contact:phone'] || '',
          website: tags.website || tags['contact:website'] || ''
        };
      });

    return { restaurants: formattedRestaurants };
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch restaurants');
  }
});

// Helper function to format address from OSM tags
function formatAddress(tags) {
  const parts = [];

  if (tags['addr:housenumber'] && tags['addr:street']) {
    parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
  } else if (tags['addr:street']) {
    parts.push(tags['addr:street']);
  }

  if (tags['addr:city']) {
    parts.push(tags['addr:city']);
  }

  if (tags['addr:state']) {
    parts.push(tags['addr:state']);
  }

  if (tags['addr:postcode']) {
    parts.push(tags['addr:postcode']);
  }

  return parts.join(', ') || 'Address not available';
}

// Helper function to determine price level
function getPriceLevel(tags) {
  // Check for price hint in OSM data
  if (tags.payment && tags.payment.includes('expensive')) return '$$$';
  if (tags.cuisine && ['fine_dining', 'french'].includes(tags.cuisine)) return '$$$';
  if (tags.cuisine && ['fast_food', 'burger'].includes(tags.cuisine)) return '$';
  return '$$';
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}
