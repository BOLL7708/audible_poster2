<?php
// error_reporting(0);
class DB_SQLite
{
    // Const
    const DIR = '../_data';
    const FILE = DB_SQLite::DIR.'/books.sqlite';
    
    // region Singleton
    private static DB_SQLite|null $instance = null;

    static function get(): DB_SQLite
    {
        if (self::$instance == null) self::$instance = new DB_SQLite();
        return self::$instance;
    }
    // endregion

    // region General Database Functions
    private SQLite3 $sqlite;

    public function __construct()
    {
        if (!is_dir($this::DIR)) mkdir($this::DIR, recursive: true);
        // Default connection
        $dbExisted = file_exists($this::FILE);
        $this->sqlite = new SQLite3($this::FILE);
        if(!$dbExisted) {
            $createTableQuery = file_get_contents('./sql/table.sql');
            $success = $this->sqlite->exec($createTableQuery);
            if(!$success) {
                error_log("DB_SQLite: Unable to create table: ".$this->sqlite->lastErrorMsg());
            }
        }
    }

    /**
     * @param string $query
     * @param array $params
     * @return array|bool Array if there are rows, bool otherwise.
     * @throws Exception
     */
    public function query(string $query, array $params = []): array|bool
    {
        $result = false;
        $maxTries = 50;
        for ($i = 1; $i <= $maxTries; $i++) {
            try {
                $stmt = $this->sqlite->prepare($query);
                if ($stmt === false) {
                    usleep(500000); // 0.5s
                    continue;
                }
                if (!empty($params)) {
                    foreach ($params as $key => $value) {
                        $stmt->bindValue($key, $value);
                    }
                }
                $result = $stmt->execute();
                if ($i > 1) error_log("DB_SQLite: Query succeeded on try #$i");
                break; // Will break the loop if no exception was thrown.
            } catch (Exception $e) {
                $msg = $e->getMessage();
                if (str_contains($msg, 'database is locked')) {
                    usleep(100000); // 0.1s
                } else {
                    // If it's a different exception, rethrow it.
                    throw $e;
                }
            }
        }
        if ($result === false) return false;

        // Result output
        $output = [];
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) $output[] = $row;
        return $output;
    }
    // endregion
}