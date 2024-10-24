import json
from datetime import timedelta
from nostr_sdk import Client, Kind, Alphabet, SingleLetterTag, Filter, EventSource, init_logger, LogLevel, PublicKey, \
    Options, NostrDatabase, ClientBuilder, NegentropyOptions, NegentropyDirection

init_logger(LogLevel.ERROR)


async def update_database(db_name):
    database = NostrDatabase.lmdb(db_name)
    client = ClientBuilder().database(database).build()

    await client.add_relay("wss://relay.damus.io")
    await client.add_relay("wss://relay.primal.net")
    await client.connect()

    print("Syncing Gif Database.. this might take a moment..")
    dbopts = NegentropyOptions().direction(NegentropyDirection.DOWN)

    f = Filter().kind(Kind(1063)).custom_tag(SingleLetterTag.lowercase(Alphabet.M), ["image/gif"])
    await client.reconcile(f, dbopts)
    print("Done Syncing Gif Database.")


async def get_gifs_from_database(db_name, search_term):
    database = NostrDatabase.lmdb(db_name)

    f = Filter().kind(Kind(1063)).custom_tag(SingleLetterTag.lowercase(Alphabet.M), ["image/gif"])
    events = await database.query([f])

    event_list = []
    for event in events:
        event_str = event.as_json()
        if search_term in event_str:
            event_json = json.loads(event_str)
            event_list.append(event_json)

    return event_list


async def getgifs(search_term):
    # Initialize client without signer
    client = Client()

    # Add relays and connect
    await client.add_relay("wss://relay.damus.io")
    await client.add_relay("wss://relay.primal.net")
    await client.connect()

    # Get events from relays
    f = Filter().kind(Kind(1063)).custom_tag(SingleLetterTag.lowercase(Alphabet.M), ["image/gif"])

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

if __name__ == "__main__":
    import asyncio

    # Variant with local database
    asyncio.run(update_database("gifs"))
    search_term = "liotta"
    output = asyncio.run(get_gifs_from_database("gifs", search_term))
    print("DB: " + str(len(output)), output)

    # Variant with in memory
    output = asyncio.run(getgifs(search_term))

    print("Memory: " + str(len(output)), output)