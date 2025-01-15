// Variable & Element ID initialization
const resultsDiv = document.getElementById('results');
const favortiesDiv = document.getElementById('favorites');
const zapButton = document.getElementById('zapButton');
const zapPopup = document.getElementById('zapPopup');
const memeGif = document.getElementById('meme-gif-button');
const modal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const modalText = document.getElementById("modalText");
const modalClose = document.querySelector(".modal-close");
const modalSave = document.getElementById("save-button");
const tempText = document.getElementById("temp-text")
const instructions = document.getElementById("instructions")
const gotoButton = document.getElementById("gotoCollectionButton")
const loading = document.getElementById("loadingIndicator")

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');

    // Hide the notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Modal save button
modalSave.addEventListener("click", () => {
    modal.style.display = "none";
});

// Modal close button
modalClose.addEventListener("click", () => {
    modal.style.display = "none";
});

// Close modal when clicking outside
window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

async function copyToClipboard(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
        // Copy text to clipboard
        document.execCommand('copy');
        // await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard!');

        // Save the text in localStorage for the next page
        localStorage.setItem('copiedText', text);
        console.log('Copied to clipboard and saved to local storage!')

    } catch (err) {
        console.error('Fallback failed:', err);
        showNotification('Failed to copy text to clipboard.');
    }
    document.body.removeChild(tempInput);
}

// Event listener for image clicks in the collection (for editing)
favortiesDiv.addEventListener("click", (e) => {
    if (e.target.tagName === "IMG") {
        currentImage = e.target;
        copyToClipboard(currentImage.src)
        // modalImage.src = currentImage.src;
        // modalImage.title = currentImage.title;
        // modalText.value = currentImage.title;
        // modal.style.display = "block";
    }
});

// Function to fetch favorites and update the DOM
// function fetchFavorites(pubkey) {
//     loading.style.display = "block";
//     if (pubkey.startsWith("npub")) {
//         // Send the GET request to /favorites with the pubkey parameter
//         fetch(`/favorite?pubkey=${pubkey}`)
//             .then(response => {
//                 if (!response.ok) {
//                     loading.style.display = "block";
//                     throw new Error('Network response was not ok');
//                 }
//                 return response.json(); // Parse the response as JSON
//             })
//             .then(data => {
//                 // Ensure data is an array
//                 if (!Array.isArray(data)) {
//                     loading.style.display = "block";
//                     console.error('Expected an array, but got:', data);
//                     alert("Unexpected response from server")
//                     return; // Early return if data is not an array
//                 } else if (data.length === 0) {
//                     instructions.style.display = "block";
//                     tempText.style.display = "block";
//                     gotoButton.style.display = "block";
//                     alert('No saved GIFs!');
//                 } else {
//                     // Get the "favorites" div to insert the GIFs
//                     const favoritesDiv = document.getElementById('favorites');
//                     favoritesDiv.innerHTML = ''; // Clear the previous content, if any

//                     // Loop through each item in the returned data
//                     data.forEach(item => {
//                         // Ensure the item has a title and thumb_urls array
//                         if (!item.title || !Array.isArray(item.thumb_urls)) {
//                             console.error('Invalid item format:', item);
//                             return; // Skip this item if it's malformed
//                         }

//                         // Create a div to hold the title and GIFs for this category
//                         const categoryDiv = document.createElement('div');
//                         categoryDiv.classList.add('category'); // Add a class for styling

//                         // Create and set the title for this category
//                         const titleElement = document.createElement('h4');
//                         titleElement.innerText = item.title; // Set the title
//                         categoryDiv.appendChild(titleElement);

//                         // Create the images-container div
//                         const imagesContainer = document.createElement('div');
//                         imagesContainer.classList.add('images-container'); // Add a class for styling

//                         // Loop through each gif URL and create an <img> element
//                         item.thumb_urls.forEach(gifUrl => {
//                             const imgElement = document.createElement('img');
//                             imgElement.src = gifUrl; // Set the source URL for the GIF
//                             imgElement.alt = item.title; // Optionally set alt text for the image
//                             imagesContainer.appendChild(imgElement); // Append the image to the container
//                         });

//                         // Append the images container to the category div
//                         categoryDiv.appendChild(imagesContainer);

