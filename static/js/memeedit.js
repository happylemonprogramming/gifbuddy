// const actionHistory = []; // Stack to store actions
let emojiCounter = 0;
let textCounter = 0;

const urlInput = document.getElementById('urlInput');
const editor = document.getElementById('editor');
const memeContainer = document.getElementById('meme-container');

const backgroundImg = document.getElementById('background-img');
backgroundImg.style.display = 'none';
document.getElementById('loadingIndicator').style.display = 'block';

backgroundImg.addEventListener('load', () => {
  document.getElementById('loadingIndicator').style.display = 'none';
  backgroundImg.style.display = 'block';
});

document.addEventListener('DOMContentLoaded', () => {
    // Retrieve the text from localStorage
    const meme_url = localStorage.getItem('meme_url');

    if (meme_url) {
        // Check if the copied text is a valid image URL
        if (isValidImageUrl(meme_url)) {
            urlInput.value = meme_url;
            handleImagePreview(); // Trigger preview validation for programmatic value
            
        } else {
            alert('Invalid Url!')
        }
    }
});

// Helper function to validate image URLs
function isValidImageUrl(url) {
    return url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i);
}

function handleImagePreview() {
    const url = urlInput.value.trim();

    if (!url) {
        // If the input is empty, reset everything
        memeContainer.style.display = 'none'; // Clear invalid input
        console.log('No URL input');
        return;
    }

    convertImageToBase64(url)
    memeContainer.style.display = 'block';
}

// Listen for user input in the URL field
urlInput.addEventListener('input', handleImagePreview);

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');

    // Hide the notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

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

// Helper function to get the Base64 Data URL from a file
function getImageDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

// Wrapper function to add a text box and enable image pasting
function addTextBox() {
  const newTextBox = createTextBox('MemeAmigo', 0, 0);
  enableImagePaste(newTextBox);
}

