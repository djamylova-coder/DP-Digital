import crypto from 'node:crypto';

function key() {
  const raw = process.env.COMMAND_DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error('COMMAND_DATA_ENCRYPTION_KEY manquante');
  const k = Buffer.from(raw, 'base64');
  if (k.length !== 32) throw new Error('COMMAND_DATA_ENCRYPTION_KEY doit décoder en 32 octets');
  return k;
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
export function decryptSecret(value: string) {
  const [iv, tag, data] = value.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
export function maskPhone(value: string) {
  const v=value.replace(/\s+/g,'');
  return v.length <= 4 ? '••••' : `${v.slice(0,2)}••••${v.slice(-2)}`;
}
