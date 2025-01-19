import asyncio, os, json, ast
from datetime import timedelta
from nostr_sdk import Keys, Client, Kind, Event, Tag, NostrSigner, Metadata, TagKind, HttpData, HttpMethod, EventId, EventBuilder, Filter, EventSource, init_logger, LogLevel
# init_logger(LogLevel.WARN)

def hex_to_note(target_eventID):
    note = EventId.from_hex(target_eventID).to_bech32()
    return note

# Publish content to nostr
async def nostrpost(private_key, content, kind=None, reply_to=None, url=None, payload=None, tags=[], relays=["wss://relay.damus.io", "wss://relay.primal.net"]):
    # Initialize with Keys signer
    keys = Keys.parse(private_key)
    signer = NostrSigner.keys(keys)
    client = Client(signer)

    # Add relays and connect
    for relay in relays:
        await client.add_relay(relay)
        
    # await client.add_relay("wss://relay.damus.io")
    # await client.add_relay("wss://relay.primal.net")
    # await client.add_relay("wss://relay.nostr.band")
    # await client.add_relay("wss://nostr.fmt.wiz.biz")
    await client.connect()

    # Send an event using the Nostr Signer
    if content and reply_to: # Replies
        # Create Event Object
        f = Filter().id(EventId.parse(reply_to))
        source = EventSource.relays(timeout=timedelta(seconds=10))
        reply_to = await client.get_events_of([f], source)
        reply_to = reply_to[0]
        builder = EventBuilder.text_note_reply(content=content, reply_to=reply_to)
    elif url and payload: # NIP98
        builder = EventBuilder.http_auth(HttpData(url=url, method=HttpMethod.POST, payload=payload))
    elif kind == 0: # Metadata
        builder = EventBuilder.metadata(Metadata.from_json(content))
    elif kind == 1063:
        event_tags = []
        for tag in tags:
            event_tags.append(Tag.parse(tag))
        builder = EventBuilder(kind=Kind(1063), content=content, tags=event_tags)
    else: # Default to Text Note
        builder = EventBuilder.text_note(content=content, tags=tags)
    await client.send_event_builder(builder)

    # Allow note to send
    await asyncio.sleep(2.0)
    
    # Get event ID from relays
    f = Filter().authors([keys.public_key()]).limit(1)
    source = EventSource.relays(timedelta(seconds=10))
    events = await client.get_events_of([f], source)
    for event in events:
        event = event.as_json()
        eventID = json.loads(event)['id']
    
    return eventID

if __name__ == "__main__":
    private_key = os.environ["nostrdvmprivatekey"]
    pubkey = Keys.parse(private_key).public_key()
    content = 'test again'
    event = '3589d9a28644890fd3904d11854669327a2c19f4123760dd68bbaccd9502fc9e'
    eventID = asyncio.run(nostrpost(private_key, content=content, reply_to=event))
    print(eventID)