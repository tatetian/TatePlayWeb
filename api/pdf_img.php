<?php
$file = 'content/1.png';
header("Content-length:" . filesize($file));
header("Content-type:image/png");
readfile($file);
?>
