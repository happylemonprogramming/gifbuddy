# from sklearn.feature_extraction.text import TfidfVectorizer
# from sklearn.metrics.pairwise import cosine_similarity

# # Example data
# documents = [
#     "A cat playing piano",
#     "A dog jumping into a pool",
#     "A scenic sunset over mountains"
# ]

# # Create the vectorizer
# vectorizer = TfidfVectorizer()
# doc_vectors = vectorizer.fit_transform(documents)

# # Search function
# def search(query, doc_vectors, documents):
#     query_vector = vectorizer.transform([query])
#     similarities = cosine_similarity(query_vector, doc_vectors).flatten()
#     ranked_indices = similarities.argsort()[::-1]
#     return [(documents[i], similarities[i]) for i in ranked_indices]

# # Example search
# query = "funny cat"
# results = search(query, doc_vectors, documents)

# # Display results
# for doc, score in results:
#     print(f"Document: {doc}, Score: {score:.2f}")

from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import pickle, time
start = time.time()

# Example data (documents)
documents = [
    "A cat playing piano",
    "A dog jumping into a pool",
    "A scenic sunset over mountains"
]

# Create the vectorizer and compute document vectors
vectorizer = TfidfVectorizer()
doc_vectors = vectorizer.fit_transform(documents)

# Save the vectorizer and vectors for future use
with open("tfidf_vectorizer.pkl", "wb") as f:
    pickle.dump(vectorizer, f)
with open("doc_vectors.pkl", "wb") as f:
    pickle.dump(doc_vectors, f)
with open("documents.pkl", "wb") as f:
    pickle.dump(documents, f)

save = time.time()-start
print('Save time:', save)
lap1 = time.time()

# Load precomputed data
with open("tfidf_vectorizer.pkl", "rb") as f:
    vectorizer = pickle.load(f)
with open("doc_vectors.pkl", "rb") as f:
    doc_vectors = pickle.load(f)
with open("documents.pkl", "rb") as f:
    documents = pickle.load(f)

load = time.time()-lap1
print('Load time:', load)
lap2 = time.time()

# Search function
def search(query, vectorizer, doc_vectors, documents):
    query_vector = vectorizer.transform([query])  # Compute vector for the query
    similarities = cosine_similarity(query_vector, doc_vectors).flatten()
    ranked_indices = similarities.argsort()[::-1]
    return [(documents[i], similarities[i]) for i in ranked_indices if similarities[i] > 0]

# Example search
query = "funny animal"
results = search(query, vectorizer, doc_vectors, documents)
userinput = time.time()-lap2
print('Query time:', userinput)

# Display results
for doc, score in results:
    print(f"Document: {doc}, Score: {score:.2f}")
total = time.time()-start
print('Final time:', total)
