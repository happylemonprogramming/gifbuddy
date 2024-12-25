import json, base64, os, hashlib, asyncio, time, logging, subprocess
from publish import nostrpost
from nip96 import urlnostrbuildupload, filenostrbuildupload
from getevent import getevent
from nip94 import nip94

def fallbackurlgenerator(file_url, caption, alt, MIME):
    # Variables
    private_key = os.environ["nostrdvmprivatekey"]
    api_url = "https://nostr.build/api/v2/nip96/upload"

    data = {
        "url": file_url,
        "caption": caption,
        "expiration": "",  # "" for no expiration
        "alt": alt,
        "content_type": MIME,
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

    logging.info(f"Nostr Build URL: {url}")
    return url, tags

def urlgenerator(filepath, caption, alt, MIME):
    start = time.time()
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
        "no_transform": "true"
    }

    # Combine data into one string, including the file content
    combined_data = json.dumps(data).encode('utf-8') + file_content

    # Compute the SHA256 hash
    sha256_hash = hashlib.sha256(combined_data).hexdigest()

    # Post nostr event and capture ID
    event_id = asyncio.run(nostrpost(private_key, content="", url=api_url, payload=sha256_hash))
    logging.info(f'Nostr.Build Event ID: {event_id}')
    logging.info(f'Nostr Post Time: {round(time.time()-start, 2)}')

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

    logging.info(f"NIP98 Event Time: {round(time.time()-start,2)}")
    buildPostRequest = time.time()
    # POST to Nostr.Build and pull new URL
    response = filenostrbuildupload(event_base64, filepath, caption, alt, MIME)
    tags = response['nip94_event']['tags']
    for tag in tags:
        if tag[0] == 'url':
            url = tag[1]
    
    if url is None:
        raise ValueError("URL not found in the response")

    logging.info(f"Nostr Build URL: {url}")
    logging.info(f"NIP96 POST Time: {round(time.time()-buildPostRequest,2)}")
    logging.info(f"Url generation time: {round(time.time()-start,2)}")
    return url, tags

def decentralizeGifUrl(file_url, summary, alt, MIME, image=None, preview=None):
    caption = f"{summary} {alt}"
    url, tags = fallbackurlgenerator(file_url, caption, alt, MIME)
    
    if not image and not preview:
        for tag in tags:
            if tag[0] == 'thumb':
                preview = tag[1]
                image = preview

    if MIME == 'image/gif':
        tags.append(["t", "gifbuddy"])
    else:
        tags.append(["t", "memeamigo"])

    try:
        event94 = nip94(tags, alt, summary, image, preview)
        logging.info(f'NIP94 Event Published: {event94}')
    except:
        logging.info('NIP94 Failed')

    return url

# def decentralizeGifUpload(filepath, caption, alt, MIME):
#     url, tags = urlgenerator(filepath, caption, alt, MIME)
#     for tag in tags:
#         if tag[0] == 'thumb':
#             preview = tag[1]
#             print("Preview Image:", preview)
#     try:
#         logging.info('Decentralizing Gif Upload')
#         if 'DYNO' in os.environ:
#             virtualenv_python = 'python' #for Heroku
#         else:
#             virtualenv_python = r"C:\Users\clayt\Documents\Programming\gifbuddy\buddy\Scripts\python.exe"
        
#         # subprocess.Popen([virtualenv_python, "decentralizeGifUpload.py", filepath, str(tags), caption, alt, preview])
#         if MIME == "image/gif" or MIME == "video/mp4":
#             image_path = capture_image(filepath)
#             image_url = urlgenerator(image_path, caption, alt, "image/png")
#         else:
#             image_url = url
#             preview = url

#         event94 = nip94(tags, alt, caption, image_url, preview)
#         delete_path(image_path)

#         logging.info(f'NIP94 Event Published: {event94}')
#         return event94

#     except:
#         logging.info('NIP94 Failed')

#     return url

if __name__ == "__main__":
    import sys
    # Configure logging to stdout so Heroku can capture it
    logging.basicConfig(
        stream=sys.stdout,
        level=logging.INFO
    )
    # User Input
    file_url = "https://media.tenor.com/lDcJViIM2VIAAAAC/what-jurassic-park.gif"
    summary = "raptor"
    alt = "what-jurassic-park"

    # url = asyncio.run(fallbackurlgenerator(file_url, caption, alt))
    # print(url)

    # # Meme Input
    # file_url = "https://i.imgflip.com/430rn7.jpg"
    # caption = "dog"
    # alt = "Buff Doge vs. Cheems"

    import mimetypes
    mime_type, _ = mimetypes.guess_type(file_url)
    output = decentralizeGifUrl(file_url, summary, alt, mime_type)
    print(output)