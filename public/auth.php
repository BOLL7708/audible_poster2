<?php
include_once('utils.inc.php');
setCorsHeadersAndHandleOptions();

$account = loadFirstExistingFile(['_account.local.php', '_account.php']);
if (!is_array($account)) {
    http_response_code(400);
    exit('No account found.');
}

$storedPassword = $account['password'] ?? null;
if(empty($storedPassword)) {
    http_response_code(401);
    exit('Stored password was empty.');
}

$headers = getallheaders();
$authHeader = $headers ? array_change_key_case($headers, CASE_LOWER)['authorization'] ?? null : null;
if(empty($authHeader)) {
    http_response_code(401);
    exit('Authorization header not set.');
}
$passwordHashMatch = [];
preg_match('/^Bearer (.*)$/', $authHeader, $passwordHashMatch);
$passwordHash = array_pop($passwordHashMatch);
if(empty($passwordHash)) {
    http_response_code(401);
    exit('Provided password was empty.');
}

$storedPasswordHash = hash('sha256', $storedPassword);
if($storedPasswordHash !== $passwordHash) {
    error_log("$storedPasswordHash !== $passwordHash");
    http_response_code(401);
    exit('Provided password did not match stored password.');
}