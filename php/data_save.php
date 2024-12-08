<?php
include_once('utils.php');
$data = json_decode(file_get_contents('php://input'));
if(empty($data)) {
    http_response_code(400);
    echo 'Provided body was not JSON.';
}
writeDataFile('books.json', $data);