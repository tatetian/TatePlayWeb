<?php
$file = 'content/1.svg';

header("Content-type:image/svg+xml");
readfile($file);
?>
