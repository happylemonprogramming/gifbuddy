// Variable & Element ID initialization
let pos = null
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsDiv = document.getElementById('results');
const collectionDiv = document.getElementById('collection');
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
const publishBox = document.getElementById('publish-box')

const modal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const modalText = document.getElementById("modalText");
const modalClose = document.querySelector(".modal-close");
const modalSave = document.getElementById("save-button");
const modalRemove = document.getElementById("remove-button");
const tempText = document.getElementById("temp-text")
const publishButton = document.getElementById('publish-button');

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
        instructions.style.display = 'none';

        // If it's the initial search, clear the results
        if (pos == null) {
            resultsDiv.innerHTML = '';
        }

        Object.entries(response.data).forEach(([alt, gifData]) => {
            if (alt !== 'next') {
                const { gifUrl, gifSize, gifDims, thumb, preview, alt, image, summary } = gifData;
                const img = document.createElement('img');
                img.src = preview;
                img.alt = alt;
                img.className = 'gif';
                
                // Store the gifData directly on the image element
                img.dataset.gifUrl = gifUrl;
                img.dataset.thumb = thumb;
                img.dataset.gifSize = gifSize;
                img.dataset.gifDims = gifDims;
                img.dataset.image = image;
                img.dataset.summary = summary;
                
                resultsDiv.appendChild(img);
            }
        });

        // Update pos with the new position for the next load more action
        pos = response.data.next;
        document.getElementById('next-container').style.display = pos ? 'flex' : 'none';

        return pos;

    } catch (error) {
        console.error('Error fetching GIFs:', error);
        instructions.src = "https://image.nostr.build/466d168475ae7032109c18722774d407f0c7a920935336a2349f1c752fec385e.gif"
        return null;
    }
}

// Nostr.Build and NIP94 API POST request
async function sendGifMetadata(gifData) {
    try {
        await axios.post('/gifmetadata', gifData);
        console.log('GIF metadata sent successfully.');
    } catch (error) {
        console.error('Error sending GIF metadata:', error);
    }
}

// Single event listener for search results clicks
resultsDiv.addEventListener('click', (e) => {
    showNotification('Added!')
    if (e.target.tagName === "IMG") {
        const img = e.target;
        const searchTerm = searchInput.value.trim().replace(/\s+/g, '-');
        
        // Get a unique title
        const uniqueId = getUniqueTitle(searchTerm);
        
        // Create a clone of the image for the collection
        const collectionImg = img.cloneNode(true);
        collectionImg.title = uniqueId;
        
        // Store the image data using the dataset values we attached
        collectionData.images.set(uniqueId, {
            gif: img.dataset.gifUrl,
            thumb: img.dataset.thumb
        });
        
        // Add to collection display
        // publishBox.style.display = 'block';
        publishButton.classList.add('enabled');
        publishButton.classList.remove('disabled');
        tempText.style.display = 'none';
        collectionDiv.style.display = 'grid';
        collectionDiv.appendChild(collectionImg);
        
        console.log('Added image:', Object.fromEntries(collectionData.images));
    
        const gifUrl = img.dataset.gifUrl;
        const gifSize = img.dataset.gifSize;
        const gifDims = img.dataset.gifDims;
        const thumb = img.dataset.thumb;
        const preview = img.src;
        const alt = img.alt;
        const image = img.dataset.image;
        const summary = img.dataset.summary;

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
    }
});

// Allows user to initiate search by click or enter
searchButton.addEventListener('click', async () => {
    pos = null;  // Reset pos for a new search
    pos = await searchGifs(pos);  // Initial search
});
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
    searchInput.value = '';
    // instructions.style.display = 'flex';
    document.getElementById('next-container').style.display = 'none';
    searchInput.focus()
});

// Modal remove button
modalRemove.addEventListener("click", () => {
    if (currentImage) {
        // Remove from collectionData storage
        collectionData.images.delete(currentImage.title);
        // Remove from display
        currentImage.remove();
        // Hide modal
        modal.style.display = "none";
        // Hide publish box if no images remain
        if (collectionData.images.size === 0) {
            // publishBox.style.display = 'none';
            publishButton.classList.add('disabled');
            publishButton.classList.remove('enabled');
            tempText.style.display = 'flex';
            collectionDiv.style.display = 'none';
        }
        console.log('Updated collection:', Object.fromEntries(collectionData.images));
    }
});

