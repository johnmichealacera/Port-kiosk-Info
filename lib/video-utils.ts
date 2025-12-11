/**
 * Converts YouTube URL to embed format
 * Supports various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * @param url - YouTube URL to convert
 * @param loop - Whether to loop the video (requires playlist parameter)
 * @param volume - Volume level (0-100), note: YouTube iframes don't support volume via URL params
 */
export function convertYouTubeToEmbed(url: string, loop: boolean = false, volume: number = 80): string | null {
  if (!url) return null;

  // Extract video ID from various YouTube URL formats
  let videoId: string | null = null;

  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }

  // Format: https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^&\n?#]+)/);
  if (embedMatch) {
    videoId = embedMatch[1];
  }

  if (videoId) {
    // For looping, we need to add playlist parameter with the same video ID
    const loopParam = loop ? `&loop=1&playlist=${videoId}` : '&loop=0';
    // Remove mute=1 to enable audio (YouTube requires user interaction for autoplay with sound, but we'll try)
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0${loopParam}&controls=0&modestbranding=1&rel=0`;
  }

  return null;
}

/**
 * Checks if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  return /(youtube\.com|youtu\.be)/.test(url);
}

/**
 * Checks if a URL is a direct video file (mp4, webm, etc.)
 */
export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(url);
}

