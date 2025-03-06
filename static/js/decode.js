// Variable & Element ID initialization
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const lsbdata = document.getElementById('lsbdata');
const uploadDecoder = document.getElementById('uploadDecoder')

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

lsbdata.addEventListener('click', async () => {
    const lsbdata = document.getElementById('lsbdata');
    copyToClipboard(lsbdata.innerHTML)
});

searchButton.addEventListener('click', async () => {
    document.getElementById('loadingIndicator').style.display = 'block';
    console.log(searchInput.value)
    result = await decodeImageFromURL(searchInput.value)
    lsbdata.innerHTML = result;
    document.getElementById('loadingIndicator').style.display = 'none';
});

searchInput.addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') {
        document.getElementById('loadingIndicator').style.display = 'block';
        console.log(searchInput.value)
        result = await decodeImageFromURL(searchInput.value)
        lsbdata.innerHTML = result;
        document.getElementById('loadingIndicator').style.display = 'none';
    }
});

document.addEventListener('paste', async (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;

    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
                await handleImageBlob(blob);
            }
        }
    }
});

async function handleImageBlob(blob) {
    try {
        // Create an object URL for the image
        const objectURL = URL.createObjectURL(blob);

        // Create an image element and load the pasted image
        const img = new Image();
        const imageLoadPromise = new Promise((resolve, reject) => {
            img.onload = () => {
                URL.revokeObjectURL(objectURL); // Clean up
                resolve(img);
            };
            img.onerror = (e) => reject(new Error('Failed to load image: ' + e.message));
        });

        img.src = objectURL;
        const loadedImg = await imageLoadPromise;

        // Draw image to canvas
        const canvas = document.createElement('canvas');
        canvas.width = loadedImg.width;
        canvas.height = loadedImg.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true }); // Performance optimization
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }
        
        ctx.drawImage(loadedImg, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Decode the message
        const decodedMessage = decodeImageData(imageData);

        // Update UI elements, with null checks
        if (lsbdata) lsbdata.innerHTML = decodedMessage;

    } catch (error) {
        console.error("Error decoding steganographic image:", error);
        if (lsbdata) {
            lsbdata.innerHTML = "Error decoding image: " + error.message;
        }
    }
}

async function decodeImageFromURL(imageUrl) {
    try {
        // Fetch the image as a Blob
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const blob = await response.blob();
        
        // Create an object URL from the Blob
        const objectURL = URL.createObjectURL(blob);

        // Create a new image element and load the Blob
        const img = new Image();
        
        const imageLoadPromise = new Promise((resolve, reject) => {
            img.onload = () => {
                URL.revokeObjectURL(objectURL); // Clean up after loading
                resolve(img);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
        });

        img.src = objectURL;
        const loadedImg = await imageLoadPromise;

        // Create canvas and get image data
        const canvas = document.createElement('canvas');
        canvas.width = loadedImg.width;
        canvas.height = loadedImg.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(loadedImg, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Decode the message
        const decodedMessage = decodeImageData(imageData);
        
        return decodedMessage;
        
    } catch (error) {
        console.error("Error decoding steganographic image:", error);
        if (lsbdata) {
            lsbdata.innerHTML = "Error decoding image: " + error.message;
        }
    }
}

// Decode image from file
async function decodeImageFromFile(file) {
    try {
        // Create a FileReader to read the uploaded file
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            const arrayBuffer = event.target.result;
            const blob = new Blob([arrayBuffer], { type: file.type });

            // Create an object URL from the Blob
            const objectURL = URL.createObjectURL(blob);

            // Create a new image element and load the Blob
            const img = new Image();

            const imageLoadPromise = new Promise((resolve, reject) => {
                img.onload = () => {
                    URL.revokeObjectURL(objectURL); // Clean up after loading
                    resolve(img);
                };
                img.onerror = () => reject(new Error('Failed to load image'));
            });

            img.src = objectURL;
            const loadedImg = await imageLoadPromise;

            // Create canvas and get image data
            const canvas = document.createElement('canvas');
            canvas.width = loadedImg.width;
            canvas.height = loadedImg.height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(loadedImg, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Decode the message
            const decodedMessage = decodeImageData(imageData);

            // Do something with the decoded message
            console.log('Decoded message:', decodedMessage);
        };

        reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error("Error decoding steganographic image:", error);
    }
}