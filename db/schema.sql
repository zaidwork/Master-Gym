-- Al-Kark Gym Database Schema
-- التاكد من تفعيل اضافة uuid
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- تم إضافة أوامر DROP لحذف البيانات السابقة وإعادة ضبط القاعدة من الصفر
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS player_schedules CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS workout_days CASCADE;
DROP TABLE IF EXISTS workout_templates CASCADE;
DROP TABLE IF EXISTS renewal_requests CASCADE;
DROP TABLE IF EXISTS player_subscriptions CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS subscription_types CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- جدول المدراء
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ملاحظة: في المشاريع الحقيقية يجب تشفير كلمة المرور
INSERT INTO admins (id, username, password)
VALUES (
        '07940168-73a8-4d8e-b954-b8d868e5b33f',
        'admin',
        'admin123'
    ) ON CONFLICT (id) DO NOTHING;
-- جدول أنواع الاشتراكات (يمكن للمدير إضافتها)
CREATE TABLE IF NOT EXISTS subscription_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_days INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    points INT DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- جدول اللاعبين
-- يتم تمييز اللاعبين برقم الهاتف (مفتاح فريد) والاسم (مفتاح فريد عشان ما يصير تكرار)
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id VARCHAR(3) UNIQUE,
    full_name VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    address TEXT,
    is_military BOOLEAN NOT NULL DEFAULT false,
    -- true إذا كان عسكرياً، false إذا كان مدنياً
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending' (قيد الانتظار), 'approved' (تمت الموافقة), 'rejected' (مرفوض)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- جدول اشتراكات اللاعبين
CREATE TABLE IF NOT EXISTS player_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    subscription_type_id UUID REFERENCES subscription_types(id) ON DELETE RESTRICT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- جدول طلبات التجديد
CREATE TABLE IF NOT EXISTS renewal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending' (قيد الانتظار), 'approved' (تم اعتماده), 'rejected' (مرفوض)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- جدول قوالب التمارين (البرامج التدريبية)
CREATE TABLE IF NOT EXISTS workout_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الايام التابعة للقالب
CREATE TABLE IF NOT EXISTS workout_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES workout_templates(id) ON DELETE CASCADE,
    day_order INT NOT NULL,
    day_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول تفاصيل التمارين لكل يوم
CREATE TABLE IF NOT EXISTS workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_id UUID REFERENCES workout_days(id) ON DELETE CASCADE,
    exercise_name VARCHAR(255) NOT NULL,
    sets INT NOT NULL DEFAULT 3,
    reps VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول ربط اللاعب بالبرنامج التدريبي (تعيين البرنامج)
CREATE TABLE IF NOT EXISTS player_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    template_id UUID REFERENCES workout_templates(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- جدول الرسائل (للتواصل بين المدرب/المدير واللاعب)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_type VARCHAR(20) CHECK (sender_type IN ('player', 'admin')),
    sender_id UUID NOT NULL,
    -- سواء كان id اللاعب أو id المدير
    receiver_id UUID NOT NULL,
    -- للطرف الآخر
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    file_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- تفعيل ميزة التحديث الفوري (Realtime) لجدول الرسائل
BEGIN;
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime
ADD TABLE messages;
ALTER PUBLICATION supabase_realtime
ADD TABLE renewal_requests;

-- تحديث قاعدة البيانات الحالية (إضافة رقم المشترك والمحادثات)
ALTER TABLE players ADD COLUMN IF NOT EXISTS club_id VARCHAR(3) UNIQUE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;

-- ----------------------------------------------------
-- إعدادات مساحة التخزين الخاصة بالصور (Storage Buckets)
-- ----------------------------------------------------

-- إنشاء محفظة "chat_media" وجعلها عامة (Public) إن لم تكن موجودة
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_media', 'chat_media', true) 
ON CONFLICT (id) DO NOTHING;

-- سياسات الأمان (RLS Policies) لتخزين الصور
-- السماح للجميع بقراءة الصور ومشاهدتها (Public Select)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'chat_media' );

-- السماح بالرفع (Public Insert for ease of use in demo)
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
CREATE POLICY "Allow Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'chat_media' );

