// --- ОБЩИЕ НАСТРОЙКИ ---
const API_BASE_URL = '/api';

// --- ОБЩИЕ ФУНКЦИИ (меню, модальные окна и т.д.) ---
function toggleMobileMenu() {
    document.getElementById("mobileMenu")?.classList.toggle("active");
}

// --- Логика для карусели на главной странице ---
function initHeroCarousel() {
    let currentSlide = 0;
    const slides = document.querySelectorAll(".carousel-slide");
    const slideButtons = document.querySelectorAll("#home .flex.justify-center button");
    if (!slides.length || !slideButtons.length) return;

    function changeSlide(index) {
        slides[currentSlide]?.classList.remove("active");
        slideButtons[currentSlide]?.classList.remove("opacity-100");
        slideButtons[currentSlide]?.classList.add("opacity-50");
        currentSlide = index;
        slides[currentSlide]?.classList.add("active");
        slideButtons[currentSlide]?.classList.add("opacity-100");
        slideButtons[currentSlide]?.classList.remove("opacity-50");
    }
    
    // Глобальная ссылка на интервал, чтобы его можно было остановить
    window.heroCarouselInterval = setInterval(() => {
        let nextSlide = (currentSlide + 1) % slides.length;
        changeSlide(nextSlide);
    }, 5000);

    slideButtons.forEach((button, index) => {
        button.addEventListener('click', () => changeSlide(index));
    });
}


// --- ЛОГИКА ЗАПИСИ НА ПРИЕМ (общая для всех страниц) ---
const bookingModal = document.getElementById('bookingModal');
const bookingSteps = document.querySelectorAll('#bookingModal .step');
let currentDate = new Date();
let selectedDoctor = { id: null, name: '' };
let selectedDate = null;
let selectedTime = null;

async function openBookingModal(doctorId, doctorName) {
    selectedDoctor = { id: doctorId, name: doctorName || 'любому специалисту' };
    
    const doctorNameEl = document.getElementById('doctor-name-in-modal');
    if(doctorNameEl) doctorNameEl.textContent = selectedDoctor.name;
    
    if(bookingModal) {
        bookingModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        goToBookingStep(1, true);
        await generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    }
}

function closeBookingModal() {
    if(bookingModal) {
        bookingModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function goToBookingStep(stepNumber, reset = false) {
    bookingSteps.forEach(step => step.classList.add('hidden'));
    const stepElement = document.getElementById(`step${stepNumber}`); // Убедимся, что ID правильные
    if (stepElement) {
        stepElement.classList.remove('hidden');
    }
    
    if (reset) {
        selectedDate = null;
        selectedTime = null;
        document.getElementById('time-slots-container')?.classList.add('hidden');
        document.getElementById('continue-btn')?.setAttribute('disabled', '');
        const nameInput = document.getElementById('name');
        const phoneInput = document.getElementById('phone');
        if(nameInput) nameInput.value = '';
        if(phoneInput) phoneInput.value = '';
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
        if (timeSlotsData.length === 0) {
            timeSlotsEl.innerHTML = `<p class="text-center text-gray-500 col-span-full">Нет доступных слотов</p>`;
        }
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
        message += `Я хочу записаться на приём к врачу ${doctorName} на ${date} в ${selectedTime}.`;
        
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


// --- ЛОГИКА ОТЗЫВОВ (общая для всех страниц) ---
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

// --- ФАБРИКИ HTML-ЭЛЕМЕНТОВ (чтобы не дублировать код) ---
function createDoctorCard(doctor) {
    return `
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
        </div>`;
}

// --- ОПРЕДЕЛЕНИЕ ТЕКУЩЕЙ СТРАНИЦЫ И ЗАПУСК НУЖНЫХ ФУНКЦИЙ ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split('/').pop();

    // Запускаем общие для всех страниц функции
    initGlobalListeners();

    // Запускаем функции для конкретной страницы
    if (path === 'Index.html' || path === '') {
        initHomePage();
    } else if (path === 'doctors.html') {
        initDoctorsPage();
    }
    // Здесь будут другие страницы...

});

// --- ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ (для всех страниц) ---
function initGlobalListeners() {
    // Навигация в шапке
    document.querySelectorAll('a[href="#contacts"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Модальное окно записи
    document.getElementById('prev-month')?.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); generateCalendar(currentDate.getFullYear(), currentDate.getMonth()); });
    document.getElementById('next-month')?.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); generateCalendar(currentDate.getFullYear(), currentDate.getMonth()); });
    document.getElementById('continue-btn')?.addEventListener('click', () => { if(selectedDate && selectedTime){ const summaryText = `к врачу <strong>${selectedDoctor.name}</strong>, ${selectedDate.toLocaleDateString('ru-RU')} в <strong>${selectedTime}</strong>`; document.getElementById('summary').innerHTML = summaryText; goToBookingStep(2); } });
    document.getElementById('confirm-booking-btn')?.addEventListener('click', confirmAppointment);
    const backBtn = document.querySelector('#bookingModal button[onclick="goToStep(1)"]');
    if (backBtn) { backBtn.addEventListener('click', () => goToBookingStep(1)); }

    // Модальное окно отзывов
    const stars = document.querySelectorAll('#review-rating i');
    stars.forEach(star => {
        star.addEventListener('mouseover', (e) => { const ratingValue = e.target.dataset.value; stars.forEach(s => { s.classList.toggle('active', s.dataset.value <= ratingValue); }); });
        star.addEventListener('mouseout', () => { stars.forEach(s => { s.classList.toggle('active', s.dataset.value <= currentRating); }); });
        star.addEventListener('click', (e) => { currentRating = e.target.dataset.value; });
    });
}


// --- ИНИЦИАЛИЗАЦИЯ СТРАНИЦ ---

function initHomePage() {
    initHeroCarousel();

    // Загрузка превью врачей
    const doctorsContainer = document.getElementById('doctors-container');
    if (doctorsContainer) {
        fetch(`${API_BASE_URL}/doctors`)
            .then(res => res.json())
            .then(doctors => {
                doctorsContainer.innerHTML = doctors.slice(0, 6).map(doc => `<div class="swiper-slide h-auto">${createDoctorCard(doc)}</div>`).join('');
                new Swiper('.doctor-swiper', { slidesPerView: 1, spaceBetween: 30, loop: true, pagination: { el: '.swiper-pagination', clickable: true }, navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }, breakpoints: { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } } });
            });
    }
    
    // Здесь будет код для загрузки превью услуг, акций и отзывов, когда бэкенд будет готов
}

function initDoctorsPage() {
    const container = document.getElementById('doctors-full-list');
    if(container) {
        fetch(`${API_BASE_URL}/doctors`)
            .then(res => res.json())
            .then(doctors => {
                if (doctors.length === 0) {
                    container.innerHTML = `<p class="text-center col-span-full">На данный момент нет информации о специалистах.</p>`;
                    return;
                }
                container.innerHTML = doctors.map(doc => createDoctorCard(doc)).join('');
            })
            .catch(err => {
                 container.innerHTML = `<p class="text-center col-span-full text-red-500">Не удалось загрузить список специалистов.</p>`;
            });
    }
}