const http = require("http");
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const PORT = Number(process.env.PORT || 3000);
const ENV_PATH = path.join(__dirname, ".env");
loadEnvFile(ENV_PATH);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== "YOUR_SUPABASE_URL") {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer(async (req, res) => {
    // إعدادات CORS للسماح بالاتصال من Netlify أو أي نطاق آخر
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');

    // الرد المباشر على طلبات OPTIONS (Preflight) المطلوبة للمتصفحات
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    try {
        const parsedUrl = req.url.split('?')[0];
        console.log(`[${new Date().toISOString()}] ${req.method} ${parsedUrl}`);

        if (req.method === "GET" && parsedUrl === "/health") {
            return handleHealth(res);
        }

        // تجاهل طلبات source maps لمنع تحذيرات DevTools
        if (parsedUrl.endsWith('.map')) {
            res.writeHead(204);
            return res.end();
        }

        // Favicon - أيقونة الموقع
        if (parsedUrl === '/favicon.ico') {
            // SVG بسيط كـ favicon
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#f97316"/><text x="16" y="22" text-anchor="middle" font-size="18" font-weight="bold" fill="white" font-family="Arial">M</text></svg>`;
            res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' });
            return res.end(svg);
        }


        if (req.method === "POST" && parsedUrl === "/api/chat") {
            return handleChat(req, res);
        }

        if (req.method === "GET" && parsedUrl.startsWith("/api/chat/history")) {
            return handleChatHistory(req, res);
        }

        if (req.method === "POST" && parsedUrl === "/api/login") {
            return handleLogin(req, res);
        }

        if (req.method === "POST" && parsedUrl === "/api/register") {
            return handleRegister(req, res);
        }

        if (req.method === "GET") {
            let filePath = path.join(__dirname, parsedUrl);

            // توجيه ذكي للمجلدات والملفات
            if (parsedUrl === '/' || parsedUrl === '/index.html') {
                filePath = path.join(__dirname, 'index.html');
            } else if (parsedUrl === '/bot.html') {
                filePath = path.join(__dirname, 'bot.html');
            } else if (parsedUrl === '/admin' || parsedUrl === '/admin/' || parsedUrl === '/player' || parsedUrl === '/player/') {
                res.writeHead(301, { 'Location': '/' });
                return res.end();
            }
            
            // Basic security to prevent directory traversal
            if (!filePath.startsWith(__dirname)) {
                res.writeHead(403);
                return res.end("Forbidden");
            }

            let extname = String(path.extname(filePath)).toLowerCase();
            let contentType = mimeTypes[extname] || 'application/octet-stream';

            fs.readFile(filePath, function(error, content) {
                if (error) {
                    if(error.code == 'ENOENT') {
                        res.writeHead(404);
                        res.end("Not Found");
                    }
                    else {
                        res.writeHead(500);
                        res.end('Server Error: ' + error.code);
                    }
                }
                else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                }
            });
            return;
        }

        return sendJson(res, 404, { error: "المسار غير موجود." });
    } catch (error) {
        console.error("Unexpected server error:", error);
        return sendJson(res, 500, { error: "حدث خطأ غير متوقع داخل الخادم." });
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return;
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    const lines = fileContent.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex === -1) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const rawValue = trimmed.slice(separatorIndex + 1).trim();
        const value = rawValue.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");

        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}



async function handleLogin(req, res) {
    if (!supabase) return sendJson(res, 500, { error: "Supabase غير مفعل في الخادم." });
    try {
        const body = await readJsonBody(req);
        const { phone_number, password } = body;
        if (!phone_number || !password) return sendJson(res, 400, { error: "رقم الهاتف وكلمة المرور مطلوبان." });

        const { data, error } = await supabase
            .from('players')
            .select('id, full_name, points')
            .eq('phone_number', phone_number)
            .eq('password', password)
            .single();

        if (error || !data) {
            return sendJson(res, 401, { error: "رقم الهاتف أو كلمة المرور غير صحيحة." });
        }

        return sendJson(res, 200, { player: data });
    } catch (e) {
        console.error("Login error:", e);
        return sendJson(res, 500, { error: "خطأ في تسجيل الدخول." });
    }
}

async function handleRegister(req, res) {
    if (!supabase) return sendJson(res, 500, { error: "Supabase غير مفعل في الخادم." });
    try {
        const body = await readJsonBody(req);
        const { full_name, phone_number, password, gender, email } = body;
        if (!full_name || !phone_number || !password) return sendJson(res, 400, { error: "جميع الحقول مطلوبة." });

        const { data, error } = await supabase
            .from('players')
            .insert({ 
                full_name, 
                phone_number, 
                password,
                gender: gender || 'ذكر',
                email: email || null
            })
            .select('id, full_name, points')
            .single();

        if (error) {
            return sendJson(res, 400, { error: "رقم الهاتف أو الاسم مستخدم مسبقاً." });
        }

        return sendJson(res, 200, { player: data });
    } catch (e) {
        console.error("Register error:", e);
        return sendJson(res, 500, { error: "خطأ في التسجيل." });
    }
}

async function handleHealth(res) {
    const hasGemini = Boolean(GEMINI_API_KEY);

    return sendJson(res, 200, {
        ok: true,
        provider: "gemini",
        model: GEMINI_MODEL,
        ready: hasGemini,
        hasApiKey: hasGemini
    });
}

async function handleChat(req, res) {
    let body;

    try {
        body = await readJsonBody(req);
    } catch (error) {
        return sendJson(res, 400, { error: "الطلب ليس JSON صالحًا." });
    }

    const contents = body?.contents;
    if (!Array.isArray(contents) || contents.length === 0) {
        return sendJson(res, 400, {
            error: "يجب إرسال contents كمصفوفة غير فارغة."
        });
    }

    const searchRequested = body?.enableSearch === true;
    const searchQuery = searchRequested ? buildSearchQuery(contents) : "";

    let searchResults = [];
    if (searchQuery) {
        try {
            searchResults = await searchWeb(searchQuery);
        } catch (error) {
            console.error("Web search failed:", error);
        }
    }

    const playerId = body?.playerId;
    const adminId = body?.adminId;
    let playerContext = "";
    let adminContext = "";

    // ==========================================
    // سياق المدير / الكوتش: يرى كل شيء
    // ==========================================
    if (supabase && adminId) {
        try {
            const { count: totalPlayers } = await supabase.from('players').select('*', { count: 'exact', head: true });
            const { count: activeSubs } = await supabase.from('player_subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true);
            const { count: pendingPlayers } = await supabase.from('players').select('*', { count: 'exact', head: true }).eq('status', 'pending');

            // جلب اسم المدير الحقيقي
            const { data: adminData } = await supabase.from('admins').select('name, email').eq('id', adminId).single();
            const adminName = adminData?.name || 'المدير';

            playerContext += `[هوية المستخدم الحالي]\n`;
            playerContext += `أنت تتحدث مع: ${adminName} (المدير/الكوتش)\n`;
            playerContext += `ملاحظة مهمة: الأشخاص المذكورون في قائمة اللاعبين أدناه هم أعضاء النادي الذين يديرهم، وليس المدير نفسه.\n\n`;

            playerContext += `=== إحصاءات نادي ماستر جيم ===\n`;
            playerContext += `إجمالي اللاعبين المسجلين: ${totalPlayers || 0}\n`;
            playerContext += `الاشتراكات الفعالة: ${activeSubs || 0}\n`;
            playerContext += `طلبات الانتظار: ${pendingPlayers || 0}\n\n`;

            // قائمة كل اللاعبين
            const { data: allPlayers } = await supabase
                .from('players')
                .select('club_id, full_name, phone_number, address, is_military, status, points, created_at')
                .order('created_at', { ascending: false });

            if (allPlayers && allPlayers.length > 0) {
                playerContext += `=== قائمة جميع اللاعبين (${allPlayers.length}) ===\n`;
                allPlayers.forEach((p, i) => {
                    playerContext += `${i + 1}. ${p.full_name} | رقم: ${p.club_id || '-'} | هاتف: ${p.phone_number} | ${p.is_military ? 'عسكري' : 'مدني'} | الحالة: ${p.status === 'approved' ? 'مفعّل' : p.status === 'pending' ? 'انتظار' : 'مرفوض'} | نقاط: ${p.points || 0}\n`;
                });
                playerContext += `\n`;
            }

            // اشتراكات الكل
            const { data: allSubsFull } = await supabase
                .from('player_subscriptions')
                .select('start_date, end_date, is_active, players(full_name, club_id), subscription_types(name, price)')
                .eq('is_active', true)
                .order('end_date', { ascending: true });

            if (allSubsFull && allSubsFull.length > 0) {
                playerContext += `=== الاشتراكات الفعالة الحالية ===\n`;
                allSubsFull.forEach((s, i) => {
                    const endDate = new Date(s.end_date);
                    const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
                    playerContext += `${i + 1}. ${s.players?.full_name} (${s.players?.club_id || '-'}) | ${s.subscription_types?.name} | ينتهي: ${endDate.toLocaleDateString('ar-JO')} | متبقي: ${daysLeft} يوم\n`;
                });
                playerContext += `\n`;
            }

            // أوزان الكل
            const { data: allProgress } = await supabase
                .from('player_progress')
                .select('weight, notes, created_at, players(full_name, club_id)')
                .order('created_at', { ascending: false })
                .limit(100);

            if (allProgress && allProgress.length > 0) {
                playerContext += `=== سجلات الأوزان ===\n`;
                allProgress.forEach((p, i) => {
                    playerContext += `${i + 1}. ${p.players?.full_name} | الوزن: ${p.weight} كجم | ${new Date(p.created_at).toLocaleDateString('ar-JO')} | ملاحظات: ${p.notes || 'لا يوجد'}\n`;
                });
                playerContext += `\n`;
            }

            // أنواع الاشتراكات
            const { data: subTypes } = await supabase.from('subscription_types').select('name, price, duration_days');
            if (subTypes && subTypes.length > 0) {
                playerContext += `=== أنواع الاشتراكات المتاحة ===\n`;
                subTypes.forEach((t, i) => {
                    playerContext += `${i + 1}. ${t.name} | ${t.price}₪ | ${t.duration_days} يوم\n`;
                });
                playerContext += `\n`;
            }

            // طلبات التجميد المعلقة
            const { data: freezes } = await supabase
                .from('freeze_requests')
                .select('days, reason, status, created_at, players(full_name)')
                .eq('status', 'pending');
            if (freezes && freezes.length > 0) {
                playerContext += `=== طلبات التجميد المعلقة ===\n`;
                freezes.forEach((f, i) => {
                    playerContext += `${i + 1}. ${f.players?.full_name} | ${f.days} يوم | السبب: ${f.reason || 'غير محدد'}\n`;
                });
                playerContext += `\n`;
            }

            // قائمة المصروفات الأخيرة
            const { data: recentExpenses } = await supabase
                .from('gym_expenses')
                .select('id, title, amount, category, expense_date')
                .order('expense_date', { ascending: false })
                .limit(20);

            if (recentExpenses && recentExpenses.length > 0) {
                playerContext += `=== قائمة المصروفات الأخيرة بالنادي ===\n`;
                recentExpenses.forEach((exp, i) => {
                    const dateStr = new Date(exp.expense_date).toLocaleDateString('ar-JO');
                    playerContext += `${i + 1}. [معرّف ID: ${exp.id}] ${exp.title} | القيمة: ${exp.amount}₪ | الفئة: ${exp.category} | التاريخ: ${dateStr}\n`;
                });
                playerContext += `\n`;
            }

        } catch (e) {
            console.error("Error fetching admin context:", e);
        }
    }

    // ==========================================
    // سياق اللاعب: يرى بياناته الشخصية فقط
    // ==========================================

    if (supabase && playerId) {
        try {
            const { data: player } = await supabase.from('players').select('club_id, full_name, phone_number, address, is_military, points').eq('id', playerId).single();
            if (player) {
                playerContext += `الشخص الذي يتحدث معك الآن هو اللاعب: ${player.full_name} (رقم النادي: ${player.club_id || 'غير محدد'}). إذا سألك عن اسمه أو هويته فالجواب هو ${player.full_name}.\n\n`;
                playerContext += `=== بيانات ${player.full_name} ===\n`;
                playerContext += `الاسم: ${player.full_name}\nرقم المشترك: ${player.club_id || 'غير محدد'}\nرقم الهاتف: ${player.phone_number}\nالعنوان: ${player.address || 'غير محدد'}\nالنوع: ${player.is_military ? 'عسكري' : 'مدني'}\nالنقاط: ${player.points || 0}\n\n`;
                
                const { data: subs } = await supabase.from('player_subscriptions')
                    .select('id, start_date, end_date, is_active, subscription_types(name, price)')
                    .eq('player_id', playerId)
                    .eq('is_active', true);
                if (subs && subs.length > 0) {
                    const sub = subs[0];
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

                    if (activeFreeze) {
                        const freezeEnd = new Date(activeFreeze.created_at).getTime() + activeFreeze.days * 24 * 60 * 60 * 1000;
                        const endDate = new Date(sub.end_date);
                        const diffTime = Math.max(0, endDate.getTime() - freezeEnd);
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                        playerContext += `الاشتراك الحالي: ${sub.subscription_types?.name} بسعر ${sub.subscription_types?.price}₪\n`;
                        playerContext += `حالة الاشتراك: مجمّد حالياً ❄️ (بدأ التجميد في ${new Date(activeFreeze.created_at).toLocaleDateString('ar-JO')} وينتهي التجميد تلقائياً ويبدأ العد مجدداً في ${new Date(freezeEnd).toLocaleDateString('ar-JO')})\n`;
                        playerContext += `عدد الأيام المتبقية للاعب بعد فك التجميد: ${diffDays} يوم.\n`;
                        playerContext += `تاريخ انتهاء الاشتراك النهائي بعد التجميد: ${endDate.toLocaleDateString('ar-JO')}\n\n`;
                    } else {
                        playerContext += `الاشتراك الحالي: ${sub.subscription_types?.name} بسعر ${sub.subscription_types?.price}₪\n(يبدأ في ${new Date(sub.start_date).toLocaleDateString('ar-JO')} وينتهي في ${new Date(sub.end_date).toLocaleDateString('ar-JO')})\n\n`;
                    }
                } else {
                    playerContext += `الاشتراك الحالي: لا يوجد اشتراك فعال حالياً.\n\n`;
                }
                
                const { data: schedules } = await supabase.from('player_schedules')
                    .select('workout_templates(name)')
                    .eq('player_id', playerId)
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (schedules && schedules.length > 0) {
                    playerContext += `البرنامج التدريبي الحالي: ${schedules[0].workout_templates?.name}\n\n`;
                }

                const { data: progress } = await supabase.from('player_progress')
                    .select('weight, notes, created_at')
                    .eq('player_id', playerId)
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (progress && progress.length > 0) {
                    playerContext += `آخر قياس وزن: ${progress[0].weight} كجم (في ${new Date(progress[0].created_at).toLocaleDateString()}). الملاحظات: ${progress[0].notes || 'لا يوجد'}\n\n`;
                }
            }
        } catch (e) {
            console.error("Error fetching player context:", e);
        }
    }

    // --- Use Gemini ---
    if (!GEMINI_API_KEY) {
        return sendJson(res, 503, { error: "مفتاح Gemini API غير متاح في الخادم." });
    }

    return handleGeminiChat(res, {
        contents,
        systemInstruction: body?.systemInstruction,
        playerContext,
        adminContext,
        searchResults,
        searchQuery,
        playerId,
        adminId
    });
}

async function executeTool(name, args, adminId = null, playerId = null) {
    if (!supabase) return { error: "Supabase connection is not available." };

    console.log(`Executing tool: ${name} with args:`, args);

    try {
        // Resolves a player by either matching numeric club_id or partial match on full_name
        const resolvePlayer = async (identifier) => {
            let query = supabase.from('players').select('id, full_name, club_id');
            if (/^\d+$/.test(identifier)) {
                query = query.eq('club_id', parseInt(identifier));
            } else {
                query = query.ilike('full_name', `%${identifier}%`);
            }
            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error(`لم يتم العثور على أي لاعب يطابق القيمة: '${identifier}'`);
            }
            return data[0];
        };

        if (name === "create_workout_template") {
            const { name: templateName, description, days, assign_to_player_club_id } = args;
            if (!templateName) throw new Error("اسم القالب مطلوب.");
            if (!Array.isArray(days) || days.length === 0) throw new Error("يجب إضافة يوم تدريبي واحد على الأقل.");

            // 1. Insert template
            const { data: tmplData, error: tmplErr } = await supabase.from('workout_templates').insert([{
                name: templateName,
                description: description || 'تم إنشاؤه عبر المساعد الذكي',
                created_by: adminId || null
            }]).select().single();

            if (tmplErr) throw tmplErr;
            const templateId = tmplData.id;

            // 2. Insert days and exercises
            for (const day of days) {
                const { data: dayData, error: dayErr } = await supabase.from('workout_days').insert([{
                    template_id: templateId,
                    day_order: parseInt(day.day_order) || 1,
                    day_name: day.day_name
                }]).select().single();

                if (dayErr) throw dayErr;

                if (Array.isArray(day.exercises) && day.exercises.length > 0) {
                    const exPayloads = day.exercises.map(ex => ({
                        day_id: dayData.id,
                        exercise_name: ex.exercise_name,
                        sets: parseInt(ex.sets) || 3,
                        reps: String(ex.reps) || "10",
                        notes: ex.notes || ""
                    }));

                    const { error: exErr } = await supabase.from('workout_exercises').insert(exPayloads);
                    if (exErr) throw exErr;
                }
            }

            let assignmentMsg = "";
            // 3. Assign to player if requested
            if (assign_to_player_club_id) {
                const player = await resolvePlayer(assign_to_player_club_id);
                
                // Delete previous schedule
                await supabase.from('player_schedules').delete().eq('player_id', player.id);

                // Insert new schedule
                const { error: schedErr } = await supabase.from('player_schedules').insert([{
                    player_id: player.id,
                    template_id: templateId,
                    assigned_by: adminId || null
                }]);

                if (schedErr) throw schedErr;

                // Send notification
                await supabase.from('notifications').insert([{
                    user_id: player.id,
                    title: 'جدول تدريبي جديد 📝',
                    content: `تم إنشاء وتعيين جدول تدريبي جديد لك: '${templateName}'. تفضل بالاطلاع عليه والتزم بالتمارين!`,
                    is_read: false
                }]);

                assignmentMsg = ` وتم تعيينه للاعب ${player.full_name} بنجاح.`;
            }

            return { 
                success: true, 
                message: `تم إنشاء قالب التمرين '${templateName}' بنجاح${assignmentMsg}.`, 
                data: { template_id: templateId } 
            };
        }

        if (name === "create_subscription_type") {
            const { data, error } = await supabase
                .from('subscription_types')
                .insert([{
                    name: args.name,
                    price: parseFloat(args.price),
                    duration_days: parseInt(args.duration_days),
                    points: args.points_award ? parseInt(args.points_award) : null
                }])
                .select();
            if (error) throw error;
            return { success: true, message: `تم إنشاء باقة الاشتراك '${args.name}' بنجاح.`, data };
        }

        if (name === "assign_subscription") {
            const player = await resolvePlayer(args.club_id);
            
            // Find subscription type
            const { data: subTypes, error: typeErr } = await supabase
                .from('subscription_types')
                .select('*')
                .ilike('name', `%${args.subscription_type_name}%`);
            if (typeErr) throw typeErr;
            if (!subTypes || subTypes.length === 0) {
                throw new Error(`لم يتم العثور على باقة اشتراك باسم: '${args.subscription_type_name}'`);
            }
            const subType = subTypes[0];

            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + subType.duration_days * 24 * 60 * 60 * 1000);

            // Insert subscription
            const { error: subErr } = await supabase.from('player_subscriptions').insert([{
                player_id: player.id,
                subscription_type_id: subType.id,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                is_active: true
            }]);
            if (subErr) throw subErr;

            // Award points
            const { data: configData } = await supabase.from('gamification_config').select('value').eq('key', 'default_subscription_points').maybeSingle();
            const defaultPoints = configData ? parseInt(configData.value) : 100;
            const pointsToAward = subType.points !== null && subType.points !== undefined ? subType.points : defaultPoints;

            if (pointsToAward > 0) {
                await supabase.from('points_transactions').insert([{
                    player_id: player.id,
                    amount: pointsToAward,
                    reason: `تفعيل باقة: ${subType.name} (عبر المساعد الذكي)`
                }]);
            }

            // Auto-approve pending renewals
            await supabase.from('renewal_requests').update({ status: 'approved' }).eq('player_id', player.id).eq('status', 'pending');

            // Send notification
            await supabase.from('notifications').insert([{
                user_id: player.id,
                title: 'تم تفعيل اشتراكك 💳',
                content: `تم تفعيل اشتراكك بنجاح ولمدة ${subType.duration_days} يوم. حصلت على ${pointsToAward} نقطة! 🏆`,
                is_read: false
            }]);

            return { success: true, message: `تم تفعيل باقة '${subType.name}' للاعب ${player.full_name} بنجاح.` };
        }

        if (name === "update_player_status") {
            const player = await resolvePlayer(args.club_id);
            const { error } = await supabase
                .from('players')
                .update({ status: args.status })
                .eq('id', player.id);
            if (error) throw error;

            if (args.status === 'approved') {
                // Award signup bonus points if not already awarded
                const { data: existingTx } = await supabase
                    .from('points_transactions')
                    .select('id')
                    .eq('player_id', player.id)
                    .eq('reason', 'مكافأة التسجيل في النادي 🎉')
                    .maybeSingle();

                if (!existingTx) {
                    const { data: configData } = await supabase.from('gamification_config').select('value').eq('key', 'signup_points_reward').maybeSingle();
                    const signupPoints = configData ? parseInt(configData.value) : 50;

                    await supabase.from('points_transactions').insert([{
                        player_id: player.id,
                        amount: signupPoints,
                        reason: 'مكافأة التسجيل في النادي 🎉'
                    }]);

                    await supabase.from('notifications').insert([{
                        user_id: player.id,
                        title: 'مرحباً بك في ماستر جيم! 🎉',
                        content: `تم تفعيل حسابك بنجاح! حصلت على ${signupPoints} نقطة كهدية ترحيبية. 🏆`,
                        is_read: false
                    }]);
                }
            }

            return { success: true, message: `تم تحديث حالة اللاعب ${player.full_name} إلى '${args.status === 'approved' ? 'مفعّل' : 'مرفوض'}' بنجاح.` };
        }

        if (name === "approve_all_pending_players") {
            const { data: pending, error: selectErr } = await supabase
                .from('players')
                .select('id, full_name')
                .eq('status', 'pending');
            if (selectErr) throw selectErr;

            if (!pending || pending.length === 0) {
                return { success: true, message: "لا يوجد حالياً أي طلبات تسجيل معلقة للموافقة عليها." };
            }

            const { data: configData } = await supabase.from('gamification_config').select('value').eq('key', 'signup_points_reward').maybeSingle();
            const defaultSignupPoints = configData ? parseInt(configData.value) : 50;
            const pointsToAward = args.points_to_award !== undefined ? parseInt(args.points_to_award) : defaultSignupPoints;

            let approvedCount = 0;
            for (const p of pending) {
                const { error: updErr } = await supabase.from('players').update({ status: 'approved' }).eq('id', p.id);
                if (!updErr) {
                    approvedCount++;
                    // Award points
                    await supabase.from('points_transactions').insert([{
                        player_id: p.id,
                        amount: pointsToAward,
                        reason: 'مكافأة التسجيل في النادي 🎉'
                    }]);

                    // Send notification
                    await supabase.from('notifications').insert([{
                        user_id: p.id,
                        title: 'مرحباً بك في ماستر جيم! 🎉',
                        content: `تم تفعيل حسابك بنجاح! حصلت على ${pointsToAward} نقطة كهدية ترحيبية. 🏆`,
                        is_read: false
                    }]);
                }
            }

            return { success: true, message: `تم الموافقة على تفعيل حسابات ${approvedCount} لاعبين بنجاح ومنحهم ${pointsToAward} نقطة.` };
        }

        if (name === "assign_subscription_to_recent_players") {
            // Find subscription type
            const { data: subTypes, error: typeErr } = await supabase
                .from('subscription_types')
                .select('*')
                .ilike('name', `%${args.subscription_type_name}%`);
            if (typeErr) throw typeErr;
            if (!subTypes || subTypes.length === 0) {
                throw new Error(`لم يتم العثور على باقة اشتراك باسم: '${args.subscription_type_name}'`);
            }
            const subType = subTypes[0];
            const count = args.count ? parseInt(args.count) : 5;

            // Find last approved players
            const { data: recentPlayers, error: playersErr } = await supabase
                .from('players')
                .select('id, full_name')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(count);
            if (playersErr) throw playersErr;

            if (!recentPlayers || recentPlayers.length === 0) {
                return { success: true, message: "لا يوجد لاعبين مفعلين في النظام لتفعيل باقات لهم." };
            }

            const { data: configData } = await supabase.from('gamification_config').select('value').eq('key', 'default_subscription_points').maybeSingle();
            const defaultPoints = configData ? parseInt(configData.value) : 100;
            const pointsToAward = subType.points !== null && subType.points !== undefined ? subType.points : defaultPoints;

            let countAssigned = 0;
            for (const player of recentPlayers) {
                const startDate = new Date();
                const endDate = new Date(startDate.getTime() + subType.duration_days * 24 * 60 * 60 * 1000);

                const { error: subErr } = await supabase.from('player_subscriptions').insert([{
                    player_id: player.id,
                    subscription_type_id: subType.id,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    is_active: true
                }]);

                if (!subErr) {
                    countAssigned++;
                    if (pointsToAward > 0) {
                        await supabase.from('points_transactions').insert([{
                            player_id: player.id,
                            amount: pointsToAward,
                            reason: `تفعيل باقة: ${subType.name} (عبر المساعد الذكي)`
                        }]);
                    }
                    await supabase.from('notifications').insert([{
                        user_id: player.id,
                        title: 'تم تفعيل اشتراكك 💳',
                        content: `تم تفعيل اشتراكك بنجاح ولمدة ${subType.duration_days} يوم. حصلت على ${pointsToAward} نقطة! 🏆`,
                        is_read: false
                    }]);
                }
            }

            return { success: true, message: `تم تفعيل باقة '${subType.name}' لـ ${countAssigned} من آخر المشتركين بنجاح.` };
        }

        if (name === "adjust_player_points") {
            const player = await resolvePlayer(args.club_id);
            const amount = parseInt(args.amount);
            const reason = args.reason || "تعديل إداري عبر المساعد";

            const { error } = await supabase.from('points_transactions').insert([{
                player_id: player.id,
                amount,
                reason
            }]);
            if (error) throw error;

            const sign = amount >= 0 ? 'إضافة' : 'خصم';
            const absAmt = Math.abs(amount);
            await supabase.from('notifications').insert([{
                user_id: player.id,
                title: 'تعديل في رصيد نقاطك 🏆',
                content: `قام المسؤول بـ ${sign} ${absAmt} نقطة من رصيدك. السبب: ${reason}`,
                is_read: false
            }]);

            return { success: true, message: `تم ${sign} ${absAmt} نقطة للاعب ${player.full_name} بنجاح.` };
        }

        if (name === "approve_freeze_request") {
            const player = await resolvePlayer(args.club_id);
            const { data: pendingFreezes, error: selErr } = await supabase
                .from('freeze_requests')
                .select('*')
                .eq('player_id', player.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            if (selErr) throw selErr;

            if (!pendingFreezes || pendingFreezes.length === 0) {
                return { success: false, message: `لا يوجد طلب تجميد معلق للاعب ${player.full_name}.` };
            }
            const freezeReq = pendingFreezes[0];

            const { error: updErr } = await supabase
                .from('freeze_requests')
                .update({ 
                    status: 'approved',
                    created_at: new Date().toISOString() // Start freeze at approval time
                })
                .eq('id', freezeReq.id);
            if (updErr) throw updErr;

            await supabase.from('notifications').insert([{
                user_id: player.id,
                title: 'تمت الموافقة على تجميد اشتراكك ❄️',
                content: `تمت الموافقة على طلب التجميد لمدة ${freezeReq.days} يوم وتوقيف عداد أيام الاشتراك مؤقتاً.`,
                is_read: false
            }]);

            return { success: true, message: `تمت الموافقة على طلب تجميد اشتراك اللاعب ${player.full_name} لمدة ${freezeReq.days} يوم بنجاح وتوقيف العداد.` };
        }

        if (name === "send_global_notification") {
            const { data: allPlayers, error: playersErr } = await supabase.from('players').select('id').eq('status', 'approved');
            if (playersErr) throw playersErr;

            if (allPlayers && allPlayers.length > 0) {
                const notifs = allPlayers.map(p => ({
                    user_id: p.id,
                    title: args.title,
                    content: args.content,
                    is_read: false
                }));
                const { error: insErr } = await supabase.from('notifications').insert(notifs);
                if (insErr) throw insErr;
            }

            return { success: true, message: `تم إرسال الإشعار العام بنجاح لـ ${allPlayers.length} لاعب.` };
        }

        if (name === "record_player_attendance") {
            const player = await resolvePlayer(args.club_id);
            const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

            const { data: existingAttendance } = await supabase
                .from('player_attendance')
                .select('id')
                .eq('player_id', player.id)
                .eq('check_in_date', todayStr)
                .maybeSingle();

            if (existingAttendance) {
                return { success: true, message: `اللاعب ${player.full_name} مسجل حضور بالفعل لهذا اليوم.` };
            }

            await supabase.from('player_attendance').insert([{
                player_id: player.id,
                check_in_date: todayStr
            }]);

            // Early attendance check
            const { data: earlyTimeData } = await supabase.from('gamification_config').select('value').eq('key', 'early_attendance_time').maybeSingle();
            const { data: earlyPointsData } = await supabase.from('gamification_config').select('value').eq('key', 'early_attendance_points').maybeSingle();

            const targetTime = earlyTimeData ? earlyTimeData.value : '09:00';
            const earlyPoints = earlyPointsData ? parseInt(earlyPointsData.value) : 10;

            const now = new Date();
            const currentHour = now.getHours().toString().padStart(2, '0');
            const currentMin = now.getMinutes().toString().padStart(2, '0');
            const currentTimeStr = `${currentHour}:${currentMin}`;

            let extraMsg = "";
            if (currentTimeStr <= targetTime) {
                await supabase.from('points_transactions').insert([{
                    player_id: player.id,
                    amount: earlyPoints,
                    reason: 'مكافأة الحضور المبكر اليوم 🌅'
                }]);

                await supabase.from('notifications').insert([{
                    user_id: player.id,
                    title: 'حضور مبكر مميز! 🌅',
                    content: `لقد سجلت دخولك مبكراً اليوم قبل ${targetTime} وحصلت على ${earlyPoints} نقطة كابتن! 🏆`,
                    is_read: false
                }]);
                extraMsg = ` وتم منح اللاعب ${earlyPoints} نقطة حضور مبكر!`;
            }

            return { success: true, message: `تم تسجيل حضور اللاعب ${player.full_name} بنجاح اليوم.${extraMsg}` };
        }

        if (name === "list_gym_expenses") {
            const limit = args.limit ? parseInt(args.limit) : 20;
            let query = supabase
                .from('gym_expenses')
                .select('*')
                .order('expense_date', { ascending: false });

            if (args.category) {
                query = query.ilike('category', `%${args.category}%`);
            }

            const { data, error } = await query.limit(limit);
            if (error) throw error;

            const total = data.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

            return {
                success: true,
                message: `تم جلب قائمة المصروفات بنجاح. المجموع الإجمالي لهذه المصروفات: ${total} ₪.`,
                data: data
            };
        }

        if (name === "add_gym_expense") {
            const { title, amount, category, expense_date } = args;
            if (!title) throw new Error("عنوان المصروف مطلوب.");
            if (amount === undefined || amount === null) throw new Error("قيمة المصروف مطلوبة.");

            const payload = {
                title,
                amount: parseFloat(amount),
                category: category || "general",
                admin_id: adminId || null
            };

            if (expense_date) {
                payload.expense_date = new Date(expense_date).toISOString();
            }

            const { data, error } = await supabase
                .from('gym_expenses')
                .insert([payload])
                .select();

            if (error) throw error;

            return {
                success: true,
                message: `تم تسجيل مصروف جديد بنجاح: '${title}' بقيمة ${amount} ₪ ضمن فئة '${category || 'عام'}'.`,
                data
            };
        }

        if (name === "edit_gym_expense") {
            const { expense_id, title, amount, category, expense_date } = args;
            if (!expense_id) throw new Error("معرّف المصروف (expense_id) مطلوب.");

            const updates = {};
            if (title !== undefined) updates.title = title;
            if (amount !== undefined) updates.amount = parseFloat(amount);
            if (category !== undefined) updates.category = category;
            if (expense_date !== undefined) updates.expense_date = new Date(expense_date).toISOString();

            const { data, error } = await supabase
                .from('gym_expenses')
                .update(updates)
                .eq('id', expense_id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("لم يتم العثور على مصروف بهذا المعرّف (ID).");

            return {
                success: true,
                message: `تم تعديل بيانات المصروف بنجاح.`,
                data
            };
        }

        if (name === "delete_gym_expense") {
            const { expense_id } = args;
            if (!expense_id) throw new Error("معرّف المصروف (expense_id) مطلوب.");

            const { data, error } = await supabase
                .from('gym_expenses')
                .delete()
                .eq('id', expense_id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("لم يتم العثور على مصروف بهذا المعرّف (ID) لحذفه.");

            return {
                success: true,
                message: `تم حذف المصروف بنجاح.`,
                data
            };
        }

        // ===================================================
        // أداة خاصة باللاعب: تقديم طلب تجميد اشتراك
        // ===================================================
        if (name === "submit_freeze_request") {
            // استخدام player_id المُرسَل من الطلب مباشرة (من server-side) بدل ما يمرره الـ AI
            const trustedPlayerId = playerId || args.player_id;
            const { days, reason } = args;
            if (!trustedPlayerId) throw new Error("لم يتم التعرف على هوية اللاعب. يرجى تسجيل الدخول مجدداً.");
            if (!days || days < 1 || days > 30) throw new Error("يجب تحديد عدد أيام التجميد بين 1 و 30 يوم.");

            // 1. Fetch player's active subscription
            const { data: subs, error: subErr } = await supabase
                .from('player_subscriptions')
                .select('id, end_date, subscription_types(name)')
                .eq('player_id', trustedPlayerId)
                .eq('is_active', true)
                .order('end_date', { ascending: false })
                .limit(1);

            if (subErr) throw subErr;
            if (!subs || subs.length === 0) {
                return { success: false, message: "لا يوجد اشتراك فعّال لتجميده. يرجى الاشتراك أولاً." };
            }

            const activeSub = subs[0];

            // 2. Check if there's already a pending/approved freeze request
            const { data: existingFreeze } = await supabase
                .from('freeze_requests')
                .select('id, status')
                .eq('player_id', trustedPlayerId)
                .in('status', ['pending', 'approved'])
                .limit(1);

            if (existingFreeze && existingFreeze.length > 0) {
                const existingStatus = existingFreeze[0].status === 'pending' ? 'قيد المراجعة' : 'مُوافق عليه';
                return { success: false, message: `يوجد بالفعل طلب تجميد ${existingStatus}. لا يمكن تقديم طلب جديد حتى تتم معالجة الطلب الحالي.` };
            }

            // 3. Insert freeze request
            const { data: freezeData, error: freezeErr } = await supabase
                .from('freeze_requests')
                .insert([{
                    player_id: trustedPlayerId,
                    subscription_id: activeSub.id,
                    days: parseInt(days),
                    reason: reason || 'لم يذكر سبب',
                    status: 'pending'
                }])
                .select()
                .single();

            if (freezeErr) throw freezeErr;

            // 4. Send confirmation notification to player
            await supabase.from('notifications').insert([{
                user_id: trustedPlayerId,
                title: 'طلب تجميد قيد المراجعة ❄️',
                content: `تم إرسال طلب تجميد اشتراكك لمدة ${days} يوم بسبب: "${reason || 'لم يذكر سبب'}". سيتم إشعارك فور رد الإدارة.`,
                is_read: false
            }]);

            return {
                success: true,
                message: `تم إرسال طلب التجميد بنجاح! ❄️\n- المدة: ${days} يوم\n- السبب: ${reason || 'لم يذكر سبب'}\n- الحالة: قيد مراجعة المدرب\nسيتم إشعارك بالنتيجة قريباً.`,
                data: { freeze_id: freezeData.id, days, status: 'pending' }
            };
        }

        return { error: `أداة غير معروفة: ${name}` };
    } catch (err) {
        console.error(`Error in executeTool (${name}):`, err);
        return { success: false, error: err.message };
    }
}

async function fetchWithRetry(url, options, maxRetries = 5, delayMs = 2000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                const currentDelay = delayMs * Math.pow(2, i);
                console.warn(`Gemini API returned 429 (Rate Limit). Retrying in ${currentDelay / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
                continue;
            }
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const currentDelay = delayMs * Math.pow(2, i);
            console.warn(`Request failed: ${error.message}. Retrying in ${currentDelay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, currentDelay));
        }
    }
    throw new Error("تجاوزت حد الطلبات المسموح به من Google Gemini API. يرجى الانتظار دقيقة قبل المحاولة مجدداً.");
}

async function handleGeminiChat(res, { contents, systemInstruction, playerContext, adminContext, searchResults, searchQuery, playerId, adminId }) {
    if (GEMINI_API_KEY && GEMINI_API_KEY.startsWith("sk-or-")) {
        return handleOpenRouterChat(res, { contents, systemInstruction, playerContext, adminContext, searchResults, searchQuery, playerId, adminId });
    }
    try {
        const sysText = extractContentText(systemInstruction?.parts) || "";
        const finalSystemPrompt = `${sysText}\n\n${adminContext}${playerContext}`;
        
        // Build Gemini payload
        const geminiContents = contents.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: msg.parts
        }));

        // Search Results Injection
        if (searchResults.length > 0) {
            const lastMsg = geminiContents[geminiContents.length - 1];
            if (lastMsg.role === 'user') {
                const searchInfo = `\n\n[نتائج البحث من الإنترنت لـ "${searchQuery}"]:\n` + 
                    searchResults.map((s, i) => `${i+1}. ${s.title}: ${s.snippet}`).join('\n');
                lastMsg.parts[0].text += searchInfo;
            }
        }

        // Define tools for Admin ONLY to allow running DB commands
        const tools = [];
        if (adminId) {
            tools.push({
                functionDeclarations: [
                    {
                        name: "create_subscription_type",
                        description: "إنشاء نوع باقة/اشتراك جديد في ماستر جيم",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                name: { type: "STRING", description: "اسم الباقة، مثل: 'شهري عسكري' أو 'سنوي مدني'" },
                                price: { type: "NUMBER", description: "سعر الباقة بالشيكل (₪)" },
                                duration_days: { type: "INTEGER", description: "مدة الباقة بالأيام (مثلاً 30، 90، 360)" },
                                points_award: { type: "INTEGER", description: "النقاط الممنوحة للاعب عند الاشتراك (اختياري)" }
                            },
                            required: ["name", "price", "duration_days"]
                        }
                    },
                    {
                        name: "assign_subscription",
                        description: "تفعيل أو إسناد باقة اشتراك للاعب محدد",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                club_id: { type: "STRING", description: "رقم المشترك الخاص باللاعب (مثال: '1001') أو اسمه الكامل" },
                                subscription_type_name: { type: "STRING", description: "اسم الباقة المراد تفعيلها (مثال: 'شهري مدني')" }
                            },
                            required: ["club_id", "subscription_type_name"]
                        }
                    },
                    {
                        name: "update_player_status",
                        description: "تغيير حالة حساب لاعب (تفعيل الحساب، رفض، انتظار)",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                club_id: { type: "STRING", description: "رقم المشترك الخاص باللاعب أو اسمه الكامل" },
                                status: { type: "STRING", description: "الحالة الجديدة للحساب (approved أو rejected)" }
                            },
                            required: ["club_id", "status"]
                        }
                    },
                    {
                        name: "approve_all_pending_players",
                        description: "الموافقة على جميع حسابات اللاعبين المعلقة دفعة واحدة ومنحهم نقاطاً",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                points_to_award: { type: "INTEGER", description: "عدد النقاط الترحيبية لكل لاعب (اختياري)" }
                            }
                        }
                    },
                    {
                        name: "assign_subscription_to_recent_players",
                        description: "تفعيل باقة اشتراك لآخر عدد من اللاعبين الذين تمت الموافقة على حساباتهم مؤخراً",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                subscription_type_name: { type: "STRING", description: "اسم باقة الاشتراك (مثال: 'شهري مدني')" },
                                count: { type: "INTEGER", description: "عدد اللاعبين الأخيرين (مثال: 5)" }
                            },
                            required: ["subscription_type_name"]
                        }
                    },
                    {
                        name: "adjust_player_points",
                        description: "تعديل رصيد نقاط اللاعب يدوياً (مكافأة أو خصم)",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                club_id: { type: "STRING", description: "رقم المشترك الخاص باللاعب أو اسمه الكامل" },
                                amount: { type: "INTEGER", description: "عدد النقاط المراد إضافته (موجب) أو خصمه (سالب)" },
                                reason: { type: "STRING", description: "سبب تعديل النقاط" }
                            },
                            required: ["club_id", "amount", "reason"]
                        }
                    },
                    {
                        name: "approve_freeze_request",
                        description: "الموافقة على طلب تجميد اشتراك لاعب معلق",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                club_id: { type: "STRING", description: "رقم المشترك الخاص باللاعب أو اسمه الكامل" }
                            },
                            required: ["club_id"]
                        }
                    },
                    {
                        name: "send_global_notification",
                        description: "إرسال إشعار عام / إعلان لجميع لاعبي النادي",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                title: { type: "STRING", description: "عنوان الإشعار أو الإعلان" },
                                content: { type: "STRING", description: "نص الإشعار/الإعلان بالتفصيل" }
                            },
                            required: ["title", "content"]
                        }
                    },
                    {
                        name: "record_player_attendance",
                        description: "تسجيل حضور لاعب يدويًا للنادي اليوم",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                club_id: { type: "STRING", description: "رقم المشترك الخاص باللاعب أو اسمه الكامل" }
                            },
                            required: ["club_id"]
                        }
                    },
                    {
                        name: "create_workout_template",
                        description: "إنشاء برنامج/جدول تمارين رياضي متكامل وحقيقي للاعب وتعيينه له بناء على هدفه ومعلوماته",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                name: { type: "STRING", description: "اسم جدول التمارين، مثل: 'برنامج تضخيم 5 أيام لمحمد'" },
                                description: { type: "STRING", description: "وصف البرنامج وهدفه والتوجيهات العامة، مثل: 'برنامج مخصص لزيادة القوة والكتلة العضلية'" },
                                assign_to_player_club_id: { type: "STRING", description: "رقم المشترك (club_id) الخاص باللاعب أو اسمه الكامل لإسناد الجدول له مباشرة (اختياري)" },
                                days: {
                                    type: "ARRAY",
                                    description: "قائمة أيام التمرين والتفاصيل الخاصة بكل يوم (أيام تمرين وأيام راحة)",
                                    items: {
                                        type: "OBJECT",
                                        properties: {
                                            day_name: { type: "STRING", description: "اسم اليوم، مثل: 'اليوم الأول: صدر وباي' أو 'اليوم الثالث: راحة'" },
                                            day_order: { type: "INTEGER", description: "ترتيب اليوم المتسلسل (مثال: 1، 2، 3...)" },
                                            exercises: {
                                                type: "ARRAY",
                                                description: "قائمة التمارين الخاصة بهذا اليوم (تترك فارغة إذا كان يوم راحة)",
                                                items: {
                                                    type: "OBJECT",
                                                    properties: {
                                                        exercise_name: { type: "STRING", description: "اسم التمرين باللغة العربية أو الإنجليزية" },
                                                        sets: { type: "INTEGER", description: "عدد الجولات المطلوبة (مثال: 4)" },
                                                        reps: { type: "STRING", description: "التكرارات المطلوبة في كل جولة (مثال: '8-12' أو '12')" },
                                                        notes: { type: "STRING", description: "ملاحظات إضافية للتمرين مثل الراحة، الأداء، إلخ (اختياري)" }
                                                    },
                                                    required: ["exercise_name", "sets", "reps"]
                                                }
                                            }
                                        },
                                        required: ["day_name", "day_order"]
                                    }
                                }
                            },
                            required: ["name", "days"]
                        }
                    },
                    {
                        name: "list_gym_expenses",
                        description: "عرض أو استعلام قائمة المصروفات الخاصة بالنادي مع الفئات والمبالغ الإجمالية",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                category: { type: "STRING", description: "تصفية حسب الفئة، مثل: 'رواتب'، 'فواتير'، 'أجهزة' (اختياري)" },
                                limit: { type: "INTEGER", description: "أقصى عدد من المصروفات لعرضها (اختياري، الافتراضي 20)" }
                            }
                        }
                    },
                    {
                        name: "add_gym_expense",
                        description: "إضافة مصروف جديد للنادي (مثل فواتير، رواتب، شراء أجهزة)",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                title: { type: "STRING", description: "عنوان أو وصف المصروف (مثال: 'فاتورة الكهرباء لشهر 5')" },
                                amount: { type: "NUMBER", description: "قيمة المصروف بالشيكل (₪) (مثال: 350.50)" },
                                category: { type: "STRING", description: "فئة المصروف، مثل: 'bills' (فواتير)، 'salaries' (رواتب)، 'equipment' (أجهزة)، 'rent' (إيجار) أو 'general' (عام)" },
                                expense_date: { type: "STRING", description: "تاريخ المصروف بصيغة YYYY-MM-DD (اختياري، الافتراضي اليوم)" }
                            },
                            required: ["title", "amount"]
                        }
                    },
                    {
                        name: "edit_gym_expense",
                        description: "تعديل بيانات مصروف مسجل مسبقاً باستخدام معرف المصروف (ID)",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                expense_id: { type: "STRING", description: "معرّف المصروف الفريد (UUID) المراد تعديله" },
                                title: { type: "STRING", description: "العنوان الجديد للمصروف (اختياري)" },
                                amount: { type: "NUMBER", description: "القيمة الجديدة للمصروف بالشيكل (₪) (اختياري)" },
                                category: { type: "STRING", description: "الفئة الجديدة للمصروف (اختياري)" },
                                expense_date: { type: "STRING", description: "التاريخ الجديد للمصروف بصيغة YYYY-MM-DD (اختياري)" }
                            },
                            required: ["expense_id"]
                        }
                    },
                    {
                        name: "delete_gym_expense",
                        description: "حذف مصروف مسجل مسبقاً باستخدام معرف المصروف (ID)",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                expense_id: { type: "STRING", description: "معرّف المصروف الفريد (UUID) المراد حذفه" }
                            },
                            required: ["expense_id"]
                        }
                    }
                ]
            });
        }

        // أداة تقديم طلب التجميد متاحة للاعبين فقط
        if (playerId && !adminId) {
            tools.push({
                functionDeclarations: [
                    {
                        name: "submit_freeze_request",
                        description: "تقديم طلب تجميد اشتراك اللاعب الحالي. تُستخدم عندما يطلب اللاعب تجميد اشتراكه لمدة معينة وسبب معين.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                days: { type: "INTEGER", description: "عدد أيام التجميد المطلوبة (بين 1 و 30 يوم). أسبوع = 7 أيام." },
                                reason: { type: "STRING", description: "سبب طلب التجميد (مثل: سفر، مرض، ظروف عائلية)" }
                            },
                            required: ["days"]
                        }
                    }
                ]
            });
        }

        const payload = {
            contents: geminiContents,
            systemInstruction: { parts: [{ text: finalSystemPrompt }] },
            generationConfig: { temperature: 0.7 }
        };
        if (tools.length > 0) {
            payload.tools = tools;
        }

        const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Gemini API Error");

        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        
        // Check for functionCalls
        const functionCalls = parts.filter(p => p.functionCall);
        if (functionCalls.length > 0) {
            const toolResponses = [];
            for (const part of functionCalls) {
                const call = part.functionCall;
                const result = await executeTool(call.name, call.args, adminId, playerId);
                toolResponses.push({
                    role: "tool",
                    parts: [{
                        functionResponse: {
                            name: call.name,
                            response: { result }
                        }
                    }]
                });
            }

            // Call Gemini again with the tool responses to construct the natural language reply
            const modelMessage = {
                role: "model",
                parts: parts
            };

            const secondPayload = {
                contents: [...geminiContents, modelMessage, ...toolResponses],
                systemInstruction: { parts: [{ text: finalSystemPrompt }] },
                generationConfig: { temperature: 0.7 }
            };
            if (tools.length > 0) {
                secondPayload.tools = tools;
            }

            let reply = "";
            try {
                const secondResponse = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(secondPayload)
                });

                if (secondResponse.ok) {
                    const secondData = await secondResponse.json();
                    const replyParts = secondData.candidates?.[0]?.content?.parts;
                    if (Array.isArray(replyParts)) {
                        reply = replyParts.map(p => p.text).filter(Boolean).join("\n");
                    }
                } else {
                    console.warn(`Gemini second turn failed status: ${secondResponse.status}`);
                }
            } catch (secondError) {
                console.error("Gemini second turn error (falling back to manual reply):", secondError);
            }

            if (!reply) {
                const toolsText = toolResponses.map(tr => {
                    const result = tr.parts?.[0]?.functionResponse?.response?.result;
                    return result?.message || result?.error || "";
                }).filter(Boolean).join("\n");

                if (toolsText) {
                    reply = `تم تنفيذ الإجراء بنجاح:\n${toolsText}`;
                } else {
                    reply = "تم تنفيذ طلبك بنجاح ولكن تعذر صياغة رد مخصص من الذكاء الاصطناعي بسبب الضغط على النظام.";
                }
            }

            // Save to history if Supabase is active
            if (supabase && playerId) {
                const lastUserMsg = contents[contents.length - 1];
                const userText = extractContentText(lastUserMsg?.parts);
                
                Promise.all([
                    supabase.from('ai_chat_history').insert({ player_id: playerId, role: 'user', content: userText }),
                    supabase.from('ai_chat_history').insert({ 
                        player_id: playerId, 
                        role: 'assistant', 
                        content: reply,
                        meta: 'تم تنفيذ إجراء بنجاح'
                    })
                ]).catch(e => console.error("Error saving Gemini chat history:", e));
            }

            return sendJson(res, 200, {
                reply,
                actionExecuted: true,
                searchUsed: false,
                searchQueries: [],
                sources: []
            });
        }

        const reply = parts[0]?.text || "";
        if (!reply) throw new Error("No response from Gemini.");

        // Save to Supabase
        if (supabase && playerId) {
            const lastUserMsg = contents[contents.length - 1];
            const userText = extractContentText(lastUserMsg?.parts);
            
            Promise.all([
                supabase.from('ai_chat_history').insert({ player_id: playerId, role: 'user', content: userText }),
                supabase.from('ai_chat_history').insert({ 
                    player_id: playerId, 
                    role: 'assistant', 
                    content: reply,
                    meta: searchResults.length > 0 ? 'مدعوم ببحث الإنترنت' : 'رد من خادم Gemini'
                })
            ]).catch(e => console.error("Error saving Gemini chat history:", e));
        }

        return sendJson(res, 200, {
            reply,
            actionExecuted: false,
            searchUsed: searchResults.length > 0,
            searchQueries: searchResults.length > 0 ? [searchQuery] : [],
            sources: searchResults.map(s => ({ title: s.title, url: s.url }))
        });

    } catch (error) {
        console.error("Gemini API error:", error);
        return sendJson(res, 502, { error: "خطأ في الاتصال بـ Google Gemini API: " + error.message });
    }
}

