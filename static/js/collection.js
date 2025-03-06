// Variable & Element ID initialization
let pos = null
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-stuff');
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
// const tempText = document.getElementById("temp-text")
const publishButton = document.getElementById('publish-button');
const toggleButton = document.getElementById('toggle-button')

// Text input field autofocus redundancy
document.addEventListener("DOMContentLoaded", function () {
    console.log(collectionData)
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
        console.log(collectionObj)

        // Set title explicitly
        collectionData.collectionTitle = collectionObj.title;

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
            let media;
        
            if (data.thumb.endsWith('.mp4')) {
                media = document.createElement('video');
                media.src = data.thumb;
                media.controls = false; // Show video controls
                media.autoplay = true; // Optional: prevent autoplay
                media.loop = true; // Enable looping if needed
                media.muted = true; // Muted by default
                media.className = 'video'; // Add necessary classes
                
                // const source = document.createElement('source');
                // source.src = data.thumb;
                // source.type = 'video/mp4';
                // media.appendChild(source);
            } else {
                media = document.createElement('img');
                media.src = data.thumb;
                media.alt = data.alt;
                media.className = 'gif'; // Add necessary classes
        
                // Add data attributes specific to images
                media.dataset.gifUrl = data.gif;
                media.dataset.thumb = data.thumb;
                media.dataset.gifSize = data.size;
                media.dataset.gifDims = data.dims;
            }
        
            // Add common attributes
            media.title = title;
            media.dataset.image = data.image;
            media.dataset.summary = data.summary;
        
            collectionDiv.appendChild(media);
        }
        

        // Clear the stored data after loading
        localStorage.removeItem('editCollection');
        publishButton.classList.add('enabled');
        publishButton.classList.remove('disabled');
        // tempText.style.display = 'none';
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
    // tempText.style.display = 'none';
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
            // tempText.style.display = 'flex';
            // collectionDiv.style.display = 'none';
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
    const imageElements = document.querySelectorAll('.gif, .video');  // Include both image and video classes
    imageElements.forEach(media => {
        media.remove();
    });

    // Hide modal (if modal is open)
    modal.style.display = "none";

    // Hide publish box if no images remain
    if (collectionData.images.size === 0) {
        // publishBox.style.display = 'none';
        publishButton.classList.add('disabled');
        publishButton.classList.remove('enabled');
        // tempText.style.display = 'flex';
        // collectionDiv.style.display = 'none';
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
            // resultsDiv.innerHTML = ''; 
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
    resultsDiv.innerHTML = ''; 
    if (toggleButton.classList.contains('enabled')) {
        pos = null;  // Reset pos for a new search
        pos = await searchGifs(pos);  // Initial search
    } else {
        await getMemes();
        pos = null;  // Reset pos for a new search
        pos = await searchNostr(pos);  // Initial search
    }
});

