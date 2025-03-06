// ========== GLOBAL VARIABLES ==========

// Counter variables for generating unique IDs
let emojiCounter = 0;
let textCounter = 0;

// Default background image URL
const DEFAULT_BACKGROUND = "https://image.nostr.build/f76f31486260140693c317185aca3404a15855e766ea785d12e79d33de9bf96a.jpg";

// ========== DOM ELEMENT REFERENCES ==========

// Main interface elements
const urlInput = document.getElementById('urlInput');
const editor = document.getElementById('editor');
const memeContainer = document.getElementById('meme-container');
const settingsModal = document.getElementById('settings-modal');
const backgroundImg = document.getElementById('background-img');
const removeBGbutton = document.getElementById('removebg-settings');
const loadingIndicator = document.getElementById('loadingIndicator');
const removeButton = document.getElementById('remove-textbox');

// ========== DEFAULT STYLE SETTINGS ==========

// Default text style settings
let currentSettings = {
  font: "'Impact', 'Anton', 'Noto Sans JP', Arial, sans-serif",
  caps: true,
  bold: false,
  italic: false,
  effect: 'outline',
  opacity: 100,
  color: '#ffffff', // Default to white
  backgroundColor: 'transparent'
};

// ========== HELPER FUNCTIONS ==========

/**
 * Validates if a URL points to an image file
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid image URL
 */
function isValidImageUrl(url) {
    // Check if URL is a valid image extension OR a base64 data URL
    const urlWithoutParams = url.split('?')[0];
    const extensionMatch = urlWithoutParams.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i);
    const base64Match = url.match(/^data:image\/(jpeg|jpg|gif|png|webp|bmp);base64,/i);
    
    return extensionMatch !== null || base64Match !== null;
}

/**
 * Validates if a URL is within size limits
 * @param {string} url - URL to validate
 * @returns {boolean} - True if within limits
 */
async function validateImage(url) {
  try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch image");

      const blob = await response.blob();
      if (blob.size > 30 * 1024 * 1024) return { valid: false, reason: "File size exceeds 30MB" };

      const img = new Image();
      img.src = URL.createObjectURL(blob);

      return await new Promise((resolve) => {
          img.onload = () => {
              if (img.width > 2048 || img.height > 2048) {
                  resolve({ valid: false, reason: "Image dimensions exceed 2048x2048" });
              } else {
                  resolve({ valid: true });
              }
          };
          img.onerror = () => resolve({ valid: false, reason: "Invalid image" });
      });
  } catch (error) {
      return { valid: false, reason: error.message };
  }
}

// Function to validate base64 image dimensions and size
async function validateBase64Image(base64Image) {
  const MAX_SIZE = 30 * 1024 * 1024; // 30MB max size
  const image = new Image();

  // Check the base64 string size
  const base64Size = Math.ceil((base64Image.length * 3) / 4); // Rough estimate of size in bytes
  if (base64Size > MAX_SIZE) {
      return { valid: false, reason: 'Image is too large (max 30MB)' };
  }

  return new Promise((resolve) => {
      image.onload = () => {
          // Check image dimensions
          if (image.width <= 2048 && image.height <= 2048) {
              resolve({ valid: true });
          } else {
              resolve({ valid: false, reason: 'Image dimensions are too large (max 2048x2048)' });
          }
      };

      image.onerror = () => {
          resolve({ valid: false, reason: 'Invalid image' });
      };

      // Set the source as the base64 string
      image.src = base64Image;
  });
}


/**
 * Displays a temporary notification message
 * @param {string} message - Message to display
 */
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
}

/**
 * Sets the background image and handles loading states
 * @param {string} url - Image URL to set as background
 */
function setBackgroundImage(url) {
    loadingIndicator.style.display = 'block';
    backgroundImg.style.display = 'none';
    
    // Proper image loading with error handling
    backgroundImg.onload = () => {
        loadingIndicator.style.display = 'none';
        backgroundImg.style.display = 'block';
    };
    
    backgroundImg.onerror = () => {
        loadingIndicator.style.display = 'none';
        backgroundImg.src = DEFAULT_BACKGROUND;
        backgroundImg.style.display = 'block';
        showNotification('Failed to load image. Using default background.');
    };
    
    backgroundImg.src = url;
}

/**
 * Converts image URL to Base64 format
 * @param {string} url - Image URL to convert
 */