//                         // Append the category div to the favorites section
//                         favoritesDiv.appendChild(categoryDiv);
//                         loading.style.display = "none";
//                     });
//                 }
//             })
//             .catch(error => {
//                 console.error('Error fetching favorites:', error);
//                 // Get the "favorites" div to insert the GIFs
//                 const favoritesDiv = document.getElementById('favorites');
//                 favoritesDiv.innerHTML = ''; // Clear the previous content, if any
//                 loading.style.display = "none";
//                 alert('Something went wrong')
//             });
//     } else {
//         alert('Login must be in bech32 format (npub...)')
//     }
// }

// // Function to fetch favorites and update the DOM
// function fetchFavorites(pubkey) {
//     loading.style.display = "block";

//     if (pubkey.startsWith("npub")) {
//         fetch(`/favorite?pubkey=${pubkey}`)
//             .then(response => {
//                 if (!response.ok) {
//                     loading.style.display = "none";
//                     throw new Error('Network response was not ok');
//                 }
//                 return response.json();
//             })
//             .then(data => {
//                 // Ensure data is an array
//                 if (!Array.isArray(data)) {
//                     loading.style.display = "none";
//                     console.error('Expected an array, but got:', data);
//                     alert("Unexpected response from server");
//                     return;
//                 } else if (data.length === 0) {
//                     instructions.style.display = "block";
//                     tempText.style.display = "block";
//                     gotoButton.style.display = "block";
//                     alert('No saved GIFs!');
//                 } else {
//                     const favoritesDiv = document.getElementById('favorites');
//                     favoritesDiv.innerHTML = ''; // Clear previous content

//                     // Loop through the data
//                     data.forEach(item => {
//                         const tags = item.tags || [];

//                         // Find title from tags
//                         const titleTag = tags.find(tag => tag[0] === 'title');
//                         const title = titleTag ? titleTag[1] : 'Untitled';

//                         // Extract imeta tags for GIFs
//                         const imetaTags = tags.filter(tag => tag[0] === 'imeta');
//                         const thumbUrls = imetaTags.map(tag => {
//                             const thumbIndex = tag.findIndex(entry => entry.startsWith('thumb '));
//                             return thumbIndex !== -1 ? tag[thumbIndex].split(' ')[1] : null;
//                         }).filter(url => url); // Remove null values

//                         // Skip if no thumbnails are found
//                         if (thumbUrls.length === 0) return;

//                         // Create a div for this category
//                         const categoryDiv = document.createElement('div');
//                         categoryDiv.classList.add('category');

//                         // Add title
//                         const titleElement = document.createElement('h4');
//                         titleElement.innerText = title;
//                         categoryDiv.appendChild(titleElement);

//                         // Add images
//                         const imagesContainer = document.createElement('div');
//                         imagesContainer.classList.add('images-container');

//                         thumbUrls.forEach(gifUrl => {
//                             const imgElement = document.createElement('img');
//                             imgElement.src = gifUrl;
//                             imgElement.alt = title;
//                             imagesContainer.appendChild(imgElement);
//                         });

//                         categoryDiv.appendChild(imagesContainer);
//                         favoritesDiv.appendChild(categoryDiv);
//                     });

//                     loading.style.display = "none";
//                 }
//             })
//             .catch(error => {
//                 console.error('Error fetching favorites:', error);
//                 document.getElementById('favorites').innerHTML = ''; // Clear previous content
//                 loading.style.display = "none";
//                 alert('Something went wrong');
//             });
//     } else {
//         alert('Login must be in bech32 format (npub...)');
//     }
// }

