/**
 * Client-side AES encryption/decryption
 * Uses the Web Crypto API
 */

/**
 * Converts a string to a Uint8Array.
 */
function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Converts a Uint8Array to a string.
 */
function bufferToString(buffer: Uint8Array): string {
  return new TextDecoder().decode(buffer);
}

/**
 * Converts a Uint8Array to a base64 string.
 */
function bufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer));
}

/**
 * Converts a base64 string to a Uint8Array.
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a key from a password using PBKDF2.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordBuffer = stringToBuffer(password);
  const importedKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string using AES-GCM.
 * Returns a string in the format: base64(salt):base64(iv):base64(encryptedData)
 */
export async function encrypt(text: string, password: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  
  const textBuffer = stringToBuffer(text);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textBuffer
  );
  
  const encryptedArray = new Uint8Array(encryptedBuffer);
  
  return `${bufferToBase64(salt)}:${bufferToBase64(iv)}:${bufferToBase64(encryptedArray)}`;
}

/**
 * Decrypts a string using AES-GCM.
 * Expects a string in the format: base64(salt):base64(iv):base64(encryptedData)
 */
export async function decrypt(encryptedText: string, password: string): Promise<string> {
  const [saltBase64, ivBase64, dataBase64] = encryptedText.split(':');
  
  const salt = base64ToBuffer(saltBase64);
  const iv = base64ToBuffer(ivBase64);
  const encryptedData = base64ToBuffer(dataBase64);
  
  const key = await deriveKey(password, salt);
  
  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    
    return bufferToString(new Uint8Array(decryptedBuffer));
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed. Wrong password?');
  }
}
