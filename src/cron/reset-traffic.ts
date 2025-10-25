import { TrafficLimiter } from '../middleware/traffic-limiter';
import { resetWeeklyCount, resetMonthlyCount } from '../middleware/pdf-counter';

export async function resetMonthlyTraffic() {
  const now = new Date();
  const isFirstDayOfMonth = now.getDate() === 1;
  const isResetHour = now.getHours() === 0;

  if (isFirstDayOfMonth && isResetHour) {
    console.log('🔄 Resetting monthly traffic counter...');
    await TrafficLimiter.resetMonthly();
    
    // Optional: Send notification
    const lastMonthUsage = await TrafficLimiter.getCurrentUsage();
    console.log(`📊 Last month traffic: ${(lastMonthUsage / (1024 ** 3)).toFixed(2)} GB`);
  }
}

// Run every hour
setInterval(resetMonthlyTraffic, 60 * 60 * 1000);

// Weekly reset: run every hour and reset on Mondays at 00:00
export async function resetWeeklyCountersIfNeeded() {
  const now = new Date();
  const isMonday = now.getDay() === 1; // 0=Sun,1=Mon
  const isMidnight = now.getHours() === 0;

  if (isMonday && isMidnight) {
    console.log('🔄 Resetting weekly PDF counters...');
    try {
      await resetWeeklyCount();
    } catch (err) {
      console.error('Failed to reset weekly PDF counters:', err);
    }

    // Optionally reset monthly if first day and midnight
    const isFirstDayOfMonth = now.getDate() === 1;
    if (isFirstDayOfMonth) {
      try {
        await resetMonthlyCount();
      } catch (err) {
        console.error('Failed to reset monthly PDF counters:', err);
      }
    }
  }
}

setInterval(resetWeeklyCountersIfNeeded, 60 * 60 * 1000);