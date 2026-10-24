-- ============================================================
-- RESET — makes this file safely re-runnable. Clears all data this
-- seed touches before re-inserting, so running seed.sql again (after
-- a schema change, or just to get back to a known state) never hits
-- duplicate-key errors regardless of what's already in the tables.
-- Table structure itself is untouched — only data is cleared.
--
-- Uses DELETE FROM rather than TRUNCATE: TRUNCATE refuses to run on
-- any table that has a foreign key constraint pointing at it, even
-- once the referencing table is empty — it checks whether the
-- constraint EXISTS, not whether any row currently violates it. That
-- makes TRUNCATE impossible to order correctly here no matter what
-- sequence you delete in. DELETE FROM only cares about actual rows,
-- so deleting child rows before parent rows works regardless of how
-- these statements get executed (whole file at once, one at a time,
-- through phpMyAdmin, whatever) — no dependence on
-- FOREIGN_KEY_CHECKS surviving between statements at all.
-- ============================================================

DELETE FROM conflicts_log;
DELETE FROM session_class_groups;
DELETE FROM notifications;
DELETE FROM course_registrations;
DELETE FROM activity_log;
DELETE FROM announcements;
DELETE FROM timetable_sessions;
DELETE FROM students;
DELETE FROM courses;
DELETE FROM lecturers;
DELETE FROM rooms;
DELETE FROM time_slots;
DELETE FROM academic_calendar;
DELETE FROM class_groups;
DELETE FROM departments;
DELETE FROM admins;

-- Reset auto-increment counters so a fresh reseed always starts from
-- clean, predictable IDs (department 1, admin 1, etc.) instead of
-- continuing to climb every time this file is re-run.
ALTER TABLE conflicts_log AUTO_INCREMENT = 1;
ALTER TABLE session_class_groups AUTO_INCREMENT = 1;
ALTER TABLE notifications AUTO_INCREMENT = 1;
ALTER TABLE course_registrations AUTO_INCREMENT = 1;
ALTER TABLE activity_log AUTO_INCREMENT = 1;
ALTER TABLE announcements AUTO_INCREMENT = 1;
ALTER TABLE timetable_sessions AUTO_INCREMENT = 1;
ALTER TABLE students AUTO_INCREMENT = 1;
ALTER TABLE courses AUTO_INCREMENT = 1;
ALTER TABLE lecturers AUTO_INCREMENT = 1;
ALTER TABLE rooms AUTO_INCREMENT = 1;
ALTER TABLE time_slots AUTO_INCREMENT = 1;
ALTER TABLE academic_calendar AUTO_INCREMENT = 1;
ALTER TABLE class_groups AUTO_INCREMENT = 1;
ALTER TABLE departments AUTO_INCREMENT = 1;
ALTER TABLE admins AUTO_INCREMENT = 1;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Computer Science Department Timetable Generator
-- HAFED POLY, Kazaure — Seed Data
-- Source: real student registration slips (ND/CS/25/039,
--         HND/SWD/25/001, HND/NCC/25/001)
--
-- NOTES / ASSUMPTIONS (adjustable later via the admin UI):
--   - session_type defaults to 'lecture' for every course.
--     Seminars are marked 'tutorial' as a closer fit; reclassify
--     freely once real timetabling starts. SIWES and Project are
--     not timetabled and are not seeded.
--   - sessions_required is derived from credit_unit
--     (ceil(units / 2)) as a starting default, then adjusted at
--     the end. Change per-course as needed.
--   - Carry-over courses are seeded once, under the class_group
--     of the LEVEL they originally belong to (e.g. a 100-level
--     carry-over course belongs to ND 100, even if the student
--     is now in ND 200). A student's carry-over registration is
--     a course_registrations row, not a change to the course's
--     class_group.
-- ============================================================

USE cs_timetable;

-- ============================================================
-- 0. TIME SLOTS
--    Mon-Fri, 8:00am-4:00pm, 12:00-1:00pm not offered at all (no class,
--    no formal break), 1:00-2:00pm is the formal break — every weekday
--    otherwise fully used, none minimized.
-- ============================================================

