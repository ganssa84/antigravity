-- ============================================================
-- 버터플레이스 출결관리 스키마
-- Supabase > SQL Editor에서 아래 전체를 붙여넣고 실행하세요
-- ============================================================

-- 학생 테이블
CREATE TABLE IF NOT EXISTS bp_students (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT        NOT NULL,
  parent_phone       TEXT        NOT NULL,
  lessons_per_week   SMALLINT    NOT NULL DEFAULT 1,   -- 1 또는 2
  sessions_per_cycle SMALLINT    NOT NULL DEFAULT 4,   -- 4 또는 8 (커스텀 가능)
  current_session    SMALLINT    NOT NULL DEFAULT 0,   -- 현재 사이클 내 몇 회차 완료
  current_cycle      INT         NOT NULL DEFAULT 1,   -- 몇 번째 사이클
  is_active          BOOLEAN     NOT NULL DEFAULT true,
  birth_date         DATE,
  note               TEXT,
  created_at         TIMESTAMPTZ          DEFAULT NOW(),
  updated_at         TIMESTAMPTZ          DEFAULT NOW()
);

-- 출석 기록 테이블
CREATE TABLE IF NOT EXISTS bp_attendance (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID        NOT NULL REFERENCES bp_students(id) ON DELETE CASCADE,
  attended_at    TIMESTAMPTZ          DEFAULT NOW(),
  session_number SMALLINT    NOT NULL,  -- 해당 사이클의 몇 회차
  cycle_number   INT         NOT NULL,  -- 몇 번째 사이클
  is_makeup      BOOLEAN     NOT NULL DEFAULT false,
  kakao_sent     BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ          DEFAULT NOW()
);

-- RLS 비활성화 (내부 전용 도구)
ALTER TABLE bp_students  DISABLE ROW LEVEL SECURITY;
ALTER TABLE bp_attendance DISABLE ROW LEVEL SECURITY;

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION bp_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bp_students_updated_at ON bp_students;
CREATE TRIGGER trg_bp_students_updated_at
  BEFORE UPDATE ON bp_students
  FOR EACH ROW EXECUTE FUNCTION bp_update_updated_at();

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_bp_attendance_student_id ON bp_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_bp_attendance_attended_at ON bp_attendance(attended_at);
