// Variable & Element ID initialization
let pos = null
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsDiv = document.getElementById('results');
const zapButton = document.getElementById('zapButton');
const zapPopup = document.getElementById('zapPopup');
const uploadButton = document.getElementById('uploadButton');
const uploadPopup = document.getElementById('uploadPopup');
const uploadForm = document.getElementById('uploadForm');
const uploadResults = document.getElementById('uploadResults');
const loadMore = document.getElementById('load-more-button');

// Nostr.Build and NIP94 API POST request
async function sendGifMetadata(gifData) {
    try {
        await axios.post('/gifmetadata', gifData);
        console.log('GIF metadata sent successfully.');
    } catch (error) {
        console.error('Error sending GIF metadata:', error);
    }
}

// Copy to clipboard function
async function copyToClipboard(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
        document.execCommand('copy');
        alert('Copied to clipboard!');
    } catch (err) {
        console.error('Fallback failed:', err);
        alert('Failed to copy text to clipboard.');
    }
    document.body.removeChild(tempInput);
}

// Primary gif search function
async function searchGifs(pos) {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        console.log('No search term, returning');
        return;
    }

    try {
        const response = await axios.post('/search', {
            q: searchTerm,
            pos: pos
        });

        console.log('Search response received:', response.data);

        // If it's the initial search, clear the results. If it's a "Load More," append new results.
        if (pos == null) {
            resultsDiv.innerHTML = '';  // Clear results only for the initial search
        }

        Object.entries(response.data).forEach(([alt, gifData]) => {
            if (alt !== 'next') {  // Skip the 'next' key in the results
                const { gifUrl, gifSize, gifDims, thumb, preview, alt, image, summary } = gifData;
                const img = document.createElement('img');
                img.src = preview;
                img.alt = alt;
                img.className = 'gif';
                img.addEventListener('click', () => {
                    copyToClipboard(gifUrl);
                    sendGifMetadata({
                        gifUrl,
                        gifSize,
                        gifDims,
                        thumb,
                        preview,
                        alt,
                        image,
                        summary,
                        searchTerm
                    });
                });
                resultsDiv.appendChild(img);
            }
        });

        // Update pos with the new position for the next load more action
        pos = response.data.next;
        console.log('Updated pos:', pos);

        // Show or hide the "Load More" button based on the presence of a next position
        document.getElementById('load-more-button').style.display = pos ? 'block' : 'none';
        console.log('Load More button display:', loadMore.style.display);

        return pos; // Return the updated pos

    } catch (error) {
        console.error('Error fetching GIFs:', error);
        resultsDiv.innerHTML = 'An error occurred while fetching GIFs.';
        return null; // Return null in case of error
    }
}

// Allows user to initiate search by click or enter
searchButton.addEventListener('click', async () => {
    pos = null;  // Reset pos for a new search
    pos = await searchGifs(pos);  // Initial search
});
searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        pos = null;  // Reset pos for a new search
        pos = await searchGifs(pos);  // Initial search
    }
});

// Allows user to initiate search by click or enter
loadMore.addEventListener('click', async () => {
    console.log('Load More button clicked');
    console.log('Current pos value:', pos);
    pos = await searchGifs(pos);
});


// Counter functionality
const counterValue = document.getElementById('counter-value');
async function fetchCounter() {
    try {
        const response = await axios.get('/counter');
        counterValue.textContent = response.data.count;
    } catch (error) {
        console.error('Error fetching counter:', error);
        counterValue.textContent = 'Error';
    }
}

// Fetch the initial counter value when the page loads
fetchCounter();