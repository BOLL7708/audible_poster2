<?php
include_once('utils.php');
include_once('db.php');
setCorsHeadersAndHandleOptions();
$bookId = $_GET['bookId'] ?? '';
$postId = $_GET['postId'] ?? '';

$db = new DB_SQLite();
if(!empty($bookId)) {
    $data = $db->query('SELECT * FROM books WHERE bookId=?;', [$bookId]);
} elseif(!empty($postId)) {
    $data = $db->query('SELECT * FROM books WHERE postId=?;', [$postId]);
} else {
    $data = $db->query('SELECT * FROM books;', []);
}
if($data === false) {
    http_response_code(400);
    exit('Failed to open database.');
}
header('Content-Type: application/json');
echo json_encode($data);