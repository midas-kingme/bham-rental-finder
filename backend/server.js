require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize the cache (7200 seconds = 2 hours)
const rentalCache = new NodeCache({ stdTTL: 7200 });

app.get('/api/rentals', async (req, res) => {
    const { city, maxPrice } = req.query;

    // 1. Validate Input
    if (!city || !maxPrice) {
        return res.status(400).json({ error: "Missing parameters. 'city' and 'maxPrice' are required." });
    }

    // 2. Check the Cache
    const cacheKey = `${city.toLowerCase().trim()}-${maxPrice}`;
    const cachedData = rentalCache.get(cacheKey);
    
    if (cachedData) {
        console.log(`[CACHE HIT] Serving data for ${cacheKey} from memory.`);
        return res.status(200).json(cachedData);
    }

    console.log(`[CACHE MISS] Fetching fresh data for ${cacheKey} from RentCast...`);

    // 3. Fetch Rentals (RentCast API only)
    try {
        const response = await axios.get(`https://api.rentcast.io/v1/listings/rental/long-term`, {
            params: { city, state: 'AL', maxPrice, limit: 100 }, // Pull up to 100 listings
            headers: { 'X-Api-Key': process.env.RENTAL_API_KEY },
            timeout: 5000 
        });
        
        let apartments = response.data;

        if (!apartments || apartments.length === 0) {
            return res.status(200).json([]); 
        }

        // 4. Clean and Sort the Data
        const cleanedApartments = apartments
            // Filter out any junk listings that don't have map coordinates
            .filter(apt => apt.latitude && apt.longitude)
            // Sort by price: lowest to highest
            .sort((a, b) => a.price - b.price);

        // 5. Save to Cache
        rentalCache.set(cacheKey, cleanedApartments);

        // 6. Send Payload to Frontend
        res.status(200).json(cleanedApartments);

    } catch (error) {
        console.error("Rental API Failure:", error.message);
        return res.status(502).json({ error: "Failed to retrieve data from rental provider." });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Backend server is running on http://localhost:${PORT}`);
});