// js/player.js

// --- UI Utilities ---
function showToast(message, type = 'info', onClick = null) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    if (onClick) {
        toast.style.cursor = 'pointer';
        toast.onclick = onClick;
    }
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    // إخفاء الأزرار العائمة عند عرض شاشة تسجيل الدخول
    if (screenId === 'auth-screen') {
        const chatFab = document.getElementById('chat-fab');
        const aiFab = document.getElementById('player-ai-fab');
        if (chatFab) chatFab.classList.remove('visible');
        if (aiFab)  aiFab.classList.remove('visible');
    }
}

function showAuthTab(targetId) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    document.querySelector(`button[data-target="${targetId}"]`).classList.add('active');
}

// --- Auth State ---
let currentPlayer = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if logged in
    const storedPlayer = localStorage.getItem('player_id');
    if (storedPlayer) {
        checkPlayerStatus(storedPlayer);
    }

    // Auth Tabs Setup
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => showAuthTab(e.target.dataset.target));
    });

    // Player Dashboard Nav
    document.querySelectorAll('.player-nav .nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.currentTarget;
            if (!btnEl.dataset.target) return; // Skip logout or buttons without target
            
            if (btnEl.dataset.target === 'player-progress') loadProgressChart();
            if (btnEl.dataset.target === 'player-qr') loadQRCode();
            if (btnEl.dataset.target === 'player-chat') {
                loadMessages();
            }
            if (btnEl.dataset.target === 'player-personal-profile') {
                if (typeof loadPersonalProfile === 'function') loadPersonalProfile();
            }
        });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Forms
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('chat-form').addEventListener('submit', handleSendMessage);
    document.getElementById('progress-form').addEventListener('submit', handleProgressSubmit);
    if(document.getElementById('freeze-form')) document.getElementById('freeze-form').addEventListener('submit', handleFreezeSubmit);
});

async function checkPlayerStatus(playerId) {
    try {
        const { data: player, error } = await supabase
            .from('players')
            .select('*')
            .eq('id', playerId)
            .single();

        if (error || !player) throw error;

        if (player.status === 'pending') {
            document.getElementById('pending-message').classList.remove('hidden');
            localStorage.removeItem('player_id');
        } else if (player.status === 'approved') {
            currentPlayer = player;
            localStorage.setItem('player_id', player.id);
            localStorage.setItem('gym_player_name', player.full_name);
            localStorage.setItem('gym_player_points', player.points || 0);
            initDashboard();
        } else {
            showToast('حسابك مرفوض، راجع الإدارة', 'error');
            localStorage.removeItem('player_id');
        }
    } catch (err) {
        console.error(err);
        localStorage.removeItem('player_id');
    }
}

