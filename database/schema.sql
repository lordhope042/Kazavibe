CREATE TABLE IF NOT EXISTS academic_sessions (
  academic_session_id INT AUTO_INCREMENT PRIMARY KEY,
  session_name VARCHAR(20) NOT NULL UNIQUE,
  starts_on DATE NULL, ends_on DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Computer Science Department Timetable Generator
-- HAFED POLY, Kazaure — Database Schema
-- Engine: MySQL (InnoDB, utf8mb4)
-- ============================================================

CREATE DATABASE IF NOT EXISTS cs_timetable
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cs_timetable;

-- ============================================================
-- 1. USERS / AUTH
-- ============================================================

CREATE TABLE admins (
    admin_id        INT AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('super_admin', 'admin') NOT NULL DEFAULT 'admin',
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE departments (
    department_id   INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,     -- e.g. 'Computer Science'
    short_code      VARCHAR(20) NOT NULL UNIQUE,       -- e.g. 'CS'
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE class_groups (
    class_group_id  INT AUTO_INCREMENT PRIMARY KEY,
    department_id   INT NOT NULL,
    name            VARCHAR(50) NOT NULL UNIQUE,        -- e.g. 'ND II', 'HND I - NCC'
    program         ENUM('ND', 'HND') NOT NULL,
    level           ENUM('100', '200', '300', '400') NOT NULL,
    specialization  ENUM('SWD', 'NCC') NULL,             -- set only when program = 'HND'
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_level_program CHECK (
        (program = 'ND'  AND level IN ('100','200') AND specialization IS NULL) OR
        (program = 'HND' AND level IN ('300','400') AND specialization IS NOT NULL)
    ),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE students (
    student_id      INT AUTO_INCREMENT PRIMARY KEY,
    reg_no          VARCHAR(30) NOT NULL UNIQUE,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    class_group_id  INT NOT NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_group_id) REFERENCES class_groups(class_group_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 2. ACADEMIC DATA
-- ============================================================

CREATE TABLE lecturers (
    lecturer_id     INT AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NULL UNIQUE,
    phone           VARCHAR(30) NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE rooms (
    room_id         INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,   -- e.g. 'ND 1 Classroom'
    room_type       ENUM('classroom') NOT NULL DEFAULT 'classroom',
    capacity        INT NULL,
    -- Dedicated classroom: when set, this room belongs to that class group
    -- and the generator schedules all of the group's courses in it.
    class_group_id  INT NULL UNIQUE,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_group_id) REFERENCES class_groups(class_group_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE courses (
    course_id           INT AUTO_INCREMENT PRIMARY KEY,
    course_code         VARCHAR(20) NOT NULL,        -- e.g. 'CSC 211'
    course_title        VARCHAR(150) NOT NULL,
    lecturer_id         INT NULL,
    class_group_id      INT NOT NULL,
    semester            ENUM('first', 'second') NOT NULL,
    credit_unit         INT NULL,
    sessions_required   INT NOT NULL DEFAULT 1,      -- weekly sessions needed
    session_type        ENUM('lecture', 'practical', 'tutorial', 'elective')
                         NOT NULL DEFAULT 'lecture',
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (class_group_id) REFERENCES class_groups(class_group_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE KEY uniq_course_group_semester (course_code, class_group_id, semester)
) ENGINE=InnoDB;

-- Students <-> courses they are registered for (drives "Registered Courses" card)
CREATE TABLE course_registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,
    course_id       INT NOT NULL,
    registered_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uniq_student_course (student_id, course_id)
) ENGINE=InnoDB;

-- ============================================================
-- 3. SCHEDULING CONFIGURATION
-- ============================================================

CREATE TABLE time_slots (
    time_slot_id    INT AUTO_INCREMENT PRIMARY KEY,
    day_of_week     ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    is_break        TINYINT(1) NOT NULL DEFAULT 0,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uniq_day_start (day_of_week, start_time)
) ENGINE=InnoDB;

CREATE TABLE academic_calendar (
    event_id        INT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(150) NOT NULL,
    event_date      DATE NOT NULL,
    end_date        DATE NULL,                       -- for ranges like a break period
    event_type      ENUM('semester_start','semester_end','break','exam','other')
                    NOT NULL DEFAULT 'other',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 4. TIMETABLE CORE
-- ============================================================

CREATE TABLE timetable_sessions (
    academic_session_id INT NULL,
    session_id      INT AUTO_INCREMENT PRIMARY KEY,
    course_id       INT NOT NULL,
    lecturer_id     INT NULL,                         -- denormalized snapshot for fast conflict checks
    semester        ENUM('first', 'second') NOT NULL,  -- denormalized from courses.semester — see note below
    room_id         INT NOT NULL,
    time_slot_id    INT NOT NULL,
    is_combined     TINYINT(1) NOT NULL DEFAULT 0,
    is_locked       TINYINT(1) NOT NULL DEFAULT 0,
    status          ENUM('draft','published') NOT NULL DEFAULT 'draft',
    generated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (time_slot_id) REFERENCES time_slots(time_slot_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    -- Hard constraint: a room can't hold two sessions in the same slot —
    -- but ONLY within the same semester. First and second semester are
    -- entirely separate, non-overlapping stretches of the academic year,
    -- so "Room 201, Monday 8am" in first semester and the identical slot
    -- in second semester are two different real-world bookings, not a
    -- conflict. semester is denormalized here (rather than joined from
    -- courses) specifically so this constraint can be enforced by the
    -- database itself, not just by application code.
    UNIQUE KEY uniq_room_slot (room_id, time_slot_id, semester)
) ENGINE=InnoDB;

-- A session normally serves one class group, but combined sessions serve several
CREATE TABLE session_class_groups (
    session_id      INT NOT NULL,
    class_group_id  INT NOT NULL,
    PRIMARY KEY (session_id, class_group_id),
    FOREIGN KEY (session_id) REFERENCES timetable_sessions(session_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (class_group_id) REFERENCES class_groups(class_group_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Records rejected/flagged conflicts for the admin Conflicts view & audit trail
CREATE TABLE conflicts_log (
    conflict_id     INT AUTO_INCREMENT PRIMARY KEY,
    session_id      INT NULL,
    conflict_type   ENUM('lecturer','class','classroom','break','other') NOT NULL,
    description     VARCHAR(255) NOT NULL,
    is_resolved     TINYINT(1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES timetable_sessions(session_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 5. NOTIFICATIONS / ANNOUNCEMENTS / ACTIVITY
-- ============================================================

CREATE TABLE announcements (
    announcement_id INT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(150) NOT NULL,
    body            TEXT NOT NULL,
    audience        ENUM('all','students','lecturers','class_group') NOT NULL DEFAULT 'all',
    class_group_id  INT NULL,                         -- used when audience = 'class_group'
    posted_by       INT NULL,                         -- admins.admin_id
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_group_id) REFERENCES class_groups(class_group_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (posted_by) REFERENCES admins(admin_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,
    message         VARCHAR(255) NOT NULL,
    is_read         TINYINT(1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Drives the admin "Recent Activities" feed
CREATE TABLE activity_log (
    activity_id     INT AUTO_INCREMENT PRIMARY KEY,
    admin_id        INT NULL,
    action          VARCHAR(255) NOT NULL,             -- e.g. 'Timetable generated successfully'
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(admin_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- Helpful indexes for conflict-checking queries
-- ============================================================

CREATE INDEX idx_sessions_lecturer_slot ON timetable_sessions (lecturer_id, time_slot_id);
CREATE INDEX idx_sessions_course        ON timetable_sessions (course_id);
CREATE INDEX idx_courses_lecturer       ON courses (lecturer_id);
CREATE INDEX idx_courses_class_group    ON courses (class_group_id);