// Generate text box overlay
function createTextBox(text, x, y) {
  const textBox = document.createElement('div');
  textBox.className = 'draggable text-box';
  textBox.id = `text-${textCounter++}`;
  textBox.setAttribute('data-x', 0); // Initialize data-x
  textBox.setAttribute('data-y', 0); // Initialize data-y
  textBox.innerHTML = `
    <div class="text-content" contenteditable="true">${text}</div>
    <div class="resize-handle handle-nw"></div>
    <div class="resize-handle handle-n"></div>
    <div class="resize-handle handle-ne"></div>
    <div class="resize-handle handle-w"></div>
    <div class="resize-handle handle-e"></div>
    <div class="resize-handle handle-sw"></div>
    <div class="resize-handle handle-s"></div>
    <div class="resize-handle handle-se"></div>
    <div class="rotate-handle"></div>
    <div class="settings-handle"></div>
  `;
  
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

function createEmojiBox(emoji, x, y) {
  const emojiBox = document.createElement('div');
  emojiBox.className = 'emoji-box';
  emojiBox.setAttribute('contenteditable', 'true');
  emojiBox.id = `emoji-${emojiCounter++}`;
  emojiBox.innerHTML = `
    ${emoji}
    <div class="resize-handle handle-nw"></div>
    <div class="resize-handle handle-n"></div>
    <div class="resize-handle handle-ne"></div>
    <div class="resize-handle handle-w"></div>
    <div class="resize-handle handle-e"></div>
    <div class="resize-handle handle-sw"></div>
    <div class="resize-handle handle-s"></div>
    <div class="resize-handle handle-se"></div>
    <div class="rotate-handle"></div>
  `;
  
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

// Default settings
let currentSettings = {
  // font: 'Impact, sans-serif',
  font: "'Impact', 'Anton', 'Noto Sans JP', Arial, sans-serif",
  // font: "'Impact', 'Noto Sans JP', 'Noto Sans CJK JP', Arial, sans-serif",
  caps: true,
  bold: false,
  italic: false,
  effect: 'outline',
  opacity: 100,
  color: '#ffffff' // Default to white
};

function applyStylesToTextBox(textBox) {
  // Apply font-related styles
  textBox.style.fontFamily = currentSettings.font;
  textBox.style.textTransform = currentSettings.caps ? 'uppercase' : 'none';
  textBox.style.fontWeight = currentSettings.bold ? 'bold' : 'normal';
  textBox.style.fontStyle = currentSettings.italic ? 'italic' : 'normal';
  textBox.style.color = currentSettings.color;
  textBox.style.opacity = (currentSettings.opacity || 100) / 100;

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

// Adjusting text size function
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
  // }
});
  
// Convert image to base64
function convertImageToBase64(url) {
  const img = new Image();
  console.log('Converting image to base64')
  img.crossOrigin = 'Anonymous';

  img.onload = function () {
    const aspectRatio = img.height / img.width;
    const container = document.getElementById('meme-container');
    const backgroundImg = document.getElementById('background-img');
    container.style.height = `${container.offsetWidth * aspectRatio}px`;
    backgroundImg.src = url;
    // callback();
  };

  img.onerror = function () {
    console.error("Failed to load image.");
  };

  img.src = url;
}

// Initialize existing text boxes
document.querySelectorAll('.draggable').forEach(elem => {
  makeInteractive(elem);
  elem.addEventListener('input', () => {
    adjustTextSize(elem);
  });

  elem.setAttribute('spellcheck', 'false'); // Remove spellcheck
  elem.style.caretColor = 'transparent'; // Hide caret as well
});

// Resizing meme-container to fit image dimensions
window.addEventListener('load', () => {
    const memeContainer = document.getElementById('meme-container');
    const backgroundImg = document.getElementById('background-img');
  
    backgroundImg.onload = () => {
      const aspectRatio = backgroundImg.naturalHeight / backgroundImg.naturalWidth;
      memeContainer.style.height = `${memeContainer.offsetWidth * aspectRatio}px`;
    };
});

// For resizing the window
window.addEventListener('resize', () => {
  const memeContainer = document.getElementById('meme-container');
  const backgroundImg = document.getElementById('background-img');

  const aspectRatio = backgroundImg.naturalHeight / backgroundImg.naturalWidth;
  memeContainer.style.height = `${memeContainer.offsetWidth * aspectRatio}px`;
});


// Close settings modal functionality
document.getElementById('close-settings').addEventListener('click', () => {
  const settingsModal = document.getElementById('settings-modal');
  settingsModal.style.display = 'none';
});


// Settings modal functionality
document.getElementById('settings').addEventListener('click', () => {
  const settingsModal = document.getElementById('settings-modal');
  settingsModal.style.display = 'flex';

  const applyButton = document.getElementById('apply-settings');

  // Apply settings to all existing elements with the class "draggable text-box"
  applyButton.onclick = function () {
    currentSettings.font = document.getElementById('font').value;
    currentSettings.caps = document.getElementById('caps').checked;
    currentSettings.bold = document.getElementById('bold').checked;
    currentSettings.italic = document.getElementById('italic').checked;
    currentSettings.effect = document.querySelector('input[name="effect"]:checked').id;
    currentSettings.color = document.getElementById('color').value;
    currentSettings.opacity = document.getElementById('opacity').value;

    const textBoxes = document.querySelectorAll('.draggable.text-box');

    textBoxes.forEach((textBox) => applyStylesToTextBox(textBox));

    // Resize to Fit Box
    textBoxes.forEach((textBox) => adjustTextSize(textBox));

    settingsModal.style.display = 'none';
  };
});


// Attach settings button functionality dynamically
document.addEventListener('click', (event) => {
  if (event.target.classList.contains('settings-handle')) {
    // Correct class selector for .draggable and .text-box
    const textBox = event.target.closest('.draggable.text-box');
    const settingsModal = document.getElementById('settings-modal');
    settingsModal.style.display = 'flex';

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

    // Update your button click handler
    const removeBGbutton = document.getElementById('removebg-settings');
    removeBGbutton.onclick = async function() {
      try {
        // Disable button while processing
        removeBGbutton.disabled = true;
        
        // Get the textbox background image
        // const textBox = document.querySelector('.text-box'); // Adjust selector as needed
        const backgroundImage = textBox.style.backgroundImage;
        
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
      } finally {
        // Re-enable button
        removeBGbutton.disabled = false;
      }
    };
  };
});

// Function to extract base64 from CSS background-image URL
function getBase64FromBackgroundImage(backgroundImageStyle) {
  // Remove url() and quotes from CSS background-image
  const urlMatch = backgroundImageStyle.match(/url\(['"]?(.*?)['"]?\)/);
  if (!urlMatch) return null;
  return urlMatch[1];
}

// Function to call the remove background API
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

function jsPaint() {
  const memeTemplate = urlInput.value; // Assuming urlInput is an input element
  window.location.href = `https://jspaint.app/#load:${memeTemplate}`;
}

// Get modal elements
const stickerModal = document.getElementById('sticker-modal');
const closeStickerBtn = document.getElementById('close-stickers');
const searchInput = document.getElementById('sticker-search');
const searchButton = document.getElementById('search-stickers');
const resultsContainer = document.getElementById('sticker-results');
const stickerButton = document.getElementById('stickers');
stickerButton.onclick = openStickerModal;

// Open/close modal functions
function openStickerModal() {
  stickerModal.style.display = 'block';
}

function closeStickerModal() {
  stickerModal.style.display = 'none';
}

// Close modal when clicking the close button
closeStickerBtn.onclick = closeStickerModal;

// Close modal when clicking outside
window.onclick = function(event) {
  if (event.target === stickerModal) {
    closeStickerModal();
  }
};

// Event listeners for search
searchButton.onclick = () => searchStickers(searchInput.value);
searchInput.onkeypress = (e) => {
  if (e.key === 'Enter') {
    searchStickers(searchInput.value);
  }
};

// Display stickers in the grid
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

// Search functionality remains the same
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

// Add sticker to meme canvas
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

// Get AI modal elements
const aiModal = document.getElementById('ai-modal');
const aiGenerator = document.getElementById('ai-generator');
const closeAIBtn = document.getElementById('close-ai');
const aiInput = document.getElementById('ai-input');
const aiButton = document.getElementById('ai-button');

// Open modal
aiGenerator.onclick = openAIModal;
aiInput.onkeypress = (e) => {
  if (e.key === 'Enter') {
    searchStickers(searchInput.value);
  }
};


// Open/close modal functions
function openAIModal() {
  aiModal.style.display = 'block';
}

function closeAIModal() {
  aiModal.style.display = 'none';
}

// Close modal when clicking the close button
closeAIBtn.onclick = closeAIModal;

// Close modal when clicking outside
window.onclick = function(event) {
  if (event.target === aiModal) {
    closeAIModal();
  }
};

// Primary AI function to fetch image
async function aiCreate(prompt) {
  try {
    const response = await fetch(`https://image-generator.lemonknowsall.workers.dev/?prompt=${encodeURIComponent(prompt)}`, {
      method: 'GET',
      mode: 'cors', // Explicitly set CORS mode
    });
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);
    console.log('Generated image URL:', imageUrl);
    urlInput.value = imageUrl
    
  } catch (error) {
    console.error('Error fetching image:', error);
    resultsContainer.innerHTML = '<p>Error generating image. Please try again.</p>';
  }
}

// Fetch image, close modal, preview image
aiButton.onclick = async () => {
  aiButton.disabled = true;  // Disable button while processing
  try {
    document.getElementById('loadingIndicator').style.display = 'block';
    await aiCreate(aiInput.value);
    closeAIModal();
    handleImagePreview(); // Trigger preview validation for programmatic value
  } catch (error) {
    document.getElementById('loadingIndicator').style.display = 'none';
    aiButton.disabled = false;  // Re-enable button
    console.error('Error:', error);
  } finally {
    document.getElementById('loadingIndicator').style.display = 'none';
    aiButton.disabled = false;  // Re-enable button
  }
}

// // Swipe gesture to reset page
// document.addEventListener("DOMContentLoaded", function () {
//     let startX = 0, startY = 0;

//     // Start of touch event to get initial coordinates
//     document.addEventListener("touchstart", function (e) {
//         startX = e.touches[0].clientX;
//         startY = e.touches[0].clientY;
//     });

//     // End of touch event to detect swipe direction
//     document.addEventListener("touchend", function (e) {
//         const endX = e.changedTouches[0].clientX;
//         const endY = e.changedTouches[0].clientY;

//         const diffX = endX - startX;
//         const diffY = endY - startY;
//         const swipeThreshold = 50; // Minimum distance for a swipe to be registered

//         // Determine if the swipe is horizontal or vertical
//         if (Math.abs(diffX) < Math.abs(diffY)) {
//             // Vertical swipe
//             if (diffY > swipeThreshold) {
//               // Swipe Down - Refresh the page
//               console.log("Swipe Down to Refresh")
//               window.location.reload()
//               showNotification("Pull Down to Restart!")
//           }
//         }
//     });
// });

// // Shake to Undo
// let shakeThreshold = 15; // Adjust based on sensitivity needs
// let lastShakeTime = 0;
// let debounceDelay = 1000; // 1 second between shakes

// function onDeviceMotion(event) {
//   const acceleration = event.accelerationIncludingGravity;

//   // Calculate total force
//   const totalForce = Math.sqrt(
//     Math.pow(acceleration.x || 0, 2) +
//     Math.pow(acceleration.y || 0, 2) +
//     Math.pow(acceleration.z || 0, 2)
//   );

//   const currentTime = Date.now();
  
//   // Detect a shake (force exceeds threshold and debounce delay passed)
//   if (totalForce > shakeThreshold && currentTime - lastShakeTime > debounceDelay) {
//     lastShakeTime = currentTime; // Update last shake time
//     undoLastAction(); // Perform the undo action
//   }
// }

// // Undo function
// function undoLastAction() {
//   if (actionHistory.length === 0) {
//     console.log('No actions to undo.');
//     return;
//   }

//   const lastAction = actionHistory.pop();

//   switch (lastAction.type) {
//     case 'create':
//       // Remove the last created element
//       lastAction.element.remove();
//       showNotification("Shake to Undo!")
//       break;

//     // Future cases: handle resize, move, text changes, etc.
//     default:
//       console.log('Unhandled action type:', lastAction.type);
//   }
// }


// // Add listener for device motion
// if (window.DeviceMotionEvent) {
//   window.addEventListener('devicemotion', onDeviceMotion);
// } else {
//   console.log("DeviceMotionEvent not supported on this device.");
// }
