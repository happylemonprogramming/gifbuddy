// Variable & Element ID initialization
const resultsDiv = document.getElementById('results');
const favortiesDiv = document.getElementById('favorites');
const zapButton = document.getElementById('zapButton');
const zapPopup = document.getElementById('zapPopup');
const memeGif = document.getElementById('meme-gif-button');
const modal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const modalText = document.getElementById("modalText");
const modalClose = document.querySelector(".modal-close");
const modalSave = document.getElementById("save-button");
const tempText = document.getElementById("temp-text")
const instructions = document.getElementById("instructions")
const gotoButton = document.getElementById("gotoCollectionButton")
const loading = document.getElementById("loadingIndicator")

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');

    // Hide the notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Modal save button
modalSave.addEventListener("click", () => {
    modal.style.display = "none";
});

// Modal close button
modalClose.addEventListener("click", () => {
    modal.style.display = "none";
});

// Close modal when clicking outside
window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

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

// Event listener for image clicks in the collection (for editing)
favortiesDiv.addEventListener("click", (e) => {
    if (e.target.tagName === "IMG" || e.target.tagName === "VIDEO") {
        currentImage = e.target;
        copyToClipboard(currentImage.src)
        // modalImage.src = currentImage.src;
        // modalImage.title = currentImage.title;
        // modalText.value = currentImage.title;
        // modal.style.display = "block";
    }
});

function fetchFavorites(pubkey) {
    loading.style.display = "block";

    if (pubkey.startsWith("npub")) {
        fetch(`/favorite?pubkey=${pubkey}`)
            .then(response => {
                if (!response.ok) {
                    loading.style.display = "none";
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Ensure data is an array
                if (!Array.isArray(data)) {
                    loading.style.display = "none";
                    console.error('Expected an array, but got:', data);
                    alert("Unexpected response from server");
                    return;
                } else if (data.length === 0) {
                    loading.style.display = "none";
                    instructions.style.display = "block";
                    tempText.style.display = "block";
                    gotoButton.style.display = "block";
                    alert('No saved GIFs!');
                } else {
                    const favoritesDiv = document.getElementById('favorites');
                    favoritesDiv.innerHTML = ''; // Clear previous content

                    // Loop through the data
                    data.forEach(item => {
                        const tags = item.tags || [];

                        // Find title from tags
                        const titleTag = tags.find(tag => tag[0] === 'title');
                        const title = titleTag ? titleTag[1] : 'Untitled';

                        // Extract imeta tags for GIFs
                        const imetaTags = tags.filter(tag => tag[0] === 'imeta');
                        const thumbUrls = imetaTags.map(tag => {
                            const thumbIndex = tag.findIndex(entry => entry.startsWith('url '));
                            return thumbIndex !== -1 ? tag[thumbIndex].split(' ')[1] : null;
                        }).filter(url => url); // Remove null values

                        // Skip if no thumbnails are found
                        if (thumbUrls.length === 0) return;

                        // Create a div for this category
                        const categoryDiv = document.createElement('div');
                        categoryDiv.classList.add('category');

                        // Create a container for title and edit button
                        const titleContainer = document.createElement('div');
                        titleContainer.style.display = 'flex';
                        titleContainer.style.alignItems = 'center';
                        titleContainer.style.gap = '10px';

                        // Add title with copy functionality
                        const titleElement = document.createElement('h4');
                        titleElement.innerText = title;
                        titleElement.classList.add('title');
                        titleElement.onclick = () => copyJSON(item); // Attach click event
                        titleContainer.appendChild(titleElement);

                        // Add edit button
                        const editButton = document.createElement('button');
                        editButton.classList.add('editCollection');
                        editButton.innerText = 'Edit';
                        editButton.onclick = () => handleEdit(item); // Attach click event
                        titleContainer.appendChild(editButton);

                        categoryDiv.appendChild(titleContainer);

                        // Add images
                        const imagesContainer = document.createElement('div');
                        imagesContainer.classList.add('images-container');

                        // thumbUrls.forEach(gifUrl => {
                        //     const imgElement = document.createElement('img');
                        //     imgElement.src = gifUrl;
                        //     imgElement.alt = title;
                        //     imagesContainer.appendChild(imgElement);
                        // });

                        thumbUrls.forEach(mediaUrl => {
                            let mediaElement;
                        
                            if (mediaUrl.endsWith('.mp4')) {
                                // Create a video element for MP4 files
                                mediaElement = document.createElement('video');
                                mediaElement.src = mediaUrl;
                                mediaElement.controls = false; // Add controls for play/pause
                                mediaElement.autoplay = true; // Optional: prevent autoplay
                                mediaElement.loop = true; // Optional: prevent looping
                                mediaElement.muted = true; // Optional: allow sound
                                mediaElement.style.maxWidth = "100%"; // Ensure responsive scaling
                            } else {
                                // Create an image element for GIFs or other images
                                mediaElement = document.createElement('img');
                                mediaElement.src = mediaUrl;
                                mediaElement.alt = title;
                            }
                        
                            imagesContainer.appendChild(mediaElement);
                        });
                        

                        categoryDiv.appendChild(imagesContainer);
                        favoritesDiv.appendChild(categoryDiv);
                    });

                    loading.style.display = "none";
                }
            })
            .catch(error => {
                console.error('Error fetching favorites:', error);
                document.getElementById('favorites').innerHTML = ''; // Clear previous content
                loading.style.display = "none";
                alert('Something went wrong');
            });
    } else {
        alert('Login must be in bech32 format (npub...)');
    }
}

async function handleEdit(item) {
    // Create a temporary collection object in the format expected by the collection page
    const collectionData = {
        images: new Map()
    };

    // Get all GIF elements in the category div (parent container)
    const categoryDiv = event.target.closest('.category');
    const imagesContainer = categoryDiv.querySelector('.images-container');
    const images = imagesContainer.querySelectorAll('img, video');
    
    // Find the title from the category div
    const title = categoryDiv.querySelector('.title').innerText;
    
    // Map each GIF to the collection format
    images.forEach((img, index) => {
        const uniqueId = `${title}-${index + 1}`;
        collectionData.images.set(uniqueId, {
            gif: img.src,
            thumb: img.src, // Assuming the shown image is the thumbnail
            alt: img.alt,
            size: img.dataset.gifSize || '',
            dims: img.dataset.gifDims || '',
            image: img.dataset.image || '',
            summary: img.dataset.summary || ''
        });
    });

    console.log(collectionData)

    // Convert Map to object for localStorage (since Maps can't be stored directly)
    const collectionObj = {
        title: title,
        images: Object.fromEntries(collectionData.images)
    };
    console.log(collectionObj)
    // Store in localStorage for the collection page to access
    localStorage.setItem('editCollection', JSON.stringify(collectionObj));
    console.log(collectionObj)
    // Redirect to the collection page
    window.location.href = '/collection';
}

// Function to copy JSON to clipboard
function copyJSON(data) {
    const jsonString = JSON.stringify(data, null, 2); // Convert the JSON dictionary to a string
    navigator.clipboard.writeText(jsonString)
        .then(() => {
            alert("JSON copied to clipboard!");
        })
        .catch(err => {
            console.error("Failed to copy JSON: ", err);
        });
}

// Example usage (pass your pubkey here)
const storedPubkey = localStorage.getItem('pubkey');
console.log(storedPubkey);

if (storedPubkey === null) {
    alert('Must log-in to view this page')
} else {
    fetchFavorites(storedPubkey);
}