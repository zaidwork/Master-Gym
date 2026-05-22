// js/admin.js

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
    setTimeout(() => toast.remove(), 4000);
}

window.showCustomConfirm = function(message, options = {}) {
    const {
        title = 'تأكيد الإجراء',
        confirmText = 'نعم، متأكد',
        cancelText = 'إلغاء',
        type = 'warning' // 'warning', 'success', 'danger', 'info', 'freeze'
    } = options;

    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'custom-confirm-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            opacity: 0;
            transition: opacity 0.25s ease;
        `;

        // Determine icon and color based on type
        let icon = '⚠️';
        let confirmBtnColor = 'var(--primary, #d4af37)';
        let iconColor = 'var(--primary, #d4af37)';
        
        if (type === 'success') {
            icon = '✅';
            confirmBtnColor = 'var(--success, #10b981)';
            iconColor = 'var(--success, #10b981)';
        } else if (type === 'danger') {
            icon = '🚨';
            confirmBtnColor = 'var(--danger, #ef4444)';
            iconColor = 'var(--danger, #ef4444)';
        } else if (type === 'info') {
            icon = 'ℹ️';
            confirmBtnColor = '#3b82f6';
            iconColor = '#3b82f6';
        } else if (type === 'freeze') {
            icon = '❄️';
            confirmBtnColor = '#00d2ff';
            iconColor = '#00d2ff';
        }

        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(145deg, #1e1e24, #121216);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            width: 90%;
            max-width: 440px;
            padding: 2.5rem 2rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
            transform: scale(0.9);
            transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            text-align: center;
            color: #ffffff;
            font-family: 'Cairo', 'Almarai', sans-serif;
            position: relative;
            overflow: hidden;
            direction: rtl;
        `;

        // Add a subtle top border highlight matching the type color
        modal.style.borderTop = `4px solid ${confirmBtnColor}`;

        modal.innerHTML = `
            <div style="font-size: 3.5rem; margin-bottom: 1rem; color: ${iconColor}; display: flex; justify-content: center; align-items: center; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));">${icon}</div>
            <h3 style="margin-top: 0; margin-bottom: 0.8rem; color: #ffffff; font-weight: 700; font-size: 1.4rem; letter-spacing: -0.5px;">${title}</h3>
            <p style="margin-top: 0; margin-bottom: 2.2rem; color: rgba(255, 255, 255, 0.7); font-size: 1rem; line-height: 1.6; padding: 0 10px;">${message}</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="confirm-yes-btn" class="btn" style="flex: 1; padding: 0.8rem; border-radius: 12px; font-weight: 700; cursor: pointer; background: ${confirmBtnColor}; color: ${type === 'warning' ? '#0a0a0a' : '#ffffff'}; border: none; font-size: 0.95rem; box-shadow: 0 4px 12px ${confirmBtnColor}33; transition: all 0.2s;">${confirmText}</button>
                <button id="confirm-no-btn" class="btn" style="flex: 1; padding: 0.8rem; border-radius: 12px; font-weight: 700; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.8); font-size: 0.95rem; transition: all 0.2s;">${cancelText}</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Hover effects
        const yesBtn = modal.querySelector('#confirm-yes-btn');
        const noBtn = modal.querySelector('#confirm-no-btn');
        
        yesBtn.addEventListener('mouseenter', () => {
            yesBtn.style.transform = 'translateY(-2px)';
            yesBtn.style.boxShadow = `0 6px 16px ${confirmBtnColor}55`;
        });
        yesBtn.addEventListener('mouseleave', () => {
            yesBtn.style.transform = 'translateY(0)';
            yesBtn.style.boxShadow = `0 4px 12px ${confirmBtnColor}33`;
        });

        noBtn.addEventListener('mouseenter', () => {
            noBtn.style.transform = 'translateY(-2px)';
            noBtn.style.background = 'rgba(255, 255, 255, 0.05)';
            noBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });
        noBtn.addEventListener('mouseleave', () => {
            noBtn.style.transform = 'translateY(0)';
            noBtn.style.background = 'rgba(255, 255, 255, 0.02)';
            noBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        });

        // Animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        });

        const cleanup = (result) => {
            overlay.style.opacity = '0';
            modal.style.transform = 'scale(0.9)';
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 250);
        };

        yesBtn.addEventListener('click', () => cleanup(true));
        noBtn.addEventListener('click', () => cleanup(false));
        
        // Escape key to cancel
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', keyHandler);
                cleanup(false);
            }
        };
        document.addEventListener('keydown', keyHandler);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.removeEventListener('keydown', keyHandler);
                cleanup(false);
            }
        });
    });
};

function showAdminScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    // إخفاء الأزرار العائمة عند عرض شاشة تسجيل الدخول
    if (screenId === 'admin-login-screen') {
        const chatFab = document.getElementById('chat-fab');
        const aiPanel = document.getElementById('ai-panel');
        const aiFab   = document.getElementById('ai-fab');
        if (chatFab) chatFab.classList.remove('visible');
        if (aiPanel) aiPanel.classList.remove('open');
        if (aiFab)   aiFab.style.display = 'none';
    } else {
        // إظهار زر AI عند الدخول للوحة التحكم
        const aiFab = document.getElementById('ai-fab');
        if (aiFab) aiFab.style.display = '';
    }
}

function showAdminSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.querySelector(`.nav-btn[data-target="${sectionId}"]`).classList.add('active');
}

// --- Admin State ---
let currentAdmin = null;
let currentFilter = 'all'; // all, pending, approved

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const storedAdmin = localStorage.getItem('admin_id');
    if (storedAdmin) {
        verifyAdmin(storedAdmin);
    }

    // Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetSection = e.currentTarget.dataset.target;
            if(targetSection === 'admin-bot') {
                if(typeof toggleAiPanel === 'function') {
                    toggleAiPanel();
                }
                return;
            }

            showAdminSection(targetSection);
            if(targetSection === 'admin-dashboard-home') loadAnalyticsDashboard();
            if(targetSection === 'view-players') loadPlayers();
            if(targetSection === 'admin-expenses') loadExpenses();
            if(targetSection === 'admin-qr-scanner') initScanner();
            if(targetSection === 'view-freeze-requests') loadFreezeRequests();
            if(targetSection === 'view-renewals') loadRenewals();
            if(targetSection === 'view-sub-types') window.loadSubTypes();
            if(targetSection === 'view-password-resets') loadPasswordResets();
            if(targetSection === 'admin-settings') loadGamificationSettings();
            if(targetSection === 'view-schedules') {
                loadSchedulePlayers();
                loadTemplates();
                loadActiveSchedules();
            }
            if(targetSection === 'view-messages') {
                loadChatUsers();
                if(activeChatUserId) loadAdminMessages();
            }
            if(targetSection === 'view-player-profiles') loadPlayerProfilesGrid();
        });
    });

    const gamificationForm = document.getElementById('gamification-settings-form');
    if (gamificationForm) {
        gamificationForm.addEventListener('submit', saveGamificationSettings);
    }

    // Unread Badge Updater
    setInterval(updateAdminUnreadBadge, 5000);
    setTimeout(updateAdminUnreadBadge, 1000); // Initial check

    // Player Filters
    document.querySelectorAll('.status-filters .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.status-filters .tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            loadPlayers();
        });
    });

    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);

    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', adminLogout);
    
    // Player Search
    const searchInput = document.getElementById('player-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            loadPlayers();
        });
    }

    // Profile Grid Search
    const profileSearchInput = document.getElementById('profile-search-input');
    if (profileSearchInput) {
        profileSearchInput.addEventListener('input', () => {
            loadPlayerProfilesGrid();
        });
    }

    // --- Search Filters Enhancements ---
    const chatSearchInput = document.getElementById('admin-chat-search');
    if (chatSearchInput) {
        chatSearchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            document.querySelectorAll('#admin-chat-users .list-group-item').forEach(el => {
                const text = el.innerText.toLowerCase();
                el.style.display = text.includes(val) ? 'flex' : 'none';
            });
        });
    }

    const schedulePlayerSearch = document.getElementById('schedule-player-search');
    if (schedulePlayerSearch) {
        schedulePlayerSearch.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            document.querySelectorAll('#schedule-player-select option').forEach(opt => {
                if(opt.value === "") return;
                const text = opt.innerText.toLowerCase();
                opt.style.display = text.includes(val) ? '' : 'none';
            });
        });
    }

    const scheduleTemplateSearch = document.getElementById('schedule-template-search');
    if (scheduleTemplateSearch) {
        scheduleTemplateSearch.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            document.querySelectorAll('#templates-table-body tr').forEach(tr => {
                const text = tr.innerText.toLowerCase();
                tr.style.display = text.includes(val) ? '' : 'none';
            });
        });
    }
    // -----------------------------------

    // Global Topbar Search
    const globalSearchInput = document.getElementById('global-search-input');
    if (globalSearchInput) {
        globalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = globalSearchInput.value.trim();
                
                // Switch to players tab
                const playersTab = document.querySelector('.nav-btn[data-target="view-players"]');
                if (playersTab) playersTab.click();
                
                // Inject and trigger player search
                const pSearch = document.getElementById('player-search-input');
                if (pSearch) {
                    pSearch.value = val;
                    pSearch.dispatchEvent(new Event('input'));
                }
            }
        });
    }

    // SubTypes Modal
    const subTypeForm = document.getElementById('sub-type-form');
    if (subTypeForm) subTypeForm.addEventListener('submit', handleAddSubType);
    
    // Assign Sub Modal
    const assignSubForm = document.getElementById('assign-sub-form');
    if (assignSubForm) assignSubForm.addEventListener('submit', handleAssignSub);

    // Chat
    const chatForm = document.getElementById('admin-chat-form');
    if (chatForm) chatForm.addEventListener('submit', handleAdminMessage);

    // Expenses
    if(document.getElementById('expense-form')) {
        document.getElementById('expense-form').addEventListener('submit', handleExpenseSubmit);
    }
});

async function verifyAdmin(adminId) {
    try {
        const { data: admin, error } = await supabase.from('admins').select('*').eq('id', adminId).single();
        if (error || !admin) throw error;
        currentAdmin = admin;
        showAdminScreen('admin-dashboard-screen');
        loadAnalyticsDashboard();
        loadGlobalNotifications();
        setupNotificationsRealtime();
        setupGlobalAdminMessagesRealtime();
        setupFreezeRequestsRealtime();
        const chatFab = document.getElementById('chat-fab');
        if (chatFab) chatFab.classList.add('visible');
    } catch(err) {
        localStorage.removeItem('admin_id');
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-username').value.trim();
    const pass = document.getElementById('admin-password').value;

    try {
        // Authenticate via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: pass
        });

        if (authError || !authData || !authData.user) {
            showToast('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
            return;
        }

        const userId = authData.user.id;

        // Verify the user exists in the admins table
        const { data: admin, error: dbError } = await supabase
            .from('admins')
            .select('*')
            .eq('id', userId)
            .single();

        if (dbError || !admin) {
            await supabase.auth.signOut();
            showToast('هذا الحساب لا يملك صلاحيات الإدارة', 'error');
            return;
        }

        currentAdmin = admin;
        localStorage.setItem('admin_id', admin.id);
        showAdminScreen('admin-dashboard-screen');
        loadAnalyticsDashboard();
        showToast('تم تسجيل الدخول للإدارة', 'success');
        const chatFab = document.getElementById('chat-fab');
        if (chatFab) chatFab.classList.add('visible');
        loadGlobalNotifications();
        setupNotificationsRealtime();
        setupGlobalAdminMessagesRealtime();
        setupFreezeRequestsRealtime();
    } catch(err) {
        console.error("Login Error:", err);
        showToast(err.message || 'حدث خطأ أثناء تسجيل الدخول', 'error');
    }
}

async function adminLogout() {
    await supabase.auth.signOut();
    currentAdmin = null;
    localStorage.removeItem('admin_id');
    document.getElementById('admin-login-form').reset();
    const chatFab = document.getElementById('chat-fab');
    if (chatFab) chatFab.classList.remove('visible');
    showAdminScreen('admin-login-screen');
}

// --- Player Management ---
async function loadPlayers() {
    const tbody = document.getElementById('players-table-body');
    const searchInput = document.getElementById('player-search-input');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center"><div class="spinner"></div></td></tr>';

    try {
        let query = supabase.from('players').select('*, player_subscriptions(*, subscription_types(name)), freeze_requests(*)');
        if (currentFilter !== 'all') {
            query = query.eq('status', currentFilter);
        }

        const { data: players, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        let filteredPlayers = players;
        if (searchQuery) {
            filteredPlayers = players.filter(p => {
                const name = p.full_name ? p.full_name.toLowerCase() : '';
                const phone = p.phone_number ? p.phone_number : '';
                const clubId = p.club_id ? p.club_id : '';
                return name.includes(searchQuery) || phone.includes(searchQuery) || clubId.includes(searchQuery);
            });
        }

        tbody.innerHTML = '';
        if(filteredPlayers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">لا يوجد بيانات لعرضها</td></tr>`;
            return;
        }

        filteredPlayers.forEach(p => {
            const tr = document.createElement('tr');
            
            let statusBadge = '';
            if(p.status === 'pending') statusBadge = '<span class="badge pending">بانتظار الموافقة</span>';
            if(p.status === 'approved') statusBadge = '<span class="badge approved">موافق عليه</span>';
            if(p.status === 'rejected') statusBadge = '<span class="badge rejected">مرفوض</span>';

            const typeBadge = p.is_military ? '<span class="badge military">عسكري</span>' : '<span class="badge civilian">مدني</span>';

            let currentSub = 'لا يوجد اشتراك نشط';
            let activeSubId = null;
            
            // Check if player has an active approved freeze request
            const activeFreeze = p.freeze_requests?.find(f => f.status === 'approved' && new Date() >= new Date(f.created_at) && new Date() < new Date(new Date(f.created_at).getTime() + f.days * 24 * 60 * 60 * 1000));

            if(p.player_subscriptions && p.player_subscriptions.length > 0) {
                // sort by end date descending, check if active
                const activeSubs = p.player_subscriptions.filter(s => s.is_active && new Date(s.end_date) >= new Date());
                if(activeSubs.length > 0) {
                    activeSubId = activeSubs[0].id;
                    if (activeFreeze && activeFreeze.subscription_id === activeSubId) {
                        const freezeEnd = new Date(activeFreeze.created_at).getTime() + activeFreeze.days * 24 * 60 * 60 * 1000;
                        const diffTime = Math.max(0, new Date(activeSubs[0].end_date).getTime() - freezeEnd);
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        currentSub = `<span class="badge warning" style="background:#00d2ff; color:#0a0a0a; font-weight:bold; font-size:0.8rem; border-radius:4px; padding:2px 6px;">❄️ مجمد</span><br><small>متبقي ${diffDays}ي (موقوف)</small>`;
                    } else {
                        const diffTime = Math.abs(new Date(activeSubs[0].end_date) - new Date());
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        currentSub = `<span class="text-primary">${activeSubs[0].subscription_types.name}</span><br><small>متبقي ${diffDays}ي و ${diffHours}س</small>`;
                    }
                }
            }

            let actions = '<div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:flex-end;">';
            if (p.status === 'pending') {
                actions += `<button class="table-action-btn btn-success" title="موافقة" onclick="updatePlayerStatus('${p.id}', 'approved')"><i class="fa-solid fa-check"></i></button>`;
                actions += `<button class="table-action-btn btn-danger" title="رفض" onclick="updatePlayerStatus('${p.id}', 'rejected')"><i class="fa-solid fa-xmark"></i></button>`;
            } else if (p.status === 'approved') {
                actions += `<button class="table-action-btn btn-primary-action" title="تجديد / اشتراك" onclick="openAssignModal('${p.id}', '${p.full_name}')"><i class="fa-solid fa-plus"></i></button>`;
                if (activeSubId) {
                    actions += `<button class="table-action-btn btn-purple" title="طباعة الفاتورة" onclick="printInvoice('${activeSubId}')"><i class="fa-solid fa-print"></i></button>`;
                    actions += `<button class="table-action-btn btn-warning-action" title="إنهاء الاشتراك" onclick="cancelSubscription('${activeSubId}')"><i class="fa-solid fa-ban"></i></button>`;
                }
                actions += `<button class="table-action-btn btn-blue" title="صفحة اللاعب" onclick="openPlayerProfile('${p.id}')"><i class="fa-solid fa-user"></i></button>`;
                actions += `<button class="table-action-btn btn-danger" title="إلغاء الحساب" onclick="updatePlayerStatus('${p.id}', 'rejected')"><i class="fa-solid fa-trash"></i></button>`;
            } else {
                 actions += `<button class="table-action-btn btn-success" title="تفعيل الحساب" onclick="updatePlayerStatus('${p.id}', 'approved')"><i class="fa-solid fa-power-off"></i></button>`;
            }
            actions += '</div>';

            tr.innerHTML = `
                <td><strong class="text-primary">${p.club_id || '---'}</strong></td>
                <td>${p.full_name}</td>
                <td><span dir="ltr">${p.phone_number}</span></td>
                <td>${typeBadge}</td>
                <td>${statusBadge}</td>
                <td>${currentSub}</td>
                <td>${actions}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">حدث خطأ في تحميل البيانات</td></tr>';
    }
}

window.updatePlayerStatus = async function(id, status) {
    try {
        const { error } = await supabase.from('players').update({ status }).eq('id', id);
        if (error) throw error;
        
        let notifTitle = '';
        let notifContent = '';
        if (status === 'approved') {
            notifTitle = 'تم تفعيل حسابك بنجاح ✅';
            notifContent = 'أهلاً بك في ماستر جيم! تم تنشيط حسابك ويمكنك الآن التمتع بكافة المزايا.';

            // Award signup bonus if not awarded before
            const { data: existingTx } = await supabase
                .from('points_transactions')
                .select('id')
                .eq('player_id', id)
                .eq('reason', 'هدية التسجيل الجديد')
                .maybeSingle();

            if (!existingTx) {
                const { data: configData } = await supabase
                    .from('gamification_config')
                    .select('*')
                    .eq('key', 'signup_bonus')
                    .maybeSingle();
                const bonusPoints = configData ? parseInt(configData.value) : 50;

                if (bonusPoints > 0) {
                    await supabase.from('points_transactions').insert([{
                        player_id: id,
                        amount: bonusPoints,
                        reason: 'هدية التسجيل الجديد'
                    }]);
                    notifContent += ` وقد حصلت على ${bonusPoints} نقطة كهدية ترحيبية! 🏆`;
                }
            }
        } else if (status === 'rejected') {
            notifTitle = 'تم إيقاف حسابك ❌';
            notifContent = 'تم إيقاف حسابك من قبل الإدارة. يرجى مراجعة الاستقبال لمزيد من التفاصيل.';
        }
        
        if (notifTitle) {
            await supabase.from('notifications').insert([{
                user_id: id,
                title: notifTitle,
                content: notifContent,
                is_read: false
            }]);
        }
        
        showToast('تم تحديث حالة اللاعب بنجاح', 'success');
        loadPlayers();
    } catch(err) {
        showToast('تعذر التحديث', 'error');
    }
}

window.cancelSubscription = async function(subId) {
    const confirmed = await window.showCustomConfirm('هل أنت متأكد من رغبتك في إنهاء هذا الاشتراك فوراً؟ سيتم تحويل حالة الاشتراك إلى غير فعال وتعيين تاريخ الانتهاء لليوم.', {
        title: 'تأكيد إلغاء الاشتراك 🚨',
        type: 'danger',
        confirmText: 'نعم، إنهاء الاشتراك',
        cancelText: 'تراجع'
    });
    if (!confirmed) return;
    try {
        const todayStr = new Date().toISOString();
        const { error } = await supabase.from('player_subscriptions').update({ is_active: false, end_date: todayStr }).eq('id', subId);
        if (error) throw error;
        showToast('تم إنهاء الاشتراك بنجاح', 'success');
        loadPlayers();
    } catch(err) {
        console.error(err);
        showToast('تعذر إنهاء الاشتراك', 'error');
    }
}

// --- Subscription Types ---
window.loadSubTypes = async function() {
    const tbody = document.getElementById('sub-types-table-body');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center"><div class="spinner"></div></td></tr>';

    try {
        const { data: subs, error } = await supabase.from('subscription_types').select('*').order('price', {ascending: true});
        if (error) throw error;

        tbody.innerHTML = '';
        if(subs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">لم يتم إضافة أنواع اشتراكات إلى الآن</td></tr>';
            return;
        }

        subs.forEach(s => {
            const tr = document.createElement('tr');
            
            // Prepare description and name with escaped quotes for inline JS
            const escapedDesc = (s.description || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
            const escapedName = (s.name || '').replace(/'/g, "\\'").replace(/"/g, '\\"');

            tr.innerHTML = `
                <td style="font-weight:bold; color:var(--primary)">${s.name}</td>
                <td>${s.duration_days} يوم</td>
                <td>${s.price} ₪</td>
                <td>${s.description || '-'}</td>
                <td style="font-weight:bold; color:var(--warning)">${s.points || 0} 🏆</td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="btn btn-outline small" style="color:var(--primary); border-color:var(--primary); padding: 2px 6px;" onclick="editSubType('${s.id}', '${escapedName}', ${s.duration_days}, ${s.price}, '${escapedDesc}', ${s.points || 0})"><i class="fa-solid fa-pen-to-square"></i> تعديل</button>
                        <button class="btn btn-outline small" style="color:var(--danger); border-color:var(--danger); padding: 2px 6px;" onclick="deleteSubType('${s.id}')"><i class="fa-solid fa-trash"></i> حذف</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">حدث خطأ أثناء تحميل باقات الاشتراكات</td></tr>';
    }
}

