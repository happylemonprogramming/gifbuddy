from dataclasses import dataclass
from typing import List, Tuple, Optional, Union, BinaryIO
from PIL import Image
import io
import logging
import requests
import time
from pathlib import Path

@dataclass
class ProcessingResult:
    """Container for processing results"""
    buffer: io.BytesIO
    format: str
    size_mb: float
    processing_time: float
    frame_count: int

class AnimatedImageProcessor:
    MAX_SIZE_MB = 20
    INITIAL_SCALE = 1.0
    REDUCTION_SCALE = 0.75

    def __init__(self):
        self.start_time = None
        self.last_time = None

    def _log_timing(self, message: str) -> None:
        """Log timing information"""
        current_time = time.time()
        if self.last_time:
            duration = round(current_time - self.last_time, 2)
            total_duration = round(current_time - self.start_time, 2)
            logging.info(f"{message} - Step: {duration}s, Total: {total_duration}s")
        self.last_time = current_time

    def get_file_size(self, url: str) -> Optional[float]:
        """Get file size in MB from URL"""
        try:
            response = requests.head(url, allow_redirects=True)
            content_length = int(response.headers.get('content-length', 0))
            return content_length / (1024 * 1024)
        except (ValueError, TypeError, requests.RequestException):
            return None

    def download_file(self, url: str) -> Tuple[io.BytesIO, float]:
        """Download file and return buffer and size"""
        session = requests.Session()
        response = session.get(url, stream=True, timeout=10)
        if response.status_code != 200:
            raise ValueError(f"Failed to fetch media from URL: {url}")

        content = io.BytesIO()
        size_mb = 0
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                content.write(chunk)
                size_mb += len(chunk) / (1024 * 1024)
        content.seek(0)
        return content, size_mb

    def process_animated_image(
        self,
        transparent_image: Union[BinaryIO, Path, str],
        animated_url: str,
        return_buffer: bool = True
    ) -> ProcessingResult:
        """
        Process an animated image with overlay.
        """
        self.start_time = self.last_time = time.time()
        
        # Check input file size
        input_size = self.get_file_size(animated_url)
        if input_size:
            logging.info(f"Input size: {input_size:.2f}MB")
        
        # Load and process overlay
        overlay = Image.open(transparent_image).convert("RGBA")
        # overlay.save("transparent_image.png", format="PNG")
        self._log_timing("Overlay processed")

        # Download and load animated image
        content, downloaded_size = self.download_file(animated_url)
        self._log_timing("File downloaded")

        # Process frames
        with Image.open(content) as media:
            if media.format not in ('GIF', 'WEBP'):
                raise ValueError(f"Unsupported format: {media.format}")
            
            if media.format == "WEBP" and not getattr(media, "is_animated", False):
                raise ValueError("File must be animated")

            frames = []
            durations = []
            
            # Resize overlay to match media frame size
            overlay = overlay.resize(media.size, Image.Resampling.LANCZOS)
            
            # Process each frame
            for frame_idx in range(getattr(media, 'n_frames', 0)):
                media.seek(frame_idx)
                durations.append(media.info.get('duration', 100))
                
                frame = media.copy().convert("RGBA")
                frame = frame.resize(media.size, Image.Resampling.LANCZOS)

                combined = Image.new("RGBA", frame.size)
                combined.paste(frame, (0, 0), frame)
                combined.paste(overlay, (0, 0), overlay)
                frames.append(combined)

            self._log_timing(f"Processed {len(frames)} frames")

            # Save with appropriate parameters
            output = io.BytesIO()
            save_params = {
                "format": "GIF",
                "save_all": True,
                "append_images": frames[1:],
                "duration": durations,
                "loop": media.info.get("loop", 0),
                "optimize": True,  # Always optimize
                "quality": 100,  # Consistent quality
            }

            frames[0].save(output, **save_params)
            self._log_timing("Saved output")

            output.seek(0)
            final_size = output.tell() / (1024 * 1024)
            
            total_time = time.time() - self.start_time
            
            return ProcessingResult(
                buffer=output,
                format="gif",
                size_mb=final_size,
                processing_time=total_time,
                frame_count=len(frames)
            )