# import requests, time, imageio
# from PIL import Image, ImageDraw, ImageFont
# from io import BytesIO

# def create_meme_from_gif(gif_url, user_text, output_path="output.gif"):
#     # Step 1: Download the GIF from the URL
#     response = requests.get(gif_url)
#     response.raise_for_status()
#     gif_data = BytesIO(response.content)

#     # Step 2: Read GIF frames
#     gif_reader = imageio.get_reader(gif_data, mode="I")
#     frames = []
#     duration = gif_reader.get_meta_data()["duration"]  # Frame duration in milliseconds

#     # Load a font (adjust the path and size as needed)
#     font = ImageFont.truetype("arial.ttf", size=30)

#     # Step 3: Process each frame
#     for frame in gif_reader:
#         # Convert frame to PIL Image
#         frame_image = Image.fromarray(frame)
#         frame_width, frame_height = frame_image.size

#         # Step 4: Calculate text wrapping and height
#         draw = ImageDraw.Draw(frame_image)
#         max_width = frame_width - 20  # Leave some padding on the sides
#         words = user_text.split()
#         lines = []
#         current_line = ""

#         for word in words:
#             # Check if adding the word exceeds the max width
#             test_line = f"{current_line} {word}".strip()
#             line_width = draw.textbbox((0, 0), test_line, font=font)[2]
#             if line_width <= max_width:
#                 current_line = test_line
#             else:
#                 lines.append(current_line)
#                 current_line = word
#         if current_line:  # Add the last line
#             lines.append(current_line)

#         # Calculate total text height with additional buffer and spacing
#         line_height = (font.getbbox("A")[3] - font.getbbox("A")[1]) + 5  # Add spacing between lines
#         total_text_height = line_height * len(lines) + 20  # Extra 20px for buffer below the text

#         # Step 5: Create new canvas to accommodate text box
#         new_height = frame_height + total_text_height
#         new_image = Image.new("RGB", (frame_width, new_height), "white")

#         # Paste the GIF frame below the white box
#         new_image.paste(frame_image, (0, total_text_height))

#         # Step 6: Draw text on the white box
#         draw = ImageDraw.Draw(new_image)
#         for i, line in enumerate(lines):
#             y_position = 10 + i * line_height  # Start 10px from top of the white box
#             for offset in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)]:  # Simulate bold
#                 draw.text(
#                     ((frame_width - draw.textbbox((0, 0), line, font=font)[2]) / 2 + offset[0], y_position + offset[1]),
#                     line,
#                     fill="black",
#                     font=font
#                 )

#         # Add the modified frame to the list
#         frames.append(new_image)

#     # Step 7: Save the frames as a new GIF
#     frames[0].save(
#         output_path,
#         save_all=True,
#         append_images=frames[1:],
#         loop=0,
#         duration=duration
#     )

#     print(f"Meme GIF saved at {output_path}")
#     return output_path

from PIL import Image, ImageDraw, ImageFont
import imageio, time, requests, logging, mimetypes
from io import BytesIO

def create_meme_from_media(media_url, user_text, output_path):
    # Step 1: Download the media from the URL
    response = requests.get(media_url)
    response.raise_for_status()
    media_data = BytesIO(response.content)

    # Step 2: Determine if it's a GIF or an image
    guessed_type, _ = mimetypes.guess_type(media_url)

    if guessed_type == "image/gif":
        try:
            gif_reader = imageio.get_reader(media_data, mode="I")  # Try opening as a GIF
            is_gif = True
            frames = list(gif_reader)
            duration = gif_reader.get_meta_data().get("duration", 100)  # Default to 100ms if no duration is found
        except Exception:
            is_gif = False
    else:
        is_gif = False

    # Load the font
    font = ImageFont.truetype("arial.ttf", size=30)

    if is_gif:
        output_path = output_path+"output.gif"

        # Process each frame of the GIF
        processed_frames = []
        for frame in frames:
            frame_image = Image.fromarray(frame)
            processed_frames.append(add_caption_to_image(frame_image, user_text, font))
        
        # Save the processed frames as a GIF
        processed_frames[0].save(
            output_path,
            save_all=True,
            append_images=processed_frames[1:],
            loop=0,
            duration=duration
        )
        logging.info(f"Meme GIF saved at {output_path}")
    else:
        # Process as a static image
        static_image = Image.open(media_data)
        processed_image = add_caption_to_image(static_image, user_text, font)
        
        # Save the processed image
        output_path = output_path+"output.png"
        # output_path = output_path.replace(".gif", ".png")  # Ensure appropriate extension
        processed_image.save(output_path)
        logging.info(f"Meme image saved at {output_path}")
    
    return output_path

def add_caption_to_image(image, user_text, font):
    frame_width, frame_height = image.size

    # Create a new canvas to accommodate the text
    draw = ImageDraw.Draw(image)
    max_width = frame_width - 20  # Leave padding on the sides
    words = user_text.split()
    lines = []
    current_line = ""

    # Wrap text to fit within the frame
    for word in words:
        test_line = f"{current_line} {word}".strip()
        line_width = draw.textbbox((0, 0), test_line, font=font)[2]
        if line_width <= max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)

    # Calculate total text height
    line_height = (font.getbbox("A")[3] - font.getbbox("A")[1]) + 5
    total_text_height = line_height * len(lines) + 20

    # Create a new image to add the caption
    new_height = frame_height + total_text_height
    new_image = Image.new("RGB", (frame_width, new_height), "white")
    new_image.paste(image, (0, total_text_height))

    # Draw the text on the canvas
    draw = ImageDraw.Draw(new_image)
    for i, line in enumerate(lines):
        y_position = 10 + i * line_height
        for offset in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)]:  # Simulate bold
            draw.text(
                ((frame_width - draw.textbbox((0, 0), line, font=font)[2]) / 2 + offset[0], y_position + offset[1]),
                line,
                fill="black",
                font=font
            )
    return new_image

if __name__ == "__main__":
    # Example usage
    start = time.time()
    gif_url = "https://media.tenor.com/lckUW9rwPk0AAAAC/olliesblog-this-is-fine-this-is-fine.gif"
    user_text = "When the console is full of errors, but the code still runs"
    create_meme_from_media(gif_url, user_text)
    print(time.time()-start)