# watch the video for this project here: https://youtu.be/bZ88gnHzwz8

from PIL import Image

MAX_COLOR_VALUE = 256
MAX_BIT_VALUE = 8

def make_image(data, resolution):
    image = Image.new("RGB", resolution)
    image.putdata(data)

    return image

def remove_n_least_significant_bits(value, n):
    value = value >> n 
    return value << n

def get_n_least_significant_bits(value, n):
    value = value << MAX_BIT_VALUE - n
    value = value % MAX_COLOR_VALUE
    return value >> MAX_BIT_VALUE - n

def get_n_most_significant_bits(value, n):
    return value >> MAX_BIT_VALUE - n

def shit_n_bits_to_8(value, n):
    return value << MAX_BIT_VALUE - n

def lsbencode(image_to_hide, image_to_hide_in, n_bits):

    width, height = image_to_hide.size

    hide_image = image_to_hide.load()
    hide_in_image = image_to_hide_in.load()

    data = []

    for y in range(height):
        for x in range(width):

            # (107, 3, 10)
            # most sig bits
            r_hide, g_hide, b_hide = hide_image[x,y]

            r_hide = get_n_most_significant_bits(r_hide, n_bits)
            g_hide = get_n_most_significant_bits(g_hide, n_bits)
            b_hide = get_n_most_significant_bits(b_hide, n_bits)

            # remove lest n sig bits
            r_hide_in, g_hide_in, b_hide_in = hide_in_image[x,y]

            r_hide_in = remove_n_least_significant_bits(r_hide_in, n_bits)
            g_hide_in = remove_n_least_significant_bits(g_hide_in, n_bits)
            b_hide_in = remove_n_least_significant_bits(b_hide_in, n_bits)

            data.append((r_hide + r_hide_in, 
                         g_hide + g_hide_in,
                         b_hide + b_hide_in))

    return make_image(data, image_to_hide.size)

def lsbdecode(image_to_decode, n_bits):
    width, height = image_to_decode.size
    encoded_image = image_to_decode.load()

    data = []

    for y in range(height):
        for x in range(width):

            r_encoded, g_encoded, b_encoded = encoded_image[x,y]
            
            r_encoded = get_n_least_significant_bits(r_encoded, n_bits)
            g_encoded = get_n_least_significant_bits(g_encoded, n_bits)
            b_encoded = get_n_least_significant_bits(b_encoded, n_bits)

            r_encoded = shit_n_bits_to_8(r_encoded, n_bits)
            g_encoded = shit_n_bits_to_8(g_encoded, n_bits)
            b_encoded = shit_n_bits_to_8(b_encoded, n_bits)

            data.append((r_encoded, g_encoded, b_encoded))

    return make_image(data, image_to_decode.size)

def resize_and_pad(image_to_hide, target_size):
    """
    Resizes an image while maintaining aspect ratio and adds padding to match the target size.
    """
    # Resize while maintaining aspect ratio
    image_to_hide.thumbnail(target_size, Image.Resampling.LANCZOS)

    # Create a new image with the target size and a white background
    padded_image = Image.new("RGB", target_size, color=(255, 255, 255))

    # Paste the resized image in the center of the new image
    paste_x = (target_size[0] - image_to_hide.size[0]) // 2
    paste_y = (target_size[1] - image_to_hide.size[1]) // 2
    padded_image.paste(image_to_hide, (paste_x, paste_y))

    return padded_image

