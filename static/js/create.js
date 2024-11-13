console.log("Creation script loaded")

// Variable & Element ID initialization
const resultsDiv = document.getElementById('results');

// Create Form Submission
document.getElementById('createForm').addEventListener('submit', async function(event) {
    console.log("Form submitted")
    event.preventDefault();
    
    const fetchInvoiceAndPoll = async () => {
        try {
            // Get invoice first
            const invoiceResponse = await fetch('/invoice', {
                method: 'GET'
            });
            
            if (!invoiceResponse.ok) {
                throw new Error('Failed to get invoice');
            }
            
            const invoiceData = await invoiceResponse.json();
            const { quote: invoice, amount, id: invid } = invoiceData;
            
            // Hide form elements
            document.getElementById('createHeader').style.display = 'none';
            document.getElementById('promptInput').style.display = 'none';
            document.getElementById('captionInput').style.display = 'none';
            document.querySelector('#createForm button[type="submit"]').style.display = 'none';
            
            // Show and update QR code container
            const qrContainer = document.getElementById('qrContainer');
            // Set up options for styling
            const qrOptions = {
                text: invoice,             // The data for the QR code
                colorDark: "#f7f7f7",      // Main QR code color (white)
                colorLight: "#2C2F33",     // Match page background
            };

            qrContainer.style.display = 'block';
            
            // Clear any existing QR code
            document.getElementById('qrcode').innerHTML = '';
            
            // Generate new QR code
            new QRCode(document.getElementById('qrcode'), qrOptions);
            
            // Add click handler
            qrContainer.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(invoice);
                    alert('Copied to clipboard!');

                } catch (err) {
                    console.error('Failed to copy:', err);
                    alert('Failed to copy URL to clipboard');
                }
            });

            // Update amount text
            // document.getElementById('amountText').textContent = `$0.55 or ${amount} sats`;

            // Start polling invoice status
            let attempts = 0;
            const maxAttempts = 60;
            
            const pollInvoice = async () => {
                if (attempts >= maxAttempts) {
                    // Hide QR code container
                    qrContainer.style.display = 'none';
                    // Show form elements again
                    // document.getElementById('createHeader').style.display = '';
                    // document.getElementById('promptInput').style.display = '';
                    // document.getElementById('captionInput').style.display = '';
                    // document.querySelector('#createForm button[type="submit"]').style.display = '';
                    // alert('Invoice has expired');
                    console.log('Generating new invoice...')
                    fetchInvoiceAndPoll(); // Restart the process with a new invoice
                    return;
                }

                const statusResponse = await fetch(`/invoicestatus?id=${invid}`);
                if (!statusResponse.ok) {
                    throw new Error('Failed to check invoice status');
                }

                const statusData = await statusResponse.json();
                
                if (statusData.status === 'PAID') {
                    // Hide QR code container
                    qrContainer.style.display = 'none';
                    
                    // Show loading indicator
                    document.getElementById('loadingIndicator').style.display = 'block';
                    
                    // Proceed with content creation
                    const prompt = document.getElementById('promptInput').value;
                    const caption = document.getElementById('captionInput').value;
                    
                    const createResponse = await fetch('/creating', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            prompt: prompt,
                            caption: caption
                        })
                    });

                    if (!createResponse.ok) {
                        throw new Error('Failed to create content');
                    }

                    const responseData = await createResponse.json();
                    
                    if (!responseData.id) {
                        throw new Error('No task ID received from server');
                    }

                    // Convert the task ID to string to ensure proper URL encoding
                    const taskId = String(responseData.id);
                    pollTaskStatus(taskId);
                    
                } else {
                    attempts++;
                    setTimeout(pollInvoice, 1000);
                }
            };

            // Start the polling process
            pollInvoice();

        } catch (error) {
            console.error('Error:', error);
            alert('Something went wrong. Please try again!');
            // Reset display states
            document.getElementById('qrContainer').style.display = 'none';
            document.getElementById('loadingIndicator').style.display = 'none';
            document.getElementById('createHeader').style.display = '';
            document.getElementById('promptInput').style.display = '';
            document.getElementById('captionInput').style.display = '';
            document.querySelector('#createForm button[type="submit"]').style.display = '';
        }
    };

    fetchInvoiceAndPoll();
});

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
        const prompt = document.getElementById('promptInput').value;
        const caption = document.getElementById('captionInput').value;
    
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

