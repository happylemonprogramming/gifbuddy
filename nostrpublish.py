# Libraries
import json, time, sys, os, uuid, re
from pynostr.event import Event
from pynostr.relay_manager import RelayManager
from pynostr.key import PrivateKey

# Environment variables
private_key = os.environ["nostrdvmprivatekey"]   

# Relays
relay_manager = RelayManager(timeout=6)
relay_manager.add_relay("wss://nostr-pub.wellorder.net")
relay_manager.add_relay("wss://relay.damus.io")

def nostrpost(private_key,kind,content,tags=[]):
    # Private key storage
    private_object = PrivateKey.from_nsec(private_key)
    private_hex = private_object.hex()
        
    # Path for summoning program in terminal
    if len(sys.argv) > 1:
        # Extract terminal arguments passed to program
        kind = int(sys.argv[1])
        tags = sys.argv[2]
        content = sys.argv[3]

        # Replace single quotes with double quotes to load JSON
        tags = tags.replace("'", "\"")

        # Convert the string to a list using JSON
        tags = json.loads(tags)

        # Construct event
        event = Event(
                    kind = kind, 
                    tags = tags,
                    content = content
                    )
        
    # Path for custom tags (list type)
    elif tags != [] and isinstance(tags, list):
        kind = int(kind)
        event = Event(
                    kind = kind, 
                    tags = tags,
                    content = content
                    )
        print(event)

    # Path for custom tags (str type)
    elif tags != [] and isinstance(tags, str):
        kind = int(kind)
        tags = str(tags)
        tags = tags.replace("'", "\"")
        try:
            # Convert tags string to a Python list
            tags = json.loads(tags)
        except json.JSONDecodeError as e:
            print(f"Error decoding tags: {e}")
            return "Error decoding tags"
        event = Event(
                    kind = kind, 
                    tags = tags,
                    content = content
                    )
        print(event)

    # Path for simple note
    else:
        event = Event(
                    kind = kind, 
                    content = content
                    )

    # Publish
    event.sign(private_hex)
    relay_manager.publish_event(event)
    relay_manager.run_sync()
    time.sleep(5) # allow the messages to send
    while relay_manager.message_pool.has_ok_notices():
        ok_msg = relay_manager.message_pool.get_ok_notice()
        # ok_msg = "OK(wss://nostr-pub.wellorder.net: 3047fa82122da6d38bd983b191e657a24224089d626323e6c448bd85ecdde4cd True )"

        # Define the regex pattern to capture the desired string of characters
        pattern = r'\b([a-fA-F0-9]{64})\b'

        # Use re.search to find the pattern in the output string
        match = re.search(pattern, str(ok_msg))

        if match:
            event_id = match.group(1)
            print(ok_msg)
        else:
            event_id = None
            print("Pattern not found in the output string.")

    while relay_manager.message_pool.has_events():
        event_msg = relay_manager.message_pool.get_event()
        print(event_msg.event.to_dict())
  
    return event_id

if __name__ == '__main__':
    kind = 1
    # content = {"name": "Swanbot", "picture": "https://primal.b-cdn.net/media-cache?s=o&a=1&u=https%3A%2F%2Fm.primal.net%2FIyOX.png", "about": "Data Vending Machine Generating Speech from Text with a Legendary Voice", "display_name": "Swanbot", "bot": True, "banner": "https://primal.b-cdn.net/media-cache?s=o&a=1&u=https%3A%2F%2Fm.primal.net%2FJAfV.jpg", "lud16":"palekangaroo1@primal.net"}
    # content = json.dumps(content)
    content = '4th try is the charm'
    event_id = nostrpost(private_key,kind,content)
    print('The event ID is:', event_id)
    # Private Key creation
    # private_key = PrivateKey()
    # private_object = PrivateKey.from_nsec(private_key)
    # private_hex = private_object.hex()
    # public_hex = private_object.public_key.hex()

    # Examples
        # Speech to Text Event
        # event = Event(
        #             kind = 65002, 
        #             tags = [
        #                         [ "i", "http://here-and-now.info/audio/rickastley_artists.mp3", "text" ],
        #                         [ "output", "text/plain" ]
        #                     ],
        #             content = ''
        #             )

        # Summarize Event
        # event = Event(
        #               kind = 65003, 
        #               tags = [['i', 'The story of my life is that I try and I fail until I eventually succeed.', 'text']],
        #               content = ''
        #               )

        # Image Event
        # ['EVENT', 
        #  {'id': 'cd4672b1673868216b57c50f302b5ba6cad5e75a7728c604664d9838492237e5', 
        #   'pubkey': '558497db304332004e59387bc3ba1df5738eac395b0e56b45bfb2eb5400a1e39', 
        #   'created_at': 1691110127, 
        #   'kind': 65005, 
        #   'tags': [['i', 'Dramatic+ 8k wallpaper medium shot waist up photo of fearsome young witch wearing intricate robes and silver pauldrons, magic+, high detail, detailed background, detailed eyes, wild hair, wind blown hair, cinematic lighting, masterpiece, best quality, high contrast, soft lighting, backlighting, bloom, light sparkles, chromatic aberration, smooth, sharp focus', 'text'], 
        #            ['params', 'negative_prompt', 'hat, old, child, childlike, 3d, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name'], 
        #            ['params', 'size', '768', '768'], 
        #            ['wss://relay.damus.io', 'wss://relay.snort.social', 'wss://blastr.f7z.xyz', 'wss://nostr.mutinywallet.com', 'wss://relayable.org'], 
        #            ['bid', '5000', '10000']], 
        #            'content': 'Generate a Picture based on the attached prompt', 
        #            'sig': '2ae18593540d2c0eb2f27692279bf5d0f65ecb2c975385e4fe436fd3e44b7baf11a9756ae842d7003ff73496e66c56c3f4f937ebf011703d70d5e6bc91bf6b5e'}]
