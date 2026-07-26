-- Lumina Script - Supabase Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Profiles (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Novel statuses
CREATE TABLE IF NOT EXISTS novel_statuses (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reading','plan-to-read','completed','dropped')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, novel_id)
);

-- Reading progress
CREATE TABLE IF NOT EXISTS reading_progress (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT NOT NULL,
  last_read_chapter INT DEFAULT 0,
  chapters_read INT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, novel_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  novel_id TEXT NOT NULL,
  chapter_id INT,
  text TEXT NOT NULL,
  likes INT DEFAULT 0,
  liked_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, novel_id)
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, novel_id)
);

-- Reading analytics
CREATE TABLE IF NOT EXISTS reading_analytics (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT NOT NULL,
  sessions INT DEFAULT 0,
  total_time_ms BIGINT DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, novel_id)
);

-- Reading history
CREATE TABLE IF NOT EXISTS reading_history (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT NOT NULL,
  chapter_id INT NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, novel_id)
);

-- Global ratings (for average calculation)
CREATE TABLE IF NOT EXISTS global_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, novel_id)
);

-- ========== ROW LEVEL SECURITY ==========

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE novel_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_ratings ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles: public read" ON profiles FOR SELECT USING (true);
CREATE POLICY "Profiles: own insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: own update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Novel statuses
CREATE POLICY "NS: own select" ON novel_statuses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "NS: own insert" ON novel_statuses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "NS: own update" ON novel_statuses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "NS: own delete" ON novel_statuses FOR DELETE USING (auth.uid() = user_id);

-- Reading progress
CREATE POLICY "RP: own select" ON reading_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "RP: own insert" ON reading_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "RP: own update" ON reading_progress FOR UPDATE USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "Comments: public read" ON comments FOR SELECT USING (true);
CREATE POLICY "Comments: own insert" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Comments: own delete" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Ratings
CREATE POLICY "Ratings: own select" ON ratings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Ratings: own insert" ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Ratings: own update" ON ratings FOR UPDATE USING (auth.uid() = user_id);

-- Favorites
CREATE POLICY "Fav: own select" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Fav: own insert" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Fav: own delete" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Reading analytics
CREATE POLICY "RA: own select" ON reading_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "RA: own insert" ON reading_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "RA: own update" ON reading_analytics FOR UPDATE USING (auth.uid() = user_id);

-- Reading history
CREATE POLICY "RH: own select" ON reading_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "RH: own insert" ON reading_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Global ratings
CREATE POLICY "GR: public read" ON global_ratings FOR SELECT USING (true);
CREATE POLICY "GR: own insert" ON global_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "GR: own delete" ON global_ratings FOR DELETE USING (auth.uid() = user_id);

-- ========== INDEXES ==========

CREATE INDEX IF NOT EXISTS idx_comments_novel ON comments(novel_id);
CREATE INDEX IF NOT EXISTS idx_comments_chapter ON comments(novel_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_global_ratings_novel ON global_ratings(novel_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
