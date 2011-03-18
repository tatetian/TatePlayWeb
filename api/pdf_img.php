<?php
$file = 'content/page-0'.$_GET['page_num'].'.png';
header("Content-length:" . filesize($file));
header("Content-type:image/png");
readfile($file);
?>
