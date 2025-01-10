console.log('Gestures script loaded')
const zapper = document.getElementById('zap-button');
const npub = document.getElementById('npub');

// Npub button
npub.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText('npub1hee433872q2gen90cqh2ypwcq9z7y5ugn23etrd2l2rrwpruss8qwmrsv6');
        alert('Copied Nostr Public Key!');

    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to Copy Nostr Public Key');
    }
});

// Zap button
zapper.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText('palekangaroo1@primal.net');
        alert('Copied Lightning Address!');

    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to Copy Lightning Address');
    }
});

const hamburger = document.querySelector('.hamburger');
const actionContainer = document.querySelector('.action-container');

hamburger.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent document click from immediately closing the menu
    hamburger.classList.toggle('active');
    actionContainer.classList.toggle('active');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    // Check if the click was outside both the hamburger and the menu
    if (!hamburger.contains(e.target) && !actionContainer.contains(e.target)) {
        hamburger.classList.remove('active');
        actionContainer.classList.remove('active');
    }
});

// Prevent clicks inside the menu from closing it
actionContainer.addEventListener('click', (e) => {
    e.stopPropagation();
});

// // Swipe gestures
// document.addEventListener("DOMContentLoaded", function () {
//     let startX = 0, startY = 0;

//     // Helper function to navigate based on swipe direction and current page
//     function navigateBasedOnSwipe(direction) {
//         const currentPath = window.location.pathname;

//         if (direction === "right") {
//             if (currentPath === "/dev") {
//                 // If on home, swipe right goes to /devupload
//                 window.location.href = "/upload";
//             } else if (currentPath === "/create") {
//                 // If on /anotherpage, swipe right goes back to home
//                 window.location.href = "/dev";
//             }
//         } else if (direction === "left") {
//             if (currentPath === "/dev") {
//                 // If on home, swipe left goes to /anotherpage
//                 window.location.href = "/create";
//             } else if (currentPath === "/upload") {
//                 // If on /devupload, swipe left goes back to home
//                 window.location.href = "/dev";
//             }
//         }
//     }

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
//         if (Math.abs(diffX) > Math.abs(diffY)) {
//             // Horizontal swipe
//             if (diffX > swipeThreshold) {
//                 // Swipe Right
//                 navigateBasedOnSwipe("right");
//             } else if (diffX < -swipeThreshold) {
//                 // Swipe Left
//                 navigateBasedOnSwipe("left");
//             }
//         } else {
//             // Vertical swipe
//             if (diffY > swipeThreshold) {
//                 // Swipe Down - Refresh the page
//                 navigateBasedOnSwipe("down");
//             }
//         }
//     });
// });