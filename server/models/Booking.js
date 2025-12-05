const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true,
    default: () => Math.random().toString(36).substr(2, 9)
  },
  customerName: {
    type: String,
    required: true
  },
  numberOfGuests: {
    type: Number,
    required: true
  },
  bookingDate: {
    type: Date,
    required: true
  },
  bookingTime: {
    type: String,
    required: true
  },
  cuisinePreference: {
    type: String,
    default: 'None'
  },
  specialRequests: {
    type: String,
    default: 'None'
  },
  weatherInfo: {
    type: Object,
    default: {}
  },
  seatingPreference: {
    type: String,
    enum: ['indoor', 'outdoor', 'any'],
    default: 'any'
  },
  status: {
    type: String,
    enum: ['confirmed', 'pending', 'cancelled'],
    default: 'confirmed'
  },
  language: {
    type: String,
    default: 'en'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', BookingSchema);
