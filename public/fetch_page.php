<?php
$url = urldecode($_GET["url"]);
setHeaders();
echo file_get_contents($url);

