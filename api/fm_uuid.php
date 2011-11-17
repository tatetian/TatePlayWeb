<?php

define('FM_UUID_NAMESPACE', '{00000000-0000-0000-0000-000000000000}');

function cal_fm_uuid($namespace, $name) {
    if(!_uuid_is_valid($namespace)) return false;

    // Get hexadecimal components of namespace
    $nhex = str_replace(array('-','{','}'), '', $namespace);

    // Binary Value
    $nstr = '';

    // Convert Namespace UUID to bits
    for($i = 0; $i < strlen($nhex); $i+=2) {
      $nstr .= chr(hexdec($nhex[$i].$nhex[$i+1]));
    }

    // Calculate hash value
    $hash = sha1($nstr . $name);

    $hash = sprintf('%08s%04s%04x%04x%12s',
        // 32 bits for "time_low"
        substr($hash, 0, 8),

        // 16 bits for "time_mid"
        substr($hash, 8, 4),

        // 16 bits for "time_hi_and_version",
        // four most significant bits holds version number 5
        (hexdec(substr($hash, 12, 4)) & 0x0fff) | 0x5000,

        // 16 bits, 8 bits for "clk_seq_hi_res",
        // 8 bits for "clk_seq_low",
        // two most significant bits holds zero and one for variant DCE1.1
        (hexdec(substr($hash, 16, 4)) & 0x3fff) | 0x8000,

        // 48 bits for "node"
        substr($hash, 20, 12)
    );

    // Convert the string to its binary format
    $hash_bin =  pack("H*", $hash);
    // Convert the binary string to base64 encoding string
    $hash_64 = base64_encode($hash_bin);
    // Replace '+' and '/'; remove '='
    $hash = str_replace(array('+', '/', '='), 
                        array('-', '_'), 
                        $hash_64); 
    //  assert("strlen($hash)==22");
    return $hash;
}

function _uuid_is_valid($uuid) {
    return preg_match('/^\{?[0-9a-f]{8}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?'.
                  '[0-9a-f]{4}\-?[0-9a-f]{12}\}?$/i', $uuid) === 1;
}

function _fm_uuid_test() {
    $in = fopen("tools/a.pdf", "r");
    $content = '';
    while($buff = fread($in, 4096)) {
        $content .= $buff;
    }
    print cal_fm_uuid(FM_UUID_NAMESPACE, $content) . "\n";
    fclose($in);
}

//_fm_uuid_test() ;
?>
