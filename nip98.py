import json
import base64
from nostrpublish import nostrpost
import os
import hashlib
from nip96 import urlnostrbuildupload, filenostrbuildupload
from getevent import getevent

def fallbackurlgenerator(file_url, caption, alt):
    # Variables
    private_key = os.environ["nostrdvmprivatekey"]
    api_url = "https://nostr.build/api/v2/nip96/upload"

    data = {
        "url": file_url,
        "caption": caption,
        "expiration": "",  # "" for no expiration
        "alt": alt,
        "content_type": "image/gif",
        "no_transform": "false"
    }

    # Compute the SHA256 hash
    sha256_hash = hashlib.sha256(json.dumps(data).encode('utf-8')).hexdigest()

    # Post nostr event and capture ID
    event_id = nostrpost(private_key=private_key,kind=27235,content="",tags=[["u", api_url], ["method", "POST"], ["payload", sha256_hash]])
    print(event_id)
    # Confirm post and capture event
    event = getevent(ids=[event_id])[0][1]
    
    # Apply base64 to event
    event_base64 = base64.b64encode(json.dumps(event).encode("utf-8")).decode("utf-8")

    # Initialize url variable
    url = None

    # POST to Nostr.Build and pull new URL
    response = urlnostrbuildupload(event_base64, file_url, caption, alt)
    tags = response['nip94_event']['tags']
    for tag in tags:
        if tag[0] == 'url':
            url = tag[1]
    
    if url is None:
        raise ValueError("URL not found in the response")

    print("Nostr Build URL:", url)
    return url

def urlgenerator(filepath, caption, alt):
    # Variables
    private_key = os.environ["nostrdvmprivatekey"]
    api_url = "https://nostr.build/api/v2/nip96/upload"

    # Open File
    with open(filepath, 'rb') as file:
        file_content = file.read()

    # Set data
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
    print(event_id)
    # Confirm post and capture event
    event = getevent(ids=[event_id])[0][1]
    
    # Apply base64 to event
    event_base64 = base64.b64encode(json.dumps(event).encode("utf-8")).decode("utf-8")

    # Initialize url variable
    url = None

    # POST to Nostr.Build and pull new URL
    response = filenostrbuildupload(event_base64, filepath, caption, alt)
    tags = response['nip94_event']['tags']
    for tag in tags:
        if tag[0] == 'url':
            url = tag[1]
    
    if url is None:
        raise ValueError("URL not found in the response")

    print("Nostr Build URL:", url)
    return url

if __name__ == "__main__":
    # User Input
    file_url = "https://media.tenor.com/lDcJViIM2VIAAAAC/what-jurassic-park.gif"
    caption = "raptor"
    alt = "what-jurassic-park"

    url = fallbackurlgenerator(file_url, caption, alt)
    print(url)