const NONCE_LENGTH = 12
const SALT = 'simple-chat-aes-gcm-salt-v1'

let cachedKey: CryptoKey | null = null
let cachedPassword: string | null = null

export async function deriveKey(password: string): Promise<CryptoKey> {
  if (cachedKey && cachedPassword === password) return cachedKey

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )

  cachedKey = key
  cachedPassword = password
  return key
}

export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder()
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    encoder.encode(plaintext),
  )

  const combined = new Uint8Array(nonce.length + ciphertext.byteLength)
  combined.set(nonce, 0)
  combined.set(new Uint8Array(ciphertext), nonce.length)

  let binary = ''
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]!)
  }
  return btoa(binary)
}

export async function decrypt(encoded: string, key: CryptoKey): Promise<string> {
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  const nonce = bytes.slice(0, NONCE_LENGTH)
  const ciphertext = bytes.slice(NONCE_LENGTH)

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    ciphertext,
  )

  return new TextDecoder().decode(plaintext)
}
