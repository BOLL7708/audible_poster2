<?php
include_once('utils.php');
include_once('db.php');
setCorsHeadersAndHandleOptions();
$data = json_decode(file_get_contents('php://input'));
if(empty($data)) {
    http_response_code(400);
    exit('Provided body was not JSON.');
}
$dataArr = (array) $data;
unset($dataArr['id']);

$keys = array_keys($dataArr);
$insertFields = implode(',', $keys);
$insertValues = implode(',', array_map(function($key){ return ":$key"; }, $keys));

$updateDataArr = array_filter($dataArr, function($value){ return is_bool($value) || !empty($value); });
$updateKeys = array_keys($updateDataArr);
$updateSets = implode(',', array_map(function($key){ return "$key=excluded.$key"; }, $updateKeys));

$query =
    "INSERT INTO books ($insertFields) 
    VALUES ($insertValues) 
    ON CONFLICT(bookId) DO UPDATE set $updateSets;";

$db = new DB_SQLite();
$result = $db->query($query, $dataArr);

if(!is_array($result)) {
    http_response_code(400);
    exit('Failed to write data to file.');
} else {
    exit();
}