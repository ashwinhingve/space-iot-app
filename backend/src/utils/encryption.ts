import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

let _encryptionKey: Buffer | null = null;

const getEncryptionKey = (): Buffer => {
  if (!_encryptionKey) {
    if (!process.env.WIFI_ENCRYPTION_KEY) {
      throw new Error(
        'WIFI_ENCRYPTION_KEY environment variable is required. ' +
        'Generate one with: openssl rand -hex 32'
      );
    }
    _encryptionKey = Buffer.from(process.env.WIFI_ENCRYPTION_KEY, 'hex');
  }
  return _encryptionKey;
};

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
