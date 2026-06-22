function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    // Require: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
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
    // Prevent rapid submissions
    if (!submitThrottler.isReady()) {
        const message = document.getElementById('registerMessage');
        if (message) {
            message.innerText = '⏳ Please wait a moment...';
            message.style.color = '#1f2937';
        }
        return;
    }

    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('regEmail');
    const passwordInput = document.getElementById('regPassword');
    const message = document.getElementById('registerMessage');
    const registerBtn = document.querySelector('button[type="submit"]');

    // Get and sanitize inputs
    const fullName = sanitizeInput(fullNameInput?.value || '').trim();
    const email = sanitizeEmail(emailInput?.value || '');
    const password = passwordInput?.value || '';

    // Validate all fields present
    if (!fullName || !email || !password) {
        if (message) {
            message.innerText = '❌ Please complete all fields.';
            message.style.color = '#DC2626';
        }
        submitThrottler.reset();
        return;
    }

    // Validate full name (at least 2 characters)
    if (fullName.length < 2) {
        if (message) {
            message.innerText = '❌ Full name must be at least 2 characters.';
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

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        if (message) {
            message.innerText = '❌ ' + getPasswordErrorMessage(passwordValidation);
            message.style.color = '#DC2626';
        }
        submitThrottler.reset();
        return;
    }

    // Disable submit button during registration
    if (registerBtn) {
        registerBtn.disabled = true;
        registerBtn.textContent = '⏳ Creating account...';
    }

    // Firebase registration (if enabled)
    if (window.FIREBASE_ENABLED && typeof firebaseRegisterUser === 'function') {
        try {
            if (message) {
                message.innerText = '⏳ Creating your account...';
                message.style.color = '#1f2937';
            }
            await firebaseRegisterUser(email, password, fullName);
            
            // ✅ SECURE: Only store name and email, NOT password
            localStorage.setItem('budgetBuddyLoggedIn', 'true');
            localStorage.setItem('budgetBuddyUser', JSON.stringify({ name: fullName, email }));
            
            if (message) {
                message.innerText = '✅ Account created successfully! Redirecting...';
                message.style.color = '#16A34A';
            }
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            return;
        } catch (error) {
            const apiError = await handleApiError(error, 'Firebase Registration');
            if (message) {
                message.innerText = '❌ Firebase error: ' + apiError.message;
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

    // Backend API registration (recommended)
    try {
        if (message) {
            message.innerText = '⏳ Creating your account...';
            message.style.color = '#1f2937';
        }

        // Call backend API
        const response = await axios.post('/api/auth/register', {
            fullName,
            email,
            password
        });

        if (response.data?.success) {
            // ✅ SECURE: Store token and user info only, NOT password
            const token = response.data.data?.token;
            if (token) {
                localStorage.setItem('budgetBuddyAuthToken', token);
            }
            localStorage.setItem('budgetBuddyLoggedIn', 'true');
            localStorage.setItem('budgetBuddyUser', JSON.stringify({
                name: fullName,
                email,
                uid: response.data.data?.uid || ''
            }));

            if (message) {
                message.innerText = '✅ Account created successfully! Redirecting...';
                message.style.color = '#16A34A';
            }
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            throw new Error(response.data?.error || 'Registration failed');
        }
    } catch (error) {
        const apiError = await handleApiError(error, 'Registration');
        if (message) {
            // Provide user-friendly error messages
            let displayMessage = '❌ Registration failed: ' + apiError.message;
            if (apiError.status === 409) {
                displayMessage = '❌ Email already registered. Please log in or use a different email.';
            } else if (apiError.status === 0) {
                displayMessage = '❌ ' + apiError.message;
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