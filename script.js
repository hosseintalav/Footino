const matchListContainer = document.getElementById('match-list');
const countdownBanner = document.getElementById('countdown-banner');
let allMatches = [];
let countdownInterval = null;

// --- ۱. توابع مربوط به تاریخ و زمان ---
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

function getMatchDateTime(match) {
    return new Date(`${match.date}T${match.time}:00`);
}

// --- ۲. بارگذاری و رندر کردن مسابقات ---
async function loadMatches() {
    // 👈 نمایش کارت‌های اسکلتون پیش از ریکوئست زدن به فایل json
    renderSkeletonLoaders();

    try {
        const response = await fetch('matches.json');
        allMatches = await response.json();
        
        // یک تاخیر فانتزی و کوتاه (مثلا ۴۰۰ میلی ثانیه) برای اینکه افکت اسکلتون روی هاردهای پرسرعت هم نرم دیده بشه
        await new Promise(resolve => setTimeout(resolve, 400));

        renderAllMatches();
        initCountdown();
        
        // بازخوانی وضعیت‌ها هر ۱۰ ثانیه برای کنترل حذف بازی‌ها بعد از ۲ ساعت
        setInterval(() => {
            renderAllMatches();
            initCountdown();
        }, 10000);
        
    } catch (error) {
        matchListContainer.innerHTML = '<p style="color:red; text-align:center; margin-top:50px;">خطا در بارگذاری فایل مسابقات!</p>';
        console.error(error);
    }
}

// 👈 تابع جدید جهت تزریق المان‌های اسکلتون به دام (DOM)
function renderSkeletonLoaders() {
    matchListContainer.innerHTML = '';
    
    // هدر تاریخ فرضی
    const dateHeader = document.createElement('div');
    dateHeader.className = 'date-header skeleton-element';
    dateHeader.style.width = '100px';
    dateHeader.style.height = '16px';
    dateHeader.style.marginBottom = '15px';
    matchListContainer.appendChild(dateHeader);

    // ساخت ۳ کارت بازی اسکلتون
    for (let i = 0; i < 3; i++) {
        const div = document.createElement('div');
        div.className = 'skeleton-item';
        div.innerHTML = `
            <div class="team-side" style="justify-content: flex-end;">
                <div class="skeleton-element skeleton-text"></div>
                <div class="skeleton-element skeleton-flag"></div>
            </div>
            <div class="match-center">
                <div class="skeleton-element skeleton-center-text"></div>
                <div class="skeleton-element skeleton-sub-text"></div>
            </div>
            <div class="team-side" style="justify-content: flex-start;">
                <div class="skeleton-element skeleton-flag"></div>
                <div class="skeleton-element skeleton-text"></div>
            </div>
        `;
        matchListContainer.appendChild(div);
    }
}

