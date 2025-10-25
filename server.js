// Load environment variables FIRST
require('dotenv').config();

// Debug: Check if environment variables are loaded
console.log('Environment variables loaded:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- AZURE_STORAGE_ACCOUNT_NAME:', process.env.AZURE_STORAGE_ACCOUNT_NAME ? 'SET' : 'NOT SET');
console.log('- AZURE_BLOB_CONTAINER_NAME:', process.env.AZURE_BLOB_CONTAINER_NAME ? 'SET' : 'NOT SET');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const blobRoutes = require('./src/routes/blobRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
const cspConfig = process.env.NODE_ENV === 'development' ? {
  // Configuration moins restrictive pour le développement
  contentSecurityPolicy: false
} : {
  // Configuration sécurisée pour la production
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://cdn.jsdelivr.net", 
        "https://cdnjs.cloudflare.com",
        "https://cdn.datatables.net"
      ],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net", 
        "https://cdnjs.cloudflare.com", 
        "https://code.jquery.com",
        "https://cdn.datatables.net"
      ],
      fontSrc: [
        "'self'", 
        "https://cdnjs.cloudflare.com",
        "data:"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:",
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://code.jquery.com",
        "https://cdn.datatables.net",
        "https://*.blob.core.windows.net"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:", "data:"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    }
  }
};

app.use(helmet(cspConfig));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors());

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/blobs', blobRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug route
app.get('/debug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'debug.html'));
});

// Serve the main HTML file for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});

module.exports = app;