-- Supabase에서 실행: Table Editor > SQL Editor에서 아래 SQL을 붙여넣기

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  prompt_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security 비활성화 (로그인 없는 공개 앱)
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;
