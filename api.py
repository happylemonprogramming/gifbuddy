# Python libraries
from flask import Flask, request, render_template, jsonify, send_file, send_from_directory, url_for, Blueprint
import os, time, threading, sys, logging, subprocess, asyncio, io, requests, mimetypes, uuid
from PIL import Image
from pyzbar.pyzbar import decode
from functools import wraps
from typing import Callable

# API Reference
from gifsearch import fetch_gifs
from lightningpay import lightning_quote, invoice_status
from imgflip import search_memes, caption_image, get_memes
from creategif import lumatexttovideo, getvideo, gifit, resize_gif_to_limit

# Custom Programs
from nostrgifsearch import get_gifs_from_database, remove_duplicates_by_hash
from nostrgifsearch import update_database, get_gifs_from_database
from decentralizeGifUpload import delete_path, decentralizeGifUpload
from nip98 import urlgenerator, fallbackurlgenerator
from meme import create_meme_from_media
from nostrAddressDatabase import get_from_dynamodb
from lsbSteganography import lsbdecode
from keycache import ApiKeyCache

# Configure logging to stdout so Heroku can capture it
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO
)

# Flask setup
api_service = Blueprint('api', __name__)
# app = Flask(__name__)
# app.config["SECRET_KEY"] = os.environ.get('flasksecret')
current_dir = os.path.dirname(os.path.abspath(__file__))

# Set up a folder for storing uploaded files
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
# api.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# DVM public key
pubkey = 'npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'

# Initialize the cache when starting your app
api_cache = ApiKeyCache(refresh_interval=120)

