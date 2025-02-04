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
const modalVideo = document.getElementById("modalVideo");
const modalText = document.getElementById("modalText");
const modalClose = document.querySelector(".modal-close");
const modalSave = document.getElementById("save-button");
const modalRemove = document.getElementById("remove-button");
const tempText = document.getElementById("temp-text")
const publishButton = document.getElementById('publish-button');
const toggleButton = document.getElementById('toggle-button')

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

// Add this at the start of your collection page JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Check if we have stored collection data
    const storedCollection = localStorage.getItem('editCollection');
    if (storedCollection) {
        const collectionObj = JSON.parse(storedCollection);
        
        // Set the collection title if you have a title input
        const collectionInput = document.getElementById('collection-input');
        if (collectionInput) {
            collectionInput.value = collectionObj.title;
        }

        // Convert the stored object back to the Map format your code expects
        collectionData.images = new Map(Object.entries(collectionObj.images));
        
        // Display the images in your collection div
        const collectionDiv = document.getElementById('collection');
        for (const [title, data] of collectionData.images) {
            const img = document.createElement('img');
            img.src = data.thumb;
            img.alt = data.alt;
            img.title = title;
            img.className = 'gif'; // Add any necessary classes
            
            // Add all the data attributes
            img.dataset.gifUrl = data.gif;
            img.dataset.thumb = data.thumb;
            img.dataset.gifSize = data.size;
            img.dataset.gifDims = data.dims;
            img.dataset.image = data.image;
            img.dataset.summary = data.summary;
            
            collectionDiv.appendChild(img);
        }

        // Clear the stored data after loading
        localStorage.removeItem('editCollection');
        publishButton.classList.add('enabled');
        publishButton.classList.remove('disabled');
        tempText.style.display = 'none';
        collectionDiv.style.display = 'grid';    }
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
                img.loading = 'lazy'; // Enable lazy loading
                
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
    const content = e.target;
    const searchTerm = searchInput.value.trim().replace(/\s+/g, '-');
    
    // Get a unique title and create a clone of the image for the collection
    const uniqueId = getUniqueTitle(searchTerm);
    const collectionImg = content.cloneNode(true);
    collectionImg.title = uniqueId;  

    if (e.target.tagName === "VIDEO") {
        // Store the image data using the dataset values we attached
        console.log(content)
        console.log(content.dataset)
        collectionData.images.set(uniqueId, {
            gif: content.dataset.gifUrl,
            thumb: content.dataset.thumb,
            alt: content.dataset.alt,
            size: content.dataset.gifSize,
            dims: content.dataset.gifDims,
            image: content.dataset.image,
            summary: content.dataset.summary
        });
    }

    if (e.target.tagName === "IMG") {
        // Store the image data using the dataset values we attached
        collectionData.images.set(uniqueId, {
            gif: content.dataset.gifUrl,
            thumb: content.dataset.thumb,
            alt: content.alt,
            size: content.dataset.gifSize,
            dims: content.dataset.gifDims,
            image: content.dataset.image,
            summary: content.dataset.summary
        });
    }

    // Add to collection display
    // publishBox.style.display = 'block';
    publishButton.classList.add('enabled');
    publishButton.classList.remove('disabled');
    tempText.style.display = 'none';
    collectionDiv.style.display = 'grid';
    collectionDiv.appendChild(collectionImg);
    
    console.log('Added image:', Object.fromEntries(collectionData.images));

    if (toggleButton.classList.contains('disabled')) {
        const gifUrl = content.dataset.gifUrl;
        const gifSize = content.dataset.gifSize;
        const gifDims = content.dataset.gifDims;
        const thumb = content.dataset.thumb;
        const preview = content.src;
        const alt = content.alt;
        const image = content.dataset.image;
        const summary = content.dataset.summary;

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
        modalImage.style.display = "block";
        modalVideo.style.display = "none";
        currentImage = e.target;
        modalImage.src = currentImage.src;
        modalImage.title = currentImage.title;
        modalText.value = currentImage.title;
        modal.style.display = "block";
    } 

    if (e.target.tagName === "VIDEO") {
        modalVideo.style.display = "block";
        modalImage.style.display = "none";
        currentImage = e.target;
        modalVideo.src = currentImage.src;
        modalVideo.title = currentImage.title;
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
            thumb: data.thumb,
            alt: data.alt,
            size: data.size,
            dims: data.dims,
            image: data.image,
            summary: data.summary
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
async function collectionTags(collection) {
    const title = Object.keys(collection)[0];

    const tags = [
        ["d", title],
        ["title", title]
    ];
    const shortcodes = Object.keys(collection[title]);

    // Use for...of to properly await asynchronous operations
    for (const shortcode of shortcodes) {
        const gif = collection[title][shortcode]['gif'];
        const thumb = collection[title][shortcode]['thumb'];
        const alt = collection[title][shortcode]['alt'];
        const size = collection[title][shortcode]['size'];
        const dims = collection[title][shortcode]['dims'];
        const image = collection[title][shortcode]['image'];
        const summary = collection[title][shortcode]['summary']; 
        
        console.log('LOOK HERE')
        console.log(collection[title][shortcode])

        // Await the SHA-256 hash
        const x = await getSHA256Hash(gif);

        // Construct the reaction array with the defined constants
        const reaction = [
            "imeta",
            `url ${gif}`,
            "m image/gif",
            `dim ${dims}`,
            `size ${size}`,
            `alt ${alt}`,
            `summary ${summary}`,
            `x ${x}`,
            `thumb ${thumb}`,
            `image ${image}`,
            `shortcode ${shortcode}`
        ];

        console.log(reaction)

        tags.push(reaction);
    }

    return tags;
}

async function getSHA256Hash(url) {
    // Fetch the file from the URL
    console.log("Getting SHA256 Hash for:")
    console.log(url)
    const response = await fetch(url);
    
    // Check if the request was successful
    if (!response.ok) {
      throw new Error('Failed to fetch the file');
    }
  
    // Get the file as an ArrayBuffer
    const fileBuffer = await response.arrayBuffer();
  
    // Use SubtleCrypto API to compute the SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
  
    // Convert the hash ArrayBuffer to a hexadecimal string
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // Create an array of bytes
    const hexString = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join(''); // Convert bytes to hex
  
    return hexString;
}

// Function to remove all images
function removeAllImages() {
    // Remove all images from collectionData storage
    collectionData.images.clear();  // Clears all images in the collectionData

    // Remove all images from display
    const imageElements = document.querySelectorAll('.image-class');  // Replace with the appropriate class or selector for your images
    imageElements.forEach(image => {
        image.remove();
    });

    // Hide modal (if modal is open)
    modal.style.display = "none";

    // Hide publish box if no images remain
    if (collectionData.images.size === 0) {
        // publishBox.style.display = 'none';
        publishButton.classList.add('disabled');
        publishButton.classList.remove('enabled');
        tempText.style.display = 'flex';
        collectionDiv.style.display = 'none';
    }

    collectionInput.value = ''
    searchInput.value = ''
    resultsDiv.innerHTML = '';
    instructions.style.display = 'block';

    console.log('Updated collection:', Object.fromEntries(collectionData.images));
}

// Event listener for publish button
publishButton.addEventListener('click', async () => {
    if (collectionData.images.size === 0 || collectionInput.value === "") { 
        alert('Collection or Title Empty');
    } else {
        document.getElementById('loadingIndicator').style.display = 'block';
        const finalData = prepareSubmissionData();
        console.log('Publishing collection:', finalData);
    
        if (window.nostr) {
            try {
                // Generate tags using the collectionTags function
                const tags = await collectionTags(finalData);
    
                // Prepare the event object
                const event = {
                    created_at: Math.floor(Date.now() / 1000),
                    kind: 30169, // Specific kind value
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
                removeAllImages()
                document.getElementById('loadingIndicator').style.display = 'none';
                showNotification('Published!')
    
            } catch (error) {
                alert('Error signing or posting event.')
                console.error('Error signing or posting event:', error);
            }
        } else {
            alert('Ensure you have the necessary browser extension.')
            document.getElementById('loadingIndicator').style.display = 'none';
            console.error('window.nostr is not available. Ensure you have the necessary browser extension.');
        }
    }
});

async function searchNostr(pos) {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        console.log('No search term, returning');
        return;
    }

    try {
        document.getElementById('loadingIndicator').style.display = 'block';
        const response = await axios.post('/nip94', {
            q: searchTerm,
            pos: pos
        });

        console.log('Search response received:', response.data);
        const gifs = response.data;
        console.log(gifs)

        if (!gifs || gifs.length === 0) {
            document.getElementById('loadingIndicator').style.display = 'none';
            showNotification('Try something else');
            searchInput.value = ''; 
            setTimeout(() => searchInput.focus(), 2250);
            return;
        }

        if (pos == null) {
            instructions.style.display = 'none';
            resultsDiv.innerHTML = ''; 
        }

        gifs.forEach(({ thumb, url, gifSize, gifDims, image, summary, alt }) => {
            const container = document.createElement('div');
            container.className = 'gif-container';

            const isMP4 = url.toLowerCase().endsWith('.mp4');

            let mediaElement;

            if (isMP4) {
                mediaElement = document.createElement('video');
                mediaElement.src = thumb;
                mediaElement.className = 'gif';
                mediaElement.autoplay = true;
                mediaElement.loop = true;
                mediaElement.muted = true;
                mediaElement.playsInline = true;
                mediaElement.controls = false;

                mediaElement.addEventListener('loadeddata', () => {
                    mediaElement.play().catch(console.error);
                });

            } else {
                mediaElement = document.createElement('img');
                mediaElement.src = thumb;
                mediaElement.className = 'gif';
            }

            // Attach dataset attributes
            mediaElement.dataset.gifUrl = url;
            mediaElement.dataset.thumb = thumb;
            mediaElement.dataset.gifSize = gifSize;
            mediaElement.dataset.gifDims = gifDims;
            mediaElement.dataset.image = image;
            mediaElement.dataset.summary = summary;
            mediaElement.dataset.alt = alt;

            container.appendChild(mediaElement);
            resultsDiv.appendChild(container);
        });

        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('next-container').style.display = 'flex';

        return null; // Pagination not supported for now

    } catch (error) {
        document.getElementById('loadingIndicator').style.display = 'none';
        console.error('Error fetching GIFs:', error);
        resultsDiv.innerHTML = 'An error occurred while fetching GIFs.';
        return null;
    }
}


// Allows user to initiate search by click or enter
searchButton.addEventListener('click', async () => {
    if (toggleButton.classList.contains('disabled')) {
        pos = null;  // Reset pos for a new search
        pos = await searchGifs(pos);  // Initial search
    } else {
        pos = null;  // Reset pos for a new search
        pos = await searchNostr(pos);  // Initial search
    }
});

searchInput.addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') {
        if (toggleButton.classList.contains('disabled')) {
            pos = null;  // Reset pos for a new search
            pos = await searchGifs(pos);  // Initial search
        } else {
            pos = null;  // Reset pos for a new search
            pos = await searchNostr(pos);  // Initial search
        }
        this.blur();  // 'this' now refers to the input element
    }
});

toggleButton.addEventListener('click', () => {
    if (toggleButton.classList.contains('disabled')) {
        toggleButton.classList.remove('disabled');
        toggleButton.classList.add('enabled');
    } else {
        toggleButton.classList.remove('enabled');
        toggleButton.classList.add('disabled');
    }
});
