-- HAFED POLY academic session support. Back up the database before applying.
CREATE TABLE IF NOT EXISTS academic_sessions (
  academic_session_id INT AUTO_INCREMENT PRIMARY KEY,
  session_name VARCHAR(20) NOT NULL UNIQUE,
  starts_on DATE NULL,
  ends_on DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO academic_sessions (session_name, is_active) VALUES ('2026/2027', 1);
ALTER TABLE timetable_sessions ADD COLUMN academic_session_id INT NULL;
UPDATE timetable_sessions SET academic_session_id = (SELECT academic_session_id FROM academic_sessions WHERE is_active = 1 LIMIT 1) WHERE academic_session_id IS NULL;
ALTER TABLE timetable_sessions ADD CONSTRAINT fk_timetable_academic_session FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(academic_session_id) ON DELETE RESTRICT;
CREATE INDEX idx_timetable_session_semester_status ON timetable_sessions (academic_session_id, semester, status);
