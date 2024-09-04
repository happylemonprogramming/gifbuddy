from flask import Flask, request, render_template, send_from_directory, jsonify, send_file
import os
from gifsearch import fetch_gifs
from nip94 import gifmetadata
from getevent import getevent
from pynostr.key import PublicKey
from nip98 import fallbackurlgenerator, urlgenerator
import concurrent.futures

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get('flasksecret')

current_dir = os.path.dirname(os.path.abspath(__file__))

# Set up a folder for storing uploaded files
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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
        thumb = result['media_formats']['nanogifpreview']['url']
        preview = result['media_formats']['tinygif']['url']
        alt = os.path.basename(gifURL)[0:-4]

        gifs[alt] = {
            'gifUrl': gifURL,
            'gifSize': gifSize,
            'gifDims': gifDims,
            'thumb': thumb,
            'preview': preview
        }

        # Include the next position token in the response
        gifs['next'] = output.get('next', None)

    return jsonify(gifs)

# Nostr.Build Upload, NIP94 endpoint
@app.route("/gifmetadata", methods=['POST'])
def gif_metadata():
    # Get the JSON data from the request body
    data = request.get_json()
    gifUrl = data.get('gifUrl')
    alt = data.get('alt')
    searchTerm = data.get('searchTerm')

    # Start the task in a separate process
    with concurrent.futures.ProcessPoolExecutor() as executor:
        executor.submit(fallbackurlgenerator, gifUrl, searchTerm, alt)

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
        print("Alt:", file.filename)

        # Process the file and additional fields as needed
        url = urlgenerator(filepath, caption, alt)
        print("Nostr.Build Upload URL:", url)
        return jsonify({'message': 'File uploaded successfully!', 'url': url,'filename': file.filename, 'caption': caption, 'alt': alt}), 200

    return jsonify({'error': 'Failed to upload file'}), 500

# TODO: Figure out cool way to count Freedom Gifs
# @app.route("/counter", methods=['GET'])
# def get_count():
#     # # DVM public key
#     # pubkey = "npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p"
#     # pubhex = PublicKey.from_npub(pubkey).hex()
#     # eventlist = getevent(kinds=[1063], authors=[pubhex])

#     # counter = {"count": str(len(eventlist))}
#     global counter
#     response = {"count": str(counter)}

#     return jsonify(response)

@app.route('/manifest.json')
def serve_manifest():
    return send_file('manifest.json', mimetype='application/manifest+json')

@app.route('/sw.js')
def serve_sw():
    return send_file('sw.js', mimetype='application/javascript')

# NOTE: Reserved for future use
@app.route("/privacypolicy")
def policy():
    return render_template("privacypolicy.html")

@app.route("/termsofservice")
def terms():
    return render_template("termsofservice.html")

if __name__ == "__main__":
    app.run(debug=True)