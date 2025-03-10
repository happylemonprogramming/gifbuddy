from PIL import Image, ImageDraw, ImageFont
import imageio, time, requests, logging, mimetypes, os
from io import BytesIO

# Helper function to scale font size based on image height
def get_scaled_font(fontpath, image_height, base_font_size=50, base_height=720):
    scale_factor = image_height / base_height
    font_size = int(base_font_size * scale_factor)
    return ImageFont.truetype(fontpath, size=max(font_size, 12))  # Ensure minimum font size

def create_meme_from_media(media_url, user_text, output_path):
    # Step 1: Download the media from the URL
    response = requests.get(media_url)
    response.raise_for_status()
    media_data = BytesIO(response.content)

    logging.info("Retrieved media URL content for meme")

    # Step 2: Determine if it's a GIF or an image
    guessed_type, _ = mimetypes.guess_type(media_url)

    if guessed_type == "image/gif":
        try:
            logging.info("Attempting to read gif with imageio")
            gif_reader = imageio.get_reader(media_data, mode="I")  # Try opening as a GIF
            is_gif = True
            frames = list(gif_reader)
            logging.info("Getting gif duration")
            duration = gif_reader.get_meta_data().get("duration", 100)  # Default to 100ms if no duration is found
        except Exception:
            is_gif = False
    else:
        is_gif = False

    # Load the font
    logging.info("Loading font")
    fontpath = os.path.join(".fonts", "impact.ttf")
    if not os.path.exists(fontpath):
        raise FileNotFoundError(f"Font file not found: {fontpath}")

    if is_gif:
        output_path = output_path + "output.gif"

        # Process each frame of the GIF
        logging.info("Processing each frame")
        processed_frames = []
        for frame in frames:
            frame_image = Image.fromarray(frame)
            font = get_scaled_font(fontpath, frame_image.height)
            processed_frames.append(add_caption_to_image(frame_image, user_text, font))
        
        # Save the processed frames as a GIF
        logging.info("Saving frame")
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
        logging.info("Adding caption to image")
        static_image = Image.open(media_data)
        font = get_scaled_font(fontpath, static_image.height)
        processed_image = add_caption_to_image(static_image, user_text, font)
        
        # Save the processed image
        output_path = output_path + "output.png"
        logging.info("Saving image")
        processed_image.save(output_path)
        logging.info(f"Meme image saved at {output_path}")
    
    return output_path

# def create_meme_from_media(media_url, user_text, output_path):
#     # Step 1: Download the media from the URL
#     response = requests.get(media_url)
#     response.raise_for_status()
#     media_data = BytesIO(response.content)

#     logging.info("Retrieved media url content for meme")

#     # Step 2: Determine if it's a GIF or an image
#     guessed_type, _ = mimetypes.guess_type(media_url)

#     if guessed_type == "image/gif":
#         try:
#             logging.info("Attempting to read gif with imageio")
#             gif_reader = imageio.get_reader(media_data, mode="I")  # Try opening as a GIF
#             is_gif = True
#             frames = list(gif_reader)
#             logging.info("Getting gif duration")
#             duration = gif_reader.get_meta_data().get("duration", 100)  # Default to 100ms if no duration is found
#         except Exception:
#             is_gif = False
#     else:
#         is_gif = False

#     # Load the font
#     logging.info("Loading font")
#     # fontpath = os.path.join(".fonts", "wqy-microhei.ttc")
#     fontpath = os.path.join(".fonts", "impact.ttf")
#     font = ImageFont.truetype(fontpath, size=30)

#     if is_gif:
#         output_path = output_path+"output.gif"

#         # Process each frame of the GIF
#         logging.info("Processing each frame")
#         processed_frames = []
#         for frame in frames:
#             frame_image = Image.fromarray(frame)
#             processed_frames.append(add_caption_to_image(frame_image, user_text, font))
        
#         # Save the processed frames as a GIF
#         logging.info("Saving frame")
#         processed_frames[0].save(
#             output_path,
#             save_all=True,
#             append_images=processed_frames[1:],
#             loop=0,
#             duration=duration
#         )
#         logging.info(f"Meme GIF saved at {output_path}")
#     else:
#         # Process as a static image
#         logging.info("Adding caption to image")
#         static_image = Image.open(media_data)
#         processed_image = add_caption_to_image(static_image, user_text, font)
        
#         # Save the processed image
#         output_path = output_path+"output.png"
#         # output_path = output_path.replace(".gif", ".png")  # Ensure appropriate extension
#         logging.info("Saving image")
#         processed_image.save(output_path)
#         logging.info(f"Meme image saved at {output_path}")
    
#     return output_path

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

    # # Draw the text on the canvas (BOLD)
    # draw = ImageDraw.Draw(new_image)
    # for i, line in enumerate(lines):
    #     y_position = 10 + i * line_height
    #     for offset in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)]:  # Simulate bold
    #         draw.text(
    #             ((frame_width - draw.textbbox((0, 0), line, font=font)[2]) / 2 + offset[0], y_position + offset[1]),
    #             line,
    #             fill="black",
    #             font=font
    #         )

    # Draw the text on the canvas
    draw = ImageDraw.Draw(new_image)
    for i, line in enumerate(lines):
        y_position = 10 + i * line_height
        # Draw the text only once
        draw.text(
            ((frame_width - draw.textbbox((0, 0), line, font=font)[2]) / 2, y_position),
            line,
            fill="black",
            font=font
        )

    return new_image

if __name__ == "__main__":
    # Example usage
    start = time.time()
    gif_url = "https://media.tenor.com/lckUW9rwPk0AAAAC/olliesblog-this-is-fine-this-is-fine.gif"
    user_text = "When the console is full of error's, but the code still runs"
    create_meme_from_media(gif_url, user_text, output_path='')
    print(time.time()-start)