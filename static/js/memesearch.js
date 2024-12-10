// Variable & Element ID initialization
let pos = null
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const trendingButton = document.getElementById('trending-button');
const resultsDiv = document.getElementById('results');
const zapButton = document.getElementById('zapButton');
const zapPopup = document.getElementById('zapPopup');
const uploadButton = document.getElementById('uploadButton');
const uploadPopup = document.getElementById('uploadPopup');
const uploadForm = document.getElementById('uploadForm');
const uploadResults = document.getElementById('uploadResults');
const loadMore = document.getElementById('load-more-button');
const startOver = document.getElementById('reset-button');
const memeGif = document.getElementById('meme-gif-button');
const instructions = document.getElementById('instructions');

// Text input field autofocus redundancy
document.addEventListener("DOMContentLoaded", function () {
    // const searchInput = document.getElementById("search-input");
    // searchInput.focus();
    
    // if ("virtualKeyboard" in navigator) {
    //     searchInput.addEventListener("focus", () => {
    //         navigator.virtualKeyboard.show();
    //     });
    // } else {
    //     console.warn("Virtual Keyboard API not supported in this browser.");
    // }

    getMemes();  // Initial search

});

// Nostr.Build and NIP94 API POST request
async function sendMemeMetadata(memeData) {
    try {
        await axios.post('/mememetadata', memeData);
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
        // Copy text to clipboard
        document.execCommand('copy');
        // await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard!');

        // Save the text in localStorage for the next page
        localStorage.setItem('copiedText', text);
        console.log('Copied to clipboard and saved to local storage!')

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

// Primary function to fetch meme templates
async function getMemes() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        console.log('No search term, returning');
        return;
    }

    try {  
        const response = await axios.post('/search_memes', {
            q: searchTerm
        });
    
        console.log('Search response received:', response.data);        

        // Check if the response was successful
        if (Array.isArray(response.data)) {
            if (response.data.length === 0) {
                instructions.src = 'https://image.nostr.build/bc17dfeab7d8b95f6011a32d010be09250802bdaee18c7ca79619ad8edf00c4a.png';
            } else {
                const memes = response.data;

                // Hide instructions
                instructions.style.display = 'none';

                // Clear existing meme results
                resultsDiv.innerHTML = '';

                // Loop through the memes and display them
                memes.forEach(meme => {
                    const { id, name, url, width, height, box_count, captions } = meme;

                    // const memeContainer = document.createElement('div');
                    // memeContainer.className = 'meme-container';

                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = name;
                    // img.width = 300;  // Resize image if needed
                    // img.height = 200; // Resize image if needed
                    // img.className = 'meme-image';
                    img.className = 'gif';
                    img.addEventListener('click', () => {
                        // On click, load the meme's details or use for captioning
                        console.log(`Meme clicked: ${name}`);
                        copyToClipboard(url);
                        localStorage.setItem('meme_url', url);
                        localStorage.setItem('template_id', id);
                        sendMemeMetadata({
                            url: url,
                            name: name,
                            searchTerm: searchTerm
                        });

                        window.location.href = '/memecaption';
                    });

                    // Append the image and its details
                    // memeContainer.appendChild(img);

                    // Append to the results div
                    // resultsDiv.appendChild(memeContainer);
                    resultsDiv.appendChild(img);

                    document.getElementById('next-container').style.display = 'flex';
                })
            };
        } else {
            console.error('Failed to fetch memes:', response.data.error_message);
            instructions.src = 'https://image.nostr.build/e8f8ed2e971b4c5be1ddf77200a692f13ac901f97558159100f5a6f46ee70aeb.png'
        }
    } catch (error) {
        console.error('Error fetching memes:', error);
        instructions.src = 'https://image.nostr.build/e8f8ed2e971b4c5be1ddf77200a692f13ac901f97558159100f5a6f46ee70aeb.png'
    }
}


// Allows user to initiate search by click or enter
searchButton.addEventListener('click', async () => {
    pos = null;  // Reset pos for a new search
    pos = await getMemes();  // Initial search
});
searchInput.addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') {
        pos = null;  // Reset pos for a new search
        pos = await getMemes();  // Initial search
        // Remove focus from the input field to close the keyboard
        this.blur();  // 'this' now refers to the input element
    }
});

// // Load more button functionality
// loadMore.addEventListener('click', async () => {
//     console.log('Load More button clicked');
//     console.log('Current pos value:', pos);
//     pos = await getMemes();
// });

// Start over button functionality
startOver.addEventListener('click', async () => {
    resultsDiv.innerHTML = '';
    searchInput.value = '';
    instructions.style.display = 'flex';
    document.getElementById('next-container').style.display = 'none';
    searchInput.focus()
});

// Allows user to initiate search by click or enter
trendingButton.addEventListener('click', async () => {
    pos = null;  // Reset pos for a new search
    pos = await getTrending();  // Initial search
});

// Primary function to fetch meme templates
async function getTrending() {
    try {  
        const response = await axios.get('/trending_memes');
    
        console.log('Search response received:', response.data);        

        // Check if the response was successful
        if (Array.isArray(response.data)) {
            const memes = response.data;

            // Hide instructions
            instructions.style.display = 'none';

            // Clear existing meme results
            resultsDiv.innerHTML = '';

            // Loop through the memes and display them
            memes.forEach(meme => {
                const { id, name, url, width, height, box_count, captions } = meme;

                // const memeContainer = document.createElement('div');
                // memeContainer.className = 'meme-container';

                const img = document.createElement('img');
                img.src = url;
                img.alt = name;
                // img.width = 300;  // Resize image if needed
                // img.height = 200; // Resize image if needed
                // img.className = 'meme-image';
                img.className = 'gif';
                img.addEventListener('click', () => {
                    // On click, load the meme's details or use for captioning
                    console.log(`Meme clicked: ${name}`);
                    copyToClipboard(url);
                    localStorage.setItem('meme_url', url);
                    localStorage.setItem('template_id', id);
                    sendMemeMetadata({
                        url: url,
                        name: name,
                        searchTerm: ''
                    });

                    window.location.href = '/memecaption';
                });

                // Append the image and its details
                // memeContainer.appendChild(img);

                // Append to the results div
                // resultsDiv.appendChild(memeContainer);
                resultsDiv.appendChild(img);

                document.getElementById('next-container').style.display = 'flex';
            });
        } else {
            console.error('Failed to fetch memes:', response.data.error_message);
            instructions.src = 'https://image.nostr.build/e8f8ed2e971b4c5be1ddf77200a692f13ac901f97558159100f5a6f46ee70aeb.png'
        }
    } catch (error) {
        console.error('Error fetching memes:', error);
        instructions.src = 'https://image.nostr.build/e8f8ed2e971b4c5be1ddf77200a692f13ac901f97558159100f5a6f46ee70aeb.png'
    }
}

// Counter functionality
const counterValue = document.getElementById('counter-value');
async function fetchCounter() {
    try {
        const response = await axios.get('/memecounter');
        counterValue.textContent = response.data.count;
    } catch (error) {
        console.error('Error fetching counter:', error);
        counterValue.textContent = 'Error';
    }
}

// Fetch the initial counter value when the page loads
fetchCounter();