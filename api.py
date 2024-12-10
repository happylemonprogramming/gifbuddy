# Python libraries
from flask import Flask, request, render_template, jsonify, send_file, send_from_directory
import os, time, threading, sys, logging, subprocess, asyncio, io, requests, mimetypes, uuid
import http.client, json
from PIL import Image

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

# Configure logging to stdout so Heroku can capture it
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO
)

# Flask setup
app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get('flasksecret')
current_dir = os.path.dirname(os.path.abspath(__file__))

# Set up a folder for storing uploaded files
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Cache to store the counter value
cached_counter = {"count": "0"}
cached_memecounter = {"count": "0"}

# DVM public key
pubkey = 'npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'

# Recurring function for NIP94 event counting
def update_counter():
    """Fetches the count periodically and updates the cache."""
    global cached_counter
    while True:
        # Get GIF data
        try:
            # Variant with local database
            asyncio.run(update_database("gifs"))
            output = asyncio.run(get_gifs_from_database("gifs", "")) # Empty to return all
            cached_counter["count"] = str(len(output))
            logging.info(f"Gif Counter: {cached_counter["count"]}")
        except Exception as e:
            logging.info(f"Error updating counter: {e}")

        # Get Meme data
        try:
            # Variant with local database
            asyncio.run(update_database("memes", "memes"))
            output = asyncio.run(get_gifs_from_database("memes", "")) # Empty to return all
            cached_memecounter["count"] = str(len(output))
            logging.info(f"Meme Counter: {cached_memecounter["count"]}")
        except Exception as e:
            logging.info(f"Error updating counter: {e}")
        
        time.sleep(120)  # Wait for 2 minutes before updating again

# Start the background task when the app starts
threading.Thread(target=update_counter, daemon=True).start()

# Homepage
@app.route("/")
def index():
    host = request.host  # Get the host (e.g., gifbuddy.lol or memeamigo.lol)

    if 'gifbuddy.lol' in host:
        return render_template('dev.html')
    elif 'memeamigo.lol' in host:
        return render_template('memesearch.html')
    else:
        return render_template('memesearch.html')

# Development environment
@app.route("/dev")
def dev():
    return render_template("dev.html")

# Development environment
@app.route("/gifsearch")
def gifsearch():
    return render_template("dev.html")

# Nostr Search
@app.route("/nostr")
def nostr():
    return render_template("nostr.html")

# Upload Page
@app.route("/upload")
def upload():
    return render_template("upload.html")

# Meme Search Page
@app.route("/memesearch")
def memesearch():
    return render_template("memesearch.html")

# Meme Page
@app.route("/meme")
def meme():
    return render_template("memeedit.html")

# Caption Meme Page
@app.route("/memecaption")
def memecaption():
    return render_template("memeedit.html")

# Create Page
@app.route("/create")
def create():
    return render_template("create.html")

# Creation Page
@app.route("/creation")
def creation():
    return render_template("creation.html")

# GIF Counter API
@app.route("/counter", methods=['GET'])
def get_count():
    """Returns the cached counter value."""
    return jsonify(cached_counter)

# Meme Counter API
@app.route("/memecounter", methods=['GET'])
def get_meme_count():
    """Returns the cached counter value."""
    return jsonify(cached_memecounter)

# Manifest for PWA
@app.route("/manifest.json")
def manifest():
    host = request.host  # Get the host (e.g., gifbuddy.lol or memeamigo.lol)

    if 'gifbuddy.lol' in host:
        return send_file('manifest.json', mimetype='application/manifest+json')
    elif 'memeamigo.lol' in host:
        return send_file('manifest_memeamigo.json', mimetype='application/manifest+json')
    else: # Default
        return send_file('manifest_memeamigo.json', mimetype='application/manifest+json') 

# Apple Pay Domain Association
@app.route('/.well-known/apple-developer-merchantid-domain-association')
def serve_apple_pay_file():
    return send_from_directory(current_dir, 'apple-developer-merchantid-domain-association')

@app.route('/.well-known/nostr.json', methods=['GET'])
def get_nostr_mapping():
    # Get the "name" parameter from the query string
    name = request.args.get('name')
    name = name.lower()
    
    if not name:
        return jsonify({"error": "Missing 'name' parameter"}), 400

    try:
        item = get_from_dynamodb(name)
        pubkeyhex = item['pubkey']
        response = {"names": {name: pubkeyhex}}
        return jsonify(response)
    except:
        return jsonify({"error": "Name not found"}), 404

