import { app, GOOGLE_PLACES_API_KEY, DEFAULT_LOCATION } from '/firebase-config.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Initialize Firestore
const db = getFirestore(app);

// Collections
const PREFERENCES_COLLECTION = 'lunch_preferences';
const ORDERS_COLLECTION = 'lunch_orders';

// State
let currentPreferences = [];
let currentRestaurants = [];
let selectedRestaurant = null;

// DOM Elements
const preferencesSection = document.getElementById('preferences-section');
const resultsSection = document.getElementById('results-section');
const restaurantsSection = document.getElementById('restaurants-section');
const ordersSection = document.getElementById('orders-section');

const nameInput = document.getElementById('name');
const foodTypeSelect = document.getElementById('food-type');
const mealSizeSelect = document.getElementById('meal-size');
const vibeSelect = document.getElementById('vibe');
const specificCravingInput = document.getElementById('specific-craving');
const submitPreferenceBtn = document.getElementById('submit-preference');
const preferencesList = document.getElementById('preferences-list');
const findRestaurantsBtn = document.getElementById('find-restaurants');
const resetPreferencesBtn = document.getElementById('reset-preferences');
const restaurantsList = document.getElementById('restaurants-list');
const backToPreferencesBtn = document.getElementById('back-to-preferences');
const loadingDiv = document.getElementById('loading');

// Initialize app
init();

function init() {
    console.log('App initializing...');
    console.log('Submit button:', submitPreferenceBtn);
    console.log('Name input:', nameInput);

    if (!submitPreferenceBtn) {
        console.error('Submit button not found!');
        return;
    }

    setupEventListeners();
    loadPreferences();
    showSection('preferences');
    console.log('App initialized successfully!');
}

function setupEventListeners() {
    submitPreferenceBtn.addEventListener('click', submitPreference);
    findRestaurantsBtn.addEventListener('click', searchRestaurants);
    resetPreferencesBtn.addEventListener('click', resetPreferences);
    backToPreferencesBtn.addEventListener('click', () => showSection('results'));
}

function showSection(section) {
    preferencesSection.classList.remove('active');
    resultsSection.classList.remove('active');
    restaurantsSection.classList.remove('active');

    switch(section) {
        case 'preferences':
            preferencesSection.classList.add('active');
            break;
        case 'results':
            resultsSection.classList.add('active');
            loadPreferences();
            break;
        case 'restaurants':
            restaurantsSection.classList.add('active');
            break;
    }
}

// Submit preference to Firestore
async function submitPreference() {
    console.log('Submit button clicked!');

    const name = nameInput.value.trim();
    const foodType = foodTypeSelect.value;
    const mealSize = mealSizeSelect.value;
    const vibe = vibeSelect.value;
    const specificCraving = specificCravingInput.value.trim();

    console.log('Form values:', { name, foodType, mealSize, vibe, specificCraving });

    if (!name) {
        alert('Please tell us your name!');
        return;
    }

    if (!foodType) {
        alert('Please select what type of food sounds good to you!');
        return;
    }

    if (!mealSize) {
        alert('Please tell us how hungry you are!');
        return;
    }

    if (!vibe) {
        alert('Please select what kind of dining experience you want!');
        return;
    }

    try {
        console.log('Attempting to save to Firestore...');
        await addDoc(collection(db, PREFERENCES_COLLECTION), {
            name,
            foodType,
            mealSize,
            vibe,
            specificCraving,
            timestamp: new Date()
        });

        console.log('Successfully saved to Firestore!');

        // Clear form
        nameInput.value = '';
        foodTypeSelect.value = '';
        mealSizeSelect.value = '';
        vibeSelect.value = '';
        specificCravingInput.value = '';

        // Show results
        showSection('results');
    } catch (error) {
        console.error('Error adding preference:', error);
        alert(`Error saving preference: ${error.message}`);
    }
}

