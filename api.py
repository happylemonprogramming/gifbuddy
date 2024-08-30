from flask import Flask, request, render_template, send_from_directory, jsonify
import os
from gifsearch import fetch_gifs
from nip94 import gifmetadata
from getevent import getevent
from pynostr.key import PublicKey
from nip98 import fallbackurlgenerator

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get('flasksecret')

current_dir = os.path.dirname(os.path.abspath(__file__))

# Variable initialization
counter = 0

# Serve the HTML homepage as the index path
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/search", methods=['POST'])
def search():
    # Capture user data
    data = request.get_json()  # Get the JSON data from the request body
    search = data.get('q')  # Extract the search term
    print('Search term:', search) # debugging
    output = fetch_gifs(search,limit=30)
    gifs = {}

    for result in output['results']:
        gif = result['media_formats']['gif']
        gifURL = gif['url']
        gifSize = gif['size']
        gifDims = gif['dims']
        thumb = result['media_formats']['nanogifpreview']['url']
        preview = result['media_formats']['tinygifpreview']['url']
        alt = os.path.basename(gifURL)[0:-4]

        gifs[alt] = {
            'gifUrl': gifURL,
            'gifSize': gifSize,
            'gifDims': gifDims,
            'thumb': thumb,
            'preview': preview
        }

    return jsonify(gifs)

@app.route("/gifmetadata", methods=['POST'])
def gif_metadata():
    data = request.get_json()  # Get the JSON data from the request body

    gifUrl = data.get('gifUrl')
    # gifSize = data.get('gifSize')
    # gifDims = data.get('gifDims')
    # thumb = data.get('thumb')
    # preview = data.get('preview')
    alt = data.get('alt')
    searchTerm = data.get('searchTerm')

    # # Process the metadata as needed
    # print('GIF URL:', gifUrl)
    # print('GIF Size:', gifSize)
    # print('GIF Dimensions:', gifDims)
    # print('Thumbnail URL:', thumb)
    # print('Preview URL:', preview)
    # print('Alt Text:', alt)
    # print('Search Term:', searchTerm)

    # event_id = gifmetadata(gifUrl, gifSize, gifDims, thumb, preview, alt, searchTerm)
    url = fallbackurlgenerator(gifUrl, searchTerm, alt)
    global counter
    counter += 1

    return url

@app.route("/counter", methods=['GET'])
def counter():
    # # DVM public key
    # pubkey = "npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p"
    # pubhex = PublicKey.from_npub(pubkey).hex()
    # eventlist = getevent(kinds=[1063], authors=[pubhex])

    # counter = {"count": str(len(eventlist))}
    global counter
    counter = {"count": str(counter)}

    return jsonify(counter)

# NOTE: Reserved for future use
@app.route("/privacypolicy")
def policy():
    return render_template("privacypolicy.html")

@app.route("/termsofservice")
def terms():
    return render_template("termsofservice.html")

@app.route('/.well-known/apple-developer-merchantid-domain-association')
def serve_apple_pay_file():
    return send_from_directory(current_dir, 'apple-developer-merchantid-domain-association')

if __name__ == "__main__":
    app.run(debug=True)