import http.client
import json, os
from urllib.parse import urlencode

IMGFLIP_API_HOST = "api.imgflip.com"
IMGFLIP_USERNAME = os.environ["imgflip_username"]
IMGFLIP_PASSWORD = os.environ["imgflip_password"]

def call_imgflip_api(endpoint, method="GET", params=None):
    """
    Function to call the Imgflip API and handle GET or POST requests.
    
    :param endpoint: The Imgflip API endpoint (e.g., "/get_memes" or "/caption_image")
    :param method: HTTP method to use ("GET" or "POST")
    :param params: Dictionary of parameters for the API (for POST requests)
    
    :return: JSON response from the Imgflip API
    """
    conn = http.client.HTTPSConnection(IMGFLIP_API_HOST)

    # Prepare the parameters and headers for POST request if any
    if method == "POST" and params:
        params['username'] = IMGFLIP_USERNAME
        params['password'] = IMGFLIP_PASSWORD
        body = urlencode(params)
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    else:
        body = None
        headers = {}

    # Send the HTTP request
    conn.request(method, endpoint, body=body, headers=headers)

    # Get the response
    response = conn.getresponse()
    data = response.read().decode("utf-8")
    
    # Close the connection
    conn.close()

    # Parse the response and return JSON data
    try:
        response_data = json.loads(data)
        return response_data
    except json.JSONDecodeError:
        return {"success": False, "error_message": "Failed to decode JSON response"}
    
# import requests

# def call_imgflip_api(endpoint, method, params):
#     """ Helper function to make API requests to Imgflip """
#     base_url = "https://api.imgflip.com"
#     url = base_url + endpoint

#     try:
#         if method == "POST":
#             params['username'] = IMGFLIP_USERNAME
#             params['password'] = IMGFLIP_PASSWORD
#             response = requests.post(url, data=params)
#         elif method == "GET":
#             response = requests.get(url, params=params)
#         else:
#             raise ValueError("Unsupported HTTP method")

#         # Parse the response as JSON and return it
#         response_json = response.json()
#         return response_json
#     except requests.exceptions.RequestException as e:
#         print(f"Error during API request: {e}")
#         return {"success": False, "error_message": str(e)}
#     except ValueError as e:
#         print(f"Error parsing response JSON: {e}")
#         return {"success": False, "error_message": "Failed to parse JSON response"}


# Example function calls
def get_memes():
    """ Function to call /get_memes endpoint """
    response = call_imgflip_api("/get_memes", "GET")
    if response.get("success"):
        return response.get("data", {}).get("memes", [])
    else:
        return {"success": False, "error_message": "Failed to fetch memes"}

def caption_image(template_id, text0, text1, font='impact', max_font_size=50, no_watermark=True, boxes=None):
    """ Function to call /caption_image endpoint """
    
    # Prepare the parameters for the POST request
    params = {
        "template_id": template_id,
        "text0": text0 if not boxes else "",  # Only use text0 if boxes are not specified
        "text1": text1 if not boxes else "",  # Only use text1 if boxes are not specified
        "font": font,
        "max_font_size": max_font_size,
        "no_watermark": int(no_watermark)
    }

    # If boxes are provided, add them to the params
    if boxes:
        params["boxes"] = boxes  # Directly send the boxes list (not JSON-encoded)

    # Call the Imgflip API
    response = call_imgflip_api("/caption_image", "POST", params)
    return response    

def search_memes(query, include_nsfw=False):
    """ Function to search meme templates from Imgflip API using call_imgflip_api """
    
    # Define the API endpoint for searching memes
    endpoint = "/search_memes"
    
    # Prepare the parameters for the POST request
    params = {
        "query": query,
        "include_nsfw": 1 if include_nsfw else 0
    }

    # Call the Imgflip API
    search_response = call_imgflip_api(endpoint, method="POST", params=params)
    
    # Check if the response was successful
    if search_response.get("success"):
        memes = search_response.get("data", {}).get("memes", [])
        return {"success": True, "memes": memes}
    else:
        error_message = search_response.get("error_message", "Unknown error")
        return {"success": False, "error_message": error_message}

# Example usage:
if __name__ == "__main__":
    # Get a list of memes
    memes = get_memes()
    print(memes)
    # if memes:
    #     print("Memes fetched successfully:")
    #     for meme in memes:
    #         print(f"{meme['name']} - {meme['url']}")
    # else:
    #     print("Error fetching memes.")

    # # Caption a meme
    # caption_response = caption_image("61579", "One does not simply", "Build an empire")
    # print(caption_response)

    # Search memes
    # query = "dog"  # Example search query
    # include_nsfw = False  # Don't include NSFW content

    # search_response = search_memes(query, include_nsfw)
    # # print(search_response)
    # if search_response.get("success"):
    #     pass
    #     # print("Memes found:")
    #     # for meme in search_response["memes"]:
    #     #     print(f"ID: {meme['id']}, Name: {meme['name']}, Captions: {meme['captions']}")
    # else:
    #     print(f"Error searching memes: {search_response.get('error_message')}")
    # memes = search_response['memes']
    # # Filter the memes to include only those with a box_count of 2 or less
    # filtered_memes = [meme for meme in memes if meme['box_count'] <= 2]
    # print(len(filtered_memes))
    # print(len(memes))
    # print(filtered_memes)

    # MEME ID
    # 299167033
    # response = caption_image(299167033, "text0", "text1", text2='text2', text3='text3', font='impact', max_font_size=50, no_watermark=False, boxes=None)

    # Convert the string to a list of dictionaries