window.openSubModal = function() { 
    document.getElementById('sub-modal-title').textContent = 'تأسيس نظام اشتراك جديد';
    document.getElementById('sub-submit-btn').textContent = 'اعتماد الباقة';
    document.getElementById('edit-sub-id').value = '';
    document.getElementById('sub-type-modal').classList.remove('hidden'); 
}

window.closeSubModal = function() { 
    document.getElementById('sub-type-modal').classList.add('hidden'); 
    document.getElementById('sub-type-form').reset();
    document.getElementById('edit-sub-id').value = '';
}

window.editSubType = function(id, name, duration_days, price, description, points) {
    document.getElementById('sub-modal-title').textContent = 'تعديل باقة الاشتراك';
    document.getElementById('sub-submit-btn').textContent = 'حفظ التعديلات';
    document.getElementById('edit-sub-id').value = id;
    document.getElementById('sub-name').value = name;
    document.getElementById('sub-days').value = duration_days;
    document.getElementById('sub-price').value = price;
    document.getElementById('sub-desc').value = description;
    document.getElementById('sub-points').value = points;
    document.getElementById('sub-type-modal').classList.remove('hidden');
}

window.deleteSubType = async function(id) {
    const confirmed = await window.showCustomConfirm('هل أنت متأكد من حذف هذه الباقة نهائياً؟ قد تكون مرتبطة باشتراكات حالية للاعبين.', {
        title: 'حذف باقة اشتراك 🗑️',
        type: 'danger',
        confirmText: 'نعم، احذف',
        cancelText: 'إلغاء'
    });
    if (!confirmed) return;
    try {
        const { error } = await supabase.from('subscription_types').delete().eq('id', id);
        if (error) throw error;
        showToast('تم حذف باقة الاشتراك بنجاح', 'success');
        window.loadSubTypes();
    } catch(err) {
        console.error(err);
        showToast('تعذر حذف باقة الاشتراك. قد تكون مستخدمة في اشتراكات نشطة للاعبين.', 'error');
    }
}

async function handleAddSubType(e) {
    e.preventDefault();
    const id = document.getElementById('edit-sub-id').value;
    const name = document.getElementById('sub-name').value.trim();
    const days = parseInt(document.getElementById('sub-days').value);
    const price = parseFloat(document.getElementById('sub-price').value);
    const desc = document.getElementById('sub-desc').value.trim();
    const points = parseInt(document.getElementById('sub-points').value) || 0;

    try {
        if (id) {
            const { error } = await supabase.from('subscription_types')
                .update({ name, duration_days: days, price, description: desc, points })
                .eq('id', id);
            if (error) throw error;
            showToast('تم تحديث باقة الاشتراك بنجاح', 'success');
        } else {
            const { error } = await supabase.from('subscription_types').insert([
                { name, duration_days: days, price, description: desc, points }
            ]);
            if (error) throw error;
            showToast('تمت إضافة باقة الاشتراك بنجاح', 'success');
        }
        window.closeSubModal();
        window.loadSubTypes();
    } catch(err) {
        console.error(err);
        showToast(id ? 'تعذر التحديث' : 'تعذر الإضافة', 'error');
    }
}

// --- Assign Subscription to Player ---
window.openAssignModal = async function(playerId, playerName) {
    document.getElementById('assign-player-id').value = playerId;
    document.getElementById('assign-sub-player-name').textContent = `اللاعب: ${playerName}`;
    
    // Set default date to today
    document.getElementById('assign-start-date').valueAsDate = new Date();

    // load sub types into select
    const select = document.getElementById('assign-sub-type');
    select.innerHTML = '<option value="">جاري التحميل...</option>';
    
    try {
        const { data, error } = await supabase.from('subscription_types').select('*');
        if (error) throw error;

        // Fetch default points configuration to fall back on
        const { data: configData } = await supabase
            .from('gamification_config')
            .select('*')
            .eq('key', 'default_subscription_points')
            .maybeSingle();
        const defaultPoints = configData ? parseInt(configData.value) : 100;

        select.innerHTML = '';
        data.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.dataset.days = s.duration_days;
            opt.dataset.points = s.points !== null && s.points !== undefined ? s.points : defaultPoints;
            opt.textContent = `${s.name} - ${s.price} ₪ (${s.duration_days} يوم)`;
            select.appendChild(opt);
        });

        // Set initial points
        if (data.length > 0) {
            document.getElementById('assign-points').value = data[0].points !== null && data[0].points !== undefined ? data[0].points : defaultPoints;
        }

        // Add change listener to select to update points input
        select.onchange = () => {
            const selectedOpt = select.options[select.selectedIndex];
            if (selectedOpt) {
                document.getElementById('assign-points').value = selectedOpt.dataset.points;
            }
        };

        document.getElementById('assign-sub-modal').classList.remove('hidden');
    } catch(err) {
        alert('حدث خطأ');
    }
}

window.closeAssignModal = function() {
    document.getElementById('assign-sub-modal').classList.add('hidden');
    document.getElementById('assign-sub-form').reset();
}

