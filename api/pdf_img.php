<?php
$file = 'content/page-'.$_GET['page_num'].'.png';
header("Content-length:" . filesize($file));
header("Content-type:image/png");
readfile($file);
?>
