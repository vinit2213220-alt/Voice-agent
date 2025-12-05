const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/bookings';

async function runTest() {
    console.log('Starting Conflict Test...');

    const bookingDetails = {
        customerName: 'Test User',
        numberOfGuests: 2,
        bookingDate: new Date().toISOString(),
        bookingTime: '19:00',
        cuisinePreference: 'Italian',
        status: 'confirmed'
    };

    try {
        // 1. Create first booking
        console.log('Creating first booking...');
        const res1 = await axios.post(BASE_URL, bookingDetails);
        console.log('First booking created:', res1.status === 201 ? 'SUCCESS' : 'FAILED');

        // 2. Try to create duplicate booking
        console.log('Attempting duplicate booking...');
        await axios.post(BASE_URL, bookingDetails);
        console.log('Duplicate booking created (UNEXPECTED): FAILED');
    } catch (error) {
        if (error.response && error.response.status === 409) {
            console.log('Duplicate booking rejected (EXPECTED): SUCCESS');
            console.log('Message:', error.response.data.message);
        } else {
            console.log('Error:', error.message);
            console.log('Duplicate booking test: FAILED (Wrong error code)');
        }
    }
}

runTest();
