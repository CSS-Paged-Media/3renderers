import { connection } from '../config/redis';

const KEY_TOTAL = 'pdf:total';
const KEY_WEEK = 'pdf:week';
const KEY_MONTH = 'pdf:month';

export async function incrementPdfCounters() {
  // Use a pipeline to increment all counters atomically-ish
  const pipeline = connection.pipeline();
  pipeline.incr(KEY_TOTAL);
  pipeline.incr(KEY_WEEK);
  pipeline.incr(KEY_MONTH);
  const res = await pipeline.exec();
  // res can be null in very rare cases; defensively handle it
  const values = Array.isArray(res)
    ? res.map((r) => (Array.isArray(r) && r[1] ? Number(r[1]) : 0))
    : [0, 0, 0];
  return {
    total: values[0] || 0,
    week: values[1] || 0,
    month: values[2] || 0,
  };
}

export async function getPdfCounts() {
  const vals = await connection.mget(KEY_TOTAL, KEY_WEEK, KEY_MONTH);
  return {
    total: Number(vals[0] || 0),
    week: Number(vals[1] || 0),
    month: Number(vals[2] || 0),
  };
}

export async function resetWeeklyCount() {
  await connection.set(KEY_WEEK, '0');
}

export async function resetMonthlyCount() {
  await connection.set(KEY_MONTH, '0');
}

export default {
  incrementPdfCounters,
  getPdfCounts,
  resetWeeklyCount,
  resetMonthlyCount,
};