# NOTE: Reserved for future use
@app.route("/privacypolicy")
def policy():
    return render_template("privacypolicy.html")

@app.route("/termsofservice")
def terms():
    return render_template("termsofservice.html")

# Trending Memes
@app.route('/trending_memes', methods=['GET'])
def trending_memes():
    trending_memes = get_memes()
    return trending_memes

# Search by Term for Memes
@app.route('/search_memes', methods=['POST'])
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

# Caption Meme (OLD)
@app.route('/caption_meme', methods=['POST'])
def caption_meme():
    # Capture user data
    data = request.get_json()  # Get the JSON data from the request body
    template_id = data.get('template_id')
    text0 = data.get('text0')
    text1 = data.get('text1')

    # Search memes
    response = caption_image(template_id, text0, text1)

    if response.get("success"):
        return {"result": response.get("data", {}).get("url", "")}
    else:
        return {"success": False, "error_message": response.get('error_message', "Failed to caption image")}

@app.route('/memecreate', methods=['POST'])
def meme_create():
    start = time.time()
    # Get the transparent image and GIF URL from the request
    logging.info("gifcreateurl: Received POST request")
    transparent_image_file = request.files.get('transparent_image')
    gif_url = request.form.get('gif_url')

    # Validate inputs
    if not transparent_image_file or not gif_url:
        logging.info("memecreate: Missing transparent image or GIF URL")
        return jsonify({"error": "Missing transparent image or GIF URL"}), 400

    try:
        # Open the transparent overlay image
        overlay = Image.open(transparent_image_file).convert("RGBA")
        logging.info("memecreate: Transparent image loaded successfully")

        # Fetch the GIF from the URL
        response = requests.get(gif_url)
        if response.status_code != 200:
            logging.info(f"memecreate: Failed to fetch GIF from URL {gif_url}")
            return jsonify({"error": "Failed to fetch GIF"}), 400

        # Open the GIF from memory
        with Image.open(io.BytesIO(response.content)) as gif:
            # Additional validation
            if gif.format != 'GIF':
                logging.error(f"Not a GIF: {gif.format}")
                return jsonify({"error": "File is not a GIF"}), 400

            logging.info(f"Original GIF info: {gif.info}")
            logging.info("memecreate: GIF loaded successfully from URL")
            
            frames = []

            # Process each frame of the GIF with improved handling
            for frame_num in range(gif.n_frames):
                gif.seek(frame_num)
                # logging.info(f"Frame {frame_num} mode: {gif.mode}, size: {gif.size}")
                
                current_frame = gif.copy().convert("RGBA")
                current_frame = current_frame.resize(overlay.size)
                
                # Create a new frame with consistent palette
                combined_frame = Image.new("RGBA", current_frame.size)
                combined_frame.paste(current_frame, (0, 0), current_frame)
                combined_frame.paste(overlay, (0, 0), overlay)
                
                frames.append(combined_frame)

            logging.info("memecreate: All GIF frames processed successfully")

            # Resize GIF iteratively if needed
            output_buffer = io.BytesIO()
            try:
                frames[0].save(
                    output_buffer,
                    format="GIF",
                    save_all=True,
                    append_images=frames[1:],
                    duration=gif.info.get("duration", 100),
                    loop=gif.info.get("loop", 0),
                    disposal=2,  # Reset to background color before rendering next frame
                    optimize=True,
                    quality=85,
                    quantization=2  # Reduce color depth
                )
            except Exception as save_error:
                logging.error(f"Error saving GIF: {save_error}")
                return jsonify({"error": "Failed to save GIF"}), 500

            gif_size_mb = output_buffer.tell() / (1024 * 1024)
            logging.info(f"memecreate: Final GIF size: {gif_size_mb:.2f} MB")

            if gif_size_mb > 21:
                logging.info("memecreate: GIF exceeds size limit, attempting resizing")
                output_buffer = resize_gif_to_limit(frames, gif.info)

            gif_size_mb = output_buffer.tell() / (1024 * 1024)
            if gif_size_mb > 21:
                logging.info("memecreate: Resizing failed to reduce GIF size below 21MB")
                return jsonify({"error": "Unable to reduce GIF size below 21MB"}), 400

            # Return the generated GIF directly in the response
            output_buffer.seek(0)  # Ensure the buffer is at the start
            return send_file(
                output_buffer,
                mimetype='image/gif',
                as_attachment=False,  # The GIF will be displayed in the browser
                download_name="memeamigo.gif"
            )

    except Image.UnidentifiedImageError:
        logging.error("Could not identify image")
        return jsonify({"error": "Invalid image file"}), 400
    except Exception as e:
        logging.error(f"gifcreateurl error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Create Image Meme Url
@app.route('/memecreateurl', methods=['POST'])
def meme_create_url():
    try:
        # Get the transparent image and GIF URL from the request
        meme = request.files.get('meme')

        # Validate inputs
        if not meme:
            return jsonify({"error": "Missing meme"}), 400

        logging.info("Creating Folder Path for Meme")
        # Generate a unique folder name
        unique_id = str(uuid.uuid4())
        output_folder = os.path.join("./creations/", unique_id) #os.getcwd()
        
        # Create the folder
        os.makedirs(output_folder, exist_ok=True)
        output_path=f"{output_folder}/"
        output_file_path = os.path.join(output_path, "output_meme.jpg")
        with open(output_file_path, "wb") as f:
            f.write(meme.read())

        # Create URL
        logging.info("Generating URL")
        url, _ = urlgenerator(output_file_path, "memeamigo", "memeamigo", "image/jpeg")
        logging.info(f'memecreateurl: {url}')
        delete_path(output_file_path)

        # Return the Meme
        return jsonify({
            "status": "success",
            "message": "Meme created successfully",
            "url": url
        }), 200

    except Exception as e:
        logging.error(f"Error creating meme URL: {str(e)}")
        return jsonify({"error": "Failed to create meme"}), 500

# Create Image Meme Url
@app.route('/fallbackmemecreateurl', methods=['POST'])
def fallback_meme_create_url():
    try:
        # Get the transparent image and GIF URL from the request
        meme_url = request.form.get('meme_url')

        # Validate inputs
        if not meme_url:
            return jsonify({"error": "Missing meme"}), 400

        # Create URL
        logging.info("Generating URL")
        url, _ = fallbackurlgenerator(meme_url, "memeamigo", "memeamigo", "image/jpeg")
        logging.info(f'memecreateurl: {url}')

        # Return the Meme
        return jsonify({
            "status": "success",
            "message": "Meme created successfully",
            "url": url
        }), 200

    except Exception as e:
        logging.error(f"Error creating meme URL: {str(e)}")
        return jsonify({"error": "Failed to create meme"}), 500

@app.route('/gifcreateurl', methods=['POST'])
def gif_create_url():
    start = time.time()
    # Get the transparent image and GIF URL from the request
    logging.info("gifcreateurl: Received POST request")
    transparent_image_file = request.files.get('transparent_image')
    gif_url = request.form.get('gif_url')

    # Validate inputs
    if not transparent_image_file or not gif_url:
        logging.info("gifcreateurl: Missing transparent image or GIF URL")
        return jsonify({"error": "Missing transparent image or GIF URL"}), 400

    try:
        # Open the transparent overlay image
        overlay = Image.open(transparent_image_file).convert("RGBA")
        logging.info("gifcreateurl: Transparent image loaded successfully")

        # Fetch the GIF from the URL
        response = requests.get(gif_url)
        if response.status_code != 200:
            logging.info(f"gifcreateurl: Failed to fetch GIF from URL {gif_url}")
            return jsonify({"error": "Failed to fetch GIF"}), 400

        # Open the GIF from memory
        with Image.open(io.BytesIO(response.content)) as gif:
            # Additional validation
            if gif.format != 'GIF':
                logging.error(f"Not a GIF: {gif.format}")
                return jsonify({"error": "File is not a GIF"}), 400

            logging.info(f"Original GIF info: {gif.info}")
            logging.info("gifcreateurl: GIF loaded successfully from URL")
            
            frames = []

            # Process each frame of the GIF with improved handling
            for frame_num in range(gif.n_frames):
                gif.seek(frame_num)
                # logging.info(f"Frame {frame_num} mode: {gif.mode}, size: {gif.size}")
                
                current_frame = gif.copy().convert("RGBA")
                current_frame = current_frame.resize(overlay.size)
                
                # Create a new frame with consistent palette
                combined_frame = Image.new("RGBA", current_frame.size)
                combined_frame.paste(current_frame, (0, 0), current_frame)
                combined_frame.paste(overlay, (0, 0), overlay)
                
                frames.append(combined_frame)

            logging.info("gifcreateurl: All GIF frames processed successfully")

            # Resize GIF iteratively if needed
            output_buffer = io.BytesIO()
            try:
                frames[0].save(
                    output_buffer,
                    format="GIF",
                    save_all=True,
                    append_images=frames[1:],
                    duration=gif.info.get("duration", 100),
                    loop=gif.info.get("loop", 0),
                    disposal=2,  # Reset to background color before rendering next frame
                    optimize=True,
                    quality=85,
                    quantization=2  # Reduce color depth
                )
            except Exception as save_error:
                logging.error(f"Error saving GIF: {save_error}")
                return jsonify({"error": "Failed to save GIF"}), 500

            gif_size_mb = output_buffer.tell() / (1024 * 1024)
            logging.info(f"gifcreateurl: Final GIF size: {gif_size_mb:.2f} MB")

            if gif_size_mb > 21:
                logging.info("gifcreateurl: GIF exceeds size limit, attempting resizing")
                output_buffer = resize_gif_to_limit(frames, gif.info)

            gif_size_mb = output_buffer.tell() / (1024 * 1024)
            if gif_size_mb > 21:
                logging.info("gifcreateurl: Resizing failed to reduce GIF size below 21MB")
                return jsonify({"error": "Unable to reduce GIF size below 21MB"}), 400

            # Save the resized GIF
            unique_id = str(uuid.uuid4())
            output_folder = os.path.join("./creations/", unique_id)
            os.makedirs(output_folder, exist_ok=True)
            output_file_path = os.path.join(output_folder, "output_meme.gif")
            
            try:
                with open(output_file_path, "wb") as f:
                    f.write(output_buffer.getvalue())
            except IOError as file_error:
                logging.error(f"Error writing GIF file: {file_error}")
                return jsonify({"error": "Failed to write GIF file"}), 500

            logging.info(f"gifcreateurl: GIF saved to {output_file_path}")

            # Create URL
            url, _ = urlgenerator(output_file_path, "memeamigo", "memeamigo", "image/gif")
            logging.info(f"gifcreateurl: Generated URL: {url}")
            delete_path(output_file_path)
            logging.info(f"Total API Call Time: {round(time.time()-start,2)}")
            return jsonify({
                "status": "success",
                "message": "GIF meme created successfully",
                "url": url
            }), 200

    except Image.UnidentifiedImageError:
        logging.error("Could not identify image")
        return jsonify({"error": "Invalid image file"}), 400
    except Exception as e:
        logging.error(f"gifcreateurl error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Search GIFs API endpoint
@app.route("/search", methods=['POST'])
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
@app.route("/nip94", methods=['POST'])
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

# Capture GIF Metadata to Pass to Nostr.Build, then Complete NIP94 endpoint
@app.route("/mememetadata", methods=['POST'])
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
@app.route("/gifmetadata", methods=['POST'])
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
@app.route("/uploading", methods=['POST'])
def uploading():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
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
@app.route("/creating", methods=['POST'])
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

# Create New Gif with AI
@app.route("/memegifs", methods=['POST'])
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
@app.route('/status', methods=['POST'])
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

# Payments route
@app.route("/invoice", methods=['GET'])
def invoice():
    try:
        costPerGif = 0.50
        invoice, _, invid = lightning_quote(costPerGif, "GIFBuddy Create")
        logging.info(f'Posting lightning invoice ID: {invid}')
        return jsonify({
            "quote": invoice,
            "amount": costPerGif,
            "id": invid
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Payments status
@app.route("/invoicestatus", methods=['GET'])
def invoicestatus():
    invid = request.args.get('id')
    if not invid:
        return jsonify({"error": "Missing invoice ID"}), 400
    
    try:
        status = invoice_status(invid)
        logging.info(f"Invoice Status: {status} {invid}")
        return jsonify({"status": status})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Stripe API endpoints
import stripe

stripe.api_version = '2020-08-27'
stripe.api_key = os.environ["stripelivekey"]
# stripe.api_key = os.environ["stripe_test_key"]

@app.route('/config', methods=['GET'])
def get_config():
    return jsonify({'publishableKey': os.environ['stripepublishablekey']})
    # return jsonify({'publishableKey': os.environ["stripe_publish_test_key"]})

@app.route('/create-payment-intent', methods=['POST'])
def create_payment_intent():
    payment_intent = stripe.PaymentIntent.create(
        amount=69,
        currency="USD",
        automatic_payment_methods={'enabled': True}
    )
    return jsonify(clientSecret=payment_intent.client_secret)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)