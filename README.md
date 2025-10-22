# 🍽️ Lunchinator 3000

A team lunch ordering app that helps your team decide where to eat by collecting food preferences and finding nearby restaurants.

## Features

- **Collect Team Preferences**: Team members enter their name, preferred food type, and dietary restrictions
- **View Team Votes**: See what everyone wants and which food type is most popular
- **Restaurant Search**: Automatically searches for restaurants within 15 miles of your office location (11611 Business Park Blvd N, Champlin, MN 55316)
- **Firestore Integration**: All preferences and orders are stored in Firebase Firestore
- **Real-time Updates**: Preferences update in real-time as team members vote

## Setup Instructions

### 1. Firebase Configuration

Your Firebase project is already configured in `firebase-config.js`. The app uses:
- **Project ID**: lunchinator3000
- **Firestore Database**: Stores lunch preferences and orders

### 2. Enable Firestore

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **lunchinator3000**
3. Click on **Firestore Database** in the left sidebar
4. Click **Create database**
5. Select **Start in test mode** (for development)
6. Choose your preferred location
7. Click **Enable**

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the App

```bash
npm start
```

The app will be available at `http://localhost:8080`

## How It Works

### Step 1: Enter Preferences
Team members enter:
- Their name
- Preferred food type (Pizza, Chinese, Mexican, etc.)
- Any dietary restrictions or notes

### Step 2: View Team Preferences
- See all team votes
- View the most popular food type
- Remove preferences if needed
- Clear all and start over

### Step 3: Find Restaurants
- Click "Find Nearby Restaurants"
- App searches for restaurants matching the most popular food type
- Displays restaurants within 15 miles of the office
- Shows ratings, price levels, and distances

### Step 4: Select Restaurant
- Choose a restaurant from the list
- Selection is saved to Firestore
- Team can proceed with ordering

## Firestore Collections

### `lunch_preferences`
Stores individual team member preferences:
```javascript
{
  name: "John Doe",
  foodType: "pizza",
  dietaryNotes: "vegetarian",
  timestamp: Date
}
```

### `lunch_orders`
Stores restaurant selections:
```javascript
{
  restaurantName: "Pizza Ranch",
  restaurantAddress: "12516 Elm Creek Blvd N, Maple Grove, MN",
  timestamp: Date,
  preferences: [array of preference objects]
}
```

## Technologies Used

- **HTML/CSS/JavaScript**: Frontend
- **Firebase Firestore**: Database
- **Firebase Cloud Functions**: Serverless backend
- **OpenStreetMap Overpass API**: Restaurant data (100% free)
- **Firebase Hosting**: Deployment (optional)

## Deployment

To deploy to Firebase Hosting:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## Security Notes

⚠️ **Important**: The current Firebase configuration uses test mode for development. Before deploying to production:

1. Update Firestore security rules
2. Add authentication
3. Secure API keys
4. Use environment variables for sensitive data

## License

MIT