// Modal save button
modalSave.addEventListener("click", () => {
    saveTitle();
    modal.style.display = "none";
});

// Modal close button
modalClose.addEventListener("click", () => {
    saveTitle();
    modal.style.display = "none";
});

// Close modal when clicking outside
window.addEventListener("click", (e) => {
    if (e.target === modal) {
        saveTitle();
        modal.style.display = "none";
    }
});

// Store all collection data
const collectionData = {
    images: new Map(), // Stores image data by title
    collectionTitle: '' // Will store the collection input text
};
let currentImage = null;

// Function to get a unique title
function getUniqueTitle(baseTitle) {
    let title = baseTitle;
    let counter = 1;
    
    // Keep checking and incrementing until we find a unique title
    while (collectionData.images.has(title)) {
        title = `${baseTitle}${counter}`;
        counter++;
    }
    
    return title;
}



// Event listener for image clicks in the collection (for editing)
collectionDiv.addEventListener("click", (e) => {
    if (e.target.tagName === "IMG") {
        currentImage = e.target;
        modalImage.src = currentImage.src;
        modalImage.title = currentImage.title;
        modalText.value = currentImage.title;
        modal.style.display = "block";
    }
});

// Function to save the updated title
function saveTitle() {
    if (currentImage && modalText.value !== "") {
        const oldTitle = currentImage.title;
        const newTitle = modalText.value.trim().replace(/\s+/g, '-');
        
        // Get the existing data
        const data = collectionData.images.get(oldTitle);
        
        // Update with new title
        if (data) {
            collectionData.images.delete(oldTitle);
            collectionData.images.set(newTitle, data);
            currentImage.title = newTitle;
        }
        
        console.log('Updated collection:', Object.fromEntries(collectionData.images));
    }
}

modalText.addEventListener("input", function () {
    if (modalText.value.includes(" ")) {
      modalText.classList.add("error"); // Add red border
    } else {
      modalText.classList.remove("error"); // Revert border color
    }
  });

// Function to prepare final data structure for submission
function prepareSubmissionData() {
    const formattedImages = {};
    
    // Convert the Map entries to the desired format
    for (const [title, data] of collectionData.images) {
        formattedImages[title] = {
            gif: data.gif,
            thumb: data.thumb
        };
    }
    
    return {
        [collectionData.collectionTitle]: formattedImages
    };
}

// Add an input for collection title
const collectionInput = document.getElementById('collection-input');
collectionInput.addEventListener('input', (e) => {
    collectionData.collectionTitle = e.target.value;
});

// Function to generate collection tags
function collectionTags(collection) {
    const title = Object.keys(collection)[0];

    const tags = [
        ["d", title],
        ["title", title]
    ];
    const shortcodes = Object.keys(collection[title]);

    shortcodes.forEach(shortcode => {
        const gif = collection[title][shortcode]['gif'];
        const reaction = ["emoji", shortcode, gif];
        tags.push(reaction);
    });

    return tags;
}

// Event listener for publish button
publishButton.addEventListener('click', async () => {
    if (collectionData.images.size === 0) {
        alert('Collection Empty')
    } else {
        const finalData = prepareSubmissionData();
        console.log('Publishing collection:', finalData);
    
        if (window.nostr) {
            try {
                // Generate tags using the collectionTags function
                const tags = collectionTags(finalData);
    
                // Prepare the event object
                const event = {
                    created_at: Math.floor(Date.now() / 1000),
                    kind: 30030, // Specific kind value
                    tags: tags, // Generated tags
                    content: "" // Empty string as content
                };
    
                // Sign the event
                const signedEvent = await window.nostr.signEvent(event);
                console.log('Signed Event:', signedEvent);
    
                // POST the signed event to /buddyblastr
                const response = await fetch('/buddyblastr', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ event: signedEvent }),
                });
    
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
    
                const result = await response.json();
                console.log('Response from server:', result);
                showNotification('Published!')
    
            } catch (error) {
                alert('Error signing or posting event.')
                console.error('Error signing or posting event:', error);
            }
        } else {
            alert('Ensure you have the necessary browser extension.')
            console.error('window.nostr is not available. Ensure you have the necessary browser extension.');
        }
    }
});

