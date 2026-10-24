<?php
/**
 * Maps a registration number's 2-digit year suffix (the "25" in
 * ND/CS/25/039) to the student's CURRENT level for a given program/
 * specialization, plus an optional reminder notice.
 *
 * Registration is NEVER blocked by this table — every valid registration
 * number format can register. This table only decides which level a
 * student lands in, and whether a reminder banner is shown.
 *
 * 'notice' values:
 *   null        - normal, no reminder shown
 *   'finished'  - this cohort has already finished this program; shown as
 *                 a friendly reminder they're expected to move on, but
 *                 they can still register with their final-level class group
 *
 * UPDATE AT THE START OF EVERY NEW ACADEMIC SESSION — add the new
 * freshers' year, promote last session's freshers to the final level,
 * and mark the year that just finished as 'finished' at the final level.
 *
 * Confirmed 2026-08-21/22:
 *   ND:  20/21/22 -> finished ND, still register (level 200 + reminder)
 *        23 -> level 200 (currently enrolled, no reminder)
 *        24/25 -> level 100 (school skipped a 24 intake and used 25
 *                 for that cohort, so both map to the same freshers' level)
 *   HND: pattern mirrored onto 300/400 per specialization (not yet
 *        explicitly reconfirmed for HND — same reasoning applied).
 *
 * DEFAULT_LEVEL below is used for any year not listed here at all, so
 * registration is never blocked even for years we haven't configured yet —
 * it just carries an 'unconfirmed' notice prompting a check with admin.
 */
return [
    'ND' => [
        'levels' => ['100', '200'],
        'default_level' => '100',
        'years' => [
            '20' => ['level' => '200', 'notice' => 'finished'],
            '21' => ['level' => '200', 'notice' => 'finished'],
            '22' => ['level' => '200', 'notice' => 'finished'],
            '23' => ['level' => '200', 'notice' => null],
            '24' => ['level' => '100', 'notice' => null],
            '25' => ['level' => '100', 'notice' => null],
        ],
    ],
    'HND' => [
        'levels' => ['300', '400'],
        'default_level' => '300',
        'SWD' => [
            '20' => ['level' => '400', 'notice' => 'finished'],
            '21' => ['level' => '400', 'notice' => 'finished'],
            '22' => ['level' => '400', 'notice' => 'finished'],
            '23' => ['level' => '400', 'notice' => null],
            '24' => ['level' => '300', 'notice' => null],
        ],
        'NCC' => [
            '20' => ['level' => '400', 'notice' => 'finished'],
            '21' => ['level' => '400', 'notice' => 'finished'],
            '22' => ['level' => '400', 'notice' => 'finished'],
            '23' => ['level' => '400', 'notice' => null],
            '24' => ['level' => '300', 'notice' => null],
        ],
    ],
];
