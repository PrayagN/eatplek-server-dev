const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getCart, addItem, removeItem, clearCart, connectCart, disconnectCart } = require('../controllers/cartController');
const { addToCartValidation, removeCartItemValidation, connectCartValidation } = require('../validations/cart.validations');

router.get('/', authenticateToken, getCart);
router.post('/items', authenticateToken, addToCartValidation, addItem);
router.delete('/items/:itemId', authenticateToken, removeCartItemValidation, removeItem);
router.delete('/', authenticateToken, clearCart);
router.post('/connect', authenticateToken, connectCartValidation, connectCart);
router.post('/disconnect', authenticateToken, disconnectCart);

module.exports = router;

