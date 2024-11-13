import requests, os, subprocess, uuid, time, logging, mimetypes
from urllib.parse import urlparse
# from PIL import Image
from io import BytesIO

def downloadvideo(url, local_filename):
    try:
        start = time.time()
        # Send a GET request to the URL
        response = requests.get(url, stream=True)
        response.raise_for_status()  # Check for any errors in the response

        # Get the Content-Type header
        content_type = response.headers.get('Content-Type')

        # If local_filename doesn't have an extension, try to add one
        if '.' not in os.path.basename(local_filename):
            # First, try to get extension from the URL
            parsed_url = urlparse(url)
            url_path = parsed_url.path
            url_extension = os.path.splitext(url_path)[1]

            if url_extension:
                local_filename += url_extension
            else:
                # If URL doesn't have an extension, use Content-Type
                ext = mimetypes.guess_extension(content_type)
                if ext:
                    local_filename += ext
                else:
                    # If we can't guess the extension, use a default like .bin
                    local_filename += '.bin'

        # Open a local file for writing in binary mode
        with open(local_filename, 'wb') as local_file:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:  # Filter out keep-alive new chunks
                    local_file.write(chunk)

        end = time.time()
        logging.info(f"Download completed in {end - start:.2f} seconds")
        logging.info(f"File saved as: {local_filename}")
        return local_filename

    except requests.RequestException as e:
        logging.info(f"An error occurred while downloading the file: {e}")
        return None

# def process_image(url, target_sizes=((1024, 576), (576, 1024), (768, 768))):
#     """Process the image from the URL and return the file path of the processed image."""
#     # Define file paths
#     original = 'original.png'

#     # Fetch the image
#     response = requests.get(url)
#     if response.status_code != 200:
#         return False, None

#     # Decode and save original image as JPEG always
#     img = Image.open(BytesIO(response.content))
#     img.save(original, format='PNG')
#     print(f"Image saved as PNG")
    
#     # Resize if necessary
#     img = Image.open(original)

#     # Determine the aspect ratio of the original image
#     original_aspect_ratio = img.width / img.height
    
#     # Find the target size with the closest matching aspect ratio
#     target_size = min(target_sizes, key=lambda size: abs((size[0] / size[1]) - original_aspect_ratio))
    
#     # Resize the image while maintaining aspect ratio
#     target_aspect_ratio = target_size[0] / target_size[1]
    
#     if original_aspect_ratio > target_aspect_ratio:
#         # Scale based on width, maintain aspect ratio
#         new_width = target_size[0]
#         new_height = int(new_width / original_aspect_ratio)
#     else:
#         # Scale based on height, maintain aspect ratio
#         new_height = target_size[1]
#         new_width = int(new_height * original_aspect_ratio)
        
#     img = img.resize((new_width, new_height), Image.LANCZOS)
#     print(f"Image scaled to {new_width}x{new_height}")

#     # Crop to target dimensions if necessary
#     if new_width != target_size[0] or new_height != target_size[1]:
#         left = (new_width - target_size[0]) / 2
#         top = (new_height - target_size[1]) / 2
#         right = left + target_size[0]
#         bottom = top + target_size[1]
#         img = img.crop((left, top, right, bottom))
#         print(f"Image cropped to {target_size[0]}x{target_size[1]}")

#     # Save the final image
#     img.save(original, format='PNG')
#     print(f"Final image saved with dimensions: {img.width}x{img.height}")

#     # # Reduce file size if necessary
#     # file_size = os.path.getsize(original)
#     # target_size = 30000000 # 30 MB
#     # if file_size > target_size:
#     #     quality = 95
#     #     while file_size > target_size and quality > 5:
#     #         quality -= 5
#     #         img.save(original, format='PNG', quality=quality)
#     #         file_size = os.path.getsize(original)

#     #     if file_size <= target_size:
#     #         print(f"Image reduced to {file_size} bytes")
#     #     else:
#     #         print(f"Unable to reduce file size below {file_size} bytes while maintaining acceptable quality")
    
#     return original

def lumatexttovideo(prompt, aspect_ratio='4:3', loop=False):
    url = "https://api.lumalabs.ai/dream-machine/v1/generations"
    headers = {
        "accept": "application/json",
        "authorization": f"Bearer {os.environ.get("lumaapikey")}",
        "content-type": "application/json"
    }
    data = {
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "loop": loop
    }

    response = requests.post(url, headers=headers, json=data)
    output = response.json()
    return output

def lumaimagetovideo(prompt, start_frame, end_frame, aspect_ratio='4:3', loop=False):
    url = "https://api.lumalabs.ai/dream-machine/v1/generations"
    headers = {
        "accept": "application/json",
        "authorization": f"Bearer {os.environ.get("lumaapikey")}",
        "content-type": "application/json"
    }
    data = {
        "prompt": prompt,
        "keyframes": {
            "frame0": {
                "type": "image",
                "url": start_frame # url only
            },
            "frame1": {
                "type": "image",
                "url": end_frame
            }
        },
        "loop": loop,
        "aspect_ratio": aspect_ratio
    }

    response = requests.post(url, headers=headers, json=data)

    print(response.json())  # To see the response in JSON format

def getvideo(id):
    url = f"https://api.lumalabs.ai/dream-machine/v1/generations/{id}"
    headers = {
        "accept": "application/json",
        "authorization": f"Bearer {os.environ.get("lumaapikey")}"
    }

    response = requests.get(url, headers=headers)
    output = response.json()
    print(output)
    return output  # To see the response in JSON format

def gifit(url, text):   
    # Generate a unique folder name
    unique_id = str(uuid.uuid4())
    output_folder = os.path.join("./creations/", unique_id) #os.getcwd()
    
    # Create the folder
    os.makedirs(output_folder, exist_ok=True)
    
    # File locations
    input_video = f"{output_folder}/original.mp4"
    output_gif=f"{output_folder}/output.gif"
    output_srt=f"{output_folder}/subtitles.srt"
    downloadvideo(url, input_video)

    # Create the .srt file with the subtitle text
    with open(output_srt, 'w') as file:
        file.write(f"1\n00:00:00,000 --> 00:04:38,000\n{text}\n\n")

    # Adjust the ffmpeg command
    ffmpeg_cmd = [
        "ffmpeg",
        "-i", input_video,
        "-vf", f"subtitles={output_srt}:force_style='FontSize=48'",  # Set font size
        "-pix_fmt", "rgb8",      # GIFs use RGB8 color space
        "-r", "10",              # Frame rate (adjust as needed)
        "-f", "gif",             # Output format
        output_gif
    ]

    # Run the command
    subprocess.run(ffmpeg_cmd)
    return output_gif

if __name__ == "__main__":
    import time
    prompt = "a flower made of crystal growing and eventually blooming brilliantly"
    caption = "Blooming"
    start=time.time()
    output = lumatexttovideo(prompt)
    print(output)
    id = output['id']
    state = output['state']
    while state != 'completed':
        video = getvideo(id)
        time.sleep(5)
        state = video['state']
        print(state)
    url = video['assets']['video']
    print('Video Time:', round(time.time()-start, 1))
    gif = gifit(url, caption) # this coulde be used to caption any .mp4 url
    print(gif)
    print('Total Time:', round(time.time()-start, 1))
# 9a52beb8-d458-4a82-be3d-3b56d4801087
# 39bfd2b2-7e6a-4622-8043-7b854b999a7a dinner is served
# 88b9f791-3ad0-4b87-b3f4-00bb411e21f5 dinner is served
# e2cf7cfc-2b3d-4a94-b079-62a30d748b7b dinner is served