function loadImageAndSetContainerSize(url) {
  const img = new Image();
  console.log('Loading image...');

  img.onload = function () {
      const aspectRatio = img.height / img.width;
      const container = document.getElementById('meme-container');
      container.style.height = `${container.offsetWidth * aspectRatio}px`;
      backgroundImg.src = url;
  };

  img.onerror = function () {
      console.error("Failed to load image.");
  };

  // Handle CORS only for external URLs
  if (!url.startsWith('data:image/')) {
      img.crossOrigin = 'Anonymous';
  }

  img.src = url;
}


/**
 * Processes the image URL from input field
 */
function handleImagePreview() {
  const url = urlInput.value.trim();

  if (!url) {
      setBackgroundImage(DEFAULT_BACKGROUND);
      console.log('No URL input');
      return;
  }

  if (!isValidImageUrl(url)) {
      showNotification('Invalid image URL format');
      return;
  }

  loadImageAndSetContainerSize(url);
  memeContainer.style.display = 'block';

  // Detect animation (Only applicable for URL-based images, not Base64)
  if (!url.startsWith('data:image/')) {
      const animatedTypes = ['.gif', '.webp', '.apng'];
      if (animatedTypes.some(type => url.toLowerCase().includes(type))) {
          console.log("is Animated");
          const secretButton = document.getElementById('hide-message');
          if (secretButton) {
              secretButton.style.display = "none";
          }
      }
  }
}

/**
 * Converts a File object to data URL
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Promise resolving to data URL
 */
function getImageDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

/**
 * Checks if a blob URL is an animated image
 * @param {string} blobUrl - URL to check
 * @returns {Promise<boolean>} - Promise resolving to true if animated
 */
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

// ========== TEXT BOX FUNCTIONS ==========

/**
 * Adjusts text size to fit within container
 * @param {HTMLElement} element - Text box element
 */
function adjustTextSize(element) {
  const containerHeight = element.offsetHeight;
  const containerWidth = element.offsetWidth;
  const textContent = element.querySelector('.text-content');
  
  if (!textContent) return;
  
  const minDimension = Math.min(containerWidth, containerHeight);
  let fontSize = Math.floor(minDimension / 1);
  
  textContent.style.fontSize = `${fontSize}px`;
  
  while (
    (textContent.scrollWidth > containerWidth || 
    textContent.scrollHeight > containerHeight) && 
    fontSize > 10
  ) {
    fontSize -= 1;
    textContent.style.fontSize = `${fontSize}px`;
  }
}

/**
 * Creates a new text box element
 * @param {string} text - Initial text content
 * @param {number} x - X position
 * @param {number} y - Y position
 * @returns {HTMLElement} - Created text box
 */
function createTextBox(text, x, y) {
  const textBox = document.createElement('div');
  textBox.className = 'draggable text-box';
  textBox.id = `text-${textCounter++}`;
  textBox.setAttribute('data-x', 0); // Initialize data-x
  textBox.setAttribute('data-y', 0); // Initialize data-y
  textBox.innerHTML = `
    <div class="text-content" contenteditable="true">${text}</div>
    <div class="resize-handle handle-se"></div>
    <div class="rotate-handle"></div>
    <div class="settings-handle"></div>
  `;
  
  // <div class="resize-handle handle-nw"></div>
  // <div class="resize-handle handle-n"></div>
  // <div class="resize-handle handle-ne"></div>
  // <div class="resize-handle handle-w"></div>
  // <div class="resize-handle handle-e"></div>
  // <div class="resize-handle handle-sw"></div>
  // <div class="resize-handle handle-s"></div>

  // Set default position
  textBox.style.left = `${x}px`;
  textBox.style.top = `${y}px`;

  // Set default size
  textBox.style.width = '275px';
  textBox.style.height = '110px';
  
  document.getElementById('meme-container').appendChild(textBox);

  // Apply current settings to the new text box
  applyStylesToTextBox(textBox);

  // Adjust text size to fit the default dimensions
  adjustTextSize(textBox);
  
  makeInteractive(textBox);
  
  const textContent = textBox.querySelector('.text-content');
  
  // Add event listener for keydown to handle Enter key
  textContent.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      // Prevent default Enter behavior (creating a new line)
      event.preventDefault();
      
      // Insert a line break at the current cursor position
      document.execCommand('insertLineBreak');
      
      // Adjust text size after adding a new line
      adjustTextSize(textBox);
    }
  });

  textContent.addEventListener('input', () => adjustTextSize(textBox));

  // // Log the action
  // actionHistory.push({
  //   type: 'create',
  //   element: textBox,
  // });
  
  return textBox;
}

