import { sign, verify } from 'tweetnacl';
import { decodeUTF8, encodeUTF8, decodeBase64, encodeBase64 } from 'tweetnacl-util';
import { z } from 'zod';

/**
 * License validation system using Ed25519 signatures
 * Offline-friendly with no call-home requirement
 */

export interface LicenseData {
  licenceId: string;
  seatsMax: number;
  expiryUpdates?: Date;
  issuedAt: Date;
  issuer: string;
}

export interface SignedLicense {
  data: LicenseData;
  signature: string;
}

export interface LicenseStatus {
  isValid: boolean;
  seatsUsed: number;
  seatsMax: number;
  daysUntilExpiry: number | null;
  warnings: string[];
  errors: string[];
}

const licenseDataSchema = z.object({
  licenceId: z.string().min(1),
  seatsMax: z.number().int().positive(),
  expiryUpdates: z.date().optional(),
  issuedAt: z.date(),
  issuer: z.string().min(1),
});

/**
 * Generate Ed25519 key pair for license signing
 * This would be run by the license issuer
 */
export function generateKeyPair(): { publicKey: string; secretKey: string } {
  const keyPair = sign.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

/**
 * Sign license data with secret key
 * This would be done by the license issuer
 */
export function signLicense(licenseData: LicenseData, secretKey: string): SignedLicense {
  const validatedData = licenseDataSchema.parse(licenseData);
  
  // Create canonical JSON representation
  const dataToSign = JSON.stringify({
    licenceId: validatedData.licenceId,
    seatsMax: validatedData.seatsMax,
    expiryUpdates: validatedData.expiryUpdates?.toISOString(),
    issuedAt: validatedData.issuedAt.toISOString(),
    issuer: validatedData.issuer,
  });
  
  const message = decodeUTF8(dataToSign);
  const secretKeyBytes = decodeBase64(secretKey);
  const signatureBytes = sign.detached(message, secretKeyBytes);
  
  return {
    data: validatedData,
    signature: encodeBase64(signatureBytes),
  };
}

/**
 * Verify license signature with public key
 * This is done by the application to validate licenses
 */
export function verifyLicense(signedLicense: SignedLicense, publicKey: string): boolean {
  try {
    const validatedData = licenseDataSchema.parse(signedLicense.data);
    
    // Recreate canonical JSON representation
    const dataToVerify = JSON.stringify({
      licenceId: validatedData.licenceId,
      seatsMax: validatedData.seatsMax,
      expiryUpdates: validatedData.expiryUpdates?.toISOString(),
      issuedAt: validatedData.issuedAt.toISOString(),
      issuer: validatedData.issuer,
    });
    
    const message = decodeUTF8(dataToVerify);
    const signatureBytes = decodeBase64(signedLicense.signature);
    const publicKeyBytes = decodeBase64(publicKey);
    
    return sign.detached.verify(message, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

/**
 * Check license status including seat usage and expiry
 */
export function checkLicenseStatus(
  signedLicense: SignedLicense,
  publicKey: string,
  currentSeatsUsed: number
): LicenseStatus {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Verify signature first
  const isSignatureValid = verifyLicense(signedLicense, publicKey);
  if (!isSignatureValid) {
    errors.push('Invalid license signature');
    return {
      isValid: false,
      seatsUsed: currentSeatsUsed,
      seatsMax: 0,
      daysUntilExpiry: null,
      warnings,
      errors,
    };
  }
  
  const { data } = signedLicense;
  
  // Check seat limit
  if (currentSeatsUsed > data.seatsMax) {
    errors.push(`Seat limit exceeded: ${currentSeatsUsed}/${data.seatsMax}`);
  } else if (currentSeatsUsed >= data.seatsMax * 0.9) {
    warnings.push(`Approaching seat limit: ${currentSeatsUsed}/${data.seatsMax}`);
  }
  
  // Check expiry (if set)
  let daysUntilExpiry: number | null = null;
  if (data.expiryUpdates) {
    const now = new Date();
    const expiry = new Date(data.expiryUpdates);
    const diffTime = expiry.getTime() - now.getTime();
    daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) {
      errors.push('License has expired');
    } else if (daysUntilExpiry <= 30) {
      warnings.push(`License expires in ${daysUntilExpiry} days`);
    }
  }
  
  // Check issue date (license shouldn't be from the future)
  const now = new Date();
  const issued = new Date(data.issuedAt);
  if (issued > now) {
    errors.push('License issue date is in the future');
  }
  
  return {
    isValid: errors.length === 0,
    seatsUsed: currentSeatsUsed,
    seatsMax: data.seatsMax,
    daysUntilExpiry,
    warnings,
    errors,
  };
}

/**
 * Parse license file (.lic format)
 */
export function parseLicenseFile(fileContent: string): SignedLicense {
  try {
    const parsed = JSON.parse(fileContent);
    
    // Convert date strings back to Date objects
    if (parsed.data.expiryUpdates) {
      parsed.data.expiryUpdates = new Date(parsed.data.expiryUpdates);
    }
    if (parsed.data.issuedAt) {
      parsed.data.issuedAt = new Date(parsed.data.issuedAt);
    }
    
    return licenseDataSchema.parse(parsed.data) && parsed.signature ? parsed : (() => {
      throw new Error('Invalid license file format');
    })();
  } catch (error) {
    throw new Error(`Failed to parse license file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate license file content (.lic format)
 */
export function generateLicenseFile(signedLicense: SignedLicense): string {
  const licenseFile = {
    data: {
      ...signedLicense.data,
      expiryUpdates: signedLicense.data.expiryUpdates?.toISOString(),
      issuedAt: signedLicense.data.issuedAt.toISOString(),
    },
    signature: signedLicense.signature,
    version: '1.0',
    format: 'field-tracker-license',
  };
  
  return JSON.stringify(licenseFile, null, 2);
}

/**
 * Create a sample license for development/testing
 */
export function createSampleLicense(
  licenceId: string = 'DEV-LICENSE-001',
  seatsMax: number = 25,
  validForDays: number = 365
): { license: SignedLicense; publicKey: string; secretKey: string } {
  const keyPair = generateKeyPair();
  
  const licenseData: LicenseData = {
    licenceId,
    seatsMax,
    expiryUpdates: new Date(Date.now() + validForDays * 24 * 60 * 60 * 1000),
    issuedAt: new Date(),
    issuer: 'Field Tracker Development',
  };
  
  const signedLicense = signLicense(licenseData, keyPair.secretKey);
  
  return {
    license: signedLicense,
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
  };
}