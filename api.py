from flask import Flask, request, render_template, send_from_directory, jsonify
import os
from gifsearch import fetch_gifs

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get('flasksecret')

current_dir = os.path.dirname(os.path.abspath(__file__))

# Serve the HTML homepage as the index path
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/search", methods=['POST'])
def search():
    # Capture user data
    search = request.args.get('q')
    print('Search term:', search) # debugging
    output = fetch_gifs(search,limit=30)
    gifs = {}

    for result in output['results']:
        gifURL = result['media_formats']['gif']['url']
        alt = os.path.basename(gifURL)[0:-4]
        gifs[alt] = gifURL

    return jsonify(gifs)

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