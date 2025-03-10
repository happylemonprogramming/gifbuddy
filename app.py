# Python libraries
from flask import Flask, request, render_template, jsonify, send_file, send_from_directory, url_for
from flask_cors import CORS
import os, time, threading, sys, logging, subprocess, asyncio, io, requests, mimetypes, uuid
from PIL import Image
from pyzbar.pyzbar import decode
from urllib.parse import unquote

# API Reference
from gifsearch import fetch_gifs, fetch_stickers
from lightningpay import lightning_quote, invoice_status
from imgflip import search_memes, caption_image, get_memes
from creategif import lumatexttovideo, getvideo, gifit, resize_gif_to_limit

# Custom Programs
# from nostrgifsearch import get_gifs_from_database, update_database
from rebroadcast import store_messages, search_messages
from nostrgifsearch import get_metadata, remove_duplicates_by_hash
from decentralizeGifUpload import delete_path, decentralizeGifUpload
from nip98 import urlgenerator, fallbackurlgenerator
from meme import create_meme_from_media
from nostrAddressDatabase import get_from_dynamodb
from lsbSteganography import lsbdecode
from getevent import getevent, PublicKey, filter_latest_events, extract_titles_and_thumbs, extract_titles_and_gifs
from api import api_service
from memegifs import AnimatedImageProcessor, Path
# from searchAlgo import nostr_gifs

# Configure logging to stdout so Heroku can capture it
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO
)

# Flask setup
app = Flask(__name__)
CORS(app)  # Enables CORS for all routes
app.register_blueprint(api_service)
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

# Setting Up Virtual Environment
logging.info('Decentralizing Gif Upload')
if 'DYNO' in os.environ:
    virtualenv_python = 'python' #for Heroku
else:
    virtualenv_python = r"C:\Users\clayt\Documents\Programming\gifbuddy\buddy\Scripts\python.exe"


# Recurring function for NIP94 event counting
def update_counter():
    """Fetches the count periodically and updates the cache."""
    global cached_counter
    while True:
        # Get GIF data
        try:
            # Variant with LMDB database
            # asyncio.run(update_database("gifs"))
            # output = asyncio.run(get_gifs_from_database("gifs", "")) # Empty to return all
            
            # Variant with SQLITE database
            output = asyncio.run(get_metadata("", mime_type="image/gif"))
            store_messages("gif_events", output)
            cached_counter["count"] = str(len(output))
            logging.info(f"Gif Counter: {cached_counter["count"]}")
        except Exception as e:
            logging.info(f"Error updating counter: {e}")

        # Get Meme data
        try:
            # Variant with local database
            # asyncio.run(update_database("memes", "memes"))
            # output = asyncio.run(get_gifs_from_database("memes", "")) # Empty to return all
            
            # Variant with SQLITE database
            output = asyncio.run(get_metadata("", mime_type="image/png"))
            store_messages("meme_events", output)
            cached_memecounter["count"] = str(len(output))
            logging.info(f"Meme Counter: {cached_memecounter["count"]}")
        except Exception as e:
            logging.info(f"Error updating counter: {e}")

        # Get Upload data
        try:
            # Variant with SQLITE database
            output = asyncio.run(get_metadata("", mime_type="upload"))
            store_messages("upload_events", output)
        except Exception as e:
            logging.info(f"Error caching uploads: {e}")
        
        time.sleep(120)  # Wait for 2 minutes before updating again

# Start the background task when the app starts
threading.Thread(target=update_counter, daemon=True).start()

# Homepage
@app.route("/")
def index():
    host = request.host  # Get the host (e.g., gifbuddy.lol or memeamigo.lol)

    if 'gifbuddy.lol' in host:
        return render_template('gifsearch.html')
    elif 'memeamigo.lol' in host:
        return render_template('memesearch.html')
    else:
        return render_template('memesearch.html')

# Development environment
@app.route("/dev")
def dev():
    return render_template("development/dev.html")

# Development environment
@app.route("/decode")
def decode():
    return render_template("decode.html")

# Development environment
@app.route("/api")
def api():
    return render_template("api.html")

# Gif Search
@app.route("/gifsearch")
def gifsearch():
    return render_template("gifsearch.html")

# Nostr Search
@app.route("/nostr")
def nostr():
    return render_template("nostr.html")

# Collection Page
@app.route("/collection")
def collection():
    return render_template("collection.html")

# Favorties Page
@app.route("/favorites")
def favorites():
    return render_template("favorites.html")

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

@app.route("/pdf")
def imageToPDF():
    return render_template("imageToPDF.html")

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

