# Deploying Lunchinator 3000 with Real Restaurant Data

## 100% Free Solution Using OpenStreetMap

This app uses Firebase Cloud Functions with OpenStreetMap's Overpass API to fetch **real restaurant data** - completely free with no API keys required!

## What You Get:
- ✅ Real restaurants near Champlin, MN
- ✅ Real addresses, phone numbers, and details
- ✅ Completely free - no API costs
- ✅ No API keys needed for OpenStreetMap
- ✅ Automatic fallback to mock data if API is unavailable

## Deployment Steps:

### 1. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Deploy the Cloud Function
```bash
firebase deploy --only functions
```

This will deploy the `searchRestaurants` Cloud Function to Firebase.

### 4. Firebase Free Tier Limits:
- **Cloud Functions**: 2 million invocations/month (FREE)
- **Firestore**: 50K reads, 20K writes per day (FREE)
- **Hosting**: 10 GB storage, 360MB/day transfer (FREE)

Your app will stay completely within the free tier!

### 5. Deploy the Website (Optional)
```bash
firebase deploy --only hosting
```

## How It Works:

1. **Frontend** collects team lunch preferences
2. **Cloud Function** queries OpenStreetMap Overpass API (free)
3. **Real restaurant data** is returned with:
   - Restaurant names
   - Real addresses
   - Distance from office
   - Cuisine types
   - Takeout availability
4. **Fallback** to mock data if OpenStreetMap API is down

## Local Testing:

To test the Cloud Function locally:
```bash
cd functions
npm run serve
```

Then update the frontend to use the local emulator.

## Notes:
- OpenStreetMap data quality varies by region
- Mock data is kept as a fallback
- No API keys required = no security concerns
- Completely free forever!
