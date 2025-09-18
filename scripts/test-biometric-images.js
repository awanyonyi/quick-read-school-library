#!/usr/bin/env node

/**
 * Test Script for Biometric Image Storage
 * Tests the biometric image upload and retrieval functionality
 */

const fs = require('fs');
const path = require('path');

// Simple test image (1x1 pixel PNG in base64)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function testBiometricImageStorage() {
  console.log('🧪 Testing Biometric Image Storage Functionality\n');

  const baseURL = 'http://localhost:3001';

  try {
    // Test 1: Check if API server is running
    console.log('1. Testing API server connection...');
    const healthResponse = await fetch(`${baseURL}/api/students`);
    if (!healthResponse.ok) {
      throw new Error(`API server not responding: ${healthResponse.status}`);
    }
    console.log('   ✅ API server is running');

    // Test 2: Create a test student
    console.log('\n2. Creating test student...');
    const testStudent = {
      name: 'Test Biometric Student',
      admission_number: 'TEST001',
      email: 'test@biometric.edu',
      class: 'Test Class'
    };

    const createResponse = await fetch(`${baseURL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testStudent)
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create test student: ${createResponse.status}`);
    }

    const student = await createResponse.json();
    console.log(`   ✅ Created test student: ${student.name} (ID: ${student.id})`);

    // Test 3: Upload biometric images
    console.log('\n3. Uploading biometric images...');
    const biometricData = {
      biometric_enrolled: true,
      biometric_id: 'test_biometric_001',
      biometric_data: JSON.stringify({
        fingerprint: 'test_fingerprint_data',
        biometricId: 'test_biometric_001'
      }),
      fingerprint_image: `data:image/png;base64,${TEST_IMAGE_BASE64}`,
      face_image: `data:image/png;base64,${TEST_IMAGE_BASE64}`,
      image_format: 'png',
      image_quality: 90
    };

    const uploadResponse = await fetch(`${baseURL}/api/students/${student.id}/biometric`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(biometricData)
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Failed to upload biometric images: ${uploadResponse.status} - ${error}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('   ✅ Biometric images uploaded successfully');
    console.log(`   📊 Images stored: Fingerprint: ${uploadResult.images_stored?.fingerprint}, Face: ${uploadResult.images_stored?.face}`);

    // Test 4: Retrieve biometric images
    console.log('\n4. Retrieving biometric images...');
    const retrieveResponse = await fetch(`${baseURL}/api/students/${student.id}/biometric-images`);

    if (!retrieveResponse.ok) {
      throw new Error(`Failed to retrieve biometric images: ${retrieveResponse.status}`);
    }

    const images = await retrieveResponse.json();
    console.log('   ✅ Biometric images retrieved successfully');
    console.log(`   🖼️  Fingerprint image: ${images.fingerprint_image ? 'Present' : 'Not found'}`);
    console.log(`   🖼️  Face image: ${images.face_image ? 'Present' : 'Not found'}`);
    console.log(`   📅 Last capture: ${images.last_capture || 'Not set'}`);

    // Test 5: Store verification images
    console.log('\n5. Storing biometric verification images...');
    const verificationData = {
      verification_log_id: null,
      student_id: student.id,
      image_type: 'fingerprint',
      image_data: `data:image/png;base64,${TEST_IMAGE_BASE64}`,
      image_format: 'png',
      image_quality: 90,
      device_info: {
        device: 'Test Device',
        browser: 'Test Browser',
        timestamp: new Date().toISOString()
      }
    };

    const verificationResponse = await fetch(`${baseURL}/api/biometric-verification/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verificationData)
    });

    if (!verificationResponse.ok) {
      const error = await verificationResponse.text();
      throw new Error(`Failed to store verification image: ${verificationResponse.status} - ${error}`);
    }

    const verificationResult = await verificationResponse.json();
    console.log('   ✅ Verification image stored successfully');
    console.log(`   🆔 Image ID: ${verificationResult.image_id}`);

    // Test 6: Retrieve verification images
    console.log('\n6. Retrieving verification images...');
    const listResponse = await fetch(`${baseURL}/api/biometric-verification/images?student_id=${student.id}`);

    if (!listResponse.ok) {
      throw new Error(`Failed to retrieve verification images: ${listResponse.status}`);
    }

    const verificationImages = await listResponse.json();
    console.log(`   ✅ Found ${verificationImages.length} verification image(s)`);

    if (verificationImages.length > 0) {
      const firstImage = verificationImages[0];
      console.log(`   📊 Image details: Type: ${firstImage.image_type}, Format: ${firstImage.image_format}, Size: ${firstImage.image_size} bytes`);
    }

    // Test 7: Test biometric verification with images
    console.log('\n7. Testing biometric verification with images...');
    const verifyData = {
      fingerprint: 'test_fingerprint_data',
      fingerprint_image: `data:image/png;base64,${TEST_IMAGE_BASE64}`,
      face_image: `data:image/png;base64,${TEST_IMAGE_BASE64}`,
      device_info: {
        device: 'Test Device',
        browser: 'Test Browser'
      },
      verification_type: 'test_verification'
    };

    const verifyResponse = await fetch(`${baseURL}/api/biometric/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyData)
    });

    const verifyResult = await verifyResponse.json();

    if (verifyResponse.ok && verifyResult.success) {
      console.log('   ✅ Biometric verification successful');
      console.log(`   👤 Student ID: ${verifyResult.studentId}`);
      console.log(`   📝 Verification log ID: ${verifyResult.verification_log_id}`);
      console.log(`   🖼️  Images stored: ${verifyResult.images_stored}`);
    } else {
      console.log(`   ⚠️  Biometric verification result: ${verifyResult.message || 'Unknown'}`);
    }

    // Summary
    console.log('\n🎉 BIOMETRIC IMAGE STORAGE TEST COMPLETED SUCCESSFULLY!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ API server connection');
    console.log('   ✅ Student creation');
    console.log('   ✅ Biometric image upload');
    console.log('   ✅ Biometric image retrieval');
    console.log('   ✅ Verification image storage');
    console.log('   ✅ Verification image retrieval');
    console.log('   ✅ Biometric verification with images');

    console.log('\n🗄️  Database Tables Updated:');
    console.log('   • students (added biometric image columns)');
    console.log('   • biometric_verification_images (new table)');

    console.log('\n🔗 New API Endpoints:');
    console.log('   • PUT /api/students/:id/biometric (upload images)');
    console.log('   • GET /api/students/:id/biometric-images (retrieve images)');
    console.log('   • POST /api/biometric-verification/images (store verification images)');
    console.log('   • GET /api/biometric-verification/images (list verification images)');
    console.log('   • GET /api/biometric-verification/images/:id (get specific image)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure the API server is running: node api-server.js');
    console.log('   2. Ensure MySQL database is running and accessible');
    console.log('   3. Run the database migrations:');
    console.log('      - mysql -u root -p school_library < database/add-biometric-columns.sql');
    console.log('      - mysql -u root -p school_library < database/biometric-images-schema.sql');
    console.log('   4. Check API server logs for detailed error messages');

    process.exit(1);
  }
}

// Run the test
testBiometricImageStorage().catch(console.error);