INSERT INTO time_slots (day_of_week, start_time, end_time, is_break) VALUES
('Monday',    '08:00:00', '09:00:00', 0),
('Monday',    '09:00:00', '10:00:00', 0),
('Monday',    '10:00:00', '11:00:00', 0),
('Monday',    '11:00:00', '12:00:00', 0),
('Monday',    '13:00:00', '14:00:00', 1),
('Monday',    '14:00:00', '15:00:00', 0),
('Monday',    '15:00:00', '16:00:00', 0),

('Tuesday',   '08:00:00', '09:00:00', 0),
('Tuesday',   '09:00:00', '10:00:00', 0),
('Tuesday',   '10:00:00', '11:00:00', 0),
('Tuesday',   '11:00:00', '12:00:00', 0),
('Tuesday',   '13:00:00', '14:00:00', 1),
('Tuesday',   '14:00:00', '15:00:00', 0),
('Tuesday',   '15:00:00', '16:00:00', 0),

('Wednesday', '08:00:00', '09:00:00', 0),
('Wednesday', '09:00:00', '10:00:00', 0),
('Wednesday', '10:00:00', '11:00:00', 0),
('Wednesday', '11:00:00', '12:00:00', 0),
('Wednesday', '13:00:00', '14:00:00', 1),
('Wednesday', '14:00:00', '15:00:00', 0),
('Wednesday', '15:00:00', '16:00:00', 0),

('Thursday',  '08:00:00', '09:00:00', 0),
('Thursday',  '09:00:00', '10:00:00', 0),
('Thursday',  '10:00:00', '11:00:00', 0),
('Thursday',  '11:00:00', '12:00:00', 0),
('Thursday',  '13:00:00', '14:00:00', 1),
('Thursday',  '14:00:00', '15:00:00', 0),
('Thursday',  '15:00:00', '16:00:00', 0),

('Friday',    '08:00:00', '09:00:00', 0),
('Friday',    '09:00:00', '10:00:00', 0),
('Friday',    '10:00:00', '11:00:00', 0),
('Friday',    '11:00:00', '12:00:00', 0),
('Friday',    '13:00:00', '14:00:00', 1),
('Friday',    '14:00:00', '15:00:00', 0),
('Friday',    '15:00:00', '16:00:00', 0);

-- ============================================================
-- 0c. DEFAULT ADMIN ACCOUNT
--     Login: admin@hafedpoly.edu.ng / Admin@12345
--     CHANGE THIS PASSWORD after first login (Settings page).
-- ============================================================

INSERT INTO admins (full_name, email, password_hash, role) VALUES
('System Administrator', 'admin@hafedpoly.edu.ng',
 '$2b$10$nSGfGHLbfXrvBXYP4yEOXejDwUgC2w6PdyD2letkajVjCuj0ozjF2', 'super_admin');

-- ============================================================
-- 0d. DEPARTMENTS
--     Each department gets its own separate timetable. Add more
--     departments via the admin Departments page as the school
--     grows beyond Computer Science.
-- ============================================================

INSERT INTO departments (name, short_code) VALUES
('Computer Science', 'CS');

SET @csDept = (SELECT department_id FROM departments WHERE short_code = 'CS');

-- ============================================================
-- 1. CLASS GROUPS  (6 total, all under Computer Science)
-- ============================================================

INSERT INTO class_groups (department_id, name, program, level, specialization) VALUES
(@csDept, 'ND 100',        'ND',  '100', NULL),
(@csDept, 'ND 200',        'ND',  '200', NULL),
(@csDept, 'HND 300 - SWD', 'HND', '300', 'SWD'),
(@csDept, 'HND 400 - SWD', 'HND', '400', 'SWD'),
(@csDept, 'HND 300 - NCC', 'HND', '300', 'NCC'),
(@csDept, 'HND 400 - NCC', 'HND', '400', 'NCC');

-- ============================================================
-- 1b. CLASSROOMS  (one dedicated classroom per class group)
--     There are no labs. Each class group has its own room and
--     every course for that group is always scheduled in it:
--       ND 1 / ND 2, HND 1 SWD / HND 1 NCC, HND 2 SWD / HND 2 NCC
--     Rename rooms or adjust capacity on the admin Classrooms page.
-- ============================================================

