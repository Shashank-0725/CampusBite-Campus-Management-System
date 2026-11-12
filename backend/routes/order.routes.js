// routes/order.routes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// Student: create order + list own orders + cancel pending order
router.post('/', authMiddleware, orderController.createOrder);
router.get('/my', authMiddleware, orderController.getMyOrders);
router.patch('/:id/cancel', authMiddleware, orderController.cancelMyOrder);

// Staff/Admin: view and update all orders
router.get(
  '/staff',
  authMiddleware,
  requireRole('staff', 'admin'),
  orderController.getAllOrders
);

router.get(
  '/staff/stream',
  authMiddleware,
  requireRole('staff', 'admin'),
  orderController.streamStaffOrders
);

// Student unified SSE stream (single connection for all their orders)
router.get(
  '/user/stream',
  authMiddleware,
  orderController.streamUserOrders
);

// Legacy per-order sse stream (fallback)
router.get(
  '/:id/stream',
  orderController.streamOrderStatus
);

router.patch(
  '/staff/:id/status',
  authMiddleware,
  requireRole('staff', 'admin'),
  orderController.updateOrderStatus
);

module.exports = router;
