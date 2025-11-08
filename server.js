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

// Security middleware - Configuration simplifiée pour développement
app.use(helmet({
  // Désactivation de CSP pour éviter les conflits avec les CDN
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors());

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware d'authentification custom basé sur Easy Auth (Entra ID)
// Objectif : Laisser les routes /api/* accessibles anonymement mais protéger l'UI
// Pré-requis : Dans Azure Portal > Authentication, configurer "Unauthenticated requests" sur Allow anonymous
// Easy Auth ajoutera les en-têtes x-ms-client-principal* si l'utilisateur est authentifié
function requireAuthForUI(req, res, next) {
  // Laisser passer toutes les routes API
  if (req.path.startsWith('/api/')) return next();

  // Fichiers statiques (css/js/images) autorisés sans auth pour charger la page de login potentielle
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  const lowerPath = req.path.toLowerCase();
  if (staticExtensions.some(ext => lowerPath.endsWith(ext))) return next();

  // Easy Auth principal header
  const principalHeader = req.headers['x-ms-client-principal'];

  if (!principalHeader) {
    // Rediriger vers le flux de login Easy Auth (Azure AD)
    const redirectUrl = `/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(req.originalUrl)}`;
    return res.redirect(302, redirectUrl);
  }

  // Utilisateur authentifié
  return next();
}

app.use(requireAuthForUI);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/blobs', blobRoutes);

// Endpoint de debug pour voir les headers reçus (temporaire)
app.all('/api/debug-headers', (req, res) => {
  res.json({
    method: req.method,
    path: req.path,
    headers: req.headers,
    auth: {
      hasClientPrincipal: !!req.headers['x-ms-client-principal'],
      hasAuthToken: !!(req.headers['authorization'] && req.headers['authorization'].toLowerCase().startsWith('bearer '))
    },
    time: new Date().toISOString()
  });
});

// Endpoint de diagnostic pour vérifier la configuration Azure
app.get('/api/diagnostic', (req, res) => {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '3000',
    azure: {
      storageAccountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || 'NOT SET',
      storageAccountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY ? `SET (${process.env.AZURE_STORAGE_ACCOUNT_KEY.length} chars)` : 'NOT SET',
      containerName: process.env.AZURE_BLOB_CONTAINER_NAME || 'NOT SET',
      uploadFolder: process.env.AZURE_UPLOAD_FOLDER || 'NOT SET (default: pdf)'
    },
    allEnvVars: {
      // Afficher toutes les variables qui commencent par AZURE_
      ...Object.keys(process.env)
        .filter(key => key.startsWith('AZURE_'))
        .reduce((obj, key) => {
          obj[key] = key === 'AZURE_STORAGE_ACCOUNT_KEY' 
            ? `SET (${process.env[key].length} chars)` 
            : process.env[key];
          return obj;
        }, {}),
      // Autres variables importantes
      NODE_ENV: process.env.NODE_ENV,
      WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME,
      WEBSITE_RESOURCE_GROUP: process.env.WEBSITE_RESOURCE_GROUP
    },
    warnings: []
  };

  // Vérifications et avertissements
  if (!process.env.AZURE_STORAGE_ACCOUNT_NAME) {
    diagnostic.warnings.push('AZURE_STORAGE_ACCOUNT_NAME is not set');
  }
  if (!process.env.AZURE_STORAGE_ACCOUNT_KEY) {
    diagnostic.warnings.push('AZURE_STORAGE_ACCOUNT_KEY is not set');
  }
  if (!process.env.AZURE_BLOB_CONTAINER_NAME) {
    diagnostic.warnings.push('AZURE_BLOB_CONTAINER_NAME is not set');
  }
  if (!process.env.AZURE_UPLOAD_FOLDER) {
    diagnostic.warnings.push('AZURE_UPLOAD_FOLDER is not set - will use default "pdf"');
  }

  res.json(diagnostic);
});

// Endpoint de test simple pour l'upload
app.post('/api/test-upload', (req, res) => {
  try {
    console.log('=== TEST UPLOAD ENDPOINT ===');
    console.log('Headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);
    
    res.json({
      success: true,
      message: 'Test upload endpoint reached',
      timestamp: new Date().toISOString(),
      headers: req.headers,
      hasBody: !!req.body,
      bodySize: req.body ? JSON.stringify(req.body).length : 0
    });
  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: 'development'
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
    message: err.message // Toujours afficher le message d'erreur détaillé
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: development (simplified)`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});

module.exports = app;