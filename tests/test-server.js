const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001; // Utilisons un autre port pour éviter les conflits

// Middleware de base
app.use(express.json());

// Route de test simple
app.get('/test', (req, res) => {
    console.log('✅ Route /test appelée');
    res.json({
        status: 'OK',
        message: 'Test server works!',
        timestamp: new Date().toISOString()
    });
});

// Route health simple
app.get('/health', (req, res) => {
    console.log('✅ Route /health appelée');
    res.json({
        status: 'OK',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// Route pour servir les fichiers statiques
app.use(express.static('public'));

// Route principale
app.get('/', (req, res) => {
    console.log('✅ Route / appelée');
    res.json({
        message: 'Serveur de test MHL Media Manager',
        endpoints: {
            '/test': 'Test simple',
            '/health': 'Health check',
            '/debug': 'Page de debug'
        }
    });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur de test démarré sur le port ${PORT}`);
    console.log(`   http://localhost:${PORT}/test`);
    console.log(`   http://localhost:${PORT}/health`);
    console.log('');
    console.log('Appuyez sur Ctrl+C pour arrêter le serveur');
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\n👋 Arrêt du serveur de test...');
    process.exit(0);
});