from nostrgifsearch import update_database, get_gifs_from_database
from getevent import getevent
from nostr_sdk import Keys, Client, Event, NostrSigner
import asyncio, json, time
import sqlite3

# Initialize incrementor
i=0

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
    asyncio.run(update_database("gifs")) # NOTE: Issue with gifbuddy relay
    gif_events = asyncio.run(get_gifs_from_database("gifs", "")) # Empty to return all

    for gif in gif_events:
        i+=1
        asyncio.run(broadcast(json.dumps(gif)))
        print(f"GIF #{i}")

# Get Meme data
def get_meme_events():
    asyncio.run(update_database("memes", "memes")) # NOTE: Issue with gifbuddy relay
    meme_events = asyncio.run(get_gifs_from_database("memes", "")) # Empty to return all

    for meme in meme_events:
        i+=1
        asyncio.run(broadcast(json.dumps(meme)))
        print(f"Meme #{i}")

# Get Recent data
def get_recent_events(start):
    pubkey = 'npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'
    end = int(time.time())
    eventlist = asyncio.run(getevent(kind=1063, author=pubkey, start=start, end=end))
    print(len(eventlist))
    for event in eventlist:
        i+=1
        asyncio.run(broadcast(json.dumps(event)))
        print(f"Event #{i}")

# Function to store a list of JSON messages in SQLite
def store_messages(db_name: str, messages: list):
    """
    Stores a list of JSON messages in the SQLite database, ensuring no duplicates.

    Args:
        db_name (str): The name of the SQLite database file.
        messages (list): A list of JSON messages (Python dictionaries or strings).
    """
    # Connect to the SQLite database
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    # Create the messages table with a UNIQUE constraint on the content field
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL UNIQUE
        )
    """)

    # Insert each JSON message into the table, ignoring duplicates
    for message in messages:
        # Convert Python dictionary to JSON string if needed
        if isinstance(message, dict):
            message = json.dumps(message)

        # Use INSERT OR IGNORE to avoid inserting duplicates
        cursor.execute("INSERT OR IGNORE INTO messages (content) VALUES (?)", (message,))

    # Commit and close the connection
    print("Commiting & Closing Connection")
    conn.commit()
    conn.close()

# Function to retrieve all JSON messages from SQLite
def retrieve_messages(db_name: str) -> list:
    """
    Retrieves all JSON messages stored in the SQLite database.

    Args:
        db_name (str): The name of the SQLite database file.

    Returns:
        list: A list of JSON messages (Python dictionaries).
    """
    # Connect to the SQLite database
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    # Retrieve all rows from the messages table
    cursor.execute("SELECT content FROM messages")
    rows = cursor.fetchall()

    # Parse JSON strings back into Python dictionaries
    messages = [json.loads(row[0]) for row in rows]

    # Close the connection
    conn.close()
    return messages

# Function to search for messages by a keyword in the content
def search_messages(db_name: str, keyword: str) -> list:
    """
    Searches for messages in the SQLite database that contain a given keyword.

    Args:
        db_name (str): The name of the SQLite database file.
        keyword (str): The keyword to search for in the message content.

    Returns:
        list: A list of JSON messages (Python dictionaries) that match the keyword.
    """
    # Connect to the SQLite database
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    # Search for messages that contain the keyword in their content
    cursor.execute("SELECT content FROM messages WHERE LOWER(content) LIKE LOWER(?)", ('%' + keyword + '%',))
    rows = cursor.fetchall()

    # Parse JSON strings back into Python dictionaries
    messages = [json.loads(row[0]) for row in rows]

    # Close the connection
    conn.close()
    return messages


if __name__ == "__main__":
    # Store events
    start = int(time.time()-24*60*60*365)
    pubkey = 'npub10sa7ya5uwmhv6mrwyunkwgkl4cxc45spsff9x3fp2wuspy7yze2qr5zx5p'
    end = int(time.time())
    eventlist = asyncio.run(getevent(kind=1063, author=pubkey, start=start, end=end, relays=["wss://relay.gifbuddy.lol/"]))
    store_messages("relay_events", eventlist)

    # Retrieve events
    eventlist = retrieve_messages("relay_events")
    print(len(eventlist))
    # event = eventlist[0]
    # asyncio.run(broadcast(json.dumps(event)))