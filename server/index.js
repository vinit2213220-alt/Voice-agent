require('dotenv').config({ path: '../.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');
const bookingRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
// Database Connection
global.isMongoConnected = false;
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB Connected');
        global.isMongoConnected = true;
    })
    .catch(err => {
        console.log('MongoDB Connection Failed (Using In-Memory Fallback)');
        console.error('MongoDB Connection Error:', err); // Show verbose error
    });

// Routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/weather', require('./routes/weather'));

// LiveKit Token Endpoint
app.get('/api/token', async (req, res) => {
    const roomName = req.query.room || 'restaurant-booking';
    const participantName = req.query.username || 'user-' + Math.floor(Math.random() * 10000);

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
        return res.status(500).json({ error: 'Server misconfigured: missing LiveKit keys' });
    }

    try {
        const at = new AccessToken(apiKey, apiSecret, { identity: participantName });
        at.addGrant({ roomJoin: true, room: roomName });
        const token = await at.toJwt();
        res.json({ token, roomName, participantName });
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});

// Health Check
app.get('/', (req, res) => {
    res.send('Voice Agent Backend is Running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
