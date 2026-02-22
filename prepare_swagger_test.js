const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Booking = require('./models/Booking');
const User = require('./models/User');
const Vendor = require('./models/Vendor');
const Food = require('./models/Food');
const Cart = require('./models/Cart');
const jwt = require('jsonwebtoken');

dotenv.config();
const uri = process.env.MONGODB_URI;

async function prepareTest() {
    try {
        await mongoose.connect(uri);

        const mockUser = await User.findOne({ phone: '9061213930' }) || await User.findOne();
        const mockVendor = await Vendor.findOne();
        const mockFood = await Food.findOne({ vendor: mockVendor._id });

        if (!mockUser || !mockVendor || !mockFood) {
            console.log('Missing data');
            process.exit(1);
        }

        // Generate User Token
        const token = jwt.sign(
            { id: mockUser._id, phone: mockUser.phone, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Create a Mock Accepted Booking
        const bookingPayload = {
            user: mockUser._id,
            vendor: mockVendor._id,
            serviceType: 'Takeaway',
            isPrebook: false,
            serviceDetails: {
                name: mockUser.name || 'Test User',
                phoneNumber: mockUser.phone || '9061213930',
                serviceType: 'Takeaway'
            },
            cartSnapshot: {
                cartId: new mongoose.Types.ObjectId(),
                items: [{
                    food: mockFood._id,
                    foodName: mockFood.foodName,
                    foodType: mockFood.type || 'veg',
                    quantity: 1,
                    basePrice: mockFood.basePrice,
                    effectivePrice: mockFood.basePrice,
                    itemTotal: mockFood.basePrice
                }],
                totals: { subTotal: mockFood.basePrice, grandTotal: mockFood.basePrice, itemCount: 1 }
            },
            amountSummary: { subTotal: mockFood.basePrice, grandTotal: mockFood.basePrice, itemCount: 1 },
            orderStatus: 'accepted',
            paymentStatus: 'pending'
        };

        const booking = await Booking.create(bookingPayload);

        console.log('--- TEST DATA PREPARED ---');
        require('fs').writeFileSync('swagger_test_data.json', JSON.stringify({
            USER_TOKEN: token,
            BOOKING_ID: booking._id
        }, null, 2));
        console.log('Tokens saved to swagger_test_data.json');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

prepareTest();