-- ----------------------------------------------------
-- نظام الإشعارات المتكامل (Integrated Notifications)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- The ID of the admin or player
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تحديث النشر للأحداث المباشرة (Realtime Publication)
BEGIN;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
COMMIT;

-- دالة (Function) الإدراج للإشعارات الجديدة للاعب عند التسجيل
CREATE OR REPLACE FUNCTION notify_admin_on_new_player() 
RETURNS TRIGGER AS $$
DECLARE admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM admins LIMIT 1;
  IF admin_id IS NOT NULL THEN
    INSERT INTO notifications(user_id, title, content) 
    VALUES (admin_id, 'تسجيل لاعب جديد بانتظار التفعيل', 'قام المشترك ' || NEW.full_name || ' بطلب الانضمام للنادي للتو.');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_new_player_notification ON players;
CREATE TRIGGER trigger_new_player_notification
AFTER INSERT ON players
FOR EACH ROW EXECUTE FUNCTION notify_admin_on_new_player();

-- دالة الإشعار عند اعتماد اشتراك للاعب
CREATE OR REPLACE FUNCTION notify_player_on_subscription() 
RETURNS TRIGGER AS $$
BEGIN
  -- We assume new active subscriptions or updates making it active
  IF (NEW.is_active = true) THEN
    INSERT INTO notifications(user_id, title, content) 
    VALUES (NEW.player_id, 'اشتراك تم تفعيله 🚀', 'تم تفعيل بنود اشتراكك بنجاح. أهلاً بك في النادي وتمرينة موفقة!');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscription_notification ON player_subscriptions;
CREATE TRIGGER trigger_subscription_notification
AFTER INSERT ON player_subscriptions
FOR EACH ROW EXECUTE FUNCTION notify_player_on_subscription();

-- دالة الإشعار عند إضافة برنامج تدريبي
CREATE OR REPLACE FUNCTION notify_player_on_schedule() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications(user_id, title, content) 
  VALUES (NEW.player_id, 'برنامج تدريبي مخصص 🏋️', 'لقد قام كابتن النادي بتعيين ورفع جدول تمارين خاص بك خصيصاً في ملفك.');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_schedule_notification ON player_schedules;
CREATE TRIGGER trigger_schedule_notification
AFTER INSERT ON player_schedules
FOR EACH ROW EXECUTE FUNCTION notify_player_on_schedule();

-- ----------------------------------------------------
-- تطويرات المرحلة الخماسية الشاملة (The 5-Phase Massive Update)
-- ----------------------------------------------------

-- 1. إضافة حقل النقاط Gamification للجدول الرئيسي
ALTER TABLE players ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- 2. جدول متتبع التطور البدني (Body Progress Tracker)
CREATE TABLE IF NOT EXISTS player_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL, -- in kg
    height DECIMAL(5,2), -- in cm
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE player_progress ADD COLUMN IF NOT EXISTS height DECIMAL(5,2);


-- 4. جدول طلبات تجميد الاشتراك (Freeze Requests)
CREATE TABLE IF NOT EXISTS freeze_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES player_subscriptions(id) ON DELETE CASCADE,
    days INTEGER NOT NULL CHECK (days > 0 AND days <= 30),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- دالة التجميد الآلي: عندما يوافق الإدمن على التجميد، نمدد الاشتراك بمقدار الأيام
CREATE OR REPLACE FUNCTION process_freeze_approval() 
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'approved' AND OLD.status = 'pending') THEN
    -- Update the end_date of the subscription
    UPDATE player_subscriptions 
    SET end_date = end_date + (NEW.days || ' days')::INTERVAL
    WHERE id = NEW.subscription_id;
    
    -- Send notification to player
    INSERT INTO notifications(user_id, title, content) 
    VALUES (NEW.player_id, 'تمت الموافقة على التجميد ❄️', 'تم تجميد اشتراكك وتمديده بمقدار ' || NEW.days || ' يوم بنجاح.');
  ELSIF (NEW.status = 'rejected' AND OLD.status = 'pending') THEN
    -- Send rejection notification
    INSERT INTO notifications(user_id, title, content) 
    VALUES (NEW.player_id, 'رفض طلب التجميد', 'نعتذر، لم يتم الموافقة على طلب تجميد الاشتراك الخاص بك.');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_freeze_approval ON freeze_requests;
