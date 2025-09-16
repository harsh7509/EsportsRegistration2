// backend/src/utils/crypto.js
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32; // bytes

const rawKey = process.env.ENCRYPTION_KEY || '01234567890123456789012345678901';
let KEY = Buffer.from(rawKey, 'utf8');
if (KEY.length !== KEY_LEN) {
  // fallback: derive a 32-byte key using sha256
  KEY = crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * encrypt(text) -> { encrypted, iv, authTag }
 */
export const encrypt = (text) => {
  if (text == null) return null;
  const iv = crypto.randomBytes(12); // recommended for GCM
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

/**
 * decrypt({ encrypted, iv, authTag }) -> decrypted string or null
 */
export const decrypt = (encryptedData) => {
  if (!encryptedData || !encryptedData.encrypted) return null;
  try {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};