// Function to fetch favorites and update the DOM
function fetchFavorites(pubkey) {
    loading.style.display = "block";

    if (pubkey.startsWith("npub")) {
        fetch(`/favorite?pubkey=${pubkey}`)
            .then(response => {
                if (!response.ok) {
                    loading.style.display = "none";
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Ensure data is an array
                if (!Array.isArray(data)) {
                    loading.style.display = "none";
                    console.error('Expected an array, but got:', data);
                    alert("Unexpected response from server");
                    return;
                } else if (data.length === 0) {
                    loading.style.display = "none";
                    instructions.style.display = "block";
                    tempText.style.display = "block";
                    gotoButton.style.display = "block";
                    alert('No saved GIFs!');
                } else {
                    const favoritesDiv = document.getElementById('favorites');
                    favoritesDiv.innerHTML = ''; // Clear previous content

                    // Loop through the data
                    data.forEach(item => {
                        const tags = item.tags || [];

                        // Find title from tags
                        const titleTag = tags.find(tag => tag[0] === 'title');
                        const title = titleTag ? titleTag[1] : 'Untitled';

                        // Extract imeta tags for GIFs
                        const imetaTags = tags.filter(tag => tag[0] === 'imeta');
                        const thumbUrls = imetaTags.map(tag => {
                            const thumbIndex = tag.findIndex(entry => entry.startsWith('thumb '));
                            return thumbIndex !== -1 ? tag[thumbIndex].split(' ')[1] : null;
                        }).filter(url => url); // Remove null values

                        // Skip if no thumbnails are found
                        if (thumbUrls.length === 0) return;

                        // Create a div for this category
                        const categoryDiv = document.createElement('div');
                        categoryDiv.classList.add('category');

                        // Add title with copy functionality
                        const titleElement = document.createElement('h4');
                        titleElement.innerText = title;
                        titleElement.classList.add('title');
                        titleElement.onclick = () => copyJSON(item); // Attach click event
                        categoryDiv.appendChild(titleElement);

                        // Add images
                        const imagesContainer = document.createElement('div');
                        imagesContainer.classList.add('images-container');

                        thumbUrls.forEach(gifUrl => {
                            const imgElement = document.createElement('img');
                            imgElement.src = gifUrl;
                            imgElement.alt = title;
                            imagesContainer.appendChild(imgElement);
                        });

                        categoryDiv.appendChild(imagesContainer);
                        favoritesDiv.appendChild(categoryDiv);
                    });

                    loading.style.display = "none";
                }
            })
            .catch(error => {
                console.error('Error fetching favorites:', error);
                document.getElementById('favorites').innerHTML = ''; // Clear previous content
                loading.style.display = "none";
                alert('Something went wrong');
            });
    } else {
        alert('Login must be in bech32 format (npub...)');
    }
}

// Function to copy JSON to clipboard
function copyJSON(data) {
    const jsonString = JSON.stringify(data, null, 2); // Convert the JSON dictionary to a string
    navigator.clipboard.writeText(jsonString)
        .then(() => {
            alert("JSON copied to clipboard!");
        })
        .catch(err => {
            console.error("Failed to copy JSON: ", err);
        });
}

// Example usage (pass your pubkey here)
const storedPubkey = localStorage.getItem('pubkey');
console.log(storedPubkey);

if (storedPubkey === null) {
    alert('Must log-in to view this page')
} else {
    fetchFavorites(storedPubkey);
}


// // Function to fetch favorites and update the DOM
// function fetchFavorites(pubkey) {
//     // Send the GET request to /favorites with the pubkey parameter
//     fetch(`/favorite?pubkey=${pubkey}`)
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error('Network response was not ok');
//             }
//             return response.json();  // Parse the response as JSON
//         })
//         .then(data => {
//             // Ensure data is an array
//             if (!Array.isArray(data)) {
//                 console.error('Expected an array, but got:', data);
//                 return; // Early return if data is not an array
//             }

//             // Get the "favorites" div to insert the GIFs
//             const favoritesDiv = document.getElementById('favorites');
//             favoritesDiv.innerHTML = ''; // Clear the previous content, if any

//             // Loop through each item in the returned data
//             data.forEach(item => {
//                 // Ensure the item has a title and thumb_urls array
//                 if (!item.title || !Array.isArray(item.thumb_urls)) {
//                     console.error('Invalid item format:', item);
//                     return; // Skip this item if it's malformed
//                 }

//                 // Create a div to hold the title and GIFs for this category
//                 const categoryDiv = document.createElement('div');
//                 categoryDiv.classList.add('category'); // Optionally add a class for styling

//                 // Create and set the title for this category
//                 const titleElement = document.createElement('h4');
//                 titleElement.innerText = item.title;  // Set the title
//                 categoryDiv.appendChild(titleElement);

//                 // Loop through each gif URL and create an <img> element
//                 item.thumb_urls.forEach(gifUrl => {
//                     const imgElement = document.createElement('img');
//                     imgElement.src = gifUrl;  // Set the source URL for the GIF
//                     imgElement.alt = item.title; // Optionally set alt text for the image
//                     categoryDiv.appendChild(imgElement);
//                 });

//                 // Append the category div to the favorites section
//                 favoritesDiv.appendChild(categoryDiv);
//             });
//         })
//         .catch(error => {
//             console.error('Error fetching favorites:', error);
//         });
// }
// // Example usage (pass your pubkey here)
// const storedPubkey = localStorage.getItem('pubkey');
// console.log(storedPubkey)
// fetchFavorites(storedPubkey);
