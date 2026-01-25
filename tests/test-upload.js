// Script pour créer un fichier PDF de test et l'uploader
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Créer un fichier PDF de test simple
function createTestPDF() {
    // Contenu PDF minimal valide
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
  /Font <<
    /F1 5 0 R
  >>
>>
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF pour MHL Media Manager) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000348 00000 n 
0000000441 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
540
%%EOF`;

    const testFilePath = path.join(__dirname, 'test-document.pdf');
    fs.writeFileSync(testFilePath, pdfContent);
    console.log('✅ Fichier PDF de test créé:', testFilePath);
    return testFilePath;
}

async function testUpload() {
    console.log('=== TEST UPLOAD DE FICHIER ===\n');
    
    try {
        // Créer le fichier de test
        const testFilePath = createTestPDF();
        const fileStats = fs.statSync(testFilePath);
        
        console.log('📄 Fichier de test:');
        console.log('   Nom:', path.basename(testFilePath));
        console.log('   Taille:', fileStats.size, 'bytes');
        console.log('   Chemin:', testFilePath);
        
        // Préparer les données pour l'upload
        const FormData = require('form-data');
        const fileStream = fs.createReadStream(testFilePath);
        const formData = new FormData();
        formData.append('file', fileStream, {
            filename: 'test-document.pdf',
            contentType: 'application/pdf'
        });
        
        // Faire l'upload via l'API
        console.log('\n📤 Upload via l\'API...');
        const fetch = require('node-fetch');
        
        const response = await fetch('http://localhost:3000/api/blobs', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('✅ Upload réussi !');
            console.log('   Fichier uploadé:', result.data.displayName);
            console.log('   URL:', result.data.url);
            console.log('   Taille:', result.data.size || 'non spécifiée');
        } else {
            console.error('❌ Erreur upload:', result.error || 'Erreur inconnue');
        }
        
        // Tester le listage après upload
        console.log('\n📋 Test du listage après upload...');
        const listResponse = await fetch('http://localhost:3000/api/blobs');
        const listResult = await listResponse.json();
        
        if (listResponse.ok && listResult.success) {
            console.log('✅ Listage réussi !');
            console.log('   Nombre de fichiers:', listResult.count);
            listResult.data.forEach((file, index) => {
                console.log(`   ${index + 1}. ${file.displayName} (${file.size} bytes)`);
            });
        } else {
            console.error('❌ Erreur listage:', listResult.error || 'Erreur inconnue');
        }
        
        // Nettoyer le fichier de test local
        fs.unlinkSync(testFilePath);
        console.log('\n🧹 Fichier de test local supprimé');
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.message);
    }
    
    console.log('\n=== FIN TEST ===');
}

// Attendre que le serveur soit prêt puis lancer le test
console.log('⏳ Attente que le serveur soit prêt...');
setTimeout(() => {
    testUpload().catch(console.error);
}, 3000); // Attendre 3 secondes