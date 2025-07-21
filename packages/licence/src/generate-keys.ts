import { generateKeyPair, createSampleLicense } from './index.js';

/**
 * CLI tool to generate license keys for development and production
 */

function main() {
  console.log('🔐 Field Tracker License Key Generator\n');
  
  // Generate master key pair for production
  console.log('1. Master Key Pair (for production license signing):');
  const masterKeys = generateKeyPair();
  console.log(`   Public Key:  ${masterKeys.publicKey}`);
  console.log(`   Secret Key:  ${masterKeys.secretKey}`);
  console.log('   ⚠️  Keep the secret key secure and never share it!\n');
  
  // Generate development license
  console.log('2. Sample Development License:');
  const sampleLicense = createSampleLicense('DEV-001', 10, 365);
  console.log(`   License ID:  ${sampleLicense.license.data.licenceId}`);
  console.log(`   Max Seats:   ${sampleLicense.license.data.seatsMax}`);
  console.log(`   Expires:     ${sampleLicense.license.data.expiryUpdates?.toISOString()}`);
  console.log(`   Public Key:  ${sampleLicense.publicKey}`);
  console.log(`   Signature:   ${sampleLicense.license.signature.substring(0, 32)}...`);
  
  console.log('\n📝 Next Steps:');
  console.log('   - Add the public key to your app configuration');
  console.log('   - Store the secret key in a secure location');
  console.log('   - Use the sample license for development and testing');
}

main();