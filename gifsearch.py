import os
import json
import requests

# Set the apikey and limit
apikey = os.environ.get('googlecloudvision')  # click to set to your apikey
ckey = "app"  # set the client_key for the integration and use the same value for all API calls

def fetch_gifs(search_term,limit, pos=None):
    # Construct the URL with pos if provided
    url = f"https://tenor.googleapis.com/v2/search?q={search_term}&key={apikey}&client_key={ckey}&limit={limit}"
    if pos != None:
        url += f"&pos={pos}"
    
    # API request to Tenor
    r = requests.get(url)
    
    # Load API result
    result = json.loads(r.content)

    return result

if __name__ == "__main__":
    output = fetch_gifs('uh oh',1)
    print(output)
    # CAEQ1ezgotOiiAMaHgoKAD-_wHv0zFJjcRIQMBvy4oDXvi_ZiMP0AAAAADAB
    gif = output['results'][0]['media_formats']['gif']
    description = output['results'][0]['content_description']
    tags = output['results'][0]['tags']
    thumb = output['results'][0]['media_formats']['tinygif']['url']
    print(gif)
    print(description)
    print(tags)
    print(thumb)
    # gifUrl = gif['url']
    # gifSize = gif['size']
    # gifDims = gif['dims']
    # thumb = output['results'][0]['media_formats']['nanogifpreview']['url']
    # preview = output['results'][0]['media_formats']['tinygifpreview']['url']
    # alt = os.path.basename(gifUrl)[0:-4]
    # print(gifUrl, gifSize, gifDims, thumb, preview, alt)
