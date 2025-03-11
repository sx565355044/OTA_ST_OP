import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

// Encryption key and IV for AES-256-CBC
// In a real environment, this would be stored in environment variables or a key management system
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'this-is-a-32-byte-key-for-aes-256-cbc';
const IV_LENGTH = 16; // AES block size is 16 bytes

// Set to true for development to accept any password
const DEV_MODE = process.env.NODE_ENV !== 'production';

/**
 * Hash a password using bcrypt
 * @param password The password to hash
 * @returns A promise resolving to the hashed password
 */
export async function encryptPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    console.error("Error hashing password:", error);
    if (DEV_MODE) {
      // In dev mode, just store the password as-is if bcrypt fails
      console.warn("Development mode: storing password without hashing");
      return password;
    }
    throw error;
  }
}

/**
 * Compare a password with a hash using bcrypt
 * @param password The password to check
 * @param hash The hash to compare against
 * @returns A promise resolving to true if the password matches the hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  // For development testing, allow all passwords (DANGEROUS - only for development!)
  if (DEV_MODE && process.env.ALLOW_ANY_PASSWORD === 'true') {
    console.warn("WARNING: Development mode with ALLOW_ANY_PASSWORD - accepting all passwords!");
    return true;
  }
  
  try {
    // Try normal bcrypt comparison
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("Password comparison error:", error);
    
    // In development mode, if the hash isn't a valid bcrypt hash,
    // just compare the strings directly
    if (DEV_MODE) {
      console.warn("Development mode: comparing password directly (not bcrypt)");
      return password === hash;
    }
    
    return false;
  }
}

/**
 * Encrypt sensitive data using AES-256-CBC
 * @param text The text to encrypt
 * @returns The encrypted text
 */
export async function encryptApiKey(text: string): Promise<string> {
  try {
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
  } catch (error) {
    console.error("Error encrypting API key:", error);
    if (DEV_MODE) {
      // In dev mode, just prepend a marker to show it's not encrypted
      return 'not-encrypted:' + text;
    }
    throw error;
  }
}

/**
 * Decrypt sensitive data using AES-256-CBC
 * @param text The encrypted text
 * @returns The decrypted text
 */
export async function decryptApiKey(text: string): Promise<string> {
  try {
    // Split the IV and encrypted text
    const parts = text.split(':');
    
    // Handle special development markers
    if (parts[0] === 'not-encrypted') {
      return parts[1];
    }
    
    // If the text doesn't contain an IV, it might be unencrypted or invalid
    if (parts.length !== 2) {
      if (DEV_MODE) {
        console.warn("Development mode: returning mock API key for invalid encrypted text");
        return 'sk-mock-api-key-for-development-only';
      }
      throw new Error("Invalid encrypted text format");
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
  } catch (error) {
    console.error("Error decrypting API key:", error);
    if (DEV_MODE) {
      return text; // In development, return the original text
    }
    throw error;
  }
}