/**
 * Creates a new emoji box element
 * @param {string} emoji - Emoji character
 * @param {number} x - X position
 * @param {number} y - Y position
 */
function createEmojiBox(emoji, x, y) {
  const emojiBox = document.createElement('div');
  emojiBox.className = 'emoji-box';
  emojiBox.setAttribute('contenteditable', 'true');
  emojiBox.id = `emoji-${emojiCounter++}`;
  emojiBox.innerHTML = `
    ${emoji}
    <div class="resize-handle handle-se"></div>
    <div class="rotate-handle"></div>
    <div class="settings-handle"></div>
  `;
  
  // <div class="resize-handle handle-nw"></div>
  // <div class="resize-handle handle-n"></div>
  // <div class="resize-handle handle-ne"></div>
  // <div class="resize-handle handle-w"></div>
  // <div class="resize-handle handle-e"></div>
  // <div class="resize-handle handle-sw"></div>
  // <div class="resize-handle handle-s"></div>

  emojiBox.style.left = `${x}px`;
  emojiBox.style.top = `${y}px`;
  
  document.getElementById('meme-container').appendChild(emojiBox);

  makeInteractive(emojiBox);

  // // Log the action
  // actionHistory.push({
  //   type: 'create',
  //   element: emojiBox,
  // });
}

/**
 * Enables pasting images into text boxes
 * @param {HTMLElement} textBox - Text box element
 */
function enableImagePaste(textBox) {
  const textContent = textBox.querySelector('.text-content');

  if (!textContent) return;

  textContent.addEventListener('paste', async (event) => {
    event.preventDefault();

    const clipboardData = event.clipboardData || window.clipboardData;
    const items = clipboardData.items;
    const pastedText = clipboardData.getData('text/plain');

    for (let item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const imageURL = await getImageDataURL(file);

          // Apply the image as the background of the text box
          textBox.style.backgroundImage = `url(${imageURL})`;
          textBox.style.backgroundSize = 'contain';
          textBox.style.backgroundPosition = 'center';
          textBox.style.backgroundRepeat = 'no-repeat';

          // Clear any existing text
          textContent.innerHTML = '';
          break;
        }
      }
    }

    // If there's text, add it to the text content
    if (pastedText) {
      textContent.textContent = pastedText;
      adjustTextSize(textBox);
    }
  });
}

/**
 * Adds a new text box and enables image pasting
 */
function addTextBox() {
  const newTextBox = createTextBox('MemeAmigo', 0, 0);
  enableImagePaste(newTextBox);
}

/**
 * Applies the current style settings to a text box
 * @param {HTMLElement} textBox - Text box element
 */
function applyStylesToTextBox(textBox) {
  // Apply font-related styles
  textBox.style.fontFamily = currentSettings.font;
  textBox.style.textTransform = currentSettings.caps ? 'uppercase' : 'none';
  textBox.style.fontWeight = currentSettings.bold ? 'bold' : 'normal';
  textBox.style.fontStyle = currentSettings.italic ? 'italic' : 'normal';
  textBox.style.color = currentSettings.color;
  textBox.style.opacity = (currentSettings.opacity || 100) / 100;

  // Apply background color
  // textBox.style.backgroundColor = currentSettings.backgroundColor || 'transparent';
  // Apply background color
  let highlight = document.getElementById('highlight').value
  textBox.style.backgroundColor = document.getElementById('addHighlight').checked ? highlight : 'transparent';

  // Clear all previous effects
  textBox.style.textShadow = 'none';
  textBox.style.webkitTextStroke = '0px transparent';

  // Apply the selected effect
  if (currentSettings.effect === 'shadow') {
    textBox.style.textShadow = '4px 4px 10px rgba(0, 0, 0, 0.8)';
    // const isAndroid = navigator.userAgent.includes('Android');
    // textBox.style.textShadow = isAndroid
    // ? '2px 2px 3px rgba(0, 0, 0, 0.9)'
    // : '1px 1px 2px rgba(0, 0, 0, 0.8)';
  } else if (currentSettings.effect === 'outline') {
    textBox.style.webkitTextStroke = '1.5px black';
    // const isAndroid = navigator.userAgent.includes('Android');
    // textBox.style.webkitTextStroke = isAndroid ? '1.5px black' : '1px black';
  }
}

