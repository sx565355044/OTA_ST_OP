import crypto from 'crypto';

// Encryption key and IV
// In production, these should be stored securely and not in code
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes for AES-256
const IV_LENGTH = 16; // For AES, IV length is always 16 bytes

/**
 * Encrypts a string using AES-256-CBC
 * @param text - Plain text to encrypt
 * @returns Encrypted string (IV + encrypted data) in base64
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Prepend IV to encrypted data for later decryption
  return iv.toString('base64') + ':' + encrypted;
}

/**
 * Decrypts a string using AES-256-CBC
 * @param text - Encrypted string (IV + encrypted data) in base64
 * @returns Decrypted text
 */
export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'base64');
  const encryptedText = parts[1];
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  
  let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
