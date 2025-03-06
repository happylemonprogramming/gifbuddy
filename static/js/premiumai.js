// DOM Element References
const AI_UI = {
    aiModal: document.getElementById('ai-modal'),
    aiGenerator: document.getElementById('ai-generator'),
    closeAIBtn: document.getElementById('close-ai'),
    aiInput: document.getElementById('ai-input'),
    aiButton: document.getElementById('ai-button'),
    aiInvoice: document.getElementById('ai-invoice'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    clickToCopyText: document.getElementById('clickToCopyAI'),
    resultsContainer: document.getElementById('resultsContainer'),
    urlInput: document.getElementById('urlInput'),
    lightningModal: document.getElementById('lightning-modal'),
    lightningInvoice: document.getElementById('lightning-invoice'),
    closeLNBtn: document.getElementById('close-lightning'),
    aiCost: document.getElementById('LNcost')
};

// Configuration
const AI_CONFIG = {
    maxPollTime: 60 * 1000, // 60 seconds
    pollInterval: 2000, // 2 seconds
    qrCodeSize: 256
};

// Event Listeners
AI_UI.aiGenerator.onclick = openAIModal;
AI_UI.closeAIBtn.onclick = closeAIModal;
AI_UI.closeLNBtn.onclick = closeLNModal;
AI_UI.aiInput.onkeypress = handleEnterPress;

/**
 * Resets the modal state to its initial condition
 */
function resetModalState() {
    AI_UI.aiInput.value = '';
    // AI_UI.aiInvoice.innerHTML = '';
    // AI_UI.aiInvoice.style.display = 'none';
    // AI_UI.clickToCopyText.style.display = 'none';
    // AI_UI.aiButton.disabled = false;
    AI_UI.loadingIndicator.style.display = 'none';
    AI_UI.lightningModal.style.display = 'none';
    AI_UI.lightningInvoice.innerHTML = '';


}

/**
 * Opens the AI modal
 */
function openAIModal() {
    AI_UI.aiModal.style.display = 'block';
}

/**
 * Closes the AI modal and resets its state
 */
function closeAIModal() {
    AI_UI.aiModal.style.display = 'none';
    resetModalState();
}

function closeLNModal() {
    AI_UI.lightningModal.style.display = 'none';
}

/**
 * Handles enter key press in the input field
 */
function handleEnterPress(e) {
    if (e.key === 'Enter') {
        searchStickers(searchInput.value);
    }
}

/**
 * Copies text to clipboard
 */
async function copyToClipboard(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
        document.execCommand('copy');
        showNotification('Copied to clipboard!');
    } catch (err) {
        console.error('Fallback failed:', err);
        showNotification('Failed to copy text to clipboard.');
    }
    
    document.body.removeChild(tempInput);
}

/**
 * Creates AI-generated image from prompt
 */
async function aiCreate(prompt) {
    try {
        const response = await fetch(`/image_generator?prompt=${encodeURIComponent(prompt)}`, {
            method: 'GET',
            mode: 'cors',
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        if (!data.image_url) {
            throw new Error('Invalid response from server');
        }

        // console.log('Generated image URL:', data.image_url);
        AI_UI.urlInput.value = `data:image/png;base64,${data.image_url}`;

    } catch (error) {
        console.error('Error fetching image:', error);
        AI_UI.resultsContainer.innerHTML = '<p>Error generating image. Please try again.</p>';
    }
}

/**
 * Fetches Lightning invoice
 */
async function fetchLnInvoice(amount) {
    try {
        // const response = await fetch(`/invoice?amount=${encodeURIComponent(amount)}`, {
        const response = await Promise.resolve(fetch(`/invoice?amount=${encodeURIComponent(amount)}`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-store',
            credentials: 'include'
        }));

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log('Lightning Invoice:', data.quote);
        console.log('Invoice ID:', data.id);

        return data;
    } catch (error) {
        console.error('Error fetching Lightning Invoice:', error);
        return null;
    }
}


/**
 * Polls invoice status until paid or timeout
 */
async function pollInvoiceStatus(invoiceId) {
    let elapsedTime = 0;

    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            if (elapsedTime >= AI_CONFIG.maxPollTime) {
                clearInterval(interval);
                reject('Invoice Expired');
            }

            try {
                const response = await fetch(`/invoicestatus?id=${invoiceId}`);
                const data = await response.json();

                if (response.ok && data.status === 'PAID') {
                    clearInterval(interval);
                    resolve('PAID');
                } else if (!response.ok) {
                    clearInterval(interval);
                    reject('Error fetching status');
                }
            } catch (error) {
                clearInterval(interval);
                reject('Network error');
            }

            elapsedTime += AI_CONFIG.pollInterval;
        }, AI_CONFIG.pollInterval);
    });
}

