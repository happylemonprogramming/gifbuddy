from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
import faiss
import time
import asyncio, time
from nostrgifsearch import get_gifs_from_database, remove_duplicates_by_hash
from rebroadcast import search_messages

class GifSearch:
    def __init__(self):
        self.vectorizer = None
        self.index = None
        self.gif_data = []
        
    def build_index(self, gif_repository):
        """Build search index from GIF repository"""
        start_process = time.time()
        self.gif_data = gif_repository
        
        # Extract content for indexing
        documents = [item['content'] for item in gif_repository]
        
        # Create and fit vectorizer
        self.vectorizer = TfidfVectorizer(lowercase=True)
        vectors = self.vectorizer.fit_transform(documents).toarray().astype(np.float32)
        
        # Normalize vectors
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        vectors = np.divide(vectors, norms, out=vectors, where=norms!=0)
        
        # Initialize FAISS index
        dimension = vectors.shape[1]
        self.index = faiss.IndexFlatIP(dimension)
        self.index.add(vectors)
        
        print(f"Index build time: {time.time() - start_process:.4f} seconds")
    
    def search(self, query, k=30, threshold=0.1):
        """Search for GIFs and return full dictionary entries"""
        # Vectorize query
        query_vector = self.vectorizer.transform([query]).toarray().astype(np.float32)
        
        # Normalize query vector
        query_norm = np.linalg.norm(query_vector)
        if query_norm != 0:
            query_vector = query_vector / query_norm
        
        # Search
        scores, indices = self.index.search(query_vector, k)
        
        # Return full dictionaries with scores
        results = []
        for idx, score in zip(indices[0], scores[0]):
            if score > threshold and idx != -1:
                gif_dict = self.gif_data[idx]
                results.append({
                    'score': float(score),
                    'gif': gif_dict
                })
        
        return results


# Get Gifs from NIP94
def nostr_gifs(query, limit):
    # Get unique gif set
    start = time.time()
    # output = asyncio.run(get_gifs_from_database("gifs", "")) # NOTE: Issue with gifbuddy relay
    output = search_messages("gif_events", "")
    print(f"Get Gifs Time: {round(time.time()-start,2)} seconds")
    unique_output = remove_duplicates_by_hash(output)
    print(f"Unique Gif Count: {len(unique_output)}")
    gif_repository = unique_output
    
    # Initialize and build index
    searcher = GifSearch()
    searcher.build_index(gif_repository)
    nostr_gifs = []

    # Search
    results = searcher.search(query, limit)
    
    # Parse results for gif urls
    for result in results:
        gif = result["gif"]
        # score = result['score']
        thumb = next((tag[1] for tag in gif['tags'] if tag[0] == 'thumb'), None)
        url = next((tag[1] for tag in gif['tags'] if tag[0] == 'url'), None)
        if thumb and url:
            nostr_gifs.append({"thumb": thumb, "url": url})

    print(f"Total Time: {round(time.time()-start,2)} seconds")
    return nostr_gifs

# Example usage
if __name__ == "__main__":
    print(nostr_gifs('butt', 10))