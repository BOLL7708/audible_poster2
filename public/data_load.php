<?php
include_once('utils.php');
setHeaders();
$data = loadDataFile('books.json');
if(empty($data)) {
    http_response_code(400);
    exit('Failed to load file.');
}
header('Content-Type: application/json');
echo json_encode($data);