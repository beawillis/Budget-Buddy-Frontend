function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function login() {
    // Prevent rapid submissions
    if (!submitThrottler.isReady()) {
        const message = document.getElementById('message');
        if (message) {
            message.innerText = '⏳ Please wait a moment...';
            message.style.color = '#1f2937';
        }
        return;
    }

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const message = document.getElementById('message');
    const loginBtn = document.querySelector('button[type="submit"]');

    // Clear previous message
    if (message) {
        message.innerText = '';
        message.style.color = '#1f2937';
    }

    // Get and sanitize inputs
    const email = sanitizeEmail(emailInput?.value || '');
    const password = passwordInput?.value || '';

    // Validate all fields present
    if (!email || !password) {
        if (message) {
            message.innerText = '❌ Please fill in all fields.';
            message.style.color = '#DC2626';
        }
        submitThrottler.reset();
        return;
    }

    // Validate email format
    if (!validateEmail(email)) {
        if (message) {
            message.innerText = '❌ Please enter a valid email address.';
            message.style.color = '#DC2626';
        }
        submitThrottler.reset();
        return;
    }

    // Disable submit button during login
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = '⏳ Signing in...';
    }

    // Firebase login (if enabled)
    if (window.FIREBASE_ENABLED && typeof firebaseLoginUser === 'function') {
        try {
            if (message) {
                message.innerText = '⏳ Signing in...';
                message.style.color = '#1f2937';
            }
            await firebaseLoginUser(email, password);
            
            // ✅ SECURE: Only store email, NOT password
            localStorage.setItem('budgetBuddyLoggedIn', 'true');
            localStorage.setItem('rememberedEmail', email);
            localStorage.setItem('budgetBuddyUser', JSON.stringify({ email }));
            
            if (message) {
                message.innerText = '✅ Signed in successfully!';
                message.style.color = '#16A34A';
            }
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            return;
        } catch (error) {
            const apiError = await handleApiError(error, 'Firebase Login');
            if (message) {
                message.innerText = '❌ Login failed: ' + apiError.message;
                message.style.color = '#DC2626';
            }
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
            submitThrottler.reset();
            return;
        }
    }

    // Backend API login (recommended)
    try {
        if (message) {
            message.innerText = '⏳ Signing in...';
            message.style.color = '#1f2937';
        }

        // Call backend API
        const response = await axios.post('/api/auth/login', {
            email,
            password
        });

        if (response.data?.success) {
            // ✅ SECURE: Store token and email only
            const token = response.data.data?.token;
            if (token) {
                localStorage.setItem('budgetBuddyAuthToken', token);
            }
            localStorage.setItem('budgetBuddyLoggedIn', 'true');
            localStorage.setItem('rememberedEmail', email);
            localStorage.setItem('budgetBuddyUser', JSON.stringify({
                email,
                name: response.data.data?.name || ''
            }));

            if (message) {
                message.innerText = '✅ Signed in successfully!';
                message.style.color = '#16A34A';
            }
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            throw new Error(response.data?.error || 'Login failed');
        }
    } catch (error) {
        const apiError = await handleApiError(error, 'Login');
        if (message) {
            // Provide user-friendly error messages
            let displayMessage = '❌ Login failed: ' + apiError.message;
            if (apiError.status === 401) {
                displayMessage = '❌ Email or password is incorrect.';
            } else if (apiError.status === 0) {
                displayMessage = '❌ ' + apiError.message;
            }
            message.innerText = displayMessage;
            message.style.color = '#DC2626';
        }
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
        submitThrottler.reset();
    }
}

window.onload = function() {
    try {
        // Redirect if already logged in
        if (localStorage.getItem('budgetBuddyLoggedIn') === 'true') {
            window.location.href = 'dashboard.html';
            return;
        }

        // Pre-fill email if remembered
        const remembered = localStorage.getItem('rememberedEmail');
        const emailField = document.getElementById('email');
        if (remembered && emailField) {
            emailField.value = sanitizeEmail(remembered);
            emailField.focus();
        }

        // Start session timeout manager
        if (typeof sessionManager !== 'undefined') {
            sessionManager.start();
        }
    } catch (error) {
        console.warn('Window initialization error');
    }
};
