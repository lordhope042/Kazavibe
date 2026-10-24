# Timetable Generator tests

Run from the project root with PHP installed:

```sh
php tests/timetable_conflicts_test.php
find . -name '*.php' -print0 | xargs -0 -n1 php -l
```

The conflict test covers ID type normalization and room, lecturer, class-group and break-slot rules. Database integration tests should be run against a disposable MySQL database before deployment.
