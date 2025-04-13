<?php
/**
 * Will create or update a message in a Discord forum channel via a webhook defined in webhook.php or webhook.local.php
 * Will return a 400 if it fails, with a clear text message, or a 200 with a JSON body if it succeeded.
 */

enum Channel: string {
    case Forum = 'forum';
    case Alert = 'alert';
}

include_once('utils.php');
setCorsHeadersAndHandleOptions();
$channel = $_GET['channel'] ?? 'forum';
$webhookUrls = loadFileOfFiles(['webhook.local.php', 'webhook.php']);
$webhookUrl = $webhookUrls[$channel] ?? null;
if(empty($webhookUrl)) {
    http_response_code(400);
    exit('No webhook URL found for channel: '.$channel);
}
$data = json_decode(file_get_contents('php://input'));
$id = $data->id ?? null;
$payload = $data->payload ?? null;
if(empty($payload)) {
    http_response_code(400);
    exit('Incoming value was empty');
}

$context = stream_context_create([
    'http' => [
        'method' => empty($id) ? 'POST' : 'PATCH',
        'header' => "Content-Type: application/json\r\n",
        'content' => json_encode($payload)
    ]
]);

error_reporting(0);
$response = false;
try {
    if(empty($id)) {
        $response = file_get_contents("$webhookUrl?wait=true", false, $context);
    } else {
        $url = "";
        if($channel === Channel::Forum->value) {
            $response = file_get_contents("$webhookUrl/messages/$id?thread_id=$id&wait=true", false, $context);
        } else {
            $response = file_get_contents("$webhookUrl/messages/$id?wait=true", false, $context);
        }
    }
} catch(Exception $e) {
    http_response_code(400);
    exit('Catastrophic failure: '.$e->getMessage());
}
if(empty($response)) {
    http_response_code(400);
    exit('Failed to get response.');
}

header('Content-type: application/json');
echo $response;