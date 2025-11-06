const fs = require('fs');
const path = require('path');

// Charger le fichier .env si il existe
require('dotenv').config();

console.log('=== VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT ===');
console.log('Date:', new Date().toISOString());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Working directory:', process.cwd());

// Variables requises pour l'application
const requiredEnvVars = [
  'AZURE_STORAGE_ACCOUNT_NAME',
  'AZURE_STORAGE_ACCOUNT_KEY',
  'AZURE_BLOB_CONTAINER_NAME',
  'AZURE_UPLOAD_FOLDER'
];

console.log('\n=== VARIABLES D\'ENVIRONNEMENT ===');
let allVarsPresent = true;

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Masquer la clé pour la sécurité
    if (varName === 'AZURE_STORAGE_ACCOUNT_KEY') {
      console.log(`✓ ${varName}: [DÉFINIE - ${value.length} caractères]`);
    } else {
      console.log(`✓ ${varName}: ${value}`);
    }
  } else {
    console.log(`✗ ${varName}: NON DÉFINIE`);
    allVarsPresent = false;
  }
});

console.log('\n=== AUTRES VARIABLES D\'ENVIRONNEMENT ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'non défini');
console.log('PORT:', process.env.PORT || 'non défini');

console.log('\n=== FICHIERS DE CONFIGURATION ===');
const envFilePath = path.join(process.cwd(), '.env');
if (fs.existsSync(envFilePath)) {
  console.log('✓ Fichier .env trouvé');
  try {
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    console.log(`  - ${lines.length} variables définies dans .env`);
  } catch (error) {
    console.log('  - Erreur lors de la lecture du fichier .env:', error.message);
  }
} else {
  console.log('✗ Fichier .env non trouvé');
}

console.log('\n=== STATUT GLOBAL ===');
if (allVarsPresent) {
  console.log('✓ Toutes les variables requises sont définies');
  process.exit(0);
} else {
  console.log('✗ Certaines variables requises sont manquantes');
  process.exit(1);
}