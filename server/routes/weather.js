const express = require('express');
const router = express.Router();
const weatherService = require('../services/weather');

// GET /api/weather?location=...&date=...
router.get('/', async (req, res) => {
    const { location, date } = req.query;

    if (!location) {
        return res.status(400).json({ message: 'Location is required' });
    }

    try {
        const weatherData = await weatherService.getWeather(location, date);
        res.json(weatherData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
