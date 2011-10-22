<?php
$folder = $_GET['folder'];
$tags = $_GET['tags'];
$searchkey = $_GET['searchkeys'];
$page= $_GET['page'];
header('Content-type: application/json');
$file = "content/paper_list_".$folder.".json";
readfile($file);
?>