async function handleAssignSub(e) {
    e.preventDefault();
    const playerId = document.getElementById('assign-player-id').value;
    const typeSelect = document.getElementById('assign-sub-type');
    const typeId = typeSelect.value;
    const days = parseInt(typeSelect.options[typeSelect.selectedIndex].dataset.days);
    const pointsToAward = parseInt(document.getElementById('assign-points').value) || 0;
    
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();

    try {
        const { error } = await supabase.from('player_subscriptions').insert([{
            player_id: playerId,
            subscription_type_id: typeId,
            start_date: startStr,
            end_date: endStr,
            is_active: true
        }]);

        if (error) throw error;

        // Award points if any
        if (pointsToAward > 0) {
            const typeName = typeSelect.options[typeSelect.selectedIndex].text.split(' - ')[0];
            await supabase.from('points_transactions').insert([{
                player_id: playerId,
                amount: pointsToAward,
                reason: `تفعيل باقة: ${typeName}`
            }]);
        }

        // Auto-approve any pending renewal requests for this player
        await supabase.from('renewal_requests').update({ status: 'approved' }).eq('player_id', playerId).eq('status', 'pending');

        await supabase.from('notifications').insert([{
            user_id: playerId,
            title: 'تم تفعيل اشتراكك 💳',
            content: `تم تفعيل اشتراكك بنجاح ولمدة ${days} يوم. حصلت على ${pointsToAward} نقطة! 🏆`,
            is_read: false
        }]);

        showToast('تم تفعيل الاشتراك بنجاح', 'success');
        closeAssignModal();
        if(currentFilter === 'approved' || currentFilter === 'all') loadPlayers();
        loadRenewals(); // Refresh renewals table if needed
    } catch(err) {
        console.error(err);
        showToast('حدث خطأ أثناء التفعيل', 'error');
    }
}

// --- Advanced Schedules (Templates) ---
async function loadSchedulePlayers() {
    const select = document.getElementById('schedule-player-select');
    select.innerHTML = '<option value="">جاري تحميل اللاعبين...</option>';
    try {
        const { data, error } = await supabase.from('players').select('id, full_name').eq('status', 'approved');
        if(error) throw error;
        select.innerHTML = '<option value="">-- اختر اللاعب --</option>';
        data.forEach(p => { select.innerHTML += `<option value="${p.id}">${p.full_name}</option>`; });
    } catch(err) { console.error(err); }
}

