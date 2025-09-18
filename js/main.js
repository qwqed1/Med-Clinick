// --- Carousel & Mobile Menu Logic ---
let currentSlide = 0;
const slides = document.querySelectorAll(".carousel-slide");
const slideButtons = document.querySelectorAll("#home .flex.justify-center button");
function changeSlide(index) {
    if (!slides.length || !slideButtons.length) return;
    slides[currentSlide].classList.remove("active");
    slideButtons[currentSlide].classList.remove("opacity-100");
    slideButtons[currentSlide].classList.add("opacity-50");
    currentSlide = index;
    slides[currentSlide].classList.add("active");
    slideButtons[currentSlide].classList.add("opacity-100");
    slideButtons[currentSlide].classList.remove("opacity-50");
}
setInterval(() => {
    let nextSlide = (currentSlide + 1) % slides.length;
    changeSlide(nextSlide);
}, 5000);

function toggleMobileMenu() {
    document.getElementById("mobileMenu").classList.toggle("active");
}

// --- Настройка для работы с API ---
const API_BASE_URL = '/api'; // Базовый путь для всех запросов к бэкенду

// --- Booking Modal & Calendar Logic ---
const bookingModal = document.getElementById('bookingModal');
const bookingSteps = document.querySelectorAll('#bookingModal .step');
let currentDate = new Date();
let selectedDoctor = { id: null, name: '' };
let selectedDate = null;
let selectedTime = null;

async function openBookingModal(doctorId, doctorName) {
    // Если врач не выбран (клик по общей кнопке), то ID будет null.
    // Бэкенд должен уметь это обрабатывать, либо нужно выбирать врача по умолчанию.
    // Пока что оставим ID=null, если врач не выбран.
    selectedDoctor = { id: doctorId, name: doctorName || 'любому специалисту' };
    
    document.getElementById('doctor-name-in-modal').textContent = selectedDoctor.name;
    bookingModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    goToBookingStep(1, true);
    await generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
}

function closeBookingModal() {
    bookingModal.classList.remove('active');
    document.body.style.overflow = '';
}

function goToBookingStep(stepNumber, reset = false) {
    bookingSteps.forEach(step => step.classList.add('hidden'));
    const stepElement = document.getElementById(`step${stepNumber}`); // Используем ID из вашего HTML
    if (stepElement) {
        stepElement.classList.remove('hidden');
    }
    
    if (reset) {
        selectedDate = null;
        selectedTime = null;
        document.getElementById('time-slots-container').classList.add('hidden');
        document.getElementById('continue-btn').disabled = true;
        document.getElementById('name').value = '';
        document.getElementById('phone').value = '';
    }
}

async function generateCalendar(year, month) {
    const monthYearEl = document.getElementById('month-year');
    const calendarDaysEl = document.getElementById('calendar-days');
    if (!monthYearEl || !calendarDaysEl) return;
    calendarDaysEl.innerHTML = '<div class="loader" style="grid-column: span 7;"></div>';
    
    const firstDayOfMonth = new Date(year, month, 1);
    monthYearEl.textContent = firstDayOfMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    
    try {
        const response = await fetch(`${API_BASE_URL}/availability?doctorId=${selectedDoctor.id}&year=${year}&month=${month + 1}`);
        if (!response.ok) throw new Error('Ошибка загрузки календаря');
        const availabilityData = await response.json();

        calendarDaysEl.innerHTML = '';
        let startingDay = firstDayOfMonth.getDay();
        startingDay = startingDay === 0 ? 6 : startingDay - 1; 
        for (let i = 0; i < startingDay; i++) {
            calendarDaysEl.innerHTML += `<div class="calendar-day other-month"></div>`;
        }
        
        availabilityData.forEach(dayData => {
            const day = dayData.day;
            const dayEl = document.createElement('div');
            dayEl.textContent = day;
            dayEl.classList.add('calendar-day');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const thisDate = new Date(year, month, day);

            if (thisDate < today) {
                dayEl.classList.add('past-day');
            } else {
                dayEl.classList.add(dayData.status);
                if (dayData.status === 'available') {
                    dayEl.onclick = () => selectDay(dayEl, year, month, day);
                }
            }
            calendarDaysEl.appendChild(dayEl);
        });
    } catch (error) {
        console.error("Ошибка при генерации календаря:", error);
        calendarDaysEl.innerHTML = `<p style="grid-column: span 7;" class="text-center text-red-500">Не удалось загрузить расписание</p>`;
    }
}

