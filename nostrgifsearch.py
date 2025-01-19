import json, requests
from datetime import timedelta
from nostr_sdk import Client, Kind, Alphabet, SingleLetterTag, Filter, EventSource, init_logger, LogLevel, \
   NostrDatabase, ClientBuilder, NegentropyOptions, NegentropyDirection, PublicKey, EventId

init_logger(LogLevel.ERROR)

async def update_database(db_name, mime_type="image/gif"):
    database = NostrDatabase.lmdb(db_name)
    client = ClientBuilder().database(database).build()
    pubkey = 'npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'

    # await client.add_relay("wss://relay.damus.io")
    # await client.add_relay("wss://relay.primal.net")
    await client.add_relay("wss://relay.gifbuddy.lol")
    await client.connect()
    print("Relay Connected")
    dbopts = NegentropyOptions().direction(NegentropyDirection.DOWN)
    print("Filtering...")
    if mime_type=="image/gif":
        f = Filter().kind(Kind(1063)).custom_tag(SingleLetterTag.lowercase(Alphabet.M), [mime_type]).author(PublicKey.from_bech32(pubkey))
    else:
        f = Filter().kind(Kind(1063)).author(PublicKey.from_bech32(pubkey)).hashtag('memeamigo')
    print("Filter Complete")
    await client.reconcile(f, dbopts)
    print("Database Reconciled")


async def get_gifs_from_database(db_name, search_term):
    database = NostrDatabase.lmdb(db_name)
    pubkey = 'npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'

    # f = Filter().kind(Kind(1063)).custom_tag(SingleLetterTag.lowercase(Alphabet.M), ["image/gif"]).author(PublicKey.from_bech32(pubkey))
    f = Filter().kind(Kind(1063)).author(PublicKey.from_bech32(pubkey))
    events = await database.query([f])

    event_list = []
    for event in events:
        event_str = event.as_json()
        if search_term in event_str:
            event_json = json.loads(event_str)
            event_list.append(event_json)

    return event_list

# Blastr API Endpoint for online relays
def getrelays():
    # Define the URL to send the request to
    url = "https://api.nostr.watch/v1/online"

    # Make the GET request
    response = requests.get(url)

    # Check if the request was successful
    if response.status_code == 200:
        # Parse the response to JSON
        data = response.json()

        # Pretty-print the JSON data
        return json.dumps(data)
    else:
        return "Request failed with status code:", response.status_code

# Get event list
async def get_metadata(search_term, mime_type):
    # Initialize client without signer
    client = Client()

    # Add relays and connect
    # await client.add_relay("wss://relay.damus.io")
    # await client.add_relay("wss://relay.primal.net")
    await client.add_relay("wss://relay.gifbuddy.lol")
    await client.connect()

    # Get events from relays
    if mime_type=="image/gif":
        f = Filter().kind(Kind(1063)).custom_tag(SingleLetterTag.lowercase(Alphabet.M), [mime_type]).author(PublicKey.from_bech32('npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'))
    else:
        f = Filter().kind(Kind(1063)).author(PublicKey.from_bech32('npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p')).hashtag('memeamigo')
    # f = Filter().kind(Kind(1063)).custom_tag(SingleLetterTag.lowercase(Alphabet.M), ["image/gif"])

    source = EventSource.relays(timeout=timedelta(seconds=30))
    events = await client.get_events_of([f], source)
    
    # Convert objects into list of dictionaries
    event_list = []
    for event in events:
        event = event.as_json()
        if search_term in event:
            event = json.loads(event)
            event_list.append(event)

    return event_list

# Remove duplicates
def remove_duplicates_by_hash(dicts):
    seen_x_values = set()
    unique_dicts = []

    for d in dicts:
        # Extract the 'x' value from the 'tags' list if it exists
        x_value = None
        for tag in d['tags']:
            if tag[0] == 'x':
                x_value = tag[1]
                break

        # If 'x' tag exists and we haven't seen this value before, keep the dictionary
        if x_value and x_value not in seen_x_values:
            seen_x_values.add(x_value)
            unique_dicts.append(d)

    return unique_dicts

# Get event list
async def getevent(hex):
    # Initialize client without signer
    client = Client()

    # Add relays and connect
    # await client.add_relay("wss://relay.damus.io")
    # await client.add_relay("wss://relay.primal.net")
    await client.add_relay("wss://relay.gifbuddy.lol")
    await client.connect()

    # Get events from relays
    f = Filter().id(EventId.from_hex(hex))
    source = EventSource.relays(timeout=timedelta(seconds=30))
    event = await client.get_events_of([f], source)

    return event[0].as_json()

if __name__ == "__main__":
    import asyncio
    # search_term = "hello"

    # # Variant with local database
    # # asyncio.run(update_database("gifs"))
    # output = asyncio.run(get_gifs_from_database("gifs", search_term))
    # print("DB: " + str(len(output)))
    # unique_output = remove_duplicates_by_hash(output)
    # print("Unique:", len(unique_output))
    # # print(unique_output)
    # gifs = []
    # for event in unique_output:
    #     tags = event['tags']
    #     for tag in tags:
    #         if tag[0] == 'url':
    #             gif = tag[1]
    #             gifs.append(gif)
    
    # print(gifs, len(gifs))

    # search_term = "toy story"

    # Variant with local database
    # asyncio.run(update_database("gifs"))
    # output = asyncio.run(get_gifs_from_database("memes", ''))
    # print("DB: " + str(len(output)))
    # print(output)
    # unique_output = remove_duplicates_by_hash(output)
    # print("Unique:", len(unique_output))
    # # print(unique_output)
    # memes = []
    # for event in unique_output:
    #     tags = event['tags']
    #     for tag in tags:
    #         if tag[0] == 'url':
    #             meme = tag[1]
    #             memes.append(meme)
    
    # print(memes, len(memes))

    # print(asyncio.run(getevent('98dbe2dc3dede1fad7f5cd7f1bede624cbd6242e6ed782370c659b84e05b7f01')))

    eventlist = asyncio.run(get_metadata("", "image/gifs"))
    print(len(eventlist))