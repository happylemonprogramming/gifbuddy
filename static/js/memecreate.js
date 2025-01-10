const imageModal = document.getElementById('image-modal');
const previewImage = document.getElementById('preview-image');
const bottomText = document.getElementById('bottom-text');
const shareMeme = document.getElementById('share-meme');

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

// Function to check if a blob URL is an animated image type
async function isAnimatedImage(blobUrl) {
  try {
      // Fetch the blob URL
      const response = await fetch(blobUrl);
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // List of animated image MIME types
      const animatedTypes = [
          'image/gif',
          'image/webp',
          'image/apng'
      ];
      
      return animatedTypes.includes(blob.type);
  } catch (error) {
      console.error('Error checking blob type:', error);
      return false;
  }
}

// Updated click event listener
document.getElementById('log-button').addEventListener('click', async () => {
  const container = document.getElementById('meme-container');
  const backgroundImg = document.getElementById('background-img');
  const picker = document.getElementById('emoji-picker');
  const imageUrl = document.getElementById('urlInput').value;

  if (!imageUrl) {
      alert("Please enter an image URL.");
      return;
  }

  picker.style.display = 'none';

  try {
      // Check if the image is animated
      const isAnimated = await isAnimatedImage(imageUrl);

      if (isAnimated) {
          console.log('Before createGIFMeme function', { 
              containerWidth: container.offsetWidth, 
              containerHeight: container.offsetHeight,
              imageUrl: imageUrl
          });
          
          backgroundImg.style.display = 'none';
          bottomText.innerHTML = 'Tap and Hold to Copy!';

          console.log('Capturing animated image background');
          console.log(imageUrl);
          await createGIFMeme(container, imageUrl);

          backgroundImg.style.display = 'block';
      } else {
          console.log('Not an animated image, using standard capture method');
          await createMeme(container);
      }
  } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image');
  }
});

