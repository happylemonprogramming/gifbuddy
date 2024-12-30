import requests, os, base64

def removeBG(base64_image):
    # API URL and Key
    url = "https://api.novita.ai/v3/remove-background"
    api_key = os.environ["novitaapikey"]

    # Headers
    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json"
    }

    # Payload
    payload = {
        "image_file": base64_image,
        "extra": {
            "response_image_type": "png"
        }
    }

    # Make the request
    response = requests.post(url, headers=headers, json=payload)

    # Check and print the response
    if response.status_code == 200:
        print("Novita AI status:", response.json()['task']['status'])
        return response.json()["image_file"]
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return f"Error: {response.status_code} - {response.text}"


# Function to download the image from a URL and convert it to base64
def image_url_to_base64(image_url):
    try:
        # Download the image
        response = requests.get(image_url)
        # Print the status code to help debug
        print(f"Status Code: {response.status_code}")
        # Ensure the request was successful
        if response.status_code == 200:
            # Convert the image content to base64
            return base64.b64encode(response.content).decode('utf-8')
        else:
            raise Exception(f"Failed to retrieve image from {image_url}. Status code: {response.status_code}")
    except Exception as e:
        print(f"An error occurred: {e}")
        raise

def save_image(encoded_image, filepath="noBG.png"):
    # Decode the base64 string
    image_bytes = base64.b64decode(encoded_image)

    # Save the decoded bytes as an image file
    with open(filepath, 'wb') as image_file:
        image_file.write(image_bytes)

    print("Image saved")


if __name__ == "__main__":
    image_url = "https://t3.ftcdn.net/jpg/04/54/61/60/360_F_454616053_mtdrL3fKzWOlQigtj9Rj25h6ZGeFgZOM.jpg"
    base64_image = image_url_to_base64(image_url)
    noBG_bas64 = removeBG(base64_image)
    save_image(noBG_bas64)