INSERT INTO rooms (name, room_type, capacity, class_group_id)
SELECT r.room_name, 'classroom', 60, cg.class_group_id
FROM (
    SELECT 'ND 1 Classroom'      AS room_name, 'ND 100'        AS group_name UNION ALL
    SELECT 'ND 2 Classroom',                   'ND 200'                      UNION ALL
    SELECT 'HND 1 SWD Classroom',              'HND 300 - SWD'               UNION ALL
    SELECT 'HND 2 SWD Classroom',              'HND 400 - SWD'               UNION ALL
    SELECT 'HND 1 NCC Classroom',              'HND 300 - NCC'               UNION ALL
    SELECT 'HND 2 NCC Classroom',              'HND 400 - NCC'
) r
JOIN class_groups cg ON cg.name = r.group_name;

-- ============================================================
-- 2. COURSES
-- ============================================================

SET @ND100 = (SELECT class_group_id FROM class_groups WHERE name = 'ND 100');
SET @ND200 = (SELECT class_group_id FROM class_groups WHERE name = 'ND 200');
SET @HND300SWD = (SELECT class_group_id FROM class_groups WHERE name = 'HND 300 - SWD');
SET @HND400SWD = (SELECT class_group_id FROM class_groups WHERE name = 'HND 400 - SWD');
SET @HND300NCC = (SELECT class_group_id FROM class_groups WHERE name = 'HND 300 - NCC');
SET @HND400NCC = (SELECT class_group_id FROM class_groups WHERE name = 'HND 400 - NCC');

-- ---------- ND 100 : First Semester ----------
INSERT INTO courses (course_code, course_title, class_group_id, semester, credit_unit) VALUES
('GNS 101', 'Use of English I',                    @ND100, 'first', 2),
('GNS 102', 'Citizenship Education I',              @ND100, 'first', 4),
('GNS 103', 'Moral Education',                      @ND100, 'first', 2),
('COM 111', 'Introduction to Computing',            @ND100, 'first', 3),
('COM 112', 'Introduction To Digital Electronics',  @ND100, 'first', 3),
('COM 113', 'Introduction To Programming',          @ND100, 'first', 4),
('COM 114', 'Statistics for Computing I',           @ND100, 'first', 2),
('COM 115', 'Computer Application Packages I',      @ND100, 'first', 3),
('MTH 111', 'Logic and Linear Algebra',             @ND100, 'first', 2);

-- ---------- ND 100 : Second Semester (carry-over source) ----------
INSERT INTO courses (course_code, course_title, class_group_id, semester, credit_unit) VALUES
('GNS 102', 'Communication in English',             @ND100, 'second', 2),
('GNS 104', 'National Education',                   @ND100, 'second', 2),
('GNS 121', 'Citizenship Education II',              @ND100, 'second', 2),
('GNS 228', 'Research Methods',                     @ND100, 'second', 2),
('EED 126', 'Practice of Entrepreneurship',         @ND100, 'second', 2),
('COM 121', 'Programming using C Language',         @ND100, 'second', 3),
('COM 122', 'Introduction to Internet',             @ND100, 'second', 3),
('COM 123', 'Programming Language using Java I',    @ND100, 'second', 3),
('COM 124', 'Data Structure and Algorithms',        @ND100, 'second', 3),
('COM 125', 'Introduction to Systems Analysis and Design', @ND100, 'second', 3),
('COM 126', 'PC Upgrade & Maintenance',             @ND100, 'second', 3);

-- ---------- ND 200 : First Semester ----------
INSERT INTO courses (course_code, course_title, class_group_id, semester, credit_unit) VALUES
('GNS 201', 'Use of English II',                    @ND200, 'first', 2),
('EED 216', 'Practice of Entrepreneurship',         @ND200, 'first', 2),
('COM 211', 'Programming Language using Java II',   @ND200, 'first', 4),
('COM 212', 'Introduction to Systems Programming',  @ND200, 'first', 2),
('COM 213', 'Unified Modelling Language (UML)',     @ND200, 'first', 3),
('COM 214', 'Computer Systems Troubleshooting',     @ND200, 'first', 3),
('COM 215', 'Computer Application Packages II',     @ND200, 'first', 3),
('COM 216', 'Statistics for Computing II',          @ND200, 'first', 2);

