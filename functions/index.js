const functions = require('firebase-functions');
const fetch = require('node-fetch');
const { genkit } = require('genkit');
const { googleAI, gemini15Flash } = require('@genkit-ai/googleai');

// Initialize Genkit with Google AI
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY || functions.config().googleai?.apikey
    })
  ]
});

// Free OpenStreetMap Overpass API - no API key needed
exports.searchRestaurants = functions.https.onCall(async (data, context) => {
  const { foodType, lat, lng, radius, preferences } = data;

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
      .filter(place => {
        // Only include places with valid coordinates and name
        if (!place.tags || !place.tags.name) return false;
        const hasCoords = (place.lat && place.lon) || (place.center && place.center.lat && place.center.lon);
        return hasCoords;
      })
      .map(place => {
        const tags = place.tags;
        const placeLat = place.lat || (place.center ? place.center.lat : null);
        const placeLon = place.lon || (place.center ? place.center.lon : null);
        const distance = calculateDistance(lat, lng, placeLat, placeLon);

        const restaurant = {
          name: tags.name,
          address: formatAddress(tags),
          rating: tags.stars ? parseFloat(tags.stars) : 4.0,
          priceLevel: getPriceLevel(tags),
          distance: `${distance.toFixed(1)} miles`,
          distanceNum: distance,
          takeout: tags.takeaway === 'yes' || tags.delivery === 'yes' || true,
          cuisine: tags.cuisine || foodType,
          phone: tags.phone || tags['contact:phone'] || '',
          website: tags.website || tags['contact:website'] || '',
          tags: tags
        };

        // Add AI-powered preference matching score
        if (preferences && preferences.length > 0) {
          restaurant.matchScore = calculateMatchScore(restaurant, preferences);
        }

        return restaurant;
      })
      .sort((a, b) => {
        // Sort by match score first (if available), then by distance
        if (a.matchScore && b.matchScore && a.matchScore !== b.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return a.distanceNum - b.distanceNum;
      })
      .slice(0, 10);

    // Generate AI explanations for each restaurant
    const restaurantsWithAI = await Promise.all(
      formattedRestaurants.map(async (restaurant) => {
        // Generate AI explanation if preferences are available
        if (preferences && preferences.length > 0) {
          const aiExplanation = await generateRestaurantExplanation(restaurant, preferences);
          restaurant.aiExplanation = aiExplanation;
        }

        // Remove temporary fields before returning
        delete restaurant.distanceNum;
        delete restaurant.tags;
        delete restaurant.matchScore;
        return restaurant;
      })
    );

    return { restaurants: restaurantsWithAI };
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

// AI-powered preference matching algorithm
function calculateMatchScore(restaurant, preferences) {
  let score = 0;
  let totalWeight = 0;

  // Analyze team preferences
  const hungerLevels = {};
  const flavorPreferences = {};
  const moods = {};

  preferences.forEach(pref => {
    hungerLevels[pref.hungerLevel] = (hungerLevels[pref.hungerLevel] || 0) + 1;
    flavorPreferences[pref.flavorPreference] = (flavorPreferences[pref.flavorPreference] || 0) + 1;
    moods[pref.mood] = (moods[pref.mood] || 0) + 1;
  });

  const teamSize = preferences.length;

  // Score based on hunger level (affects restaurant type)
  const dominantHunger = Object.keys(hungerLevels).reduce((a, b) =>
    hungerLevels[a] > hungerLevels[b] ? a : b
  );

  if (dominantHunger === 'very-hungry') {
    // Prefer places known for large portions
    if (restaurant.tags.cuisine && ['american', 'bbq', 'pizza', 'italian'].includes(restaurant.tags.cuisine)) {
      score += 3;
    }
  } else if (dominantHunger === 'light') {
    // Prefer lighter options
    if (restaurant.tags.cuisine && ['japanese', 'mediterranean', 'sandwich', 'asian'].includes(restaurant.tags.cuisine)) {
      score += 3;
    }
  }
  totalWeight += 3;

  // Score based on flavor preferences
  const dominantFlavor = Object.keys(flavorPreferences).reduce((a, b) =>
    flavorPreferences[a] > flavorPreferences[b] ? a : b
  );

  if (dominantFlavor === 'spicy') {
    if (restaurant.tags.cuisine && ['thai', 'indian', 'mexican', 'chinese'].includes(restaurant.tags.cuisine)) {
      score += 5;
    }
  } else if (dominantFlavor === 'fresh') {
    if (restaurant.tags.cuisine && ['mediterranean', 'japanese', 'sandwich'].includes(restaurant.tags.cuisine)) {
      score += 5;
    }
  } else if (dominantFlavor === 'savory') {
    if (restaurant.tags.cuisine && ['bbq', 'american', 'italian'].includes(restaurant.tags.cuisine)) {
      score += 5;
    }
  } else if (dominantFlavor === 'sweet-savory') {
    if (restaurant.tags.cuisine && ['chinese', 'asian', 'thai'].includes(restaurant.tags.cuisine)) {
      score += 5;
    }
  }
  totalWeight += 5;

  // Score based on mood/occasion
  const dominantMood = Object.keys(moods).reduce((a, b) =>
    moods[a] > moods[b] ? a : b
  );

  if (dominantMood === 'comfort') {
    if (restaurant.tags.cuisine && ['pizza', 'italian', 'american'].includes(restaurant.tags.cuisine)) {
      score += 4;
    }
  } else if (dominantMood === 'healthy') {
    if (restaurant.tags.cuisine && ['mediterranean', 'japanese', 'sandwich'].includes(restaurant.tags.cuisine)) {
      score += 4;
    }
  } else if (dominantMood === 'indulgent') {
    if (restaurant.tags.cuisine && ['bbq', 'american', 'italian'].includes(restaurant.tags.cuisine)) {
      score += 4;
    }
  } else if (dominantMood === 'adventurous') {
    if (restaurant.tags.cuisine && ['thai', 'indian', 'japanese', 'asian'].includes(restaurant.tags.cuisine)) {
      score += 4;
    }
  }
  totalWeight += 4;

  // Bonus for high ratings
  if (restaurant.rating >= 4.2) {
    score += 2;
    totalWeight += 2;
  }

  // Normalize score to 0-100
  return totalWeight > 0 ? (score / totalWeight) * 100 : 50;
}

// AI-powered function to generate personalized restaurant explanations
async function generateRestaurantExplanation(restaurant, preferences) {
  try {
    const prompt = `You are a helpful assistant analyzing restaurant recommendations for a team lunch.

Restaurant: ${restaurant.name}
Cuisine: ${restaurant.cuisine}
Address: ${restaurant.address}
Distance: ${restaurant.distance}

Team Preferences:
${preferences.map((pref, i) => `
${i + 1}. ${pref.name}
   - Preferred Cuisine: ${pref.foodType}
   - Hunger Level: ${pref.hungerLevel}
   - Flavor Preference: ${pref.flavorPreference}
   - Mood/Occasion: ${pref.mood}
`).join('')}

Please analyze this restaurant and provide:
1. A brief team consensus (2-3 sentences) explaining why this restaurant is a good choice for the team overall
2. Per-person matches: For each team member, explain in 1 sentence how well this restaurant fits their specific preferences
3. Any conflicts or concerns: Identify if anyone's preferences aren't being met and suggest what they might order
4. Dietary insights: Suggest specific menu items or dish types that would satisfy different hunger levels and flavor preferences

Format your response as JSON with this structure:
{
  "teamConsensus": "string",
  "perPersonMatches": [
    {"name": "string", "match": "string"}
  ],
  "conflicts": ["string"],
  "dietaryInsights": "string"
}`;

    const result = await ai.generate({
      model: gemini15Flash,
      prompt: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    });

    // Parse the JSON response
    const responseText = result.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback if JSON parsing fails
    return {
      teamConsensus: responseText,
      perPersonMatches: preferences.map(p => ({ name: p.name, match: "Good fit based on team preferences" })),
      conflicts: [],
      dietaryInsights: "Various options available to satisfy different preferences"
    };
  } catch (error) {
    console.error('Error generating AI explanation:', error);
    // Return a simple fallback
    return {
      teamConsensus: `${restaurant.name} offers ${restaurant.cuisine} cuisine and is ${restaurant.distance} away, making it a convenient choice for the team.`,
      perPersonMatches: preferences.map(p => ({
        name: p.name,
        match: `Matches your ${p.mood} mood preference`
      })),
      conflicts: [],
      dietaryInsights: "Menu offers variety to accommodate different preferences"
    };
  }
}