document.getElementById('link-button').addEventListener('click', async () => {
  const container = document.getElementById('meme-container');
  const backgroundImg = document.getElementById('background-img');
  // const picker = document.getElementById('emoji-picker');
  const imageUrl = document.getElementById('urlInput').value; // Get the image URL input value

  if (!imageUrl) {
      alert("Please enter an image URL.");
      return;
  }

  // picker.style.display = 'none';

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
          // Open Modal
          fallbackDownload(blob);
        } catch (clipboardError) {
          console.warn("Clipboard write failed, attempting alternative methods...");
        }
        
      }, 'image/png');
    } catch (error) {
      alert("An unexpected error occurred during capture:", error.message);
    }
} 

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
                // Open Modal
                fallbackDownload(memeBlob);
                } catch (downloadError) {
                  console.error("All methods failed:", downloadError.message);
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

async function blobCopy(blob) {
  try {
    const mimeType = blob.type; // Detect the MIME type of the blob

    console.log('MIME type detected:', mimeType);

    // Supported MIME types
    const supportedMimeTypes = ['image/gif', 'image/webp', 'image/png', 'image/jpeg'];

    if (!supportedMimeTypes.includes(mimeType)) {
      showNotification('Unsupported file type');
      console.error('Unsupported MIME type:', mimeType);
      return;
    }

    // Prepare the ClipboardItem
    const clipboardItem = new ClipboardItem({ [mimeType]: blob });

    // Write the blob to the clipboard
    await navigator.clipboard.write([clipboardItem]);
    showNotification('Copied Image!');
    console.log('Blob successfully copied to clipboard');
  } catch (error) {
    console.error('Failed to copy blob to clipboard:', error);
    showNotification('Copy Failed, Try Long Press');
  }
}

// Close image modal functionality
document.getElementById('share-meme').addEventListener('click', () => {
  memeBlob = previewImage.src
  console.log(memeBlob)
  shareImage(memeBlob)
});

async function shareImage(memeBlob) {
  try {
    // Fetch the blob to detect its type
    const response = await fetch(memeBlob);
    const blob = await response.blob();
    const mimeType = blob.type; // Get the MIME type of the blob

    console.log('MIME type detected:', mimeType);

    let fileName = 'memeamigo';
    let fileType = '';
    if (mimeType === 'image/gif') {
      fileName += '.gif';
      fileType = 'image/gif';
    } else if (mimeType === 'image/png') {
      fileName += '.png';
      fileType = 'image/png';
    } else {
      showNotification('Unsupported file type');
      return;
    }

    // Prepare the file for sharing
    const file = new File([blob], fileName, { type: fileType });

    if (navigator.share) {
      const shareData = {
        files: [file],
      };
      await navigator.share(shareData);
      console.log('Meme shared successfully!');
    } else {
      throw new Error('Web Share API not supported');
    }
  } catch (error) {
    console.error('Error sharing image:', error);
    showNotification('Failed to Share');
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

// Fallback download method
function fallbackDownload(blob) {
    // Display modal with generated image
    imageModal.style.display = 'flex';
    shareMeme.style.display = 'flex';
    // Set the image source to the blob URL
    const url = URL.createObjectURL(blob);
    previewImage.src = url;
};

// Fallback download method
function fallbackUrl(url) {
    // Display modal with generated image
    imageModal.style.display = 'flex';
    // Set the image source to the input URL
    previewImage.src = url;
    shareMeme.style.display = 'none';
};

previewImage.addEventListener('click', () => {
  const url = previewImage.src;
  if (url.startsWith('blob:')) {
    // Handle blob copy
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        blobCopy(blob);
        showNotification('Copied Blob!');
      })
      .catch(err => {
        console.error('Error copying blob:', err);
        showNotification('Failed to copy Blob.');
      });
  } else {
    // Handle normal web URL
    copyTextToClipboard(String(url));
    showNotification('Copied URL!');
  }
});

// Close image modal functionality
document.getElementById('close-image').addEventListener('click', () => {
    const imageModal = document.getElementById('image-modal');
    imageModal.style.display = 'none';
});

// 2. Memory Management Improvements
// Add cleanup for modals and blobs:
function cleanupModal() {
  if (previewImage.src.startsWith('blob:')) {
    URL.revokeObjectURL(previewImage.src);
  }
  previewImage.src = '';
  imageModal.style.display = 'none';
}

document.getElementById('close-image').addEventListener('click', cleanupModal);


document.addEventListener('DOMContentLoaded', function () {
  const fileInput = document.getElementById('fileInput');
  const urlInput = document.getElementById('urlInput');
  const uploadBtn = document.getElementById('uploadImageBtn');
  const backgroundImg = document.getElementById('background-img');
  const memeContainer = document.getElementById('meme-container');

  // Define allowed image types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/heic',  // iPhone HEIC format
    'image/heif',  // iPhone HEIF format
    'image/jpg'
  ];

  const allowedExtensions = [
    'jpg',
    'jpeg',
    'png',
    'heic',
    'heif'
  ];

  // Function to check if file type is allowed
  function isAllowedImageFile(file) {
    // Check MIME type
    const mimeTypeAllowed = allowedMimeTypes.includes(file.type.toLowerCase());
    
    // Check file extension
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop();
    const extensionAllowed = allowedExtensions.includes(extension);

    return mimeTypeAllowed || extensionAllowed;
  }

  // Trigger file input when upload button is clicked
  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle file selection
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!isAllowedImageFile(file)) {
        alert('Please select a valid image file (JPEG, PNG, or HEIC/HEIF)');
        fileInput.value = ''; // Reset file input
        return;
      }

      try {
        // Reset container dimensions
        resetContainerDimensions();

        // Create a temporary URL for the selected image file
        const tempUrl = URL.createObjectURL(file);
        backgroundImg.src = tempUrl;
        urlInput.value = tempUrl;
        backgroundImg.crossOrigin = "anonymous";

        // Handle image load and dimension updates
        backgroundImg.onload = () => {
          updateContainerDimensions();
          // URL.revokeObjectURL(tempUrl);
        };
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Error processing image');
        fileInput.value = ''; // Reset file input
      }
    }
  });

  // Function to reset container dimensions
  function resetContainerDimensions() {
    memeContainer.style.width = '';
    memeContainer.style.height = '';
  }

  // Function to update container dimensions while respecting max-width
  function updateContainerDimensions() {
    if (backgroundImg.complete) {
      const imgWidth = backgroundImg.width;
      const imgHeight = backgroundImg.height;
      const maxWidth = window.innerWidth > 768 ? 700 : 600;

      // Calculate scaled dimensions while respecting max-width
      let finalWidth = Math.min(imgWidth, maxWidth);
      let finalHeight = (imgHeight * finalWidth) / imgWidth;

      // Set both width and height
      memeContainer.style.width = finalWidth + 'px';
      memeContainer.style.height = finalHeight + 'px';
    }
  }

  // Handle window resizing
  window.addEventListener('resize', updateContainerDimensions);
  backgroundImg.addEventListener('load', updateContainerDimensions);
  urlInput.addEventListener('change', updateContainerDimensions);
});