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
const startOver = document.getElementById('reset-button');


// Secret button on bottom half of screen so users don't have to reach for input field
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search-input");
    // Add an overlay with instructions
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.bottom = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '60%';
    // overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = -1000;
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    // overlay.style.color = '#fff';
    // overlay.style.fontSize = '18px';
    // overlay.textContent = 'Tap anywhere to start!';
    overlay.style.opacity = 0;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', () => {
        searchInput.focus();
        overlay.style.display = 'none'; // Hide the overlay
    });
});

// Text input field autofocus redundancy
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search-input");
    searchInput.focus();
    
    if ("virtualKeyboard" in navigator) {
        searchInput.addEventListener("focus", () => {
            navigator.virtualKeyboard.show();
        });
    } else {
        console.warn("Virtual Keyboard API not supported in this browser.");
    }

});

// Get the header element by its ID
const secretHeader = document.getElementById('secret-header');

// Add a click event listener to the header
secretHeader.addEventListener('click', () => {
    window.location.href = '/nostr'; // Redirect to the "/nostr" page
});

// Nostr.Build and NIP94 API POST request
async function sendGifMetadata(gifData) {
    try {
        await axios.post('/gifmetadata', gifData);
        console.log('GIF metadata sent successfully.');
    } catch (error) {
        console.error('Error sending GIF metadata:', error);
    }
}

// // Copy to clipboard function
// async function copyToClipboard(text) {
//     const tempInput = document.createElement('input');
//     tempInput.value = text;
//     document.body.appendChild(tempInput);
//     tempInput.select();
//     try {
//         document.execCommand('copy');
//         alert('Copied to clipboard!');
//     } catch (err) {
//         console.error('Fallback failed:', err);
//         alert('Failed to copy text to clipboard.');
//     }
//     document.body.removeChild(tempInput);
// }

async function copyToClipboard(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
        document.execCommand('copy');
        showNotification('Copied to clipboard!');
        console.log('Copied to clipboard!')
    } catch (err) {
        console.error('Fallback failed:', err);
        showNotification('Failed to copy text to clipboard.');
    }
    document.body.removeChild(tempInput);
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');

    // Hide the notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
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
        document.getElementById('next-container').style.display = pos ? 'flex' : 'none';
        // document.getElementById('load-more-button').style.display = pos ? 'block' : 'none';
        // console.log('Load More button display:', loadMore.style.display);

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
// searchInput.addEventListener('keypress', async (e) => {
//     if (e.key === 'Enter') {
//         pos = null;  // Reset pos for a new search
//         pos = await searchGifs(pos);  // Initial search
//     }
// });
searchInput.addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') {
        pos = null;  // Reset pos for a new search
        pos = await searchGifs(pos);  // Initial search
        // Remove focus from the input field to close the keyboard
        this.blur();  // 'this' now refers to the input element
    }
});

// Load more button functionality
loadMore.addEventListener('click', async () => {
    console.log('Load More button clicked');
    console.log('Current pos value:', pos);
    pos = await searchGifs(pos);
});

// Start over button functionality
startOver.addEventListener('click', async () => {
    resultsDiv.innerHTML = '';
    searchInput.value = ''
    document.getElementById('next-container').style.display = 'none';
    searchInput.focus()
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