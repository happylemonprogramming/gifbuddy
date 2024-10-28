import sys, logging
from nip98 import urlgenerator
from nip94 import nip94, capture_image

if len(sys.argv) > 1:
    filepath = sys.argv[1]
    tags = sys.argv[2]
    caption = sys.argv[3]
    alt = sys.argv[4]
    preview = sys.argv[5]

def backgroundProcessing(filepath, tags, caption, alt, preview):
    image_path = capture_image(filepath)
    image_url = urlgenerator(image_path, caption, alt, "image/png")
    event94 = nip94(tags, alt, caption, image_url, preview)
    logging.info(f'NIP94 Event Published: {event94}')
    return event94

backgroundProcessing(filepath, tags, caption, alt, preview)