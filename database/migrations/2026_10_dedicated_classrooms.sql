-- Dedicated classrooms, no labs, no SIWES / Project timetabling.
-- BACK UP THE DATABASE FIRST, then import in phpMyAdmin (database: cs_timetable).

USE cs_timetable;

-- 1. Remove SIWES and Project courses (and their scheduled sessions)
DELETE ts FROM timetable_sessions ts
JOIN courses c ON c.course_id = ts.course_id
WHERE c.course_title IN ('SIWES', 'Project');

DELETE FROM courses WHERE course_title IN ('SIWES', 'Project');

-- 2. Labs no longer exist
UPDATE courses SET session_type = 'practical' WHERE session_type = 'lab';

DELETE ts FROM timetable_sessions ts
JOIN rooms r ON r.room_id = ts.room_id
WHERE r.room_type = 'lab';
DELETE FROM rooms WHERE room_type = 'lab';

ALTER TABLE courses
    MODIFY session_type ENUM('lecture','practical','tutorial','elective') NOT NULL DEFAULT 'lecture',
    DROP COLUMN requires_lab;

ALTER TABLE rooms
    MODIFY room_type ENUM('classroom') NOT NULL DEFAULT 'classroom',
    ADD COLUMN class_group_id INT NULL UNIQUE AFTER capacity,
    ADD CONSTRAINT fk_rooms_class_group FOREIGN KEY (class_group_id)
        REFERENCES class_groups(class_group_id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 3. One dedicated classroom per class group.
--    Existing generic rooms are removed; draft sessions are cleared so the
--    timetable is regenerated into the new rooms (published ones too, since
--    they referenced the old shared rooms).
DELETE FROM timetable_sessions;
DELETE FROM rooms;

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
