const http = require('http');

// Test API Server
function testAPIServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/api/books', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const books = JSON.parse(data);
          console.log(`✅ API Server: Connected successfully (${books.length} books found)`);
          resolve(true);
        } catch (e) {
          console.log('❌ API Server: Response parsing failed');
          resolve(false);
        }
      });
    });

    req.on('error', () => {
      console.log('❌ API Server: Connection failed');
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ API Server: Timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test DigitalPersona Server
function testDigitalPersonaServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:52181/health', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          console.log(`✅ DigitalPersona Server: Connected successfully (${health.status})`);
          resolve(true);
        } catch (e) {
          console.log('❌ DigitalPersona Server: Response parsing failed');
          resolve(false);
        }
      });
    });

    req.on('error', () => {
      console.log('❌ DigitalPersona Server: Connection failed');
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ DigitalPersona Server: Timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test MySQL Database
function testMySQLDatabase() {
  return new Promise((resolve) => {
    const mysql = require('mysql2/promise');

    const config = {
      host: 'localhost',
      user: 'root',
      password: 'Allanware5895',
      database: 'school_library',
      port: 3306
    };

    mysql.createConnection(config)
      .then(() => {
        console.log('✅ MySQL Database: Connected successfully');
        resolve(true);
      })
      .catch(() => {
        console.log('❌ MySQL Database: Connection failed');
        resolve(false);
      });
  });
}

async function testAllServices() {
  console.log('🔍 Testing all services...\n');

  const results = await Promise.all([
    testAPIServer(),
    testDigitalPersonaServer(),
    testMySQLDatabase()
  ]);

  const allPassed = results.every(r => r);

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 All services are running correctly!');
    console.log('📚 API Server: http://localhost:3001');
    console.log('🔗 DigitalPersona: http://localhost:52181');
    console.log('🗄️ MySQL Database: localhost:3306');
  } else {
    console.log('⚠️ Some services may have issues. Check the output above.');
  }
  console.log('='.repeat(50));

  process.exit(allPassed ? 0 : 1);
}

testAllServices();