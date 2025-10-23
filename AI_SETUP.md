# AI Integration Setup Guide

This app now uses Google's Gemini AI to generate personalized restaurant recommendations based on team preferences!

## Features

The AI provides:
- **Team Consensus**: Overall explanation of why each restaurant fits the team
- **Per-Person Matches**: Individual analysis for each team member's preferences
- **Conflict Detection**: Identifies when someone's preferences aren't met
- **Dietary Insights**: Specific menu suggestions for different preferences

## Setup Instructions

### 1. Get a Google AI API Key (FREE)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

**Note**: Google Gemini has a generous free tier - perfect for this app!

### 2. Configure the API Key

**✅ ALREADY CONFIGURED!** Your API key is set up in `functions/.env`

The API key is already configured and ready to use. The .env file is protected by .gitignore so it won't be committed to Git.

For reference, the key is stored in:
- Local: `functions/.env` file (already created)
- Production: Automatically loaded from .env during deployment

### 3. Deploy the Cloud Function

**✅ ALREADY DEPLOYED!** The Cloud Function with AI integration is live!

The function was successfully deployed with:
- Google AI API key loaded from .env
- Gemini 1.5 Flash model configured
- All AI analysis features enabled

To redeploy after making changes:
```bash
firebase deploy --only functions
```

### 4. Test the App

1. Open `index.html` in your browser
2. Add team member preferences
3. Click "Find Nearby Restaurants"
4. See AI-powered explanations for each restaurant!

## How It Works

1. **Questions Collected**: Name, cuisine type, hunger level, flavor preference, mood
2. **Restaurant Search**: Finds nearby restaurants using OpenStreetMap
3. **AI Analysis**: Gemini AI analyzes each restaurant against team preferences
4. **Personalized Results**: Each restaurant shows why it fits the team

## API Costs

- **Google Gemini 1.5 Flash**: FREE tier includes 15 requests/minute
- **OpenStreetMap Overpass API**: 100% free, no limits
- **Firebase**: Free tier covers most usage

## Troubleshooting

### "Failed to fetch restaurants"
- Check that your API key is set correctly
- Verify Cloud Functions are deployed: `firebase deploy --only functions`

### No AI explanations showing
- Open browser console (F12) and check for errors
- Verify the API key has access to Gemini 1.5 Flash model
- Check Firebase Functions logs: `firebase functions:log`

### AI responses are generic
- This is the fallback behavior when the API call fails
- Check your API key quota at [Google AI Studio](https://makersuite.google.com/app/apikey)

## Development

To test locally with Firebase Emulators:
```bash
# Set the API key
export GOOGLE_AI_API_KEY="your-api-key-here"

# Start emulators
firebase emulators:start
```

## Model Information

- **Model**: Gemini 1.5 Flash
- **Temperature**: 0.7 (balanced creativity)
- **Max Tokens**: 1000 per restaurant
- **Response Format**: Structured JSON

---

Enjoy AI-powered lunch decisions! 🤖🍽️
