import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

function privateKey() {
  const value = process.env.FIREBASE_PRIVATE_KEY;
  if (!value) throw new Error('FIREBASE_PRIVATE_KEY manquante');
  return value.replace(/\\n/g, '\n');
}

export function firebaseDatabase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!projectId || !clientEmail || !databaseURL) throw new Error('Configuration Firebase Admin incomplète');
  const app = getApps()[0] ?? initializeApp({
    credential: cert({ projectId, clientEmail, privateKey: privateKey() }),
    databaseURL,
  });
  return getDatabase(app);
}

export async function publishCommandToDevice(input: {
  deviceId: string;
  commandId: string;
  reference: string;
  operator: string;
  syntax: string;
  numero: string;
  forfait: string;
  montantFcfa: number;
  leaseToken: string;
  leaseExpiresAt: Date;
}) {
  const db = firebaseDatabase();
  // Path chosen for DP Digital: Firebase is strictly site → server.
  await db.ref(`dp-digital/commands/${input.deviceId}/${input.commandId}`).set({
    commandId: input.commandId,
    reference: input.reference,
    operator: input.operator,
    syntax: input.syntax,
    numero: input.numero,
    forfait: input.forfait,
    montantFcfa: input.montantFcfa,
    leaseToken: input.leaseToken,
    leaseExpiresAt: input.leaseExpiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  });
}
