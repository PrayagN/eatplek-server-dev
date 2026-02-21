const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Booking = require('./models/Booking');
const { createBooking, respondToOrder, confirmPayment, getVendorActiveOrders } = require('./controllers/bookingController');

// Load env
dotenv.config();

console.log('Test script loaded. Use Postman or another client to test these endpoints natively with auth tokens, or run individual controller tests here if mocked req/res is set up.');
