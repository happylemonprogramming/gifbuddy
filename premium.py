import time
import requests
import base64
import tempfile
from PIL import Image
import io
import os
from typing import List, Tuple

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

def text_to_image(prompt):
    url = "https://api.novita.ai/v3/async/txt2img"
    api_key = os.environ["novitaapikey"]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "extra": {
            "response_image_type": "jpeg"
        },
        "request": {
            "prompt": prompt,
            "model_name": "sd_xl_base_1.0.safetensors",
            "negative_prompt": "nsfw, bottle, bad face",
            "width": 1024,
            "height": 1024,
            "image_num": 1,
            "steps": 20,
            "seed": -1,
            "clip_skip": 1,
            "sampler_name": "Euler a",
            "guidance_scale": 7.5
        }
    }

    response = requests.post(url, json=data, headers=headers)
    try:
        task_id = response.json()['task_id']
        return task_id
    except Exception as e:
        print(f"An error occurred: {e}")
        print(f"API output: {response.json()}")
        return response.json()

def poll_status(task_id):
    url = "https://api.novita.ai/v3/async/task-result"
    api_key = os.environ["novitaapikey"]

    params = {"task_id": task_id}
    headers = {
        "Authorization": f"Bearer {api_key}"
    }

    response = requests.get(url, params=params, headers=headers)

    return response.json()

def image_generator(prompt):
    # Create task
    task_id = text_to_image(prompt)

    # Start time
    start_time = time.time()
    timeout = 30  # seconds

    # Poll Status
    output = poll_status(task_id)

    while output['task']['status'] == "TASK_STATUS_PROCESSING" or output['task']['status'] == "TASK_STATUS_QUEUED":
        if time.time() - start_time > timeout:
            raise TimeoutError("Task did not complete within 30 seconds.")

        time.sleep(2)  # Wait for 2 seconds before polling again
        output = poll_status(task_id)
    
    image_url = output['images'][0]['image_url']

    return image_url

