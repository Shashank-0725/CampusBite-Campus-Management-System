/* auth-guard.js - Runs immediately in <head> to prevent content flash */
(function () {
    const path = window.location.pathname;

    // Skip if not a staff page or if on staff login
    if (!path.includes('/staff/') || path.includes('login')) return;

    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    let user = null;

    try {
        user = JSON.parse(userStr);
    } catch (e) {
        user = null;
    }

    // Strict check: Must have token, user object, and correct role
    if (!token || !user || (user.role !== 'staff' && user.role !== 'admin')) {
        // Hide everything immediately
        const style = document.createElement('style');
        style.innerHTML = 'body { display: none !important; }'; // Nuclear option
        document.head.appendChild(style);

        // Stop window loading if possible
        if (window.stop) window.stop();

        alert("Unauthorized Access. Login as Staff.");
        window.location.replace('/staff/login.html'); // Replace history entry
    }
})();
