import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getAesKey(): Buffer {
    const key = process.env.AES_KEY;
    if (!key) throw new Error('AES_KEY not configured');
    return Buffer.from(key, 'hex');
}

export interface EncryptedData {
    ciphertext: string;  // hex
    iv: string;          // hex
    authTag: string;     // hex
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns ciphertext, IV, and authentication tag — all hex-encoded.
 */
export function encrypt(plaintext: string): EncryptedData {
    const key = getAesKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        ciphertext: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
    };
}

/**
 * Decrypt AES-256-GCM encrypted data back to plaintext.
 */
export function decrypt(data: EncryptedData): string {
    const key = getAesKey();
    const decipher = createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(data.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

    let decrypted = decipher.update(data.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