// Load all preferences from Firestore
async function loadPreferences() {
    try {
        const q = query(collection(db, PREFERENCES_COLLECTION), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        currentPreferences = [];
        querySnapshot.forEach((doc) => {
            currentPreferences.push({ id: doc.id, ...doc.data() });
        });

        displayPreferences();
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

// Display preferences
function displayPreferences() {
    if (currentPreferences.length === 0) {
        preferencesList.innerHTML = '<p class="empty-state">No preferences yet. Be the first to add yours!</p>';
        return;
    }

    // Count food type preferences
    const foodTypeCounts = {};
    currentPreferences.forEach(pref => {
        foodTypeCounts[pref.foodType] = (foodTypeCounts[pref.foodType] || 0) + 1;
    });

    // Find most popular
    const mostPopular = Object.entries(foodTypeCounts)
        .sort((a, b) => b[1] - a[1])[0];

    let html = '<div class="summary">';
    html += `<h3>📊 Most Popular: ${capitalizeFirst(mostPopular[0])} (${mostPopular[1]} votes)</h3>`;
    html += '</div>';

    html += '<div class="preferences-grid">';
    currentPreferences.forEach(pref => {
        html += `
            <div class="preference-card">
                <div class="preference-header">
                    <strong>${pref.name}</strong>
                    <button class="btn-delete" onclick="deletePreference('${pref.id}')">✕</button>
                </div>
                <div class="preference-body">
                    <p class="food-type">🍴 ${capitalizeFirst(pref.foodType)}</p>
                    <p class="preference-detail">🍽️ ${capitalizeFirst(pref.mealSize)} meal</p>
                    <p class="preference-detail">✨ ${capitalizeFirst(pref.vibe)}</p>
                    ${pref.specificCraving ? `<p class="craving">💭 "${pref.specificCraving}"</p>` : ''}
                </div>
            </div>
        `;
    });
    html += '</div>';

    preferencesList.innerHTML = html;
}

// Delete preference
window.deletePreference = async function(id) {
    if (!confirm('Remove this preference?')) return;

    try {
        await deleteDoc(doc(db, PREFERENCES_COLLECTION, id));
        loadPreferences();
    } catch (error) {
        console.error('Error deleting preference:', error);
        alert('Error deleting preference.');
    }
};

// Reset all preferences
async function resetPreferences() {
    if (!confirm('Clear all preferences and start over?')) return;

    try {
        const querySnapshot = await getDocs(collection(db, PREFERENCES_COLLECTION));
        const deletePromises = [];
        querySnapshot.forEach((document) => {
            deletePromises.push(deleteDoc(doc(db, PREFERENCES_COLLECTION, document.id)));
        });
        await Promise.all(deletePromises);

        currentPreferences = [];
        displayPreferences();
        showSection('preferences');
    } catch (error) {
        console.error('Error resetting preferences:', error);
        alert('Error clearing preferences.');
    }
}

// Search for restaurants
async function searchRestaurants() {
    if (currentPreferences.length === 0) {
        alert('Add some preferences first!');
        return;
    }

    showSection('restaurants');
    loadingDiv.style.display = 'block';
    restaurantsList.innerHTML = '';

    // Get most popular food type
    const foodTypeCounts = {};
    currentPreferences.forEach(pref => {
        foodTypeCounts[pref.foodType] = (foodTypeCounts[pref.foodType] || 0) + 1;
    });
    const mostPopularType = Object.entries(foodTypeCounts)
        .sort((a, b) => b[1] - a[1])[0][0];

    try {
        const restaurants = await findNearbyRestaurants(mostPopularType);
        currentRestaurants = restaurants;
        displayRestaurants(restaurants, mostPopularType);
    } catch (error) {
        console.error('Error searching restaurants:', error);
        restaurantsList.innerHTML = '<p class="error">Error finding restaurants. Please check your API key configuration.</p>';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Find nearby restaurants using Google Places API
async function findNearbyRestaurants(foodType) {
    // Note: In production, this should be done through a backend proxy
    // to keep API keys secure. For now, we'll use a mock response.

    if (GOOGLE_PLACES_API_KEY === 'YOUR_GOOGLE_PLACES_API_KEY') {
        // Return mock data if API key not configured
        return getMockRestaurants(foodType);
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
            `location=${DEFAULT_LOCATION.lat},${DEFAULT_LOCATION.lng}` +
            `&radius=${DEFAULT_LOCATION.radius}` +
            `&type=restaurant` +
            `&keyword=${foodType}` +
            `&key=${GOOGLE_PLACES_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
            return data.results.slice(0, 10).map(place => ({
                id: place.place_id,
                name: place.name,
                address: place.vicinity,
                rating: place.rating || 'N/A',
                priceLevel: place.price_level ? '$'.repeat(place.price_level) : 'N/A',
                isOpen: place.opening_hours?.open_now
            }));
        } else {
            throw new Error(`Places API error: ${data.status}`);
        }
    } catch (error) {
        console.error('Error fetching from Places API:', error);
        return getMockRestaurants(foodType);
    }
}

// Mock restaurant data for testing
function getMockRestaurants(foodType) {
    const mockData = {
        pizza: [
            { name: "Pizza Ranch", address: "12516 Elm Creek Blvd N, Maple Grove, MN", rating: 4.2, priceLevel: "$$", distance: "3.2 miles" },
            { name: "Papa Murphy's", address: "11905 Elm Creek Blvd, Maple Grove, MN", rating: 4.0, priceLevel: "$", distance: "2.8 miles" },
            { name: "Domino's Pizza", address: "11471 Fountains Dr, Maple Grove, MN", rating: 3.8, priceLevel: "$", distance: "4.1 miles" }
        ],
        chinese: [
            { name: "Hunan Garden", address: "12544 Elm Creek Blvd, Maple Grove, MN", rating: 4.3, priceLevel: "$$", distance: "3.5 miles" },
            { name: "Great Hunan", address: "12920 Elm Creek Blvd N, Maple Grove, MN", rating: 4.1, priceLevel: "$$", distance: "4.2 miles" }
        ],
        mexican: [
            { name: "Chipotle Mexican Grill", address: "12447 Elm Creek Blvd, Maple Grove, MN", rating: 4.0, priceLevel: "$$", distance: "3.1 miles" },
            { name: "Qdoba Mexican Eats", address: "7800 Main St N, Maple Grove, MN", rating: 3.9, priceLevel: "$$", distance: "5.8 miles" }
        ],
        american: [
            { name: "Five Guys", address: "12544 Elm Creek Blvd, Maple Grove, MN", rating: 4.3, priceLevel: "$$", distance: "3.5 miles" },
            { name: "Culver's", address: "11905 Elm Creek Blvd, Maple Grove, MN", rating: 4.4, priceLevel: "$$", distance: "2.9 miles" }
        ]
    };

    return mockData[foodType] || mockData.american;
}

// Display restaurants
function displayRestaurants(restaurants, foodType) {
    if (restaurants.length === 0) {
        restaurantsList.innerHTML = `<p class="empty-state">No ${foodType} restaurants found within 15 miles.</p>`;
        return;
    }

    let html = `<h3>🍽️ ${capitalizeFirst(foodType)} Restaurants Near You</h3>`;
    html += '<div class="restaurants-grid">';

    restaurants.forEach(restaurant => {
        html += `
            <div class="restaurant-card">
                <h4>${restaurant.name}</h4>
                <p class="address">📍 ${restaurant.address}</p>
                ${restaurant.distance ? `<p class="distance">📏 ${restaurant.distance}</p>` : ''}
                <div class="restaurant-details">
                    <span class="rating">⭐ ${restaurant.rating}</span>
                    <span class="price">${restaurant.priceLevel}</span>
                </div>
                <button class="btn btn-primary" onclick="selectRestaurant('${restaurant.name}', '${restaurant.address}')">
                    Choose This Restaurant
                </button>
            </div>
        `;
    });

    html += '</div>';
    restaurantsList.innerHTML = html;
}

// Select restaurant and save to Firestore
window.selectRestaurant = async function(name, address) {
    try {
        selectedRestaurant = { name, address };

        // Save selection to Firestore
        await addDoc(collection(db, ORDERS_COLLECTION), {
            restaurantName: name,
            restaurantAddress: address,
            timestamp: new Date(),
            preferences: currentPreferences
        });

        alert(`Great! The team will order from ${name}`);
        showSection('results');
    } catch (error) {
        console.error('Error saving restaurant selection:', error);
        alert('Error saving selection. Please try again.');
    }
};

// Utility functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
