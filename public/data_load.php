<?php
include_once('auth.php');
include_once('db.inc.php');
$bookId = $_GET['bookId'] ?? '';
$seriesId = $_GET['seriesId'] ?? '';
$postId = $_GET['postId'] ?? '';

$db = new DB_SQLite();
if(!empty($bookId)) {
    $data = $db->query('SELECT * FROM books WHERE bookId=:id;', ['id'=>$bookId]);
} elseif(!empty($seriesId)) {
    $data = $db->query('SELECT * FROM books WHERE seriesId=:id;', ['id'=>$seriesId]);
} elseif(!empty($postId)) {
    $data = $db->query('SELECT * FROM books WHERE postId=:id;', ['id'=>$postId]);
} else {
    $data = $db->query('SELECT * FROM books;', []);
}
if($data === false) {
    http_response_code(400);
    exit('Failed to open database.');
}
header('Content-Type: application/json');
echo json_encode($data);