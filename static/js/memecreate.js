function copyTextToClipboard(text) {
  try {
      // Create a temporary element to hold the text
      const tempElement = document.createElement('button');
      tempElement.setAttribute('data-clipboard-text', text);

      // Initialize Clipboard.js with the temporary element
      const clipboard = new ClipboardJS(tempElement);

      // Trigger the copy action
      tempElement.click();

      clipboard.on('success', () => {
          showNotification('Copied to clipboard!');
          clipboard.destroy(); // Clean up
      });

      clipboard.on('error', (err) => {
          console.error('Failed to copy text:', err);
          showNotification('Failed to copy text to clipboard.');
          clipboard.destroy(); // Clean up
      });
  } catch (err) {
      console.error('Unexpected error:', err);
      showNotification('An unexpected error occurred.');
  }
}

document.getElementById('log-button').addEventListener('click', async () => {
    const container = document.getElementById('meme-container');
    const backgroundImg = document.getElementById('background-img');
    const picker = document.getElementById('emoji-picker');
    const imageUrl = document.getElementById('urlInput').value; // Get the image URL input value

    if (!imageUrl) {
        alert("Please enter an image URL.");
        return;
    }

    picker.style.display = 'none';

    if (backgroundImg.src.toLowerCase().includes('.gif') || backgroundImg.src.toLowerCase().includes('.webp')) {
      console.log('Before createGIFMeme function', { 
          containerWidth: container.offsetWidth, 
          containerHeight: container.offsetHeight,
          imageUrl: imageUrl
        });
        // Hide the background image temporarily
        backgroundImg.style.display = 'none';

        console.log('Capturing meme background');
        console.log(imageUrl)
        await createGIFMeme(container, imageUrl);

        // Show the background image again after capture
        backgroundImg.style.display = 'block';
        
    } else {
        console.log('Not a GIF, using standard capture method');
        await createMeme(container)
    }
});