searchInput.addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') {
        resultsDiv.innerHTML = ''; 
        if (toggleButton.classList.contains('enabled')) {
            pos = null;  // Reset pos for a new search
            pos = await searchGifs(pos);  // Initial search
        } else {
            await getMemes();
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
                // resultsDiv.innerHTML = '';

                // Loop through the memes and display them
                memes.forEach(meme => {
                    const { id, name, url, width, height, box_count, captions } = meme;

                    // const memeContainer = document.createElement('div');
                    // memeContainer.className = 'meme-container';

                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = name;
                    // Attach dataset attributes
                    img.dataset.gifUrl = url;
                    img.dataset.image = url;
                    img.dataset.alt = name;
                    // img.width = 300;  // Resize image if needed
                    // img.height = 200; // Resize image if needed
                    // img.className = 'meme-image';
                    img.className = 'gif';
                    img.addEventListener('click', () => {
                        // On click, load the meme's details or use for captioning
                        console.log(`Meme clicked: ${name}`);
                        sendMemeMetadata({
                            url: url,
                            name: name,
                            searchTerm: searchTerm
                        });
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

// Nostr.Build and NIP94 API POST request
async function sendMemeMetadata(memeData) {
    try {
        await axios.post('/mememetadata', memeData);
        console.log('Meme metadata sent successfully.');
    } catch (error) {
        console.error('Error sending Meme metadata:', error);
    }
}

// // Upload direct function
// // TODO: Files need to be hosted somewhere
// document.getElementById('collectionUpload').addEventListener('click', () => {
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = 'image/*,video/*';
//     input.multiple = true;

//     input.addEventListener('change', (event) => {
//         const files = Array.from(event.target.files).slice(0, 50); // Limit to 50 files
//         const MAX_SIZE = 21 * 1024 * 1024; // 21 MiB in bytes
//         const rejectedFiles = [];

//         files.forEach(file => {
//             if (file.size > MAX_SIZE) {
//                 rejectedFiles.push(file.name);
//                 return; // Skip this file
//             }

//             const uniqueId = getUniqueTitle(file.name);
//             const mediaUrl = URL.createObjectURL(file);
//             let mediaElement;

//             if (file.type.startsWith('video/')) {
//                 mediaElement = document.createElement('video');
//                 mediaElement.controls = true;
//                 mediaElement.loop = true;
//                 mediaElement.muted = true;
//                 mediaElement.className = 'video';

//                 const source = document.createElement('source');
//                 source.src = mediaUrl;
//                 source.type = file.type;
//                 mediaElement.appendChild(source);
//             } else {
//                 mediaElement = document.createElement('img');
//                 mediaElement.src = mediaUrl;
//                 mediaElement.alt = file.name;
//                 mediaElement.className = 'gif';
//             }

//             mediaElement.title = uniqueId;
//             mediaElement.dataset.image = mediaUrl;
//             mediaElement.dataset.summary = file.name;

//             collectionData.images.set(uniqueId, {
//                 gif: mediaUrl,
//                 thumb: mediaUrl,
//                 alt: file.name,
//                 size: file.size,
//                 dims: '',
//                 image: mediaUrl,
//                 summary: file.name
//             });

//             collectionDiv.appendChild(mediaElement);
//         });

//         if (rejectedFiles.length > 0) {
//             alert(`The following files are too large (> 21 MiB) and were not uploaded:\n\n${rejectedFiles.join("\n")}`);
//         }

//         if (collectionData.images.size > 0) {
//             publishButton.classList.add('enabled');
//             publishButton.classList.remove('disabled');
//             collectionDiv.style.display = 'grid';
//         }
//     });

//     input.click();
// });

document.getElementById('collectionUpload').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;

    input.addEventListener('change', async (event) => {
        document.getElementById('loadingIndicator').style.display = 'block';
        const files = Array.from(event.target.files).slice(0, 50); // Limit to 50 files
        const MAX_SIZE = 21 * 1024 * 1024; // 21 MiB in bytes
        const rejectedFiles = [];
        const uploadPromises = [];

        files.forEach(file => {
            if (file.size > MAX_SIZE) {
                rejectedFiles.push(file.name);
                return; // Skip this file
            }

            const uniqueId = getUniqueTitle(file.name);
            const formData = new FormData();
            formData.append('file', file);

            // Upload file to the backend API
            const uploadPromise = fetch('/urlgenerator', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.url) {
                    let mediaElement;

                    if (file.type.startsWith('video/')) {
                        mediaElement = document.createElement('video');
                        mediaElement.controls = true;
                        mediaElement.loop = true;
                        mediaElement.muted = true;
                        mediaElement.className = 'video';

                        const source = document.createElement('source');
                        source.src = data.url; // Use hosted URL
                        source.type = file.type;
                        mediaElement.appendChild(source);
                    } else {
                        mediaElement = document.createElement('img');
                        mediaElement.src = data.url; // Use hosted URL
                        mediaElement.alt = file.name;
                        mediaElement.className = 'gif';
                    }

                    mediaElement.title = uniqueId;
                    mediaElement.dataset.image = data.url;
                    mediaElement.dataset.summary = file.name;

                    collectionData.images.set(uniqueId, {
                        gif: data.url,
                        thumb: data.url,
                        alt: file.name,
                        size: file.size,
                        dims: '',
                        image: data.url,
                        summary: file.name
                    });

                    collectionDiv.appendChild(mediaElement);
                } else {
                    console.error(`Failed to upload ${file.name}:`, data.error);
                }
            })
            .catch(error => {
                console.error(`Error uploading ${file.name}:`, error);
            });

            uploadPromises.push(uploadPromise);
        });

        await Promise.all(uploadPromises);
        document.getElementById('loadingIndicator').style.display = 'none';

        if (rejectedFiles.length > 0) {
            alert(`The following files are too large (> 21 MiB) and were not uploaded:\n\n${rejectedFiles.join("\n")}`);
        }

        if (collectionData.images.size > 0) {
            publishButton.classList.add('enabled');
            publishButton.classList.remove('disabled');
            collectionDiv.style.display = 'grid';
        }
    });

    input.click();
});
