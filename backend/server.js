const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PORT } = require('./config/env');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const menuRoutes = require('./routes/menu.routes');
const orderRoutes = require('./routes/order.routes');
const statsRoutes = require('./routes/stats.routes');
const userRoutes = require('./routes/user.routes');


const app = express();


// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",          // needed for inline onclick= and <script> init blocks
        "'unsafe-eval'",            // needed for Chart.js in staff stats
        "https://cdn.jsdelivr.net"  // chart.js
      ],
      scriptSrcAttr: ["'unsafe-inline'"], // onclick= attributes
      styleSrc: [
        "'self'",
        "'unsafe-inline'",          // inline <style> blocks
        "https://fonts.googleapis.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'"
      ],
      mediaSrc: [
        "'self'",
        "data:",
        "https://assets.mixkit.co"  // notification sound
      ]
    }
  }
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,                   // limit 100
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api', apiLimiter);

app.use(cors());
app.use(express.json());


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CampusBite backend running' });
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Root redirect to student home
app.get('/', (req, res) => {
  res.redirect('/student/index.html');
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
