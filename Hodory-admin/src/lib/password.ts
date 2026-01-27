'use client';

type PasswordAlgo = 'pbkdf2-sha256';

const DEFAULT_ITERATIONS = 120_000;
const DEFAULT_SALT_BYTES = 16;
const DEFAULT_HASH_BYTES = 32;

function getCrypto() {
  const cryptoRef = globalThis.crypto;
  if (!cryptoRef?.subtle || !cryptoRef.getRandomValues) {
    throw new Error('WebCrypto is not available in this environment.');
  }
  return cryptoRef;
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pbkdf2Sha256(password: string, salt: Uint8Array, iterations: number) {
  const cryptoRef = getCrypto();
  const keyMaterial = await cryptoRef.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await cryptoRef.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations
    },
    keyMaterial,
    DEFAULT_HASH_BYTES * 8
  );

  return new Uint8Array(bits);
}

export type PasswordRecord = string;

export async function createPasswordRecord(
  password: string,
  options?: { iterations?: number; saltBytes?: number }
): Promise<PasswordRecord> {
  const iterations = options?.iterations ?? DEFAULT_ITERATIONS;
  const saltBytes = options?.saltBytes ?? DEFAULT_SALT_BYTES;
  const cryptoRef = getCrypto();

  const salt = new Uint8Array(saltBytes);
  cryptoRef.getRandomValues(salt);

  const hash = await pbkdf2Sha256(password, salt, iterations);
  const algo: PasswordAlgo = 'pbkdf2-sha256';
  return `${algo}$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, record: PasswordRecord): Promise<boolean> {
  const [algo, iterationsRaw, saltB64, hashB64] = record.split('$');
  if (algo !== 'pbkdf2-sha256') return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const salt = fromBase64(saltB64 ?? '');
  const expected = fromBase64(hashB64 ?? '');
  const actual = await pbkdf2Sha256(password, salt, iterations);

  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
  return diff === 0;
}

export function generatePassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const cryptoRef = globalThis.crypto;
  const bytes = cryptoRef?.getRandomValues ? cryptoRef.getRandomValues(new Uint8Array(length)) : null;
  let out = '';
  for (let i = 0; i < length; i++) {
    const n = bytes ? bytes[i]! : Math.floor(Math.random() * 256);
    out += alphabet[n % alphabet.length]!;
  }
  return out;
}
