from publish import nostrpost
import os, requests, hashlib, asyncio, logging, ast
import blurhash
from PIL import Image
from io import BytesIO

def capture_image(gif_path):
    # Load the GIF
    gif = Image.open(gif_path)

    # Specify the frame to save; here we save the first frame
    frame_number = 0
    gif.seek(frame_number)

    # Get the folder path (excluding the basename)
    folder_path = os.path.dirname(gif_path)
    
    # Get the basename without the extension
    basename = os.path.basename(gif_path)[0:-4]
    
    # Specify the new frame path in the same folder
    frame_path = os.path.join(folder_path, f"{basename}.jpg")

    # Save the frame as a .jpg image
    gif.save(frame_path, "JPEG")

    logging.info(f"Frame saved as {frame_path}")

    return frame_path

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
        logging.info(f"Failed to fetch URL: {url}")
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
        
        event_id = asyncio.run(nostrpost(private_key=private_key,content=searchTerm, kind=kind, tags=tags))
        logging.info(event_id)

    return event_id

def nip94(tags, alt, summary, image, thumb):
    # Post 1063 File Metadata Event
    private_key = os.environ["nostrdvmprivatekey"] 
    kind = 1063

    if isinstance(tags, str):
        try:
            tags = ast.literal_eval(tags)
            if not isinstance(tags, list):
                tags = [tags]
        except (ValueError, SyntaxError):
            # If literal_eval fails, treat it as a single string item list
            tags = [tags]

    tags.append(["summary", summary])
    tags.append(["alt", alt])

    try:
        tags.append(["thumb", thumb, compute_sha256(image)])
        tags.append(["image", image, compute_sha256(image)])
    except:
        pass
        
    logging.info('Attempting to Post NIP94 Event')
    event_id = asyncio.run(nostrpost(private_key=private_key,content=f"{summary} {alt}", kind=kind, tags=tags, relays=["wss://relay.gifbuddy.lol"]))

    return event_id

if __name__ == "__main__":
    # from gifsearch import fetch_gifs
    # from getevent import getevent
    # searchTerm = 'wow'
    # output = fetch_gifs(searchTerm,1)
    # gif = output['results'][0]['media_formats']['gif']
    # gifUrl = gif['url']
    # gifSize = str(gif['size'])
    # gifDims = str(gif['dims'])
    # thumb = output['results'][0]['media_formats']['nanogifpreview']['url']
    # preview = output['results'][0]['media_formats']['tinygifpreview']['url']
    # alt = os.path.basename(gifUrl)[0:-4]
    # print(gifUrl, gifSize, gifDims, thumb, preview, alt)
    # # BUG: not posting whencopying gif :(
    # event_id = gifmetadata(gifUrl, gifSize, gifDims, thumb, preview, alt, searchTerm)
    # eventlist = getevent(ids=[event_id])
    # print(eventlist, len(eventlist))
    alt = 'cartoon'
    searchTerm = 'scrooge mcduck'
    tags = [['url', 'https://image.nostr.build/d20d2035280c79a86ef0dc6090beeb29ed5b80a3775f5cf7007956646107835a.gif'], ['ox', 'd20d2035280c79a86ef0dc6090beeb29ed5b80a3775f5cf7007956646107835a'], ['fallback', 'https://media.tenor.com/R69QHouKBoQAAAAC/cartoon.gif'], ['x', '31aa4ef986340768466d806543b206b656a22088b029deb7a93fb3fad392cf6c'], ['m', 'image/gif'], ['dim', '360x258'], ['bh', 'LTJ7v0~QItn,BQ%G$~WV06E4X4WV'], ['blurhash', 'LTJ7v0~QItn,BQ%G$~WV06E4X4WV'], ['thumb', 'https://image.nostr.build/thumb/d20d2035280c79a86ef0dc6090beeb29ed5b80a3775f5cf7007956646107835a.gif']]
    print(nip94(tags, alt, searchTerm))