from flask import Flask, request, render_template, jsonify, send_file, send_from_directory
import os, time, threading, sys, logging, subprocess, asyncio
from gifsearch import fetch_gifs
from nostrgifsearch import get_gifs_from_database, remove_duplicates_by_hash
from nostrgifsearch import update_database, get_gifs_from_database
from nip98 import decentralizeGifUpload
from creategif import lumatexttovideo, getvideo, gifit
from lightningpay import lightning_quote, invoice_status
from meme import create_meme_from_media
import mimetypes, uuid

# Configure logging to stdout so Heroku can capture it
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO
)

# Flask setup
app = Flask(__name__)
# static_dir = str(os.path.abspath(os.path.join(__file__ , "..", "../static")))
# template_dir = str(os.path.abspath(os.path.join(__file__ , "..", "../templates")))
# app = Flask(__name__, static_folder=static_dir, static_url_path="", template_folder=template_dir)
app.config["SECRET_KEY"] = os.environ.get('flasksecret')
current_dir = os.path.dirname(os.path.abspath(__file__))

# Set up a folder for storing uploaded files
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Cache to store the counter value
cached_counter = {"count": "0"}

# DVM public key
pubkey = 'npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'

# Recurring function for NIP94 event counting
def update_counter():
    """Fetches the count periodically and updates the cache."""
    global cached_counter
    while True:
        try:
            # Variant with local database
            asyncio.run(update_database("gifs"))
            output = asyncio.run(get_gifs_from_database("gifs", "")) # Empty string to return all
            cached_counter["count"] = str(len(output))
            logging.info(f"Counter updated: {cached_counter["count"]}")
        except Exception as e:
            logging.info(f"Error updating counter: {e}")
        
        time.sleep(120)  # Wait for 2 minutes before updating again

# Start the background task when the app starts
threading.Thread(target=update_counter, daemon=True).start()

# Development environment
@app.route("/dev")
def dev():
    return render_template("dev.html")

# Homepage
@app.route("/")
def index():
    return render_template("dev.html")

# Homepage
@app.route("/nostr")
def nostr():
    return render_template("nostr.html")

# Upload Page
@app.route("/upload")
def upload():
    return render_template("upload.html")

# Create Page
@app.route("/create")
def create():
    return render_template("create.html")

# Creation Page
@app.route("/creation")
def creation():
    return render_template("creation.html")

# Meme Page
@app.route("/meme")
def meme():
    return render_template("meme.html")

# Search API endpoint
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
        alt = file.filename[0:-4]
        logging.info(f"Caption text: {caption}")
        logging.info(f"Alt text: {alt}")

        mime_type, _ = mimetypes.guess_type(filepath)

        try:
            url = decentralizeGifUpload(filepath, caption, alt, mime_type)
            return jsonify({'message': 'File uploaded successfully!', 'url': url,'filename': file.filename, 'caption': caption, 'alt': alt}), 200
        
        except Exception as e:
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
            print('Filepath:', filepath)
            print('Mimetype:', mime_type)
            url = decentralizeGifUpload(filepath, caption, caption, mime_type)
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

# GIF Counter API
@app.route("/counter", methods=['GET'])
def get_count():
    """Returns the cached counter value."""
    return jsonify(cached_counter)

@app.route('/manifest.json')
def serve_manifest():
    return send_file('manifest.json', mimetype='application/manifest+json')

# NOTE: Reserved for future use
@app.route("/privacypolicy")
def policy():
    return render_template("privacypolicy.html")

@app.route("/termsofservice")
def terms():
    return render_template("termsofservice.html")

# Payments
# Apple Pay Domain Association
@app.route('/.well-known/apple-developer-merchantid-domain-association')
def serve_apple_pay_file():
    return send_from_directory(current_dir, 'apple-developer-merchantid-domain-association')

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