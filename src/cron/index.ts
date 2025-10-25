// Cron runner: import modules which start their own scheduled intervals
import './reset-traffic';
import './cleanup-db';

console.log('Cron runner started - reset-traffic and cleanup-db scheduled');