// ========== INTERACTIVE ELEMENT HANDLING ==========

/**
 * Makes an element draggable, resizable and rotatable
 * @param {HTMLElement} element - Element to make interactive
 */
function makeInteractive(element) {
  interact(element)
    .draggable({
      listeners: {
        move(event) {
          const target = event.target;
          const container = document.getElementById('meme-container'); // Reference to the container
    
          // Ensure attributes are initialized
          if (!target.hasAttribute('data-x')) target.setAttribute('data-x', 0);
          if (!target.hasAttribute('data-y')) target.setAttribute('data-y', 0);
    
          const initialX = parseFloat(target.getAttribute('data-x')) || 0;
          const initialY = parseFloat(target.getAttribute('data-y')) || 0;
    
          let newX = initialX + event.dx;
          let newY = initialY + event.dy;
    
          // Boundary calculations (only for non-rotated elements)
          const containerRect = container.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
    
          const containerLeft = containerRect.left;
          const containerRight = containerRect.right;
          const containerTop = containerRect.top;
          const containerBottom = containerRect.bottom;
    
          const targetWidth = targetRect.width;
          const targetHeight = targetRect.height;
    
          // Only enforce boundary check when not rotated
          if (!target.hasAttribute('data-angle') || target.getAttribute('data-angle') === '0') {
            if (targetRect.left + event.dx < containerLeft) {
              newX = initialX; // Prevent moving out from the left
            } else if (targetRect.right + event.dx > containerRight) {
              newX = initialX; // Prevent moving out from the right
            }
    
            if (targetRect.top + event.dy < containerTop) {
              newY = initialY; // Prevent moving out from the top
            } else if (targetRect.bottom + event.dy > containerBottom) {
              newY = initialY; // Prevent moving out from the bottom
            }
          }
    
          // Apply the new position
          target.style.transform = `translate(${Math.round(newX)}px, ${Math.round(newY)}px) rotate(${Math.round(target.getAttribute('data-angle') || 0)}deg)`;
    
          // Update data attributes
          target.setAttribute('data-x', newX);
          target.setAttribute('data-y', newY);
        },
      },
    })
    .resizable({
      edges: { 
        left: '.handle-w, .handle-nw, .handle-sw', 
        right: '.handle-e, .handle-ne, .handle-se', 
        bottom: '.handle-s, .handle-se, .handle-sw', 
        top: '.handle-n, .handle-nw, .handle-ne' 
      },
      listeners: {
        move(event) {
          const target = event.target;
          const container = document.getElementById('meme-container');
          const containerRect = container.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          
          let x = (parseFloat(target.getAttribute('data-x')) || 0);
          let y = (parseFloat(target.getAttribute('data-y')) || 0);
    
          // Update width and height
          const newWidth = Math.min(event.rect.width, containerRect.right - targetRect.left);
          const newHeight = Math.min(event.rect.height, containerRect.bottom - targetRect.top);
          target.style.width = `${newWidth}px`;
          target.style.height = `${newHeight}px`;
    
          // Prevent resizing beyond left and top boundaries
          if (targetRect.left + event.deltaRect.left < containerRect.left) {
            x = 0;
          } else {
            x += event.deltaRect.left;
          }
    
          if (targetRect.top + event.deltaRect.top < containerRect.top) {
            y = 0;
          } else {
            y += event.deltaRect.top;
          }
    
          // Prevent resizing beyond right and bottom boundaries
          if (targetRect.right + event.deltaRect.right > containerRect.right) {
            target.style.width = `${containerRect.right - targetRect.left}px`;
          }
          if (targetRect.bottom + event.deltaRect.bottom > containerRect.bottom) {
            target.style.height = `${containerRect.bottom - targetRect.top}px`;
          }
    
          // Update transform
          target.style.transform = `translate(${x}px, ${y}px) rotate(${target.getAttribute('data-angle') || 0}deg)`;
    
          // Update attributes
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);

          // For emoji boxes, adjust font size based on the smaller dimension
          if (target.classList.contains('emoji-box')) {
            const minDimension = Math.min(newWidth, newHeight);
            target.style.fontSize = `${minDimension}px`;
          }
    
          // For text boxes, adjust text size
          if (target.classList.contains('text-box')) {
            adjustTextSize(target);
          }
        }
      }
    });
    
  // Add rotation for the element
  interact(element.querySelector('.rotate-handle')).draggable({
    listeners: {
      move(event) {
        const target = event.target.parentElement;
        const rect = target.getBoundingClientRect();
        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
        
        const angle = Math.atan2(event.clientY - center.y, event.clientX - center.x);
        const degrees = angle * (180 / Math.PI);
        
        target.setAttribute('data-angle', degrees);
        const x = parseFloat(target.getAttribute('data-x')) || 0;
        const y = parseFloat(target.getAttribute('data-y')) || 0;
        target.style.transform = `translate(${x}px, ${y}px) rotate(${degrees}deg)`;
      }
    }
  });
}

