from nostrpublish import nostrpost
import os
import blurhash
import requests
from PIL import Image
from io import BytesIO
import hashlib

def compute_sha256(url):
    # Send a GET request to the URL to fetch the content
    response = requests.get(url)
    
    # Check if the request was successful (status code 200)
    if response.status_code == 200:
        # Read the binary content from the response
        content = response.content
        
        # Compute SHA-256 hash of the binary content
        sha256_hash = hashlib.sha256(content).hexdigest()
        
        return sha256_hash
    else:
        # Handle errors if the request fails
        print(f"Failed to fetch URL: {url}")
        return None

def gifmetadata(gifUrl, gifSize, gifDims, thumb, preview, alt, searchTerm):
    # Blurhash
    response = requests.get(preview)
    response.raise_for_status()
    image = Image.open(BytesIO(response.content))
    blur_hash = blurhash.encode(image, x_components=4, y_components=3)

    # Post 1063 File Metadata Event
    private_key = os.environ["nostrdvmprivatekey"] 
    kind = 1063

    hash = str(compute_sha256(gifUrl))
    if hash is not None:
        tags = [["url", gifUrl],
                ["m", "image/gif"],
                ["x", hash],
                ["ox", hash],
                ["size", str(gifSize)],
                ["dim", str(gifDims)],
                ["blurhash", blur_hash],
                ["thumb", thumb],
                ["image", preview],
                ["summary", searchTerm],
                ["alt", alt]
                ]
        
        event_id = nostrpost(private_key,kind,searchTerm,tags)
        print(event_id)

    return event_id

if __name__ == "__main__":
    from gifsearch import fetch_gifs
    from getevent import getevent
    searchTerm = 'wow'
    output = fetch_gifs(searchTerm,1)
    gif = output['results'][0]['media_formats']['gif']
    gifUrl = gif['url']
    gifSize = str(gif['size'])
    gifDims = str(gif['dims'])
    thumb = output['results'][0]['media_formats']['nanogifpreview']['url']
    preview = output['results'][0]['media_formats']['tinygifpreview']['url']
    alt = os.path.basename(gifUrl)[0:-4]
    print(gifUrl, gifSize, gifDims, thumb, preview, alt)
    # BUG: not posting whencopying gif :(
    event_id = gifmetadata(gifUrl, gifSize, gifDims, thumb, preview, alt, searchTerm)
    eventlist = getevent(ids=[event_id])
    print(eventlist, len(eventlist))