async function loadTemplates() {
    const tbody = document.getElementById('templates-table-body');
    const select = document.getElementById('schedule-template-select');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center"><div class="spinner"></div></td></tr>';
    select.innerHTML = '<option value="">جاري تحميل القوالب...</option>';

    try {
        const { data, error } = await supabase.from('workout_templates').select('id, name, description').order('created_at', { ascending: false });
        if(error) throw error;

        tbody.innerHTML = '';
        select.innerHTML = '<option value="">-- اختر قالب الجدول --</option>';

        if(data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">لا يوجد قوالب محفوظة حالياً</td></tr>';
            return;
        }

        data.forEach(t => {
            // Populate table
            tbody.innerHTML += `
                <tr>
                    <td class="text-primary" style="font-weight:bold;">${t.name}</td>
                    <td>${t.description || '-'}</td>
                    <td>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="table-action-btn btn-warning-action" title="تعديل وتفصيل" onclick="editTemplate('${t.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="table-action-btn btn-danger" title="حذف" onclick="deleteTemplate('${t.id}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            // Populate dropdown
            select.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">تعذر تحميل القوالب</td></tr>';
    }
}

// Template Builder Logic
let templateDaysCount = 0;
let editingTemplateId = null;

window.openTemplateModal = function() {
    editingTemplateId = null;
    const modalTitle = document.getElementById('template-modal-title');
    if (modalTitle) modalTitle.textContent = '✨ بناء قالب تدريبي جديد';

    document.getElementById('template-modal').classList.remove('hidden');
    document.getElementById('template-form').reset();
    document.getElementById('template-days-container').innerHTML = '<p class="text-muted" style="text-align:center; margin: 2rem 0; font-size: 1.1rem;" id="no-days-msg">لم يتم إضافة أي أيام بعد.<br><span style="font-size: 0.9rem; opacity: 0.8;">اضغط على زر <strong style="color:var(--primary);">+ إضافة يوم تدريبي</strong> للبدء في بناء الجدول.</span></p>';
    templateDaysCount = 0;
}

window.closeTemplateModal = function() {
    document.getElementById('template-modal').classList.add('hidden');
}

window.addDayToTemplate = function(dayName = '', skipAutoExercise = false) {
    const noDaysMsg = document.getElementById('no-days-msg');
    if (noDaysMsg) noDaysMsg.style.display = 'none';
    templateDaysCount++;
    const dayId = `day-${templateDaysCount}`;
    
    const div = document.createElement('div');
    div.className = 'card p-2';
    div.style.border = '1px solid rgba(255,255,255,0.1)';
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <input type="text" class="form-control day-title-input" placeholder="اسم اليوم (مثال: اليوم الأول: صدر + باي)" value="${dayName}" required style="width: 60%; background:var(--bg-dark); border-color:rgba(255,255,255,0.1);">
            <div>
                <button type="button" class="btn btn-outline small" onclick="addExerciseToDay('${dayId}')">+ تمرين</button>
                <button type="button" class="btn btn-outline small" style="color:var(--danger); border-color:var(--danger);" onclick="removeDayFromTemplate(this)">X</button>
            </div>
        </div>
        <div class="exercises-container mt-2" id="${dayId}-exercises" style="display:flex; flex-direction:column; gap:0.5rem;">
            <!-- Exercises go here -->
        </div>
    `;
    document.getElementById('template-days-container').appendChild(div);
    
    // Auto-add first exercise slot
    if (!skipAutoExercise) {
        addExerciseToDay(dayId);
    }
    return dayId;
}

window.removeDayFromTemplate = function(btn) {
    btn.closest('.card').remove();
    const container = document.getElementById('template-days-container');
    const noDaysMsg = document.getElementById('no-days-msg');
    
    let hasDays = false;
    Array.from(container.children).forEach(child => {
        if(child.id !== 'no-days-msg') hasDays = true;
    });
    
    if(!hasDays && noDaysMsg) {
        noDaysMsg.style.display = 'block';
    }
}

window.addExerciseToDay = function(dayId, initialData = {}) {
    const container = document.getElementById(`${dayId}-exercises`);
    const exDiv = document.createElement('div');
    exDiv.className = 'exercise-row flex-row';
    exDiv.style.alignItems = 'flex-start';
    exDiv.style.gap = '0.5rem';

    const name = initialData.exercise_name || '';
    const sets = initialData.sets !== undefined ? initialData.sets : 3;
    const reps = initialData.reps || '';
    const notes = initialData.notes || '';

    exDiv.innerHTML = `
        <input type="text" class="form-control ex-name" placeholder="اسم التمرين" required value="${name}" style="flex:2; background:rgba(255,255,255,0.02); height:35px;">
        <input type="number" class="form-control ex-sets" placeholder="الجولات" required min="1" value="${sets}" style="flex:1; background:rgba(255,255,255,0.02); height:35px;">
        <input type="text" class="form-control ex-reps" placeholder="التكرار" required value="${reps}" style="flex:1; background:rgba(255,255,255,0.02); height:35px;">
        <input type="text" class="form-control ex-notes" placeholder="ملاحظات وتفاصيل التمرين" value="${notes}" style="flex:2; background:rgba(255,255,255,0.02); height:35px;">
        <button type="button" class="btn btn-outline small" style="color:var(--danger); border-color:var(--danger); height:35px;" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(exDiv);
}

window.editTemplate = async function(id) {
    editingTemplateId = id;
    const modalTitle = document.getElementById('template-modal-title');
    if (modalTitle) modalTitle.textContent = '📝 تعديل وتفصيل القالب التدريبي';

    document.getElementById('template-modal').classList.remove('hidden');
    document.getElementById('template-form').reset();
    
    const container = document.getElementById('template-days-container');
    container.innerHTML = '<div style="text-align:center; padding:2rem;"><div class="spinner"></div><p style="margin-top:1rem;">جاري تحميل تفاصيل الجدول...</p></div>';
    templateDaysCount = 0;

    try {
        // 1. Fetch template basic info
        const { data: tmpl, error: tmplErr } = await supabase
            .from('workout_templates')
            .select('*')
            .eq('id', id)
            .single();

        if (tmplErr) throw tmplErr;

        document.getElementById('template-name').value = tmpl.name;
        document.getElementById('template-desc').value = tmpl.description || '';

        // 2. Fetch days
        const { data: days, error: daysErr } = await supabase
            .from('workout_days')
            .select('*')
            .eq('template_id', id)
            .order('day_order', { ascending: true });

        if (daysErr) throw daysErr;

        container.innerHTML = ''; // Clear spinner

        if (!days || days.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align:center; margin: 2rem 0; font-size: 1.1rem;" id="no-days-msg">لم يتم إضافة أي أيام بعد.<br><span style="font-size: 0.9rem; opacity: 0.8;">اضغط على زر <strong style="color:var(--primary);">+ إضافة يوم تدريبي</strong> للبدء في بناء الجدول.</span></p>';
            return;
        }

        // 3. For each day, fetch exercises and populate
        for (const day of days) {
            const dayId = addDayToTemplate(day.day_name, true);
            
            const { data: exercises, error: exErr } = await supabase
                .from('workout_exercises')
                .select('*')
                .eq('day_id', day.id)
                .order('created_at', { ascending: true });

            if (exErr) throw exErr;

            if (exercises && exercises.length > 0) {
                exercises.forEach(ex => {
                    addExerciseToDay(dayId, ex);
                });
            } else {
                addExerciseToDay(dayId);
            }
        }

    } catch (err) {
        console.error(err);
        showToast('تعذر تحميل بيانات القالب لتعديله', 'error');
        closeTemplateModal();
    }
}

window.saveTemplate = async function() {
    const name = document.getElementById('template-name').value.trim();
    const desc = document.getElementById('template-desc').value.trim();
    
    if(!name) return showToast('يرجى تحديد اسم القالب', 'warning');
    
    const dayCards = document.getElementById('template-days-container').children;
    const noDaysMsg = document.getElementById('no-days-msg');
    if(dayCards.length === 0 || (noDaysMsg && noDaysMsg.style.display !== 'none') || (!noDaysMsg && dayCards.length === 0)) {
        return showToast('يجب إضافة يوم تدريبي واحد على الأقل', 'warning');
    }

    const btn = document.getElementById('save-template-btn');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';

    try {
        let templateId = editingTemplateId;

        if (editingTemplateId) {
            // 1. Update existing template basic info
            const { error: tmplErr } = await supabase
                .from('workout_templates')
                .update({
                    name,
                    description: desc
                })
                .eq('id', templateId);

            if (tmplErr) throw tmplErr;

            // Delete existing days (cascades delete to exercises)
            const { error: delErr } = await supabase
                .from('workout_days')
                .delete()
                .eq('template_id', templateId);

            if (delErr) throw delErr;

        } else {
            // 1. Insert New Template
            const { data: tmplData, error: tmplErr } = await supabase.from('workout_templates').insert([{
                name, description: desc, created_by: currentAdmin.id
            }]).select().single();
            
            if (tmplErr) throw tmplErr;
            templateId = tmplData.id;
        }

        // 2. Insert Days & Exercises
        let dayOrder = 1;
        for (let card of dayCards) {
            if(!card.querySelector('.day-title-input')) continue;
            const dayName = card.querySelector('.day-title-input').value.trim();
            if(!dayName) continue;

            const { data: dayData, error: dayErr } = await supabase.from('workout_days').insert([{
                template_id: templateId, day_order: dayOrder, day_name: dayName
            }]).select().single();

            if (dayErr) throw dayErr;

            const exRows = card.querySelectorAll('.exercise-row');
            let exPayloads = [];
            exRows.forEach(row => {
                const exName = row.querySelector('.ex-name').value.trim();
                const exSets = row.querySelector('.ex-sets').value;
                const exReps = row.querySelector('.ex-reps').value.trim();
                const exNotes = row.querySelector('.ex-notes') ? row.querySelector('.ex-notes').value.trim() : '';

                if(exName) {
                    exPayloads.push({
                        day_id: dayData.id,
                        exercise_name: exName,
                        sets: parseInt(exSets) || 3,
                        reps: exReps,
                        notes: exNotes
                    });
                }
            });

            if (exPayloads.length > 0) {
                await supabase.from('workout_exercises').insert(exPayloads);
            }
            dayOrder++;
        }

        showToast(editingTemplateId ? 'تم تعديل وتحديث الجدول بنجاح' : 'تم حفظ القالب بنجاح', 'success');
        closeTemplateModal();
        loadTemplates();

    } catch(err) {
        console.error(err);
        showToast('تعذر حفظ التغييرات', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 حفظ القالب واعتماده';
    }
}

window.deleteTemplate = async function(id) {
    const confirmed = await window.showCustomConfirm('هل أنت متأكد من حذف هذا القالب نهائياً؟ ستتأثر جداول اللاعبين المرتبطين به.', {
        title: 'حذف قالب تدريبي 🗑️',
        type: 'danger',
        confirmText: 'نعم، احذف',
        cancelText: 'إلغاء'
    });
    if (!confirmed) return;
    try {
        await supabase.from('workout_templates').delete().eq('id', id);
        showToast('تم حذف القالب', 'success');
        loadTemplates();
    } catch(err) { showToast('تعذر الحذف', 'error'); }
}

window.assignTemplate = async function() {
    const pid = document.getElementById('schedule-player-select').value;
    const tid = document.getElementById('schedule-template-select').value;

    if(!pid || !tid) {
        showToast('يرجى اختيار المشترك واختيار قالب جدول', 'warning');
        return;
    }

    try {
        // Remove existing assignment if we only want 1 active. Actually let's just delete the previous for this player to keep it clean.
        await supabase.from('player_schedules').delete().eq('player_id', pid);

        const { error } = await supabase.from('player_schedules').insert([{
            player_id: pid,
            template_id: tid,
            assigned_by: currentAdmin.id
        }]);

        if(error) throw error;
        
        await supabase.from('notifications').insert([{
            user_id: pid,
            title: 'جدول تدريبي جديد 📝',
            content: 'تم تعيين جدول تدريبي جديد لك من قبل المدرب. تفضل بالاطلاع عليه والتزم بالتمارين!',
            is_read: false
        }]);

        showToast('تم تعيين القالب للاعب وإرساله بنجاح', 'success');
        
    } catch(err) {
        console.error(err);
        showToast('تعذر التعيين للاعب', 'error');
    }
}

// --- Renewals ---
async function loadRenewals() {
    const tbody = document.getElementById('renewals-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center"><div class="spinner"></div></td></tr>';

    try {
        const { data: requests, error } = await supabase
            .from('renewal_requests')
            .select('*, players(full_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        tbody.innerHTML = '';
        if(requests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center">لا يوجد طلبات تجديد حالياً</td></tr>`;
            return;
        }

        requests.forEach(req => {
            const tr = document.createElement('tr');
            
            let statusBadge = '';
            if(req.status === 'pending') statusBadge = '<span class="badge pending">بانتظار الموافقة</span>';
            if(req.status === 'approved') statusBadge = '<span class="badge approved">تم التجديد</span>';
            if(req.status === 'rejected') statusBadge = '<span class="badge rejected">مرفوض</span>';

            let actions = '<div style="display:flex; gap:6px; justify-content:flex-start;">';
            if (req.status === 'pending') {
                actions += `<button class="table-action-btn btn-success" title="قبول وإضافة باقة" onclick="openAssignModal('${req.player_id}', '${req.players.full_name}')" style="width: auto !important; padding: 0 10px !important;"><i class="fa-solid fa-check" style="margin-left: 5px;"></i> قبول وإضافة باقة</button> `;
                actions += `<button class="table-action-btn btn-danger" title="رفض" onclick="rejectRenewal('${req.id}')"><i class="fa-solid fa-xmark"></i></button>`;
            }
            actions += '</div>';

            tr.innerHTML = `
                <td>${req.players.full_name}</td>
                <td dir="ltr">${new Date(req.created_at).toLocaleDateString('ar-EG')}</td>
                <td>${statusBadge}</td>
                <td>${actions}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">حدث خطأ في تحميل الطلبات</td></tr>';
    }
}

window.rejectRenewal = async function(requestId) {
    try {
        const { data: reqToReject, error: getErr } = await supabase.from('renewal_requests').select('player_id').eq('id', requestId).single();
        if(getErr) throw getErr;

        const { error } = await supabase.from('renewal_requests').update({ status: 'rejected' }).eq('id', requestId);
        if (error) throw error;
        
        await supabase.from('notifications').insert([{
            user_id: reqToReject.player_id,
            title: 'رفض طلب التجديد ❌',
            content: 'تم رفض طلب التجديد الخاص بك. يرجى مراجعة إدارة النادي.',
            is_read: false
        }]);

        showToast('تم رفض طلب التجديد', 'success');
        loadRenewals();
    } catch(err) {
        showToast('تعذر تحديث الطلب', 'error');
    }
}

// --- Unread Badges ---
async function updateAdminUnreadBadge() {
    if(!currentAdmin) return;
    try {
        const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_type', 'player')
            .eq('is_read', false);
            
        if(!error) {
            const badge = document.getElementById('admin-unread-badge');
            if(badge) {
                if(count > 0) {
                    badge.textContent = count;
                    badge.classList.remove('hidden');
                    document.title = `(${count}) ماستر جيم - الإدارة`;
                } else {
                    badge.classList.add('hidden');
                    document.title = `ماستر جيم - الإدارة`;
                }
            }
        }
    } catch(err){}
}

// --- Messages ---
let activeChatUserId = null;
let activeChatSubscription = null;

async function loadChatUsers() {
    const list = document.getElementById('admin-chat-users');
    list.innerHTML = '<div class="spinner"></div>';
    
    try {
        const { data: players, error } = await supabase.from('players').select('id, full_name').eq('status', 'approved');
        if (error) throw error;

        // Fetch unread count per player to show on list
        const { data: unreadMsgs } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('sender_type', 'player')
            .eq('is_read', false);
            
        const unreadCounts = {};
        if(unreadMsgs) {
            unreadMsgs.forEach(m => {
                unreadCounts[m.sender_id] = (unreadCounts[m.sender_id] || 0) + 1;
            });
        }

        list.innerHTML = '';
        players.forEach(p => {
            const div = document.createElement('div');
            div.className = 'list-group-item';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            
            let badgeHtml = '';
            if(unreadCounts[p.id]) {
                badgeHtml = `<span style="background:var(--danger); color:white; border-radius:50%; width:24px; height:24px; display:flex; justify-content:center; align-items:center; font-size:0.8rem; font-weight:bold;">${unreadCounts[p.id]}</span>`;
            }
            
            div.innerHTML = `<span>${p.full_name}</span> ${badgeHtml}`;
            div.onclick = () => openChatAdmin(p.id, p.full_name, div);
            list.appendChild(div);
        });

    } catch(err) {
        console.error(err);
    }
}

async function openChatAdmin(playerId, playerName, element) {
    activeChatUserId = playerId;
    document.getElementById('current-chat-name').textContent = `محادثة مع: ${playerName}`;
    document.getElementById('current-chat-player-id').value = playerId;
    document.getElementById('admin-chat-form').style.display = 'flex';
    
    document.querySelectorAll('.list-group-item').forEach(i => i.classList.remove('active'));
    element.classList.add('active');

    loadAdminMessages();
}


async function loadAdminMessages() {
    if(!activeChatUserId) return;
    const container = document.getElementById('admin-chat-messages');
    
    try {
        const isChatView = document.getElementById('view-messages') && document.getElementById('view-messages').classList.contains('active');
        if (isChatView) {
            // Mark as read
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('sender_id', activeChatUserId)
                .eq('sender_type', 'player')
                .eq('is_read', false);
        }
            
        updateAdminUnreadBadge();

        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${activeChatUserId},receiver_id.eq.${activeChatUserId}`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        container.innerHTML = '';
        if(messages.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align:center;">لا توجد رسائل سابقة.</p>';
        }

        messages.forEach(msg => {
            const isMe = msg.sender_type === 'admin';
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

async function handleAdminMessage(e) {
    e.preventDefault();
    if(!activeChatUserId) return;
    const input = document.getElementById('admin-chat-input');
    const content = input.value.trim();
    
    if (!content) return;

    try {
        let msgType = 'text';

        const { error } = await supabase.from('messages').insert([{
            sender_type: 'admin',
            sender_id: currentAdmin.id,
            receiver_id: activeChatUserId,
            content: content,
            message_type: msgType,
            is_read: false
        }]);

        if (error) throw error;
        input.value = '';
        loadAdminMessages();
    } catch (err) {
        showToast('تعذر في إرسال الرسالة', 'error');
    }
}

window.toggleChatDrawer = function() {
    const drawer = document.getElementById('chat-drawer');
    const overlay = document.getElementById('chat-overlay');
    const fab = document.getElementById('chat-fab');
    if (!drawer || !overlay) return;
    const isOpening = !drawer.classList.contains('active');
    
    if(isOpening) {
        drawer.classList.add('active');
        overlay.classList.add('active');
        if (fab) fab.classList.remove('visible');
        loadChatUsers();
    } else {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
        if (fab) fab.classList.add('visible');
    }
}

let globalAdminChatSub = null;
function setupGlobalAdminMessagesRealtime() {
    if (globalAdminChatSub) {
        supabase.removeChannel(globalAdminChatSub);
    }
    
    globalAdminChatSub = supabase.channel('global-admin-chat')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.sender_type === 'player') {
            // Play Sound
            playMessageSound();
            
            showToast('💬 رسالة جديدة من لاعب', 'info', () => {
                if (typeof toggleChatDrawer === 'function') toggleChatDrawer();
            });
            
            // Reload user list to show badges
            loadChatUsers();
            
            // Update unread badge count
            updateAdminUnreadBadge();
            
            // If we are currently chatting with the sender, load the messages to view
            if (payload.new.sender_id === activeChatUserId) {
                loadAdminMessages();
            }
        } else if (payload.new.sender_type === 'admin') {
             if (payload.new.receiver_id === activeChatUserId) {
                 loadAdminMessages();
             }
        }
    }).subscribe();
}

// --- Detailed Player Profiles ---
async function loadPlayerProfilesGrid() {
    const grid = document.getElementById('player-profiles-grid');
    const searchInput = document.getElementById('profile-search-input');
    const queryStr = searchInput ? searchInput.value.trim().toLowerCase() : '';

    grid.innerHTML = '<div class="spinner"></div>';

    try {
        const { data: players, error } = await supabase.from('players').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        let filtered = players;
        if (queryStr) {
            filtered = players.filter(p => {
                const name = p.full_name ? p.full_name.toLowerCase() : '';
                const phone = p.phone_number || '';
                const clubId = p.club_id || '';
                return name.includes(queryStr) || phone.includes(queryStr) || clubId.includes(queryStr);
            });
        }

        grid.innerHTML = '';
        if(filtered.length === 0) {
            grid.innerHTML = '<p class="text-muted" style="text-align:center; grid-column: 1/-1;">لا يوجد لاعبين لظهورهم.</p>';
            return;
        }

        filtered.forEach(p => {
            const isMil = p.is_military ? '<span class="badge military">عسكري</span>' : '<span class="badge civilian">مدني</span>';
            const card = document.createElement('div');
            card.className = 'card';
            card.style.cursor = 'pointer';
            card.style.transition = 'transform 0.2s';
            card.onclick = () => openPlayerProfile(p.id);
            card.onmouseover = () => card.style.transform = 'translateY(-5px)';
            card.onmouseout = () => card.style.transform = 'translateY(0)';
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                    <h3 style="margin:0; color:var(--primary); font-size:1.3rem;">${p.full_name}</h3>
                    <span style="background: rgba(255,255,255,0.1); padding: 5px 10px; border-radius: 8px; font-weight:bold; letter-spacing: 2px;">#${p.club_id || '---'}</span>
                </div>
                <div style="font-size: 0.95rem; color: var(--text-muted); line-height:1.6;">
                    <p>📞 <span dir="ltr">${p.phone_number}</span></p>
                    <p>📍 ${p.address || 'غير محدد'}</p>
                    <p style="margin-top:0.5rem;">${isMil}</p>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p class="text-muted" style="text-align:center; grid-column: 1/-1;">تعذر تحميل اللاعبين.</p>';
    }
}

window.openPlayerProfile = async function(playerId) {
    document.getElementById('player-profile-modal').classList.remove('hidden');
    const content = document.getElementById('profile-modal-content');
    content.innerHTML = '<div class="spinner"></div>';

    try {
        const { data: p, error } = await supabase
            .from('players')
            .select('*, player_subscriptions(*, subscription_types(*)), freeze_requests(*)')
            .eq('id', playerId)
            .single();

        if (error) throw error;
        
        const { data: prog } = await supabase
            .from('player_progress')
            .select('*')
            .eq('player_id', playerId)
            .order('created_at', { ascending: false });
            
        p.player_progress = prog || [];

        // Determine active sub
        let activeSubHtml = `
            <div style="background: rgba(255, 255, 255, 0.02); padding: 1.5rem; border-radius: 12px; border: 1px dashed rgba(255, 255, 255, 0.1); height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                <p class="text-muted" style="margin:0;">لا يوجد اشتراك مفعّل حالياً.</p>
            </div>`;
            
        let historyHtml = '';
        
        if (p.player_subscriptions && p.player_subscriptions.length > 0) {
            // sort by end date
            const subs = p.player_subscriptions.sort((a,b) => new Date(b.end_date) - new Date(a.end_date));
            
            // Build history table rows
            const rows = subs.map(s => {
                const isAct = (s.is_active && new Date(s.end_date) >= new Date()) ? '<span style="background:var(--success); color:#000; padding:3px 8px; border-radius:4px; font-weight:bold; font-size:0.8rem;">نعم</span>' : '<span style="background:var(--danger); color:#fff; padding:3px 8px; border-radius:4px; font-size:0.8rem;">لا</span>';
                const sDate = s.start_date ? new Date(s.start_date).toLocaleDateString('ar-EG', {year:'numeric', month:'short', day:'numeric'}) : '---';
                const eDate = s.end_date ? new Date(s.end_date).toLocaleDateString('ar-EG', {year:'numeric', month:'short', day:'numeric'}) : '---';
                return `<tr>
                    <td style="font-weight:bold; color:var(--text-main);">${s.subscription_types?.name || '---'}</td>
                    <td>${sDate}</td>
                    <td>${eDate}</td>
                    <td>${isAct}</td>
                </tr>`;
            }).join('');
            
            historyHtml = `
                <h4 style="margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; color: var(--primary);">سجل المدفوعات والاشتراكات</h4>
                <div class="table-container card p-0" style="max-height: 250px; box-shadow:none;">
                    <div class="table-container" style="border:none; border-radius:12px;">
                        <table class="data-table" style="font-size:0.9rem;">
                            <thead>
                                <tr><th>الباقة</th><th>تاريخ البدء</th><th>تاريخ الانتهاء</th><th>فعال؟</th></tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            `;

            // Active subscription details
            const activeSub = subs.find(s => s.is_active && new Date(s.end_date) >= new Date());
            if (activeSub) {
                // Find if there is an active approved freeze request for this subscription
                const activeFreeze = p.freeze_requests?.find(f => f.subscription_id === activeSub.id && f.status === 'approved' && new Date() >= new Date(f.created_at) && new Date() < new Date(new Date(f.created_at).getTime() + f.days * 24 * 60 * 60 * 1000));

                if (activeFreeze) {
                    const freezeEnd = new Date(activeFreeze.created_at).getTime() + activeFreeze.days * 24 * 60 * 60 * 1000;
                    const diffTime = Math.max(0, new Date(activeSub.end_date).getTime() - freezeEnd);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    
                    activeSubHtml = `
                        <div style="background: rgba(0, 210, 255, 0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(0, 210, 255, 0.3); height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-shadow: inset 0 0 20px rgba(0, 210, 255, 0.05);">
                            <strong style="color: #00d2ff; font-size:1.4rem; margin-bottom:0.5rem;">❄️ اشتراك مجمد: ${activeSub.subscription_types?.name || ''}</strong>
                            <span style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 0.8rem;">العداد موقوف حالياً (متبقي ${diffDays} يوم)</span>
                            <span style="background: #00d2ff; color: #0a0a0a; padding: 0.4rem 1.2rem; border-radius: 20px; font-weight: 800; font-size: 0.95rem; box-shadow: 0 4px 10px rgba(0, 210, 255, 0.3);">ينتهي التجميد تلقائياً في ${new Date(freezeEnd).toLocaleDateString('ar-EG')}</span>
                            <button class="btn btn-outline mt-3" onclick="resumeFrozenSubscription('${activeFreeze.id}')" style="border-color: #00d2ff; color: #00d2ff; background: rgba(0, 210, 255, 0.1); width: 100%; font-weight:bold; font-size: 0.9rem; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;">▶️ إلغاء التجميد واستئناف الاشتراك</button>
                        </div>
                    `;
                } else {
                    const diffTime = Math.abs(new Date(activeSub.end_date) - new Date());
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const endString = new Date(activeSub.end_date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    
                    activeSubHtml = `
                        <div style="background: rgba(16, 185, 129, 0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3); height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-shadow: inset 0 0 20px rgba(16, 185, 129, 0.05);">
                            <strong style="color: var(--success); font-size:1.4rem; margin-bottom:0.5rem;">✨ اشتراك نشط: ${activeSub.subscription_types?.name || ''}</strong>
                            <span style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 0.8rem;">ينتهي يوم ${endString}</span>
                            <span style="background: var(--success); color: #000; padding: 0.4rem 1.2rem; border-radius: 20px; font-weight: 800; font-size: 0.95rem; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">يتبقى ${diffDays} يوم و ${diffHours} ساعة</span>
                        </div>
                    `;
                }
            }
        }

            let weightsHtml = '';
            if (p.player_progress && p.player_progress.length > 0) {
                const progressData = p.player_progress.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                const weightRows = progressData.map(w => {
                    const date = new Date(w.created_at).toLocaleDateString('ar-EG');
                    return `<tr>
                        <td style="font-weight:bold; color:var(--warning);">${w.weight} كجم</td>
                        <td>${date}</td>
                        <td>${w.notes || '---'}</td>
                    </tr>`;
                }).join('');
                weightsHtml = `
                    <h4 style="margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; color: var(--warning);">سجل الأوزان والقياسات البدنية ⚖️</h4>
                    <div class="table-container card p-0" style="max-height: 250px; box-shadow:none;">
                        <div class="table-container" style="border:none; border-radius:12px;">
                            <table class="data-table" style="font-size:0.9rem;">
                                <thead>
                                    <tr><th>الوزن المسجل</th><th>تاريخ التسجيل</th><th>ملاحظات إضافية</th></tr>
                                </thead>
                                <tbody>${weightRows}</tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

        const pointsFormHtml = `
            <div style="margin-top: 2rem; background: rgba(139, 92, 246, 0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2);">
                <h4 style="color: #8b5cf6; margin: 0 0 1rem 0; display:flex; align-items:center; gap:0.5rem; font-size:1.1rem; font-weight:700;">🏆 تعديل نقاط ومكافآت اللاعب</h4>
                <form id="admin-points-reward-form" style="display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap;" onsubmit="event.preventDefault(); adjustPlayerPoints('${p.id}');">
                    <input type="number" id="reward-points-amount" placeholder="عدد النقاط (مثال: 50 أو -20)" required class="form-control" style="flex:1; min-width: 150px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 8px; padding: 0.6rem 1rem;">
                    <input type="text" id="reward-points-reason" placeholder="سبب المكافأة / التعديل..." required class="form-control" style="flex:2; min-width: 200px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 8px; padding: 0.6rem 1rem;">
                    <button type="submit" class="btn btn-primary" style="background:#8b5cf6; border:none; padding: 0.7rem 1.5rem; border-radius: 8px; font-weight:700; box-shadow: 0 4px 10px rgba(139, 92, 246, 0.2);">تعديل النقاط 💾</button>
                </form>
            </div>
        `;

        content.innerHTML = `
            <div style="display:flex; gap: 1.5rem; flex-wrap: wrap;">
                <div style="flex: 1.2; min-width: 300px;">
                    ${activeSubHtml}
                </div>
                <div style="flex: 1; min-width: 250px;">
                    <div style="background: var(--bg-surface-light); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; justify-content: center; gap: 0.8rem; height: 100%;">
                        <h3 class="text-primary" style="margin: 0 0 0.5rem 0; font-size: 1.3rem; text-align: center; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 0.5rem;">${p.full_name}</h3>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><strong class="text-muted">رقم المشترك:</strong> <span style="font-weight:bold; color:var(--text-main); font-size:1.1rem;">${p.club_id || '---'}</span></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><strong class="text-muted">الهاتف:</strong> <span dir="ltr" style="font-weight:600;">${p.phone_number}</span></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><strong class="text-muted">البريد الإلكتروني:</strong> <span style="font-weight:600; color:white;">${p.email || 'غير محدد'}</span></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><strong class="text-muted">الجنس:</strong> <span>${p.gender || 'ذكر'}</span></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><strong class="text-muted">المنطقة:</strong> <span>${p.address || '---'}</span></div>
                        <div style="display:flex; justify-content:space-between; align-items:center;"><strong class="text-muted">الصفة العسكرية:</strong> <span>${p.is_military ? '<span style="color:#3b82f6; font-weight:bold;">عسكري 🛡️</span>' : 'مدني'}</span></div>
                        <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(234, 179, 8, 0.1); padding: 5px 8px; border-radius: 6px; margin-top: 5px;"><strong class="text-warning">النقاط الحالية 🏆:</strong> <span style="font-weight:bold; color:var(--warning); font-size:1.2rem;">${p.points || 0} نقطة</span></div>
                    </div>
                </div>
            </div>
            ${pointsFormHtml}
            ${historyHtml}
            ${weightsHtml}
        `;

    } catch (err) {
        content.innerHTML = '<p class="text-muted text-center" style="color:var(--danger)">حدث خطأ أثناء جلب المعلومات، يرجى المحاولة لاحقاً.</p>';
    }
}

window.closeProfileModal = function() {
    document.getElementById('player-profile-modal').classList.add('hidden');
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
        return { icon: '❄️', actionText: 'انتقال لطلبات التجميد ➔' };
    } else if (t.includes('تجديد') || c.includes('تجديد')) {
        return { icon: '🔄', actionText: 'انتقال لطلبات التجديد ➔' };
    } else if (t.includes('تسجيل') || c.includes('لاعب جديد') || c.includes('الانضمام')) {
        return { icon: '👤', actionText: 'انتقال لقائمة الأعضاء ➔' };
    } else if (t.includes('وزن') || t.includes('قياس') || c.includes('وزن') || c.includes('قياس')) {
        return { icon: '⚖️', actionText: 'انتقال لتفاصيل الأعضاء ➔' };
    } else if (t.includes('برنامج') || t.includes('جدول') || c.includes('برنامج') || c.includes('جدول')) {
        return { icon: '🏋️', actionText: 'انتقال للبرنامج التدريبي ➔' };
    } else if (t.includes('تفعيل') || t.includes('اشتراك') || c.includes('تفعيل') || c.includes('اشتراك')) {
        return { icon: '💳', actionText: 'انتقال للاشتراكات ➔' };
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

    let targetSection = 'admin-dashboard-home'; // Default fallback
    if (lowerTitle.includes('تجميد') || lowerContent.includes('تجميد')) {
        targetSection = 'view-freeze-requests';
    } else if (lowerTitle.includes('تجديد') || lowerContent.includes('تجديد')) {
        targetSection = 'view-renewals';
    } else if (lowerTitle.includes('تسجيل') || lowerContent.includes('لاعب جديد') || lowerContent.includes('الانضمام')) {
        targetSection = 'view-players';
    } else if (lowerTitle.includes('وزن') || lowerTitle.includes('قياس') || lowerContent.includes('وزن') || lowerContent.includes('قياس')) {
        targetSection = 'view-player-profiles';
    }

    if (targetSection) {
        const btn = document.querySelector(`.nav-btn[data-target="${targetSection}"]`);
        if (btn) {
            btn.click(); // Trigger click event which switches screen AND loads data!
        } else {
            showAdminSection(targetSection);
        }
    }

    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) dropdown.classList.remove('show');
};

// --- Notifications System ---
let adminNotifSubscription = null;
let adminFreezeSubscription = null;

window.toggleNotifications = function() {
    const dropdown = document.getElementById('notifications-dropdown');
    dropdown.classList.toggle('show');
    if (dropdown.classList.contains('show')) {
        loadGlobalNotifications();
    }
};

window.markAllNotificationsRead = async function() {
    if (!currentAdmin) return;
    try {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentAdmin.id)
            .eq('is_read', false);
        loadGlobalNotifications();
    } catch(err) {}
}

window.clearAllNotifications = async function() {
    if (!currentAdmin) return;
    try {
        await supabase
            .from('notifications')
            .delete()
            .eq('user_id', currentAdmin.id);
        
        loadGlobalNotifications();
    } catch (err) {}
};

async function loadGlobalNotifications() {
    if (!currentAdmin) return;
    const badge = document.getElementById('global-unread-badge');
    const list = document.getElementById('notifications-list');
    
    try {
        const { data: notifs, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentAdmin.id)
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
    if (adminNotifSubscription) {
        supabase.removeChannel(adminNotifSubscription);
    }
    adminNotifSubscription = supabase.channel('admin-notifs')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
            if (currentAdmin && payload.new.user_id === currentAdmin.id) {
                playNotificationSound();
                loadGlobalNotifications();
                showToast(`🔔 ${payload.new.title}`, 'info', () => {
                    window.handleNotificationClick(payload.new.id, payload.new.title, payload.new.content);
                });
            }
        }
    ).subscribe();
}

function setupFreezeRequestsRealtime() {
    if (adminFreezeSubscription) {
        supabase.removeChannel(adminFreezeSubscription);
    }
    adminFreezeSubscription = supabase.channel('admin-freeze-requests')
    .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'freeze_requests' },
        (payload) => {
            console.log('Realtime freeze request change:', payload);
            loadFreezeRequests();
            loadAnalyticsDashboard();
        }
    ).subscribe();
}

// --- Analytics Dashboard (Phase 2 & Phase 6) ---
async function loadAnalyticsDashboard() {
    if (!currentAdmin) return;
    try {
        loadFreezeRequests();
        const { data: subs, error: subsErr } = await supabase
            .from('player_subscriptions')
            .select(`
                *,
                subscription_types(price),
                players(full_name, phone_number)
            `).eq('is_active', true);
        
        const { data: expenses, error: expErr } = await supabase
            .from('gym_expenses')
            .select('amount');

        if (subsErr) throw subsErr;
        if (expErr) throw expErr;
        
        let totalIncome = 0;
        let totalExpenses = 0;
        let activeCount = 0;
        let inactiveCount = 0;
        let expiringSoon = [];
        const today = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);

        subs.forEach(sub => {
            if (sub.is_active) {
                activeCount++;
                if (sub.subscription_types && sub.subscription_types.price) {
                    totalIncome += sub.subscription_types.price;
                }
                
                const endDate = new Date(sub.end_date);
                if (endDate >= today && endDate <= threeDaysFromNow) {
                    expiringSoon.push({
                        player: sub.players ? sub.players.full_name : 'غير معروف',
                        phone: sub.players ? sub.players.phone_number : '',
                        daysLeft: Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
                    });
                }
            } else {
                inactiveCount++;
            }
        });

        expenses.forEach(exp => {
            totalExpenses += parseFloat(exp.amount) || 0;
        });

        const netProfit = totalIncome - totalExpenses;

        document.getElementById('total-income-stat').textContent = `${totalIncome} ₪`;
        
        const expStat = document.getElementById('total-expenses-stat');
        if(expStat) expStat.textContent = `${totalExpenses} ₪`;
        
        const netStat = document.getElementById('net-profit-stat');
        if(netStat) netStat.textContent = `${netProfit} ₪`;
        
        const activeStat = document.getElementById('active-subs-stat');
        if(activeStat) activeStat.textContent = activeCount;
        
        const inactiveStat = document.getElementById('inactive-subs-stat');
        if(inactiveStat) inactiveStat.textContent = inactiveCount;

        // Initialize Charts
        if (window.netProfitChartInst) window.netProfitChartInst.destroy();
        const ctxNet = document.getElementById('netProfitChart');
        if (ctxNet) {
            window.netProfitChartInst = new Chart(ctxNet, {
                type: 'line',
                data: {
                    labels: ['الدخل', 'المصاريف', 'الصافي'],
                    datasets: [{
                        label: 'المؤشر المالي',
                        data: [totalIncome, totalExpenses, netProfit],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    },
                    layout: { padding: 0 }
                }
            });
        }

        if (window.activeSubsChartInst) window.activeSubsChartInst.destroy();
        const ctxActive = document.getElementById('activeSubsChart');
        if (ctxActive) {
            window.activeSubsChartInst = new Chart(ctxActive, {
                type: 'doughnut',
                data: {
                    labels: ['نشط', 'غير نشط'],
                    datasets: [{
                        data: [activeCount, inactiveCount],
                        backgroundColor: ['#d4af37', '#333333'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { display: false } },
                    layout: { padding: 0 }
                }
            });
        }

        const expiringList = document.getElementById('expiring-soon-list');
        expiringList.innerHTML = '';
        if (expiringSoon.length === 0) {
            expiringList.innerHTML = '<div class="text-center text-muted" style="padding:1rem;">لا توجد اشتراكات شارفت على الانتهاء</div>';
        } else {
            expiringSoon.forEach(exp => {
                const div = document.createElement('div');
                div.className = 'list-group-item';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${exp.player}</strong>
                        <span class="badge warning">${exp.daysLeft} أيام</span>
                    </div>
                    <div class="text-muted" style="font-size:0.85rem; margin-top:0.3rem;">📞 ${exp.phone || 'غير متوفر'}</div>
                `;
                expiringList.appendChild(div);
            });
        }
    } catch (err) {
        console.error('Error loading analytics', err);
    }
}

// --- Phase 4: Smart Player Scanner ---
let html5QrcodeScanner = null;
let html5QrcodeInstance = null;

// Switch between camera and upload modes
window.switchScannerMode = function(mode) {
    const cameraMode = document.getElementById('scanner-camera-mode');
    const uploadMode = document.getElementById('scanner-upload-mode');
    const cameraBtn = document.getElementById('scanner-camera-btn');
    const uploadBtn = document.getElementById('scanner-upload-btn');

    if (mode === 'camera') {
        cameraMode.style.display = 'block';
        uploadMode.style.display = 'none';
        cameraBtn.className = 'btn btn-primary small';
        uploadBtn.className = 'btn btn-outline small';
        // Stop file scanner if running
        if (html5QrcodeInstance) {
            html5QrcodeInstance.clear().catch(() => {});
        }
        initScanner(); // Start camera
    } else {
        cameraMode.style.display = 'none';
        uploadMode.style.display = 'block';
        cameraBtn.className = 'btn btn-outline small';
        uploadBtn.className = 'btn btn-primary small';
        // Stop camera scanner
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear().catch(() => {});
        }
    }
};

function initScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(() => {});
    }

    html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", { fps: 10, qrbox: { width: 220, height: 220 }, rememberLastUsedCamera: true }
    );

    html5QrcodeScanner.render(onScanSuccess, onScanError);
}

// Read QR from uploaded image file — jsQR is the primary engine
window.scanQRFromImage = async function(inputEl) {
    const file = inputEl.files[0];
    if (!file) return;

    const resBox = document.getElementById('qr-scan-result');
    resBox.className = 'alert info mt-2';
    resBox.innerHTML = '<div class="spinner"></div> جاري تحليل الصورة...';

    try {
        const decodedText = await decodeQRWithJsQR(file);
        console.log('QR decoded:', decodedText);
        await processScannedId(decodedText, resBox);
    } catch(err) {
        console.warn('jsQR failed, trying Html5Qrcode:', err.message);
        // Fallback 1: Html5Qrcode
        try {
            if (html5QrcodeInstance) {
                try { html5QrcodeInstance.clear(); } catch(e) {}
                const el = document.getElementById('qr-image-processor-hidden');
                if (el) el.innerHTML = '';
            }
            html5QrcodeInstance = new Html5Qrcode("qr-image-processor-hidden");
            const decodedText = await html5QrcodeInstance.scanFile(file, false);
            console.log('Html5Qrcode decoded:', decodedText);
            await processScannedId(decodedText, resBox);
        } catch(err2) {
            console.warn('Html5Qrcode failed, trying BarcodeDetector:', err2.message);
            // Fallback 2: BarcodeDetector API
            try {
                const decodedText = await decodeQRWithBarcodeDetector(file);
                console.log('BarcodeDetector decoded:', decodedText);
                await processScannedId(decodedText, resBox);
            } catch(err3) {
                console.error('All QR decoders failed:', err3.message);
                resBox.className = 'alert error mt-2';
                resBox.innerHTML = '❌ تعذّر قراءة الصورة. جرب: (1) صورة مضاءة جيداً، (2) ألا تكون الصورة ضبابية، (3) أن يكون الرمز واضحاً دون حواجز.';
            }
        }
    }

    inputEl.value = '';
};

// jsQR: most reliable canvas-pixel based decoder
function decodeQRWithJsQR(file) {
    return new Promise((resolve, reject) => {
        if (typeof jsQR === 'undefined') {
            reject(new Error('jsQR not loaded'));
            return;
        }
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            // Try multiple canvas sizes for best accuracy
            const sizes = [
                { w: img.width, h: img.height },
                { w: 800, h: Math.round(800 * img.height / img.width) },
                { w: 400, h: Math.round(400 * img.height / img.width) },
            ];
            for (const size of sizes) {
                const canvas = document.createElement('canvas');
                canvas.width = size.w;
                canvas.height = size.h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, size.w, size.h);
                const imageData = ctx.getImageData(0, 0, size.w, size.h);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'attemptBoth'
                });
                if (code && code.data) {
                    resolve(code.data);
                    return;
                }
            }
            reject(new Error('No QR code found in image'));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
    });
}

