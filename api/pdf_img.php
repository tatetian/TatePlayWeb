<?php
$doc_id     = _GET['doc_id'];
$page_num   = _GET['page_num'];
$doc_path   = '../uploads/' . $doc_id . '/page-' . $page_num . '.png'; 
$file = 'content/page-'.$_GET['page_num'].'.png';

header("Content-length:" . filesize($file));
header("Content-type:image/png");
readfile($file);
?>