async function selectDay(dayElement, year, month, day) {
    document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
    dayElement.classList.add('selected');
    selectedDate = new Date(year, month, day);
    document.getElementById('selected-date-span').textContent = selectedDate.toLocaleDateString('ru-RU');
    
    const timeSlotsContainer = document.getElementById('time-slots-container');
    const timeLoader = document.getElementById('time-loader');
    timeSlotsContainer.classList.add('hidden');
    timeLoader.classList.remove('hidden');

    try {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const response = await fetch(`${API_BASE_URL}/timeslots?doctorId=${selectedDoctor.id}&date=${dateString}`);
        if (!response.ok) throw new Error('Ошибка загрузки времени');
        const timeSlotsData = await response.json();

        const timeSlotsEl = document.getElementById('time-slots');
        timeSlotsEl.innerHTML = '';
        timeSlotsData.forEach(slot => {
            const slotEl = document.createElement('div');
            slotEl.textContent = slot.time;
            slotEl.classList.add('time-slot', slot.status);
            if (slot.status === 'available') {
                slotEl.onclick = () => selectTime(slotEl, slot.time);
            }
            timeSlotsEl.appendChild(slotEl);
        });
    } catch (error) {
        console.error("Ошибка при загрузке времени:", error);
        document.getElementById('time-slots').innerHTML = `<p class="text-center text-red-500">Ошибка</p>`;
    } finally {
        timeLoader.classList.add('hidden');
        timeSlotsContainer.classList.remove('hidden');
        document.getElementById('continue-btn').disabled = true;
        selectedTime = null;
    }
}

function selectTime(timeElement, time) {
    document.querySelectorAll('.time-slot.selected').forEach(el => el.classList.remove('selected'));
    timeElement.classList.add('selected');
    selectedTime = time;
    document.getElementById('continue-btn').disabled = false;
}

