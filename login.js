function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function login() {
    if (!submitThrottler.isReady()) {
        const message = document.getElementById('message');
        if (message) {
            message.innerText = 'Please wait a moment...';
            message.style.color = '#1f2937';
        }
        return;
    }

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const message = document.getElementById('message');
    const loginBtn = document.querySelector('button[type="button"]');

    if (message) {
        message.innerText = '';
        message.style.color = '#1f2937';
    }

    const email = sanitizeEmail(emailInput?.value || '');
    const password = passwordInput?.value || '';

    if (!email || !password) {
        if (message) {
            message.innerText = 'Please fill in all fields.';
            message.style.color = '#DC2626';
        }
        submitThrottler.reset();
        return;
    }

    if (!validateEmail(email)) {
        if (message) {
            message.innerText = 'Please enter a valid email address.';
            message.style.color = '#DC2626';
        }
        submitThrottler.reset();
        return;
    }

    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in...';
    }

    // Firebase login (if enabled)
    if (window.FIREBASE_ENABLED && typeof firebaseLoginUser === 'function') {
        try {
            if (message) {
                message.innerText = 'Signing in...';
                message.style.color = '#1f2937';
            }
            await firebaseLoginUser(email, password);

            localStorage.setItem('budgetBuddyLoggedIn', 'true');
            localStorage.setItem('rememberedEmail', email);
            localStorage.setItem('budgetBuddyUser', JSON.stringify({ email }));

            if (message) {
                message.innerText = 'Signed in successfully!';
                message.style.color = '#16A34A';
            }
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
            return;
        } catch (error) {
            const apiError = await handleApiError(error, 'Firebase Login');
            if (message) {
                message.innerText = 'Login failed: ' + apiError.message;
                message.style.color = '#DC2626';
            }
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
            submitThrottler.reset();
            return;
        }
    }

    // Backend API login
    try {
        if (message) {
            message.innerText = 'Signing in...';
            message.style.color = '#1f2937';
        }

        const data = await api.login(email, password);

        localStorage.setItem('budgetBuddyLoggedIn', 'true');
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('budgetBuddyUser', JSON.stringify({
            email: data.user?.email || email,
            name: data.user?.name || '',
            uid: data.user?._id || ''
        }));

        if (message) {
            message.innerText = 'Signed in successfully!';
            message.style.color = '#16A34A';
        }
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } catch (error) {
        if (message) {
            let displayMessage = 'Login failed: ' + error.message;
            if (error.status === 400 || error.status === 401) {
                displayMessage = 'Email or password is incorrect.';
            } else if (!error.status) {
                displayMessage = 'Network error. Please check your connection.';
            }
            message.innerText = displayMessage;
            message.style.color = '#DC2626';
        }
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
        submitThrottler.reset();
    }
}

window.onload = function() {
    try {
        if (localStorage.getItem('budgetBuddyLoggedIn') === 'true') {
            window.location.href = 'dashboard.html';
            return;
        }

        const remembered = localStorage.getItem('rememberedEmail');
        const emailField = document.getElementById('email');
        if (remembered && emailField) {
            emailField.value = sanitizeEmail(remembered);
            emailField.focus();
        }

        if (typeof sessionManager !== 'undefined') {
            sessionManager.start();
        }
    } catch (error) {
        console.warn('Window initialization error');
    }
};
