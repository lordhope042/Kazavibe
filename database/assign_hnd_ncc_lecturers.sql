-- Apply this script to an EXISTING timetable-generator database.
-- It adds the lecturer names shown on the supplied HND I timetable
-- and assigns them to the matching HND 300 NCC second-semester courses.
-- Safe to run more than once; existing course and student records are preserved.

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
  AND cg.level = '300' AND c.semester = 'second'
  AND c.course_code IN ('NCC 321','NCC 322','NCC 323','NCC 324','NCC 325','GNS 302','ENT 326','AIT 313','CYS 322');

-- Verify the resulting assignments:
SELECT cg.name AS class_group, c.semester, c.course_code, c.course_title, l.full_name AS lecturer
FROM courses c
JOIN class_groups cg ON cg.class_group_id = c.class_group_id
LEFT JOIN lecturers l ON l.lecturer_id = c.lecturer_id
WHERE cg.program = 'HND' AND cg.specialization = 'NCC' AND cg.level = '300'
  AND c.semester = 'second'
  AND c.course_code IN ('NCC 321','NCC 322','NCC 323','NCC 324','NCC 325','GNS 302','ENT 326','AIT 313','CYS 322')
ORDER BY c.course_code;