@app.route('/stickers')
def stickers():
    try:
        search_term = unquote(request.args.get('q', ''))
        if not search_term:
            return jsonify({'error': 'Search term is required'}), 400

        if search_term.lower() == "spiral":
            event_id = "9daabaab1bc27c8b6c517823df72c8f9ed4308e47413ec2f9acd4ebfa75ff6f8"
            event = asyncio.run(getevent(id=event_id))
            print(event)
            tags = event[0]['tags']
            print(tags)
            stickers = []
            for tag in tags:
                if tag[0] == "emoji":
                    print(tag[1])
                    stickers.append({'url': tag[2], 'description': tag[1]})

            response = {
                'stickers': stickers,
                'next_pos': None
            }

        else:
            limit = int(request.args.get('limit', 100))
            pos = request.args.get('pos', None)

            result = fetch_stickers(search_term, limit, pos)

            stickers = []
            for item in result.get('results', []):
                media_formats = item.get('media_formats', {})
                url = None
                
                # Try to get webp_transparent format first, then fall back to other formats
                if 'webp_transparent' in media_formats:
                    url = media_formats['webp_transparent']['url']
                elif 'tinywebp_transparent' in media_formats:
                    url = media_formats['tinywebp_transparent']['url']
                elif 'gif_transparent' in media_formats:
                    url = media_formats['gif_transparent']['url']
                
                if url:
                    stickers.append({
                        'url': url,
                        'description': item.get('content_description', '')
                    })

            response = {
                'stickers': stickers,
                'next_pos': result.get('next', None)
            }

        return jsonify(response)

    except Exception as e:
        print(f"Error in sticker search: {str(e)}")
        return jsonify({'error': 'Failed to fetch stickers'}), 500

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
    try:
        transparent_image = request.files.get('transparent_image')
        gif_url = request.form.get('gif_url')

        if not transparent_image or not gif_url:
            return jsonify({"error": "Missing transparent image or media URL"}), 400

        processor = AnimatedImageProcessor()
        result = processor.process_animated_image(transparent_image, gif_url)

        if result.size_mb > 21:
            return jsonify({"error": "Unable to reduce file size below 21MB"}), 400

        return send_file(
            result.buffer,
            mimetype=f'image/{result.format}',
            as_attachment=False,
            download_name=f"memeamigo.{result.format}"
        )

    except ValueError as e:
        logging.info(f"error: {str(e)}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.error(f"memecreate error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/gifcreateurl', methods=['POST'])
def gif_create_url():
    try:
        transparent_image = request.files.get('transparent_image')
        gif_url = request.form.get('gif_url')

        if not transparent_image or not gif_url:
            return jsonify({"error": "Missing transparent image or media URL"}), 400

        processor = AnimatedImageProcessor()
        result = processor.process_animated_image(transparent_image, gif_url)

        if result.size_mb > 21:
            return jsonify({"error": "Unable to reduce file size below 21MB"}), 400

        # Save and generate URL
        unique_id = str(uuid.uuid4())
        output_path = Path("./creations") / unique_id / f"output_meme.{result.format}"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, "wb") as f:
            f.write(result.buffer.getvalue())

        url, _ = urlgenerator(str(output_path), "memeamigo", "memeamigo", f"image/{result.format}")
        delete_path(output_path)

        return jsonify({
            "status": "success",
            "message": "Animated meme created successfully",
            "url": url,
            "processing_time": result.processing_time,
            "frame_count": result.frame_count,
            "size_mb": result.size_mb
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.error(f"gifcreateurl error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Create Image Meme URL
@app.route('/urlgenerator', methods=['POST'])
def urlGenerator():
    try:
        # Get file from the request
        file = request.files.get('file')

        # Validate inputs
        if not file:
            return jsonify({"error": "Missing file"}), 400

        logging.info("Creating Folder Path for File")

        # Generate a unique folder name
        unique_id = str(uuid.uuid4())
        output_folder = os.path.join("./creations/", unique_id)
        
        # Create the folder
        os.makedirs(output_folder, exist_ok=True)
        output_path = f"{output_folder}/"
        output_file_path = os.path.join(output_path, file.filename)

        # Save the file
        with open(output_file_path, "wb") as f:
            f.write(file.read())

        # Detect MIME type
        mime_type, _ = mimetypes.guess_type(output_file_path)
        if not mime_type:
            mime_type = file.content_type or "application/octet-stream"  # Fallback

        logging.info(f"Detected MIME type: {mime_type}")

        # Create URL
        logging.info("Generating URL")
        url, _ = urlgenerator(output_file_path, "memeamigo", "memeamigo", mime_type)
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

# Search GIFs API endpoint
@app.route("/search", methods=['POST'])
def search():
    # Capture user data
    data = request.get_json()  # Get the JSON data from the request body
    search = data.get('q')  # Extract the search term
    pos = data.get('pos')
    logging.info(f'Search term: {search}, Position: {pos}')  # Debugging
    gifs = {}

    if search.lower() == "nostr":
        search = "ostrich"
        # event_id = "411590f2820c164c979a8e17b513b110f017dbbfe4fe66b4258cdaf9392f0d30"
        # eventlist = asyncio.run(getevent(id=event_id))
        # for tag in eventlist[0]['tags']:
        #     if tag[0] == 'imeta':
        #         # Parse the tag
        #         tag_dict = {entry.split()[0]: " ".join(entry.split()[1:]) for entry in tag[1:]}
                
        #         # Extract information
        #         gif_url = tag_dict.get('url', '')
        #         gif_size = int(tag_dict.get('size', 0))
        #         gif_dims = tuple(map(int, tag_dict.get('dim', '0,0').split(',')))
        #         thumb = tag_dict.get('thumb', '')
        #         preview = gif_url  # Assuming the GIF URL is used for preview
        #         alt = tag_dict.get('alt', '')
        #         image = tag_dict.get('image', '')
        #         summary = tag_dict.get('summary', '')
        #         shortcode = tag_dict.get('shortcode', '')

        #         # Use shortcode as basename
        #         basename = shortcode

        #         # Save to gifs dictionary
        #         gifs[basename] = {
        #             'gifUrl': gif_url,
        #             'gifSize': gif_size,
        #             'gifDims': gif_dims,
        #             'thumb': thumb,
        #             'preview': preview,
        #             'alt': alt,
        #             'image': image,
        #             'summary': summary
        #         }

        # # Include the next position token in the response
        # gifs['next'] = None

    # else:
    output = fetch_gifs(search,limit=30,pos=pos)

    for result in output['results']:
        gif = result['media_formats']['gif']
        gifURL = gif['url']
        gifSize = gif['size']
        gifDims = gif['dims']
        thumb = result['media_formats']['tinygif']['url'] # not always gif format
        preview = result['media_formats']['webp']['url']
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

    # output = asyncio.run(get_gifs_from_database("gifs", search))
    # output = asyncio.run(get_metadata(search, mime_type="image/gif"))
    gif_output = search_messages("gif_events", search)
    meme_output = search_messages("meme_events", search)
    upload_output = search_messages("upload_events", search)
    output = gif_output+meme_output+upload_output
    unique_output = remove_duplicates_by_hash(output)
    logging.info(f"Result Count for {search}: {str(len(output))}")

    # gifs = []
    
    # for event in unique_output:
    #     tags = event['tags']
    #     for tag in tags:
    #         if tag[0] == 'url':
    #             gif = tag[1]
    #             gifs.append(gif)
    
    # return jsonify({"gifs": gifs})

    nostr_gifs = []
    print(unique_output)

    # Parse results for gif urls
    for gif in unique_output:
        thumb = next((tag[1] for tag in gif['tags'] if tag[0] == 'thumb'), None)
        url = next((tag[1] for tag in gif['tags'] if tag[0] == 'url'), None)
        alt = next((tag[1] for tag in gif['tags'] if tag[0] == 'alt'), None)
        size = next((tag[1] for tag in gif['tags'] if tag[0] == 'size'), None)
        dims = next((tag[1] for tag in gif['tags'] if tag[0] == 'dim'), None)
        mime = next((tag[1] for tag in gif['tags'] if tag[0] == 'm'), None)
        hash = next((tag[1] for tag in gif['tags'] if tag[0] == 'x'), None)
        summary = next((tag[1] for tag in gif['tags'] if tag[0] == 'summary'), None)
        image = next((tag[1] for tag in gif['tags'] if tag[0] == 'image'), None)
        
        nostr_gifs.append({"thumb": thumb, "url": url, "alt": alt, "gifSize": size, "gifDims": dims, "mimetype": mime, "hash": hash, "summary": summary, "image": image})
    print(nostr_gifs)
    return nostr_gifs

# # Algo Search NIP94 endpoint
# # Slower than current method with similar results in most cases
# @app.route("/nip94", methods=['POST'])
# def nip94():
#     # Capture user data
#     data = request.get_json()  # Get the JSON data from the request body
#     search = data.get('q')  # Extract the search term
#     pos = data.get('pos')
#     logging.info(f'Search term: {search}, Position: {pos}')  # Debugging

    # nostr_gif_list = nostr_gifs(search, limit=30)

#     return jsonify(nostr_gif_list)

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
        subprocess.Popen([virtualenv_python, "decentralizeGifUrl.py", memeUrl, summary, alt])
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
        subprocess.Popen([virtualenv_python, "decentralizeGifUrl.py", gifUrl, summary, alt, image, preview])
        logging.info(f'Metadata Process Time: {round(time.time()-start, 1)}')
        return jsonify({"message": "Task is being processed."}), 202
    
    except Exception as e:
        logging.info(f'Metadata Failure Time: {round(time.time()-start, 1)}')
        return jsonify({"error": str(e)}), 500

@app.route("/buddyblastr", methods=['POST'])
def buddyblastr():
    data = request.get_json()
    event = data.get('event')

    endpoint = "https://blastr-nb.lemonknowsall.workers.dev/event"
    headers = {"Content-Type": "application/json"}
    payload = ['EVENT', event]

    response = requests.post(endpoint, headers=headers, json=payload)

    logging.info(f"Status Code: {response.status_code}")
    logging.info(f"Response JSON: {response.text}")
    return response.text, response.status_code

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
            subprocess.Popen([virtualenv_python, "decentralizeGifUpload.py", filepath, caption, alt])
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

@app.route("/decode", methods=["POST"])
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

        temp_url = url_for("deliver", filename="decoded_image.png", _external=True)

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

@app.route("/deliver/<filename>", methods=["GET"])
def deliver(filename):
    """
    Endpoint to serve an image file by its filename.
    """
    output_folder = os.path.join("./creations/", "") #os.getcwd()
    try:
        return send_from_directory(output_folder, filename, as_attachment=False)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    
@app.route("/favorite", methods=["GET"])
def favorite():
    pubkey = request.args.get('pubkey')
    pubkeyhex = PublicKey.from_bech32(pubkey).to_hex()
    eventlist = asyncio.run(getevent(kind=30169, author=pubkeyhex))
    latest_events = filter_latest_events(eventlist)
    # logging.info(eventlist[0])
    # output = extract_titles_and_thumbs(eventlist)
    # logging.info(output[0])
    try:
        # return jsonify(output)
        return jsonify(latest_events)
    except FileNotFoundError:
        return jsonify({"error": "something went wrong"}), 404
    
# _____________________________________________________________________________________
# Premium endpoints
from premium import removeBG, image_url_to_base64, image_generator, textToImageStability
from lightningpay import lightning_quote

# Payments route
@app.route("/invoice", methods=['GET'])
def invoice():
    try:
        # Get amount from request query parameters
        amount_sats = request.args.get('amount', type=int, default=200)  # Default to 200 sats if not provided
        amount_btc = amount_sats / 100000000  # Convert satoshis to BTC

        invoice, _, invid = lightning_quote(amount_btc, "Gif Buddy Premium AI")
        logging.info(f'Posting lightning invoice ID: {invid} for {amount_sats} sats')

        return jsonify({
            "quote": invoice,
            "amount": amount_btc,
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

# # Pay direct to Strike
# @app.route("/lninvoice", methods=["GET"])
# def get_ln_invoice():
#     amount = float(200/100000000) # 200 sats or about $0.20 at $100,000
#     description = "Gif Buddy Premium AI"
#     lninv, conv_rate, invid = lightning_quote(amount, description)
#     logging.info("Lightning Invoice:", lninv)
#     return lninv, invid

# AI Background Removal
@app.route("/removebg", methods=["POST"])  # Changed to POST method
def remove_background():
    data = request.get_json()
    image_url = data.get('image_url')

    # Validate inputs
    if not image_url:
        return jsonify({"error": "Missing image url"}), 400
    
    try:
        # If the image is already base64, no need to convert
        if image_url.startswith('data:image'):
            image_base64 = image_url
        else:
            image_base64 = image_url_to_base64(image_url)
            
        logging.info("Processing image for background removal")
        removedbg_image_base64 = removeBG(image_base64)
        logging.info("Background removal completed")

        return removedbg_image_base64
    
    except Exception as e:
        logging.error(f"Error removing background: {str(e)}")
        return jsonify({"error": "Something went wrong"}), 500

# AI Image Generator
@app.route("/image_generator", methods=["GET"])
def aiImageGenerator():
    prompt = request.args.get('prompt')

    # Validate inputs
    if not prompt:
        return jsonify({"error": "Missing prompt"}), 400
    
    try:            
        logging.info("Processing image generation")
        # image_url = image_generator(prompt) # Novita
        image_url = textToImageStability(prompt) # Stability
        logging.info("Image generation completed")

        return jsonify({"image_url": image_url})  # Return JSON response
    
    except Exception as e:
        logging.error(f"Error removing background: {str(e)}")
        return jsonify({"error": "Something went wrong"}), 500

# _____________________________________________________________________________________
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