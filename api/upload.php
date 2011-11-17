<?php
/**
 * upload.php
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */
include_once('fm_common.php');
include_once('fm_doc.php');

// HTTP headers for no cache etc
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");
header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
header("Cache-Control: no-store, no-cache, must-revalidate");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Settings
//$targetDir = ini_get("upload_tmp_dir") . DIRECTORY_SEPARATOR . "plupload";
$uploadDir = '../uploads';

//$cleanupTargetDir = false; // Remove old files
//$maxFileAge = 60 * 60; // Temp file age in seconds

// 5 minutes execution time
@set_time_limit(5 * 60);

// Uncomment this one to fake upload time
// usleep(5000);

// Get parameters
//$chunk = isset($_REQUEST["chunk"]) ? $_REQUEST["chunk"] : 0;
//$chunks = isset($_REQUEST["chunks"]) ? $_REQUEST["chunks"] : 0;
//$fileName = isset($_REQUEST["name"]) ? $_REQUEST["name"] : '';
/*
// Clean the fileName for security reasons
$fileName = preg_replace('/[^\w\._]+/', '', $fileName);

// Make sure the fileName is unique but only if chunking is disabled
if ($chunks < 2 && file_exists($targetDir . DIRECTORY_SEPARATOR . $fileName)) {
	$ext = strrpos($fileName, '.');
	$fileName_a = substr($fileName, 0, $ext);
	$fileName_b = substr($fileName, $ext);

	$count = 1;
	while (file_exists($targetDir . DIRECTORY_SEPARATOR . $fileName_a . '_' . $count . $fileName_b))
		$count++;

	$fileName = $fileName_a . '_' . $count . $fileName_b;
}
 */
// Create target dir
//if (!file_exists($targetDir))
//	@mkdir($targetDir);

// Remove old temp files
/* this doesn't really work by now
	
if (is_dir($targetDir) && ($dir = opendir($targetDir))) {
	while (($file = readdir($dir)) !== false) {
		$filePath = $targetDir . DIRECTORY_SEPARATOR . $file;

		// Remove temp files if they are older than the max age
		if (preg_match('/\\.tmp$/', $file) && (filemtime($filePath) < time() - $maxFileAge))
			@unlink($filePath);
	}

	closedir($dir);
} else
	die('{"jsonrpc" : "2.0", "error" : {"code": 100, "message": "Failed to open temp directory."}, "id" : "id"}');
*/

// Look for the content type header
if (isset($_SERVER["HTTP_CONTENT_TYPE"]))
	$contentType = $_SERVER["HTTP_CONTENT_TYPE"];
if (isset($_SERVER["CONTENT_TYPE"]))
	$contentType = $_SERVER["CONTENT_TYPE"];

// Handle non multipart uploads older WebKit versions didn't support multipart in HTML5
if (strpos($contentType, "multipart") !== false) {
    $tempFilePath = $_FILES['file']['tmp_name'];
    if (isset($tempFilePath) && is_uploaded_file($tempFilePath)) {
        // Get the content of the file
        $content = '';
        $in = fopen($tempFilePath, "rb");
        if ($in) {
            while ($buff = fread($in, 4096))
                $content .= $buff;
        }
        fclose($in);
        // Cal the uuid
        $uuid = fm_doc_uuid(FM_UUID_NAMESPACE, $content);
        // Set the file path
        $targetDir = $uploadDir .DIRECTORY_SEPARATOR . $uuid ;
        $pdfFilePath = $targetDir . DIRECTORY_SEPARATOR . $uuid . ".pdf";
        if (file_exists($targetDir))
            fm_succeed("The uploaded file exists on server");
        @mkdir($targetDir);
        // Move it to the new place
        if (move_uploaded_file($tempFilePath, $pdfFilePath) && chmod($pdfFilePath, 0777)) {
            if (fm_doc2png($pdfFilePath, $targetDir)) {
                fm_succeed("Uploading is done");
            }
            else
                fm_fail("104", "Unable to generate images");
        }
        fm_fail("101", "Unable to move the uploaded file");
    }
    else
        fm_fail("102", "No uploaded file");
}
else
    fm_fail("103", "Form/multipart expected");
?>
