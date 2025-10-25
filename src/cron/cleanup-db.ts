import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

async function runCleanup() {
  try {
    console.log('🔄 Running DB cleanup tasks...');

    // Delete old successful PDFs older than 2 hours and return deleted ids
    const q1 = "DELETE FROM pdfs WHERE status = 'success' AND updated_at < NOW() - INTERVAL '2 hours' RETURNING id;";
    // Delete old error PDFs older than 24 hours and return deleted ids
    const q2 = "DELETE FROM pdfs WHERE status = 'error' AND updated_at < NOW() - INTERVAL '24 hours' RETURNING id;";

    const rows1: any[] = await sequelize.query(q1, { type: QueryTypes.SELECT }) as any[];
    console.log(`✅ Cleanup: removed ${rows1.length} successful pdf rows older than 2 hours`);

    const rows2: any[] = await sequelize.query(q2, { type: QueryTypes.SELECT }) as any[];
    console.log(`✅ Cleanup: removed ${rows2.length} error pdf rows older than 24 hours`);

  } catch (err) {
    console.error('✗ DB cleanup failed:', err);
  }
}

// Run immediately on start
runCleanup().catch(err => console.error('Initial cleanup failed:', err));

// Schedule daily cleanup (run once every 24 hours)
setInterval(() => {
  runCleanup().catch(err => console.error('Scheduled cleanup failed:', err));
}, 24 * 60 * 60 * 1000);

export { runCleanup };
