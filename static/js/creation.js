console.log("Creating script loaded")

// Variable & Element ID initialization
const resultsDiv = document.getElementById('results');

function getTaskIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('taskId');
}

const taskId = getTaskIdFromUrl();
if (!taskId) {
    console.error('Task ID not found in the URL.');
} else {
    pollTaskStatus(taskId);
}

function pollTaskStatus(taskId) {
    if (!taskId) {
        console.error('Invalid task ID:', taskId);
        document.getElementById('loadingIndicator').style.display = 'none';
        alert('Invalid task ID received');
        return;
    }

    const pollInterval = 2000;
    const maxAttempts = 30;
    let attempts = 0;

    const poll = () => {
        const params = new URLSearchParams(window.location.search);
        const prompt = params.get('prompt');
        const caption = params.get('caption')
    
        const data = {
            prompt: prompt,
            caption: caption,
            taskId: taskId
        };

        fetch('/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(statusData => {
                console.log('Status:', statusData);                        
                switch(statusData.status) {
                    case 'completed':
                        document.getElementById('loadingIndicator').style.display = 'none';
                        if (statusData.result) {
                            // Create container for GIF and copy button
                            const container = document.createElement('div');
                            container.classList.add('gif-container');
                            
                            // Create GIF element
                            const gifElement = document.createElement('img');
                            gifElement.src = statusData.result;
                            gifElement.classList.add('gif');
                            
                            // Make GIF clickable
                            gifElement.style.cursor = 'pointer';
                            gifElement.title = 'Copy';
                            
                            // Add click handler
                            gifElement.addEventListener('click', async () => {
                                try {
                                    await navigator.clipboard.writeText(statusData.result);
                                    alert('Copied to clipboard!');
                                    
                                } catch (err) {
                                    console.error('Failed to copy:', err);
                                    alert('Failed to copy URL to clipboard');
                                }
                            });
                            
                            container.appendChild(gifElement);
                            resultsDiv.insertBefore(container, resultsDiv.firstChild);
                        }
                        break;                                
                    case 'failed':
                        document.getElementById('loadingIndicator').style.display = 'none';
                        alert('Failed to create GIF: ' + (statusData.error || 'Unknown error'));
                        break;
                        
                    case 'processing':
                        // Update loading message if you want
                        document.getElementById('loadingIndicator').style.display = 'block';
                        
                        // Continue polling if we haven't reached max attempts
                        if (attempts < maxAttempts) {
                            attempts++;
                            setTimeout(poll, pollInterval);
                        } else {
                            document.getElementById('loadingIndicator').style.display = 'none';
                            alert('Operation timed out. Please try again.');
                        }
                        break;
                        
                    default:
                        document.getElementById('loadingIndicator').style.display = 'none';
                        alert('Unknown status received');
                }
            })
            .catch(error => {
                console.error('Polling error:', error);
                alert('Error checking status. Please try again.');
                // Reset display states
                document.getElementById('qrContainer').style.display = 'none';
                document.getElementById('loadingIndicator').style.display = 'none';
                document.getElementById('createHeader').style.display = '';
                document.getElementById('promptInput').style.display = '';
                document.getElementById('captionInput').style.display = '';
                document.querySelector('#createForm button[type="submit"]').style.display = '';
            });
    };

    // Start polling
    poll();
}

