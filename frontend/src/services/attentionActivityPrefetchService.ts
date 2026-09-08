import { activityApi } from './api';
import { AttentionActivity } from '../types';

class AttentionActivityPrefetchService {
  private cache: Map<string, AttentionActivity> = new Map();
  private inFlightRequests: Map<string, Promise<AttentionActivity | null>> = new Map();

  private buildKey(courseId: number, moduleId: number): string {
    return `act_${courseId}_${moduleId}`;
  }

  public async prefetchActivityForContext(
    courseId: number,
    moduleId: number,
    topic: string
  ): Promise<void> {
    const key = this.buildKey(courseId, moduleId);
    if (this.cache.has(key) || this.inFlightRequests.has(key)) {
      return;
    }

    const promise = (async () => {
      try {
        const activity = await activityApi.generateAttentionActivity({
          course_id: courseId,
          module_id: moduleId,
          topic: topic,
          session_index: 0,
        });
        if (activity && activity.payload) {
          this.cache.set(key, activity);
          return activity;
        }
        return null;
      } catch (err) {
        console.warn(`[AttentionActivity] Background prefetch failed:`, err);
        return null;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, promise);
  }

  public getCachedActivity(courseId: number, moduleId: number): AttentionActivity | null {
    const key = this.buildKey(courseId, moduleId);
    return this.cache.get(key) || null;
  }

  public consumeCachedActivity(courseId: number, moduleId: number): AttentionActivity | null {
    const key = this.buildKey(courseId, moduleId);
    const item = this.cache.get(key) || null;
    this.cache.delete(key);
    return item;
  }
}

export const attentionActivityPrefetchService = new AttentionActivityPrefetchService();