class GifUpscaler:
    def __init__(self, api_key: str):
        """
        Initialize the GIF Upscaler with your Stability API key.
        
        Args:
            api_key: Your Stability API key for the Fast Upscaler service
        """
        self.api_key = api_key
        # self.api_url = "https://api.stability.ai/v2beta/stable-image/upscale/conservative"
        # self.api_url = "https://api.stability.ai/v2beta/stable-image/upscale/creative"
        self.api_url = "https://api.stability.ai/v2beta/stable-image/upscale/fast"
    
    def extract_frames(self, gif_path: str) -> Tuple[List[Image.Image], List[int], int]:
        """
        Extract frames from a GIF file along with duration information.
        
        Args:
            gif_path: Path to the input GIF file or URL
            
        Returns:
            Tuple containing:
            - List of PIL Image frames
            - List of frame durations in milliseconds
            - Number of loops (0 for infinite)
        """
        # If gif_path is a URL, download it first
        if gif_path.startswith(('http://', 'https://')):
            response = requests.get(gif_path)
            response.raise_for_status()
            gif_data = io.BytesIO(response.content)
            gif = Image.open(gif_data)
        else:
            gif = Image.open(gif_path)
        
        # Check if it's actually a GIF
        if gif.format != 'GIF':
            raise ValueError("The provided file is not a GIF image")
        
        # Get loop information (0 means infinite looping)
        loop_info = 0
        if 'loop' in gif.info:
            loop_info = gif.info['loop']
        
        frames = []
        durations = []
        
        try:
            # Save all frames and their durations
            frame_count = 0
            while True:
                gif.seek(frame_count)
                frames.append(gif.copy())
                
                # Get duration for this frame in milliseconds
                duration = gif.info.get('duration', 100)  # Default to 100ms if not specified
                durations.append(duration)
                
                frame_count += 1
                
        except EOFError:
            # End of frames reached
            pass
            
        print(f"Extracted {len(frames)} frames from GIF")
        return frames, durations, loop_info
    
    def upscale_frame(self, frame: Image.Image, output_format: str = 'png') -> Image.Image:
        """
        Upscale a single frame using the Fast Upscaler API.
        
        Args:
            frame: PIL Image frame to upscale
            output_format: Format for the output image (png, jpeg, webp)
            
        Returns:
            Upscaled PIL Image
        """
        # Convert the frame to bytes
        img_byte_arr = io.BytesIO()
        frame.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # Prepare the request
        headers = {
            'authorization': f'Bearer {self.api_key}',
            'accept': 'application/json'
        }
        
        files = {
            'image': ('image.png', img_byte_arr, 'image/png'),
            'output_format': (None, output_format)
        }
        
        # Make the request
        response = requests.post(
            self.api_url,
            headers=headers,
            files=files
        )
        
        if response.status_code != 200:
            raise Exception(f"API request failed with status {response.status_code}: {response.text}")
        
        # Parse the response
        response_json = response.json()
        image_data = base64.b64decode(response_json.get('image'))
        
        # Convert back to PIL Image
        upscaled_frame = Image.open(io.BytesIO(image_data))
        return upscaled_frame
    
    # def upscale_gif(self, input_gif_path: str, output_gif_path: str, output_format: str = 'png') -> str:
    #     """
    #     Upscale an entire GIF by processing each frame separately and then recombining.
        
    #     Args:
    #         input_gif_path: Path or URL to the input GIF
    #         output_gif_path: Path where the upscaled GIF will be saved
    #         output_format: Format for intermediate frame processing
            
    #     Returns:
    #         Path to the saved upscaled GIF
    #     """
    #     print(f"Starting to upscale GIF: {input_gif_path}")
        
    #     # Extract frames and duration info
    #     frames, durations, loop_info = self.extract_frames(input_gif_path)
    #     total_frames = len(frames)
        
    #     # Create a temporary directory to store upscaled frames
    #     with tempfile.TemporaryDirectory() as temp_dir:
    #         upscaled_frames = []
            
    #         # Process each frame
    #         for i, frame in enumerate(frames):
    #             print(f"Upscaling frame {i+1}/{total_frames}")
    #             upscaled_frame = self.upscale_frame(frame, output_format)
    #             upscaled_frames.append(upscaled_frame)
            
    #         # Save the upscaled frames as a new GIF
    #         print("Creating upscaled GIF")
    #         upscaled_frames[0].save(
    #             output_gif_path,
    #             format='GIF',
    #             append_images=upscaled_frames[1:],
    #             save_all=True,
    #             duration=durations,
    #             loop=loop_info,
    #             optimize=False
    #         )
            
    #         print(f"Upscaled GIF saved to {output_gif_path}")
    #         return output_gif_path
        
    def save_as_animated_webp(self, frames, durations, output_path, loop=0):
        """
        Save frames as an animated WebP file.
        
        Args:
            frames: List of PIL Image frames
            durations: List of frame durations in milliseconds
            output_path: Path to save the animated WebP
            loop: Number of times to loop (0 for infinite)
        
        Returns:
            Path to the saved WebP file
        """
        # Ensure output path has .webp extension
        if not output_path.lower().endswith('.webp'):
            output_path = f"{os.path.splitext(output_path)[0]}.webp"
        
        # Convert durations to milliseconds if they aren't already
        durations_ms = [int(d) for d in durations]
        
        # Save as animated WebP
        frames[0].save(
            output_path,
            format='WEBP',
            append_images=frames[1:],
            save_all=True,
            duration=durations_ms,
            loop=loop,
            quality=90,  # Adjust quality between 0-100
            method=6,    # Compression method (0-6), higher is better but slower
            lossless=False  # Set to True for lossless compression (larger files)
        )
        
        print(f"Animated WebP saved to {output_path}")
        return output_path

    def upscale_gif(self, input_gif_path: str, output_path: str, 
                    output_format: str = 'webp', use_webp_animation: bool = True):
        """
        Upscale an entire GIF by processing each frame separately and then recombining.
        
        Args:
            input_gif_path: Path or URL to the input GIF
            output_path: Path where the upscaled animation will be saved
            output_format: Format for intermediate frame processing
            use_webp_animation: If True, save as animated WebP; if False, save as GIF
            
        Returns:
            Path to the saved upscaled animation
        """
        print(f"Starting to upscale animation: {input_gif_path}")
        
        # Extract frames and duration info
        frames, durations, loop_info = self.extract_frames(input_gif_path)
        total_frames = len(frames)
        
        # Create a temporary directory to store upscaled frames
        with tempfile.TemporaryDirectory() as temp_dir:
            upscaled_frames = []
            
            # Process each frame
            for i, frame in enumerate(frames):
                print(f"Upscaling frame {i+1}/{total_frames}")
                upscaled_frame = self.upscale_frame(frame, output_format)
                upscaled_frames.append(upscaled_frame)
            
            # Save the upscaled frames as a new animation
            print(f"Creating upscaled animation as {'WebP' if use_webp_animation else 'GIF'}")
            
            if use_webp_animation:
                return self.save_as_animated_webp(upscaled_frames, durations, output_path, loop_info)
            else:
                # Original GIF saving logic
                if not output_path.lower().endswith('.gif'):
                    output_path = f"{os.path.splitext(output_path)[0]}.gif"
                    
                upscaled_frames[0].save(
                    output_path,
                    format='GIF',
                    append_images=upscaled_frames[1:],
                    save_all=True,
                    duration=durations,
                    loop=loop_info,
                    optimize=False
                )
                
                print(f"Upscaled GIF saved to {output_path}")
                return output_path

