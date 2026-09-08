import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def extract_youtube_id(url: Optional[str]) -> Optional[str]:
    if not url or not isinstance(url, str):
        return None
    trimmed = url.strip()
    if not trimmed:
        return None
    
    # 1. Standard watch URL or embed or short URL
    match = re.search(r'(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})', trimmed, re.I)
    if match and match.group(1):
        return match.group(1)
    return None

def is_youtube_url(url: Optional[str]) -> bool:
    return extract_youtube_id(url) is not None

def auto_fetch_youtube_transcript(video_url: Optional[str]) -> Optional[str]:
    """
    Attempts server-side fetching of public YouTube captions using youtube-transcript-api.
    Returns transcript text if available, or None if unavailable/error.
    """
    video_id = extract_youtube_id(video_url)
    if not video_id:
        return None

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        api = YouTubeTranscriptApi()
        fetched = api.fetch(video_id)
        
        snippets = []
        for item in fetched:
            if hasattr(item, 'text'):
                snippets.append(item.text)
            elif isinstance(item, dict) and 'text' in item:
                snippets.append(item['text'])
                
        transcript_text = " ".join(snippets).strip()
        if transcript_text and len(transcript_text) > 10:
            logger.info("Auto-fetched YouTube transcript for video %s (%d chars)", video_id, len(transcript_text))
            return transcript_text
    except Exception as e:
        logger.warning("Could not auto-fetch YouTube transcript for video %s: %s", video_id, e)

    return None
