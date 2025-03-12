// 测试加密/解密功能
const crypto = require('crypto');

// 复制 crypto.ts 中的代码（JavaScript版本）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes for AES-256
const IV_LENGTH = 16; // For AES, IV length is always 16 bytes

/**
 * 加密字符串
 */
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Prepend IV to encrypted data for later decryption
  return iv.toString('base64') + ':' + encrypted;
}

/**
 * 解密字符串
 */
function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'base64');
  const encryptedText = parts[1];
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  
  let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// 测试加密解密流程
const testData = 'This is a test message for encryption and decryption';
console.log('原始数据:', testData);

const encrypted = encrypt(testData);
console.log('加密后:', encrypted);

const decrypted = decrypt(encrypted);
console.log('解密后:', decrypted);

console.log('匹配:', testData === decrypted);

// 测试模拟会话数据
const sessionData = JSON.stringify({
  username: 'testuser',
  token: 'sampletoken12345',
  timestamp: new Date().toISOString()
});

console.log('\n测试会话数据加密:');
console.log('原始会话数据:', sessionData);

const encryptedSession = encrypt(sessionData);
console.log('加密后会话数据:', encryptedSession);

const decryptedSession = decrypt(encryptedSession);
console.log('解密后会话数据:', decryptedSession);

console.log('会话数据匹配:', sessionData === decryptedSession);