-- ---------- ND 200 : Second Semester (carry-over source) ----------
INSERT INTO courses (course_code, course_title, class_group_id, semester, credit_unit) VALUES
('GNS 204', 'Communication in English II',          @ND200, 'second', 2),
('GNS 228', 'Research Methods',                     @ND200, 'second', 2),
('COM 221', 'Basic Computer Networking',            @ND200, 'second', 3),
('COM 222', 'Seminar on Computer and Society',      @ND200, 'second', 2),
('COM 223', 'Basic Hardware Maintenance',           @ND200, 'second', 2),
('COM 224', 'Management Information System',        @ND200, 'second', 2),
('COM 225', 'Web Technology',                       @ND200, 'second', 3),
('COM 226', 'File Organisation and Management',     @ND200, 'second', 2);

-- ---------- HND 300 SWD : First Semester ----------
INSERT INTO courses (course_code, course_title, class_group_id, semester, credit_unit) VALUES
('GNS 301', 'Use of English III',                   @HND300SWD, 'first', 2),
('AIT 311', 'Computer Architecture',                @HND300SWD, 'first', 3),
('AIT 313', 'Artificial Intelligence',              @HND300SWD, 'first', 3),
('SWD 311', 'Operating System',                     @HND300SWD, 'first', 3),
('SWD 312', 'Database Design I',                    @HND300SWD, 'first', 3),
('SWD 313', 'C++ Programming',                      @HND300SWD, 'first', 3),
('SWD 314', 'Operations Research',                  @HND300SWD, 'first', 2),
('SWD 315', 'Data Communication and Networks',      @HND300SWD, 'first', 3),
('SWD 316', 'Introduction to Software Engineering', @HND300SWD, 'first', 3);

-- ---------- HND 300 SWD : Second Semester (carry-over source) ----------
INSERT INTO courses (course_code, course_title, class_group_id, semester, credit_unit) VALUES
('GNS 302', 'Communication in English',             @HND300SWD, 'second', 2),
('ENT 326', 'Practice of Entrepreneurship I',       @HND300SWD, 'second', 2),
('SWD 321', 'Python Programming',                   @HND300SWD, 'second', 3),
('SWD 322', 'Database Design II',                   @HND300SWD, 'second', 3),
('SWD 323', 'Front End Development I',              @HND300SWD, 'second', 3),
('SWD 324', 'Back End Development I',               @HND300SWD, 'second', 3),
('SWD 325', 'Advance Statistics for Computing',     @HND300SWD, 'second', 2),
('SWD 326', 'Research Methods in SWD',              @HND300SWD, 'second', 3),
('SWD 327', 'Mandatory Skills Qualification I',     @HND300SWD, 'second', 4);

-- ---------- HND 400 SWD : First Semester ----------
INSERT INTO courses (course_code, course_title, class_group_id, semester, credit_unit) VALUES
('ENT 416', 'Entrepreneurship Development',         @HND400SWD, 'first', 4),
('COM 411', 'Web Development (PHP)',                @HND400SWD, 'first', 4),
('SWD 411', 'Project Management in SWD',            @HND400SWD, 'first', 2),
('SWD 412', 'Embedded System Development',          @HND400SWD, 'first', 3),
('SWD 413', 'Front End Development II',             @HND400SWD, 'first', 3),
('SWD 414', 'Back End Development II',              @HND400SWD, 'first', 3),
('SWD 415', 'Software Design and Architecture',     @HND400SWD, 'first', 3),
('SWD 416', 'Advanced Data Structures and Algorithms', @HND400SWD, 'first', 3),
('SWD 417', 'Mandatory Skills Qualifications II',   @HND400SWD, 'first', 4);

