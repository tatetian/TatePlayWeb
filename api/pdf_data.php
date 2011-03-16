<?php
/**
 * Output data in JSON format
 * */
$file="content/data.json";
header('Content-type: application/json');
readfile($file);
?>
