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
// const loadMore = document.getElementById('load-more-button');
const startOver = document.getElementById('reset-button');
const instructions = document.getElementById('instructions');


// Text input field autofocus redundancy
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search-input");
    searchInput.focus();
});

// // Get the header element by its ID
// const secretHeader = document.getElementById('secret-header');

// // Add a click event listener to the header
// secretHeader.addEventListener('click', () => {
//     window.location.href = '/'; // Redirect to the "/nostr" page
// });

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
    }, 2250);
}

// // Primary GIF search function
// async function searchGifs(pos) {
//     const searchTerm = searchInput.value.trim();
//     if (!searchTerm) {
//         console.log('No search term, returning');
//         return;
//     }

//     try {
//         // Make a POST request to the NIP94 search endpoint
//         const response = await axios.post('/nip94', {
//             q: searchTerm,
//             pos: pos // Include position (if any) for pagination
//         });

//         console.log('Search response received:', response.data);

//         // Extract the GIFs array from the API response
//         const gifs = response.data.gifs;

//         // If the GIFs array is empty, alert the user
//         if (!gifs || gifs.length === 0) {
//             showNotification('Try something else');
//             searchInput.value = ''; // Clear the input field
//             setTimeout(() => {
//                 searchInput.focus(); // Set focus on the input field
//             }, 2250); // Adjust the delay as needed (250ms here)
//             return;
//         }

//         // If it's the initial search, clear the results
//         if (pos == null) {
//             instructions.style.display = 'none';
//             resultsDiv.innerHTML = ''; // Clear results only for the initial search
//         }

//         // Iterate over the GIFs array and append them to the results div
//         gifs.forEach((gifUrl) => {
//             const img = document.createElement('img');
//             img.src = gifUrl;
//             img.alt = 'GIF'; // Generic alt text for now
//             img.className = 'gif';
//             img.addEventListener('click', () => {
//                 copyToClipboard(gifUrl);
//                 // sendGifMetadata({ gifUrl, searchTerm }); //No need to send metadata again
//             });
//             resultsDiv.appendChild(img);
//         });

//         // Handle "Load More" button
//         pos = null; // Currently, there's no pagination support in the new endpoint
//         document.getElementById('next-container').style.display = 'flex'; // Show Start Over button
//         // console.log('Load More button hidden due to lack of pagination.');

//         return pos; // Return the updated pos (always null here)

//     } catch (error) {
//         console.error('Error fetching GIFs:', error);
//         resultsDiv.innerHTML = 'An error occurred while fetching GIFs.';
//         return null; // Return null in case of error
//     }
// }


// Primary GIF search function
async function searchGifs(pos) {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        console.log('No search term, returning');
        return;
    }

    try {
        document.getElementById('loadingIndicator').style.display = 'block';
        // Make a POST request to the NIP94 search endpoint
        const response = await axios.post('/nip94', {
            q: searchTerm,
            pos: pos // Include position (if any) for pagination
        });

        console.log('Search response received:', response.data);

        // Extract the GIFs array from the API response
        const gifs = response.data;

        // If the GIFs array is empty, alert the user
        if (!gifs || gifs.length === 0) {
            document.getElementById('loadingIndicator').style.display = 'none';
            showNotification('Try something else');
            searchInput.value = ''; // Clear the input field
            setTimeout(() => {
                searchInput.focus(); // Set focus on the input field
            }, 2250); // Adjust the delay as needed
            return;
        }

        // If it's the initial search, clear the results
        if (pos == null) {
            instructions.style.display = 'none';
            resultsDiv.innerHTML = ''; // Clear results only for the initial search
        }

        // // Iterate over the GIFs array and append them to the results div
        // gifs.forEach(({ thumb, url }) => {
        //     const gifContainer = document.createElement('div');
        //     gifContainer.className = 'gif-container';

        //     const img = document.createElement('img');
        //     console.log(thumb)
        //     img.src = thumb;
        //     img.alt = 'GIF'; // Generic alt text for now
        //     img.className = 'gif';
        //     // img.title = `Relevance Score: ${score.toFixed(4)}`; // Optional tooltip for score

        //     img.addEventListener('click', () => {
        //         copyToClipboard(url);
        //         showNotification('URL copied to clipboard!');
        //     });

        //     gifContainer.appendChild(img);
        //     resultsDiv.appendChild(gifContainer);
        //     document.getElementById('loadingIndicator').style.display = 'none';
        // });

        gifs.forEach(({ thumb, url }) => {
            const container = document.createElement('div');
            container.className = 'gif-container';
    
            // Determine if the URL is an MP4
            const isMP4 = url.toLowerCase().endsWith('.mp4');
    
            if (isMP4) {
                // Create video element for MP4s
                const video = document.createElement('video');
                video.src = thumb;
                video.className = 'gif'; // Keep same class for consistent styling
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.controls = false; // Hide video controls
                
                // Ensure video loads and plays
                video.addEventListener('loadeddata', () => {
                    video.play().catch(console.error);
                });
    
                // Add click handler
                video.addEventListener('click', () => {
                    copyToClipboard(url);
                    showNotification('URL copied to clipboard!');
                });
    
                container.appendChild(video);
            } else {
                // Original image handling for GIFs
                const img = document.createElement('img');
                img.src = thumb;
                img.alt = 'GIF';
                img.className = 'gif';
    
                img.addEventListener('click', () => {
                    copyToClipboard(url);
                    showNotification('URL copied to clipboard!');
                });
    
                container.appendChild(img);
            }
    
            resultsDiv.appendChild(container);
        });
        
        document.getElementById('loadingIndicator').style.display = 'none';

        // Handle "Load More" button
        pos = null; // Currently, there's no pagination support in the new endpoint
        document.getElementById('next-container').style.display = 'flex'; // Show Start Over button

        return pos; // Return the updated pos (always null here)

    } catch (error) {
        document.getElementById('loadingIndicator').style.display = 'none';
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

// Allows user to initiate search by click or enter
// loadMore.addEventListener('click', async () => {
//     console.log('Load More button clicked');
//     console.log('Current pos value:', pos);
//     pos = await searchGifs(pos);
// });

// Start over button functionality
startOver.addEventListener('click', async () => {
    resultsDiv.innerHTML = '';
    searchInput.value = '';
    instructions.style.display = 'flex';
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