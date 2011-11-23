<?php
define('ROOT_USER', 'root');
define('ROOT_PSWD', 'root');
define('DB_NAME', 'fm');
define('USER_NAME', 'fm_user');
define('USER_PSWD', 'feastmind');
define('SERVER_IP', 'localhost');

function fm_db_connect($server_ip, $user, $pswd) {
    $con = mysql_connect($server_ip, $user, $pswd);
    if (!$con) {
        $error_msg = "Error: unable to connect to the MySQL server";
        echo $error_msg . "\n";
        exit($error_msg);
    }
    echo "Connected to MySQL server at $server_ip with user $user\n";
    return $con;
}

function fm_use_db($db_name, $con) {
    if (mysql_select_db($db_name)) 
        echo "Used db $db_name\n";
    else {
        $error_msg = "Error: failed to use the database (" . 
                     mysql_error() . ")";
        echo $error_msg . "\n";
        mysql_close($con);
        exit($error_msg);
    }
}

function fm_db_query($query, $success_msg, $failure_msg, $con) {
    if ($result = mysql_query($query)) {
        echo $success_msg . "\n";
        return $result;
    }
    else {
        $error_msg = "Error: " . $failure_msg . "(" . mysql_error() . ")";
        mysql_close($con);
        exit($error_msg);
    }
}

function fm_setup_db() {
    echo "Setuping db...\n";
    // connect to server
    $con = fm_db_connect(SERVER_IP, ROOT_USER, ROOT_PSWD);
    // create the database
    $query = "CREATE DATABASE IF NOT EXISTS " . DB_NAME;
    fm_db_query($query, "Created the database", 
                        "Failed to create the database", $con);
    // create the user
    $query = "CREATE USER '" . USER_NAME .
             "'@'localhost' IDENTIFIED BY '" . USER_PSWD . "'" ;
    //fm_db_query($query, "Created the user",
    //                    "Failed to create the user", $con);
    // grant privileges to the user
    $query = "GRANT ALL ON " . DB_NAME . ".* TO '" . 
        USER_NAME . "'@'localhost'";
    fm_db_query($query, "Granted the privileges to the user", 
                        "Failed to grant user privileges", $con);
    // close the old connnection
    mysql_close($con);
    echo "Closed connection\n";
    echo "Done\n";
}

# Schema
# 
# Table USER (user_id INTEGER, pswd VARCHAR(30), email VARCHAR(50))
# Table FOLDER (user_id INTEGER, folder_id INTEGER, name VARCHAR(30), size INTEGER)
# Table DOC (user_id INTEGER, folder_id INTEGER, doc_id VARCHAR(22), 
#            title VARCHAR(100), author VARCHAR(100), publication VARCHAR(100), 
#            year DATETIME, added_on DATETIME)
# Table DOC_TEXT (doc_id VARCHAR(22), text TEXT)
function fm_setup_tables($con) {
    // connect to server
    $con = fm_db_connect(SERVER_IP, USER_NAME, USER_PSWD);
    // use the database
    fm_use_db(DB_NAME, $con);
    // drop all tables
    $query = "SHOW TABLES";
    $result = fm_db_query($query, "Showed tables", "Failed to show tables", $con);
    $tables = array();
    while($row = mysql_fetch_row($result)) {
        $tables[] = $row[0];
    }
    foreach($tables as $table) {
        fm_db_query("DROP TABLE $table", 
                    "Dropped table $table", 
                    "Failed to drop table $table", $con);
    }
    // create tables
    // create table USER
    $query = "CREATE TABLE user (" . 
                "id     INTEGER UNSIGNED AUTO_INCREMENT, " .
                "pswd   CHAR(22), " .
                "email  VARCHAR(50), "  .
                "PRIMARY KEY    (id) )" .
                "AUTO_INCREMENT=1000, ENGINE=INNODB";
    fm_db_query($query, "Created table user", "Failed to create table USER",
                $con);
    // create table FOLDER
    $query = "CREATE TABLE folder (" .
                "user_id        INTEGER UNSIGNED, " .
                "folder_seq     SMALLINT UNSIGNED, " . 
                "name           VARCHAR(30), " . 
                "size           SMALLINT UNSIGNED, " . 
                "PRIMARY KEY    (user_id, folder_seq), " .
                "FOREIGN KEY    (user_id) REFERENCES user(id) ) ".
             "ENGINE=INNODB";
    fm_db_query($query, "Created table folder", 
                "Failed to create table folder", $con);
    // create table doc_text
    $query = "CREATE TABLE doc_text (" .
                "doc_id        CHAR(22), " .
                "text          TEXT, " .
                "PRIMARY KEY   (doc_id) )" .
             "ENGINE=INNODB";
    fm_db_query($query, "Created table doc_text", 
                "failed to create table doc_text", $con);
    // create table doc
    $query = "CREATE TABLE doc (" .
                "user_id       INTEGER UNSIGNED, " .
                "folder_seq    SMALLINT UNSIGNED, " .
                "doc_id        CHAR(22), " . 
                "title         VARCHAR(100), " .
                "authors       VARCHAR(100), " .
                "publication   VARCHAR(100), ".
                "year          YEAR, " .
                "added_on      DATETIME, " .
                "PRIMARY KEY   (user_id, folder_seq, doc_id), " . 
                "INDEX         (doc_id), " .
                "FOREIGN KEY   (doc_id) REFERENCES doc_text(doc_id)," .
                "FOREIGN KEY   (user_id, folder_seq) " . 
                    "REFERENCES folder(user_id, folder_seq) )" .
             "ENGINE=INNODB";
    fm_db_query($query, "Created table doc", 
                "Failed to create table doc", $con);
    // close the new connection
    mysql_close($con);
    echo "Closed connection\n";
    echo "Done\n";
}

function fm_init_db($con) {

}

function fm_list_folders($user_id, $con) {
    // TO-DO: sort by name
    $query = "SELECT name, size FROM folder WHERE user_id==$user_id";
    $result = mysql_query($query, $con);
    $folders = array();
    while($row = mysql_fetch_row($result)) {
        $folders[] = array("name" => $row[0], "size" ==> $row[1]);
    }
    return $folders;
}

function fm_list_docs($user_id, $folder_seq, 
                      $from, $to, 
                      $sort_by, $con) {
    // TO-DO: sort by ?
    $query = "SELECT title, author, publication, year, added_on " .
             "WHERE user_id=$user_id and folder_seq=$folder_seq ";
    $result = mysql_query($query, $con);
    $docs = array();
    while($row = mysql_fetch_row($result, $con)) {
        $docs[] = array("title"         => $row[0], 
                        "authors"       => $row[1], 
                        "publication"   => $row[2], 
                        "year"          => $row[3],
                        "added_on"      => $row[4]);
    }
    return $docs;
}

function fm_get_doc_text($doc_id, $con) {
    $query = "SELECT text FROM doc_text WHERE doc_id='$doc_id'";
    $result = mysql_query($query, $con);
    if ( $row = mysql_fetch_row($result, $con) ) {
        $text = $row[0];
        return $text;
    }
    return null;
}

//fm_setup_db();
fm_setup_tables();

?>
