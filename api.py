from flask import Flask, request, render_template, jsonify, send_file
import os, time, threading, sys, logging, subprocess
from gifsearch import fetch_gifs
from getevent import gifcounter
from nip98 import decentralizeGifUpload
import mimetypes

# Configure logging to stdout so Heroku can capture it
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO
)

app = Flask(__name__)
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

def update_counter():
    """Fetches the count periodically and updates the cache."""
    global cached_counter
    while True:
        try:
            eventlist = gifcounter() # Passes count and list
            cached_counter["count"] = str(eventlist[0])
            logging.info(f"Counter updated: {cached_counter["count"]}")
        except Exception as e:
            logging.info(f"Error updating counter: {e}")
        
        time.sleep(120)  # Wait for 2 minutes before updating again

# Start the background task when the app starts
threading.Thread(target=update_counter, daemon=True).start()

# Homepage
@app.route("/")
def index():
    return render_template("index.html")

# Development environment
@app.route("/dev")
def dev():
    return render_template("dev.html")

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

# Nostr.Build Upload, NIP94 endpoint
@app.route("/gifmetadata", methods=['POST'])
def gif_metadata():
    start = time.time()
    # Get the JSON data from the request body
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
        # Define and start the process
        subprocess.Popen(["python", "decentralizeGifUrl.py", gifUrl, summary, alt, image, preview])
        logging.info(f'API Process Time: {round(time.time()-start, 0)}')
        # Return a response indicating that the request was accepted
        return jsonify({"message": "Task is being processed."}), 202
    except Exception as e:
        logging.info(f'API Process Time: {round(time.time()-start, 0)}')
        # Return an error if process fails to start
        return jsonify({"error": str(e)}), 500

# Nostr.Build Upload, NIP94 endpoint
@app.route("/upload", methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        # Save the file
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)

        # Get additional fields
        caption = request.form.get('caption', '')
        alt = file.filename[0:-4]
        logging.info(f"Alt: {alt}")

        mime_type, _ = mimetypes.guess_type(filepath)

        try:
            # Process the file and additional fields as needed
            url = decentralizeGifUpload(filepath, caption, alt, mime_type)
            return jsonify({'message': 'File uploaded successfully!', 'url': url,'filename': file.filename, 'caption': caption, 'alt': alt}), 200
        except Exception as e:
            # Return an error if process fails to start
            return jsonify({"error": str(e)}), 500

    return jsonify({'error': 'Failed to upload file'}), 500

@app.route("/counter", methods=['GET'])
def get_count():
    """Returns the cached counter value."""
    return jsonify(cached_counter)

@app.route('/manifest.json')
def serve_manifest():
    return send_file('manifest.json', mimetype='application/manifest+json')

@app.route('/sw.js')
def serve_sw():
    return send_file('templates/sw.js', mimetype='application/javascript')

# NOTE: Reserved for future use
@app.route("/privacypolicy")
def policy():
    return render_template("privacypolicy.html")

@app.route("/termsofservice")
def terms():
    return render_template("termsofservice.html")

if __name__ == "__main__":
    app.run(debug=True)