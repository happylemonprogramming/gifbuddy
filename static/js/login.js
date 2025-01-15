// Login functionality
let isLoggedIn = false;
const loginContainer = document.getElementById('loginContainer');
const loginModal = document.getElementById('loginModal');
let loginButton = document.getElementById('loginButton');
const pubkeyInput = document.getElementById('pubkeyInput');
const submitButton = document.getElementById('loginSubmitButton');

// Initialize login status on page load
window.addEventListener('DOMContentLoaded', () => {
    const storedPubkey = localStorage.getItem('pubkey');
    if (storedPubkey) {
        isLoggedIn = true;
        updateLoginButton();
    }
});

// Show login modal
loginButton.addEventListener('click', () => {
    if (!isLoggedIn) {
        loginModal.style.display = 'block';
    }
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === loginModal) {
        loginModal.style.display = 'none';
    }
});

// Handle login submission
submitButton.addEventListener('click', handleLogin);
pubkeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

function handleLogin() {
    const pubkey = pubkeyInput.value.trim();
    if (pubkey.startsWith("npub")) {
        isLoggedIn = true;
        localStorage.setItem('pubkey', pubkey); // Store pubkey in localStorage
        loginModal.style.display = 'none';
        pubkeyInput.value = '';
        updateLoginButton();
    } else {
        alert('Login must be in bech32 format (npub...)')
    }
}

function handleLogout() {
    isLoggedIn = false;
    localStorage.removeItem('pubkey'); // Remove pubkey from localStorage
    updateLoginButton();
    closeDropdown();
}

// function updateLoginButton() {
//     if (isLoggedIn) {
//         const storedPubkey = localStorage.getItem('pubkey');
//         loginContainer.innerHTML = `
//             <div class="dropdown">
//                 <button class="loginBtn" onclick="toggleDropdown()">Logged In</button>
//                 <div class="dropdown-content" id="dropdownContent">
//                     <a href="/favorites">My Collections</a>
//                     <a onclick="handleLogout()">Log Out</a>
//                 </div>
//             </div>
//         `;
//     } else {
//         loginContainer.innerHTML = `
//             <button class="loginBtn" id="loginButton">Login</button>
//         `;
//         let loginButton = document.getElementById('loginButton');
//         loginButton.addEventListener('click', () => {
//             loginModal.style.display = 'block';
//         });
//     }
// }

function updateLoginButton() {
    const loginButton = document.getElementById('loginButton');
    const dropdownContent = document.getElementById('dropdownContent');
    
    // Remove any existing event listeners
    loginButton.replaceWith(loginButton.cloneNode(true));
    const newLoginButton = document.getElementById('loginButton');
    
    if (isLoggedIn) {
        // Update button text for logged in state
        newLoginButton.textContent = 'Logged In';
        
        // Only show dropdown when logged in
        newLoginButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const isHidden = dropdownContent.style.display === 'none';
            dropdownContent.style.display = isHidden ? 'block' : 'none';
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdownContent.style.display = 'none';
        });
    } else {
        // Reset to login state
        newLoginButton.textContent = 'Login';
        dropdownContent.style.display = 'none';
        
        // Only show modal when logged out
        newLoginButton.addEventListener('click', () => {
            loginModal.style.display = 'block';
        });
    }
}

function toggleDropdown() {
    const dropdownContent = document.getElementById('dropdownContent');
    dropdownContent.classList.toggle('show');
}

function closeDropdown() {
    const dropdownContent = document.getElementById('dropdownContent');
    if (dropdownContent) {
        dropdownContent.classList.remove('show');
    }
}

// Close dropdown when clicking outside
window.addEventListener('click', (event) => {
    if (!event.target.matches('.loginBtn')) {
        closeDropdown();
    }
});

