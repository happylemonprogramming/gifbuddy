import json, requests
from datetime import timedelta
from nostr_sdk import Keys, NostrSigner, Client, Kind, Alphabet, SingleLetterTag, Filter, EventSource, init_logger, LogLevel, PublicKey
init_logger(LogLevel.WARN)

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

def search_by_content(dicts, search_value):
    result = []
    for d in dicts:
        if d['content'] == search_value:  # Check if 'content' matches the search value
            result.append(d)
    return result

if __name__ == "__main__":
    import asyncio
    output = asyncio.run(getgifs())
    print(len(output))
    filtered_dicts = remove_duplicates_by_hash(output)
    print(len(filtered_dicts))
    searchTerm = input("Search:")
    results = search_by_content(filtered_dicts, searchTerm)
    print(len(results))
    urls = []
    for result in filtered_dicts:
        for tag in result['tags']:
            if tag[0] == 'url':
                url = tag[1]
                if 'star trek' in str(result):
                    urls.append(url)
                break
    print(urls)

    # print(len(getrelays()))