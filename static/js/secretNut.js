// DOM Element References
const UI = {
    secretButton: document.getElementById('hide-message'),
    embedSecretBtn: document.getElementById('secret-button'),
    secretInput: document.getElementById('secret-input'),
    secretAmount: document.getElementById('secret-amount'),
    mintInvoice: document.getElementById('mint-invoice'),
    secretModal: document.getElementById('secret-modal'),
    closeSecretBtn: document.getElementById('close-secret'),
    copyText: document.getElementById('copyText')
};

// Configuration
const CONFIG = {
    mintUrl: 'https://mint.minibits.cash/Bitcoin',
    pollInterval: 5000 // 5 seconds
};

// Event Listeners
UI.secretButton.onclick = openSecretModal;
UI.embedSecretBtn.onclick = embedSecret;
UI.closeSecretBtn.onclick = closeSecretModal;

/**
 * Resets the modal state to its initial condition
 */
function resetSecretState() {
    console.log('Resetting modal state - START');
    
    // Continue with reset operations
    if (UI.secretInput) UI.secretInput.value = '';
    if (UI.secretAmount) UI.secretAmount.value = '';
    
    if (UI.mintInvoice) {
        UI.mintInvoice.style.display = 'none';
        UI.mintInvoice.innerHTML = '';
    }
    
    if (UI.copyText) UI.copyText.style.display = 'none';
    
    if (UI.embedSecretBtn) UI.embedSecretBtn.disabled = false;
    
    console.log('Resetting modal state - COMPLETE');
}

/**
 * Opens the secret modal
 */
function openSecretModal() {
    UI.secretModal.style.display = 'block';
    // Set flag when opening
    UI.secretModal.dataset.isOpen = 'true';
}

/**
 * Closes the secret modal and resets its state
 */
function closeSecretModal() {
    console.log('Closing modal - START');
    resetSecretState();
    UI.secretModal.style.display = 'none';
    // Add a flag to indicate modal status
    UI.secretModal.dataset.isOpen = 'false';
    console.log('Closing modal - COMPLETE');
}
/**
 * Handles embedding secrets with optional payment processing
 */
async function embedSecret() {
    try {
        const memo = UI.secretInput.value;
        const amount = parseInt(UI.secretAmount.value);

        if (!amount) {
            // Store the secret token without payment
            localStorage.setItem("secret", memo);
        } else {
            // Generate invoice and process payment
            const result = await generateInvoice();
            if (!result) {
                console.error("Failed to generate invoice. Aborting.");
                showNotification("Invoice generation failed.");
                return;
            }

            const { wallet, mintQuote } = result;
            console.log("Waiting for payment...");
            
            // Poll for payment status while modal is open
            let status;
            while (UI.secretModal.dataset.isOpen === 'true') {
                await new Promise(resolve => setTimeout(resolve, CONFIG.pollInterval));
                status = await wallet.checkMintQuote(mintQuote.quote);
                console.log('Quote Status:', status.state);
                
                if (status.state === 'PAID') {
                    console.log("Payment confirmed:", status);
                    break;
                }
            }

            // Handle modal closure during payment wait
            if (UI.secretModal.style.display !== 'block') {
                console.log("Modal closed before payment was confirmed");
                resetSecretState()
                return;
            }

            // Process payment and generate token
            const proofs = await wallet.mintProofs(amount, mintQuote.quote);
            const { keep, send } = await wallet.send(amount, proofs);
            
            const cashuToken = cashuts.getEncodedToken({
                mint: CONFIG.mintUrl,
                proofs: proofs,
                ...(memo && memo.trim() ? { memo } : {})
            }, { version: 4 });        

            localStorage.setItem("secret", cashuToken);
        }

        showNotification("Secret Saved!");
        closeSecretModal();

    } catch (error) {
        console.error("Error:", error);
        return false;
    }
}

/**
 * Generates a Lightning invoice for payment
 */
async function generateInvoice() {
    const amount = parseInt(UI.secretAmount.value);

    try {
        UI.embedSecretBtn.disabled = true;

        // Initialize wallet and create quote
        const mint = new cashuts.CashuMint(CONFIG.mintUrl);
        const wallet = new cashuts.CashuWallet(mint);
        await wallet.loadMint();
        
        const mintQuote = await wallet.createMintQuote(amount);
        console.log("Mint Quote received:", mintQuote);

        // Generate QR code
        UI.mintInvoice.innerHTML = '';
        new QRCode(UI.mintInvoice, {
            text: mintQuote.request,
            width: 256,
            height: 256
        });

        UI.mintInvoice.style.display = 'flex';
        UI.copyText.style.display = 'flex';

        // Add click-to-copy functionality
        UI.mintInvoice.onclick = () => copyToClipboard(mintQuote.request);

        return { wallet, mintQuote };

    } catch (error) {
        console.error("Error in generateInvoice:", error);
        resetSecretState();
        showNotification("Something Broke!");
        return null;
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

// Close modal when clicking outside
UI.secretModal.addEventListener('click', function(event) {
    if (event.target === this) {
        closeSecretModal();
    }
});