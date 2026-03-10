document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Burger Menu ---
    const navSlide = () => {
        const burger = document.querySelector('.burger');
        const nav = document.querySelector('.nav-links');
        const navLinks = document.querySelectorAll('.nav-links li');

        burger.addEventListener('click', () => {
            // Toggle Nav
            nav.classList.toggle('nav-active');

            // Animate Links
            navLinks.forEach((link, index) => {
                if (link.style.animation) {
                    link.style.animation = '';
                } else {
                    link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
                }
            });

            // Burger Animation
            burger.classList.toggle('toggle');
        });

        // Close nav when a link is clicked (for single page layout)
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (nav.classList.contains('nav-active')) {
                    nav.classList.remove('nav-active');
                    burger.classList.remove('toggle');
                    navLinks.forEach(link => link.style.animation = ''); // Reset animation for next open
                }
            });
        });
    };
    navSlide();


    // --- Hero Slider ---
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.slider-nav .dot');
    const slider = document.querySelector('.slider');
    let currentSlide = 0;
    let slideInterval;

    const showSlide = (index) => {
        if (index >= slides.length) {
            currentSlide = 0;
        } else if (index < 0) {
            currentSlide = slides.length - 1;
        } else {
            currentSlide = index;
        }

        slider.style.transform = `translateX(-${currentSlide * 100 / slides.length * slides.length}%)`; // Ensure full slide width
        // Remove active class from all dots and add to current
        dots.forEach(dot => dot.classList.remove('active'));
        dots[currentSlide].classList.add('active');
    };

    const nextSlide = () => {
        showSlide(currentSlide + 1);
    };

    const startSlider = () => {
        slideInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
    };

    const stopSlider = () => {
        clearInterval(slideInterval);
    };

    // Event listeners for dots
    dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            stopSlider(); // Stop auto-slide when dot is clicked
            const slideIndex = parseInt(e.target.dataset.slide);
            showSlide(slideIndex);
            startSlider(); // Restart auto-slide after manual selection
        });
    });

    startSlider(); // Start the slider automatically


    // --- Booking Form Validation ---
    const bookingForm = document.getElementById('bookingForm');
    const checkInDateInput = document.getElementById('checkInDate');
    const checkOutDateInput = document.getElementById('checkOutDate');
    const adultsInput = document.getElementById('adults');
    const roomTypeSelect = document.getElementById('roomType');
    const bookingConfirmation = document.getElementById('bookingConfirmation');

    // Set minimum date for check-in to today
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    checkInDateInput.min = todayFormatted;

    // Update check-out min date when check-in date changes
    checkInDateInput.addEventListener('change', () => {
        checkOutDateInput.min = checkInDateInput.value;
        // If check-out is before check-in, reset it
        if (checkOutDateInput.value < checkInDateInput.value) {
            checkOutDateInput.value = checkInDateInput.value;
        }
    });

    const validateField = (inputElement, errorElement, validationFn) => {
        const isValid = validationFn(inputElement.value);
        if (!isValid) {
            inputElement.classList.add('invalid');
            errorElement.textContent = inputElement.validationMessage || 'This field is required.';
        } else {
            inputElement.classList.remove('invalid');
            errorElement.textContent = '';
        }
        return isValid;
    };

    // Validation functions
    const validateDate = (dateString) => dateString !== '';
    const validateAdults = (value) => parseInt(value) >= 1;
    const validateRoomType = (value) => value !== '';

    // Real-time validation on input change/blur
    checkInDateInput.addEventListener('blur', () => validateField(checkInDateInput, document.getElementById('checkInDateError'), validateDate));
    checkOutDateInput.addEventListener('blur', () => validateField(checkOutDateInput, document.getElementById('checkOutDateError'), validateDate));
    adultsInput.addEventListener('blur', () => validateField(adultsInput, document.getElementById('adultsError'), validateAdults));
    roomTypeSelect.addEventListener('blur', () => validateField(roomTypeSelect, document.getElementById('roomTypeError'), validateRoomType));

    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent default form submission

        let isValid = true;
        isValid = validateField(checkInDateInput, document.getElementById('checkInDateError'), validateDate) && isValid;
        isValid = validateField(checkOutDateInput, document.getElementById('checkOutDateError'), validateDate) && isValid;
        isValid = validateField(adultsInput, document.getElementById('adultsError'), validateAdults) && isValid;
        isValid = validateField(roomTypeSelect, document.getElementById('roomTypeError'), validateRoomType) && isValid;

        if (checkOutDateInput.value && checkInDateInput.value && checkOutDateInput.value < checkInDateInput.value) {
            document.getElementById('checkOutDateError').textContent = 'Check-out date cannot be before check-in date.';
            checkOutDateInput.classList.add('invalid');
            isValid = false;
        } else {
             document.getElementById('checkOutDateError').textContent = ''; // Clear error if fixed
             checkOutDateInput.classList.remove('invalid');
        }


        if (isValid) {
            // Simulate successful booking
            bookingConfirmation.classList.remove('hidden', 'error');
            bookingConfirmation.classList.add('success');
            bookingConfirmation.textContent = 'Booking request submitted successfully! We will contact you shortly.';
            bookingForm.reset(); // Clear the form
            // Hide message after a few seconds
            setTimeout(() => {
                bookingConfirmation.classList.add('hidden');
            }, 5000);
        } else {
            bookingConfirmation.classList.remove('hidden', 'success');
            bookingConfirmation.classList.add('error');
            bookingConfirmation.textContent = 'Please correct the errors in the form.';
        }
    });

    // --- Image Gallery Modal ---
    const galleryItems = document.querySelectorAll('.gallery-item');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeButton = document.querySelector('.close-button');

    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            modalImage.src = item.dataset.src; // Get full-res image from data-src
            imageModal.style.display = 'flex'; // Display modal as flex to center content
        });
    });

    closeButton.addEventListener('click', () => {
        imageModal.style.display = 'none';
    });

    // Close modal if clicked outside image
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            imageModal.style.display = 'none';
        }
    });


    // --- Testimonials Slider ---
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const testimonialDots = document.querySelectorAll('.testimonial-nav .dot');
    let currentTestimonial = 0;
    let testimonialInterval;

    const showTestimonial = (index) => {
        if (index >= testimonialCards.length) {
            currentTestimonial = 0;
        } else if (index < 0) {
            currentTestimonial = testimonialCards.length - 1;
        } else {
            currentTestimonial = index;
        }

        testimonialCards.forEach(card => card.classList.remove('active'));
        testimonialCards[currentTestimonial].classList.add('active');

        testimonialDots.forEach(dot => dot.classList.remove('active'));
        testimonialDots[currentTestimonial].classList.add('active');
    };

    const nextTestimonial = () => {
        showTestimonial(currentTestimonial + 1);
    };

    const startTestimonialSlider = () => {
        testimonialInterval = setInterval(nextTestimonial, 7000); // Change testimonial every 7 seconds
    };

    const stopTestimonialSlider = () => {
        clearInterval(testimonialInterval);
    };

    testimonialDots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            stopTestimonialSlider();
            const testimonialIndex = parseInt(e.target.dataset.testimonial);
            showTestimonial(testimonialIndex);
            startTestimonialSlider();
        });
    });

    startTestimonialSlider(); // Start the testimonial slider automatically


    // --- Newsletter Subscription Form ---
    const newsletterForm = document.getElementById('newsletterForm');
    const newsletterConfirmation = document.getElementById('newsletterConfirmation');

    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const email = emailInput.value.trim();

        if (email) {
            // Simulate newsletter subscription
            newsletterConfirmation.classList.remove('hidden', 'error');
            newsletterConfirmation.classList.add('success');
            newsletterConfirmation.textContent = `Thank you for subscribing, ${email}!`;
            newsletterForm.reset();
            setTimeout(() => {
                newsletterConfirmation.classList.add('hidden');
            }, 4000);
        } else {
            newsletterConfirmation.classList.remove('hidden', 'success');
            newsletterConfirmation.classList.add('error');
            newsletterConfirmation.textContent = 'Please enter a valid email address.';
        }
    });

}); // End DOMContentLoaded