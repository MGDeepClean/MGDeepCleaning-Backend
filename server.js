require('dotenv').config();
const express = require('express');
const cors = require('cors');
// MG Deep Clean - API Version 1.1 (Production)
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');

// Import Routes
const reviewRoutes = require('./routes/reviewRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to allow your external CDNs (FontAwesome, Tailwind, Google Fonts)
}));
// Dedicated CORS configuration
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://mg-deep-cleaning.vercel.app',
  'https://mgdeepclean.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const isVercel = origin.endsWith('.vercel.app');
    const isTrusted = allowedOrigins.indexOf(origin) !== -1 || isVercel;
    
    if (isTrusted) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression()); // Compress all responses
app.use(morgan('dev')); // Request logging

// Basic Request Timeout (15 seconds)
app.use((req, res, next) => {
  res.setTimeout(15000, () => {
    res.status(408).send({ error: "Request Timeout" });
  });
  next();
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Register Routes
app.use('/api/reviews', reviewRoutes);
app.use('/api/quote', quoteRoutes);
app.use('/api/auth', authRoutes);

const path = require('path');

// Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// 404 Handler
app.use((req, res) => {
  if (req.accepts('html') && !req.path.startsWith('/api/')) {
    res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
  } else {
    res.status(404).json({ error: "Route not found" });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    message: process.env.NODE_ENV === 'production' ? "Something went wrong on our end." : err.message
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
