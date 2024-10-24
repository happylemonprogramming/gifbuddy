import json
from datetime import timedelta
from nostr_sdk import Client, Kind, Alphabet, SingleLetterTag, Filter, EventSource, init_logger, LogLevel, PublicKey
init_logger(LogLevel.WARN)

# Get event list
async def getgifs():
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
        event = json.loads(event)
        event_list.append(event)

    return event_list

if __name__ == "__main__":
    import asyncio
    output = asyncio.run(getgifs())
    print(len(output), output)