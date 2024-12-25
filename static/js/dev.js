// Variable & Element ID initialization
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const instructions = document.getElementById('instructions');
const lsbdata = document.getElementById('lsbdata');
const clickinstructions = document.getElementById('clickinstructions')

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
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Copied to clipboard!');

    } catch (err) {
        console.error('Fallback failed:', err);
        showNotification('Failed to copy text to clipboard.');
    }
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

// Nostr.Build and NIP94 API POST request
async function decodeImage(image_url) {
    try {
        // Send the POST request with the image URL as JSON
        const response = await axios.post('/decode', { image_url });

        // Check if the response contains the URL
        if (response.data && response.data.url) {
            document.getElementById('loadingIndicator').style.display = 'none';
            console.log('Image Decoded');

            // Assuming 'instructions' is a DOM element where the image is shown
            instructions.src = response.data.url;
            lsbdata.innerHTML = response.data.content;
            clickinstructions.style.display = 'block';
        } else {
            document.getElementById('loadingIndicator').style.display = 'none';
            console.error('Invalid response format.');
        }
    } catch (error) {
        document.getElementById('loadingIndicator').style.display = 'none';
        console.error('Error decoding image:', error);
    }
}

instructions.addEventListener('click', async () => {
    const lsbdata = document.getElementById('lsbdata');
    copyToClipboard(lsbdata.innerText)
});

searchButton.addEventListener('click', async () => {
    document.getElementById('loadingIndicator').style.display = 'block';
    console.log(searchInput.value)
    await decodeImage(searchInput.value);
});

searchInput.addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') {
        document.getElementById('loadingIndicator').style.display = 'block';
        console.log(searchInput.value)
        await decodeImage(searchInput.value);
    }
});