async function handleOpenRouterChat(res, { contents, systemInstruction, playerContext, adminContext, searchResults, searchQuery, playerId, adminId }) {
    try {
        const sysText = extractContentText(systemInstruction?.parts) || "";
        const finalSystemPrompt = `${sysText}\n\n${adminContext}${playerContext}`;

        const openaiMessages = [
            { role: "system", content: finalSystemPrompt }
        ];

        for (const msg of contents) {
            const role = msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user';
            const text = extractContentText(msg.parts) || "";
            if (text) {
                openaiMessages.push({ role, content: text });
            }
        }

        if (searchResults.length > 0) {
            const lastMsg = openaiMessages[openaiMessages.length - 1];
            if (lastMsg && lastMsg.role === 'user') {
                const searchInfo = `\n\n[نتائج البحث من الإنترنت لـ "${searchQuery}"]:\n` + 
                    searchResults.map((s, i) => `${i+1}. ${s.title}: ${s.snippet}`).join('\n');
                lastMsg.content += searchInfo;
            }
        }

        const tools = [];
        if (adminId) {
            tools.push(
                {
                    type: "function",
                    function: {
                        name: "create_subscription_type",
                        description: "إنشاء نوع باقة/اشتراك جديد في ماستر جيم",
                        parameters: {
                            type: "object",
                            properties: {
                                name: { type: "string", description: "اسم الباقة، مثل: 'شهري عسكري' أو 'سنوي مدني'" },
                                price: { type: "number", description: "سعر الباقة بالشيكل (₪)" },
                                duration_days: { type: "integer", description: "مدة الباقة بالأيام (مثلاً 30، 90، 360)" },
                                points_award: { type: "integer", description: "النقاط الممنوحة للاعب عند الاشتراك (اختياري)" }
                            },
                            required: ["name", "price", "duration_days"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "assign_subscription",
                        description: "تفعيل أو إسناد باقة اشتراك للاعب محدد",
                        parameters: {
                            type: "object",
                            properties: {
                                club_id: { type: "string", description: "رقم المشترك الخاص باللاعب (مثال: '1001') أو اسمه الكامل" },
                                subscription_type_name: { type: "string", description: "اسم الباقة المراد تفعيلها (مثال: 'شهري مدني')" }
                            },
                            required: ["club_id", "subscription_type_name"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "update_player_status",
                        description: "تغيير حالة حساب لاعب (تفعيل الحساب، رفض، انتظار)",
                        parameters: {
                            type: "object",
                            properties: {
                                club_id: { type: "string", description: "رقم المشترك الخاص باللاعب أو اسمه الكامل" },
                                status: { type: "string", description: "الحالة الجديدة للحساب (approved أو rejected)" }
                            },
                            required: ["club_id", "status"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "approve_all_pending_players",
                        description: "الموافقة على جميع حسابات اللاعبين المعلقة دفعة واحدة ومنحهم نقاطاً",
                        parameters: {
                            type: "object",
                            properties: {
                                points_to_award: { type: "integer", description: "عدد النقاط الترحيبية لكل لاعب (اختياري)" }
                            }
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "assign_subscription_to_recent_players",
                        description: "تفعيل باقة اشتراك لآخر عدد من اللاعبين الذين تمت الموافقة على حساباتهم مؤخراً",
                        parameters: {
                            type: "object",
                            properties: {
                                subscription_type_name: { type: "string", description: "اسم باقة الاشتراك (مثال: 'شهري مدني')" },
                                count: { type: "integer", description: "عدد اللاعبين الأخيرين (مثال: 5)" }
                            },
                            required: ["subscription_type_name"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "adjust_player_points",
                        description: "تعديل رصيد نقاط اللاعب يدوياً (مكافأة أو خصم)",
                        parameters: {
                            type: "object",
                            properties: {
                                club_id: { type: "string", description: "رقم المشترك الخاص باللاعب أو اسمه الكامل" },
                                amount: { type: "integer", description: "عدد النقاط المراد إضافته (موجب) أو خصمه (سالب)" },
                                reason: { type: "string", description: "سبب تعديل النقاط" }
                            },
                            required: ["club_id", "amount", "reason"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "approve_freeze_request",
                        description: "الموافقة على طلب تجميد اشتراك لاعب معلق",
                        parameters: {
                            type: "object",
                            properties: {
                                club_id: { type: "string", description: "رقم المشترك الخاص باللاعب أو اسمه الكامل" }
                            },
                            required: ["club_id"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "send_global_notification",
                        description: "إرسال إشعار عام / إعلان لجميع لاعبي النادي",
                        parameters: {
                            type: "object",
                            properties: {
                                title: { type: "string", description: "عنوان الإشعار أو الإعلان" },
                                content: { type: "string", description: "نص الإشعار/الإعلان بالتفصيل" }
                            },
                            required: ["title", "content"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "record_player_attendance",
                        description: "تسجيل حضور لاعب يدويًا للنادي اليوم",
                        parameters: {
                            type: "object",
                            properties: {
                                club_id: { type: "string", description: "رقم المشترك الخاص باللاعب أو اسمه الكامل" }
                            },
                            required: ["club_id"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "create_workout_template",
                        description: "إنشاء برنامج/جدول تمارين رياضي متكامل وحقيقي للاعب وتعيينه له بناء على هدفه ومعلوماته",
                        parameters: {
                            type: "object",
                            properties: {
                                name: { type: "string", description: "اسم جدول التمارين، مثل: 'برنامج تضخيم 5 أيام لمحمد'" },
                                description: { type: "string", description: "وصف البرنامج وهدفه والتوجيهات العامة، مثل: 'برنامج مخصص لزيادة القوة والكتلة العضلية'" },
                                assign_to_player_club_id: { type: "string", description: "رقم المشترك (club_id) الخاص باللاعب أو اسمه الكامل لإسناد الجدول له مباشرة (اختياري)" },
                                days: {
                                    type: "array",
                                    description: "قائمة أيام التمرين والتفاصيل الخاصة بكل يوم (أيام تمرين وأيام راحة)",
                                    items: {
                                        type: "object",
                                        properties: {
                                            day_name: { type: "string", description: "اسم اليوم، مثل: 'اليوم الأول: صدر وباي' أو 'اليوم الثالث: راحة'" },
                                            day_order: { type: "integer", description: "ترتيب اليوم المتسلسل (مثال: 1، 2، 3...)" },
                                            exercises: {
                                                type: "array",
                                                description: "قائمة التمارين الخاصة بهذا اليوم (تترك فارغة إذا كان يوم راحة)",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        exercise_name: { type: "string", description: "اسم التمرين باللغة العربية أو الإنجليزية" },
                                                        sets: { type: "integer", description: "عدد الجولات المطلوبة (مثال: 4)" },
                                                        reps: { type: "string", description: "التكرارات المطلوبة في كل جولة (مثال: '8-12' أو '12')" },
                                                        notes: { type: "string", description: "ملاحظات إضافية للتمرين مثل الراحة، الأداء، إلخ (اختياري)" }
                                                    },
                                                    required: ["exercise_name", "sets", "reps"]
                                                }
                                            }
                                        },
                                        required: ["day_name", "day_order"]
                                    }
                                }
                            },
                            required: ["name", "days"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "list_gym_expenses",
                        description: "عرض أو استعلام قائمة المصروفات الخاصة بالنادي مع الفئات والمبالغ الإجمالية",
                        parameters: {
                            type: "object",
                            properties: {
                                category: { type: "string", description: "تصفية حسب الفئة، مثل: 'رواتب'، 'فواتير'، 'أجهزة' (اختياري)" },
                                limit: { type: "integer", description: "أقصى عدد من المصروفات لعرضها (اختياري، الافتراضي 20)" }
                            }
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "add_gym_expense",
                        description: "إضافة مصروف جديد للنادي (مثل فواتير، رواتب، شراء أجهزة)",
                        parameters: {
                            type: "object",
                            properties: {
                                title: { type: "string", description: "عنوان أو وصف المصروف (مثال: 'فاتورة الكهرباء لشهر 5')" },
                                amount: { type: "number", description: "قيمة المصروف بالشيكل (₪) (مثال: 350.50)" },
                                category: { type: "string", description: "فئة المصروف، مثل: 'bills' (فواتير)، 'salaries' (رواتب)، 'equipment' (أجهزة)، 'rent' (إيجار) أو 'general' (عام)" },
                                expense_date: { type: "string", description: "تاريخ المصروف بصيغة YYYY-MM-DD (اختياري، الافتراضي اليوم)" }
                            },
                            required: ["title", "amount"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "edit_gym_expense",
                        description: "تعديل بيانات مصروف مسجل مسبقاً باستخدام معرف المصروف (ID)",
                        parameters: {
                            type: "object",
                            properties: {
                                expense_id: { type: "string", description: "معرّف المصروف الفريد (UUID) المراد تعديله" },
                                title: { type: "string", description: "العنوان الجديد للمصروف (اختياري)" },
                                amount: { type: "number", description: "القيمة الجديدة للمصروف بالشيكل (₪) (اختياري)" },
                                category: { type: "string", description: "الفئة الجديدة للمصروف (اختياري)" },
                                expense_date: { type: "string", description: "التاريخ الجديد للمصروف بصيغة YYYY-MM-DD (اختياري)" }
                            },
                            required: ["expense_id"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "delete_gym_expense",
                        description: "حذف مصروف مسجل مسبقاً باستخدام معرف المصروف (ID)",
                        parameters: {
                            type: "object",
                            properties: {
                                expense_id: { type: "string", description: "معرّف المصروف الفريد (UUID) المراد حذفه" }
                            },
                            required: ["expense_id"]
                        }
                    }
                }
            );
        }

        // أداة تقديم طلب التجميد متاحة للاعبين فقط
        if (playerId && !adminId) {
            tools.push(
                {
                    type: "function",
                    function: {
                        name: "submit_freeze_request",
                        description: "تقديم طلب تجميد اشتراك اللاعب الحالي. تُستخدم عندما يطلب اللاعب تجميد اشتراكه لمدة معينة وسبب معين.",
                        parameters: {
                            type: "object",
                            properties: {
                                days: { type: "integer", description: "عدد أيام التجميد المطلوبة (بين 1 و 30 يوم). أسبوع = 7 أيام." },
                                reason: { type: "string", description: "سبب طلب التجميد (مثل: سفر، مرض، ظروف عائلية)" }
                            },
                            required: ["days"]
                        }
                    }
                }
            );
        }

        const payload = {
            model: GEMINI_MODEL || "google/gemma-2-9b-it:free",
            messages: openaiMessages
        };

        if (tools.length > 0) {
            payload.tools = tools;
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GEMINI_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "OpenRouter API Error");

        const choice = data.choices?.[0];
        const message = choice?.message;
        const toolCalls = message?.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
            const toolResponses = [];
            for (const toolCall of toolCalls) {
                const name = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments || "{}");
                const result = await executeTool(name, args, adminId, playerId);
                toolResponses.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }

            const secondPayload = {
                model: GEMINI_MODEL || "google/gemma-2-9b-it:free",
                messages: [
                    ...openaiMessages,
                    message,
                    ...toolResponses
                ]
            };

            if (tools.length > 0) {
                secondPayload.tools = tools;
            }

            let reply = "";
            try {
                const secondResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${GEMINI_API_KEY}`
                    },
                    body: JSON.stringify(secondPayload)
                });

                if (secondResponse.ok) {
                    const secondData = await secondResponse.json();
                    reply = secondData.choices?.[0]?.message?.content || "";
                } else {
                    console.warn(`OpenRouter second turn failed status: ${secondResponse.status}`);
                }
            } catch (secondError) {
                console.error("OpenRouter second turn error (falling back to manual reply):", secondError);
            }

            if (!reply) {
                const toolsText = toolResponses.map(tr => {
                    try {
                        const parsed = JSON.parse(tr.content);
                        return parsed?.message || parsed?.error || "";
                    } catch (e) {
                        return "";
                    }
                }).filter(Boolean).join("\n");

                if (toolsText) {
                    reply = `تم تنفيذ الإجراء بنجاح:\n${toolsText}`;
                } else {
                    throw new Error("No response from OpenRouter on second turn.");
                }
            }

            if (supabase && playerId) {
                const lastUserMsg = contents[contents.length - 1];
                const userText = extractContentText(lastUserMsg?.parts);
                Promise.all([
                    supabase.from('ai_chat_history').insert({ player_id: playerId, role: 'user', content: userText }),
                    supabase.from('ai_chat_history').insert({ 
                        player_id: playerId, 
                        role: 'assistant', 
                        content: reply,
                        meta: 'تم تنفيذ إجراء بنجاح عبر OpenRouter'
                    })
                ]).catch(e => console.error("Error saving OpenRouter history:", e));
            }

            return sendJson(res, 200, {
                reply,
                actionExecuted: true,
                searchUsed: false,
                searchQueries: [],
                sources: []
            });
        }

        const reply = message?.content || "";
        if (!reply) throw new Error("No response from OpenRouter.");

        if (supabase && playerId) {
            const lastUserMsg = contents[contents.length - 1];
            const userText = extractContentText(lastUserMsg?.parts);
            Promise.all([
                supabase.from('ai_chat_history').insert({ player_id: playerId, role: 'user', content: userText }),
                supabase.from('ai_chat_history').insert({ 
                    player_id: playerId, 
                    role: 'assistant', 
                    content: reply,
                    meta: 'رد من خادم OpenRouter'
                })
            ]).catch(e => console.error("Error saving OpenRouter history:", e));
        }

        return sendJson(res, 200, {
            reply,
            actionExecuted: false,
            searchUsed: false,
            searchQueries: [],
            sources: []
        });

    } catch (error) {
        console.error("OpenRouter API error:", error);
        return sendJson(res, 502, { error: "خطأ في الاتصال بـ OpenRouter API: " + error.message });
    }
}

async function handleChatHistory(req, res) {
    if (!supabase) return sendJson(res, 500, { error: "Supabase غير مفعل في الخادم." });
    try {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const playerId = urlObj.searchParams.get("playerId");
        if (!playerId) {
            return sendJson(res, 400, { error: "معرف اللاعب (playerId) مطلوب." });
        }

        const { data, error } = await supabase
            .from('ai_chat_history')
            .select('*')
            .eq('player_id', playerId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching chat history:", error);
            return sendJson(res, 500, { error: "خطأ في جلب سجل المحادثة." });
        }

        const history = data.map(msg => ({
            role: msg.role,
            content: msg.content,
            meta: msg.meta,
            sources: [] 
        }));

        return sendJson(res, 200, { history });
    } catch (e) {
        console.error("History fetch error:", e);
        return sendJson(res, 500, { error: "خطأ داخلي." });
    }
}



function buildSearchQuery(contents) {
    const lastUserContent = [...contents]
        .reverse()
        .find((message) => normalizeRole(message?.role) === "user");

    const text = extractContentText(lastUserContent?.parts);
    if (!text) {
        return "";
    }

    return text
        .replace(/^ابحث(?:\s+في)?(?:\s+الإنترنت|\s+الانترنت|\s+النت)?\s+عن[:：]?\s*/i, "")
        .replace(/^ما\s+آخر\s+/i, "")
        .trim();
}

async function searchWeb(query) {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "ar,en-US;q=0.9,en;q=0.8"
        }
    });

    if (!response.ok) {
        throw new Error(`DuckDuckGo search failed with ${response.status}`);
    }

    const html = await response.text();
    return parseDuckDuckGoResults(html).slice(0, 5);
}

function parseDuckDuckGoResults(html) {
    const results = [];
    const seen = new Set();
    const anchorRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = anchorRegex.exec(html)) && results.length < 8) {
        const context = html.slice(match.index, match.index + 1500);
        const snippetMatch =
            context.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i) ||
            context.match(/<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);

        const url = extractDuckDuckGoTarget(match[1]);
        const title = cleanupText(stripTags(decodeHtmlEntities(match[2])));
        const snippet = cleanupText(stripTags(decodeHtmlEntities(snippetMatch?.[1] || "")));

        if (!url || !title || seen.has(url)) {
            continue;
        }

        seen.add(url);
        results.push({
            title,
            url,
            snippet
        });
    }

    return results;
}

function extractDuckDuckGoTarget(rawHref) {
    const decodedHref = decodeHtmlEntities(rawHref || "");
    if (!decodedHref) {
        return "";
    }

    try {
        const href = decodedHref.startsWith("//") ? `https:${decodedHref}` : decodedHref;
        const url = new URL(href);

        if (url.hostname.includes("duckduckgo.com")) {
            const target = url.searchParams.get("uddg");
            return target ? decodeURIComponent(target) : "";
        }

        return href;
    } catch (error) {
        return "";
    }
}

function buildSearchContext(query, results) {
    const lines = [
        `نتائج بحث ويب حديثة حول: ${query}`
    ];

    results.forEach((result, index) => {
        lines.push(
            `${index + 1}. ${result.title}`,
            `الرابط: ${result.url}`,
            result.snippet ? `الملخص: ${result.snippet}` : ""
        );
    });

    return lines.filter(Boolean).join("\n");
}

function extractSystemInstructionText(systemInstruction) {
    if (!isPlainObject(systemInstruction)) {
        return "";
    }

    return extractContentText(systemInstruction?.parts);
}

function extractContentText(parts) {
    if (!Array.isArray(parts)) {
        return "";
    }

    return parts
        .map((part) => String(part?.text || "").trim())
        .filter(Boolean)
        .join("\n\n");
}

function normalizeRole(role) {
    return role === "model" ? "assistant" : "user";
}

function findLastUserMessageIndex(messages) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index]?.role === "user") {
            return index;
        }
    }

    return -1;
}


function decodeHtmlEntities(text) {
    return String(text || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
        const named = {
            amp: "&",
            lt: "<",
            gt: ">",
            quot: "\"",
            apos: "'",
            nbsp: " "
        };

        if (named[entity]) {
            return named[entity];
        }

        if (entity === "#39" || entity.toLowerCase() === "#x27") {
            return "'";
        }

        if (entity.startsWith("#x") || entity.startsWith("#X")) {
            const code = Number.parseInt(entity.slice(2), 16);
            return Number.isFinite(code) ? String.fromCodePoint(code) : "";
        }

        if (entity.startsWith("#")) {
            const code = Number.parseInt(entity.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : "";
        }

        return "";
    });
}

function stripTags(text) {
    return String(text || "").replace(/<[^>]*>/g, " ");
}

function cleanupText(text) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .trim();
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let rawBody = "";

        req.on("data", (chunk) => {
            rawBody += chunk;
        });

        req.on("end", () => {
            try {
                resolve(JSON.parse(rawBody || "{}"));
            } catch (error) {
                reject(error);
            }
        });

        req.on("error", reject);
    });
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8"
    });
    res.end(JSON.stringify(payload));
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function trimTrailingSlash(value) {
    return String(value || "").replace(/\/+$/, "");
}
