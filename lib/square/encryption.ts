import crypto from 'crypto'

/**
 * Encryption utilities for storing sensitive tokens
 * Uses Node.js built-in crypto module with AES-256-GCM
 */

const ALGORITHM = 'aes-256-gcm'
const ENCODING = 'hex'

/**
 * Get encryption key from environment
 * Falls back to a derived key from BETTER_AUTH_SECRET if not set
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET
  if (!key) {
    throw new Error('ENCRYPTION_KEY or BETTER_AUTH_SECRET must be set')
  }

  // Ensure we have exactly 32 bytes for AES-256
  if (typeof key === 'string') {
    const hash = crypto.createHash('sha256')
    hash.update(key)
    return hash.digest()
  }
  return key
}

/**
 * Encrypt a plaintext string
 * Returns format: "iv:authTag:encryptedData"
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', ENCODING)
  encrypted += cipher.final(ENCODING)

  const authTag = cipher.getAuthTag()

  return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`
}

/**
 * Decrypt an encrypted string
 * Expects format: "iv:authTag:encryptedData"
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey()
  const parts = encrypted.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format')
  }

  const iv = Buffer.from(parts[0], ENCODING)
  const authTag = Buffer.from(parts[1], ENCODING)
  const encryptedData = parts[2]

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedData, ENCODING, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