CREATE TRIGGER trigger_freeze_approval
AFTER UPDATE ON freeze_requests
FOR EACH ROW EXECUTE FUNCTION process_freeze_approval();

-- تحديث النشر للأحداث المباشرة (Realtime Publication)
BEGIN;
ALTER PUBLICATION supabase_realtime ADD TABLE player_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE player_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE freeze_requests;
COMMIT;

-- ----------------------------------------------------
-- Phase 6: Expenses Tracker (المصروفات والمحاسبة)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS gym_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    expense_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------
-- التأكد من وجود قيود العلاقات (Foreign Keys) لحل مشكلة PGRST200
-- ----------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'freeze_requests') THEN
        -- حذف أي بيانات في جدول التجميد لا يوجد لها مستخدم أو اشتراك (بيانات يتيمة/وهمية) تمنع إضافة القيود
        DELETE FROM freeze_requests WHERE player_id NOT IN (SELECT id FROM players);
        DELETE FROM freeze_requests WHERE subscription_id NOT IN (SELECT id FROM player_subscriptions);

        -- إضافة القيود
        ALTER TABLE freeze_requests DROP CONSTRAINT IF EXISTS fk_player;
        ALTER TABLE freeze_requests ADD CONSTRAINT fk_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
        
        ALTER TABLE freeze_requests DROP CONSTRAINT IF EXISTS fk_subscription;
        ALTER TABLE freeze_requests ADD CONSTRAINT fk_subscription FOREIGN KEY (subscription_id) REFERENCES player_subscriptions(id) ON DELETE CASCADE;
    END IF;

    -- التحويل من DATE إلى TIMESTAMP WITH TIME ZONE للأعمدة المعنية
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'player_subscriptions' AND column_name = 'start_date' AND data_type = 'date') THEN
        ALTER TABLE player_subscriptions ALTER COLUMN start_date TYPE TIMESTAMP WITH TIME ZONE USING start_date::TIMESTAMP WITH TIME ZONE;
        ALTER TABLE player_subscriptions ALTER COLUMN end_date TYPE TIMESTAMP WITH TIME ZONE USING end_date::TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- إعادة تحميل كاش PostgREST لضمان قراءة العلاقات فوراً
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------
-- Phase 7: AI Assistant Integration (المساعد الذكي)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    meta TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تحديث النشر للأحداث المباشرة (Realtime Publication)
BEGIN;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_history;
COMMIT;
NOTIFY pgrst, 'reload schema';

-- ====================================================
-- Phase 8: إصلاح سياسات RLS لجميع الجداول
-- يجب تشغيل هذا القسم في Supabase SQL Editor
-- لحل أخطاء 406 (قراءة محظورة) و 403 (كتابة محظورة)
-- ====================================================

-- 1. جدول اللاعبين
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on players" ON players;
CREATE POLICY "Allow all on players" ON players
    FOR ALL USING (true) WITH CHECK (true);

-- 2. جدول المديرين
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on admins" ON admins;
CREATE POLICY "Allow all on admins" ON admins
    FOR ALL USING (true) WITH CHECK (true);

-- 3. جدول أنواع الاشتراكات
ALTER TABLE subscription_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on subscription_types" ON subscription_types;
CREATE POLICY "Allow all on subscription_types" ON subscription_types
    FOR ALL USING (true) WITH CHECK (true);

-- 4. جدول اشتراكات اللاعبين
ALTER TABLE player_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on player_subscriptions" ON player_subscriptions;
CREATE POLICY "Allow all on player_subscriptions" ON player_subscriptions
    FOR ALL USING (true) WITH CHECK (true);

-- 5. جدول طلبات التجديد
ALTER TABLE renewal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on renewal_requests" ON renewal_requests;
CREATE POLICY "Allow all on renewal_requests" ON renewal_requests
    FOR ALL USING (true) WITH CHECK (true);

-- 6. جدول قوالب التمارين
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on workout_templates" ON workout_templates;
CREATE POLICY "Allow all on workout_templates" ON workout_templates
    FOR ALL USING (true) WITH CHECK (true);

-- 7. جدول أيام التمارين
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on workout_days" ON workout_days;
CREATE POLICY "Allow all on workout_days" ON workout_days
    FOR ALL USING (true) WITH CHECK (true);