/**
 * Removes background from image
 */
async function removeBG(base64Image) {
    try {
        const response = await fetch('/removebg', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_url: base64Image
            })
        });

        if (!response.ok) {
            throw new Error('Failed to remove background');
        }

        return await response.text();
    } catch (error) {
        console.error('Error removing background:', error);
        throw error;
    }
}

/**
 * Handles invoice expiration
 */
function handleInvoiceExpiration() {
    showNotification("Invoice Expired");
    console.error('Error: Invoice Expired');
    resetModalState();
}

// AI Image Generator Function
AI_UI.aiButton.onclick = async () => {
    // AI_UI.aiButton.disabled = true;
    
    try {
        const data = await fetchLnInvoice(200);
        const { id: invoice_id, quote } = data;

        // Generate QR code
        AI_UI.lightningInvoice.innerHTML = '';
        new QRCode(AI_UI.lightningInvoice, {
            text: quote,
            width: AI_CONFIG.qrCodeSize,
            height: AI_CONFIG.qrCodeSize
        });

        // Show QR code and copy text
        AI_UI.aiCost.innerHTML = '200 sats';
        AI_UI.lightningModal.style.display = 'block';
        // AI_UI.lightningInvoice.style.display = 'flex';

        // Add click-to-copy functionality
        AI_UI.lightningInvoice.onclick = () => copyToClipboard(quote);

        // Poll for payment
        const status = await pollInvoiceStatus(invoice_id);
        if (status === 'PAID') {
            AI_UI.lightningModal.style.display = 'none';
            AI_UI.loadingIndicator.style.display = 'block';
            await aiCreate(AI_UI.aiInput.value);
            closeAIModal();
            handleImagePreview();
        } else {
            AI_UI.lightningModal.style.display = 'none';
            handleInvoiceExpiration();
        }

    } catch (error) {
        console.error('Error:', error);
        if (error === 'Invoice Expired') {
            handleInvoiceExpiration();
        } else {
            showNotification(`Error: ${error}`);
            resetModalState();
        }
    } finally {
        AI_UI.loadingIndicator.style.display = 'none';
        // AI_UI.aiButton.disabled = false;
    }
};

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target === AI_UI.aiModal) {
        closeAIModal();
    }
};


// ========== SINGLE SETTINGS FUNCTION ==========