def require_api_key(api_cache: ApiKeyCache) -> Callable:
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get API key from header
            api_key = request.headers.get('API-Key')
            for header, value in request.headers.items():
                print(f"{header}: {value}")
            logging.info(api_key)
            # Check if API key is present
            if not api_key:
                return jsonify({
                    'error': 'Missing API key',
                    'message': 'API_Key header is required'
                }), 401
            
            # Verify API key using cache
            if not api_cache.is_valid_api_key(api_key):
                return jsonify({
                    'error': 'Invalid API key',
                    'message': 'The provided API key is invalid or expired'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# API Documentation
@api_service.route("/api")
def api():
    return render_template("api.html")

@api_service.route("/blastr", methods=['POST'])
@require_api_key(api_cache)
def blastr():
    data = request.get_json()
    event = data.get('event')

    endpoint = "https://blastr-nb.lemonknowsall.workers.dev/event"
    headers = {"Content-Type": "application/json"}
    payload = ['EVENT', event]

    response = requests.post(endpoint, headers=headers, json=payload)

    logging.info(f"Status Code: {response.status_code}")
    logging.info(f"Response JSON: {response.text}")
    return response.text, response.status_code

# Trending Memes
@api_service.route('/api/trending_memes', methods=['GET'])
@require_api_key(api_cache)
def trending_memes():
    trending_memes = get_memes()
    return trending_memes

# Search by Term for Memes
@api_service.route('/api/search_memes', methods=['POST'])
@require_api_key(api_cache)
def meme_search():
    # Capture user data
    data = request.get_json()  # Get the JSON data from the request body
    query = data.get('q')  # Extract the search term

    # Search memes
    include_nsfw = False  # Don't include NSFW content
    search_response = search_memes(query, include_nsfw)

    if search_response.get("success"):
        memes = search_response['memes']
        filtered_memes = [meme for meme in memes if meme['box_count'] <= 2]
        # Example Format: 
        # [{'id': '55311130', 'name': 'This Is Fine', 'url': 'https://i.imgflip.com/wxica.jpg', 'width': 580, 'height': 282, 'box_count': 2, 'captions': 134750}]
        return memes
    else:
        logging.info(f"Error searching memes: {search_response.get('error_message')}")
        return f"Error searching memes: {search_response.get('error_message')}"

# Search GIFs API endpoint
@api_service.route("/api/search_gifs", methods=['POST'])
@require_api_key(api_cache)
def search():
    # Capture user data
    data = request.get_json()  # Get the JSON data from the request body
    search = data.get('q')  # Extract the search term
    pos = data.get('pos')
    logging.info(f'Search term: {search}, Position: {pos}')  # Debugging
    output = fetch_gifs(search,limit=30,pos=pos)
    gifs = {}

    for result in output['results']:
        gif = result['media_formats']['gif']
        gifURL = gif['url']
        gifSize = gif['size']
        gifDims = gif['dims']
        thumb = result['media_formats']['nanogifpreview']['url'] # not always gif format
        preview = result['media_formats']['tinygif']['url']
        image = result['media_formats']['gifpreview']['url']
        basename = os.path.basename(gifURL)[0:-4]
        try:
            alt = result['content_description']
            tags = result['tags']
            summary = search
            for tag in tags:
                summary = f"{summary} {tag}"
        except:
            alt = basename
            summary = search

        gifs[basename] = {
            'gifUrl': gifURL,
            'gifSize': gifSize,
            'gifDims': gifDims,
            'thumb': thumb,
            'preview': preview,
            'alt': alt,
            'image': image,
            'summary': summary
        }

        # Include the next position token in the response
        gifs['next'] = output.get('next', None)

    return jsonify(gifs)

# Search NIP94 endpoint
@api_service.route("/api/nostr_gifs", methods=['POST'])
@require_api_key(api_cache)
def nip94():
    # Capture user data
    data = request.get_json()  # Get the JSON data from the request body
    search = data.get('q')  # Extract the search term
    pos = data.get('pos')
    logging.info(f'Search term: {search}, Position: {pos}')  # Debugging

    output = asyncio.run(get_gifs_from_database("gifs", search))
    unique_output = remove_duplicates_by_hash(output)
    logging.info(f"Result Count for {search}: {str(len(output))}")

    gifs = []
    
    for event in unique_output:
        tags = event['tags']
        for tag in tags:
            if tag[0] == 'url':
                gif = tag[1]
                gifs.append(gif)


    return jsonify({"gifs": gifs})

# Capture Metadata to Pass to Nostr.Build, then Complete NIP94 endpoint
@api_service.route("/api/meme_metadata", methods=['POST'])
@require_api_key(api_cache)
def meme_metadata():
    start = time.time()
    data = request.get_json()
    memeUrl = data.get('url')
    alt = "Meme Template"
    summary = data.get('name')
    searchTerm = data.get('searchTerm')

    # Combine SearchTerm with Summary for now
    summary = f"{summary} {searchTerm}"

    try:
        subprocess.Popen(["python", "decentralizeGifUrl.py", memeUrl, summary, alt])
        logging.info(f'Metadata Process Time: {round(time.time()-start, 1)}')
        return jsonify({"message": "Task is being processed."}), 202
    
    except Exception as e:
        logging.info(f'Metadata Failure Time: {round(time.time()-start, 1)}')
        return jsonify({"error": str(e)}), 500

# Capture GIF Metadata to Pass to Nostr.Build, then Complete NIP94 endpoint
@api_service.route("/api/gif_metadata", methods=['POST'])
@require_api_key(api_cache)
def gif_metadata():
    start = time.time()
    data = request.get_json()
    gifUrl = data.get('gifUrl')
    gifSize = data.get('gifSize')
    gifDims = data.get('gifDims')
    thumb = data.get('thumb')
    preview = data.get('preview')
    alt = data.get('alt')
    image = data.get('image')
    summary = data.get('summary')
    searchTerm = data.get('searchTerm')
    
    try:
        subprocess.Popen(["python", "decentralizeGifUrl.py", gifUrl, summary, alt, image, preview])
        logging.info(f'Metadata Process Time: {round(time.time()-start, 1)}')
        return jsonify({"message": "Task is being processed."}), 202
    
    except Exception as e:
        logging.info(f'Metadata Failure Time: {round(time.time()-start, 1)}')
        return jsonify({"error": str(e)}), 500

# Get URL from Nostr.Build Upload, then Complete NIP94 endpoint
@api_service.route("/api/upload", methods=['POST'])
@require_api_key(api_cache)
def uploading():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        filepath = os.path.join(api.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)

        caption = request.form.get('caption', '')
        alt = caption
        logging.info(f"Caption text: {caption}")
        logging.info(f"Alt text: {alt}")

        # try:
        #     url = decentralizeGifUpload(filepath, caption, alt, mime_type)
        #     delete_path(filepath)
        #     return jsonify({'message': 'File uploaded successfully!', 'url': url,'filename': file.filename, 'caption': caption, 'alt': alt}), 200

        try:
            subprocess.Popen(["python", "decentralizeGifUpload.py", filepath, caption, alt])
            return jsonify({'message': 'File processing in background!'}), 200
        
        except Exception as e:
            delete_path(filepath)
            return jsonify({"error": str(e)}), 500

    return jsonify({'error': 'Failed to upload file'}), 500

# Create New Gif with AI
@api_service.route("/api/creating", methods=['POST'])
@require_api_key(api_cache)
def creating():
    start = time.time()
    data = request.get_json()
    prompt = data.get('prompt')
    caption = data.get('caption')
    
    try:
        logging.info("Initiating AI Video Creation")
        output = lumatexttovideo(prompt)
        task_id = output['id']
        logging.info(f"Task ID: {task_id}")
        logging.info(f'Creating Process Time: {round(time.time()-start, 1)}')
        return jsonify({'message': 'Task is being processed.', 'id': task_id}), 202
    
    except Exception as e:
        logging.info(f'Creating Failure Time: {round(time.time()-start, 1)}')
        return jsonify({"error": str(e)}), 500

# Create Gif with Caption
@api_service.route("/api/meme_gifs", methods=['POST'])
@require_api_key(api_cache)
def memegifs():
    start = time.time()
    data = request.get_json()
    url = data.get('url')
    caption = data.get('caption')
    
    try:
        logging.info("Creating Folder Path for Meme")
        # Generate a unique folder name
        unique_id = str(uuid.uuid4())
        output_folder = os.path.join("./creations/", unique_id) #os.getcwd()
        
        # Create the folder
        os.makedirs(output_folder, exist_ok=True)
        output_path=f"{output_folder}/"

        logging.info("Initiating Meme Creation")
        filepath = create_meme_from_media(url, caption, output_path)
        memeTime = time.time()-start
        logging.info(f'Meme time: {memeTime}')

        # Check if the file exists
        if os.path.isfile(filepath):
            # Process the file and additional fields as needed
            logging.info(f"Filepath: {filepath}, Caption: {caption}, Original URL: {url}")
            mime_type, _ = mimetypes.guess_type(filepath)
            url = decentralizeGifUpload(filepath, caption, caption, mime_type)
            delete_path(filepath)
            totalTime = time.time()-start
            logging.info(f'Total time: {totalTime}')
            return jsonify({
                'status':'completed',
                'result': url,
            }), 200
        else:
            return jsonify({"error": "something broke"})  
    
    except Exception as e:
        logging.info(f'Creating Failure Time: {round(time.time()-start, 1)}')
        return jsonify({"error": str(e)}), 500

# Get AI dreaming status
@api_service.route('/api/dream_status', methods=['POST'])
@require_api_key(api_cache)
def check_gif_status():  
    data = request.get_json()
    prompt = data.get('prompt')
    caption = data.get('caption')
    id = data.get('taskId')

    output = getvideo(id)
    state = output['state']
    logging.info(f"AI Dream State: {state}")

    if state == 'completed':
        url = output['assets']['video']
        filepath = gifit(url, caption) # this could be used to caption any .mp4 url

        # Check if the file exists
        if os.path.isfile(filepath):
            # Process the file and additional fields as needed
            logging.info(f"Filepath: {filepath}, Caption: {caption}, Prompt: {prompt}")
            url = decentralizeGifUpload(filepath, caption, prompt, "image/gif")
            return jsonify({
                'status':'completed',
                'result': url,
            }), 200
        else:
            return jsonify({"error": "something broke"})  
    else:
        return jsonify({"status": "processing"})  # Indicate that the process is still ongoing

@api_service.route("/api/decode", methods=["POST"])
@require_api_key(api_cache)
def decode_image():
    try:
        data = request.get_json()
        image_url = data.get('image_url')

        # Validate inputs
        if not image_url:
            return jsonify({"error": "Missing image url"}), 400

        logging.info("Creating Folder Path for Meme")
        # Generate a unique folder name
        # unique_id = str(uuid.uuid4())
        output_folder = os.path.join("./creations/", "") #os.getcwd()
        
        # Create the folder
        os.makedirs(output_folder, exist_ok=True)
        output_path=f"{output_folder}/"
        output_file_path = os.path.join(output_path, "decoded_image.png")
        input_file_path = os.path.join(output_path, "encoded_image.png")

        # Fetch the image from the URL
        response = requests.get(image_url, stream=True)
        response.raise_for_status()  # Raise an error for bad status codes

        # Write the image content to a local file
        with open(input_file_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        # LSB Decoder
        n_bits = 2
        image_to_decode = Image.open(input_file_path)
        lsbdecode(image_to_decode, n_bits).save(output_file_path)

        # Load the QR code image
        image = Image.open(output_file_path)

        # Decode the QR code
        decoded_objects = decode(image)

        # Print the decoded information
        for obj in decoded_objects:
            logging.info(f"Data: {obj.data.decode('utf-8')}")
            logging.info(f"Type: {obj.type}")
            content = obj.data.decode('utf-8')

        temp_url = url_for("api/deliver", filename="decoded_image.png", _external=True)

        return jsonify({
            "message": "Image downloaded successfully",
            "url": temp_url,
            "content": content
        }), 200

    except requests.exceptions.RequestException as e:
        logging.info(f"error: Failed to download image: {str(e)}")
        return jsonify({"error": f"Failed to download image: {str(e)}"}), 500
    except Exception as e:
        logging.info(f"error: An unexpected error occurred: {str(e)}")
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@api_service.route("/api/deliver/<filename>", methods=["GET"])
def deliver(filename):
    """
    Endpoint to serve an image file by its filename.
    """
    output_folder = os.path.join("./creations/", "") #os.getcwd()
    try:
        return send_from_directory(output_folder, filename, as_attachment=False)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    api.run(host="0.0.0.0", port=port, debug=True)