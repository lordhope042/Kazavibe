<?php
$_SERVER['REQUEST_METHOD'] = 'CLI';
require_once __DIR__ . '/../includes/functions/timetable_functions.php';
function check($condition, $message) { if (!$condition) { fwrite(STDERR, "FAIL: {$message}\n"); exit(1); } echo "PASS: {$message}\n"; }
$existing = [['lecturer_id'=>'7','room_id'=>'2','time_slot_id'=>'4','class_group_ids'=>['9']]];
check(hasConflict($existing, 7, 3, 4, [8], false) === 'lecturer', 'string/integer lecturer IDs detect conflict');
check(hasConflict($existing, 8, 2, 4, [8], false) === 'classroom', 'room collision detected');
check(hasConflict($existing, 8, 3, 4, [9], false) === 'class', 'class-group collision detected');
check(hasConflict($existing, 8, 3, 5, [8], false) === null, 'available slot accepted');
check(hasConflict([], null, 3, 5, [], true) === 'break', 'break slot rejected');
$rooms = [
    ['room_id'=>1,'class_group_id'=>10], ['room_id'=>2,'class_group_id'=>11], ['room_id'=>3,'class_group_id'=>null],
];
check(array_column(roomsForClassGroup($rooms, 10), 'room_id') === [1], 'class group uses only its dedicated room');
check(array_column(roomsForClassGroup($rooms, 99), 'room_id') === [3], 'group without a room falls back to shared rooms');
