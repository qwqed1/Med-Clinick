// --- Carousel & Mobile Menu Logic (без изменений) ---
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

// --- Booking Modal & Calendar Logic (ИЗМЕНЕНИЯ ЗДЕСЬ) ---
const modal = document.getElementById('bookingModal');
const steps = document.querySelectorAll('.step');
let currentDate = new Date();
let selectedDoctor = { id: null, name: '' };
let selectedDate = null;
let selectedTime = null;

// Имитация бэкенда для демонстрации
// Имитация бэкенда для демонстрации
const fakeBackend = {
    getMonthlyAvailability: async (doctorId, year, month) => { await new Promise(res => setTimeout(res, 500)); const unavailableDays = [new Date().getDate() + 2, new Date().getDate() + 5]; const daysInMonth = new Date(year, month + 1, 0).getDate(); return Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, status: unavailableDays.includes(i + 1) ? 'unavailable' : 'available' })); },
    getDailyTimeslots: async (doctorId, date) => { await new Promise(res => setTimeout(res, 500)); return [ { time: "09:00", status: "available" }, { time: "09:30", status: "unavailable" }, { time: "10:00", status: "available" }, { time: "10:30", status: "available" }, { time: "11:00", status: "unavailable" }, { time: "11:30", status: "available" }, { time: "12:00", status: "unavailable" }, { time: "12:30", status: "available" }]; },

    // ДОБАВЬТЕ ЭТИ ДВА МЕТОДА
    getApprovedReviews: async () => {
        await new Promise(res => setTimeout(res, 500));
        return [
            { name: "Анна К.", text: "Прекрасная клиника! Современное оборудование, внимательный персонал.", rating: 5 },
            { name: "Сергей Б.", text: "Проходил полное обследование. Всё на высшем уровне!", rating: 5 },
            { name: "Марина И.", text: "Лучший сервис в городе. Записалась через сайт, все очень удобно.", rating: 5 }
        ];
    },
    submitNewReview: async (reviewData) => {
        console.log("ОТПРАВКА ОТЗЫВА АДМИНУ:", reviewData);
        await new Promise(res => setTimeout(res, 1000));
        return { success: true };
    }
};


async function openBookingModal(doctorId, doctorName) {
    if (!doctorId || !doctorName) {
        selectedDoctor = { id: 0, name: 'любому специалисту' };
    } else {
        selectedDoctor = { id: doctorId, name: doctorName };
    }
    
    document.getElementById('doctor-name-in-modal').textContent = selectedDoctor.name;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    goToStep(1, true);
    await generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
}

function closeBookingModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function goToStep(stepNumber, reset = false) {
    steps.forEach(step => step.classList.add('hidden'));
    document.getElementById(`step${stepNumber}`).classList.remove('hidden');
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
    calendarDaysEl.innerHTML = '';
    
    const firstDayOfMonth = new Date(year, month, 1);
    monthYearEl.textContent = firstDayOfMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    
    let startingDay = firstDayOfMonth.getDay();
    startingDay = startingDay === 0 ? 6 : startingDay - 1; 
    for (let i = 0; i < startingDay; i++) {
        calendarDaysEl.innerHTML += `<div class="calendar-day other-month"></div>`;
    }
    
    const availabilityData = await fakeBackend.getMonthlyAvailability(selectedDoctor.id, year, month + 1);
    
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

    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timeSlotsData = await fakeBackend.getDailyTimeslots(selectedDoctor.id, dateString);

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

    timeLoader.classList.add('hidden');
    timeSlotsContainer.classList.remove('hidden');
    document.getElementById('continue-btn').disabled = true;
    selectedTime = null;
}

function selectTime(timeElement, time) {
    document.querySelectorAll('.time-slot.selected').forEach(el => el.classList.remove('selected'));
    timeElement.classList.add('selected');
    selectedTime = time;
    document.getElementById('continue-btn').disabled = false;
}

// =================================================================
// ИЗМЕНЕНИЕ ЗДЕСЬ: Функция confirmAppointment переписана для WhatsApp
// =================================================================
function confirmAppointment() {
    const nameInput = document.getElementById('name');
    if (!nameInput.value.trim()) {
        alert('Пожалуйста, укажите ваше имя.');
        return;
    }

    // ВАЖНО: Укажите здесь номер телефона вашего менеджера
    const managerWhatsAppNumber = "77770001122"; // Номер в международном формате без "+"

    const clientName = nameInput.value.trim();
    const doctorName = selectedDoctor.name;
    const date = selectedDate.toLocaleDateString('ru-RU');
    const time = selectedTime;
    
    // Формируем текст сообщения по вашему шаблону
    let message = `Здравствуйте! Меня зовут ${clientName}. `;
    message += `Хочу записаться на приём к врачу ${doctorName} на ${date} в ${time}.`;
    
    // Кодируем текст для безопасной передачи в URL
    const encodedMessage = encodeURIComponent(message);
    
    // Создаем финальную ссылку для перехода в WhatsApp
    const whatsappUrl = `https://wa.me/${managerWhatsAppNumber}?text=${encodedMessage}`;
    
    // Открываем WhatsApp в новой вкладке
    window.open(whatsappUrl, '_blank');

    // Закрываем модальное окно после перехода
    closeBookingModal();
}