-- ---------- HND 400 SWD : Second Semester (carry-over source) ----------
INSERT INTO courses (course_code, course_title, class_group_id, semester, credit_unit) VALUES
('SWD 421', 'Human Computer Interface (HCI)',       @HND400SWD, 'second', 2),
('SWD 422', 'Ethical and Professional Practice in SWD', @HND400SWD, 'second', 2),
('SWD 423', 'Software Testing and Quality Assurance', @HND400SWD, 'second', 3),
('SWD 424', 'Seminar in SWD',                       @HND400SWD, 'second', 1),
('SWD 425', 'Security in SWD',                      @HND400SWD, 'second', 3);

-- ---------- HND 300 NCC : First Semester ----------
INSERT INTO courses (course_code, course_title, class_group_id, semester, credit_unit) VALUES
('GNS 301', 'Use of English III',                   @HND300NCC, 'first', 2),
('NCC 311', 'Networking Essentials',                @HND300NCC, 'first', 3),
('NCC 312', 'Virtualization and Cloud Migration',   @HND300NCC, 'first', 3),
('NCC 313', 'Operating System for Network Environment', @HND300NCC, 'first', 3),
('NCC 314', 'Wireless Communication Systems',       @HND300NCC, 'first', 3),
('NCC 315', 'Computer Architecture',                @HND300NCC, 'first', 3),
('NCC 316', 'Python Programming Basics',            @HND300NCC, 'first', 2);

-- ---------- HND 300 NCC : Second Semester (carry-over source) ----------
INSERT INTO courses (course_code, course_title, class_group_id, semester, credit_unit) VALUES
('GNS 302', 'Communication in English III',         @HND300NCC, 'second', 2),
('ENT 326', 'Practice of Entrepreneurship',         @HND300NCC, 'second', 2),
('AIT 313', 'Artificial Intelligence',              @HND300NCC, 'second', 3),
('CYS 322', 'Mobile and Wireless Security',         @HND300NCC, 'second', 4),
('NCC 321', 'Routing and Switching I',              @HND300NCC, 'second', 4),
('NCC 322', 'Cloud Computing I',                    @HND300NCC, 'second', 3),
('NCC 323', 'Advance Statistics for Computing',     @HND300NCC, 'second', 3),
('NCC 324', 'Mandatory Skill Qualification I',      @HND300NCC, 'second', 4),
('NCC 325', 'Advanced Wireless Networks',           @HND300NCC, 'second', 3);

-- ---------- HND 400 NCC : First Semester ----------
INSERT INTO courses (course_code, course_title, class_group_id, semester, credit_unit) VALUES
('GNS 401', 'Communication in English IV',          @HND400NCC, 'first', 2),
('ENT 416', 'Practice of Entrepreneurship II',      @HND400NCC, 'first', 4),
('AIT 321', 'Machine Learning',                     @HND400NCC, 'first', 3),
('CYS 412', 'Data Protection and Privacy',          @HND400NCC, 'first', 3),
('NCC 411', 'Research Methodology',                 @HND400NCC, 'first', 2),
('NCC 412', 'Project Management in Networking & Cloud Computing', @HND400NCC, 'first', 2),
('NCC 413', 'Routing and Switching II',             @HND400NCC, 'first', 4),
('NCC 414', 'Networking Troubleshooting & Monitoring', @HND400NCC, 'first', 3),
('NCC 415', 'Mandatory Skills Qualifications II',   @HND400NCC, 'first', 4);

-- ---------- HND 400 NCC : Second Semester (carry-over source) ----------
INSERT INTO courses (course_code, course_title, class_group_id, semester, credit_unit) VALUES
('NCC 421', 'Cloud Computing II',                   @HND400NCC, 'second', 3),
('NCC 422', 'Enterprise Networking, Security & Automation', @HND400NCC, 'second', 4),
('NCC 423', 'Ethical & Professional Practice in Networking and Cloud Computing', @HND400NCC, 'second', 2),
('NCC 424', 'Internet of Things',                   @HND400NCC, 'second', 3),
('NCC 425', 'Seminar',                              @HND400NCC, 'second', 2);

