import sys, logging, os, shutil, mimetypes
from nip98 import urlgenerator
from nip94 import nip94, capture_image

def delete_path(path):
    if os.path.exists(path):
        if os.path.isfile(path):
            os.remove(path)
            logging.info(f"File {path} has been removed.")
        elif os.path.isdir(path):
            shutil.rmtree(path)
            logging.info(f"Directory {path} and all its contents have been removed.")
    else:
        logging.info(f"{path} does not exist.")

def backgroundProcessing(filepath, tags, caption, alt, preview):
    image_path = capture_image(filepath)
    image_url = urlgenerator(image_path, caption, alt, "image/jpeg")
    event94 = nip94(tags, alt, caption, image_url, preview)
    delete_path(image_path)
    logging.info(f'NIP94 Event Published: {event94}')
    return event94

def decentralizeGifUpload(filepath, caption, alt, MIME):
    url, tags = urlgenerator(filepath, caption, alt, MIME)
    for tag in tags:
        if tag[0] == 'thumb':
            preview = tag[1]
    try:
        logging.info('Decentralizing Gif Upload')
        if 'DYNO' in os.environ:
            virtualenv_python = 'python' #for Heroku
        else:
            virtualenv_python = r"C:\Users\clayt\Documents\Programming\gifbuddy\buddy\Scripts\python.exe"
        
        # subprocess.Popen([virtualenv_python, "decentralizeGifUpload.py", filepath, str(tags), caption, alt, preview])
        if MIME == "image/gif" or MIME == "video/mp4":
            image_path = capture_image(filepath)
            image_url = urlgenerator(image_path, caption, alt, "image/jpeg")
        else:
            image_url = url
            preview = url

        event94 = nip94(tags, alt, caption, image_url, preview)
        delete_path(image_path)

        logging.info(f'NIP94 Event Published: {event94}')
        return event94

    except:
        logging.info('NIP94 Failed')

    return url

if __name__ == "__main__":
    # if len(sys.argv) > 1:
    #     filepath = sys.argv[1]
    #     tags = sys.argv[2]
    #     caption = sys.argv[3]
    #     alt = sys.argv[4]
    #     preview = sys.argv[5]

    #     backgroundProcessing(filepath, tags, caption, alt, preview)

    if len(sys.argv) > 1:
        filepath = sys.argv[1]
        caption = sys.argv[2]
        alt = sys.argv[3]

    mime_type, _ = mimetypes.guess_type(filepath)
    decentralizeGifUpload(filepath, caption, alt, mime_type)
    delete_path(filepath)
