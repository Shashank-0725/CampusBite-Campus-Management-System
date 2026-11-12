// controllers/order.controller.js
const Order = require('../models/order.model');
const MenuItem = require('../models/menuItem.model');

// POST /api/orders
// body: { items: [{ menuItemId, quantity }] }
async function createOrder(req, res) {
  try {
    const userId = req.user.id;
    const { items, note } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Load all menu items in one query
    const ids = items.map((i) => i.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: ids } });

    if (menuItems.length !== items.length) {
      return res.status(400).json({ message: 'Some items not found' });
    }

    const orderItems = [];
    let totalAmount = 0;
    const decrementedItems = [];  //for rollback

    for (const cartItem of items) {

      const qty = cartItem.quantity || 1;

      const menuItem = await MenuItem.findOneAndUpdate({   //atomic update
        _id: cartItem.menuItemId,
        inStock: true,
        stockQuantity: { $gte: qty }
      },
        {
          $inc: { stockQuantity: -qty }
        },
        {
          new: true
        }
      );

      if (!menuItem) {
        //RollBack
        for (const rolled of decrementedItems) {
          await MenuItem.findByIdAndUpdate(rolled.id, {
            $inc: { stockQuantity: rolled.qty }
          });
        }
        return res.status(400).json({ message: `Item Out of Stock or Insufficient Quantity available` });
      }

      decrementedItems.push({ id: menuItem._id, qty });  //track for rollback, if subsequent item fails

      const subtotal = menuItem.price * qty;

      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        imageUrl: menuItem.imageUrl,
        quantity: qty,
        subtotal,
      });


      totalAmount += subtotal;
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ message: 'No valid items in cart' });
    }

    const order = await Order.create({
      user: userId,
      items: orderItems,
      totalAmount,
      note: note || '',
      status: 'pending',
      paymentStatus: 'unpaid',
    });

    //notify kitchen
    if (staffSseClients.size > 0) {
      const populatedOrder = await Order.findById(order._id).populate('user', 'name usnOrStaffId').lean();

      const payload = JSON.stringify({
        event: 'NEW_ORDER',
        order: populatedOrder
      });

      staffSseClients.forEach((client) => {
        client.write(`data: ${payload}\n\n`);
      });

    }

    return res.status(201).json({
      message: 'Order created',
      order,
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/orders/my
async function getMyOrders(req, res) {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ orders });
  } catch (err) {
    console.error('Get my orders error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

//setting up Server Side Events
const sseClients = new Map();  //map to hold list of active clients orderId -> [res]
const userSseClients = new Map(); // userId -> Set of res

// Student SSE: unified stream for all orders of a logged-in student
function streamUserOrders(req, res) {
  const userId = req.user.id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(`data: ${JSON.stringify({ event: 'CONNECTED', message: 'User stream active' })}\n\n`);

  if (!userSseClients.has(userId)) {
    userSseClients.set(userId, new Set());
  }
  userSseClients.get(userId).add(res);

  // Keep-alive heartbeat every 25 seconds to prevent idle timeout and ERR_NETWORK_CHANGED
  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const clients = userSseClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) userSseClients.delete(userId);
    }
  });
}

function streamOrderStatus(req, res) {
  const { id } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(`data: ${JSON.stringify({ message: 'Connected to order status stream' })}\n\n`);

  if (!sseClients.has(id)) {
    sseClients.set(id, []);
  }
  sseClients.get(id).push(res);

  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(id) || [];
    sseClients.set(id, clients.filter((client) => client != res));
  });
}

//Staff SSE to reiceve new orders
const staffSseClients = new Set();

function streamStaffOrders(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(`data: ${JSON.stringify({ event: 'CONNECTED', message: 'Staff Kitchen stream active' })}\n\n`);

  staffSseClients.add(res);

  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    staffSseClients.delete(res);
  });
}

// Staff: GET /api/staff/orders
async function getAllOrders(req, res) {
  try {
    const orders = await Order.find()
      .populate('user', 'name usnOrStaffId email mobile')
      .sort({ createdAt: -1 });

    return res.json({ orders });
  } catch (err) {
    console.error('Get all orders error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Staff: PATCH /api/staff/orders/:id/status
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Push to student unified SSE stream
    const targetUserId = order.user ? order.user.toString() : null;
    if (targetUserId && userSseClients.has(targetUserId)) {
      const payload = JSON.stringify({
        event: 'ORDER_STATUS_UPDATE',
        orderId: order._id,
        status: order.status
      });
      userSseClients.get(targetUserId).forEach((client) => {
        client.write(`data: ${payload}\n\n`);
      });
    }

    // Push event to per-order sse clients (fallback)
    if (sseClients.has(id)) {
      const payload = JSON.stringify({ orderId: id, status: order.status });
      sseClients.get(id).forEach((client) => {
        client.write(`data: ${payload}\n\n`);
      });
    }

    return res.json({ message: 'Status updated', order });

  } catch (err) {
    console.error('Update order status error:', err);
    return res.status(500).json({ message: 'Server error' });
  }



}

// Student: PATCH /api/orders/:id/cancel
async function cancelMyOrder(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, user: userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: `Cannot cancel order in '${order.status}' state. Only pending orders can be cancelled.` });
    }

    // Refund stock quantities
    for (const item of order.items) {
      if (item.menuItem) {
        await MenuItem.findByIdAndUpdate(item.menuItem, {
          $inc: { stockQuantity: item.quantity }
        });
      }
    }

    order.status = 'cancelled';
    await order.save();

    // 1. Notify kitchen staff via SSE so the pending ticket is updated/removed immediately
    if (staffSseClients.size > 0) {
      const payload = JSON.stringify({
        event: 'ORDER_STATUS_UPDATE',
        orderId: order._id,
        status: 'cancelled'
      });
      staffSseClients.forEach((client) => {
        client.write(`data: ${payload}\n\n`);
      });
    }

    // 2. Notify student stream
    if (userSseClients.has(userId)) {
      const payload = JSON.stringify({
        event: 'ORDER_STATUS_UPDATE',
        orderId: order._id,
        status: 'cancelled'
      });
      userSseClients.get(userId).forEach((client) => {
        client.write(`data: ${payload}\n\n`);
      });
    }

    return res.json({ message: 'Order cancelled successfully', order });
  } catch (err) {
    console.error('Cancel order error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { createOrder, getMyOrders, streamOrderStatus, streamStaffOrders, streamUserOrders, getAllOrders, updateOrderStatus, cancelMyOrder };
