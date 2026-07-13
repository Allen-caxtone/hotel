// Grand Lux Hotel — Enhanced with Backend & M-Pesa Integration
// Configure API base URL (change this to your deployed backend)
const API_BASE = window.API_BASE || 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Burger Menu ---
    const navSlide = () => {
        const burger = document.querySelector('.burger');
        const nav = document.querySelector('.nav-links');
        const navLinks = document.querySelectorAll('.nav-links li');

        burger.addEventListener('click', () => {
            nav.classList.toggle('nav-active');
            navLinks.forEach((link, index) => {
                if (link.style.animation) {
                    link.style.animation = '';
                } else {
                    link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
                }
            });
            burger.classList.toggle('toggle');
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (nav.classList.contains('nav-active')) {
                    nav.classList.remove('nav-active');
                    burger.classList.remove('toggle');
                    navLinks.forEach(link => link.style.animation = '');
                }
            });
        });
    };
    navSlide();

    // --- Hero Slider ---
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.slider-nav .dot');
    let currentSlide = 0;
    let slideInterval;

    const showSlide = (index) => {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        currentSlide = (index + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    };

    const nextSlide = () => showSlide(currentSlide + 1);
    const startSlider = () => { slideInterval = setInterval(nextSlide, 5000); };
    const stopSlider = () => clearInterval(slideInterval);

    dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            stopSlider();
            showSlide(parseInt(e.target.dataset.slide));
            startSlider();
        });
    });
    startSlider();

    // --- Room Type Pre-selection from Cards ---
    document.querySelectorAll('[data-room-type]').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.roomType;
            const select = document.getElementById('roomType');
            if (select) select.value = type;
            updateTotal();
        });
    });

    // --- Booking Form ---
    const bookingForm = document.getElementById('bookingForm');
    const guestNameInput = document.getElementById('guestName');
    const guestEmailInput = document.getElementById('guestEmail');
    const guestPhoneInput = document.getElementById('guestPhone');
    const checkInDateInput = document.getElementById('checkInDate');
    const checkOutDateInput = document.getElementById('checkOutDate');
    const adultsInput = document.getElementById('adults');
    const roomTypeSelect = document.getElementById('roomType');
    const totalAmountEl = document.getElementById('totalAmount');
    const bookingConfirmation = document.getElementById('bookingConfirmation');

    // Set minimum date for check-in to today
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    checkInDateInput.min = todayFormatted;
    // Default to tomorrow
    const tomorrow = new Date(today.getTime() + 86400000);
    checkOutDateInput.min = tomorrow.toISOString().split('T')[0];

    // Room prices (matches backend seed data)
    const ROOM_PRICES = {
        standard: 25000,
        deluxe: 45000,
        executive: 70000,
        presidential: 150000
    };
    const ROOM_IDS = {
        standard: 'room-standard-1',
        deluxe: 'room-deluxe-1',
        executive: 'room-executive-1',
        presidential: 'room-presidential-1'
    };

    function updateTotal() {
        const type = roomTypeSelect.value;
        const price = ROOM_PRICES[type] || 0;
        const checkIn = checkInDateInput.value;
        const checkOut = checkOutDateInput.value;
        if (!checkIn || !checkOut || !price) {
            totalAmountEl.textContent = 'KES 0';
            return;
        }
        const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000));
        const total = nights * price;
        totalAmountEl.textContent = `KES ${total.toLocaleString()} (${nights} night${nights > 1 ? 's' : ''})`;
    }

    [roomTypeSelect, checkInDateInput, checkOutDateInput].forEach(el => {
        el.addEventListener('change', () => {
            if (el === checkInDateInput) {
                checkOutDateInput.min = checkInDateInput.value;
                if (checkOutDateInput.value < checkInDateInput.value) {
                    const nextDay = new Date(new Date(checkInDateInput.value).getTime() + 86400000);
                    checkOutDateInput.value = nextDay.toISOString().split('T')[0];
                }
            }
            updateTotal();
        });
    });

    const validateField = (input, errorEl, validationFn, errorMsg) => {
        const isValid = validationFn(input.value);
        if (!isValid) {
            input.classList.add('invalid');
            if (errorEl) errorEl.textContent = errorMsg || input.validationMessage || 'This field is required.';
        } else {
            input.classList.remove('invalid');
            if (errorEl) errorEl.textContent = '';
        }
        return isValid;
    };

    const validators = {
        notEmpty: v => v && v.trim().length > 0,
        email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        phone: v => /^(?:\+254|254|0)?[17]\d{8}$/.test(v.replace(/\s/g, '')),
        adults: v => parseInt(v) >= 1,
        date: v => v !== ''
    };

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        let isValid = true;
        isValid = validateField(guestNameInput, document.getElementById('guestNameError'), validators.notEmpty, 'Please enter your name') && isValid;
        isValid = validateField(guestEmailInput, document.getElementById('guestEmailError'), validators.email, 'Please enter a valid email') && isValid;
        isValid = validateField(guestPhoneInput, document.getElementById('guestPhoneError'), validators.phone, 'Please enter a valid Kenyan phone (e.g. 0712345678)') && isValid;
        isValid = validateField(checkInDateInput, document.getElementById('checkInDateError'), validators.date) && isValid;
        isValid = validateField(checkOutDateInput, document.getElementById('checkOutDateError'), validators.date) && isValid;
        isValid = validateField(adultsInput, document.getElementById('adultsError'), validators.adults, 'At least 1 adult required') && isValid;
        isValid = validateField(roomTypeSelect, document.getElementById('roomTypeError'), validators.notEmpty, 'Please select a room type') && isValid;

        if (checkOutDateInput.value <= checkInDateInput.value) {
            document.getElementById('checkOutDateError').textContent = 'Check-out must be after check-in';
            checkOutDateInput.classList.add('invalid');
            isValid = false;
        }

        if (!isValid) {
            bookingConfirmation.classList.remove('hidden', 'success');
            bookingConfirmation.classList.add('error');
            bookingConfirmation.textContent = 'Please correct the errors above.';
            return;
        }

        // Build booking payload
        const roomType = roomTypeSelect.value;
        const payload = {
            room_id: ROOM_IDS[roomType],
            guest_name: guestNameInput.value.trim(),
            guest_email: guestEmailInput.value.trim(),
            guest_phone: guestPhoneInput.value.trim(),
            check_in_date: checkInDateInput.value,
            check_out_date: checkOutDateInput.value,
            adults: parseInt(adultsInput.value),
            children: parseInt(document.getElementById('children').value) || 0
        };

        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating booking...';

        try {
            // Step 1 — Create booking
            const bookingRes = await fetch(`${API_BASE}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const booking = await bookingRes.json();
            if (!bookingRes.ok) throw new Error(booking.error || 'Booking failed');

            // Step 2 — Initiate M-Pesa STK Push
            showMpesaModal(booking);

            const paymentRes = await fetch(`${API_BASE}/payments/stkpush`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking_id: booking.id,
                    phone_number: payload.guest_phone,
                    amount: booking.total_amount
                })
            });
            const payment = await paymentRes.json();

            if (!paymentRes.ok) {
                // If payment failed, still show booking confirmation but note payment must be arranged
                updateMpesaModal('error',
                    `Booking ${booking.id} created but M-Pesa is not configured. ` +
                    `To activate payments, configure the backend with M-Pesa Daraja API credentials. ` +
                    `Total: KES ${booking.total_amount.toLocaleString()}`);
            } else {
                updateMpesaModal('pending', payment.message || 'Check your phone and enter M-Pesa PIN');

                // Poll for payment status
                pollPaymentStatus(booking.id, 30);
            }

            bookingConfirmation.classList.remove('hidden', 'error');
            bookingConfirmation.classList.add('success');
            bookingConfirmation.innerHTML = `
                <strong>Booking Confirmed! ID: ${booking.id}</strong><br>
                ${booking.total_nights} night${booking.total_nights > 1 ? 's' : ''} · Total: KES ${booking.total_amount.toLocaleString()}<br>
                We've sent confirmation details to ${payload.guest_email}
            `;
            bookingForm.reset();
            updateTotal();
        } catch (err) {
            bookingConfirmation.classList.remove('hidden', 'success');
            bookingConfirmation.classList.add('error');
            bookingConfirmation.innerHTML = `
                <strong>Booking failed:</strong> ${err.message}<br>
                <small>Please ensure the backend server is running on ${API_BASE}</small>
            `;
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-mobile-alt"></i> Pay with M-Pesa';
        }
    });

    // --- M-Pesa Modal ---
    const mpesaModal = document.getElementById('mpesaModal');
    const mpesaClose = document.getElementById('mpesaClose');

    function showMpesaModal(booking) {
        document.getElementById('modalBookingId').textContent = booking.id;
        document.getElementById('modalAmount').textContent = `KES ${booking.total_amount.toLocaleString()}`;
        document.getElementById('modalPhone').textContent = booking.guest_phone;
        document.getElementById('mpesaDetails').classList.remove('hidden');
        mpesaModal.style.display = 'flex';
    }

    function updateMpesaModal(status, message) {
        const statusEl = document.getElementById('mpesaStatus');
        const msgEl = document.getElementById('mpesaMessage');
        const spinner = statusEl.querySelector('.spinner');
        msgEl.textContent = message;
        if (status === 'success') {
            spinner.innerHTML = '<i class="fas fa-check-circle" style="color:#28a745;font-size:3em;"></i>';
            spinner.classList.remove('spinner');
        } else if (status === 'error' || status === 'failed') {
            spinner.innerHTML = '<i class="fas fa-times-circle" style="color:#dc3545;font-size:3em;"></i>';
            spinner.classList.remove('spinner');
        }
    }

    async function pollPaymentStatus(bookingId, maxAttempts) {
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, 3000));
            try {
                const res = await fetch(`${API_BASE}/bookings/${bookingId}`);
                if (!res.ok) continue;
                const booking = await res.json();
                if (booking.payment_status === 'paid') {
                    updateMpesaModal('success', `Payment successful! Receipt: ${booking.mpesa_receipt || 'N/A'}`);
                    return;
                }
                if (booking.payment_status === 'failed') {
                    updateMpesaModal('failed', 'Payment failed or cancelled. Please try again.');
                    return;
                }
            } catch (e) {
                console.error('Poll error:', e);
            }
        }
        updateMpesaModal('error', 'Payment status unknown. Please check your booking status.');
    }

    mpesaClose.addEventListener('click', () => { mpesaModal.style.display = 'none'; });
    mpesaModal.addEventListener('click', (e) => {
        if (e.target === mpesaModal) mpesaModal.style.display = 'none';
    });

    // --- Image Gallery Modal ---
    const galleryItems = document.querySelectorAll('.gallery-item');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeButton = imageModal.querySelector('.close-button');

    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            modalImage.src = item.dataset.src;
            imageModal.style.display = 'flex';
        });
    });

    closeButton.addEventListener('click', () => { imageModal.style.display = 'none'; });
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) imageModal.style.display = 'none';
    });

    // --- Testimonials Slider ---
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const testimonialDots = document.querySelectorAll('.testimonial-nav .dot');
    let currentTestimonial = 0;

    const showTestimonial = (index) => {
        testimonialCards.forEach(c => c.classList.remove('active'));
        testimonialDots.forEach(d => d.classList.remove('active'));
        currentTestimonial = (index + testimonialCards.length) % testimonialCards.length;
        testimonialCards[currentTestimonial].classList.add('active');
        if (testimonialDots[currentTestimonial]) testimonialDots[currentTestimonial].classList.add('active');
    };
    const nextTestimonial = () => showTestimonial(currentTestimonial + 1);
    const startTestimonialSlider = () => setInterval(nextTestimonial, 7000);

    testimonialDots.forEach(dot => {
        dot.addEventListener('click', (e) => showTestimonial(parseInt(e.target.dataset.testimonial)));
    });
    startTestimonialSlider();

    // --- Newsletter ---
    const newsletterForm = document.getElementById('newsletterForm');
    const newsletterConfirmation = document.getElementById('newsletterConfirmation');

    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = newsletterForm.querySelector('input[type="email"]').value.trim();
        if (!email) return;

        try {
            const res = await fetch(`${API_BASE}/contact/newsletter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            newsletterConfirmation.classList.remove('hidden', 'error');
            newsletterConfirmation.classList.add('success');
            newsletterConfirmation.textContent = data.message || `Thank you for subscribing, ${email}!`;
            newsletterForm.reset();
            setTimeout(() => newsletterConfirmation.classList.add('hidden'), 4000);
        } catch (err) {
            newsletterConfirmation.classList.remove('hidden', 'success');
            newsletterConfirmation.classList.add('error');
            newsletterConfirmation.textContent = `Subscribed locally! (Backend offline)`;
            newsletterForm.reset();
            setTimeout(() => newsletterConfirmation.classList.add('hidden'), 4000);
        }
    });
});
