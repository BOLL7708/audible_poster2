<?php
include_once('utils.php');
setCorsHeadersAndHandleOptions();
$url = urldecode($_GET["url"]);
if(!filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    exit('Supplied value was not a valid URL.');
}
$file = file_get_contents($url);
if($file === false) {
    http_response_code(400);
    exit('Unable to load URL.');
}
echo $file;