// =================================================================
// НОВЫЙ КОД: Логика для модального окна отзывов
// =================================================================
const reviewModal = document.getElementById('reviewModal');
let currentRating = 0;

function openReviewModal() {
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
    reviewModal.classList.remove('active');
    document.body.style.overflow = '';
}

const stars = document.querySelectorAll('#review-rating i');
stars.forEach(star => {
    star.addEventListener('mouseover', (e) => {
        const ratingValue = e.target.dataset.value;
        stars.forEach(s => {
            s.classList.toggle('active', s.dataset.value <= ratingValue);
        });
    });
    star.addEventListener('mouseout', () => {
         stars.forEach(s => {
            s.classList.toggle('active', s.dataset.value <= currentRating);
        });
    });
    star.addEventListener('click', (e) => {
        currentRating = e.target.dataset.value;
    });
});

document.getElementById('prev-month').onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
};

document.getElementById('next-month').onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
};

document.getElementById('continue-btn').addEventListener('click', () => {
    if(selectedDate && selectedTime){
        const summaryText = `к врачу <strong>${selectedDoctor.name}</strong>, ${selectedDate.toLocaleDateString('ru-RU')} в <strong>${selectedTime}</strong>`;
        document.getElementById('summary').innerHTML = summaryText;
    }
});
// ИЗМЕНЕНИЕ ЗДЕСЬ: обработчик клика теперь на новой функции
document.getElementById('confirm-booking-btn').addEventListener('click', confirmAppointment);

// --- Doctors Carousel & Data ---
document.addEventListener('DOMContentLoaded', () => {
    const doctorsContainer = document.getElementById('doctors-container');
    
    const doctorsData = [
        { id: 1, name: "Иванов Александр", specialty: "Главный терапевт", experience: "15 лет", degree: "Врач высшей категории", imageUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop" },
        { id: 2, name: "Петрова Мария", specialty: "Кардиолог", experience: "12 лет", degree: "Кандидат медицинских наук", imageUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop" },
        { id: 3, name: "Сидоров Дмитрий", specialty: "Хирург", experience: "20 лет", degree: "Доктор медицинских наук", imageUrl: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop" },
        { id: 4, name: "Ковалева Ольга", specialty: "Педиатр", experience: "10 лет", degree: "Врач первой категории", imageUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop" }
    ];

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
    
    new Swiper('.doctor-swiper', {
        slidesPerView: 1, spaceBetween: 30, loop: true,
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        breakpoints: { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }
    });

    const testimonialsContainer = document.getElementById('testimonials-container');
    fakeBackend.getApprovedReviews().then(reviews => {
        testimonialsContainer.innerHTML = '';
        reviews.forEach(review => {
            let starsHTML = '';
            for(let i=0; i<5; i++) {
                starsHTML += `<i class="fas fa-star ${i < review.rating ? 'text-gold' : 'text-gray-300'}"></i>`;
            }
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
        
        // Инициализация новой карусели для отзывов
        new Swiper('.testimonial-swiper', {
            slidesPerView: 1, spaceBetween: 30, loop: true,
            pagination: { el: '.swiper-pagination', clickable: true },
            autoplay: { delay: 5000 },
            breakpoints: { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }
        });
    });

    document.getElementById('submit-review-btn').addEventListener('click', async () => {
        const name = document.getElementById('review-name').value;
        const text = document.getElementById('review-text').value;
        if (!name || !text || currentRating === 0) {
            alert('Пожалуйста, заполните все поля и поставьте оценку.');
            return;
        }
        
        const reviewData = { name, text, rating: currentRating };
        const response = await fakeBackend.submitNewReview(reviewData);

        if (response.success) {
            document.getElementById('review-step1').classList.add('hidden');
            document.getElementById('review-step2').classList.remove('hidden');
        } else {
            alert('Произошла ошибка. Попробуйте позже.');
        }
    });
    

    // ИЗМЕНЕНИЕ ЗДЕСЬ: Добавляем обработчик на общие кнопки "Записаться"
    document.querySelectorAll('a[href="#doctors"], button[onclick*="openBookingModal"]').forEach(btn => {
        // Проверяем, что это не кнопка внутри карточки врача
        if(btn.closest('.doctor-card')) return;
        
        if(btn.hasAttribute('onclick')) {
            btn.removeAttribute('onclick');
        }
        btn.addEventListener('click', (e) => {
            if(e.currentTarget.tagName === 'A') e.preventDefault();
            openBookingModal(null, null);
            if(e.currentTarget.tagName === 'A') {
                document.querySelector('#doctors').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});