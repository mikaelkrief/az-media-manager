const http = require('http');

async function testAPI() {
    console.log('🚀 Test de l\'API MHL Media Manager');
    console.log('=====================================\n');
    
    // Test 1: Health check
    try {
        console.log('1. Test Health Check...');
        const healthResponse = await makeRequest('GET', '/health');
        console.log('✅ Health Check OK:', JSON.stringify(healthResponse, null, 2));
    } catch (error) {
        console.log('❌ Health Check failed:', error.message);
        return;
    }
    
    // Test 2: Blobs API
    try {
        console.log('\n2. Test API Blobs...');
        const blobsResponse = await makeRequest('GET', '/api/blobs');
        console.log('✅ API Blobs OK');
        console.log('   Status:', blobsResponse.status);
        console.log('   Count:', blobsResponse.count);
        console.log('   Files:', blobsResponse.data?.length || 0);
        
        if (blobsResponse.data && blobsResponse.data.length > 0) {
            console.log('\n📁 Fichiers trouvés:');
            blobsResponse.data.forEach((blob, i) => {
                console.log(`   ${i+1}. ${blob.displayName} (${formatSize(blob.size)})`);
            });
        }
    } catch (error) {
        console.log('❌ API Blobs failed:', error.message);
        
        if (error.message.includes('This request is not authorized')) {
            console.log('\n💡 Suggestions:');
            console.log('   - Vérifier les rôles RBAC dans Azure');
            console.log('   - Le Service Principal doit avoir le rôle "Storage Blob Data Contributor"');
            console.log('   - Vérifier les variables d\'environnement Azure');
        }
    }
    
    console.log('\n✅ Tests terminés');
}

function makeRequest(method, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(response);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${response.error || response.message || 'Unknown error'}`));
                    }
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${data}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Exécuter les tests
testAPI().catch(console.error);