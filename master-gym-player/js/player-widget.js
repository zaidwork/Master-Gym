// ===== Player Floating AI Widget =====
const PAI_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000' : 'https://master-gym.onrender.com';

let paiPanelOpen = false;
let paiHistory = [];
let paiSending = false;

function getPlayerId() { return localStorage.getItem('player_id'); }
function getPlayerName() { return localStorage.getItem('gym_player_name') || 'لاعب'; }

function togglePlayerAiPanel() {
    paiPanelOpen = !paiPanelOpen;
    document.getElementById('player-ai-panel').classList.toggle('open', paiPanelOpen);

    const overlay = document.getElementById('pai-overlay');
    if (overlay) {
        overlay.classList.toggle('active', paiPanelOpen);
    }

    if (paiPanelOpen && document.getElementById('pai-messages').children.length === 0) {
        paiCheckHealth();
        const name = getPlayerName().split(' ')[0];
        const welcomeMsg = `مرحباً ${name}! 👋\n\nأنا مساعدك الرياضي الشخصي في ماستر جيم. يمكنني مساعدتك في:\n• متابعة اشتراكك وتواريخه\n• عرض برنامجك التدريبي\n• تتبع وزنك وتطورك\n• نصائح رياضية وغذائية\n\nبماذا يمكنني خدمتك اليوم؟`;
        paiAddMessage('bot', welcomeMsg);
        paiHistory.push({ role: 'assistant', content: welcomeMsg });
    }
}

function paiCheckHealth() {
    const el = document.getElementById('pai-status');
    fetch(PAI_BASE + '/health')
        .then(r => r.json())
        .then(d => {
            const ok = d.ready ?? d.hasApiKey;
            el.textContent = ok ? 'متصل ✓' : 'غير جاهز';
            el.className = ok ? 'online' : 'offline';
        })
        .catch(() => { el.textContent = 'غير متصل'; el.className = 'offline'; });
}

function paiAddMessage(role, text, isTyping = false) {
    const box = document.getElementById('pai-messages');
    const row = document.createElement('div');
    row.className = `pai-row ${role}`;

    const av = document.createElement('div');
    av.className = `pai-avatar ${role}`;
    av.textContent = role === 'bot' ? '🤖' : '👤';

    const bubble = document.createElement('div');
    bubble.className = `pai-bubble ${role}`;

    if (isTyping) {
        bubble.innerHTML = '<div class="pai-typing"><span></span><span></span><span></span></div>';
        row.id = 'pai-typing-row';
    } else {
        bubble.innerHTML = paiFormatText(text);
    }

    row.appendChild(av);
    row.appendChild(bubble);
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
    return row;
}

function paiFormatText(text) {
    return text
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
        .replace(/\*(.+?)\*/g,'<em>$1</em>')
        .replace(/\n/g,'<br>');
}

async function paiSendMessage() {
    const input = document.getElementById('pai-input');
    const text = input.value.trim();
    if (!text || paiSending) return;

    input.value = '';
    paiAutoResize(input);
    paiAddMessage('user', text);
    paiHistory.push({ role: 'user', content: text });

    document.getElementById('pai-send').disabled = true;
    paiSending = true;
    const typingRow = paiAddMessage('bot', '', true);

    try {
        const contents = paiHistory.slice(-16).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const now = new Date();
        const sysPrompt = `أنت "ماستر جيم AI"، المساعد الرياضي الشخصي للاعب في نادي ماستر جيم.
تحدث بالعربية دائمًا وكن محفزاً. التاريخ: ${now.toLocaleDateString('ar-JO')} | الوقت: ${now.toLocaleTimeString('ar-JO')}
أنت تتحدث مع لاعب (مشترك عادي). ستصلك بياناته الشخصية من الخادم. لا تعطِ صلاحيات إدارية.

--- صلاحيات اللاعب وتجميد الاشتراك ---
يمكنك تقديم طلب تجميد الاشتراك نيابةً عن اللاعب عبر أداة submit_freeze_request.
هوية اللاعب يحددها الخادم تلقائياً، لا تحتاج لتمريرها.
الأداة تحتاج فقط: days (عدد الأيام) و reason (السبب).
إذا لم يحدد اللاعب عدد الأيام، اسأله عن المدة المطلوبة.
إذا لم يذكر سبباً، اسأله عن السبب قبل تقديم الطلب.
بعد تقديم الطلب بنجاح، أخبره أن الطلب أُرسل للكوتش وينتظر الموافقة في لوحة الإدارة.
الحد الأقصى للتجميد 30 يوم، والحد الأدنى يوم واحد.`;

        const res = await fetch(PAI_BASE + '/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                playerId: getPlayerId(),
                adminId: null,
                enableSearch: /ابحث|الإنترنت|الانترنت/.test(text),
                systemInstruction: { parts: [{ text: sysPrompt }] }
            })
        });

        const data = await res.json();
        typingRow.remove();
        if (!res.ok) throw new Error(data.error || 'حدث خطأ في الخادم');

        const reply = data.reply || '';
        paiHistory.push({ role: 'assistant', content: reply });
        paiAddMessage('bot', reply);

    } catch (err) {
        typingRow.remove();
        const errRow = paiAddMessage('bot', 'تعذر إكمال الطلب: ' + err.message);
        errRow.querySelector('.pai-bubble').classList.add('error');
    } finally {
        paiSending = false;
        document.getElementById('pai-send').disabled = false;
    }
}

function paiQuickSend(text) {
    document.getElementById('pai-input').value = text;
    paiSendMessage();
}

function paiHandleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); paiSendMessage(); }
}

function paiAutoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

// إظهار الـ FAB بعد تسجيل الدخول
document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.player-nav .nav-btn[data-target]');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            if (!targetId) return;

            navButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            const sections = document.querySelectorAll('#dashboard-screen .admin-section');
            sections.forEach(sec => sec.classList.remove('active'));

            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');

            if (targetId === 'player-personal-profile') {
                setTimeout(() => {
                    if (typeof window.loadPersonalProfile === 'function') window.loadPersonalProfile();
                }, 100);
            }
        });
    });
});

// Global Password Visibility Toggle
window.togglePasswordVisibility = function (inputId, iconElement) {
    const input = document.getElementById(inputId);
    const icon = iconElement.querySelector('i') || iconElement;
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.style.opacity = '1';
        if(icon.tagName === 'I') icon.className = 'fa-regular fa-eye-slash';
        else iconElement.textContent = '👁️‍🗨️';
    } else {
        input.type = 'password';
        iconElement.style.opacity = '0.7';
        if(icon.tagName === 'I') icon.className = 'fa-regular fa-eye';
        else iconElement.textContent = '👁️';
    }
}
