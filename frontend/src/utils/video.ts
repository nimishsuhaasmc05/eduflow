/**
 * Edu-Flow Video Utility
 * Safe parsing, validation, classification, and embed URL generation for YouTube & direct video links.
 */

export type VideoType = 'youtube' | 'html5' | 'none' | 'invalid';

/**
 * Extracts YouTube video ID from various YouTube URL formats.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * Correctly strips query parameters like &t=30 or &feature=...
 */
export const extractYouTubeVideoId = (url?: string | null): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // 1. Standard watch URL: youtube.com/watch?v=ID
    const watchMatch = trimmed.match(/(?:youtube\.com|youtube-nocookie\.com)\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i);
    if (watchMatch && watchMatch[1]) {
      return watchMatch[1];
    }

    // 2. Short URL: youtu.be/ID
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (shortMatch && shortMatch[1]) {
      return shortMatch[1];
    }

    // 3. Shorts URL: youtube.com/shorts/ID
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
    if (shortsMatch && shortsMatch[1]) {
      return shortsMatch[1];
    }

    // 4. Embed URL: youtube.com/embed/ID or youtube-nocookie.com/embed/ID
    const embedMatch = trimmed.match(/(?:youtube\.com|youtube-nocookie\.com)\/embed\/([a-zA-Z0-9_-]{11})/i);
    if (embedMatch && embedMatch[1]) {
      return embedMatch[1];
    }

    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Checks if a URL is a valid YouTube URL.
 */
export const isYouTubeUrl = (url?: string | null): boolean => {
  return extractYouTubeVideoId(url) !== null;
};

/**
 * Derives the video type classification from a URL string.
 */
export const getVideoType = (url?: string | null): VideoType => {
  if (!url || typeof url !== 'string' || !url.trim()) return 'none';
  if (isYouTubeUrl(url)) return 'youtube';
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return 'html5';
  }
  return 'invalid';
};

/**
 * Returns a secure, privacy-enhanced YouTube embed URL using youtube-nocookie.com.
 * Supports optional start timestamp in seconds.
 * Returns null if the URL is not a valid YouTube link.
 */
export const getYouTubeEmbedUrl = (url?: string | null, startSeconds: number = 0): string | null => {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  const startParam = startSeconds > 0 ? `&start=${Math.floor(startSeconds)}` : '';
  return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&autoplay=1&rel=0${startParam}`;
};

/**
 * Returns standard YouTube watch URL for a given link or video ID with optional timestamp.
 */
export const getYouTubeWatchUrl = (url?: string | null, startSeconds: number = 0): string | null => {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  const timeParam = startSeconds > 0 ? `&t=${Math.floor(startSeconds)}s` : '';
  return `https://www.youtube.com/watch?v=${videoId}${timeParam}`;
};

