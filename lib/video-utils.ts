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
    const loopParam = loop ? `&loop=1&playlist=${videoId}` : '';
    // YouTube autoplay requirements:
    // - autoplay=1: Enable autoplay (works better when muted)
    // - mute=1: Start muted to ensure autoplay works (browsers block autoplay with sound)
    // - enablejsapi=1: Enable JavaScript API for message events and control
    // - origin: Required for message API to work
    // - controls=1: Show minimal controls (helps with autoplay in some browsers)
    // - modestbranding=1: Reduce YouTube branding
    // - rel=0: Don't show related videos
    // - playsinline=1: Play inline on mobile
    // - iv_load_policy=3: Hide annotations
    // - fs=0: Disable fullscreen button
    // - disablekb=1: Disable keyboard controls
    // - showinfo=0: Don't show video title/info
    // Note: We start muted because browsers block autoplay with sound
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&origin=${encodeURIComponent(origin)}${loopParam}&controls=1&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&fs=0&disablekb=1&showinfo=0`;
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

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (watchMatch) {
    return watchMatch[1];
  }

  // Format: https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^&\n?#]+)/);
  if (embedMatch) {
    return embedMatch[1];
  }

  return null;
}

/**
 * Gets YouTube thumbnail URL for a video
 * Quality options: maxresdefault, hqdefault, mqdefault, sddefault, default
 */
export function getYouTubeThumbnail(url: string, quality: 'maxresdefault' | 'hqdefault' | 'mqdefault' | 'sddefault' | 'default' = 'hqdefault'): string | null {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Gets a thumbnail URL for any video source
 * For YouTube: returns YouTube thumbnail
 * For direct video URLs: returns the video URL itself (browser will generate thumbnail)
 */
export function getVideoThumbnail(url: string): string | null {
  if (!url) return null;
  
  if (isYouTubeUrl(url)) {
    return getYouTubeThumbnail(url, 'hqdefault');
  }
  
  // For direct video URLs, we'll use the video URL itself
  // The browser can generate a thumbnail from it
  return url;
}