function renderAllMatches() {
    matchListContainer.innerHTML = '';
    const now = new Date();

    // فیلتر و حذف مسابقاتی که دقیقاً ۲ ساعت از شروع آن‌ها گذشته است
    const filteredMatches = allMatches.filter(match => {
        const matchTime = getMatchDateTime(match);
        const timeDiff = now - matchTime;
        return timeDiff < 2 * 60 * 60 * 1000; 
    });

    if (filteredMatches.length === 0) {
        matchListContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top:50px;">هیچ مسابقه‌ای برای نمایش وجود ندارد.</p>';
        return;
    }

    filteredMatches.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    const groupedMatches = {};
    filteredMatches.forEach(match => {
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
            
            const matchTime = getMatchDateTime(match);
            const isLive = now >= matchTime && (now - matchTime) < 2 * 60 * 60 * 1000;
            
            const centerContent = isLive 
                ? `<span class="live-status"><i class="fas fa-circle" style="font-size: 7px;"></i> درحال پخش</span>`
                : `<span class="match-time">${match.time}</span>`;

            div.innerHTML = `
                <div class="team-side" style="justify-content: flex-end;">
                    <span class="team-name">${match.team1}</span>
                    <div class="flag-wrapper">
                        <div class="flag-backdrop" style="background-image: url('${match.team1Image}');" onerror="this.style.display='none'"></div>
                        <img class="flag-front" src="${match.team1Image}" alt="${match.team1}" onerror="this.src='https://via.placeholder.com/32/333/fff?text=?'">
                    </div>
                </div>
                
                <div class="match-center">
                    ${centerContent}
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

// --- ۳. سیستم تایمر و مدیریت پرچم‌های شمارش معکوس ---
function initCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);

    const nowTime = new Date().getTime();

    // یافتن بازی دارای تگ countdown مشروط بر اینکه هنوز شروع نشده باشد
    const targetMatch = allMatches.find(match => {
        if (!match.countdown) return false;
        const matchStartTime = getMatchDateTime(match).getTime();
        return matchStartTime > nowTime; 
    });

    // اگر بازی وجود نداشت یا زمانش رسیده بود، بنر کلاً پنهان می‌شود
    if (!targetMatch) {
        countdownBanner.style.display = 'none';
        return;
    }

    document.getElementById('countdown-title').textContent = `بازی بعدی: ${targetMatch.team1} - ${targetMatch.team2}`;
    
    // پرچم تیم اول
    const img1 = document.getElementById('cd-flag1');
    const blur1 = document.getElementById('cd-flag1-blur');
    img1.src = targetMatch.team1Image;
    img1.alt = targetMatch.team1;
    blur1.style.backgroundImage = `url('${targetMatch.team1Image}')`;
    img1.onerror = () => img1.src = 'https://via.placeholder.com/32/333/fff?text=?';

    // پرچم تیم دوم
    const img2 = document.getElementById('cd-flag2');
    const blur2 = document.getElementById('cd-flag2-blur');
    img2.src = targetMatch.team2Image;
    img2.alt = targetMatch.team2;
    blur2.style.backgroundImage = `url('${targetMatch.team2Image}')`;
    img2.onerror = () => img2.src = 'https://via.placeholder.com/32/333/fff?text=?';

    countdownBanner.style.display = 'block';
    const targetTime = getMatchDateTime(targetMatch).getTime();

    function updateTimer() {
        const now = new Date().getTime();
        let diff = targetTime - now;

        // به محض اینکه زمان بازی رسید و صفر شد، شمارش معکوس کلاً فوراً حذف می‌شود
        if (diff <= 0) {
            document.getElementById('cd-days').textContent = '00';
            document.getElementById('cd-hours').textContent = '00';
            document.getElementById('cd-minutes').textContent = '00';
            document.getElementById('cd-seconds').textContent = '00';
            
            countdownBanner.style.display = 'none'; 
            clearInterval(countdownInterval); 
            renderAllMatches(); 
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        diff -= days * (1000 * 60 * 60 * 24);

        const hours = Math.floor(diff / (1000 * 60 * 60));
        diff -= hours * (1000 * 60 * 60);

        const minutes = Math.floor(diff / (1000 * 60));
        diff -= minutes * (1000 * 60);

        const seconds = Math.floor(diff / 1000);

        // انتساب مقادیر به المان‌های HTML (ترتیب درست از چپ به راست)
        document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
        document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
    }

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
}

// --- ۴. مدیریت تم ---
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.querySelector('.theme-icon');

function applyTheme(theme) {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun theme-icon';
    } else {
        themeIcon.className = 'fas fa-moon theme-icon';
    }
    localStorage.setItem('theme', theme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    applyTheme(savedTheme || 'dark');
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    themeIcon.style.transform = 'rotate(360deg)';
    setTimeout(() => { themeIcon.style.transition = 'none'; }, 300);
    setTimeout(() => { themeIcon.style.transition = 'transform 0.4s ease'; }, 350);
}

themeToggleBtn.addEventListener('click', toggleTheme);

// --- ۵. مدیریت مودال ---
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

// --- ۶. دکمه اسکرول به بالا ---
const scrollTopBtn = document.getElementById('scroll-top-btn');

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollTopBtn.classList.add('show');
    } else {
        scrollTopBtn.classList.remove('show');
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// --- راه‌اندازی اولیه ---
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();          
    loadMatches();        
});
