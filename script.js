const matchListContainer = document.getElementById('match-list');
const countdownBanner = document.getElementById('countdown-banner');
let allMatches = [];
let countdownInterval = null;
let currentCountdownMatchId = null;
let isHighlighting = false; // جلوگیری از اجرای مجدد انیمیشن

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

function getMatchId(match) {
    return `${match.date}_${match.time}_${match.team1}_${match.team2}`;
}

// --- ۲. بارگذاری و رندر کردن مسابقات ---
async function loadMatches() {
    renderSkeletonLoaders();

    try {
        const response = await fetch('matches.json');
        allMatches = await response.json();
        
        await new Promise(resolve => setTimeout(resolve, 400));

        renderAllMatches();
        initCountdown();
        
        setInterval(() => {
            renderAllMatches();
            initCountdown();
        }, 10000);
        
    } catch (error) {
        matchListContainer.innerHTML = '<p style="color:red; text-align:center; margin-top:50px;">خطا در بارگذاری فایل مسابقات!</p>';
        console.error(error);
    }
}

function renderSkeletonLoaders() {
    matchListContainer.innerHTML = '';
    
    const dateHeader = document.createElement('div');
    dateHeader.className = 'date-header skeleton-element';
    dateHeader.style.width = '100px';
    dateHeader.style.height = '16px';
    dateHeader.style.marginBottom = '15px';
    matchListContainer.appendChild(dateHeader);

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
            const matchId = getMatchId(match);
            const div = document.createElement('div');
            div.className = 'match-item';
            div.dataset.matchId = matchId;

            const matchTime = getMatchDateTime(match);
            const isLive = now >= matchTime && (now - matchTime) < 2 * 60 * 60 * 1000;
            
            const centerContent = isLive 
                ? `<span class="live-status"><i class="fas fa-circle" style="font-size: 7px;"></i> درحال پخش</span>`
                : `<span class="match-time">${match.time}</span>`;

            const isClubClass = match.isClub ? 'is-club' : '';

            div.innerHTML = `
                <div class="team-side" style="justify-content: flex-end;">
                    <span class="team-name">${match.team1}</span>
                    <div class="flag-wrapper ${isClubClass}">
                        <div class="flag-backdrop" style="background-image: url('${match.team1Image}');" onerror="this.style.display='none'"></div>
                        <img class="flag-front" src="${match.team1Image}" alt="${match.team1}" onerror="this.src='https://via.placeholder.com/32/333/fff?text=?'">
                    </div>
                </div>
                
                <div class="match-center">
                    ${centerContent}
                    <span class="match-league">${match.league}</span>
                </div>
                
                <div class="team-side" style="justify-content: flex-start;">
                    <div class="flag-wrapper ${isClubClass}">
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

// --- تابع اسکرول به کارت مسابقه با انیمیشن نرم (فقط با کلیک) ---
function scrollToMatchCard(matchId) {
    if (isHighlighting) return; // اگر انیمیشن در حال اجراست، اجرا نشه
    
    const targetCard = document.querySelector(`.match-item[data-match-id="${matchId}"]`);
    if (targetCard) {
        // تنظیم فلگ برای جلوگیری از اجرای مجدد
        isHighlighting = true;
        
        const headerHeight = document.querySelector('.main-header')?.offsetHeight || 0;
        const bannerHeight = document.getElementById('countdown-banner')?.offsetHeight || 0;
        const cardTop = targetCard.getBoundingClientRect().top + window.pageYOffset;
        const offset = headerHeight + bannerHeight + 20;
        
        window.scrollTo({
            top: cardTop - offset,
            behavior: 'smooth'
        });

        targetCard.classList.add('highlight-match');
        
        setTimeout(() => {
            targetCard.classList.remove('highlight-match');
            // بعد از اتمام انیمیشن، فلگ رو ریست می‌کنیم
            setTimeout(() => {
                isHighlighting = false;
            }, 100);
        }, 1500);
    }
}

// --- ۳. سیستم تایمر و مدیریت پرچم‌های شمارش معکوس ---
function initCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);

    const nowTime = new Date().getTime();

    const targetMatch = allMatches.find(match => {
        if (!match.countdown) return false;
        const matchStartTime = getMatchDateTime(match).getTime();
        return matchStartTime > nowTime; 
    });

    if (!targetMatch) {
        countdownBanner.style.display = 'none';
        currentCountdownMatchId = null;
        return;
    }

    currentCountdownMatchId = getMatchId(targetMatch);

    document.getElementById('countdown-title').textContent = 'بازی مهم بعدی';
    
    const cdFlag1Container = document.getElementById('cd-flag1-container');
    const cdFlag2Container = document.getElementById('cd-flag2-container');

    if (targetMatch.isClub) {
        cdFlag1Container.classList.add('is-club');
        cdFlag2Container.classList.add('is-club');
    } else {
        cdFlag1Container.classList.remove('is-club');
        cdFlag2Container.classList.remove('is-club');
    }

    const img1 = document.getElementById('cd-flag1');
    const blur1 = document.getElementById('cd-flag1-blur');
    img1.src = targetMatch.team1Image;
    img1.alt = targetMatch.team1;
    blur1.style.backgroundImage = `url('${targetMatch.team1Image}')`;
    img1.onerror = () => img1.src = 'https://via.placeholder.com/32/333/fff?text=?';

    const img2 = document.getElementById('cd-flag2');
    const blur2 = document.getElementById('cd-flag2-blur');
    img2.src = targetMatch.team2Image;
    img2.alt = targetMatch.team2;
    blur2.style.backgroundImage = `url('${targetMatch.team2Image}')`;
    img2.onerror = () => img2.src = 'https://via.placeholder.com/32/333/fff?text=?';

    countdownBanner.style.display = 'block';
    
    // افزودن رویداد کلیک به بنر شمارش معکوس
    countdownBanner.removeEventListener('click', handleCountdownClick);
    countdownBanner.addEventListener('click', handleCountdownClick);

    const targetTime = getMatchDateTime(targetMatch).getTime();

    function updateTimer() {
        const now = new Date().getTime();
        let diff = targetTime - now;

        if (diff <= 0) {
            document.getElementById('cd-days').textContent = '00';
            document.getElementById('cd-hours').textContent = '00';
            document.getElementById('cd-minutes').textContent = '00';
            document.getElementById('cd-seconds').textContent = '00';
            
            countdownBanner.style.display = 'none'; 
            clearInterval(countdownInterval); 
            currentCountdownMatchId = null;
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

        document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
        document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
    }

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
}

// --- تابع مدیریت کلیک روی بنر شمارش معکوس ---
function handleCountdownClick() {
    if (currentCountdownMatchId && !isHighlighting) {
        // بررسی وجود کارت در DOM
        const cardExists = document.querySelector(`.match-item[data-match-id="${currentCountdownMatchId}"]`);
        if (!cardExists) {
            // اگر کارت وجود نداشت، رندر مجدد انجام بده و بعد اسکرول کن
            renderAllMatches();
            // بعد از رندر، دوباره تلاش کن
            setTimeout(() => {
                scrollToMatchCard(currentCountdownMatchId);
            }, 100);
        } else {
            scrollToMatchCard(currentCountdownMatchId);
        }
    }
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
