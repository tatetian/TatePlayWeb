<?php
# Helper functions that are common to all API modules

function fm_succeed($result) {
    // TO-DO: '' [] {}
    $l = strlen($result);
    if ( $l > 1 && 
        ( ($result[0] == '[' && $result[$l-1] == ']') ||
          ($result[0] == '{' && $result[$l-1] == '}') ) )
        exit(sprintf('{"result":%s}', $result));
    else
        exit(sprintf('{"result":"%s"}', $result));
}

function fm_fail($error_code, $error_msg) {
    exit(sprintf('{"error": {"code": "%s", "msg": "%s"}}', 
                 $error_code, $error_msg));
}
?>
