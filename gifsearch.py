import os
import json
import requests

# set the apikey and limit
apikey = os.environ.get('googlecloudvision')  # click to set to your apikey
ckey = "app"  # set the client_key for the integration and use the same value for all API calls

def fetch_gifs(search_term,limit=10):
    # get the top 8 GIFs for the search term
    r = requests.get(
        "https://tenor.googleapis.com/v2/search?q=%s&key=%s&client_key=%s&limit=%s" % (search_term, apikey, ckey,  limit))

    if r.status_code == 200:
        # load the GIFs using the urls for the smaller GIF sizes
        result = json.loads(r.content)
    else:
        result = json.loads(r.content)
    return result

if __name__ == "__main__":
    output = fetch_gifs('excited',1)
    gif = output['results'][0]['media_formats']['gif']
    gifURL = gif['url']
    gifSize = gif['size']
    gifDims = gif['dims']
    thumb = output['results'][0]['media_formats']['nanogifpreview']['url']
    preview = output['results'][0]['media_formats']['tinygifpreview']['url']
    alt = os.path.basename(gifURL)[0:-4]
    print(gifURL, gifSize, gifDims, thumb, preview, alt)
