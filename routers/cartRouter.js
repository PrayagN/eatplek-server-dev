const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getCart, addItem, removeItem, clearCart, connectCart, disconnectCart, getAvailableAddOns } = require('../controllers/cartController');
const { addToCartValidation, removeCartItemValidation, connectCartValidation } = require('../validations/cart.validations');

router.get('/items/:itemId/addons', authenticateToken, getAvailableAddOns);
router.get('/items/:itemId/debug-test', (req, res) => {
  res.json({
    success: true,
    message: 'Debug route works',
    receivedItemId: req.params.itemId,
    originalUrl: req.originalUrl,
    path: req.path
  });
});
router.get('/', authenticateToken, getCart);
router.post('/items', authenticateToken, addToCartValidation, addItem);
router.delete('/', authenticateToken, clearCart);
router.post('/connect', authenticateToken, connectCartValidation, connectCart);
router.post('/disconnect', authenticateToken, disconnectCart);


router.delete('/items/:itemId', authenticateToken, removeCartItemValidation, removeItem);

console.log('Registered cart routes:');
router.stack.forEach(r => {
  if (r.route) console.log(r.route.path, Object.keys(r.route.methods));
});


module.exports = router;