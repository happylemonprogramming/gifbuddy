import os, json, time, asyncio, logging
from datetime import timedelta
from nostr_sdk import Client, SingleLetterTag, Alphabet, EventId, PublicKey, Kind, Filter, EventSource, init_logger, LogLevel, Timestamp
init_logger(LogLevel.WARN)

# Initialize private key
private_key = os.environ["nostrdvmprivatekey"]

# Get event list
async def getevent(id=None, kind=1, pubkey=None, event=None, since=None, author=None, start=1724961480, end=int(time.time()), relays=["wss://relay.damus.io", "wss://relay.primal.net"]):
    # Initialize client without signer
    client = Client()

    # Add relays and connect
    for relay in relays:
        await client.add_relay(relay)

    # await client.add_relay("wss://relay.damus.io")
    # await client.add_relay("wss://relay.primal.net")
    # await client.add_relay("wss://relay.gifbuddy.lol")
    # await client.add_relay("wss://relay.nostr.band")
    # await client.add_relay("wss://nostr.fmt.wiz.biz")
    
    await client.connect()

    # Get events from relays
    if id: # Direct search
        f = Filter().id(EventId.parse(id))
    elif pubkey and kind and since: # Mentions
        f = Filter().pubkey(PublicKey.from_hex(pubkey)).kind(Kind(kind)).since(since)
    elif event and kind and not pubkey: # Zaps
        f = Filter().event(EventId.parse(event)).kind(Kind(kind))
    elif kind==0 and author: # Metadata
        f = Filter().kind(Kind(kind)).author(PublicKey.from_hex(author))
    elif kind == 1063: # Gif search
        f = Filter().kind(Kind(1063)).custom_tag(SingleLetterTag.lowercase(Alphabet.M), ["image/gif"]).author(PublicKey.from_bech32(author)).since(Timestamp.from_secs(start)).until(Timestamp.from_secs(end))
    elif kind == 30169: # Favorites search
        f = Filter().kind(Kind(30169)).author(PublicKey.from_hex(author))

    else:
        raise Exception("Unrecognized request for event retreival")

    source = EventSource.relays(timeout=timedelta(seconds=30))
    events = await client.get_events_of([f], source)
    
    # Convert objects into list of dictionaries
    event_list = []
    for event in events:
        event = event.as_json()
        event = json.loads(event)
        event_list.append(event)

    return event_list

def gifcounter():
    start_timestamp = 1724961480 # NOTE: UNIX timestamp for gifbuddy launch
    interval = 2628288 # NOTE: one month interval
    current_timestamp = int(time.time())
    pubkey = 'npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'
    super_list = []

    # Helper function to fetch events
    async def fetch_events(start, end):
        return await getevent(kind=1063, author=pubkey, start=start, end=end)

    # Calculate the number of full months
    months_passed = (current_timestamp - start_timestamp) // interval

    # Fetch events for each full month
    for month in range(months_passed):
        end_timestamp = start_timestamp + interval
        # logging.info(f"Fetching events from {start_timestamp} to {end_timestamp}")
        
        # Run the async fetch_events function and collect results
        eventlist = asyncio.run(fetch_events(start_timestamp, end_timestamp))
        super_list.extend(eventlist)
        
        # Update start timestamp for the next month
        start_timestamp = end_timestamp

    # Handle any remaining time up to the current timestamp
    if start_timestamp < current_timestamp:
        # logging.info(f"Fetching events from {start_timestamp} to {current_timestamp}")
        eventlist = asyncio.run(fetch_events(start_timestamp, current_timestamp))
        super_list.extend(eventlist)

    # logging.info(f"Total events fetched: {len(super_list)}")
    return len(super_list), super_list

# Function to extract titles and sort URLs
def extract_titles_and_gifs(data):
    result = []
    
    for entry in data:
        title = None
        gif_urls = []
        
        # Extract title and URLs from 'tags'
        for tag in entry['tags']:
            if tag[0] == 'title':
                title = tag[1]
            for item in tag:
                if item.startswith('url'):
                    # Extract the URL after the 'thumb' prefix
                    gif_url = item.split(' ')[1]
                    gif_urls.append(gif_url)
        
        result.append({
            'title': title,
            'gif_urls': gif_urls
        })
    
    return result

# Function to extract titles and thumb URLs
def extract_titles_and_thumbs(data):
    result = []

    for entry in data:
        title = None
        thumb_urls = []
        
        # Extract title and thumb URLs from the tags
        for tag in entry['tags']:
            if tag[0] == 'title':
                title = tag[1]
            for item in tag:
                if item.startswith('thumb'):
                    # Extract the URL after the 'thumb' prefix
                    thumb_url = item.split(' ')[1]
                    thumb_urls.append(thumb_url)
        
        # Append the result
        result.append({
            'title': title,
            'thumb_urls': thumb_urls
        })
    
    return result


if __name__ == "__main__":
    # Review nip94 events
    pubkey = 'npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'
    eventlist = asyncio.run(getevent(kind=1063, author=pubkey, relays=["wss://relay.gifbuddy.lol"]))
    print(len(eventlist))

    # Get specific event
    # event_id = "79c96ab3dc70a8bb9e713072ed32e26498e67c565db4cce8e821032db58326f0"
    # eventlist = asyncio.run(getevent(id=event_id))
    # print(eventlist)

    # Count all nip94 events since gifbuddy launch
    # print(gifcounter()[0])

    # Get pubkeyhex
    # pubkeyhex = 'ae1008d23930b776c18092f6eab41e4b09fcf3f03f3641b1b4e6ee3aa166d760'
    # pubkey = PublicKey.from_hex(pubkeyhex).to_bech32()
    # print(pubkey)

    # pubkey = 'npub1vnrs6rgkklr9kmpah685e3l9u35rlycpgndq99txfl7va80h7zsqxtppzd'
    # pubkeyhex = PublicKey.from_bech32(pubkey).to_hex()
    # since = Timestamp.from_secs(1724961480)
    
    # eventlist = asyncio.run(getevent(kind=30169, author="64c70d0d16b7c65b6c3dbe8f4cc7e5e4683f930144da0295664ffcce9df7f0a0"))
    # print(eventlist[0])

    # Get the output
    # output = extract_titles_and_gifs(eventlist)
    # print(output)
    # for entry in output:
    #     print(entry)