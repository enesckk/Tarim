import type { NotificationRepository } from '../repositories/notification.repository.js';
import type { NotificationPreference } from '../types/notification.types.js';

export class NotificationPreferenceService {
  constructor(private readonly repository: NotificationRepository) {}

  async getPreferences(userId: string): Promise<NotificationPreference> {
    let prefs = await this.repository.getPreferences(userId);
    if (!prefs) {
      // updatePreferences handles initial creation
      prefs = await this.repository.updatePreferences(userId, {});
    }
    return prefs;
  }

  async updatePreferences(userId: string, updates: Partial<NotificationPreference>): Promise<NotificationPreference> {
    return this.repository.updatePreferences(userId, updates);
  }

  // Utility to check if currently in quiet hours based on user's timezone
  isQuietHour(prefs: NotificationPreference, currentTimeMs: number): boolean {
    if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;
    
    // Simplistic quiet hour check: assuming quietHoursStart and End are "HH:mm"
    try {
      const now = new Date(currentTimeMs);
      
      // We would ideally format `now` in `prefs.timezone`, but for simplicity here we assume UTC or local depending on the Date object.
      // In a real app we'd use intl or date-fns-tz
      const f = new Intl.DateTimeFormat('en-US', {
        timeZone: prefs.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = f.formatToParts(now);
      const hourStr = parts.find(p => p.type === 'hour')?.value || '00';
      const minStr = parts.find(p => p.type === 'minute')?.value || '00';
      
      const currentMinutes = parseInt(hourStr) * 60 + parseInt(minStr);
      
      const [sH, sM] = prefs.quietHoursStart.split(':').map(Number);
      const [eH, eM] = prefs.quietHoursEnd.split(':').map(Number);
      
      const startMinutes = sH * 60 + sM;
      const endMinutes = eH * 60 + eM;
      
      if (startMinutes < endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // Crosses midnight
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    } catch(e) {
      return false; // Safe fallback
    }
  }
}