// BarcodeDetector: native browser API fallback
function decodeQRWithBarcodeDetector(file) {
    return new Promise((resolve, reject) => {
        if (!('BarcodeDetector' in window)) {
            reject(new Error('BarcodeDetector not supported'));
            return;
        }
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = async () => {
            URL.revokeObjectURL(url);
            try {
                const detector = new BarcodeDetector({ formats: ['qr_code'] });
                const barcodes = await detector.detect(img);
                if (barcodes.length > 0) {
                    resolve(barcodes[0].rawValue);
                } else {
                    reject(new Error('No QR code detected'));
                }
            } catch(e) {
                reject(e);
            }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
    });
}


async function onScanSuccess(decodedText) {
    if (html5QrcodeScanner) html5QrcodeScanner.clear().catch(() => {});
    const resBox = document.getElementById('qr-scan-result');
    await processScannedId(decodedText, resBox);
}

function onScanError(errorMessage) {
    // Silently ignore — scanner retries constantly
}

async function recordAttendanceAndReward(playerId, playerName) {
    try {
        // Check if player has an active approved freeze request
        const { data: activeFreezes } = await supabase
            .from('freeze_requests')
            .select('*')
            .eq('player_id', playerId)
            .eq('status', 'approved');

        const now = new Date();
        const currentFreeze = activeFreezes?.find(f => {
            const start = new Date(f.created_at);
            const end = new Date(start.getTime() + f.days * 24 * 60 * 60 * 1000);
            return now >= start && now < end;
        });

        if (currentFreeze) {
            showToast(`❄️ اشتراك اللاعب ${playerName} مجمد حالياً! يجب إلغاء التجميد أولاً لتسجيل الحضور.`, 'warning');
            throw new Error(`اشتراك اللاعب ${playerName} مجمد حالياً.`);
        }

        // Record attendance
        await supabase.from('player_attendance').insert([{ player_id: playerId }]);

        // Check if first check-in today
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        const todayEnd = new Date();
        todayEnd.setHours(23,59,59,999);
        
        const { data: todayAtts } = await supabase
            .from('player_attendance')
            .select('check_in_time')
            .eq('player_id', playerId)
            .gte('check_in_time', todayStart.toISOString())
            .lte('check_in_time', todayEnd.toISOString());

        // Since we just inserted one, if length is 1, it's the first check-in of the day
        if (todayAtts && todayAtts.length === 1) {
            // Fetch gamification config
            const { data: config } = await supabase.from('gamification_config').select('*');
            const configMap = {};
            if (config) config.forEach(c => configMap[c.key] = c.value);

            const earlyTime = configMap['early_attendance_time'] || '09:00';
            const earlyPoints = parseInt(configMap['early_attendance_points']) || 0;

            const now = new Date();
            const [earlyHours, earlyMins] = earlyTime.split(':').map(Number);
            const limitTime = new Date();
            limitTime.setHours(earlyHours, earlyMins, 0, 0);

            if (now <= limitTime && earlyPoints > 0) {
                await supabase.from('points_transactions').insert([{
                    player_id: playerId,
                    amount: earlyPoints,
                    reason: `حضور مبكر قبل الساعة ${earlyTime}`
                }]);

                await supabase.from('notifications').insert([{
                    user_id: playerId,
                    title: '🌅 نقاط حضور مبكر!',
                    content: `لقد حضرت باكراً اليوم قبل الساعة ${earlyTime} وحصلت على ${earlyPoints} نقطة! 🏆`,
                    is_read: false
                }]);

                showToast(`🏆 تم تسجيل حضور مبكر لـ ${playerName} ومنحه ${earlyPoints} نقطة!`, 'success');
            } else {
                showToast(`✅ تم تسجيل حضور اللاعب ${playerName} بنجاح`, 'success');
            }
        } else {
            showToast(`✅ تم تسجيل حضور اللاعب ${playerName} مجدداً اليوم`, 'success');
        }
    } catch(err) {
        console.error('Error recording attendance:', err);
    }
}

async function processScannedId(scannedText, resBox) {
    resBox.className = 'alert info mt-2';
    resBox.innerHTML = '<div class="spinner"></div> جاري البحث في قاعدة البيانات...';

    try {
        // Try matching by player UUID (from QR code)
        const { data: player, error } = await supabase
            .from('players')
            .select('id, full_name')
            .eq('id', scannedText)
            .maybeSingle();

        if (player) {
            await recordAttendanceAndReward(player.id, player.full_name);
            resBox.className = 'hidden';
            openPlayerProfile(player.id);
            return;
        }

        // If not found by UUID, try club_id
        const { data: playerByClubId } = await supabase
            .from('players')
            .select('id, full_name')
            .eq('club_id', scannedText.trim())
            .maybeSingle();

        if (playerByClubId) {
            await recordAttendanceAndReward(playerByClubId.id, playerByClubId.full_name);
            resBox.className = 'hidden';
            openPlayerProfile(playerByClubId.id);
            return;
        }

        throw new Error(`لم يتم التعرف على الرمز في قاعدة البيانات<br><small style="opacity:0.7">القيمة المقروءة: <code>${scannedText}</code></small>`);

    } catch(err) {
        resBox.className = 'alert error mt-2';
        resBox.innerHTML = `❌ ${err.message || 'رمز QR غير صالح.'}`;
        setTimeout(() => {
            resBox.className = 'hidden';
            if (document.getElementById('scanner-camera-mode').style.display !== 'none') {
                initScanner();
            }
        }, 4000);
    }
}

// Quick manual search by name, phone, or club ID
window.quickSearchPlayer = async function(query) {
    const resultsDiv = document.getElementById('quick-search-results');
    if (!query || query.length < 2) {
        resultsDiv.innerHTML = '<p class="text-muted text-center" style="padding: 1rem;">ابدأ بالكتابة للبحث...</p>';
        return;
    }

    resultsDiv.innerHTML = '<div class="spinner" style="margin: 1rem auto;"></div>';

    try {
        const { data: players, error } = await supabase
            .from('players')
            .select('id, full_name, phone_number, club_id, status')
            .or(`full_name.ilike.%${query}%,phone_number.ilike.%${query}%,club_id.ilike.%${query}%`)
            .limit(10);

        if (error) throw error;

        if (!players || players.length === 0) {
            resultsDiv.innerHTML = '<p class="text-muted text-center" style="padding: 1rem;">لا توجد نتائج</p>';
            return;
        }

        resultsDiv.innerHTML = '';
        players.forEach(p => {
            const div = document.createElement('div');
            div.style.cssText = 'background: var(--bg-dark); border: 1px solid var(--border); border-radius: 10px; padding: 0.8rem 1rem; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center;';
            div.onmouseover = () => div.style.background = 'var(--bg-surface-light)';
            div.onmouseout = () => div.style.background = 'var(--bg-dark)';
            div.onclick = () => openPlayerProfile(p.id);

            const statusColor = p.status === 'approved' ? 'var(--success)' : p.status === 'pending' ? 'var(--warning)' : 'var(--danger)';
            div.innerHTML = `
                <div>
                    <strong style="color: var(--primary);">${p.full_name}</strong>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">
                        📞 ${p.phone_number || '---'} &nbsp;|&nbsp; # <strong>${p.club_id || '---'}</strong>
                    </div>
                </div>
                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${statusColor}; flex-shrink: 0;"></span>
            `;
            resultsDiv.appendChild(div);
        });
    } catch(err) {
        resultsDiv.innerHTML = '<p class="text-muted text-center" style="padding: 1rem;">حدث خطأ أثناء البحث</p>';
    }
};



// --- Phase 5: Freeze Requests ---
async function loadFreezeRequests() {
    try {
        const { data: requests, error } = await supabase
            .from('freeze_requests')
            .select(`
                *,
                players(full_name, phone_number)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tbody = document.querySelector('#freeze-requests-table tbody');
        tbody.innerHTML = '';

        // Also update dashboard freeze list
        const dashFreezeList = document.getElementById('freeze-requests-list');
        if(dashFreezeList) dashFreezeList.innerHTML = '';

        if (!requests || requests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">لا توجد طلبات تجميد حالياً.</td></tr>';
            if(dashFreezeList) dashFreezeList.innerHTML = '<div class="text-center text-muted" style="padding:1rem;">لا توجد طلبات تجميد حالياً</div>';
            return;
        }

        requests.forEach(req => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${req.players.full_name}</td>
                <td style="direction:ltr;">${req.players.phone_number}</td>
                <td><span class="badge warning">${req.days} يوم</span></td>
                <td>${req.reason || 'بدون سبب'}</td>
                <td>${new Date(req.created_at).toLocaleDateString('ar-EG')}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="table-action-btn btn-success" title="موافقة" onclick="updateFreezeStatus('${req.id}', 'approved')"><i class="fa-solid fa-check"></i></button>
                        <button class="table-action-btn btn-danger" title="رفض" onclick="updateFreezeStatus('${req.id}', 'rejected')"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);

            // Add to dash
            if(dashFreezeList) {
                const dashDiv = document.createElement('div');
                dashDiv.className = 'list-group-item';
                dashDiv.innerHTML = `
                    <div style="display:flex; justify-content:space-between;">
                        <strong>${req.players.full_name}</strong>
                        <span class="badge warning">${req.days} أيام</span>
                    </div>
                `;
                dashFreezeList.appendChild(dashDiv);
            }
        });
    } catch (err) {
        console.error(err);
        showToast('فشل في تحميل طلبات التجميد', 'error');
    }
}

window.updateFreezeStatus = async function(reqId, status) {
    const isApproved = status === 'approved';
    const message = isApproved 
        ? 'الموافقة تعني إيقاف عداد أيام الاشتراك مؤقتاً وتجميده، وسيتم تمديد أيام الاشتراك تلقائياً بنهاية فترة التجميد أو استئنافها. هل أنت متأكد؟' 
        : 'هل أنت متأكد من رفض طلب التجميد هذا؟';
    const confirmed = await window.showCustomConfirm(message, {
        title: isApproved ? 'اعتماد طلب التجميد ❄️' : 'رفض طلب التجميد ❌',
        type: isApproved ? 'freeze' : 'danger',
        confirmText: isApproved ? 'نعم، موافقة' : 'نعم، رفض الطلب',
        cancelText: 'إلغاء'
    });
    if (!confirmed) return;
    try {
        const updateData = { status: status };
        if (status === 'approved') {
            updateData.created_at = new Date().toISOString(); // Start the freeze from approval time
        }
        const { error } = await supabase
            .from('freeze_requests')
            .update(updateData)
            .eq('id', reqId);
            
        if (error) throw error;
        showToast('تم تحديث حالة الطلب بنجاح', 'success');
        loadFreezeRequests();
    } catch(err) {
        console.error(err);
        showToast('حدث خطأ أثناء التحديث', 'error');
    }
}

window.resumeFrozenSubscription = async function(freezeId) {
    const confirmed = await window.showCustomConfirm(
        'هل أنت متأكد من إلغاء تجميد هذا الاشتراك واستئنافه فوراً؟ سيتم تعديل تاريخ انتهاء الاشتراك ليتناسب مع المدة الفعلية التي تم تجميدها فقط.',
        {
            title: 'استئناف الاشتراك ⚡',
            type: 'success',
            confirmText: 'نعم، استئناف الآن',
            cancelText: 'إلغاء'
        }
    );
    if (!confirmed) return;

    try {
        // 1. Fetch freeze request
        const { data: freezeReq, error: fetchErr } = await supabase
            .from('freeze_requests')
            .select('*')
            .eq('id', freezeId)
            .single();

        if (fetchErr || !freezeReq) throw new Error('تعذر العثور على طلب التجميد.');

        // 2. Fetch subscription
        const { data: sub, error: subErr } = await supabase
            .from('player_subscriptions')
            .select('*')
            .eq('id', freezeReq.subscription_id)
            .single();

        if (subErr || !sub) throw new Error('تعذر العثور على الاشتراك المرتبط.');

        // 3. Calculate elapsed days of freeze (fair rounding down)
        const elapsedMs = new Date() - new Date(freezeReq.created_at);
        const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));

        // 4. Calculate unused days to subtract from the subscription's end_date
        const unusedDays = freezeReq.days - elapsedDays;

        if (unusedDays > 0) {
            // Subtract unusedDays from end_date
            const curEndDate = new Date(sub.end_date);
            const newEndDate = new Date(curEndDate.getTime() - unusedDays * 24 * 60 * 60 * 1000);
            
            const { error: updSubErr } = await supabase
                .from('player_subscriptions')
                .update({ end_date: newEndDate.toISOString() })
                .eq('id', sub.id);

            if (updSubErr) throw updSubErr;
        }

        // 5. Shift freeze request created_at to the past by unusedDays, ending the freeze now,
        // without violating the CHECK constraint on days (> 0).
        const oldCreatedAt = new Date(freezeReq.created_at);
        const newCreatedAt = new Date(oldCreatedAt.getTime() - (unusedDays * 24 * 60 * 60 * 1000));
        
        const { error: updFreezeErr } = await supabase
            .from('freeze_requests')
            .update({ created_at: newCreatedAt.toISOString() })
            .eq('id', freezeId);

        if (updFreezeErr) throw updFreezeErr;

        // 6. Send notification to player
        await supabase.from('notifications').insert([{
            user_id: freezeReq.player_id,
            title: 'تم استئناف اشتراكك ⚡',
            content: `قام المدرب بإلغاء تجميد اشتراكك واستئنافه. تم تجميد الاشتراك لـ ${elapsedDays} يوم وتعديل تاريخ انتهاء الاشتراك وفقاً لذلك.`,
            is_read: false
        }]);

        showToast('تم استئناف الاشتراك وتعديل تاريخ الانتهاء بنجاح', 'success');
        
        // Refresh the profile modal
        openPlayerProfile(freezeReq.player_id);
        
        // Refresh player table
        loadPlayers();
    } catch(err) {
        console.error(err);
        showToast(err.message || 'حدث خطأ أثناء استئناف الاشتراك', 'error');
    }
}

// --- Phase 6: Expenses Tracker ---
async function handleExpenseSubmit(e) {
    e.preventDefault();
    if(!currentAdmin) return;
    
    const title = document.getElementById('expense-title').value;
    const amount = document.getElementById('expense-amount').value;
    const category = document.getElementById('expense-category').value;
    
    try {
        const { error } = await supabase.from('gym_expenses').insert({
            admin_id: currentAdmin.id,
            title: title,
            amount: parseFloat(amount),
            category: category
        });
        
        if (error) throw error;
        showToast('تم حفظ المصروف بنجاح', 'success');
        document.getElementById('expense-form').reset();
        loadExpenses();
    } catch(err) {
        console.error(err);
        showToast('حدث خطأ أثناء الحفظ', 'error');
    }
}

async function loadExpenses() {
    try {
        const { data: expenses, error } = await supabase
            .from('gym_expenses')
            .select('*')
            .order('expense_date', { ascending: false });
            
        if (error) throw error;
        
        const tbody = document.querySelector('#expenses-table tbody');
        tbody.innerHTML = '';
        
        if(!expenses || expenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">لا يوجد مصروفات مسجلة.</td></tr>';
            return;
        }
        
        expenses.forEach(exp => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${exp.title}</td>
                <td style="color:var(--danger); font-weight:bold;">${exp.amount} ₪</td>
                <td><span class="badge" style="background:var(--bg-surface-light);">${exp.category}</span></td>
                <td>${new Date(exp.expense_date).toLocaleDateString('ar-EG')}</td>
                <td><button class="table-action-btn btn-danger" title="حذف" onclick="deleteExpense('${exp.id}')"><i class="fa-solid fa-trash"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) {
        console.error(err);
    }
}

window.deleteExpense = async function(id) {
    const confirmed = await window.showCustomConfirm('هل أنت متأكد من حذف هذا المصروف؟', {
        title: 'حذف مصروف 🗑️',
        type: 'danger',
        confirmText: 'نعم، احذف',
        cancelText: 'إلغاء'
    });
    if (!confirmed) return;
    try {
        await supabase.from('gym_expenses').delete().eq('id', id);
        showToast('تم مسح المصروف', 'info');
        loadExpenses();
    } catch(err) {
        showToast('فشل مسح المصروف', 'error');
    }
}

// --- Phase 6: PDF Invoicing ---
window.printInvoice = async function(subId) {
    showToast('جاري تحضير الفاتورة...', 'info');
    try {
        const { data: sub, error } = await supabase
            .from('player_subscriptions')
            .select(`
                *,
                players(full_name, club_id),
                subscription_types(name, price)
            `)
            .eq('id', subId)
            .single();

        if (error || !sub) throw error;

        // Helper to format dates cleanly
        const formatDate = (dateStr) => {
            if (!dateStr) return 'N/A';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        // Populate Template
        document.getElementById('inv-id').textContent = sub.id.split('-')[0].toUpperCase();
        document.getElementById('inv-date').textContent = formatDate(new Date());
        document.getElementById('inv-player-name').textContent = sub.players.full_name;
        document.getElementById('inv-player-cid').textContent = sub.players.club_id || 'N/A';
        document.getElementById('inv-sub-name').textContent = sub.subscription_types.name;
        document.getElementById('inv-start').textContent = formatDate(sub.start_date);
        document.getElementById('inv-end').textContent = formatDate(sub.end_date);
        document.getElementById('inv-price').textContent = `${sub.subscription_types.price} ₪`;
        document.getElementById('inv-total').textContent = sub.subscription_types.price;

        const container = document.getElementById('invoice-template-container');
        container.style.display = 'block';

        // Brief timeout to ensure DOM updates and fonts map
        setTimeout(() => {
            window.print();
            container.style.display = 'none';
        }, 300);

    } catch(err) {
        console.error(err);
        showToast('فشل توليد الفاتورة', 'error');
    }
}

// --- Backup & Restore & Reset (Advanced Settings) ---
window.exportBackup = async function() {
    showToast('جاري تصدير النسخة الاحتياطية...', 'info');
    try {
        const tables = ['players', 'player_subscriptions', 'subscription_types', 'gym_expenses', 'freeze_requests', 'renewal_requests', 'workout_templates', 'workout_days', 'workout_exercises', 'player_schedules', 'messages', 'notifications'];
        let backupData = { exported_at: new Date().toISOString() };
        
        for (let table of tables) {
            const { data, error } = await supabase.from(table).select('*');
            if (error) console.error(`Error fetching table ${table}`, error);
            backupData[table] = data || [];
        }

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `mastergym_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showToast('تم تحميل النسخة بنجاح!', 'success');
    } catch(err) {
        console.error(err);
        showToast('فشل التصدير', 'error');
    }
}

window.importBackup = async function(input) {
    const file = input.files[0];
    if (!file) return;

    const confirmed = await window.showCustomConfirm('تحذير: سيتم دمج البيانات المرفوعة مع البيانات الموجودة، قد يحدث تضارب في بعض المعرفات (IDs). هل أنت متأكد من الاستمرار؟', {
        title: 'تنبيه استعادة البيانات ⚠️',
        type: 'warning',
        confirmText: 'نعم، استمر',
        cancelText: 'إلغاء'
    });
    if (!confirmed) {
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const backupRaw = JSON.parse(e.target.result);
            showToast('جاري الاستعادة، يرجى الانتظار ولا تغلق المتصفح...', 'warning');
            
            const tables = ['players', 'subscription_types', 'player_subscriptions', 'gym_expenses', 'workout_templates', 'workout_days', 'workout_exercises', 'player_schedules', 'freeze_requests', 'renewal_requests', 'messages', 'notifications'];
            
            // Loop through proper order to respect Foreign keys
            for (let table of tables) {
                if (backupRaw[table] && backupRaw[table].length > 0) {
                    const { error } = await supabase.from(table).upsert(backupRaw[table], { onConflict: 'id' });
                    if (error) console.error(`Error restoring table ${table}:`, error);
                }
            }
            showToast('✅ تمت الاستعادة بنجاح!', 'success');
        } catch (err) {
            console.error(err);
            showToast('فشلت الاستعادة. ملف غير صالح.', 'error');
        } finally {
            input.value = '';
        }
    };
    reader.readAsText(file);
}

window.resetAllData = async function() {
    const confirmed1 = await window.showCustomConfirm('⚠️ تحذير خطير جداً: هل أنت متأكد من رغبتك في حذف كافة المشتركين والبيانات الخاصة بالتطبيق؟ لا يمكن التراجع عن هذا الإجراء أبداً!', {
        title: 'تهيئة المصنع (مسح البيانات) 🚨',
        type: 'danger',
        confirmText: 'نعم، تابع التحذير',
        cancelText: 'إلغاء'
    });
    if (!confirmed1) return;

    const confirmed2 = await window.showCustomConfirm('⚠️ تأكيد أخير للمسؤول: هل أنت متأكد من إبادة جميع البيانات والملفات وتهيئة النظام بالكامل؟', {
        title: 'تأكيد أخير ونهائي 🚨',
        type: 'danger',
        confirmText: 'نعم، إبادة كافة البيانات',
        cancelText: 'إلغاء وتراجع'
    });
    if (!confirmed2) return;

    showToast('جاري مسح البيانات...', 'warning');
    
    // We target all IDs that are not dummy to clear standard rows safely
    const dummyId = '00000000-0000-0000-0000-000000000000';
    const tables = ['notifications', 'messages', 'renewal_requests', 'freeze_requests', 'player_schedules', 'workout_exercises', 'workout_days', 'workout_templates', 'gym_expenses', 'player_subscriptions', 'subscription_types', 'players'];
    
    try {
        for (let table of tables) {
            await supabase.from(table).delete().neq('id', dummyId);
        }
        showToast('✅ تم إعادة تعيين النظام بنجاح (Factory Reset).', 'success');
        loadAnalyticsDashboard(); // refreshing
        if(currentFilter) loadPlayers();
    } catch(err) {
        console.error(err);
        showToast('تعذر المسح: راجع أذونات الخادم', 'error');
    }
}

// --- Custom Notification Sender ---
window.openSendNotificationModal = async function() {
    const select = document.getElementById('notif-target-player');
    if (!select) return;
    select.innerHTML = '<option value="all">🔔 لجميع المشتركين (إشعار عام)</option>';
    try {
        const { data: players, error } = await supabase.from('players').select('id, full_name').eq('status', 'approved');
        if (!error && players) {
            players.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.full_name}</option>`;
            });
        }
    } catch(err) {}
    document.getElementById('send-notification-modal').classList.remove('hidden');
    document.getElementById('send-notification-form').reset();
}

window.closeSendNotificationModal = function() {
    document.getElementById('send-notification-modal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const notifForm = document.getElementById('send-notification-form');
    if(notifForm) {
        notifForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const targetId = document.getElementById('notif-target-player').value;
            const title = document.getElementById('notif-title').value.trim();
            const content = document.getElementById('notif-content').value.trim();
            const btn = document.getElementById('notif-submit-btn');
            btn.disabled = true; btn.textContent = 'جاري الإرسال...';
            try {
                if(targetId === 'all') {
                    const { data, error } = await supabase.from('players').select('id').eq('status', 'approved');
                    if(!error && data) {
                        const payloads = data.map(p => ({ user_id: p.id, title, content, is_read: false }));
                        await supabase.from('notifications').insert(payloads);
                    }
                } else {
                    await supabase.from('notifications').insert([{user_id: targetId, title, content, is_read: false}]);
                }
                showToast('تم إرسال الإشعار بنجاح', 'success');
                closeSendNotificationModal();
            } catch(err) {
                showToast('تعذر إرسال الإشعار', 'error');
            } finally {
                btn.disabled = false; btn.textContent = 'إرسال 📨';
            }
        });
    }
});

// --- Active Schedules Management ---
window.loadActiveSchedules = async function() {
    const tbody = document.getElementById('active-schedules-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner"></div></td></tr>';

    try {
        const { data, error } = await supabase
            .from('player_schedules')
            .select('id, created_at, players(full_name), workout_templates(name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if(!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">لا يوجد جداول معينة حالياً.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(s => {
            const date = new Date(s.created_at).toLocaleDateString('ar-EG');
            const playerName = s.players?.full_name || 'غير معروف';
            const tmplName = s.workout_templates?.name || 'قالب محذوف';
            return `
                <tr>
                    <td style="font-weight:bold;">${playerName}</td>
                    <td style="color:var(--primary);">${tmplName}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn btn-outline small" style="border-color:var(--danger); color:var(--danger);" onclick="deletePlayerSchedule('${s.id}')">إزالة 🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">تعذر جلب الجداول.</td></tr>';
    }
}

window.deletePlayerSchedule = async function(scheduleId) {
    const confirmed = await window.showCustomConfirm('هل أنت متأكد من إزالة الجدول التدريبي المعين لهذا اللاعب؟', {
        title: 'إزالة جدول اللاعب 🗑️',
        type: 'danger',
        confirmText: 'نعم، أزل الجدول',
        cancelText: 'إلغاء'
    });
    if (!confirmed) return;
    try {
        await supabase.from('player_schedules').delete().eq('id', scheduleId);
        showToast('تمت الإزالة بنجاح', 'success');
        loadActiveSchedules();
    } catch(err) {
        showToast('تعذر الإزالة', 'error');
    }
}

// --- Gamification & Points Settings ---
window.loadGamificationSettings = async function() {
    try {
        const { data, error } = await supabase.from('gamification_config').select('*');
        if (error) throw error;

        // Map keys to elements
        data.forEach(item => {
            let el = null;
            if (item.key === 'signup_bonus') el = document.getElementById('setting-signup-bonus');
            else if (item.key === 'weight_loss_points_per_kg') el = document.getElementById('setting-weight-loss');
            else if (item.key === 'early_attendance_points') el = document.getElementById('setting-early-attendance');
            else if (item.key === 'early_attendance_time') el = document.getElementById('setting-early-time');
            else if (item.key === 'default_subscription_points') el = document.getElementById('setting-default-sub');

            if (el) el.value = item.value;
        });

        // Load EmailJS Template ID from localStorage
        const emailjsId = localStorage.getItem('emailjs_template_id') || 'template_ewaunpn';
        const emailjsEl = document.getElementById('emailjs-template-id');
        if (emailjsEl) {
            emailjsEl.value = emailjsId;
        }
    } catch (err) {
        console.error('Error loading gamification settings:', err);
    }
}

window.saveGamificationSettings = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ... ⏳';

    const signup = document.getElementById('setting-signup-bonus').value;
    const loss = document.getElementById('setting-weight-loss').value;
    const attendance = document.getElementById('setting-early-attendance').value;
    const time = document.getElementById('setting-early-time').value;
    const defaultSub = document.getElementById('setting-default-sub').value;

    const updates = [
        { key: 'signup_bonus', value: signup },
        { key: 'weight_loss_points_per_kg', value: loss },
        { key: 'early_attendance_points', value: attendance },
        { key: 'early_attendance_time', value: time },
        { key: 'default_subscription_points', value: defaultSub }
    ];

    try {
        const { error } = await supabase.from('gamification_config').upsert(updates);
        if (error) throw error;
        showToast('تم حفظ إعدادات نظام النقاط بنجاح! 🎮', 'success');
    } catch (err) {
        showToast('حدث خطأ أثناء حفظ الإعدادات', 'error');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = oldText;
    }
}

