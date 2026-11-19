<?php
declare(strict_types=1);

function database_connection(): mysqli
{
    static $connection = null;
    if ($connection instanceof mysqli) {
        return $connection;
    }

    $host = getenv('DB_HOST') ?: 'sql200.infinityfree.com';
    $database = getenv('DB_NAME') ?: 'if0_43376652_wafaa_db';
    $username = getenv('DB_USER') ?: 'if0_43376652';
    $password = getenv('DB_PASSWORD') ?: 'jO8Tmd5T8K';
    $port = (int) (getenv('DB_PORT') ?: '3306');

    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $connection = new mysqli($host, $username, $password, $database, $port);
    $connection->set_charset('utf8mb4');
    return $connection;
}
