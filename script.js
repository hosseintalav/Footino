const matchListContainer = document.getElementById('match-list');
let allMatches = [];

// --- 1. توابع مربوط به تاریخ و زمان ---
function getDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getPersianDayName(dateStr) {
    const date = new Date(dateStr);
    const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
    return days[date.getDay()];
}

function getPersianDateLabel(dateStr) {
    const now = new Date();
    const todayStr = getDateString(now);
    
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = getDateString(tomorrow);

    if (dateStr === todayStr) return `امروز : ${getPersianDayName(dateStr)}`;
    if (dateStr === tomorrowStr) return `فردا : ${getPersianDayName(dateStr)}`;
    return getPersianDayName(dateStr);
}

// --- 2. بارگذاری و رندر کردن مسابقات ---
async function loadMatches() {
    try {
        const response = await fetch('matches.json');
        allMatches = await response.json();
        renderAllMatches();
    } catch (error) {
        matchListContainer.innerHTML = '<p style="color:red; text-align:center; margin-top:50px;">خطا در بارگذاری فایل مسابقات!<br>مطمئن شوید فایل matches.json در کنار سایر فایل‌ها قرار دارد.</p>';
        console.error(error);
    }
}

function renderAllMatches() {
    matchListContainer.innerHTML = '';

    if (allMatches.length === 0) {
        matchListContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top:50px;">هیچ مسابقه‌ای برای نمایش وجود ندارد.</p>';
        return;
    }

    allMatches.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    const groupedMatches = {};
    allMatches.forEach(match => {
        if (!groupedMatches[match.date]) groupedMatches[match.date] = [];
        groupedMatches[match.date].push(match);
    });

    for (const [date, matches] of Object.entries(groupedMatches)) {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.textContent = getPersianDateLabel(date);
        matchListContainer.appendChild(dateHeader);

        matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'match-item';
            
            div.innerHTML = `
                <div class="team-side" style="justify-content: flex-end;">
                    <span class="team-name">${match.team1}</span>
                    <div class="flag-wrapper">
                        <div class="flag-backdrop" style="background-image: url('${match.team1Image}');" onerror="this.style.display='none'"></div>
                        <img class="flag-front" src="${match.team1Image}" alt="${match.team1}" onerror="this.src='https://via.placeholder.com/32/333/fff?text=?'">
                    </div>
                </div>
                
                <div class="match-center">
                    <span class="match-time">${match.time}</span>
                    <span class="match-league">${match.league}</span>
                </div>
                
                <div class="team-side" style="justify-content: flex-start;">
                    <div class="flag-wrapper">
                        <div class="flag-backdrop" style="background-image: url('${match.team2Image}');" onerror="this.style.display='none'"></div>
                        <img class="flag-front" src="${match.team2Image}" alt="${match.team2}" onerror="this.src='https://via.placeholder.com/32/333/fff?text=?'">
                    </div>
                    <span class="team-name">${match.team2}</span>
                </div>
            `;
            matchListContainer.appendChild(div);
        });
    }
}

// --- 3. مدیریت تغییر تم ---
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.querySelector('.theme-icon');

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        html.setAttribute('data-theme', 'light');
        themeIcon.className = 'fas fa-moon theme-icon';
        themeIcon.style.transform = 'rotate(360deg)';
    } else {
        html.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fas fa-sun theme-icon';
        themeIcon.style.transform = 'rotate(-360deg)';
    }
    setTimeout(() => { themeIcon.style.transition = 'none'; }, 300);
    setTimeout(() => { themeIcon.style.transition = 'transform 0.4s ease'; }, 350);
}
themeToggleBtn.addEventListener('click', toggleTheme);

// --- 4. مدیریت مودال ---
const contactBtn = document.getElementById('contact-btn');
const modal = document.getElementById('contact-modal');
const closeModalBtn = document.getElementById('close-modal');

function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}
contactBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// --- 5. دکمه اسکرول به بالا ---
const scrollTopBtn = document.getElementById('scroll-top-btn');

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) { // اگر بیش از 300 پیکسل اسکرول شد
        scrollTopBtn.classList.add('show');
    } else {
        scrollTopBtn.classList.remove('show');
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth' // اسکرول نرم
    });
});

// بارگذاری اولیه سایت
document.addEventListener('DOMContentLoaded', loadMatches);