import threading
import time
from event_database import scan_table

class ApiKeyCache:
    def __init__(self, refresh_interval=120):
        """
        Initialize the API key cache with in-memory dictionary.
        
        Args:
            refresh_interval (int): Cache refresh interval in seconds (default 120)
        """
        self.cache = {}
        self.refresh_interval = refresh_interval
        
        # Start background refresh thread
        self.stop_thread = False
        self.refresh_thread = threading.Thread(target=self._background_refresh)
        self.refresh_thread.daemon = True
        self.refresh_thread.start()
    
    def _refresh_cache(self):
        """Load all API keys from DynamoDB into memory."""
        items = scan_table()
        self.cache = {
            item['api_key']: {
                'created_at': item['created_at'],
                'expires_at': item['expires_at'],
                'is_active': item['is_active']
            }
            for item in items
        }
    
    def _background_refresh(self):
        """Continuously refresh the cache in the background."""
        while not self.stop_thread:
            try:
                self._refresh_cache()
            except Exception as e:
                print(f"Error refreshing cache: {e}")
            time.sleep(self.refresh_interval)
    
    def is_valid_api_key(self, api_key: str) -> bool:
        """Check if an API key is valid using the in-memory cache."""
        if api_key in self.cache:
            key_data = self.cache[api_key]
            current_time = int(time.time())
            
            return (
                key_data['is_active'] and
                current_time < key_data['expires_at']
            )
        return False
    
    def stop(self):
        """Stop the background refresh thread."""
        self.stop_thread = True
        self.refresh_thread.join()

import secrets
import time
from datetime import datetime, timedelta
import uuid
from event_database import save_to_dynamodb

def create_api_key(pubkey: str, validity_days: int = 365) -> dict:
    """
    Creates a new API key for a given public key and stores it in DynamoDB.
    
    Args:
        pubkey (str): The public key to associate with the API key
        validity_days (int): Number of days the API key should be valid for
        
    Returns:
        dict: Contains the generated API key and related information
    """
    # Generate a secure random API key
    api_key = f"buddy_" + secrets.token_urlsafe(32)
    
    # Calculate timestamps
    current_time = int(time.time())
    expiration_time = current_time + (validity_days * 24 * 60 * 60)
    
    # Prepare the data
    api_data = {
        'pubkey': pubkey,
        'api_key': api_key,
        'created_at': current_time,
        'expires_at': expiration_time,
        'is_active': True
    }
    
    try:
        # Save to DynamoDB using your existing function
        save_to_dynamodb(**api_data)
        
        # Add human-readable dates to the response
        api_data['created_at_date'] = datetime.fromtimestamp(current_time).isoformat()
        api_data['expires_at_date'] = datetime.fromtimestamp(expiration_time).isoformat()
        
        return {
            'status': 'success',
            'data': api_data
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'message': f'Failed to create API key: {str(e)}'
        }
    
if __name__ == "__main__":
    # pubkey = "npub1hee433872q2gen90cqh2ypwcq9z7y5ugn23etrd2l2rrwpruss8qwmrsv6"
    pubkey = "npub1r0rs5q2gk0e3dk3nlc7gnu378ec6cnlenqp8a3cjhyzu6f8k5sgs4sq9ac"
    validity_days = 365*10
    print(create_api_key(pubkey, validity_days))