const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');

// Mock Data Store
let mockBookings = [];

// GET all bookings
router.get('/', async (req, res) => {
    try {
        if (global.isMongoConnected) {
            const bookings = await Booking.find().sort({ createdAt: -1 });
            res.json(bookings);
        } else {
            res.json(mockBookings);
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET specific booking
router.get('/:id', async (req, res) => {
    try {
        if (global.isMongoConnected) {
            const booking = await Booking.findOne({ bookingId: req.params.id });
            if (!booking) return res.status(404).json({ message: 'Booking not found' });
            res.json(booking);
        } else {
            const booking = mockBookings.find(b => b.bookingId === req.params.id);
            if (!booking) return res.status(404).json({ message: 'Booking not found' });
            res.json(booking);
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create booking
router.post('/', async (req, res) => {
    const {
        customerName,
        numberOfGuests,
        bookingDate,
        bookingTime,
        cuisinePreference,
        specialRequests,
        weatherInfo,
        seatingPreference,
        language
    } = req.body;

    try {
        // Check for conflicts (Bonus Feature)
        if (global.isMongoConnected) {
            const conflict = await Booking.findOne({
                bookingDate: new Date(bookingDate),
                bookingTime: bookingTime,
                status: 'confirmed'
            });
            if (conflict) return res.status(409).json({ message: 'Time slot already booked' });
        } else {
            const conflict = mockBookings.find(b =>
                new Date(b.bookingDate).toISOString() === new Date(bookingDate).toISOString() &&
                b.bookingTime === bookingTime &&
                b.status === 'confirmed'
            );
            if (conflict) return res.status(409).json({ message: 'Time slot already booked' });
        }

        const newBookingData = {
            customerName,
            numberOfGuests,
            bookingDate: new Date(bookingDate),
            bookingTime,
            cuisinePreference,
            specialRequests,
            weatherInfo,
            seatingPreference,
            language,
            status: 'confirmed',
            createdAt: new Date(),
            bookingId: 'bk_' + Math.random().toString(36).substr(2, 9)
        };

        let savedBooking;
        if (global.isMongoConnected) {
            const newBooking = new Booking(newBookingData);
            savedBooking = await newBooking.save();
        } else {
            savedBooking = newBookingData;
            mockBookings.unshift(savedBooking);
        }

        // Send Notifications (Bonus Feature)
        try {
            const notificationService = require('../services/notification');
            // Use the admin email/phone from env for the demo, or the customer's if we had it
            const recipientEmail = process.env.EMAIL_USER;
            const recipientPhone = process.env.ADMIN_PHONE; // Send to personal number

            if (recipientEmail) {
                notificationService.sendEmail(recipientEmail, 'Booking Confirmation', `Your booking for ${customerName} is confirmed!`);
            }
            if (recipientPhone) {
                notificationService.sendSMS(recipientPhone, `Booking Confirmed: ${customerName} at ${bookingTime}`);
            }
        } catch (e) {
            console.error('Notification Error:', e);
        }

        res.status(201).json(savedBooking);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE cancel booking
router.delete('/:id', async (req, res) => {
    try {
        const booking = await Booking.findOneAndDelete({ bookingId: req.params.id });
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        res.json({ message: 'Booking cancelled' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
