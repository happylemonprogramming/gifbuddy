// Variable & Element ID initialization
const zapButton = document.getElementById('zapButton');
const zapPopup = document.getElementById('zapPopup');
const uploadButton = document.getElementById('uploadButton');
const uploadPopup = document.getElementById('uploadPopup');
const uploadForm = document.getElementById('uploadForm');
const uploadResults = document.getElementById('uploadResults');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileUpload');
const fileInfo = dropZone.querySelector('.file-info');
const fileName = fileInfo.querySelector('.file-name');
const fileSize = fileInfo.querySelector('.file-size');
const removeFile = fileInfo.querySelector('.remove-file');
const dropZoneText = dropZone.querySelector('.drop-zone-text');
const fileSizeLimits = dropZone.querySelectorAll('.file-size-limit');
const resultsDiv = document.getElementById('results');

// Add this helper function
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Add this function to update the dropzone
function updateDropZone(file) {
    if (file) {
        dropZone.classList.add('has-file');
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = 'flex';
        dropZoneText.classList.add('with-file');
        fileSizeLimits.forEach(limit => limit.classList.add('with-file'));
    } else {
        dropZone.classList.remove('has-file');
        fileInfo.style.display = 'none';
        dropZoneText.classList.remove('with-file');
        fileSizeLimits.forEach(limit => limit.classList.remove('with-file'));
        fileInput.value = '';
    }
}

// Add these event listeners
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        updateDropZone(file);
    }
});

removeFile.addEventListener('click', (e) => {
    e.stopPropagation();
    updateDropZone(null);
    document.querySelector('.file-info').style.display = 'none';
});

// Modify your existing drop handler to include the update
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'image/gif' || file.type === 'video/mp4')) {
        fileInput.files = e.dataTransfer.files;
        updateDropZone(file);
    } else {
        alert('Please upload a GIF or MP4 file.');
    }
});

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');

    // Hide the notification after 2 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Dropzone to Fileupload click transformation
document.getElementById('dropZone').addEventListener('click', function() {
    document.getElementById('fileUpload').click();
});

// Set file size limit
const maxSize = 21 * 1024 * 1024; // 21MB in bytes

// Logic for loaded file
document.getElementById('fileUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];

    if (file) {
        if (file.size > maxSize) {
            alert('The selected file is too large. Maximum allowed size is 21MB.');
            document.getElementById('fileUpload').value = ''; // Clear the file input
        } else {           
            fileName.textContent = file.name;
            fileSize.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
            fileInfo.style.display = 'block';
        }
    }
});

// Handle file removal
document.querySelector('.remove-file')?.addEventListener('click', function() {
    document.getElementById('fileUpload').value = ''; // Reset the file input
    document.querySelector('.file-info').style.display = 'none'; // Hide file info
});


// Gif and MP4 Upload function
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Show loading indicator
    // document.getElementById('uploadHeader').style.display = 'none';
    // document.getElementById('uploadForm').style.display = 'none';
    // document.getElementById('loadingIndicator').style.display = 'block';
    
    const caption = document.getElementById('caption').value;
    const file = document.getElementById('fileUpload').files[0];

    if (!file) {
        alert('Please select a file to upload.');
        // document.getElementById('loadingIndicator').style.display = 'none';
        return;
    }

    const formData = new FormData();
    formData.append('caption', caption);
    formData.append('file', file);

    try {
        const response = await axios.post('/uploading', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 60000 // 60 seconds timeout
        });

        showNotification('File sent for processing!');
        // document.getElementById('loadingIndicator').style.display = 'none';


        // console.log('File uploaded successfully:', response.data.url);

        // const url = String(response.data.url);
        // if (url) {
        //     document.getElementById('uploadHeader').style.display = 'none';
        //     document.getElementById('uploadForm').style.display = 'none';
        //     document.getElementById('loadingIndicator').style.display = 'none';

        //     // Create container for GIF and copy button
        //     const container = document.createElement('div');
        //     container.classList.add('gif-container');
            
        //     // Create GIF element
        //     const gifElement = document.createElement('img');
        //     gifElement.src = url;
        //     gifElement.classList.add('gif');
            
        //     // Make GIF clickable
        //     gifElement.style.cursor = 'pointer';
        //     gifElement.title = 'Copy';
            
        //     // Add click handler
        //     gifElement.addEventListener('click', async () => {
        //         try {
        //             await navigator.clipboard.writeText(url);
        //             showNotification('Copied!');
                    
        //         } catch (err) {
        //             console.error('Failed to copy:', err);
        //             alert('Failed to Copy!');
        //         }
        //     });
            
        //     container.appendChild(gifElement);
        //     resultsDiv.insertBefore(container, resultsDiv.firstChild);

        //     showNotification('File uploaded successfully!');
        // } else {
        //     console.error('URL not found in response:', response.data);
        //     alert('File uploaded, but URL not received.');
        // }

        uploadForm.reset();
        e.stopPropagation();
        updateDropZone(null);
        document.querySelector('.file-info').style.display = 'none';
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error('Error: Request timed out after 60 seconds');
            alert('The upload request timed out. Please try again.');
        } else {
            console.error('Error uploading file:', error);
            alert('An error occurred while uploading the file.');
        }
    // } finally {
    //     // Hide loading indicator
    //     document.getElementById('loadingIndicator').style.display = 'none';
    }
});