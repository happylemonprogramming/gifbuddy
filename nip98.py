import json
import base64
from nostrpublish import nostrpost
import os
import hashlib
from nip96 import nostrbuildupload
from getevent import getevent
import requests

def fallbackurlgenerator(file_url, caption, alt):
    # Variables
    private_key = os.environ["nostrdvmprivatekey"]
    api_url = "https://nostr.build/api/v2/nip96/upload"

    # Prepare file data from URL
    file_content = requests.get(file_url, stream=True).content

    # NIP94 Data
    data = {
        "caption": caption,
        "expiration": "",  # "" for no expiration
        "alt": alt,
        "content_type": "image/gif",
        "no_transform": "false"
    }

    # Combine data into one string, including the file content
    combined_data = json.dumps(data).encode('utf-8') + file_content

    # Compute the SHA256 hash
    sha256_hash = hashlib.sha256(combined_data).hexdigest()

    # Post nostr event and capture ID
    event_id = nostrpost(private_key=private_key,kind=27235,content="",tags=[["u", api_url], ["method", "POST"], ["payload", sha256_hash]])

    # Confirm post and capture event
    event = getevent(ids=[event_id])[0][1]
    
    # Apply base64 to event
    event_base64 = base64.b64encode(json.dumps(event).encode("utf-8")).decode("utf-8")

    # POST to Nostr.Build and pull new URL
    response = nostrbuildupload(event_base64, file_url, caption, alt)
    tags = json.loads(response)['nip94_event']['tags'][0]
    for tag in tags:
        if tag[0] == 'url':
            url = tag[1]
    
    print("Nostr Build URL:", url)
    return url

if __name__ == "__main__":
    # User Input
    file_url = "https://media.tenor.com/KGRLk_Dfub0AAAAC/scooby-doo-woof.gif"
    caption = "ruh roh"
    alt = "scooby-doo-woof"

    fallbackurlgenerator(file_url, caption, alt)