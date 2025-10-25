import { connection } from './../config/redis';

// Configured monthly traffic limit: 20 TB
const CONFIGURED_BYTES = 20 * 1024 * 1024 * 1024 * 1024; // 20 TB
const SAFETY_MARGIN = 0.95; // Stop at 95% (safety margin)
const MAX_BYTES = Math.floor(CONFIGURED_BYTES * SAFETY_MARGIN);

export class TrafficLimiter {
  private static REDIS_KEY = 'monthly:traffic:bytes';

  public static MAX_BYTES = MAX_BYTES;
  public static CONFIGURED_BYTES = CONFIGURED_BYTES;

  static async canGenerate(estimatedSize: number = 2 * 1024 * 1024): Promise<boolean> {
    const currentUsage = await this.getCurrentUsage();
    return (currentUsage + estimatedSize) <= MAX_BYTES;
  }

  static async recordTraffic(pdfSize: number): Promise<void> {
    await connection.incrby(this.REDIS_KEY, pdfSize);
  }

  static async getCurrentUsage(): Promise<number> {
    const usage = await connection.get(this.REDIS_KEY);
    return parseInt(usage || '0', 10);
  }

  static async getRemainingQuota(): Promise<number> {
    const usage = await this.getCurrentUsage();
    return Math.max(0, MAX_BYTES - usage);
  }

  static async getUsagePercent(): Promise<number> {
    const usage = await this.getCurrentUsage();
    return (usage / MAX_BYTES) * 100;
  }

  static async resetMonthly(): Promise<void> {
    await connection.del(this.REDIS_KEY);
    console.log('✓ Monthly traffic counter reset');
  }
}