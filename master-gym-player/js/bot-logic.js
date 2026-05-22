// إعداد الرابط الأساسي للسيرفر (تم ربطه بسيرفر Render بنجاح)
const BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:3000" 
    : "https://master-gym.onrender.com";

const API_URL = `${BASE_URL}/api/chat`;
const STORAGE_CHAT = "zaid_ai_chat_v2";
const STORAGE_MEM = "zaid_ai_memory_v2";
const CORE_MEMORY = [];
// ملاحظة: الذاكرة المحلية فارغة عمداً. 
// هوية اللاعب وبياناته تأتي من قاعدة البيانات عبر الخادم.
const DEFAULT_MEMORY = [];

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const main = document.getElementById("main");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const memContent = document.getElementById("memory-content");
const serverStatus = document.getElementById("server-status");
const mobileStatus = document.getElementById("mobile-status");
const modelName = document.getElementById("model-name");

let memory = readStorage(STORAGE_MEM, DEFAULT_MEMORY);
let chatHistory = readStorage(STORAGE_CHAT, []);
let isSending = false;
let retryAt = 0;

// ملف اللاعب: يقرأ player_id أو gym_player_id للاستمرارية
let loggedInPlayerId = localStorage.getItem("player_id") || localStorage.getItem("gym_player_id");
let loggedInAdminId = null; // لاعب وليس مدير
let isLoginMode = true;

function checkAuth() {
    if (loggedInAdminId) {
        document.getElementById("auth-overlay").style.display = "none";
        document.getElementById("player-name-display").textContent = "المدير (Admin)";
        document.getElementById("player-points-display").textContent = "∞";
        return;
    }
    if (!loggedInPlayerId) {
        document.getElementById("auth-overlay").style.display = "flex";
        document.getElementById("player-name-display").textContent = "غير مسجل";
        document.getElementById("player-points-display").textContent = "0";
    } else {
        document.getElementById("auth-overlay").style.display = "none";
        document.getElementById("player-name-display").textContent = localStorage.getItem("gym_player_name") || "لاعب";
        document.getElementById("player-points-display").textContent = localStorage.getItem("gym_player_points") || "0";
    }
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById("auth-title").textContent = isLoginMode ? "تسجيل الدخول - نادي الكرك" : "حساب جديد - نادي الكرك";
    document.getElementById("auth-register-fields").style.display = isLoginMode ? "none" : "block";
    document.getElementById("auth-submit-btn").textContent = isLoginMode ? "دخول" : "تسجيل";
    document.getElementById("auth-switch-text").textContent = isLoginMode ? "ليس لديك حساب؟ سجل كلاعب جديد" : "لديك حساب؟ قم بتسجيل الدخول";
    document.getElementById("auth-error").style.display = "none";
}

async function handleAuthSubmit() {
    const phone = document.getElementById("auth-phone").value.trim();
    const password = document.getElementById("auth-password").value.trim();
    const fullName = document.getElementById("auth-fullname").value.trim();
    const errorDiv = document.getElementById("auth-error");

    if (!phone || !password || (!isLoginMode && !fullName)) {
        errorDiv.textContent = "الرجاء تعبئة جميع الحقول المطلوبة.";
        errorDiv.style.display = "block";
        return;
    }

    const endpoint = isLoginMode ? "/api/login" : "/api/register";
    const payload = isLoginMode ? { phone_number: phone, password } : { phone_number: phone, password, full_name: fullName };

    try {
        document.getElementById("auth-submit-btn").disabled = true;
        const res = await fetch(BASE_URL + endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "حدث خطأ غير معروف.");
        }

        localStorage.setItem("player_id", data.player.id);
        localStorage.setItem("gym_player_id", data.player.id);
        localStorage.setItem("gym_player_name", data.player.full_name);
        localStorage.setItem("gym_player_points", data.player.points || 0);
        loggedInPlayerId = data.player.id;
        
        checkAuth();
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = "block";
    } finally {
        document.getElementById("auth-submit-btn").disabled = false;
    }
}

function logout() {
    if (loggedInAdminId) {
        window.location.href = "admin.html";
        return;
    }
    localStorage.removeItem("player_id");
    localStorage.removeItem("gym_player_id");
    localStorage.removeItem("gym_player_name");
    localStorage.removeItem("gym_player_points");
    loggedInPlayerId = null;
    chatHistory = [];
    saveChat();
    renderChat();
    checkAuth();
    window.location.href = "index.html";
}