// Attach settings button functionality dynamically
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('settings-handle')) {
      // Correct class selector for .draggable and .text-box
      const textBox = event.target.closest('.draggable.text-box');
      const emojiBox = event.target.closest('.emoji-box');
      const settingsModal = document.getElementById('settings-modal');

      settingsModal.style.display = 'flex';
      removeBGbutton.style.display = 'block';
  
      // Apply settings when the user clicks the apply button
      const applyButton = document.getElementById('apply-settings');
      applyButton.onclick = function () {
        // Update settings based on user input
        textBox.style.fontFamily = document.getElementById('font').value;
        textBox.style.textTransform = document.getElementById('caps').checked ? 'uppercase' : 'none';
        textBox.style.fontWeight = document.getElementById('bold').checked ? 'bold' : 'normal';
        textBox.style.fontStyle = document.getElementById('italic').checked ? 'italic' : 'normal';
        textBox.style.color = document.getElementById('color').value;
        textBox.style.opacity = document.getElementById('opacity').value / 100;
  
        // Apply background color
        let highlight = document.getElementById('highlight').value
        textBox.style.backgroundColor = document.getElementById('addHighlight').checked ? highlight : 'transparent';

        // Clear all previous effects
        textBox.style.textShadow = 'none';
        textBox.style.webkitTextStroke = '0px transparent'; // Explicitly reset outline
  
        // Apply the selected effect
        if (document.querySelector('input[name="effect"]:checked').id === 'shadow') {
          // Increase shadow intensity: bigger offsets, larger blur radius, stronger color
          textBox.style.textShadow = '4px 4px 10px rgba(0, 0, 0, 0.8)';   
        } else if (document.querySelector('input[name="effect"]:checked').id === 'outline') {
          textBox.style.webkitTextStroke = '1.5px black'; // Apply outline effect
        }
        
        // Resize text to fit box
        adjustTextSize(textBox);
        console.log('Attempted styling');
  
        settingsModal.style.display = 'none'; // Close the modal
      };
  
      // Add functionality to remove the text box when the button is clicked
      removeButton.onclick = function() {
        if (textBox) {
        textBox.remove(); // This removes the element from the DOM
        settingsModal.style.display = 'none'; // Close the modal after removing
        }
        if (emojiBox) {
            emojiBox.remove(); // This removes the element from the DOM
            settingsModal.style.display = 'none'; // Close the modal after removing
        }
      };

      // Update your button click handler
      removeBGbutton.onclick = async function() {
        const bgStyle = window.getComputedStyle(textBox).backgroundImage;
    
        if (bgStyle && bgStyle !== "none") {
            const backgroundImage = textBox.style.backgroundImage;
            
            // Remove the `url("...")` part and just get the base64 string
            const base64Image = backgroundImage.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
            
            const imageValidation = await validateBase64Image(base64Image);
            

            if (imageValidation.valid) {
                // removeBGbutton.disabled = true;
                AI_UI.aiCost.innerHTML = '100 sats';
                AI_UI.lightningModal.style.display = 'block';
                
                try {
                    const data = await fetchLnInvoice(100);
                    const { id: invoice_id, quote } = data;
            
                    // Generate QR code
                    AI_UI.lightningInvoice.innerHTML = '';
                    new QRCode(AI_UI.lightningInvoice, {
                        text: quote,
                        width: AI_CONFIG.qrCodeSize,
                        height: AI_CONFIG.qrCodeSize
                    });
            
                    // Show QR code and copy text
                    // AI_UI.aiInvoice.style.display = 'flex';
                    // AI_UI.clickToCopyText.style.display = 'block';
            
                    // Add click-to-copy functionality
                    AI_UI.lightningInvoice.onclick = () => copyToClipboard(quote);
            
                    // Poll for payment
                    const status = await pollInvoiceStatus(invoice_id);
                    if (status === 'PAID') {
                        try {
                            resetModalState()
                            settingsModal.style.display = "none";
                            document.getElementById('loadingIndicator').style.display = 'block';
                            
                            // Get the textbox background image
                            // const textBox = document.querySelector('.text-box'); // Adjust selector as needed
                            // const backgroundImage = textBox.style.backgroundImage;
                            
                            if (!backgroundImage) {
                            alert('No image found in the textbox');
                            return;
                            }
                    
                            // Get base64 from background image
                            const base64Image = getBase64FromBackgroundImage(backgroundImage);
                            if (!base64Image) {
                            alert('Could not process the image');
                            return;
                            }
                    
                            // Call API and get processed base64 image
                            const processedBase64 = await removeBG(base64Image);
                    
                            // Add data URL prefix if not present
                            const imageUrl = processedBase64.startsWith('data:image') 
                            ? processedBase64 
                            : `data:image/png;base64,${processedBase64}`;
                    
                            // Update the textbox background with the new image
                            textBox.style.backgroundColor = 'transparent';
                            textBox.style.backgroundImage = `url(${imageUrl})`;
                        } catch (error) {
                                console.error('Failed to remove background:', error);
                                alert('Failed to remove background. Please try again.');
                            } 

                    } else {
                        handleInvoiceExpiration();
                    }
            
                } catch (error) {
                    console.error('Error:', error);
                    if (error === 'Invoice Expired') {
                        handleInvoiceExpiration();
                        return
                    } else {
                        showNotification(`Error: ${error}`);
                        resetModalState();
                        return
                    }

                } finally {
                    // Re-enable button
                    // removeBGbutton.disabled = false;
                    document.getElementById('loadingIndicator').style.display = 'none';
                }
            } else {
                alert(`Invalid: ${imageValidation.reason}`);
            }
            
        } else {
            alert("No background image found.");
        }

      };
    };
  });

// ========== HIGHTLIGHT FORMAT FUNCTIONALITY ==========

// Set up the background color controls
const highlightPicker = document.getElementById('highlight');
const addHighlight = document.getElementById('addHighlight');

// Event listeners
addHighlight.addEventListener('change', function() {
  if (this.checked) {
    currentSettings.backgroundColor = 'transparent';
    // highlightPicker.disabled = true;
  } else {
    currentSettings.backgroundColor = highlightPicker.value;
    // highlightPicker.disabled = false;
  }
  applyStylesToTextBox(textBox); // Apply the changes
});

highlightPicker.addEventListener('input', function() {
  if (!addHighlight.checked) {
    currentSettings.backgroundColor = this.value;
    applyStylesToTextBox(textBox); // Apply the changes
  }
});

// Function to extract base64 from CSS background-image URL
function getBase64FromBackgroundImage(backgroundImageStyle) {
    // Remove url() and quotes from CSS background-image
    const urlMatch = backgroundImageStyle.match(/url\(['"]?(.*?)['"]?\)/);
    if (!urlMatch) return null;
    return urlMatch[1];
}