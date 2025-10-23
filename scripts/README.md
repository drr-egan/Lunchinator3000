# Restaurant Data Scraping Script

This script uses Google Gemini AI to generate realistic restaurant data and populate the Firestore `restaurant_data` collection.

## What It Does

The script:
1. Fetches real restaurants from OpenStreetMap within 10 miles of Champlin, MN
2. For each restaurant, uses AI to generate:
   - Popular menu items (based on typical cuisine dishes)
   - Customer quotes and feedback
   - Portion sizes and dietary options
   - Price range and ratings
3. Stores this data in Firestore for fast lookup

## Prerequisites

1. **Firebase Service Account Key**
   - Download from Firebase Console → Project Settings → Service Accounts
   - Save as `service-account-key.json` in project root
   - **DO NOT commit this file to Git!**

2. **Google AI API Key**
   - Already configured in `functions/.env`

3. **Node Modules**
   ```bash
   cd scripts
   npm install
   ```

## Usage

```bash
cd scripts
npm run scrape
```

The script will:
- Process ~15 restaurants per cuisine type (11 cuisines = ~165 restaurants)
- Take approximately 5-10 minutes to complete
- Rate-limit API calls (2 seconds between requests)
- Show progress for each restaurant

## Output

Data is stored in Firestore collection `restaurant_data` with structure:
```javascript
{
  name: "Restaurant Name",
  cuisine: "thai",
  location: {lat: 45.xxx, lng: -93.xxx},
  popular_dishes: [
    {name: "Pad Thai", mentions: 15, portion: "large", tags: ["spicy-option"]},
    ...
  ],
  customer_quotes: [
    {dish: "Pad Thai", quote: "Best in town!", sentiment: "positive"},
    ...
  ],
  portion_reputation: "generous",
  price_range: "$$",
  dietary_options: ["vegetarian", "gluten-free"],
  avg_rating: 4.5,
  last_updated: timestamp,
  source: "ai_generated"
}
```

## Re-running

- Safe to run multiple times (will update existing data)
- Recommended frequency: Monthly or when new popular restaurants open
- Can also manually add specific restaurants to the database

## Costs

- **Google Gemini API**: Free tier (15 requests/minute)
- ~165 restaurants × 1 request each = well within free tier
- **Firestore**: Minimal storage cost (~$0.01/month for 200 restaurants)

## Troubleshooting

### "service-account-key.json not found"
- Download from Firebase Console
- Place in project root directory

### "GOOGLE_AI_API_KEY not set"
- Check that `functions/.env` exists
- Verify API key is correct

### Rate limit errors
- Increase delay between requests (line with `setTimeout`)
- Default is 2000ms (2 seconds)

---

**Note**: This generates realistic but AI-inferred menu data. For production use with high accuracy requirements, consider integrating real menu APIs or manual data entry for top restaurants.