function readStorage(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(value) ? value : fallback.slice();
    } catch (error) {
        return fallback.slice();
    }
}

function init() {
    if (window !== window.top) {
        const logoutBtn = document.querySelector('.cmd-item[onclick="logout()"]');
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
    checkAuth();
    updateMemCount();
    renderMemoryList();
    restoreChat();
    autoResize(userInput);
    fetchHealth();
}

function fetchHealth() {
    fetch(BASE_URL + "/health")
        .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                throw new Error(data?.error || "تعذر فحص الخادم");
            }

            const model = data?.model || "غير معروف";
            const isOnline = Boolean(data?.ready ?? data?.hasApiKey);

            if (modelName) modelName.textContent = model;
            setStatus(
                isOnline ? "Gemini متصل وجاهز" : "Gemini غير جاهز أو المفتاح غير مضبوط",
                isOnline ? "online" : "offline"
            );
        })
        .catch(() => {
            if (modelName) modelName.textContent = "غير متاح";
            setStatus("الخادم غير متصل", "offline");
        });
}

function setStatus(text, state) {
    [serverStatus, mobileStatus].forEach((element) => {
        element.textContent = text;
        element.className = `status-pill ${state}`;
    });
}

async function restoreChat() {
    chatBox.innerHTML = "";
    
    if (loggedInPlayerId) {
        try {
            const res = await fetch(`${BASE_URL}/api/chat/history?playerId=${loggedInPlayerId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.history && data.history.length > 0) {
                    chatHistory = data.history;
                    saveChat();
                }
            }
        } catch (e) {
            console.error("Failed to load chat history from DB", e);
        }
    }

    if (!chatHistory.length) {
        updateEmptyState();
        return;
    }

    chatHistory.forEach((message) => {
        renderMessage(
            message.content,
            message.role,
            false,
            message.meta,
            false,
            Array.isArray(message.sources) ? message.sources : []
        );
    });

    updateEmptyState();
    scrollChatToBottom();
}

function updateEmptyState() {
    main.classList.toggle("is-empty", chatHistory.length === 0);
}

function scrollChatToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Dummy renderChat for compatibility (called in logout but might not be defined or used)
function renderChat() {
    chatBox.innerHTML = "";
}

function getRemainingRetrySeconds() {
    const diff = retryAt - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
}

function normalizeFact(item) {
    return String(item || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function getKnownUserFacts() {
    const merged = [];
    const seen = new Set();

    for (const item of [...CORE_MEMORY, ...memory]) {
        const normalized = normalizeFact(item);
        if (!normalized || seen.has(normalized)) {
            continue;
        }

        seen.add(normalized);
        merged.push(String(item).trim());
    }

    return merged;
}

function buildSystemPrompt() {
    const now = new Date();
    const dateText = now.toLocaleDateString("ar-SA", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
    const timeText = now.toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit"
    });

    // هذا ملف اللاعب — دائماً نستخدم سياق اللاعب
    if (loggedInPlayerId) {
        return [
            'أنت "ماستر جيم AI"، المساعد الرياضي الشخصي للاعب في نادي ماستر جيم.',
            `التاريخ: ${dateText} | الوقت: ${timeText}`,
            'أنت تتحدث مع لاعب (مشترك عادي). ستصلك بياناته الشخصية من الخادم (اشتراكه، وزنه، برنامجه التدريبي). استخدمها للإجابة بدقة. لا تعطِ صلاحيات إدارية.',
            '--- صلاحيات اللاعب ---',
            'يمكنك تقديم طلب تجميد الاشتراك نيابةً عن اللاعب عبر أداة submit_freeze_request.',
            'هوية اللاعب يحددها الخادم تلقائياً، لا تحتاج لتمريرها.',
            'الأداة تحتاج فقط: days (عدد الأيام) و reason (السبب).',
            'إذا لم يحدد اللاعب عدد الأيام، اسأله عن المدة المطلوبة.',
            'إذا لم يذكر سبباً، اسأله عن السبب قبل التقديم.',
            'بعد تقديم الطلب بنجاح، أخبره أن الطلب أُرسل للكوتش وينتظر الموافقة.',
            'الحد الأقصى للتجميد 30 يوم، والحد الأدنى يوم واحد.'
        ].join('\n\n');
    }

    // بدون تسجيل دخول: استخدم الذاكرة المحلية
    const knownFacts = getKnownUserFacts();
    const memoryLines = knownFacts.length
        ? knownFacts.map((item, index) => `${index + 1}. ${item}`).join("\n")
        : "لا توجد معلومات محفوظة بعد.";

    return [
        'أنت "ماستر جيم AI"، مساعد رياضي ذكي لنادي ماستر جيم.',
        "تحدث بالعربية دائمًا وكن محفزاً وإيجابياً.",
        `التاريخ: ${dateText}`,
        `الوقت: ${timeText}`,
        "معلومات محفوظة محلياً:",
        memoryLines
    ].join("\n\n");
}

function toGeminiContents() {
    return chatHistory.slice(-20).map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }]
    }));
}

function normalizeCommandText(text) {
    return text
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[؟!.,:؛]+$/g, "");
}

function shouldUseWebSearch(text) {
    const normalized = text.toLowerCase();
    const patterns = [
        /ابحث/,
        /الانترنت/,
        /الإنترنت/,
        /النت/,
        /اليوم/,
        /الان/,
        /الآن/,
        /حاليا/,
        /حاليًا/,
        /اخر/,
        /آخر/,
        /اخبار/,
        /أخبار/,
        /جديد/,
        /news/,
        /latest/,
        /current/,
        /today/,
        /سعر/,
        /أسعار/,
        /اسعار/,
        /نتيجة/,
        /نتائج/,
        /مباراة/,
        /مباريات/,
        /الطقس/,
        /ترند/,
        /trend/,
        /موعد/,
        /من هو الرئيس/,
        /مين هو الرئيس/
    ];

    return patterns.some((pattern) => pattern.test(normalized));
}

function normalizeSources(sources) {
    if (!Array.isArray(sources)) {
        return [];
    }

    const result = [];
    const seen = new Set();

    for (const source of sources) {
        const url = typeof source?.url === "string" ? source.url.trim() : "";
        const title = typeof source?.title === "string" ? source.title.trim() : "";

        if (!url || seen.has(url)) {
            continue;
        }

        seen.add(url);
        result.push({
            title: title || url,
            url
        });
    }

    return result;
}

function maybeHandleLocalCommand(rawText) {
    const text = normalizeCommandText(rawText);

    if (!text) {
        return null;
    }

    const saveMatch = text.match(/^احفظ عني[:：]?\s*(.+)$/);
    if (saveMatch) {
        const info = saveMatch[1].trim();
        if (!info) {
            return {
                reply: "اكتب المعلومة التي تريد حفظها بعد عبارة: احفظ عني:",
                meta: "الذاكرة المحلية"
            };
        }

        memory.push(info);
        saveMemory();
        updateMemCount();
        renderMemoryList();

        return {
            reply: `تم حفظ هذه المعلومة محليًا: **${info}**`,
            meta: "الذاكرة المحلية"
        };
    }

    if (text === "امسح كل ما تعرفه عني" || text === "امسح معلوماتي") {
        memory = [];
        saveMemory();
        updateMemCount();
        renderMemoryList();

        return {
            reply: "تم مسح المعلومات الإضافية المحفوظة محليًا. سأظل أعرف أن اسمك زيد ويمكنك إضافة معلومات جديدة وقتما تريد.",
            meta: "الذاكرة المحلية"
        };
    }

    if (text === "ما الذي تعرفه عني" || text === "ما تعرفه عني") {
        const knownFacts = getKnownUserFacts();
        return {
            reply: knownFacts.length
                ? `هذه المعلومات المحلية المحفوظة:\n\n${knownFacts.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n💡 للحصول على بياناتك الكاملة من قاعدة البيانات، اسأل: "من أنا؟" أو "معلوماتي"`
                : "لا توجد معلومات محلية محفوظة. اسأل 'من أنا؟' للحصول على بياناتك من قاعدة البيانات.",
            meta: "الذاكرة المحلية"
        };
    }

    const deleteMatch = text.match(/^امسح\s+(.+)$/);
    if (deleteMatch) {
        const query = deleteMatch[1].trim().toLowerCase();
        const before = memory.length;
        memory = memory.filter((item) => !item.toLowerCase().includes(query));
        const deletedCount = before - memory.length;

        if (deletedCount > 0) {
            saveMemory();
            updateMemCount();
            renderMemoryList();
        }

        return {
            reply: deletedCount
                ? `تم حذف ${deletedCount} من العناصر المرتبطة بـ "${deleteMatch[1].trim()}".`
                : `لم أجد أي معلومة محفوظة تطابق "${deleteMatch[1].trim()}".`,
            meta: "الذاكرة المحلية"
        };
    }

    return null;
}

async function sendMessage() {
    if (isSending) {
        return;
    }

    const text = userInput.value.trim();
    if (!text) {
        return;
    }

    const remainingRetrySeconds = getRemainingRetrySeconds();
    if (remainingRetrySeconds > 0) {
        renderAssistant(
            `تم الوصول مؤقتًا لحد الاستخدام. انتظر حوالي ${remainingRetrySeconds} ثانية ثم أعد المحاولة.`,
            "تنبيه الاستخدام",
            true
        );
        return;
    }

    const enableSearch = shouldUseWebSearch(text);

    renderMessage(text, "user", true);
    chatHistory.push({ role: "user", content: text });
    saveChat();
    updateEmptyState();

    userInput.value = "";
    autoResize(userInput);

    const localReply = maybeHandleLocalCommand(text);
    if (localReply) {
        renderAssistant(localReply.reply, localReply.meta);
        chatHistory.push({
            role: "assistant",
            content: localReply.reply,
            meta: localReply.meta,
            sources: []
        });
        saveChat();
        updateEmptyState();
        closeSidebarOnMobile();
        return;
    }

    isSending = true;
    userInput.disabled = true;
    sendBtn.disabled = true;
    closeSidebarOnMobile();

    const typingElement = showTyping();

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                playerId: loggedInPlayerId || null,
                adminId: null, // ملف اللاعب: لا نرسل adminId أبداً
                systemInstruction: {
                    parts: [{ text: buildSystemPrompt() }]
                },
                contents: toGeminiContents(),
                enableSearch,
                generationConfig: {
                    temperature: 0.7
                }
            })
        });

        const data = await response.json().catch(() => ({}));
        removeTyping(typingElement);

        if (!response.ok) {
            if (Number.isFinite(data?.retryAfterSeconds)) {
                retryAt = Date.now() + (data.retryAfterSeconds * 1000);
            }
            throw new Error(data?.error || `HTTP ${response.status}`);
        }

        const reply = (data?.reply || "").trim();
        if (!reply) {
            throw new Error("لم يصل رد صالح من الخادم.");
        }

        const sources = normalizeSources(data?.sources);
        const meta = data?.searchUsed
            ? "مدعوم ببحث الإنترنت"
            : "رد من الخادم المحلي";

        renderAssistant(reply, meta, false, sources);
        chatHistory.push({
            role: "assistant",
            content: reply,
            meta,
            sources
        });
        saveChat();
    } catch (error) {
        renderAssistant(`تعذر إكمال الطلب: ${error.message}`, "خطأ", true);
    } finally {
        isSending = false;
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
        updateEmptyState();
    }
}

function renderMessage(text, role, shouldScroll, meta, isError, sources = []) {
    const wrapper = document.createElement("div");
    wrapper.className = `msg-wrap ${role === "user" ? "user" : "ai"}`;

    const avatar = document.createElement("div");
    avatar.className = `msg-avatar ${role === "user" ? "user" : "ai"}`;
    avatar.textContent = role === "user" ? "أنت" : "AI";

    const content = document.createElement("div");
    content.className = `message ${role === "user" ? "user-msg" : "bot-msg"}${isError ? " error" : ""}`;

    if (role === "assistant" && meta) {
        const metaLine = document.createElement("div");
        metaLine.className = "bot-meta";
        metaLine.textContent = meta;
        content.appendChild(metaLine);
    }

    const body = document.createElement("div");
    body.innerHTML = formatText(text);
    content.appendChild(body);

    if (role === "assistant" && sources.length) {
        appendSources(content, sources);
    }

    if (role === "assistant" && !isError) {
        addCopyButton(content, text);
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(content);
    chatBox.appendChild(wrapper);

    if (shouldScroll) {
        scrollChatToBottom();
    }
}

function renderAssistant(text, meta, isError = false, sources = []) {
    renderMessage(text, "assistant", true, meta, isError, sources);
}

// Helper renderChat to avoid errors in logout function
function renderChat() {
    chatBox.innerHTML = "";
}

function addCopyButton(container, textToCopy) {
    const button = document.createElement("button");
    button.className = "copy-btn";
    button.textContent = "نسخ الرد";

    button.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            button.textContent = "تم النسخ";
            setTimeout(() => {
                button.textContent = "نسخ الرد";
            }, 1800);
        } catch (error) {
            button.textContent = "تعذر النسخ";
            setTimeout(() => {
                button.textContent = "نسخ الرد";
            }, 1800);
        }
    });

    container.appendChild(button);
}

function appendSources(container, sources) {
    const box = document.createElement("div");
    box.className = "sources-box";

    const title = document.createElement("div");
    title.className = "sources-title";
    title.textContent = "المصادر";
    box.appendChild(title);

    const list = document.createElement("div");
    list.className = "sources-list";

    sources.slice(0, 6).forEach((source, index) => {
        const link = document.createElement("a");
        link.className = "source-link";
        link.href = source.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = `${index + 1}. ${source.title}`;
        list.appendChild(link);
    });

    box.appendChild(list);
    container.appendChild(box);
}

function showTyping() {
    const wrapper = document.createElement("div");
    wrapper.className = "msg-wrap ai";
    wrapper.id = "typing-indicator";

    const avatar = document.createElement("div");
    avatar.className = "msg-avatar ai";
    avatar.textContent = "AI";

    const content = document.createElement("div");
    content.className = "message bot-msg";
    content.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

    wrapper.appendChild(avatar);
    wrapper.appendChild(content);
    chatBox.appendChild(wrapper);
    scrollChatToBottom();

    return wrapper;
}

function removeTyping(element) {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function formatText(text) {
    const codeBlocks = [];

    let html = escapeHtml(text).replace(/```([\s\S]*?)```/g, (_, code) => {
        const block = `<pre class="code-block"><code>${code.trim()}</code></pre>`;
        codeBlocks.push(block);
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    html = html
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>");

    html = html.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => codeBlocks[Number(index)] || "");

    return html;
}

function renderMemoryList() {
    const list = document.getElementById("memory-list");
    list.innerHTML = "";

    if (!memory.length) {
        list.innerHTML = '<div class="empty-mem">لا توجد معلومات محفوظة بعد.</div>';
        return;
    }

    memory.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "memory-item";

        const text = document.createElement("span");
        text.textContent = item;

        const removeButton = document.createElement("button");
        removeButton.className = "del-mem";
        removeButton.textContent = "✕";
        removeButton.addEventListener("click", () => deleteMemoryItem(index));

        row.appendChild(text);
        row.appendChild(removeButton);
        list.appendChild(row);
    });
}

function deleteMemoryItem(index) {
    memory.splice(index, 1);
    saveMemory();
    updateMemCount();
    renderMemoryList();
}

function addMemory() {
    const input = document.getElementById("new-mem-input");
    const value = input.value.trim();

    if (!value) {
        return;
    }

    memory.push(value);
    saveMemory();
    updateMemCount();
    renderMemoryList();
    input.value = "";
}

function updateMemCount() {
    document.getElementById("mem-count").textContent = String(memory.length);
}

function saveChat() {
    try {
        localStorage.setItem(STORAGE_CHAT, JSON.stringify(chatHistory.slice(-100)));
    } catch (error) {
        console.error("Failed to save chat:", error);
    }
}

function saveMemory() {
    try {
        localStorage.setItem(STORAGE_MEM, JSON.stringify(memory));
    } catch (error) {
        console.error("Failed to save memory:", error);
    }
}

function clearChat() {
    chatHistory = [];
    saveChat();
    chatBox.innerHTML = "";
    updateEmptyState();
    closeSidebarOnMobile();
}

function handleKey(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function handleMemoryKey(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        addMemory();
    }
}

function autoResize(element) {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
}

function quickCmd(text) {
    userInput.value = text;
    autoResize(userInput);
    userInput.focus();
    closeSidebarOnMobile();
}

function toggleMemoryList() {
    memContent.classList.toggle("show");
    document.getElementById("mem-arrow").textContent = memContent.classList.contains("show") ? "▲" : "▼";
}

function toggleSidebar(forceOpen) {
    const shouldOpen = typeof forceOpen === "boolean"
        ? forceOpen
        : !sidebar.classList.contains("open");

    sidebar.classList.toggle("open", shouldOpen);
    sidebarOverlay.classList.toggle("show", shouldOpen);
}

function closeSidebarOnMobile() {
    if (window.innerWidth <= 900) {
        toggleSidebar(false);
    }
}

window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
        toggleSidebar(false);
    }
});

init();
