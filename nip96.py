import requests

def nostrbuildupload(event_base64, file_url, caption, alt):
    # The file is not downloaded, instead, the URL is sent directly to the server
    files = {
        "file": (file_url, requests.get(file_url, stream=True).raw, "image/gif"),
    }

    # Prepare headers with NIP-98 Authorization
    headers = {
        "Authorization": f"Nostr {event_base64}"
    }

    data = {
        "caption": caption,
        "expiration": "",  # "" for no expiration
        "alt": alt,
        "content_type": "image/gif",
        "no_transform": "false"
    }

    # Make the POST request without the Authorization header
    api_url = "https://nostr.build/api/v2/nip96/upload"
    response = requests.post(api_url, headers=headers, files=files, data=data)

    # Check the response
    if response.status_code == 200:
        print("File uploaded successfully.")
        response = response.json()
    else:
        print("Failed to upload file.")
        print("Status code:", response.status_code)
        print("Response:", response.text)
        response = response.text
        
    return response
