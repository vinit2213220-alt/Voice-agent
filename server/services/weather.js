const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

const getWeather = async (location, date) => {
    console.log(`[Weather Service] Fetching weather for ${location} on ${date}`);

    if (!WEATHER_API_KEY || WEATHER_API_KEY === 'your_weather_key') {
        console.warn('[Weather Service] Missing API Key, returning mock data.');
        return { condition: 'sunny', temperature: 25, note: 'Mock Data' };
    }

    try {
        // Note: Free OpenWeatherMap API only gives current weather or 5 day forecast.
        // For simplicity in this assignment, we'll fetch current weather for the location.
        // A production app would use the Forecast API and find the closest date.
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${WEATHER_API_KEY}&units=metric`);

        const weather = response.data.weather[0].main.toLowerCase();
        const temp = response.data.main.temp;

        return { condition: weather, temperature: temp };
    } catch (error) {
        console.error('[Weather Service] API Error:', error.message);
        return { condition: 'unknown', temperature: 0, error: error.message };
    }
};

module.exports = { getWeather };