// ========== STICKER FUNCTIONALITY ==========

/**
 * Opens the sticker modal
 */
function openStickerModal() {
  stickerModal.style.display = 'block';
}

/**
 * Closes the sticker modal
 */
function closeStickerModal() {
  stickerModal.style.display = 'none';
}

/**
 * Searches for stickers based on a search term
 * @param {string} searchTerm - Term to search for
 */
async function searchStickers(searchTerm) {
  try {
      const response = await fetch(`/stickers?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
          throw new Error('Network response was not ok');
      }
      const data = await response.json();
      displayStickers(data);
  } catch (error) {
      console.error('Error fetching stickers:', error);
      resultsContainer.innerHTML = '<p>Error loading stickers. Please try again.</p>';
  }
}

/**
 * Displays stickers in the results container
 * @param {Object} data - Sticker data object
 */
function displayStickers(data) {
  resultsContainer.innerHTML = '';
  const stickers = data.stickers || [];
  stickers.forEach(sticker => {
      const img = document.createElement('img');
      img.src = sticker.url;
      img.alt = sticker.description || 'Sticker';
      img.onclick = () => addStickerToMeme(sticker.url);
      // Add loading="lazy" for better performance with many images
      img.loading = 'lazy';
      resultsContainer.appendChild(img);
  });
}

/**
 * Adds a sticker to the meme canvas
 * @param {string} stickerUrl - URL of the sticker to add
 */
function addStickerToMeme(stickerUrl) {
  // Create a text box at the center of the container
  const memeContainer = document.getElementById('meme-container');
  const x = memeContainer.offsetWidth / 2 - 125; // Half of default width (250px)
  const y = memeContainer.offsetHeight / 2 - 55; // Half of default height (110px)
  
  const textBox = createTextBox('', x, y);
  
  // Set the sticker as the background
  textBox.style.backgroundImage = `url(${stickerUrl})`;
  textBox.style.backgroundSize = 'contain';
  textBox.style.backgroundPosition = 'center';
  textBox.style.backgroundRepeat = 'no-repeat';
  
  // Clear content editable div to ensure it's empty
  const textContent = textBox.querySelector('.text-content');
  textContent.innerHTML = '';
  
  // Make the background visible by setting a transparent text color
  textContent.style.color = 'transparent';
  
  closeStickerModal();
}

// ========== INITIALIZATION AND EVENT LISTENERS ==========

// Initialize emoji picker
const pickerOptions = {
  onEmojiSelect: (emoji) => {
    const container = document.getElementById('meme-container');
    const rect = container.getBoundingClientRect();
    createEmojiBox(emoji.native, rect.width / 2 - 20, rect.height / 2 - 20);
    document.getElementById('emoji-picker').style.display = 'none';
  },
  theme: 'dark'
};

// Initialize emoji picker
const picker = new EmojiMart.Picker({ ...pickerOptions });
document.getElementById('emoji-picker').appendChild(picker);

// Get sticker modal elements
const stickerModal = document.getElementById('sticker-modal');
const closeStickerBtn = document.getElementById('close-stickers');
const searchInput = document.getElementById('sticker-search');
const searchButton = document.getElementById('search-stickers');
const resultsContainer = document.getElementById('sticker-results');
const stickerButton = document.getElementById('stickers');
const inputImage = document.getElementById('urlInput').value;

// ========== EVENT LISTENERS ==========

// Document ready event listener
document.addEventListener('DOMContentLoaded', () => {
    // Set default background
    setBackgroundImage(DEFAULT_BACKGROUND);
    
    // Check for stored URL
    const meme_url = localStorage.getItem('meme_url');
    if (meme_url && isValidImageUrl(meme_url)) {
        urlInput.value = meme_url;
        handleImagePreview();
    }
    
    // Add event listeners
    urlInput.addEventListener('input', handleImagePreview);
    
    // if (removeBGbutton) {
    //     removeBGbutton.addEventListener('click', () => {
    //         const url = urlInput.value.trim();
    //         if (url) {
    //             // Assuming removeBG is defined elsewhere
    //             loadImageAndSetContainerSize(url, removeBG);
    //         }
    //     });
    // }
});

// URL input event listener
urlInput.addEventListener('input', handleImagePreview);

// Emoji button click event
document.getElementById('add-emoji').addEventListener('click', (event) => {
  const picker = document.getElementById('emoji-picker');
  picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
  event.stopPropagation(); // Prevent triggering the click-away logic
});

// Hide picker when clicking outside of it
document.addEventListener('click', (event) => {
  const picker = document.getElementById('emoji-picker');
  // const imageModal = document.getElementById('image-modal');

  if (picker.style.display === 'block' && !picker.contains(event.target)) {
    picker.style.display = 'none';
  }

  // if (imageModal.style.display === 'block' && !imageModal.contains(event.target)) {
  //   imageModal.style.display = 'none';
  // }removebg-settings
});

// Settings modal events
document.getElementById('close-settings').addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

// ========== APPLY ALL SETTINGS FUNCTION ==========

document.getElementById('settings').addEventListener('click', () => {
  const settingsModal = document.getElementById('settings-modal');
  settingsModal.style.display = 'flex';
  // removeBGbutton.style.display = 'none';

  const applyButton = document.getElementById('apply-settings');
  const textBoxes = document.querySelectorAll('.draggable.text-box');

  // Add functionality to remove the text box when the button is clicked
  removeButton.onclick = function() {
      textBoxes.forEach((textBox) => textBox.remove());
      settingsModal.style.display = 'none'; // Close the modal after removing
  };

  // Apply settings to all existing elements with the class "draggable text-box"
  applyButton.onclick = function () {
    currentSettings.font = document.getElementById('font').value;
    currentSettings.caps = document.getElementById('caps').checked;
    currentSettings.bold = document.getElementById('bold').checked;
    currentSettings.italic = document.getElementById('italic').checked;
    currentSettings.effect = document.querySelector('input[name="effect"]:checked').id;
    currentSettings.color = document.getElementById('color').value;
    currentSettings.opacity = document.getElementById('opacity').value;

    textBoxes.forEach((textBox) => applyStylesToTextBox(textBox));

    // Resize to Fit Box
    textBoxes.forEach((textBox) => adjustTextSize(textBox));

    settingsModal.style.display = 'none';
  };

  removeBGbutton.addEventListener('click', async () => {
    const url = urlInput.value.trim();

    if (url) {
      const imageValidation = await validateImage(url);

      if (imageValidation.valid) {
        // Open Lightning Invoice
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
    
            // Add click-to-copy functionality
            AI_UI.lightningInvoice.onclick = () => copyToClipboard(quote);
    
            // Poll for payment
            const status = await pollInvoiceStatus(invoice_id);
            if (status === 'PAID') {
                try {
                    resetModalState()
                    settingsModal.style.display = "none";
                    document.getElementById('loadingIndicator').style.display = 'block';
                    const processed_image = await processImageFromUrl(url);
                    const removedMeme = await removeBG(processed_image.base64);
                    // const base64String = await convertImageToBase64(url);
                    // const removedMeme = await removeBG(base64String);
                    urlInput.value = `data:image/png;base64,${removedMeme}`;
                    handleImagePreview();
                    loadingIndicator.style.display = 'none';
                    settingsModal.style.display = 'none';
                    
                  } catch (error) {
                    console.error(error);
                }
            }
        } catch (error) {
            console.error(error);
        }
      } else {
        alert(`Invalid: ${imageValidation.reason}`);
      }
    }
  });
});


function checkImageRequirements(imageUrl, options = {}) {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    maxSizeMB = 30
  } = options;
  
  return new Promise((resolve, reject) => {
    // First, fetch the image to check its file size
    fetch(imageUrl, { method: 'HEAD' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        // Get file size from Content-Length header
        const contentLength = response.headers.get('Content-Length');
        let sizeInMB = 0;
        
        if (contentLength) {
          sizeInMB = parseInt(contentLength) / (1024 * 1024);
        } else {
          console.warn('Content-Length header not available. Size check may be inaccurate.');
          // If Content-Length is not available, we'll assume it's within limits
          // and check later with the actual image load
        }
        
        // Next, load the image to check dimensions
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
          const result = {
            url: imageUrl,
            width: img.width,
            height: img.height,
            sizeInMB: sizeInMB,
            exceedsMaxDimensions: (img.width > maxWidth || img.height > maxHeight),
            exceedsMaxSize: sizeInMB > maxSizeMB
          };
          
          resolve(result);
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image from URL: ' + imageUrl));
        };
        
        img.src = imageUrl;
      })
      .catch(error => {
        // If fetch fails, try to just load the image directly
        console.warn('Fetch check failed, falling back to direct image loading:', error);
        
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
          // Without fetch, we can't reliably get the file size,
          // so we'll estimate from dimensions (very rough estimate)
          const pixelCount = img.width * img.height;
          // Assuming 4 bytes per pixel (RGBA) + overhead
          const estimatedSizeInMB = (pixelCount * 4) / (1024 * 1024) * 1.2;
          
          const result = {
            url: imageUrl,
            width: img.width,
            height: img.height,
            sizeInMB: estimatedSizeInMB,
            exceedsMaxDimensions: (img.width > maxWidth || img.height > maxHeight),
            exceedsMaxSize: estimatedSizeInMB > maxSizeMB,
            isSizeEstimated: true
          };
          
          resolve(result);
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image from URL: ' + imageUrl));
        };
        
        img.src = imageUrl;
      });
  });
}


/**
 * Converts image URL to Base64 format
 * @param {string} url - Image URL to convert
 * @returns {Promise<string>} - Promise that resolves with the Base64 string
 */
function convertImageToBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Handle CORS issues
    
    img.onload = function() {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions to match the image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image onto the canvas
      ctx.drawImage(img, 0, 0);
      
      // Convert canvas content to Base64 string
      // The second parameter controls image format (default is PNG)
      try {
        const base64String = canvas.toDataURL('image/png');
        resolve(base64String);
      } catch (error) {
        reject(new Error('Failed to convert image to Base64: ' + error.message));
      }
    };
    
    img.onerror = function() {
      reject(new Error('Failed to load image from URL: ' + url));
    };
    
    // Start loading the image
    img.src = url;
  });
}

// Sticker modal events
stickerButton.onclick = openStickerModal;
closeStickerBtn.onclick = closeStickerModal;

// Close when clicking outside modal content
stickerModal.addEventListener('click', function(event) {
  // Close only if the clicked element is the modal background
  // (not the modal content or its children)
  if (event.target === this) {
    closeStickerModal();
  }
});

// Sticker search events
searchButton.onclick = () => searchStickers(searchInput.value);
searchInput.onkeypress = (e) => {
  if (e.key === 'Enter') {
    searchStickers(searchInput.value);
  }
};

// Initialize existing text boxes
document.querySelectorAll('.draggable').forEach(elem => {
  makeInteractive(elem);
  elem.addEventListener('input', () => {
    adjustTextSize(elem);
  });

  elem.setAttribute('spellcheck', 'false'); // Remove spellcheck
  elem.style.caretColor = 'transparent'; // Hide caret as well
});

// Window load event for resizing container to fit image
window.addEventListener('load', () => {
    const memeContainer = document.getElementById('meme-container');
  
    backgroundImg.onload = () => {
      const aspectRatio = backgroundImg.naturalHeight / backgroundImg.naturalWidth;
      memeContainer.style.height = `${memeContainer.offsetWidth * aspectRatio}px`;
    };
});

// Window resize event
window.addEventListener('resize', () => {
  const memeContainer = document.getElementById('meme-container');

  const aspectRatio = backgroundImg.naturalHeight / backgroundImg.naturalWidth;
  memeContainer.style.height = `${memeContainer.offsetWidth * aspectRatio}px`;
});