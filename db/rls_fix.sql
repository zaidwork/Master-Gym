-- ====================================================
-- إصلاح شامل: إنشاء جدول renewal_requests + تفعيل RLS
-- شغّل هذا الكود في Supabase SQL Editor
-- ====================================================

-- إنشاء جدول طلبات التجديد إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS renewal_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS والسماح بالوصول الكامل
ALTER TABLE renewal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on renewal_requests" ON renewal_requests;
CREATE POLICY "Allow all on renewal_requests" ON renewal_requests
    FOR ALL USING (true) WITH CHECK (true);

-- تطبيق باقي الجداول التي قد تكون ناقصة
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on players" ON players;
CREATE POLICY "Allow all on players" ON players
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on admins" ON admins;
CREATE POLICY "Allow all on admins" ON admins
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE player_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on player_subscriptions" ON player_subscriptions;
CREATE POLICY "Allow all on player_subscriptions" ON player_subscriptions
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on player_progress" ON player_progress;
CREATE POLICY "Allow all on player_progress" ON player_progress
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
CREATE POLICY "Allow all on messages" ON messages
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on notifications" ON notifications;
CREATE POLICY "Allow all on notifications" ON notifications
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE freeze_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on freeze_requests" ON freeze_requests;
CREATE POLICY "Allow all on freeze_requests" ON freeze_requests
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE player_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on player_schedules" ON player_schedules;
CREATE POLICY "Allow all on player_schedules" ON player_schedules
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on workout_templates" ON workout_templates;
CREATE POLICY "Allow all on workout_templates" ON workout_templates
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE subscription_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on subscription_types" ON subscription_types;
CREATE POLICY "Allow all on subscription_types" ON subscription_types
    FOR ALL USING (true) WITH CHECK (true);

-- إعادة تحميل الكاش
NOTIFY pgrst, 'reload schema';