document.getElementById('link-button').addEventListener('click', async () => {
  const container = document.getElementById('meme-container');
  const backgroundImg = document.getElementById('background-img');
  const picker = document.getElementById('emoji-picker');
  const imageUrl = document.getElementById('urlInput').value; // Get the image URL input value

  if (!imageUrl) {
      alert("Please enter an image URL.");
      return;
  }

  picker.style.display = 'none';

  if (backgroundImg.src.toLowerCase().includes('.gif') || backgroundImg.src.toLowerCase().includes('.webp')) {
    // Hide the background image temporarily
      backgroundImg.style.display = 'none';

      console.log('Capturing meme background');
      await createGIFMemeUrl(container, imageUrl);

      // Show the background image again after capture
      backgroundImg.style.display = 'block';
      
  } else {
      console.log('Not a GIF, using standard capture method');
      await createMemeUrl(container)
  }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Update createMeme function to send both image and URL to API
async function createGIFMeme(container, imageUrl) {
  console.log('Starting createGIFMeme function', { 
    containerWidth: container.offsetWidth, 
    containerHeight: container.offsetHeight,
    imageUrl: imageUrl
  });

  container.classList.add('capture-mode');
  try {
      console.log('Attempting to capture canvas with html2canvas');
      await document.fonts.ready;
      const canvas = await html2canvas(container, {
          scale: window.devicePixelRatio,
          // scale: 2, // Adjust for performance
          useCORS: true,
          width: container.offsetWidth,
          height: container.offsetHeight,
          backgroundColor: null, // Ensure the background is transparent
          logging: false // Disable console logging for cleaner output
      });
      console.log('Canvas capture successful', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });

      container.classList.remove('capture-mode');
      document.getElementById('loadingIndicator').style.display = 'block';
      console.log('Loading indicator displayed');

      canvas.toBlob(async (blob) => {
          if (!blob) {
              console.error("Failed to generate blob from canvas");
              return;
          }
          console.log('Blob generated successfully', {
            blobSize: blob.size,
            blobType: blob.type
          });

          try {
              // Prepare the FormData to send the image and URL
              const formData = new FormData();
              formData.append('transparent_image', blob, 'meme.png'); // Attach the image as 'transparent_image'
              formData.append('gif_url', imageUrl); // Attach the image URL

              console.log('FormData prepared', {
                transparentImageSize: blob.size,
                gifUrl: imageUrl
              });

              // Send the data to the API endpoint
              console.log('Sending fetch request to /memecreate');
              const response = await fetch('/memecreate', {
                  method: 'POST',
                  body: formData
              });

              document.getElementById('loadingIndicator').style.display = 'none';
              console.log('Loading indicator hidden');

              console.log('Response received', {
                status: response.status,
                statusText: response.statusText
              });

              if (!response.ok) {
                  throw new Error(`API returned an error: ${response.status}`);
              }

              // Get the Blob from the response
              console.log('Attempting to parse response blob');
              const memeBlob = await response.blob();

              try {
                // Attempt to copy the blob to the clipboard
                console.log('Attempting to copy blob to clipboard');
                const clipboardItem = new ClipboardItem({ 'image/gif': memeBlob });
                await navigator.clipboard.write([clipboardItem]);
                showNotification("Copied!");
                console.log('Blob successfully copied to clipboard');
              } catch (clipboardError) {
                console.warn("Clipboard write failed, attempting alternative methods...", clipboardError);
      
                try {
                  // Try to use the Web Share API
                  if (navigator.share) {
                    console.log('Attempting to use Web Share API');
                    const shareData = {
                      files: [new File([memeBlob], 'memeamigo.gif', { type: 'image/gif' })],
                      // title: 'MEME AMIGO!',
                    };
                    await navigator.share(shareData);
                    console.log('Meme shared successfully!');
                    fallbackDownload(memeBlob);
                  } else {
                    throw new Error('Web Share API not supported');
                  }
                } catch (shareError) {
                  console.warn("Web Share API failed or unsupported, falling back to download...", shareError);
                  try {
                    // Fallback to download only
                    console.log('Attempting fallback download', memeBlob)
                    fallbackDownload(memeBlob);
                  } catch (downloadError) {
                    console.error("All methods failed:", downloadError.message);
                  }
                }
              }

          } catch (apiError) {
              console.error("Failed to send data to API:", apiError);
              document.getElementById('loadingIndicator').style.display = 'none';
              alert(`Failed to send data to the server: ${apiError.message}`);
          }
      }, 'image/png');
  } catch (error) {
      console.error('Unexpected error during capture:', error);
      document.getElementById('loadingIndicator').style.display = 'none';
      alert(`An unexpected error occurred during capture: ${error.message}`);
  }
}

// Create meme image url functionality
async function createMemeUrl(container) {
    // container.classList.add('capture-mode');
    try {
        const canvas = await html2canvas(container, {
            scale: 2, // Adjust for performance
            useCORS: true,
            width: container.offsetWidth,
            height: container.offsetHeight,
        });

        // container.classList.remove('capture-mode');
        document.getElementById('loadingIndicator').style.display = 'block';

        canvas.toBlob(async (blob) => {
            if (!blob) {
                console.error("Failed to generate blob from canvas");
                return;
            }

            try {
                console.log("Blob created");

                // Prepare the FormData to send the image
                const formData = new FormData();
                formData.append('meme', blob, 'meme.jpg'); // Attach the image blob

                // Send the data to the API endpoint
                const response = await fetch('/memecreateurl', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`API returned an error: ${response.status}`);
                }

                // Parse the response (assuming it contains a URL)
                const data = await response.json();

                // Log and copy the URL to the clipboard
                console.log("Meme URL created:", data.url);

                document.getElementById('loadingIndicator').style.display = 'none';

                fallbackUrl(data.url);

            } catch (apiError) {
                console.error("Failed to send data to API:", apiError.message);
                document.getElementById('loadingIndicator').style.display = 'none';
                alert("Failed to send data to the server.");
            }
        }, 'image/jpeg');
    } catch (error) {
        document.getElementById('loadingIndicator').style.display = 'none';
        alert("An unexpected error occurred during capture:", error.message);
    }
}

