import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

// Encryption key and IV for AES-256-CBC
// In a real environment, this would be stored in environment variables or a key management system
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'this-is-a-32-byte-key-for-aes-256-cbc';
const IV_LENGTH = 16; // AES block size is 16 bytes

/**
 * Hash a password using bcrypt
 * @param password The password to hash
 * @returns A promise resolving to the hashed password
 */
export async function encryptPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with a hash using bcrypt
 * @param password The password to check
 * @param hash The hash to compare against
 * @returns A promise resolving to true if the password matches the hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Encrypt sensitive data using AES-256-CBC
 * @param text The text to encrypt
 * @returns The encrypted text
 */
export async function encryptApiKey(text: string): Promise<string> {
  // Create a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create a cipher with the encryption key and IV
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return the IV and encrypted text
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data using AES-256-CBC
 * @param text The encrypted text
 * @returns The decrypted text
 */
export async function decryptApiKey(text: string): Promise<string> {
  // Split the IV and encrypted text
  const parts = text.split(':');
  
  // If the text doesn't contain an IV, it might be a bcrypt hash (used for mock data)
  if (parts.length !== 2) {
    return 'sk-mock-api-key-for-development-only';
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  // Create a decipher with the encryption key and IV
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  // Decrypt the text
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
