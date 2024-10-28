from flask import Flask, request, render_template, jsonify, send_file
import os, time, asyncio
from gifsearch import fetch_gifs
from getevent import getevent
from nip98 import decentralizeGifUpload, decentralizeGifUrl
import concurrent.futures
import mimetypes

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get('flasksecret')

current_dir = os.path.dirname(os.path.abspath(__file__))

# Set up a folder for storing uploaded files
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

global counter

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
    print(f'Search term: {search}, Position: {pos}')  # Debugging
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
    
    # Start the task in a separate process
    with concurrent.futures.ProcessPoolExecutor() as executor:
        executor.submit(decentralizeGifUrl, gifUrl, summary, alt, image, preview)
    print('API Process Time:', round(time.time()-start, 0))
    # Return a response indicating that the request was accepted
    return jsonify({"message": "Task is being processed."}), 202

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
        print("Alt:", alt)

        mime_type, _ = mimetypes.guess_type(filepath)

        # Process the file and additional fields as needed
        url = decentralizeGifUpload(filepath, caption, alt, mime_type)
        return jsonify({'message': 'File uploaded successfully!', 'url': url,'filename': file.filename, 'caption': caption, 'alt': alt}), 200

    return jsonify({'error': 'Failed to upload file'}), 500

@app.route("/counter", methods=['GET'])
def get_count():
    # # DVM public key
    pubkey = 'npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'
    eventlist = asyncio.run(getevent(kind=1063, author=pubkey))

    counter = {"count": str(len(eventlist))}

    return jsonify(counter)

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