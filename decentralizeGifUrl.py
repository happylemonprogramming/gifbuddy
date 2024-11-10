import sys
from nip98 import decentralizeGifUrl

if len(sys.argv) > 1:
    file_url = sys.argv[1]
    summary = sys.argv[2]
    alt = sys.argv[3]
    image = sys.argv[4]
    preview = sys.argv[5]

decentralizeGifUrl(file_url, summary, alt, image, preview)