-- ============================================================
-- 2B. HND NCC LECTURERS (from the supplied HND I timetable)
-- Assign these lecturers to the corresponding HND 300 NCC courses.
-- This is idempotent by lecturer name so re-running the seed section
-- will not create duplicate lecturer records.
-- ============================================================
INSERT INTO lecturers (full_name)
SELECT names.full_name FROM (
    SELECT 'Mal. Ibrahim Hassan' AS full_name UNION ALL
    SELECT 'Mal. Kabiru Abdullahi Jahun' UNION ALL
    SELECT 'Dr. I. S. Majajama' UNION ALL
    SELECT 'Entrepreneurship Unit' UNION ALL
    SELECT 'Dr. Muktar Hussaini' UNION ALL
    SELECT 'GNS Department' UNION ALL
    SELECT 'Mr. Amaonwu Onyebuchi' UNION ALL
    SELECT 'Mal. Aminu Abbas'
) AS names
WHERE NOT EXISTS (
    SELECT 1 FROM lecturers existing WHERE existing.full_name = names.full_name
);

UPDATE courses c
JOIN class_groups cg ON cg.class_group_id = c.class_group_id
JOIN lecturers l ON l.full_name = CASE c.course_code
    WHEN 'NCC 321' THEN 'Mal. Ibrahim Hassan'
    WHEN 'NCC 322' THEN 'Mal. Kabiru Abdullahi Jahun'
    WHEN 'NCC 323' THEN 'Dr. I. S. Majajama'
    WHEN 'NCC 324' THEN 'Entrepreneurship Unit'
    WHEN 'NCC 325' THEN 'Dr. Muktar Hussaini'
    WHEN 'GNS 302' THEN 'GNS Department'
    WHEN 'ENT 326' THEN 'Entrepreneurship Unit'
    WHEN 'AIT 313' THEN 'Mr. Amaonwu Onyebuchi'
    WHEN 'CYS 322' THEN 'Mal. Aminu Abbas'
END
SET c.lecturer_id = l.lecturer_id
WHERE cg.program = 'HND' AND cg.specialization = 'NCC'
  AND cg.level = '300'
  AND c.semester = 'second'
  AND c.course_code IN ('NCC 321','NCC 322','NCC 323','NCC 324','NCC 325','GNS 302','ENT 326','AIT 313','CYS 322');

-- ============================================================
-- 3. DERIVE sessions_required AND session_type FROM UNITS
--    (starting defaults — adjust per-course in the admin UI)
-- ============================================================

UPDATE courses SET sessions_required = CEIL(credit_unit / 2);

UPDATE courses SET session_type = 'tutorial'
WHERE course_title IN ('Seminar', 'Seminar in SWD',
                        'Seminar on Computer and Society');

-- ============================================================
-- 4. SAMPLE STUDENTS (one per class group, matching real reg-no
--    formats seen: ND/CS/25/xxx, HND/SWD/25/xxx, HND/NCC/25/xxx)
--    password_hash values are placeholders — replace via the
--    admin/auth flow, never store real passwords here.
-- ============================================================

-- Login for all three: registration number + password "Student@123"
-- CHANGE THESE PASSWORDS after first login (Profile page).
INSERT INTO students (reg_no, full_name, email, password_hash, class_group_id) VALUES
('ND/CS/25/039',   'Sample ND200 Student',  'ndcs25039@hafedpoly.edu.ng',   '$2b$10$KxUerQjeq/xyntW7Jgw.Z.xATd1aSU/xgNVfFt4yxDCz0sPoqA9PO', @ND200),
('HND/SWD/25/001', 'Sample SWD200 Student', 'hndswd25001@hafedpoly.edu.ng', '$2b$10$KxUerQjeq/xyntW7Jgw.Z.xATd1aSU/xgNVfFt4yxDCz0sPoqA9PO', @HND300SWD),
('HND/NCC/25/001', 'Sample NCC200 Student', 'hndncc25001@hafedpoly.edu.ng', '$2b$10$KxUerQjeq/xyntW7Jgw.Z.xATd1aSU/xgNVfFt4yxDCz0sPoqA9PO', @HND300NCC);
