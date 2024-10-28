import os, json, re, ast
from datetime import timedelta
from nostr_sdk import Client, SingleLetterTag, Alphabet, EventId, PublicKey, Kind, Filter, EventSource, init_logger, LogLevel, Timestamp
init_logger(LogLevel.WARN)

# Initialize private key
private_key = os.environ["nostrdvmprivatekey"]

# Get event list
async def getevent(id=None, kind=1, pubkey=None, event=None, since=None, author=None):
    # Initialize client without signer
    client = Client()

    # Add relays and connect
    await client.add_relay("wss://relay.damus.io")
    await client.add_relay("wss://relay.primal.net")
    # await client.add_relay("wss://relay.nostr.band")
    await client.add_relay("wss://nostr.fmt.wiz.biz")
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
        f = Filter().kind(Kind(1063)).custom_tag(SingleLetterTag.lowercase(Alphabet.M), ["image/gif"]).author(PublicKey.from_bech32(author))


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


if __name__ == "__main__":
    import asyncio
    # event_list = asyncio.run(getevent(kind=5201))
    # print(event_list)

    # pubhex = 'c63c5b4e21b9b1ec6b73ad0449a6a8589f6bd8542cabd9e5de6ae474b28fe806'
    # pubkey = 'npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'
    # eventlist = asyncio.run(getevent(kind=1063, author=pubkey))
    eventlist = asyncio.run(getevent(id='b91163b2131fa2f2fa9606ee385592b6213c71396b0585fd74866b058565dac4'))

    # metadata = asyncio.run(getevent(i))
    # name = json.loads(metadata[0]['content'])['name']
    print((eventlist))
    # print(PublicKey.from_hex(pubhex).to_bech32())