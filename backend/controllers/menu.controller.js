// controllers/menu.controller.js
const MenuItem = require('../models/menuItem.model');
const NodeCache = require('node-cache');
const menuCache = new NodeCache({ stdTTL: 300 }); //5min

// GET /api/menu?category=snacks
async function getMenu(req, res) {
  try {
    const { category } = req.query;
    const cacheKey = category ? `menu_${category.toLowerCase()}` : 'menu_all';

    //check in cache
    const cachedData = menuCache.get(cacheKey);
    if (cachedData) {
      return res.json({ items: cachedData, source: 'cache' });
    }

    //query database if cache miss
    const filter = {}
    if (category) {
      const catLower = category.toLowerCase();
      // Handle backwards compatibility for refreshments / beverages
      if (catLower === 'refreshments' || catLower === 'beverages') {
        filter.category = { $in: ['refreshments', 'beverages'] };
      } else {
        filter.category = catLower;
      }
    }
    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });

    //store in cache
    menuCache.set(cacheKey, items);

    return res.json({ items, source: 'db' });
  } catch (err) {
    console.error('Get menu error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

//Invalidate cache when staff updates menu
function invalidateMenuCache() {
  menuCache.flushAll();
}

// POST /api/staff/menu
async function createMenuItem(req, res) {
  try {
    const { name, category, price, imageUrl, inStock, avgTime, stockQuantity } = req.body;

    if (!name || !category || price == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const item = await MenuItem.create({
      name,
      category: category.toLowerCase(),
      price,
      imageUrl: req.file ? req.file.path : (imageUrl || ''),
      avgTime: avgTime || '10-15 mins',
      inStock: inStock !== undefined ? inStock : true,
      stockQuantity: stockQuantity !== undefined ? Math.max(0, parseInt(stockQuantity, 10) || 0) : 10,
      createdBy: req.user.id,
    });

    invalidateMenuCache();  //invalidates on write

    return res.status(201).json({ message: 'Item created', item });
  } catch (err) {
    console.error('Create menu item error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// PATCH /api/staff/menu/:id
async function updateMenuItem(req, res) {
  try {
    const { id } = req.params;
    const { name, category, price, imageUrl, inStock, avgTime, stockQuantity } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (category !== undefined) update.category = category.toLowerCase();
    if (price !== undefined) update.price = price;
    if (req.file) {
      update.imageUrl = req.file.path;
    } else if (imageUrl !== undefined) {
      update.imageUrl = imageUrl;
    }
    if (avgTime !== undefined) update.avgTime = avgTime;
    if (inStock !== undefined) update.inStock = inStock;
    if (stockQuantity !== undefined) update.stockQuantity = Math.max(0, parseInt(stockQuantity, 10) || 0);

    const item = await MenuItem.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    invalidateMenuCache();   //invalidates on update

    return res.json({ message: 'Item updated', item });
  } catch (err) {
    console.error('Update menu item error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// DELETE /api/staff/menu/:id
async function deleteMenuItem(req, res) {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    invalidateMenuCache();  //invalidates on delete

    return res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Delete menu item error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getMenu, createMenuItem, updateMenuItem, deleteMenuItem };
