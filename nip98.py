import json
import base64
from nostrpublish import nostrpost
import os
import hashlib
from nip96 import nostrbuildupload
from getevent import getevent
import requests
from nip94 import compute_sha256

# BUG: NOTES AREN'T POSTING!

# Variables
private_key = os.environ["nostrdvmprivatekey"]
api_url = "https://nostr.build/api/v2/nip96/upload"

def fallbackurlgenerator(file_url, caption, alt):
    # NIP94 data
    data = {
            "caption": caption,
            "expiration": "",  # "" for no expiration
            "alt": alt,
            "content_type": "image/gif",
            "no_transform": "false"
            }

    # Combine form data and file content into a single string for hashing
    body_content = "".join([f"{key}={value}&" for key, value in data.items()])

    # Stream the file content and append to the body_content
    response = requests.get(file_url, stream=True)
    response.raise_for_status()

    for chunk in response.iter_content(chunk_size=8192):
        body_content += chunk.decode('latin1')

    # Calculate the SHA-256 hash of the request body
    body_hash = compute_sha256(body_content)

    # Post nostr event and capture ID
    event_id = nostrpost(private_key=private_key,kind=27235,content="",tags=[["u", api_url], ["method", "POST"], ["payload", body_hash]])
    print("Event ID:", event_id)

    # Confirm post and capture event
    event = getevent(ids=[event_id])[0]
    print("Event:", event)
    
    # Apply base64 to event
    event_base64 = base64.b64encode(json.dumps(event).encode("utf-8")).decode("utf-8")
    print("Base64 Event:", event_base64)

    # POST
    nostrbuildupload(event_base64, file_url, caption, alt)

if __name__ == "__main__":
    # User Input
    file_url = "https://primal.b-cdn.net/media-cache?s=o&a=1&u=https%3A%2F%2Fmedia.tenor.com%2FbVUh2pUkmZMAAAAC%2Ffuturama-were-back-baby.gif"
    caption = "we're back"
    alt = "futurama-were-back-baby"

    fallbackurlgenerator(file_url, caption, alt)