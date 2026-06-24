function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
        valid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial,
        minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumber,
        hasSpecial
    };
}

function getPasswordErrorMessage(validation) {
    const errors = [];
    if (!validation.minLength) errors.push('At least 8 characters');
    if (!validation.hasUpperCase) errors.push('One uppercase letter');
    if (!validation.hasLowerCase) errors.push('One lowercase letter');
    if (!validation.hasNumber) errors.push('One number');
    if (!validation.hasSpecial) errors.push('One special character (!@#$%^&*)');
    return errors.length > 0 ? 'Password must contain: ' + errors.join(', ') : '';
}

async function registerUser() {
    if (!submitThrottler.isReady()) {
        const message = document.getElementById('registerMessage');
        if (message) {
            message.innerText = 'Please wait a moment...';
            message.style.color = '#1f2937';
        }
        return;
    }

    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('regEmail');
    const passwordInput = document.getElementById('regPassword');
    const message = document.getElementById('registerMessage');
    const registerBtn = document.querySelector('button[type="button"]');

    const fullName = sanitizeInput(fullNameInput?.value || '').trim();
    const email = sanitizeEmail(emailInput?.value || '');
    const password = passwordInput?.value || '';

    if (!fullName || !email || !password) {
        if (message) {
            message.innerText = 'Please complete all fields.';
            message.style.color = '#DC2626';
        }
        submitThrottler.reset();
        return;
    }

    if (fullName.length < 3) {
        if (message) {
            message.innerText = 'Full name must be at least 3 characters.';
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

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        if (message) {
            message.innerText = getPasswordErrorMessage(passwordValidation);
            message.style.color = '#DC2626';
        }
        submitThrottler.reset();
        return;
    }

    if (registerBtn) {
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating account...';
    }

    // Firebase registration (if enabled)
    if (window.FIREBASE_ENABLED && typeof firebaseRegisterUser === 'function') {
        try {
            if (message) {
                message.innerText = 'Creating your account...';
                message.style.color = '#1f2937';
            }
            await firebaseRegisterUser(email, password, fullName);

            localStorage.setItem('budgetBuddyLoggedIn', 'true');
            localStorage.setItem('budgetBuddyUser', JSON.stringify({ name: fullName, email }));

            if (message) {
                message.innerText = 'Account created successfully! Redirecting...';
                message.style.color = '#16A34A';
            }
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
            return;
        } catch (error) {
            const apiError = await handleApiError(error, 'Firebase Registration');
            if (message) {
                message.innerText = 'Firebase error: ' + apiError.message;
                message.style.color = '#DC2626';
            }
            if (registerBtn) {
                registerBtn.disabled = false;
                registerBtn.textContent = 'Create Account';
            }
            submitThrottler.reset();
            return;
        }
    }

    // Backend API registration
    try {
        if (message) {
            message.innerText = 'Creating your account...';
            message.style.color = '#1f2937';
        }

        const data = await api.register(fullName, email, password);

        localStorage.setItem('budgetBuddyLoggedIn', 'true');
        localStorage.setItem('budgetBuddyUser', JSON.stringify({
            name: data.user?.name || fullName,
            email: data.user?.email || email,
            uid: data.user?._id || ''
        }));

        if (message) {
            message.innerText = 'Account created successfully! Redirecting...';
            message.style.color = '#16A34A';
        }
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
    } catch (error) {
        if (message) {
            let displayMessage = 'Registration failed: ' + error.message;
            if (error.status === 400 && error.message.toLowerCase().includes('exists')) {
                displayMessage = 'Email already registered. Please log in or use a different email.';
            } else if (!error.status) {
                displayMessage = 'Network error. Please check your connection.';
            }
            message.innerText = displayMessage;
            message.style.color = '#DC2626';
        }
        if (registerBtn) {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Create Account';
        }
        submitThrottler.reset();
    }
}
