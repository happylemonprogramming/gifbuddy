function textToBinary(text) {
    // Convert string to array of bytes, then to binary
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let byte of bytes) {
        binary += byte.toString(2).padStart(8, '0');
    }
    return binary;
}

function binaryToText(binary) {
    // Convert binary string to bytes, then to text
    const bytes = new Uint8Array(Math.ceil(binary.length / 8));
    for (let i = 0; i < binary.length; i += 8) {
        bytes[i / 8] = parseInt(binary.substr(i, 8), 2);
    }
    return new TextDecoder().decode(bytes);
}

function encodeImageData(imageData, text, nBits = 2) {
    const width = imageData.width;
    const height = imageData.height;
    const data = new Uint8Array(imageData.data);
    
    // Convert text to binary
    const binaryText = textToBinary(text);
    
    // Add length prefix (32 bits)
    const lengthBinary = binaryText.length.toString(2).padStart(32, '0');
    const fullBinaryText = lengthBinary + binaryText;
    
    // Check if image is large enough
    const maxTextBits = (width * height * 3 * nBits);
    if (fullBinaryText.length > maxTextBits) {
        throw new Error(`Text is too long to hide. Maximum ${maxTextBits} bits can be hidden.`);
    }
    
    let binaryIndex = 0;
    
    // Encode the binary text into image data
    for (let i = 0; i < data.length; i += 4) {
        if (binaryIndex >= fullBinaryText.length) break;
        
        // Modify RGB channels (skip alpha)
        for (let j = 0; j < 3; j++) {
            if (binaryIndex >= fullBinaryText.length) break;
            
            // Clear the least significant bits and set new bits
            const bits = fullBinaryText.substr(binaryIndex, nBits).padEnd(nBits, '0');
            data[i + j] = (data[i + j] & ~((1 << nBits) - 1)) | parseInt(bits, 2);
            binaryIndex += nBits;
        }
    }
    
    // Update the original imageData
    imageData.data.set(data);
    return imageData;
}

function decodeImageData(imageData, nBits = 2) {
    const data = new Uint8Array(imageData.data);
    let binaryText = '';
    let bitCount = 0;
    let textLength = null;
    
    // Extract binary data from image
    for (let i = 0; i < data.length; i += 4) {
        // Process RGB channels (skip alpha)
        for (let j = 0; j < 3; j++) {
            // Extract bits from current channel
            const channelBits = data[i + j] & ((1 << nBits) - 1);
            binaryText += channelBits.toString(2).padStart(nBits, '0');
            bitCount += nBits;
            
            // First get the length (stored in first 32 bits)
            if (textLength === null && bitCount >= 32) {
                textLength = parseInt(binaryText.substr(0, 32), 2);
                binaryText = binaryText.substr(32);
                bitCount -= 32;
            }
            
            // Check if we've got all the text
            if (textLength !== null && bitCount >= textLength) {
                // Trim to exact length and convert back to text
                return binaryToText(binaryText.substr(0, textLength));
            }
        }
    }
    
    throw new Error('No valid message found in image');
}