window.adjustPlayerPoints = async function(playerId) {
    const amountInput = document.getElementById('reward-points-amount');
    const reasonInput = document.getElementById('reward-points-reason');
    if (!amountInput || !reasonInput) return;
    
    const amount = parseInt(amountInput.value);
    const reason = reasonInput.value.trim();
    if (isNaN(amount) || !reason) {
        showToast('يرجى ملء جميع الحقول بشكل صحيح', 'warning');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('points_transactions')
            .insert({
                player_id: playerId,
                amount: amount,
                reason: reason
            });
            
        if (error) throw error;
        
        // Push notification to the player
        await supabase.from('notifications').insert([{
            user_id: playerId,
            title: amount > 0 ? '🏆 حصلت على نقاط مكافأة جديدة!' : '⚠️ تم تعديل نقاطك من الإدارة',
            content: `قام الأدمن بتعديل نقاطك بـ (${amount > 0 ? '+' : ''}${amount}) نقطة. السبب: ${reason}`,
            is_read: false
        }]);
        
        showToast('تم تعديل نقاط اللاعب بنجاح! 🏆', 'success');
        
        // Reload player profile modal
        openPlayerProfile(playerId);
    } catch(err) {
        showToast('حدث خطأ أثناء تعديل النقاط', 'error');
        console.error(err);
    }
}

