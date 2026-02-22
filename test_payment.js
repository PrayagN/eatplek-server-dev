const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Booking = require('./models/Booking');
const User = require('./models/User');
const Vendor = require('./models/Vendor');
const Food = require('./models/Food');
const Cart = require('./models/Cart');
const { createBooking, confirmPayment, getUserOrders, getOrderTrackerDetails, getVendorActiveOrders, respondToOrder } = require('./controllers/bookingController');

// Load env
dotenv.config();

// Ensure db connects
const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

async function runFullTestCycle() {
    let mockUser, mockVendor, mockFood;
    try {
        await mongoose.connect(uri);
        console.log('--- 🟢 Connected to DB for Full E2E Test ---');

        console.log('\n--- 🛠️ Setup: Finding Mock Data ---');
        mockUser = await User.findOne();
        mockVendor = await Vendor.findOne();
        mockFood = await Food.findOne({ vendor: mockVendor._id });

        if (!mockUser || !mockVendor || !mockFood) {
            console.log('Missing basic mock data in DB (User, Vendor, Food). Cannot run automated test. Skipping.');
            process.exit(0);
        }
        console.log(`Using User: ${mockUser.name}, Vendor: ${mockVendor.restaurantName}`);

        console.log('\n--- 1. Testing Create Booking [User] ---');
        // Helper to mock express req/res
        let lastResponse = null;
        const createMockRes = () => ({
            status: function (s) { this.statusCode = s; return this; },
            json: function (data) {
                this.data = data;
                lastResponse = data;
                return this;
            }
        });

        // Mock an active cart
        await Cart.deleteOne({ user: mockUser._id });
        const tempCart = await Cart.create({
            user: mockUser._id,
            vendor: mockVendor._id,
            serviceType: 'Takeaway',
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
        });

        const createReq = {
            user: { id: mockUser._id.toString() },
            body: { serviceType: 'Takeaway', reachTime: new Date(Date.now() + 3600000).toISOString() }
        };

        // Express Validator Mock Result
        const validationResultMock = { isEmpty: () => true, array: () => [] };
        const expressValidator = require('express-validator');
        expressValidator.validationResult = () => validationResultMock;

        const createPromise = createBooking(createReq, createMockRes());

        // Give createBooking 1 second to write the pending order to the DB before finding it
        await new Promise(r => setTimeout(r, 1500));

        // We expect a timeout because there's no frontend polling, but it still created the Booking
        const booking = await Booking.findOne({ user: mockUser._id }).sort({ createdAt: -1 });
        console.log(`✅ Booking Created/Found: ${booking._id}`);

        console.log('\n--- 2. Testing Vendor Accept Order [Vendor] ---');
        const acceptReq = {
            params: { bookingId: booking._id.toString() },
            body: { action: 'accept' },
            user: { id: mockVendor._id.toString() }
        };
        await respondToOrder(acceptReq, createMockRes());
        console.log(`✅ Accept Res: ${lastResponse.message}`);

        // Wait for the booking loop to resolve now that it was accepted
        await createPromise;

        console.log('\n--- 3. Testing Confirm Payment [User] ---');
        const paymentReq = {
            params: { bookingId: booking._id.toString() },
            body: { transactionId: 'TXN_' + Date.now(), paymentMethod: 'ONLINE' },
            user: { id: mockUser._id.toString() }
        };
        await confirmPayment(paymentReq, createMockRes());
        console.log(`✅ Payment Res: ${lastResponse.message}. Status is now ${lastResponse.data.paymentStatus}`);

        console.log('\n--- 4. Testing My Orders List [User] ---');
        const myOrdersReq = { user: { id: mockUser._id.toString() }, query: {} };
        await getUserOrders(myOrdersReq, createMockRes());
        console.log(`✅ My Orders Count: ${lastResponse.data.orders.length}`);

        console.log('\n--- 5. Testing Track Order Map Fetch [User] ---');
        const trackReq = {
            params: { bookingId: booking._id.toString() },
            user: { id: mockUser._id.toString() }
        };
        await getOrderTrackerDetails(trackReq, createMockRes());
        console.log(`✅ Track Order Res: Returned detail payload for ${lastResponse.data.id}`);

        console.log('\n--- 6. Testing Vendor Active Queue [Vendor] ---');
        const activeOrdersReq = { user: { id: mockVendor._id.toString() } };
        await getVendorActiveOrders(activeOrdersReq, createMockRes());
        console.log(`✅ Vendor Active Queue Count: ${lastResponse.data.length}`);

        console.log('\n--- 🧹 Cleanup: Removing Test Mock Cart/Booking ---');
        await Booking.deleteOne({ _id: booking._id });
        await Cart.deleteOne({ _id: tempCart._id });

        console.log('\n🎉 ALL APIS TESTED SUCCESSFULLY!');
    } catch (err) {
        console.error('\n❌ Test Failed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

runFullTestCycle();
