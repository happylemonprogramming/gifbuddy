# Libraries
import json, time, sys, os, re
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
        
    # # Path for summoning program in terminal
    # if len(sys.argv) > 1:
    #     # Extract terminal arguments passed to program
    #     kind = int(sys.argv[1])
    #     tags = sys.argv[2]
    #     content = sys.argv[3]

    #     # Replace single quotes with double quotes to load JSON
    #     tags = tags.replace("'", "\"")

    #     # Convert the string to a list using JSON
    #     tags = json.loads(tags)

    #     # Construct event
    #     event = Event(
    #                 kind = kind, 
    #                 tags = tags,
    #                 content = content
    #                 )
        
    # Path for custom tags (list type)
    if tags != [] and isinstance(tags, list):
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

if __name__ == "__main__":
    api_url = "https://nostr.build/api/v2/nip96/upload"
    from nip94 import compute_sha256
    body_hash = compute_sha256("https://media.tenor.com/tIPGwbBysUoAAAAC/ruh-roh.gif")
    event_id = nostrpost(private_key=private_key,kind=27235,content="",tags=[["u", api_url], ["method", "POST"], ["payload", body_hash]])
