import requests, logging

def filenostrbuildupload(event_base64, filepath, caption, alt):
    # Open the file in binary mode
    with open(filepath, 'rb') as file:
        files = {
            "file": (filepath, file, "image/gif"),
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
            logging.info("File uploaded successfully.")
            response = response.json()
        else:
            logging.info("Failed to upload file.")
            logging.info("Status code:", response.status_code)
            logging.info("Response:", response.text)
            response = response.text

        return response

def urlnostrbuildupload(event_base64, file_url, caption, alt):
    # Prepare headers with NIP-98 Authorization
    headers = {
        "Authorization": f"Nostr {event_base64}"
    }

    data = {
        "url": file_url,
        "caption": caption,
        "expiration": "",  # "" for no expiration
        "alt": alt,
        "content_type": "image/gif",
        "no_transform": "false"
    }

    # Make the POST request without the Authorization header
    api_url = "https://nostr.build/api/v2/nip96/upload"
    response = requests.post(api_url, headers=headers, data=data)

    # Check the response
    if response.status_code == 200:
        logging.info("File uploaded successfully.")
        response = response.json()
    else:
        logging.info("Failed to upload file.")
        logging.info("Status code:", response.status_code)
        logging.info("Response:", response.text)
        response = response.text
        
    return response