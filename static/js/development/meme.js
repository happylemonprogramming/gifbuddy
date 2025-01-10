const resultsDiv = document.getElementById('results');
const captionInput = document.getElementById('captionInput'); 
const memeForm = document.getElementById('memeForm');

document.addEventListener('DOMContentLoaded', () => {
    // Retrieve the text from localStorage
    const copiedText = localStorage.getItem('copiedText');

    // Find the text input field
    const memeTextInput = document.getElementById('urlInput');

    if (copiedText) {
        // Check if the copied text is a valid image URL
        if (isValidImageUrl(copiedText)) {
            memeTextInput.value = copiedText;
        } else {
            // Show a warning or clear the field if invalid
            // alert('The copied text is not a valid image URL. Please enter a valid one.');
            memeTextInput.value = ''; // Clear input
        }

        // Optionally clear the text from localStorage
        localStorage.removeItem('copiedText');

        // Focus on caption input
        captionInput.focus();
    }
});

// Helper function to validate image URLs
function isValidImageUrl(url) {
    return url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i);
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

memeForm.addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent the form from submitting normally
    
    // Show the loading indicator
    document.getElementById('memeHeader').style.display = 'none';
    document.getElementById('urlInput').style.display = 'none';
    document.getElementById('captionInput').style.display = 'none';
    document.querySelector('#memeForm button[type="submit"]').style.display = 'none';
    document.getElementById('loadingIndicator').style.display = 'block';
    
    // Get the values from the form
    const gifUrl = document.getElementById('urlInput').value;
    const caption = document.getElementById('captionInput').value;
    
    // Prepare the data to send in the POST request
    const postData = {
        url: gifUrl,
        caption: caption
    };
    
    try {
        // Send the POST request to the /meme endpoint
        const response = await fetch('/memegifs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData),
        });
        
        // Hide the loading indicator
        document.getElementById('loadingIndicator').style.display = 'none';
        
        // Check if the response is ok (status 200)
        if (response.ok) {
            const result = await response.json();
            if (result.result) {
                // Create container for GIF and copy button
                const container = document.createElement('div');
                container.classList.add('gif-container');
                
                // Create GIF element
                const gifElement = document.createElement('img');
                gifElement.src = result.result;
                gifElement.classList.add('gif');
                
                // Make GIF clickable
                gifElement.style.cursor = 'pointer';
                gifElement.title = 'Copy';

                // Only display the rendered GIF URL in the results div
                gifElement.innerHTML = `
                    <img src="${result.result}" alt="Meme" />
                `;

                // Add click handler
                gifElement.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(result.result);
                        showNotification('Copied!');
                        
                    } catch (err) {
                        console.error('Failed to copy:', err);
                        alert('Failed to Copy!');
                    }
                });

                container.appendChild(gifElement);
                resultsDiv.insertBefore(container, resultsDiv.firstChild);

            } else {
                // If no result URL is returned, show an alert
                alert('Error: No result returned from server.');

                // Show the form
                document.getElementById('memeHeader').style.display = '';
                document.getElementById('urlInput').style.display = '';
                document.getElementById('captionInput').style.display = '';
                document.querySelector('#memeForm button[type="submit"]').style.display = '';
                document.getElementById('loadingIndicator').style.display = 'none';
            }
        } else {
            // If the response is not OK, show an alert
            const error = await response.json();
            alert(`Error: ${error.error || 'Unknown error'}`);

            // Show the form
            document.getElementById('memeHeader').style.display = '';
            document.getElementById('urlInput').style.display = '';
            document.getElementById('captionInput').style.display = '';
            document.querySelector('#memeForm button[type="submit"]').style.display = '';
            document.getElementById('loadingIndicator').style.display = 'none';
        }
    } catch (error) {
        // If an error occurs in the fetch request, show an alert
        document.getElementById('loadingIndicator').style.display = 'none';
        alert(`Request failed: ${error.message}`);

        // Show the form
        document.getElementById('memeHeader').style.display = '';
        document.getElementById('urlInput').style.display = '';
        document.getElementById('captionInput').style.display = '';
        document.querySelector('#memeForm button[type="submit"]').style.display = '';
    }
});