def text_to_binary(text):
    """Convert text to binary representation."""
    binary = bin(int.from_bytes(text.encode(), 'big'))[2:]
    # Pad the binary string to ensure it's a multiple of 8
    return binary.zfill((len(binary) + 7) // 8 * 8)

def binary_to_text(binary):
    """Convert binary representation back to text."""
    # Convert binary string to bytes
    n = int(binary, 2)
    return n.to_bytes((n.bit_length() + 7) // 8, 'big').decode()

def encode_text_in_image(image_path, text, n_bits=2):
    """
    Encode text into an image using LSB steganography.
    
    :param image_path: Path to the carrier image
    :param text: Text to hide
    :param n_bits: Number of least significant bits to use (default 2)
    :return: Modified image with encoded text
    """
    # Open the image
    image = Image.open(image_path).convert("RGB")
    pixels = image.load()
    width, height = image.size

    # Convert text to binary
    binary_text = text_to_binary(text)
    
    # Add length of text as prefix (to know how much to decode later)
    binary_text = f"{len(binary_text):032b}" + binary_text
    
    # Check if image is large enough to hide the text
    max_text_bits = (width * height * 3 * n_bits)
    if len(binary_text) > max_text_bits:
        raise ValueError(f"Text is too long to hide. Maximum {max_text_bits} bits can be hidden.")

    # Encode binary text into image
    binary_index = 0
    for y in range(height):
        for x in range(width):
            # Get current pixel
            r, g, b = pixels[x, y]
            
            # Modify color channels
            if binary_index < len(binary_text):
                # Red channel
                r_modified = (r & ~((1 << n_bits) - 1)) | int(binary_text[binary_index:binary_index+n_bits], 2)
                binary_index += n_bits
            
            if binary_index < len(binary_text):
                # Green channel
                g_modified = (g & ~((1 << n_bits) - 1)) | int(binary_text[binary_index:binary_index+n_bits], 2)
                binary_index += n_bits
            
            if binary_index < len(binary_text):
                # Blue channel
                b_modified = (b & ~((1 << n_bits) - 1)) | int(binary_text[binary_index:binary_index+n_bits], 2)
                binary_index += n_bits
            
            # Update pixel
            pixels[x, y] = (r_modified, g_modified, b_modified)
            
            # Stop if we've encoded entire text
            if binary_index >= len(binary_text):
                break
        
        if binary_index >= len(binary_text):
            break

    return image

def decode_text_from_image(image_path, n_bits=2):
    """
    Decode hidden text from an image.
    
    :param image_path: Path to the image with hidden text
    :param n_bits: Number of least significant bits used (default 2)
    :return: Decoded text
    """
    # Open the image
    image = Image.open(image_path).convert("RGB")
    pixels = image.load()
    width, height = image.size

    # Decode binary text
    binary_text = ""
    bit_count = 0
    text_length = None

    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            
            # Extract bits from each channel
            r_bits = r & ((1 << n_bits) - 1)
            binary_text += format(r_bits, f'0{n_bits}b')
            bit_count += n_bits
            
            if text_length is None and bit_count >= 32:
                # First 32 bits represent the total text length
                text_length = int(binary_text[:32], 2)
                binary_text = binary_text[32:]
                bit_count -= 32
            
            if text_length is not None and bit_count >= text_length:
                break
            
            g_bits = g & ((1 << n_bits) - 1)
            binary_text += format(g_bits, f'0{n_bits}b')
            bit_count += n_bits
            
            if text_length is not None and bit_count >= text_length:
                break
            
            b_bits = b & ((1 << n_bits) - 1)
            binary_text += format(b_bits, f'0{n_bits}b')
            bit_count += n_bits
            
            if text_length is not None and bit_count >= text_length:
                break
        
        if text_length is not None and bit_count >= text_length:
            break

    # Trim to exact text length and convert back to text
    return binary_to_text(binary_text[:text_length])

if __name__ == "__main__":
    # # Image on Image LSB
    # image_to_hide_path = "qrcode1.png"
    # image_to_hide_in_path = "nutmeme.jpg"
    # encoded_image_path = "encodedecash.png"
    # decoded_image_path = "decodedecash.png"
    # n_bits = 2

    # image_to_hide = Image.open(image_to_hide_path).convert("RGB")
    # image_to_hide_in = Image.open(image_to_hide_in_path).convert("RGB")

    # # Resize and pad the QR code to match the size of the carrier image
    # image_to_hide = resize_and_pad(image_to_hide, image_to_hide_in.size)

    # lsbencode(image_to_hide, image_to_hide_in, n_bits).save(encoded_image_path)

    # image_to_decode = Image.open(encoded_image_path)
    # lsbdecode(image_to_decode, n_bits).save(decoded_image_path)

    # Text on Image LSB
    # Encode text
    carrier_image = r"C:\Users\clayt\Downloads\moneymeme.png"
    secret_text = "This is a super secret message!"
    encoded_image = encode_text_in_image(carrier_image, secret_text)
    encoded_image.save("encoded_image.png")

    # Decode text
    decoded_text = decode_text_from_image("encoded_image.png")
    print(decoded_text)  # Prints: This is a secret message!