# Example usage
def upscale_gif_example(inputGIF, outputGIF = "upscaled_output.gif"):
    api_key = os.environ["stabilityaiapikey"]
    upscaler = GifUpscaler(api_key)
    
    # from URL
    if "http" in inputGIF:
        upscaler.upscale_gif(inputGIF, outputGIF)
    

    # Local file
    else:
        upscaler.upscale_gif(inputGIF, outputGIF)
    

    # Print information about a GIF without upscaling
    frames, durations, loops = upscaler.extract_frames(inputGIF)
    print(f"GIF has {len(frames)} frames with durations: {durations} and loops: {loops}")

import requests
def textToImageStability(prompt):
    start = time.time()
    response = requests.post(
        f"https://api.stability.ai/v2beta/stable-image/generate/ultra",
        headers={
            "authorization": f"Bearer {os.environ["stabilityaiapikey"]}",
            # "accept": "application/json"
            "accept": "image/*"

        },
        files={"none": ''},
        data={
            "prompt": prompt,
            "output_format": "webp",
        },
    )

    if response.status_code == 200:
        print(f"Total Time: {round(float(time.time()-start),2)}")
        # with open("./aiImage.webp", 'wb') as file:
        #     file.write(response.content)
        base64_image = base64.b64encode(response.content).decode('utf-8')
        return base64_image
    else:
        raise Exception(str(response.json()))

if __name__ == "__main__":
    # Remove Background
    # image_url = "https://t3.ftcdn.net/jpg/04/54/61/60/360_F_454616053_mtdrL3fKzWOlQigtj9Rj25h6ZGeFgZOM.jpg"
    # base64_image = image_url_to_base64(image_url)
    # noBG_bas64 = removeBG(base64_image)
    # save_image(noBG_bas64)

    # Image Generator (Novita)
    # prompt = "puppy sleeping on a couch with a blanket and pillow, realistic, night time, zoom out"
    # output = image_generator(prompt)
    # print(output)

    # Image Generator (Stability)
    # prompt = "little boy holding an orange balloon"
    # output = textToImageStability(prompt)
    # print(output)

    # Upscale GIF
    inputGIF = "https://media.tenor.com/874HfkMppnIAAAAC/bruh.gif"
    import time
    start = time.time()
    upscale_gif_example(inputGIF, outputGIF = "upscaled_output.gif")
    end = time.time()
    print(round(end-start, 2))
    # api_key = os.environ["stabilityaiapikey"]
    # upscaler = GifUpscaler(api_key)
    # upscaler.upscale_gif(inputGIF, "upscaled", 'webp', True)