async function confirmAppointment() {
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    if (!nameInput.value.trim() || !phoneInput.value.trim()) {
        alert('Пожалуйста, укажите ваше имя и телефон.');
        return;
    }

    const appointmentData = {
        doctorId: selectedDoctor.id,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        patientName: nameInput.value.trim(),
        patientPhone: phoneInput.value.trim()
    };

    const confirmBtn = document.getElementById('confirm-booking-btn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Сохраняем...`;

    try {
        const response = await fetch(`${API_BASE_URL}/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData)
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Ошибка при создании записи');
        }

        const managerWhatsAppNumber = "77761766001"; 
        const clientName = appointmentData.patientName;
        const doctorName = selectedDoctor.name;
        const date = selectedDate.toLocaleDateString('ru-RU');
        
        let message = `Здравствуйте! Меня зовут ${clientName}. `;
        message += `Я успешно записался(ась) на приём к врачу ${doctorName} на ${date} в ${selectedTime}.`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${managerWhatsAppNumber}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
        closeBookingModal();

    } catch (error) {
        console.error("Ошибка записи:", error);
        alert(`Не удалось записаться. ${error.message}`);
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<i class="fab fa-whatsapp mr-2"></i> Отправить менеджеру`;
    }
}


// --- Review Modal Logic ---
const reviewModal = document.getElementById('reviewModal');
let currentRating = 0;

function openReviewModal() {
    if(!reviewModal) return;
    reviewModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('review-step1').classList.remove('hidden');
    document.getElementById('review-step2').classList.add('hidden');
    document.getElementById('review-name').value = '';
    document.getElementById('review-text').value = '';
    currentRating = 0;
    document.querySelectorAll('#review-rating i').forEach(star => star.classList.remove('active'));
}

function closeReviewModal() {
    if(!reviewModal) return;
    reviewModal.classList.remove('active');
    document.body.style.overflow = '';
}

const stars = document.querySelectorAll('#review-rating i');
stars.forEach(star => {
    star.addEventListener('mouseover', (e) => {
        const ratingValue = e.target.dataset.value;
        stars.forEach(s => { s.classList.toggle('active', s.dataset.value <= ratingValue); });
    });
    star.addEventListener('mouseout', () => {
         stars.forEach(s => { s.classList.toggle('active', s.dataset.value <= currentRating); });
    });
    star.addEventListener('click', (e) => { currentRating = e.target.dataset.value; });
});


document.addEventListener('DOMContentLoaded', () => {
    // --- Инициализация всех компонентов ---
    const fakeBackendForReviews = {
        getApprovedReviews: async () => { await new Promise(res => setTimeout(res, 500)); return [ { name: "Анна К.", text: "Прекрасная клиника! Современное оборудование, внимательный персонал.", rating: 5 }, { name: "Сергей Б.", text: "Проходил полное обследование. Всё на высшем уровне!", rating: 5 }]; },
        submitNewReview: async (reviewData) => { console.log("ОТПРАВКА ОТЗЫВА АДМИНУ:", reviewData); await new Promise(res => setTimeout(res, 1000)); return { success: true }; },
    };

    // Загрузка врачей
    const doctorsContainer = document.getElementById('doctors-container');
    if (doctorsContainer) {
        fetch(`${API_BASE_URL}/doctors`)
            .then(response => {
                if (!response.ok) throw new Error('Ошибка загрузки списка врачей');
                return response.json();
            })
            .then(doctorsData => {
                doctorsContainer.innerHTML = '';
                doctorsData.forEach(doctor => {
                    const doctorCardHTML = `
                        <div class="swiper-slide h-auto">
                            <div class="doctor-card">
                                <img src="${doctor.imageUrl}" alt="Доктор ${doctor.name}" class="w-full h-64 object-cover" />
                                <div class="p-6">
                                    <div>
                                        <h3 class="text-xl font-bold mb-2">${doctor.name}</h3>
                                        <p class="text-gold mb-2">${doctor.specialty}</p>
                                        <p class="text-gray-600 text-sm mb-4">Стаж работы: ${doctor.experience}<br />${doctor.degree}</p>
                                    </div>
                                    <button onclick="openBookingModal(${doctor.id}, '${doctor.name}')" class="w-full mt-4 bg-gold text-white py-2 rounded-lg hover:bg-opacity-90 transition">Записаться на приём</button>
                                </div>
                            </div>
                        </div>`;
                    doctorsContainer.innerHTML += doctorCardHTML;
                });
                new Swiper('.doctor-swiper', { slidesPerView: 1, spaceBetween: 30, loop: true, pagination: { el: '.swiper-pagination', clickable: true }, navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }, breakpoints: { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } } });
            })
            .catch(error => {
                console.error("Ошибка при загрузке врачей:", error);
                doctorsContainer.innerHTML = `<p class="text-center text-red-500 col-span-full">Не удалось загрузить список специалистов</p>`;
            });
    }

    // Загрузка отзывов (в демо-режиме)
    const testimonialsContainer = document.getElementById('testimonials-container');
    if (testimonialsContainer) {
        fakeBackendForReviews.getApprovedReviews().then(reviews => {
            testimonialsContainer.innerHTML = '';
            reviews.forEach(review => {
                let starsHTML = '';
                for(let i=0; i<5; i++) { starsHTML += `<i class="fas fa-star ${i < review.rating ? 'text-gold' : 'text-gray-300'}"></i>`; }
                const reviewCardHTML = `
                    <div class="swiper-slide h-auto">
                        <div class="testimonial-card">
                            <div>
                                <div class="flex items-center mb-4">
                                    <div class="w-12 h-12 bg-gold rounded-full flex items-center justify-center text-white font-bold">${review.name.match(/\b(\w)/g).join('')}</div>
                                    <div class="ml-4">
                                        <h4 class="font-semibold">${review.name}</h4>
                                        <div class="flex">${starsHTML}</div>
                                    </div>
                                </div>
                                <p class="text-gray-600">"${review.text}"</p>
                            </div>
                        </div>
                    </div>`;
                testimonialsContainer.innerHTML += reviewCardHTML;
            });
            new Swiper('.testimonial-swiper', { slidesPerView: 1, spaceBetween: 30, loop: true, pagination: { el: '.swiper-pagination', clickable: true }, autoplay: { delay: 5000 }, breakpoints: { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } } });
        });
    }

    // Отправка нового отзыва (в демо-режиме)
    const submitReviewBtn = document.getElementById('submit-review-btn');
    if (submitReviewBtn) {
        submitReviewBtn.addEventListener('click', async () => {
            const name = document.getElementById('review-name').value;
            const text = document.getElementById('review-text').value;
            if (!name || !text || currentRating === 0) {
                alert('Пожалуйста, заполните все поля и поставьте оценку.');
                return;
            }
            const reviewData = { name, text, rating: currentRating };
            const response = await fakeBackendForReviews.submitNewReview(reviewData);
            if (response.success) {
                document.getElementById('review-step1').classList.add('hidden');
                document.getElementById('review-step2').classList.remove('hidden');
            } else {
                alert('Произошла ошибка. Попробуйте позже.');
            }
        });
    }
    
    // --- Обработчики кликов ---
    document.getElementById('prev-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });
    
    document.getElementById('next-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });
    
    document.getElementById('continue-btn')?.addEventListener('click', () => {
        if(selectedDate && selectedTime){
            const summaryText = `к врачу <strong>${selectedDoctor.name}</strong>, ${selectedDate.toLocaleDateString('ru-RU')} в <strong>${selectedTime}</strong>`;
            document.getElementById('summary').innerHTML = summaryText;
            goToBookingStep(2);
        }
    });

    document.getElementById('confirm-booking-btn')?.addEventListener('click', confirmAppointment);
    
    const backBtn = document.querySelector('#bookingModal .step button[onclick="goToStep(1)"]');
    if (backBtn) {
        backBtn.addEventListener('click', () => goToBookingStep(1));
    }

    // Обработчики на общие кнопки "Записаться"
    document.querySelectorAll('a[href="#doctors"], .general-booking-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(e.currentTarget.tagName === 'A') e.preventDefault();
            openBookingModal(null, null);
            if(e.currentTarget.tagName === 'A') {
                document.querySelector('#doctors').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});