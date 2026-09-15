import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const handler: Handler = async (event) => {
  const scheduled = event.headers['x-nf-scheduled-function'] === 'true' || event.headers['x-netlify-event'] === 'scheduled';
  const manual = event.headers['x-backup-secret'] === process.env.BACKUP_CRON_SECRET;
  if (!scheduled && !manual) return { statusCode: 401, body: 'Unauthorized' };
  const run = await prisma.backupRun.create({ data: { statut: 'demarre', type: scheduled ? 'daily' : 'manual' } });
  try {
    const [comptes, appareils, marchandsWave, forfaits, commandes, notifications, audits] = await Promise.all([
      prisma.compte.findMany({ select: { id:true,famille:true,codeHache:true,actif:true,dateCreation:true,dateDerniereConnexion:true } }),
      prisma.appareil.findMany(), prisma.marchandWave.findMany(), prisma.forfait.findMany(), prisma.commande.findMany(), prisma.notificationWave.findMany(), prisma.audit.findMany()
    ]);
    const snapshot = { generatedAt: new Date().toISOString(), comptes, appareils, marchandsWave, forfaits, commandes, notifications, audits };
    const store = getStore('dp-digital-backups');
    const key = `${scheduled ? 'daily' : 'manual'}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    await store.setJSON(key, snapshot);
    if (scheduled) {
      const listed = await store.list({ prefix: 'daily-' });
      const old = listed.blobs.sort((a,b)=>b.key.localeCompare(a.key)).slice(7);
      await Promise.all(old.map(x=>store.delete(x.key)));
    }
    await prisma.backupRun.update({ where: { id: run.id }, data: { statut:'termine', dateFin:new Date(), details:key } });
    return { statusCode: 200, body: JSON.stringify({ ok:true, key, retention: scheduled ? 7 : null }) };
  } catch (e) {
    await prisma.backupRun.update({ where:{id:run.id}, data:{statut:'echec',dateFin:new Date(),details:String(e)} });
    return { statusCode:500, body:'Backup failed' };
  } finally { await prisma.$disconnect(); }
};
