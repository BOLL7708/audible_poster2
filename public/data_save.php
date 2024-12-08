<?php
include_once('utils.php');
setHeaders();
$data = json_decode(file_get_contents('php://input'));
if(empty($data)) {
    http_response_code(400);
    exit('Provided body was not JSON.');
}
$result = writeDataFile('books.json', $data);
if(empty($result)) {
    http_response_code(400);
    exit('Failed to write data to file.');
}