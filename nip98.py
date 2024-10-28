import json, base64, os, hashlib, logging, asyncio, time
from publish import nostrpost
from nip96 import urlnostrbuildupload, filenostrbuildupload
from getevent import getevent
from nip94 import nip94, capture_image

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
    event_id = asyncio.run(nostrpost(private_key, content="", url=api_url, payload=sha256_hash))

    # Confirm post and capture event
    event = asyncio.run(getevent(id=event_id))
    event = event[0]
    
    # Apply base64 to event
    event_base64 = base64.b64encode(json.dumps(event).encode("utf-8")).decode("utf-8")

    # Initialize url variable
    url = None

    # POST to Nostr.Build and pull new URL
    response = urlnostrbuildupload(event_base64, file_url, caption, alt)
    logging.info(response)
    tags = response['nip94_event']['tags']
    for tag in tags:
        if tag[0] == 'url':
            url = tag[1]
    
    if url is None:
        raise ValueError("URL not found in the response")

    print("Nostr Build URL:", url)
    return url, tags

def urlgenerator(filepath, caption, alt, MIME):
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
        "content_type": MIME,
        "no_transform": "false"
    }

    # Combine data into one string, including the file content
    combined_data = json.dumps(data).encode('utf-8') + file_content

    # Compute the SHA256 hash
    sha256_hash = hashlib.sha256(combined_data).hexdigest()

    # Post nostr event and capture ID
    event_id = asyncio.run(nostrpost(private_key, content="", url=api_url, payload=sha256_hash))
    logging.info(f'Nostr.Build Event ID: {event_id}')

    start_time = time.time()
    timeout = 30
    # Keep trying to get the event until timeout
    while True:
        event = asyncio.run(getevent(id=event_id))
        
        if event:  # If event is found, return it
            event = event[0]
            break

        # Wait a short time before checking again
        time.sleep(0.5)

        if time.time() - start_time >= timeout:
            # If the loop ends without returning, raise an error due to timeout
            raise TimeoutError(f"Failed to fetch event with ID {event_id} within {timeout} seconds.")

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
    return url, tags

def decentralizeGifUrl(file_url, summary, alt, image, preview):
    caption = f"{summary} {alt}"
    url, tags = fallbackurlgenerator(file_url, caption, alt)

    try:
        event94 = nip94(tags, alt, summary, image, preview)
        print('NIP94 Event Published:', event94)
    except:
        print('NIP94 Failed')

    return url

def decentralizeGifUpload(filepath, caption, alt, MIME):
    url, tags = urlgenerator(filepath, caption, alt, MIME)
    for tag in tags:
        if tag[0] == 'thumb':
            preview = tag[1]
    try:
        image_path = capture_image(filepath)
        image_url = urlgenerator(image_path, caption, alt, "image/png")
        event94 = nip94(tags, alt, caption, image_url, preview)
        print('NIP94 Event Published:', event94)
    except:
        print('NIP94 Failed')

    return url

if __name__ == "__main__":
    # User Input
    file_url = "https://media.tenor.com/lDcJViIM2VIAAAAC/what-jurassic-park.gif"
    caption = "raptor"
    alt = "what-jurassic-park"

    url = asyncio.run(fallbackurlgenerator(file_url, caption, alt))
    print(url)