// --- EmailJS Settings Save ---
window.saveEmailJSTemplateId = function() {
    const input = document.getElementById('emailjs-template-id');
    if (input) {
        const val = input.value.trim();
        localStorage.setItem('emailjs_template_id', val);
        showToast('تم حفظ معرف قالب EmailJS بنجاح 💾', 'success');
    }
};

// --- Password Reset Request Management ---
window.loadPasswordResets = async function() {
    const container = document.getElementById('password-resets-body');
    if (!container) return;

    container.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner"></div></td></tr>';

    try {
        const { data, error } = await supabase
            .from('password_reset_requests')
            .select('*, players(id, full_name, phone_number, email)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center text-muted">لا يوجد طلبات إعادة تعيين حالية.</td></tr>';
            return;
        }

        container.innerHTML = data.map(req => {
            const player = req.players || {};
            const date = new Date(req.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
            
            let statusBadge = '';
            let actionButtons = '';

            if (req.status === 'pending') {
                statusBadge = '<span class="badge pending">بانتظار الموافقة</span>';
                actionButtons = `
                    <div class="table-actions" style="display:flex; gap:5px; justify-content:center;">
                        <button class="table-action-btn btn-success" title="موافقة" onclick="openAdminResetModal('${req.id}', '${player.full_name || ''}', '${player.email || ''}')" style="background:#10b981; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-check"></i></button>
                        <button class="table-action-btn btn-danger" title="رفض" onclick="rejectPasswordReset('${req.id}')" style="background:#ef4444; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                `;
            } else if (req.status === 'approved') {
                statusBadge = '<span class="badge approved">موافق عليه</span>';
                actionButtons = `
                    <div class="table-actions" style="display:flex; gap:5px; justify-content:center;">
                        <button class="table-action-btn btn-warning" title="إعادة تعيين وإرسال" onclick="openAdminResetModal('${req.id}', '${player.full_name || ''}', '${player.email || ''}')" style="background:#f59e0b; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-rotate-left"></i> إعادة تعيين</button>
                    </div>
                `;
            } else {
                statusBadge = '<span class="badge rejected">مرفوض</span>';
                actionButtons = `
                    <div class="table-actions" style="display:flex; gap:5px; justify-content:center;">
                        <button class="table-action-btn btn-success" title="موافقة وتعيين" onclick="openAdminResetModal('${req.id}', '${player.full_name || ''}', '${player.email || ''}')" style="background:#10b981; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-check"></i> موافقة</button>
                    </div>
                `;
            }

            return `
                <tr>
                    <td style="font-weight: bold; color: white;">${player.full_name || 'غير معروف'}</td>
                    <td dir="ltr" style="text-align: right;">${player.phone_number || '---'}</td>
                    <td style="color: var(--text-muted);">${player.email || '---'}</td>
                    <td>${date}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align:center;">${actionButtons}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = '<tr><td colspan="6" class="text-center text-danger">حدث خطأ أثناء تحميل الطلبات.</td></tr>';
    }
};

window.openAdminResetModal = function(requestId, playerName, playerEmail) {
    const modal = document.getElementById('admin-reset-confirm-modal');
    if (!modal) return;
    
    document.getElementById('reset-modal-request-id').value = requestId;
    document.getElementById('reset-modal-player-name').textContent = playerName;
    
    const emailInput = document.getElementById('reset-modal-email');
    if (emailInput) {
        emailInput.value = playerEmail || '';
    }
    
    modal.classList.remove('hidden');
};

window.closeAdminResetModal = function() {
    const modal = document.getElementById('admin-reset-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.rejectPasswordReset = async function(requestId) {
    if (!confirm('هل أنت متأكد من رفض هذا الطلب؟')) return;

    try {
        const { error } = await supabase
            .from('password_reset_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId);

        if (error) throw error;

        showToast('تم رفض طلب إعادة التعيين بنجاح', 'success');
        loadPasswordResets();
    } catch (err) {
        console.error(err);
        showToast('حدث خطأ أثناء رفض الطلب', 'error');
    }
};

window.handleAdminResetSubmit = async function(event) {
    if (event) event.preventDefault();
    
    const requestId = document.getElementById('reset-modal-request-id').value;
    const emailInput = document.getElementById('reset-modal-email');
    const email = emailInput ? emailInput.value.trim() : '';
    
    if (!requestId || !email) {
        showToast('يرجى إدخال بريد إلكتروني صحيح', 'warning');
        return;
    }
    
    const form = document.getElementById('admin-reset-confirm-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'جاري المعالجة... ⏳';

    try {
        // 1. Get request context
        const { data: request, error: reqError } = await supabase
            .from('password_reset_requests')
            .select('*, players(*)')
            .eq('id', requestId)
            .single();

        if (reqError) throw reqError;
        
        const player = request.players;
        if (!player) throw new Error('لم يتم العثور على بيانات اللاعب');

        // 2. Generate new password (6 characters uppercase alphanumeric)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let generatedPassword = '';
        for (let i = 0; i < 6; i++) {
            generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // 3. Update player row
        const { error: playerUpdateError } = await supabase
            .from('players')
            .update({ password: generatedPassword, email: email })
            .eq('id', player.id);

        if (playerUpdateError) throw playerUpdateError;

        // 4. Update request status to 'approved'
        const { error: statusUpdateError } = await supabase
            .from('password_reset_requests')
            .update({ status: 'approved' })
            .eq('id', requestId);

        if (statusUpdateError) throw statusUpdateError;

        // 5. Create player notification
        await supabase.from('notifications').insert([{
            user_id: player.id,
            title: '🔑 تم إعادة تعيين كلمة المرور',
            content: `تمت الموافقة على طلب إعادة تعيين كلمة المرور. تم إرسال كلمة المرور الجديدة إلى بريدك الإلكتروني: ${email}`,
            is_read: false
        }]);

        // 6. Send email via EmailJS
        const templateId = localStorage.getItem('emailjs_template_id') || 'template_ewaunpn';
        if (!templateId) {
            showToast('تحذير: لم يتم تكوين معرف قالب EmailJS في الإعدادات. تم تحديث كلمة المرور في قاعدة البيانات فقط.', 'warning');
        } else {
            const now = new Date();
            const timeString = now.toLocaleString('ar-EG', { dateStyle: 'long', timeStyle: 'short' });
            const emailMessage = `أهلاً بك ${player.full_name}،\n\nبناءً على طلبك، تم إعادة تعيين كلمة المرور الخاصة بحسابك في نادي ماستر جيم.\n\nبيانات الدخول الجديدة الخاصة بك هي:\nرقم الهاتف (اسم المستخدم): ${player.phone_number}\nكلمة المرور الجديدة: ${generatedPassword}\n\nيرجى استخدام هذه البيانات لتسجيل الدخول وتغيير كلمة المرور الخاصة بك من الملف الشخصي بعد الدخول للحفاظ على أمان حسابك.\n\nنتمنى لك تمريناً رائعاً!\nإدارة نادي ماستر جيم.`;

            const emailPayload = {
                service_id: 'service_n67hiwy',
                template_id: templateId,
                user_id: '2WY2D7r_zIHKh4KZW',
                template_params: {
                    to_email: email,
                    name: player.full_name,
                    time: timeString,
                    message: emailMessage
                }
            };

            const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailPayload)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`فشل إرسال البريد الإلكتروني عبر EmailJS: ${errText}`);
            }
        }

        showToast('تمت الموافقة وإعادة التعيين وإرسال البريد الإلكتروني بنجاح! 🔑', 'success');
        closeAdminResetModal();
        loadPasswordResets();

    } catch (err) {
        console.error(err);
        showToast('حدث خطأ أثناء معالجة الطلب: ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
};