// --- Handlers ---
async function handleRegister(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('register-submit-btn');
    submitBtn.disabled = true;

    const fullName = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-password-confirm').value;
    const address = document.getElementById('reg-address').value.trim();
    const type = document.querySelector('input[name="reg-type"]:checked').value;
    const isMilitary = type === 'military';
    const genderEl = document.querySelector('input[name="reg-gender"]:checked');
    const gender = genderEl ? genderEl.value : 'ذكر';

    if (password !== confirmPassword) {
        showToast('كلمتا المرور غير متطابقتين', 'error');
        submitBtn.disabled = false;
        return;
    }

    try {
        // Check for duplicates
        const { data: existingPhone } = await supabase.from('players').select('id').eq('phone_number', phone).single();
        if (existingPhone) {
            showToast('رقم الهاتف مستخدم بالفعل', 'error');
            submitBtn.disabled = false; return;
        }

        const { data: existingName } = await supabase.from('players').select('id').eq('full_name', fullName).single();
        if (existingName) {
            showToast('الاسم مسجل مسبقاً، يرجى كتابة اسم مختلف', 'error');
            submitBtn.disabled = false; return;
        }

        // Generate unique 3-digit ID
        let clubId = '';
        let isIdUnique = false;
        while (!isIdUnique) {
            clubId = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
            const { data: existingId } = await supabase.from('players').select('id').eq('club_id', clubId).single();
            if (!existingId) isIdUnique = true;
        }

        const { data, error } = await supabase.from('players').insert([
            { full_name: fullName, phone_number: phone, password: password, address: address, is_military: isMilitary, gender: gender, status: 'pending', club_id: clubId }
        ]).select();

        if (error) throw error;
        
        await pushAdminNotification(
            'مشترك جديد بانتظار الموافقة 👤',
            `هناك طلب تسجيل جديد بانتظار الموافقة من المشترك: ${fullName}`
        );

        showToast('تم التسجيل بنجاح! بانتظار موافقة الإدارة.', 'success');
        document.getElementById('register-form').reset();
        document.getElementById('pending-message').classList.remove('hidden');
        showAuthTab('login-form');

    } catch (err) {
        console.error(err);
        showToast('حدث خطأ أثناء التسجيل', 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('login-submit-btn');
    submitBtn.disabled = true;

    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const { data: player, error } = await supabase
            .from('players')
            .select('*')
            .eq('phone_number', phone)
            .eq('password', password) // In real app, verify hash
            .single();

        if (error || !player) {
            showToast('رقم الهاتف أو كلمة المرور غير صحيحة', 'error');
            submitBtn.disabled = false; return;
        }

        if (player.status === 'pending') {
            document.getElementById('pending-message').classList.remove('hidden');
            submitBtn.disabled = false; return;
        } else if (player.status === 'rejected') {
            showToast('حسابك مرفوض من قبل الإدارة', 'error');
            submitBtn.disabled = false; return;
        }

        currentPlayer = player;
        localStorage.setItem('player_id', player.id);
        localStorage.setItem('gym_player_name', player.full_name);
        localStorage.setItem('gym_player_points', player.points || 0);
        initDashboard();

    } catch (err) {
        console.error(err);
        showToast('حدث خطأ أثناء تسجيل الدخول', 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

function logout() {
    currentPlayer = null;
    localStorage.removeItem('player_id');
    localStorage.removeItem('gym_player_name');
    localStorage.removeItem('gym_player_points');
    document.getElementById('login-form').reset();
    document.getElementById('chat-fab').classList.remove('visible');
    showScreen('auth-screen');
}

// --- Dashboard Logic ---
async function initDashboard() {
    const firstName = currentPlayer.full_name.split(' ')[0];
    const cid = currentPlayer.club_id ? ` (رقم المشترك: ${currentPlayer.club_id})` : '';
    document.getElementById('welcome-name').textContent = `مرحباً بك، ${firstName}${cid}`;
    showScreen('dashboard-screen');
    
    document.getElementById('chat-fab').classList.add('visible');

    // إظهار زر المساعد الذكي العائم
    const aiFab = document.getElementById('player-ai-fab');
    if (aiFab) aiFab.classList.add('visible');

    // Fetch latest player points to display on dashboard
    try {
        const { data: freshPlayer } = await supabase
            .from('players')
            .select('points')
            .eq('id', currentPlayer.id)
            .single();
        if (freshPlayer) {
            currentPlayer.points = freshPlayer.points;
            localStorage.setItem('gym_player_points', freshPlayer.points || 0);
        }
    } catch(err) {
        console.error('Error refreshing points:', err);
    }
    
    const dbPointsEl = document.getElementById('player-dashboard-points');
    if (dbPointsEl) {
        dbPointsEl.textContent = currentPlayer.points || 0;
    }

    loadSubscription();
    loadSchedule();
    loadMessages();
    setupMessagesRealtime();

    updatePlayerUnreadBadge();
    setInterval(updatePlayerUnreadBadge, 5000);

    loadGlobalNotifications();
    setupNotificationsRealtime();
    loadLeaderboard();
    loadPersonalProfile();
}

async function loadSubscription() {
    const container = document.getElementById('subscription-status');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const { data: subs, error } = await supabase
            .from('player_subscriptions')
            .select(`
                *,
                subscription_types(name, price)
            `)
            .eq('player_id', currentPlayer.id)
            .eq('is_active', true)
            .order('end_date', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!subs || subs.length === 0) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.9); font-weight: 600;">لا يوجد اشتراك فعال حالياً.</p>';
            checkAndShowRenewalButton(container, true, 0);
            return;
        }

        const sub = subs[0];
        
        // Fetch any approved freeze for this subscription
        const { data: freezes } = await supabase
            .from('freeze_requests')
            .select('*')
            .eq('subscription_id', sub.id)
            .eq('status', 'approved');

        const now = new Date();
        const activeFreeze = freezes?.find(f => {
            const start = new Date(f.created_at);
            const end = new Date(start.getTime() + f.days * 24 * 60 * 60 * 1000);
            return now >= start && now < end;
        });

        const endDate = new Date(sub.end_date);
        
        if (activeFreeze) {
            const freezeEnd = new Date(activeFreeze.created_at).getTime() + activeFreeze.days * 24 * 60 * 60 * 1000;
            const diffTime = Math.max(0, endDate.getTime() - freezeEnd);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            const statusBadge = `<span class="badge warning" style="background:#00d2ff; color:#0a0a0a; font-weight:bold; padding:4px 10px; border-radius:20px; font-size:0.85rem; box-shadow:0 4px 10px rgba(0, 210, 255, 0.3);">❄️ مجمد</span>`;
            
            container.innerHTML = `
                <h4 style="color: white; font-weight: 800; font-size: 1.5rem;" class="mb-1">${sub.subscription_types.name}</h4>
                <p style="font-weight: 500;">السعر: ${sub.subscription_types.price} ₪</p>
                <p style="font-weight: 500;">تاريخ البدء: <span dir="ltr">${new Date(sub.start_date).toLocaleString('ar-EG')}</span></p>
                <p style="font-weight: 500; display: flex; align-items: center; gap: 8px;">تاريخ الانتهاء المتوقع: <span dir="ltr">${new Date(sub.end_date).toLocaleString('ar-EG')}</span> ${statusBadge}</p>
                <div class="p-3 mt-3" style="background: rgba(0, 210, 255, 0.06); border: 1px solid rgba(0, 210, 255, 0.3); border-radius: 12px; text-align: center; box-shadow: inset 0 0 15px rgba(0, 210, 255, 0.05);">
                    <p style="margin: 0; color: #00d2ff; font-weight: 800; font-size: 1.05rem; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        ❄️ الاشتراك موقوف حالياً ومتبقي لك ${diffDays} يوم
                    </p>
                    <small style="color: rgba(255,255,255,0.7); display: block; margin-top: 6px; font-size: 0.85rem;">
                        ينتهي التجميد تلقائياً ويبدأ العد مجدداً في: ${new Date(freezeEnd).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </small>
                </div>
            `;
        } else {
            const diffTime = Math.abs(endDate - now);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            let statusBadge = endDate > now ? `<span class="badge approved">نشط - باقي ${diffDays}ي و ${diffHours}س</span>` : `<span class="badge rejected">منتهي</span>`;

            container.innerHTML = `
                <h4 style="color: white; font-weight: 800; font-size: 1.5rem;" class="mb-1">${sub.subscription_types.name}</h4>
                <p style="font-weight: 500;">السعر: ${sub.subscription_types.price} ₪</p>
                <p style="font-weight: 500;">تاريخ البدء: <span dir="ltr">${new Date(sub.start_date).toLocaleString('ar-EG')}</span></p>
                <p style="font-weight: 500;">تاريخ الانتهاء: <span dir="ltr">${new Date(sub.end_date).toLocaleString('ar-EG')}</span> ${statusBadge}</p>
            `;

            if (diffDays <= 3) {
                checkAndShowRenewalButton(container, false, diffDays);
            }
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color: rgba(255,255,255,0.9);">تعذر تحميل بيانات الاشتراك.</p>';
    }
}

async function checkAndShowRenewalButton(container, noActiveSub, diffDays) {
    try {
        const { data: request, error } = await supabase
            .from('renewal_requests')
            .select('*')
            .eq('player_id', currentPlayer.id)
            .eq('status', 'pending')
            .single();

        if (request) {
            container.innerHTML += `<div class="mt-2 p-2" style="background: rgba(245, 158, 11, 0.1); border: 1px solid var(--warning); border-radius: 8px; color: var(--warning); text-align: center; font-weight: bold;">⏳ طلب تجديد اشتراكك قيد المراجعة حالياً من المدرب</div>`;
            return;
        }
    } catch(err) {
        // No pending request found or error during single() selection. Proceed to show button.
    }

    let msg = noActiveSub ? 'لا تملك اشتراكاً فعالاً حالياً. هل ترغب بطلب تجديد؟' : `يتبقى ${diffDays} يوم/أيام على انتهاء اشتراكك. اطلب التجديد الآن لتفادي الانقطاع.`;

    container.innerHTML += `
        <div class="mt-2" style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 1rem;">
            <p style="font-size: 0.95rem; margin-bottom: 0.5rem; color: white;">${msg}</p>
            <button class="btn btn-outline small" onclick="requestRenewal()" style="width: 100%; border-color: white; color: white; background: rgba(255,255,255,0.15);">🔄 إرسال طلب تجديد لمدرب النادي</button>
        </div>
    `;
}

window.requestRenewal = async function() {
    try {
        const { error } = await supabase.from('renewal_requests').insert([{
            player_id: currentPlayer.id,
            status: 'pending'
        }]);

        if (error) throw error;
        
        await pushAdminNotification(
            'طلب تجديد اشتراك 💳',
            `قام المشترك ${currentPlayer.full_name} بطلب تجديد اشتراكه.`
        );

        showToast('تم إرسال طلب التجديد للمدرب بنجاح', 'success');
        loadSubscription(); // Reload to show the pending message
    } catch (err) {
        console.error(err);
        showToast('حدث خطأ أثناء إرسال الطلب', 'error');
    }
}

async function loadSchedule() {
    const container = document.getElementById('training-schedule');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const { data: schedules, error } = await supabase
            .from('player_schedules')
            .select(`
                *,
                workout_templates (
                    name, description,
                    workout_days (
                        id, day_order, day_name,
                        workout_exercises (
                            exercise_name, sets, reps, notes
                        )
                    )
                )
            `)
            .eq('player_id', currentPlayer.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!schedules || schedules.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align:center;">لم يتم تعيين برنامج تدريبي لك بعد.</p>';
            return;
        }

        const tmpl = schedules[0].workout_templates;
        if (!tmpl) {
            container.innerHTML = '<p class="text-muted" style="text-align:center;">لم يتم العثور على البرنامج التدريبي.</p>';
            return;
        }

        // Sort days
        const days = tmpl.workout_days.sort((a,b) => a.day_order - b.day_order);

        let html = `
            <div class="workout-header-card">
                <div style="display:flex; align-items:center; gap:1rem; margin-bottom: 0.8rem;">
                    <span style="font-size: 2.2rem;">🏆</span>
                    <h4 class="text-primary gold-text" style="font-size: 1.7rem; margin: 0; font-weight: 800;">${tmpl.name}</h4>
                </div>
                <p class="text-muted" style="margin: 0; font-size: 1.05rem; line-height: 1.7; padding-right: 3rem;">${tmpl.description || 'جدول مخصص لرفع الأداء وتحقيق نتائج استثنائية.'}</p>
            </div>
            
            <h5 style="color: white; margin-bottom: 1.5rem; font-size: 1.25rem; display: flex; align-items: center; gap: 0.6rem; font-weight: 800;">
                <span>📅</span> خطة أيام التمرين بالتفصيل
            </h5>
            <div class="schedule-days-list" style="display:flex; flex-direction:column; gap:1.2rem;">
        `;

        days.forEach(day => {
            const hasExercises = day.workout_exercises && day.workout_exercises.length > 0;
            const cardClass = hasExercises ? 'day-card' : 'day-card day-card-rest';
            const tagHtml = hasExercises 
                ? `<span class="day-tag day-tag-workout">🏋️ يوم تمرين</span>`
                : `<span class="day-tag day-tag-rest">😌 يوم راحة</span>`;

            html += `
                <div class="${cardClass}">
                    <div class="day-header" onclick="this.nextElementSibling.classList.toggle('hidden'); const arrow = this.querySelector('.toggle-icon-svg'); if (arrow) arrow.style.transform = this.nextElementSibling.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';">
                        <div class="day-header-right">
                            <span class="day-badge">${day.day_order}</span>
                            <span class="day-title">${day.day_name}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:1rem;">
                            ${tagHtml}
                            <span class="toggle-icon-svg" style="transition: transform 0.3s ease; display: inline-flex; align-items: center; justify-content: center; color: var(--text-muted);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </span>
                        </div>
                    </div>
                    <div class="day-exercises hidden">
            `;

            if(hasExercises) {
                day.workout_exercises.forEach((ex, index) => {
                    const notesHtml = ex.notes 
                        ? `<div class="exercise-notes-bubble">💡 <strong>ملاحظة الكوتش:</strong> ${ex.notes}</div>`
                        : '';
                    
                    html += `
                        <div class="exercise-row">
                            <div class="exercise-info">
                                <div class="exercise-icon">💪</div>
                                <div class="exercise-details">
                                    <span class="exercise-name-text">${ex.exercise_name}</span>
                                    ${notesHtml}
                                </div>
                            </div>
                            <div class="exercise-meta-tags">
                                <div class="exercise-stat">
                                    <span class="exercise-stat-value">${ex.sets}</span>
                                    <span class="exercise-stat-label">جولات</span>
                                </div>
                                <div style="width: 1px; height: 25px; background: rgba(255,255,255,0.08);"></div>
                                <div class="exercise-stat">
                                    <span class="exercise-stat-value">${ex.reps}</span>
                                    <span class="exercise-stat-label">تكرار</span>
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                html += `
                    <div style="text-align:center; padding: 2.5rem 0; background: rgba(16, 185, 129, 0.03); border-radius: 12px; border: 1px dashed rgba(16, 185, 129, 0.15); margin: 0.5rem;">
                        <span style="font-size: 3rem; display: block; margin-bottom: 0.8rem; filter: drop-shadow(0 4px 10px rgba(16, 185, 129, 0.2));">😌</span>
                        <h4 style="color: #34d399; margin: 0; font-size: 1.2rem; font-weight: 800;">يوم راحة واستشفاء</h4>
                        <p class="text-muted" style="margin: 0.6rem 0 0; font-size: 0.95rem; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.6;">الاستشفاء جزء من البناء العضلي، استمتع بيوم راحتك اليوم!</p>
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        });

        html += `</div>
        <p class="text-muted" style="margin-top:1rem;font-size:0.8rem">تاريخ التعيين: ${new Date(schedules[0].created_at).toLocaleDateString('ar-EG')}</p>`;
        
        container.innerHTML = html;

    } catch (err) {
        console.error('Error loading schedule:', err);
        container.innerHTML = '<p class="text-muted">تعذر تحميل الجدول نظراً لتحديث النظام.</p>';
    }
}

// --- Unread Badges ---
async function updatePlayerUnreadBadge() {
    if(!currentPlayer) return;
    try {
        const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentPlayer.id)
            .eq('is_read', false);
            
        if(!error) {
            const badge = document.getElementById('player-unread-badge');
            if(count > 0) {
                badge.textContent = count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch(err){}
}

// --- Messages Logic ---
async function loadMessages() {
    const container = document.getElementById('chat-messages');
    
    try {
        const isChatOpen = document.getElementById('chat-drawer').classList.contains('active');
        if (isChatOpen) {
            // Mark as read
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('receiver_id', currentPlayer.id)
                .eq('is_read', false);
        }
            
        updatePlayerUnreadBadge();

        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${currentPlayer.id},receiver_id.eq.${currentPlayer.id}`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        container.innerHTML = '';
        if(messages.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align:center;">لا توجد رسائل سابقة. يمكنك مراسلة الإدارة الآن.</p>';
        }

        messages.forEach(msg => {
            const isMe = msg.sender_type === 'player' && msg.sender_id === currentPlayer.id;
            const div = document.createElement('div');
            div.className = `message ${isMe ? 'sent' : 'received'}`;
            
            let contentHtml = msg.content;
            if(msg.message_type === 'image' && msg.file_url) {
                contentHtml = `<img src="${msg.file_url}" class="message-img" onclick="window.open('${msg.file_url}', '_blank')"><div style="margin-top:0.5rem">${msg.content}</div>`;
            }

            let receipt = '';
            if(isMe) {
                receipt = msg.is_read ? '<span class="read-receipt read">✔️✔️</span>' : '<span class="read-receipt">✔️</span>';
            }

            div.innerHTML = `
                ${contentHtml}
                <div class="message-time">
                    <span>${new Date(msg.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                    ${receipt}
                </div>
            `;
            container.appendChild(div);
        });

        container.scrollTop = container.scrollHeight;
    } catch (err) {
        console.error(err);
    }
}

async function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input-text');
    const content = input.value.trim();
    
    if (!content) return;

    try {
        const { data: admin, error: adminErr } = await supabase.from('admins').select('id').limit(1).single();
        if(adminErr) throw adminErr;
        
        let msgType = 'text';

        const { error } = await supabase.from('messages').insert([{
            sender_type: 'player',
            sender_id: currentPlayer.id,
            receiver_id: admin.id,
            content: content,
            message_type: msgType,
            is_read: false
        }]);

        if (error) throw error;
        input.value = '';
        loadMessages(); 

    } catch (err) {
        console.error(err);
        showToast('تعذر إرسال الرسالة', 'error');
    }
}

window.toggleChatDrawer = function() {
    const drawer = document.getElementById('chat-drawer');
    const overlay = document.getElementById('chat-overlay');
    const fab = document.getElementById('chat-fab');
    const isOpening = !drawer.classList.contains('active');
    
    if(isOpening) {
        drawer.classList.add('active');
        overlay.classList.add('active');
        if (fab) fab.classList.remove('visible');
        loadMessages(); // Mark as read immediately when opened
    } else {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
        if (fab) fab.classList.add('visible');
    }
}

let messageSubscription = null;
function setupMessagesRealtime() {
    if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
    }
    
    messageSubscription = supabase.channel('custom-all-channel')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
            if (payload.new.receiver_id === currentPlayer.id) {
                // Play Sound
                playMessageSound();
                
                // Show floating toast
                showToast('💬 رسالة جديدة من المساعد', 'info');
                
                loadMessages();
            } else if (payload.new.sender_id === currentPlayer.id) {
                loadMessages();
            }
        }
    )
    .subscribe();
}

// --- Notify Admin Helper ---
async function pushAdminNotification(title, content) {
    try {
        const { data: admins } = await supabase.from('admins').select('id');
        if (admins && admins.length > 0) {
            const payloads = admins.map(a => ({ user_id: a.id, title, content, is_read: false }));
            await supabase.from('notifications').insert(payloads);
        }
    } catch(err) { console.error('Silent admin notif error:', err); }
}

// --- Password Strength Logic ---
window.checkPasswordStrength = function(val) {
    const container = document.getElementById('password-strength-container');
    const fill = document.getElementById('strength-fill');
    const text = document.getElementById('strength-text');
    
    if(!val) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');

    let strength = 0;
    
    // Medium criteria: min 6 chars
    if(val.length >= 6) strength += 1;
    
    // Strong criteria: min 8 chars + letters + numbers
    const hasLetters = /[a-zA-Z\u0600-\u06FF]/.test(val);
    const hasNumbers = /[0-9]/.test(val);
    if(val.length >= 8 && hasLetters && hasNumbers) strength += 1;

    // Super Strong criteria: min 8 chars + letters + numbers + special chars
    const hasSpecials = /[^a-zA-Z0-9\u0600-\u06FF]/.test(val);
    if(val.length >= 8 && hasLetters && hasNumbers && hasSpecials) strength += 1;

    if (strength === 0) {
        fill.style.width = '25%';
        fill.style.background = 'var(--danger)';
        text.textContent = 'كلمة مرور ضعيفة';
        text.style.color = 'var(--danger)';
    } else if (strength === 1) {
        fill.style.width = '50%';
        fill.style.background = 'var(--warning)';
        text.textContent = 'كلمة مرور متوسطة';
        text.style.color = 'var(--warning)';
    } else if (strength === 2) {
        fill.style.width = '75%';
        fill.style.background = 'var(--success)';
        text.textContent = 'كلمة مرور قوية';
        text.style.color = 'var(--success)';
    } else if (strength === 3) {
        fill.style.width = '100%';
        fill.style.background = '#3b82f6'; // Super Strong Color (blue)
        text.textContent = 'كلمة مرور قوية جداً!';
        text.style.color = '#3b82f6';
    }
}

// Sound synthesis using Web Audio API for a premium feel
function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const playTone = (frequency, startTime, duration) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };
        const now = audioCtx.currentTime;
        playTone(880, now, 0.15); // A5 note
        playTone(1046.5, now + 0.1, 0.3); // C6 note
    } catch (e) {
        console.warn('Audio playback failed or blocked:', e);
    }
}

function playMessageSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const playTone = (frequency, startTime, duration) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };
        const now = audioCtx.currentTime;
        playTone(523.25, now, 0.12); // C5 note
        playTone(659.25, now + 0.08, 0.2); // E5 note
    } catch (e) {
        console.warn('Audio playback failed or blocked:', e);
    }
}

function getNotificationDetails(title, content) {
    const t = (title || '').toLowerCase();
    const c = (content || '').toLowerCase();
    
    if (t.includes('تجميد') || c.includes('تجميد')) {
        return { icon: '❄️', actionText: 'انتقال للتفاصيل ➔' };
    } else if (t.includes('تجديد') || c.includes('تجديد')) {
        return { icon: '🔄', actionText: 'انتقال للتفاصيل ➔' };
    } else if (t.includes('برنامج') || t.includes('جدول') || c.includes('برنامج') || c.includes('جدول')) {
        return { icon: '🏋️', actionText: 'انتقال للبرنامج التدريبي ➔' };
    } else if (t.includes('تفعيل') || t.includes('اشتراك') || c.includes('تفعيل') || c.includes('اشتراك')) {
        return { icon: '💳', actionText: 'انتقال للاشتراك ➔' };
    }
    return { icon: '🔔', actionText: 'عرض التفاصيل ➔' };
}

window.handleNotificationClick = async function(id, title, content) {
    try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        loadGlobalNotifications();
    } catch (err) {
        console.error('Error marking notification as read:', err);
    }

    const lowerTitle = (title || '').toLowerCase();
    const lowerContent = (content || '').toLowerCase();

    let targetTab = 'player-home';
    if (lowerTitle.includes('برنامج') || lowerTitle.includes('جدول') || lowerContent.includes('برنامج') || lowerContent.includes('جدول')) {
        targetTab = 'player-schedule';
    } else if (lowerTitle.includes('تطور') || lowerTitle.includes('وزن') || lowerContent.includes('وزن') || lowerContent.includes('قياس')) {
        targetTab = 'player-progress';
    }

    const btn = document.querySelector(`.player-nav .nav-btn[data-target="${targetTab}"]`);
    if (btn) {
        btn.click();
    }

    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) dropdown.classList.remove('show');
};

// --- Notifications System ---
let playerNotifSubscription = null;

if (!window.toggleNotifications) {
    window.toggleNotifications = function() {
        const dropdown = document.getElementById('notifications-dropdown');
        dropdown.classList.toggle('show');
        if (dropdown.classList.contains('show')) {
            loadGlobalNotifications();
        }
    };
}

if (!window.markAllNotificationsRead) {
    window.markAllNotificationsRead = async function() {
        const uId = (typeof currentPlayer !== 'undefined' && currentPlayer) ? currentPlayer.id : null;
        if (!uId) return;
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', uId)
                .eq('is_read', false);
            loadGlobalNotifications();
        } catch (err) {}
    };
}

if (!window.clearAllNotifications) {
    window.clearAllNotifications = async function() {
        const uId = (typeof currentPlayer !== 'undefined' && currentPlayer) ? currentPlayer.id : null;
        if (!uId) return;
        try {
            await supabase
                .from('notifications')
                .delete()
                .eq('user_id', uId);
            
            loadGlobalNotifications();
        } catch (err) {}
    };
}

async function loadGlobalNotifications() {
    if (!currentPlayer) return;
    const badge = document.getElementById('global-unread-badge');
    const list = document.getElementById('notifications-list');
    
    try {
        const { data: notifs, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentPlayer.id)
            .order('created_at', { ascending: false })
            .limit(20);
            
        if (error) throw error;
        
        let unreadCount = notifs.filter(n => !n.is_read).length;
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
        
        list.innerHTML = '';
        if (notifs.length === 0) {
            list.innerHTML = '<div style="padding:1.5rem; text-align:center; color:var(--text-muted);">لا توجد إشعارات تلقائية حالياً</div>';
        } else {
            notifs.forEach(n => {
                const details = getNotificationDetails(n.title, n.content);
                const item = document.createElement('div');
                item.className = `notification-item ${n.is_read ? '' : 'unread'}`;
                item.style.cursor = 'pointer';
                item.style.transition = 'background 0.2s';
                item.style.padding = '0.8rem 1rem';
                item.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
                item.onclick = () => window.handleNotificationClick(n.id, n.title, n.content);
                
                item.innerHTML = `
                    <div style="display: flex; gap: 10px; align-items: flex-start;">
                        <span style="font-size: 1.3rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">${details.icon}</span>
                        <div style="flex: 1;">
                            <strong style="display:block; font-size:0.95rem; color:var(--text-main);">${n.title}</strong>
                            <div style="font-size:0.85rem; color:rgba(255,255,255,0.7); margin-top:3px; line-height: 1.4;">${n.content}</div>
                            <div style="font-size: 0.78rem; color: var(--primary); margin-top: 4px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                                ${details.actionText}
                            </div>
                            <div class="notification-time" style="margin-top: 3px; font-size: 0.75rem; color: var(--text-muted);">${new Date(n.created_at).toLocaleString('ar-EG', {month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit'})}</div>
                        </div>
                    </div>
                `;
                list.appendChild(item);
            });
        }
    } catch (err) {
        console.error('Error loading notifications:', err);
    }
}

function setupNotificationsRealtime() {
    if (playerNotifSubscription) {
        supabase.removeChannel(playerNotifSubscription);
    }
    playerNotifSubscription = supabase.channel('player-notifs')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
            if (currentPlayer && payload.new.user_id === currentPlayer.id) {
                playNotificationSound();
                loadGlobalNotifications();
                showToast(`🔔 ${payload.new.title}`, 'info', () => {
                    window.handleNotificationClick(payload.new.id, payload.new.title, payload.new.content);
                });
            }
        }
    ).subscribe();
}

// --- Phase 3: Body Progress Tracker ---
let bodyProgressChartInstance = null;

// A helper function to parse progress notes that might contain JSON height info
function parseProgressNotes(notesStr) {
    if (!notesStr) return { height: null, notes: '' };
    try {
        if (notesStr.trim().startsWith('{')) {
            const data = JSON.parse(notesStr);
            return {
                height: data.height || null,
                notes: data.notes || ''
            };
        }
    } catch(e) {}
    // If it's a legacy plain string
    return { height: null, notes: notesStr };
}

async function handleProgressSubmit(e) {
    e.preventDefault();
    const weight = document.getElementById('current-weight').value;
    const height = document.getElementById('current-height').value;
    const rawNotes = document.getElementById('progress-notes').value;

    if (!currentPlayer) return;

    const wVal = parseFloat(weight);
    const hVal = parseFloat(height);

    if (isNaN(wVal) || wVal < 30 || wVal > 250) {
        showToast('الرجاء إدخال وزن منطقي بين 30 و 250 كجم.', 'error');
        return;
    }
    if (isNaN(hVal) || hVal < 100 || hVal > 230) {
        showToast('الرجاء إدخال طول منطقي بين 100 و 230 سم.', 'error');
        return;
    }

    try {
        // Fetch the last weight entry to check cooldown and calculate weight loss points
        const { data: lastProgress } = await supabase
            .from('player_progress')
            .select('weight, created_at')
            .eq('player_id', currentPlayer.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastProgress && lastProgress.created_at) {
            const lastTime = new Date(lastProgress.created_at).getTime();
            const nowTime = Date.now();
            const differenceHours = (nowTime - lastTime) / (1000 * 60 * 60);
            if (differenceHours < 48) {
                const hoursRemaining = (48 - differenceHours).toFixed(1);
                showToast(`⚠️ يمكنك تسجيل قياساتك مرة واحدة كل يومين لمنع استغلال النقاط. يرجى الانتظار ${hoursRemaining} ساعة أخرى.`, 'error');
                return;
            }
        }

        const { error } = await supabase
            .from('player_progress')
            .insert({
                player_id: currentPlayer.id,
                weight: wVal,
                height: hVal,
                notes: rawNotes.trim()
            });

        if (error) throw error;

        // Calculate and award points if they lost weight
        let pointsAwarded = 0;
        let lostKg = 0;
        if (lastProgress && lastProgress.weight > wVal) {
            lostKg = lastProgress.weight - wVal;
            
            // Fetch gamification config
            const { data: config } = await supabase.from('gamification_config').select('*');
            const configMap = {};
            if (config) config.forEach(c => configMap[c.key] = c.value);

            const pointsPerKg = parseInt(configMap['weight_loss_points_per_kg']) || 20;
            pointsAwarded = Math.round(lostKg * pointsPerKg);

            if (pointsAwarded > 0) {
                await supabase.from('points_transactions').insert([{
                    player_id: currentPlayer.id,
                    amount: pointsAwarded,
                    reason: `خسارة وزن بمقدار ${lostKg.toFixed(1)} كجم`
                }]);
            }
        }
        
        let adminNotifContent = `قام اللاعب ${currentPlayer.full_name} بتسجيل وزنه الجديد: ${weight} كجم.`;
        if (pointsAwarded > 0) {
            adminNotifContent += ` وحصل على ${pointsAwarded} نقطة لمثابرته وخسارته للوزن!`;
        }

        // Send notification to Admin
        const { data: adminUser } = await supabase.from('admins').select('id').limit(1).single();
        if (adminUser) {
            await supabase.from('notifications').insert([{
                user_id: adminUser.id,
                title: 'تحديث للوزن والقياسات ⚖️',
                content: adminNotifContent,
                is_read: false
            }]);
        }

        // Send live updates if possible
        await supabase.from('notifications').insert([{
            user_id: currentPlayer.id,
            title: 'تحديث للوزن والقياسات ⚖️',
            content: adminNotifContent
        }]);
        
        if (pointsAwarded > 0) {
            showToast(`🏆 أحسنت! خسرت وزناً وحصلت على ${pointsAwarded} نقطة!`, 'success');
        } else {
            showToast('تم تسجيل القياس بنجاح', 'success');
        }
        document.getElementById('progress-form').reset();
        loadProgressChart();
    } catch(err) {
        showToast('حدث خطأ أثناء حفظ القياس', 'error');
        console.error(err);
    }
}

function updatePlayerAvatar(weight, height) {
    const renderArea = document.getElementById('avatar-render-area');
    const infoBox = document.getElementById('bmi-info-box');
    if (!renderArea || !infoBox) return;

    const hM = height / 100;
    const bmi = weight / (hM * hM);

    // Scale factors: Height 170cm base, weight/BMI 22 base
    const heightScale = Math.min(1.3, Math.max(0.7, height / 170));
    const widthScale = Math.min(1.5, Math.max(0.6, bmi / 22));

    let bodyColor = '#10b981'; // green / normal
    let outlineColor = '#059669';
    let statusText = 'وزن مثالي 🌟';
    let statusClass = 'approved';
    let statusColor = '#10b981';
    let bmiAdvice = 'استمر في ممارسة التمارين والتغذية المتوازنة للحفاظ على هذا الوزن المثالي!';

    if (bmi < 18.5) {
        bodyColor = '#eab308'; // yellow
        outlineColor = '#ca8a04';
        statusText = 'نقص في الوزن ⚠️';
        statusClass = 'pending';
        statusColor = '#eab308';
        bmiAdvice = 'ينصح بزيادة السعرات الحرارية المتناولة والتركيز على تمارين المقاومة لبناء الكتلة العضلية.';
    } else if (bmi >= 25 && bmi < 30) {
        bodyColor = '#f97316'; // orange
        outlineColor = '#ea580c';
        statusText = 'زيادة في الوزن ⚖️';
        statusClass = 'pending';
        statusColor = '#f97316';
        bmiAdvice = 'ينصح بتقليل السعرات قليلاً وزيادة النشاط البدني وتمارين الكارديو لحرق الدهون.';
    } else if (bmi >= 30) {
        bodyColor = '#ef4444'; // red
        outlineColor = '#dc2626';
        statusText = 'سمنة مفرطة 🚨';
        statusClass = 'rejected';
        statusColor = '#ef4444';
        bmiAdvice = 'من الضروري اتباع نظام غذائي محسوب السعرات والالتزام بجدول التمارين لحماية صحتك.';
    }

    // Coordinates
    const centerX = 100;
    const headY = 40 - (heightScale - 1) * 20;
    const headR = 15;

    const neckY = headY + headR - 2;
    const neckH = 8;
    const neckW = 8;

    const torsoY = neckY + neckH;
    const torsoH = 65 * heightScale;
    const torsoW = 34 * widthScale;
    const torsoX = centerX - torsoW / 2;

    const armH = 50 * heightScale;
    const armW = 8 * widthScale;

    const legY = torsoY + torsoH - 5;
    const legH = 75 * heightScale;
    const legW = 10 * widthScale;

    // Barbell details if fit, Kettlebell if overweight/obese
    let propHtml = '';
    if (bmi >= 18.5 && bmi < 25) {
        // Holding a gold barbell
        propHtml = `
            <!-- Golden Barbell -->
            <line x1="20" y1="${torsoY + 20}" x2="180" y2="${torsoY + 20}" stroke="#eab308" stroke-width="4" stroke-linecap="round" />
            <circle cx="20" cy="${torsoY + 20}" r="8" fill="#eab308" />
            <circle cx="15" cy="${torsoY + 20}" r="12" fill="#d4af37" />
            <circle cx="180" cy="${torsoY + 20}" r="8" fill="#eab308" />
            <circle cx="185" cy="${torsoY + 20}" r="12" fill="#d4af37" />
            <!-- Barbell glow -->
            <line x1="20" y1="${torsoY + 20}" x2="180" y2="${torsoY + 20}" stroke="#eab308" stroke-width="8" stroke-opacity="0.15" stroke-linecap="round" />
        `;
    } else if (bmi >= 25) {
        // Kettlebell on the floor
        propHtml = `
            <!-- Kettlebell -->
            <circle cx="45" cy="225" r="14" fill="#64748b" />
            <circle cx="45" cy="225" r="14" fill="none" stroke="#475569" stroke-width="2" />
            <path d="M 37 215 C 37 205, 53 205, 53 215" fill="none" stroke="#475569" stroke-width="4" stroke-linecap="round" />
            <text x="45" y="229" font-size="8" fill="white" font-weight="bold" text-anchor="middle">24KG</text>
        `;
    }

    const svg = `
        <svg viewBox="0 0 200 260" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));">
            <defs>
                <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${bodyColor}" />
                    <stop offset="100%" stop-color="${outlineColor}" />
                </linearGradient>
                <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="rgba(255,255,255,0.08)" />
                    <stop offset="100%" stop-color="rgba(0,0,0,0.4)" />
                </linearGradient>
            </defs>
            
            <!-- Shadow under player -->
            <ellipse cx="100" cy="242" rx="${45 * widthScale}" ry="8" fill="rgba(0,0,0,0.4)" />
            
            <!-- Floor Line -->
            <line x1="20" y1="242" x2="180" y2="242" stroke="rgba(255,255,255,0.1)" stroke-width="2" stroke-linecap="round" />
            
            ${propHtml}
            
            <!-- Left Arm -->
            <rect x="${torsoX - armW + 2}" y="${torsoY + 5}" width="${armW}" height="${armH}" rx="4" fill="url(#bodyGrad)" style="transition: all 0.5s ease;" />
            
            <!-- Right Arm -->
            <rect x="${torsoX + torsoW - 2}" y="${torsoY + 5}" width="${armW}" height="${armH}" rx="4" fill="url(#bodyGrad)" style="transition: all 0.5s ease;" />
            
            <!-- Left Leg -->
            <rect x="${centerX - legW - 2}" y="${legY}" width="${legW}" height="${legH}" rx="4" fill="url(#bodyGrad)" style="transition: all 0.5s ease;" />
            
            <!-- Right Leg -->
            <rect x="${centerX + 2}" y="${legY}" width="${legW}" height="${legH}" rx="4" fill="url(#bodyGrad)" style="transition: all 0.5s ease;" />
            
            <!-- Torso (Chest/Abs) -->
            <rect x="${torsoX}" y="${torsoY}" width="${torsoW}" height="${torsoH}" rx="${6 * widthScale}" fill="url(#bodyGrad)" style="transition: all 0.5s ease;" />
            
            <!-- Neck -->
            <rect x="${centerX - neckW/2}" y="${neckY}" width="${neckW}" height="${neckH}" rx="2" fill="url(#bodyGrad)" style="transition: all 0.5s ease;" />
            
            <!-- Head -->
            <circle cx="${centerX}" cy="${headY}" r="${headR}" fill="url(#bodyGrad)" style="transition: all 0.5s ease;" />
            
            <!-- Face details (smiling eyes & mouth) -->
            <path d="M ${centerX - 5} ${headY - 2} Q ${centerX - 5} ${headY - 4} ${centerX - 3} ${headY - 3}" stroke="rgba(0,0,0,0.5)" stroke-width="1.5" fill="none" stroke-linecap="round" />
            <path d="M ${centerX + 5} ${headY - 2} Q ${centerX + 5} ${headY - 4} ${centerX + 3} ${headY - 3}" stroke="rgba(0,0,0,0.5)" stroke-width="1.5" fill="none" stroke-linecap="round" />
            <path d="M ${centerX - 4} ${headY + 4} Q ${centerX} ${headY + 8} ${centerX + 4} ${headY + 4}" stroke="rgba(0,0,0,0.5)" stroke-width="1.5" fill="none" stroke-linecap="round" />

            <!-- Muscles details (Chest lines) if chest is wide enough -->
            ${torsoW > 25 ? `
                <line x1="${centerX - 8}" y1="${torsoY + 15}" x2="${centerX + 8}" y2="${torsoY + 15}" stroke="rgba(255,255,255,0.25)" stroke-width="2" stroke-linecap="round" style="transition: all 0.5s ease;" />
                <line x1="${centerX}" y1="${torsoY + 15}" x2="${centerX}" y2="${torsoY + 30}" stroke="rgba(255,255,255,0.25)" stroke-width="2" stroke-linecap="round" style="transition: all 0.5s ease;" />
            ` : ''}
        </svg>
    `;

    renderArea.innerHTML = svg;

    infoBox.innerHTML = `
        <div style="font-size: 1.1rem; font-weight: 800; color: white;">مؤشر كتلة الجسم (BMI): <span style="color: ${statusColor}; font-size: 1.4rem;">${bmi.toFixed(1)}</span></div>
        <span class="badge ${statusClass}" style="font-size: 1rem; padding: 0.4rem 1.2rem; border-radius: 20px; font-weight: bold; background-color: ${statusColor}1A; color: ${statusColor}; border: 1px solid ${statusColor}40;">${statusText}</span>
        <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-top: 5px; max-width: 250px; text-align: center;">${bmiAdvice}</div>
    `;
}

async function loadProgressChart() {
    if (!currentPlayer) return;

    try {
        const { data: progress, error } = await supabase
            .from('player_progress')
            .select('*')
            .eq('player_id', currentPlayer.id)
            .order('created_at', { ascending: true }); // Oldest to newest for plotting

        if (error) throw error;

        let currentHeight = 170;
        let latestWeight = 70;
        let latestNotes = '';

        if (progress && progress.length > 0) {
            const latestEntry = progress[progress.length - 1];
            latestWeight = latestEntry.weight;

            // Find latest height
            for (let i = progress.length - 1; i >= 0; i--) {
                let h = progress[i].height ? parseFloat(progress[i].height) : null;
                const parsed = parseProgressNotes(progress[i].notes);
                if (h || parsed.height) {
                    currentHeight = h || parseFloat(parsed.height);
                    latestNotes = parsed.notes;
                    break;
                }
            }
            if (!latestNotes && latestEntry.notes && !latestEntry.notes.trim().startsWith('{')) {
                latestNotes = latestEntry.notes;
            }
        }

        // Pre-populate fields
        const heightInput = document.getElementById('current-height');
        if (heightInput) heightInput.value = currentHeight;

        const weightInput = document.getElementById('current-weight');
        if (weightInput && progress.length > 0) {
            weightInput.placeholder = `السابق: ${latestWeight} كجم`;
        }

        // Draw Avatar
        updatePlayerAvatar(latestWeight, currentHeight);

        const labels = progress.map(p => new Date(p.created_at).toLocaleDateString('ar-EG', {month: 'short', day: 'numeric'}));
        const dataPoints = progress.map(p => p.weight);

        const ctx = document.getElementById('body-progress-chart').getContext('2d');
        
        if (bodyProgressChartInstance) {
            bodyProgressChartInstance.destroy();
        }

        bodyProgressChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'الوزن (كجم)',
                    data: dataPoints,
                    borderColor: '#ff6a00',
                    backgroundColor: 'rgba(255, 106, 0, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#ff6a00',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: 'white' }
                    }
                }
            }
        });

    } catch (err) {
        console.error('Error loading progress:', err);
    }
}

// --- Phase 4: QR Code Check-in ---
function loadQRCode() {
    if (!currentPlayer) return;
    
    document.getElementById('qr-player-name').textContent = currentPlayer.full_name;
    document.getElementById('qr-player-cid').textContent = `ID: ${currentPlayer.club_id || 'غير متوفر'}`;

    const qrContainer = document.getElementById('qr-code-img');
    qrContainer.innerHTML = ''; // Clear previous

    new QRCode(qrContainer, {
        text: currentPlayer.id,
        width: 250,
        height: 250,
        colorDark : "#0a0a0a",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

// --- Phase 5: Gamification & Freezing ---
async function handleFreezeSubmit(e) {
    e.preventDefault();
    if (!currentPlayer) return;

    const days = parseInt(document.getElementById('freeze-days').value);
    const reason = document.getElementById('freeze-reason').value;

    try {
        // First get active subscription ID
        const { data: subs, error: subErr } = await supabase
            .from('player_subscriptions')
            .select('id')
            .eq('player_id', currentPlayer.id)
            .eq('is_active', true)
            .limit(1);

        if (subErr) throw subErr;
        if (!subs || subs.length === 0) {
            showToast('ليس لديك اشتراك فعال لتجميده!', 'error');
            return;
        }

        const subId = subs[0].id;

        const { error } = await supabase
            .from('freeze_requests')
            .insert({
                player_id: currentPlayer.id,
                subscription_id: subId,
                days: days,
                reason: reason
            });

        if (error) throw error;
        
        await pushAdminNotification(
            'طلب تجميد اشتراك ❄️',
            `قام اللاعب ${currentPlayer.full_name} بطلب تجميد اشتراكه لمدة ${days} يوم.`
        );
        
        showToast('تم إرسال طلب التجميد للإدارة بنجاح', 'success');
        document.getElementById('freeze-form').reset();

    } catch (err) {
        console.error(err);
        showToast('حدث خطأ أثناء إرسال الطلب', 'error');
    }
}

async function loadLeaderboard() {
    try {
        const { data: players, error } = await supabase
            .from('players')
            .select('full_name, points')
            .order('points', { ascending: false })
            .limit(5);

        if (error) throw error;

        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '';

        if (!players || players.length === 0) {
            list.innerHTML = '<div class="text-center text-muted">لا يوجد أبطال بعد!</div>';
            return;
        }

        const medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
        players.forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = 'list-group-item';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '1rem 1.2rem';
            row.style.borderRadius = '12px';
            row.style.marginBottom = '0.6rem';
            row.style.transition = 'all 0.25s ease';
            row.style.cursor = 'default';

            if (idx === 0) {
                row.style.border = '1px solid rgba(212, 175, 55, 0.35)';
                row.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(18, 18, 22, 0.6) 100%)';
                row.style.boxShadow = '0 4px 15px rgba(212, 175, 55, 0.08)';
            } else if (idx === 1) {
                row.style.border = '1px solid rgba(168, 168, 168, 0.25)';
                row.style.background = 'linear-gradient(135deg, rgba(168, 168, 168, 0.08) 0%, rgba(18, 18, 22, 0.6) 100%)';
            } else if (idx === 2) {
                row.style.border = '1px solid rgba(205, 127, 50, 0.25)';
                row.style.background = 'linear-gradient(135deg, rgba(205, 127, 50, 0.08) 0%, rgba(18, 18, 22, 0.6) 100%)';
            } else {
                row.style.border = '1px solid rgba(255, 255, 255, 0.05)';
                row.style.background = 'rgba(255, 255, 255, 0.02)';
            }

            row.onmouseenter = () => {
                row.style.transform = 'translateY(-2px)';
                if (idx === 0) row.style.borderColor = 'rgba(212, 175, 55, 0.6)';
                else row.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            };
            row.onmouseleave = () => {
                row.style.transform = 'translateY(0)';
                if (idx === 0) row.style.borderColor = 'rgba(212, 175, 55, 0.35)';
                else if (idx === 1) row.style.borderColor = 'rgba(168, 168, 168, 0.25)';
                else if (idx === 2) row.style.borderColor = 'rgba(205, 127, 50, 0.25)';
                else row.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            };

            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.4rem; margin-left:8px;">${medals[idx] || '🎖️'}</span> 
                    <strong style="color: #ffffff; font-size: 1.05rem;">${p.full_name}</strong>
                </div>
                <div class="badge" style="background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%); color: #0a0a0a; font-weight: 800; border: none; box-shadow: 0 4px 10px rgba(212, 175, 55, 0.2);">${p.points} نقطة</div>
            `;
            list.appendChild(row);
        });
    } catch (err) {
        console.error('Error loading leaderboard:', err);
    }
}

// --- Load Personal Profile ---
window.loadPersonalProfile = async function loadPersonalProfile() {
    if (!currentPlayer) return;

    // Fetch fresh player data to show real-time points
    let points = currentPlayer.points || 0;
    try {
        const { data: freshPlayer } = await supabase
            .from('players')
            .select('points')
            .eq('id', currentPlayer.id)
            .single();
        if (freshPlayer) {
            currentPlayer.points = freshPlayer.points;
            points = freshPlayer.points;
            localStorage.setItem('gym_player_points', freshPlayer.points || 0);
        }
    } catch(err) {
        console.error('Error refreshing points:', err);
    }

    // Fetch latest height/weight/BMI
    let currentHeight = '---';
    let currentWeight = '---';
    let currentBmi = '---';
    let bmiBadgeHtml = '';

    try {
        const { data: progress } = await supabase
            .from('player_progress')
            .select('*')
            .eq('player_id', currentPlayer.id)
            .order('created_at', { ascending: false })
            .limit(20); // Get recent entries to find height

        if (progress && progress.length > 0) {
            const latest = progress[0];
            currentWeight = `${latest.weight} كجم`;
            
            // Find latest height
            let parsedHeight = null;
            for (let i = 0; i < progress.length; i++) {
                if (progress[i].height) {
                    parsedHeight = parseFloat(progress[i].height);
                    break;
                }
                const parsed = parseProgressNotes(progress[i].notes);
                if (parsed.height) {
                    parsedHeight = parseFloat(parsed.height);
                    break;
                }
            }
            if (parsedHeight) {
                currentHeight = `${parsedHeight} سم`;
                const bmi = latest.weight / ((parsedHeight/100) * (parsedHeight/100));
                currentBmi = bmi.toFixed(1);
                
                let bmiColor = '#10b981';
                let bmiText = 'مثالي';
                if (bmi < 18.5) { bmiColor = '#eab308'; bmiText = 'نقص وزن'; }
                else if (bmi >= 25 && bmi < 30) { bmiColor = '#f97316'; bmiText = 'زيادة وزن'; }
                else if (bmi >= 30) { bmiColor = '#ef4444'; bmiText = 'سمنة'; }
                
                bmiBadgeHtml = `<span style="font-size:0.75rem; background:${bmiColor}1A; color:${bmiColor}; border:1px solid ${bmiColor}33; padding:2px 8px; border-radius:10px; margin-right:5px; font-weight:bold;">${bmiText}</span>`;
            }
        }
    } catch(err) {
        console.error('Error fetching progress for profile:', err);
    }

    // Populate top banner summary details
    const bannerName = document.getElementById('profile-banner-name');
    const bannerClubId = document.getElementById('profile-banner-club-id');
    const bannerPoints = document.getElementById('profile-banner-points');
    const bannerBmi = document.getElementById('profile-banner-bmi');

    if (bannerName) bannerName.textContent = currentPlayer.full_name;
    if (bannerClubId) bannerClubId.textContent = `رقم المشترك: ${currentPlayer.club_id || '---'}`;
    if (bannerPoints) bannerPoints.textContent = `${points}`;
    if (bannerBmi) bannerBmi.innerHTML = `${currentBmi} ${bmiBadgeHtml}`;

    const content = document.getElementById('personal-profile-content');
    if (content) {
        content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem;">
                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; transition: transform 0.2s;">
                    <div style="background: rgba(249, 115, 22, 0.1); color: var(--primary); width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        <i class="fa-solid fa-id-badge"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.2rem;">الاسم الكامل</div>
                        <strong style="color: white; font-size: 1.1rem;">${currentPlayer.full_name}</strong>
                    </div>
                </div>
                
                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; transition: transform 0.2s;">
                    <div style="background: rgba(14, 165, 233, 0.1); color: #0ea5e9; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        <i class="fa-solid fa-phone"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.2rem;">رقم الهاتف</div>
                        <strong style="color: white; font-size: 1.1rem;" dir="ltr">${currentPlayer.phone_number}</strong>
                    </div>
                </div>

                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; transition: transform 0.2s;">
                    <div style="background: rgba(34, 197, 94, 0.1); color: #22c55e; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        <i class="fa-solid fa-hashtag"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.2rem;">رقم المُشترك</div>
                        <strong style="color: white; font-size: 1.1rem;">${currentPlayer.club_id || '---'}</strong>
                    </div>
                </div>

                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; transition: transform 0.2s;">
                    <div style="background: rgba(168, 85, 247, 0.1); color: #a855f7; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.2rem;">الفئة</div>
                        <strong style="color: white; font-size: 1.1rem;">${currentPlayer.is_military ? 'عسكري' : 'مدني'}</strong>
                    </div>
                </div>

                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; transition: transform 0.2s;">
                    <div style="background: rgba(234, 179, 8, 0.1); color: #eab308; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        <i class="fa-solid fa-trophy"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.2rem;">رصيد النقاط 🏆</div>
                        <strong style="color: #eab308; font-size: 1.15rem;">${points} نقطة</strong>
                    </div>
                </div>

                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; transition: transform 0.2s;">
                    <div style="background: rgba(6, 182, 212, 0.1); color: #06b6d4; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        <i class="fa-solid fa-ruler-vertical"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.2rem;">الطول الحالي</div>
                        <strong style="color: white; font-size: 1.1rem;">${currentHeight}</strong>
                    </div>
                </div>

                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; transition: transform 0.2s;">
                    <div style="background: rgba(16, 185, 129, 0.1); color: #10b981; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        <i class="fa-solid fa-gauge-simple-high"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.2rem;">كتلة الجسم (BMI)</div>
                        <strong style="color: white; font-size: 1.1rem;">${bmiBadgeHtml} ${currentBmi}</strong>
                    </div>
                </div>

                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; transition: transform 0.2s;">
                    <div style="background: rgba(236, 72, 153, 0.1); color: #ec4899; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        <i class="fa-solid fa-location-dot"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.2rem;">العنوان</div>
                        <strong style="color: white; font-size: 1.1rem;">${currentPlayer.address || 'غير محدد'}</strong>
                    </div>
                </div>

                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; transition: transform 0.2s;">
                    <div style="background: rgba(244, 63, 94, 0.1); color: #f43f5e; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        <i class="fa-solid fa-venus-mars"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.2rem;">الجنس</div>
                        <strong style="color: white; font-size: 1.1rem;">${currentPlayer.gender || 'ذكر'}</strong>
                    </div>
                </div>

                <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; transition: transform 0.2s;">
                    <div style="background: rgba(16, 185, 129, 0.1); color: #10b981; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        <i class="fa-solid fa-envelope"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.2rem;">البريد الإلكتروني</div>
                        <strong style="color: white; font-size: 1.1rem;">${currentPlayer.email || 'غير محدد'}</strong>
                    </div>
                </div>
            </div>
        `;
    }

    const txContainer = document.getElementById('personal-points-transactions');
    if (txContainer) {
        txContainer.innerHTML = '<div class="spinner"></div>';
        try {
            const { data: txs, error } = await supabase
                .from('points_transactions')
                .select('*')
                .eq('player_id', currentPlayer.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (txs && txs.length > 0) {
                const txRows = txs.map(t => {
                    const date = new Date(t.created_at).toLocaleDateString('ar-EG');
                    const color = t.amount >= 0 ? 'var(--success)' : 'var(--danger)';
                    const sign = t.amount >= 0 ? '+' : '';
                    return `<tr>
                        <td style="font-weight:bold; color:white;">${t.reason}</td>
                        <td>${date}</td>
                        <td style="font-weight:bold; color:${color};">${sign}${t.amount} 🏆</td>
                    </tr>`;
                }).join('');

                txContainer.innerHTML = `
                    <div class="table-container card p-0" style="max-height: 250px; box-shadow:none;">
                        <div class="table-container" style="border:none; border-radius:12px;">
                            <table class="data-table" style="font-size:0.9rem;">
                                <thead>
                                    <tr><th>السبب</th><th>التاريخ</th><th>القيمة</th></tr>
                                </thead>
                                <tbody>${txRows}</tbody>
                            </table>
                        </div>
                    </div>
                `;
            } else {
                txContainer.innerHTML = '<p class="text-muted text-center" style="padding: 1rem 0;">لم يتم تسجيل أي حركات نقاط بعد.</p>';
            }
        } catch(err) {
            console.error(err);
            txContainer.innerHTML = '<p class="text-danger text-center">حدث خطأ أثناء تحميل سجل النقاط.</p>';
        }
    }

    const weightContainer = document.getElementById('personal-latest-weight');
    if (weightContainer) {
        weightContainer.innerHTML = '<div class="spinner"></div>';
        try {
            const { data, error } = await supabase
                .from('player_progress')
                .select('*')
                .eq('player_id', currentPlayer.id)
                .order('created_at', { ascending: false })
                .limit(20);
                
            if (error) throw error;
            
            if (data && data.length > 0) {
                const latest = data[0];
                const dateStr = new Date(latest.created_at).toLocaleDateString('ar-EG');
                
                // Fetch latest height
                let parsedHeight = null;
                for (let i = 0; i < data.length; i++) {
                    if (data[i].height) {
                        parsedHeight = parseFloat(data[i].height);
                        break;
                    }
                    const parsed = parseProgressNotes(data[i].notes);
                    if (parsed.height) {
                        parsedHeight = parseFloat(parsed.height);
                        break;
                    }
                }

                let extraProfileBmiHtml = '';
                if (parsedHeight) {
                    const bmi = latest.weight / ((parsedHeight/100) * (parsedHeight/100));
                    extraProfileBmiHtml = `<div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.2rem;">الطول: ${parsedHeight} سم | مؤشر كتلة الجسم: ${bmi.toFixed(1)}</div>`;
                }

                weightContainer.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(0,0,0,0.2)); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(234, 179, 8, 0.3); width: 100%;">
                        <div style="display: flex; align-items: center; gap: 1.2rem;">
                            <div style="background: rgba(234, 179, 8, 0.2); color: #eab308; width: 55px; height: 55px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; box-shadow: 0 4px 15px rgba(234, 179, 8, 0.2);">
                                <i class="fa-solid fa-weight-scale"></i>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 0.3rem;">الوزن المسجل</div>
                                <div style="font-size: 2rem; font-weight: 800; color: white; line-height: 1;">${latest.weight} <span style="font-size: 1.1rem; color: #eab308;">كجم</span></div>
                                ${extraProfileBmiHtml}
                            </div>
                        </div>
                        <div style="text-align: left; padding-right: 1rem; border-right: 1px solid rgba(255,255,255,0.1);">
                            <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.4rem;"><i class="fa-regular fa-calendar"></i> تاريخ التحديث</div>
                            <div style="color: white; font-weight: 600; font-size: 1.1rem;">${dateStr}</div>
                        </div>
                    </div>
                `;
            } else {
                weightContainer.innerHTML = '<div style="width: 100%; text-align: center; padding: 2rem;"><i class="fa-solid fa-scale-unbalanced text-muted" style="font-size: 2rem; margin-bottom: 1rem;"></i><br><span style="color: var(--text-muted); font-weight: normal; font-size: 1rem;">لم يتم إدخال أي قياسات للوزن بعد. يمكنك تسجيل وزنك من قسم متتبع التطور.</span></div>';
            }
        } catch(err) {
            weightContainer.innerHTML = '<span style="color: var(--danger); font-size:0.9rem;">تعذر جلب الوزن.</span>';
        }
    }
}

// --- Forgot Password Modal ---
window.openForgotPasswordModal = function(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('forgot-password-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const phoneInput = document.getElementById('forgot-phone');
        if (phoneInput) phoneInput.value = '';
    }
};

window.closeForgotPasswordModal = function() {
    const modal = document.getElementById('forgot-password-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.submitForgotPasswordRequest = async function() {
    const phoneInput = document.getElementById('forgot-phone');
    if (!phoneInput) return;
    const phone = phoneInput.value.trim();
    if (!phone) {
        showToast('يرجى إدخال رقم الهاتف', 'error');
        return;
    }

    try {
        const { data: player, error: playerError } = await supabase
            .from('players')
            .select('id, full_name')
            .eq('phone_number', phone)
            .maybeSingle();

        if (playerError) throw playerError;

        if (!player) {
            showToast('رقم الهاتف هذا غير مسجل لدينا', 'error');
            return;
        }

        // Check if there is already a pending request
        const { data: existingRequest, error: existingRequestError } = await supabase
            .from('password_reset_requests')
            .select('id')
            .eq('player_id', player.id)
            .eq('status', 'pending')
            .maybeSingle();

        if (existingRequestError) throw existingRequestError;

        if (existingRequest) {
            showToast('لديك طلب إعادة تعيين قيد الانتظار بالفعل. يرجى الانتظار لحين معالجته من قبل الإدارة.', 'warning');
            return;
        }

        const { error: insertError } = await supabase
            .from('password_reset_requests')
            .insert([{ player_id: player.id, status: 'pending' }]);

        if (insertError) throw insertError;

        await pushAdminNotification(
            'طلب جديد لإعادة تعيين كلمة المرور 🔑',
            `طلب اللاعب ${player.full_name} إعادة تعيين كلمة المرور الخاصة به.`
        );

        showToast('تم إرسال طلب إعادة التعيين للإدارة بنجاح', 'success');
        closeForgotPasswordModal();
    } catch (err) {
        console.error(err);
        showToast('حدث خطأ أثناء إرسال الطلب', 'error');
    }
};
