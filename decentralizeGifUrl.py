import sys, mimetypes
from nip98 import decentralizeGifUrl

if len(sys.argv) < 4:
    print("Usage: python decentralizeGifUrl.py <file_url> <summary> <alt> [<image> <preview>]")
    sys.exit(1)

file_url = sys.argv[1]
summary = sys.argv[2]
alt = sys.argv[3]

# Handle optional arguments
image = sys.argv[4] if len(sys.argv) > 4 else None
preview = sys.argv[5] if len(sys.argv) > 5 else None

mime_type, _ = mimetypes.guess_type(file_url)

decentralizeGifUrl(file_url, summary, alt, mime_type, image, preview)
