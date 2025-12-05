const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

const tools = {
    async getWeather(location, date) {
        console.log(`Getting weather for ${location} on ${date}`);
        try {
            // Call our own backend API which handles the weather logic
            const response = await axios.get(`${SERVER_URL}/api/weather`, {
                params: { location, date }
            });
            return response.data;
        } catch (error) {
            console.error('Weather Tool Error:', error.message);
            return { condition: 'unknown', temperature: 0, error: 'Failed to fetch weather' };
        }
    },

    async checkAvailability(date, time) {
        console.log(`Checking availability for ${date} at ${time}`);
        try {
            const response = await axios.get(`${SERVER_URL}/api/bookings`);
            const bookings = response.data;

            // Simple check
            const conflict = bookings.find(b => {
                try {
                    const bDate = new Date(b.bookingDate).toISOString().split('T')[0];
                    const qDate = new Date(date).toISOString().split('T')[0];
                    return bDate === qDate && b.bookingTime === time && b.status === 'confirmed';
                } catch (e) {
                    return false;
                }
            });

            if (conflict) {
                return { available: false, message: 'Time slot already booked' };
            }
            return { available: true, message: 'Slot available' };
        } catch (error) {
            console.error('Check Availability Error:', error.message);
            // Fallback: assume available if check fails to avoid blocking the user
            return { available: true, message: 'Slot available (check failed)' };
        }
    },

    async createBooking(details) {
        console.log('Creating booking:', details);
        // Normalize seating preference to lowercase to match Mongoose enum
        if (details.seatingPreference) {
            details.seatingPreference = details.seatingPreference.toLowerCase();
        }
        try {
            const response = await axios.post(`${SERVER_URL}/api/bookings`, details);
            return { success: true, booking: response.data };
        } catch (error) {
            console.error('Create Booking Error:', error.response?.data || error.message);
            return { success: false, message: error.response?.data?.message || 'Failed to create booking' };
        }
    }
};

module.exports = tools;