// Update createMeme function to send both image and URL to API
async function createGIFMemeUrl(container, imageUrl) {
    container.classList.add('capture-mode');
    try {
        const canvas = await html2canvas(container, {
            scale: 2, // Adjust for performance
            useCORS: true,
            width: container.offsetWidth,
            height: container.offsetHeight,
            backgroundColor: null, // Ensure the background is transparent
            logging: false // Disable console logging for cleaner output
        });

        container.classList.remove('capture-mode');
        document.getElementById('loadingIndicator').style.display = 'block';

        canvas.toBlob(async (blob) => {
            if (!blob) {
                console.error("Failed to generate blob from canvas");
                return;
            }

            try {
                // Prepare the FormData to send the image and URL
                const formData = new FormData();
                formData.append('transparent_image', blob, 'meme.png'); // Attach the image as 'transparent_image'
                formData.append('gif_url', imageUrl); // Attach the image URL

                // Send the data to the API endpoint
                const response = await fetch('/gifcreateurl', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`API returned an error: ${response.status}`);
                }

                // Parse the JSON response
                const data = await response.json();

                console.log(data.url)

                // Need to use local storage if using fallback modal
                // localStorage.setItem('copiedText', data.url);
                fallbackUrl(data.url);

                document.getElementById('loadingIndicator').style.display = 'none';

            } catch (apiError) {
                console.error("Failed to send data to API:", apiError.message);
                document.getElementById('loadingIndicator').style.display = 'none';
                alert("Failed to send data to the server.");
            }

        }, 'image/png');
        
    } catch (error) {
        document.getElementById('loadingIndicator').style.display = 'none';
        alert("An unexpected error occurred during capture:", error.message);
    }
}

// Create meme functionality
async function createMeme(container) {
    // container.classList.add('capture-mode');
      try {
        const canvas = await html2canvas(container, {
          scale: 2, // Adjust for performance
          useCORS: true,
          width: container.offsetWidth,
          height: container.offsetHeight,
        });
  
        // container.classList.remove('capture-mode');
        
        canvas.toBlob(async (blob) => {
          if (!blob) {
            console.error("Failed to generate blob from canvas");
            return;
          }
          
          try {
            // Attempt to copy the blob to the clipboard
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([clipboardItem]);
            showNotification("Copied Image!");
          } catch (clipboardError) {
            console.warn("Clipboard write failed, attempting alternative methods...");
  
            try {
              // Try to use the Web Share API
              if (navigator.share) {
                const shareData = {
                  files: [new File([blob], 'memeamigo.png', { type: 'image/png' })],
                  // title: 'MEME AMIGO!',
                };
                await navigator.share(shareData);
                fallbackDownload(blob);
                console.log('Meme shared successfully!');
              } else {
                throw new Error('Web Share API not supported');
              }
            } catch (shareError) {
              console.warn("Web Share API failed or unsupported, falling back to download...");
              try {
                // Fallback to download
                fallbackDownload(blob);
              } catch (downloadError) {
                console.error("All methods failed:", downloadError.message);
              }
            }
          }
        }, 'image/png');
      } catch (error) {
        alert("An unexpected error occurred during capture:", error.message);
      }
} 

// Fallback download method
function fallbackDownload(blob) {
    const imageModal = document.getElementById('image-modal');
    const previewImage = document.getElementById('preview-image');
    // const bottomText = document.getElementById('bottom-text')
    // bottomText.innerText = 'Tap and Hold to Copy!';

    // Display modal with generated image
    imageModal.style.display = 'flex';
    // Set the image source to the blob URL
    const url = URL.createObjectURL(blob);
    previewImage.src = url;
}

// Fallback download method
function fallbackUrl(url) {
    const imageModal = document.getElementById('image-modal');
    const previewImage = document.getElementById('preview-image');
    const bottomText = document.getElementById('bottom-text')
    bottomText.innerText = 'Click Meme to Copy!';

    // Display modal with generated image
    imageModal.style.display = 'flex';
    // Set the image source to the input URL
    previewImage.src = url;
    previewImage.addEventListener('click', () => {
      copyTextToClipboard(String(url));
      showNotification('Copied URL!')
    });
};

// Close image modal functionality
document.getElementById('close-image').addEventListener('click', () => {
    const imageModal = document.getElementById('image-modal');
    imageModal.style.display = 'none';
});