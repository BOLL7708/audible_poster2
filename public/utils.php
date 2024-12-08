<?php

function setCorsHeadersAndHandleOptions(): void {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 3600");
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(); // End script execution for OPTIONS requests
    }
}

/**
 * Loads a file from disk, returns null if it does not exist.
 * @param string $filename
 * @return string|null
 */
function loadFile(string $filename): string|null {
    $data = null;
    try {
        $data = include($filename);
    } catch(Exception $e) {
        error_log($e->getMessage());
    }
    return $data;
}

/**
 * Will return the result of the first file that exists and has content.
 * @param array $filenames
 * @return string|null
 */
function loadFileOfFiles(array $filenames): string|null {
    foreach($filenames as $filename) {
        $data = loadFile($filename);
        if(!empty($data)) return $data;
    }
    return null;
}

function getDataDir(): string {
    $dataDir = '../_data';
    if(!file_exists($dataDir)) mkdir($dataDir);
    return $dataDir;
}

/**
 * Will automatically JSON-encode if the content is not a string.
 * @param string $filename
 * @param string|array|stdClass $content
 * @return false|int
 */
function writeDataFile(string $filename, string|array|stdClass $content): false|int {
    $dataDir = getDataDir();
    $filepath = "$dataDir/$filename";
    if(is_array($content) || is_object($content)) $content = json_encode($content);
    return file_put_contents($filepath, $content);
}
function loadDataFile(string $filename): false|string|array|stdClass {
    $dataDir = getDataDir();
    $filepath = "$dataDir/$filename";
    try {
        $data = file_get_contents($filepath);
        $data = json_decode($data);
    } catch(Exception $e) {
        // Do nothing
    }
    if(empty($data)) return false;
    return $data;
}