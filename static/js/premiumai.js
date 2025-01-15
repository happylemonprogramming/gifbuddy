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

  