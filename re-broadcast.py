from nostrgifsearch import update_database, get_gifs_from_database
from getevent import getevent
from nostr_sdk import Keys, Client, Event, NostrSigner
import asyncio, json, time

pubkey = 'npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'
start = int(time.time())-(24*60*60)
end = int(time.time())
i=0

eventlist = asyncio.run(getevent(kind=1063, author=pubkey, start=start, end=end))

# Publish content to nostr
async def broadcast(event, private_key=None):
    # Initialize client
    client = Client()

    # Add relays and connect
    await client.add_relay("wss://relay.gifbuddy.lol")
    await client.connect()

    await client.send_event(Event.from_json(event))

# Get GIF data
def get_gif_events():
    asyncio.run(update_database("gifs"))
    gif_events = asyncio.run(get_gifs_from_database("gifs", "")) # Empty to return all

    for gif in gif_events:
        i+=1
        asyncio.run(broadcast(json.dumps(gif)))
        print(f"GIF #{i}")

# Get Meme data
def get_meme_events():
    asyncio.run(update_database("memes", "memes"))
    meme_events = asyncio.run(get_gifs_from_database("memes", "")) # Empty to return all

    for meme in meme_events:
        i+=1
        asyncio.run(broadcast(json.dumps(meme)))
        print(f"Meme #{i}")

# Get Recent data
def get_recent_events():
    for event in eventlist:
        i+=1
        asyncio.run(broadcast(json.dumps(event)))
        print(f"Event #{i}")

if __name__ == "__main__":
    get_recent_events()