-- 8. جدول تفاصيل التمارين
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on workout_exercises" ON workout_exercises;
CREATE POLICY "Allow all on workout_exercises" ON workout_exercises
    FOR ALL USING (true) WITH CHECK (true);

-- 9. جدول جداول اللاعبين
ALTER TABLE player_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on player_schedules" ON player_schedules;
CREATE POLICY "Allow all on player_schedules" ON player_schedules
    FOR ALL USING (true) WITH CHECK (true);

-- 10. جدول الرسائل
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
CREATE POLICY "Allow all on messages" ON messages
    FOR ALL USING (true) WITH CHECK (true);

-- 11. جدول الإشعارات
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on notifications" ON notifications;
CREATE POLICY "Allow all on notifications" ON notifications
    FOR ALL USING (true) WITH CHECK (true);

-- 12. جدول تتبع الوزن
ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on player_progress" ON player_progress;
CREATE POLICY "Allow all on player_progress" ON player_progress
    FOR ALL USING (true) WITH CHECK (true);

-- 13. جدول طلبات التجميد
ALTER TABLE freeze_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on freeze_requests" ON freeze_requests;
CREATE POLICY "Allow all on freeze_requests" ON freeze_requests
    FOR ALL USING (true) WITH CHECK (true);

-- 14. جدول مصروفات النادي
ALTER TABLE gym_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on gym_expenses" ON gym_expenses;
CREATE POLICY "Allow all on gym_expenses" ON gym_expenses
    FOR ALL USING (true) WITH CHECK (true);

-- 15. جدول سجل محادثات الذكاء الاصطناعي
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on ai_chat_history" ON ai_chat_history;
CREATE POLICY "Allow all on ai_chat_history" ON ai_chat_history
    FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------------------
-- Phase 9: Gamification & Points System (نظام النقاط المطور)
-- ----------------------------------------------------
ALTER TABLE subscription_types ADD COLUMN IF NOT EXISTS points INT DEFAULT 100;

CREATE TABLE IF NOT EXISTS gamification_config (
    key VARCHAR(50) PRIMARY KEY,
    value VARCHAR(255) NOT NULL
);

INSERT INTO gamification_config (key, value) VALUES
('signup_bonus', '50'),
('weight_loss_points_per_kg', '20'),
('early_attendance_points', '15'),
('early_attendance_time', '09:00'),
('default_subscription_points', '100')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS points_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to automatically sync players.points on new transaction
CREATE OR REPLACE FUNCTION update_player_points_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE players
    SET points = COALESCE(points, 0) + NEW.amount
    WHERE id = NEW.player_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_player_points ON points_transactions;
CREATE TRIGGER trigger_update_player_points
AFTER INSERT ON points_transactions
FOR EACH ROW EXECUTE FUNCTION update_player_points_on_transaction();

-- Enable RLS
ALTER TABLE gamification_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on gamification_config" ON gamification_config;
CREATE POLICY "Allow all on gamification_config" ON gamification_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on points_transactions" ON points_transactions;
CREATE POLICY "Allow all on points_transactions" ON points_transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE player_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on player_attendance" ON player_attendance;
CREATE POLICY "Allow all on player_attendance" ON player_attendance FOR ALL USING (true) WITH CHECK (true);

-- Add to Realtime
BEGIN;
ALTER PUBLICATION supabase_realtime ADD TABLE points_transactions;
COMMIT;

-- إعادة تحميل كاش PostgREST
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------
-- Phase 10: Gender & Password Reset Request (الجنس وتأكيد كلمة المرور)
-- ----------------------------------------------------
ALTER TABLE players ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'ذكر' CHECK (gender IN ('ذكر', 'أنثى'));
ALTER TABLE players ADD COLUMN IF NOT EXISTS email VARCHAR(255);

CREATE TABLE IF NOT EXISTS password_reset_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on password_reset_requests" ON password_reset_requests;
CREATE POLICY "Allow all on password_reset_requests" ON password_reset_requests 
    FOR ALL USING (true) WITH CHECK (true);

-- Add to Realtime
BEGIN;
ALTER PUBLICATION supabase_realtime ADD TABLE password_reset_requests;
COMMIT;

NOTIFY pgrst, 'reload schema';