<?php

/**
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace Kitodo\Dlf\Common;

use TYPO3\CMS\Core\Configuration\ConfigurationManager;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Core\Environment;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Http\Uri;
use TYPO3\CMS\Core\Http\ApplicationType;
use TYPO3\CMS\Core\Http\RequestFactory;
use TYPO3\CMS\Core\Log\LogManager;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Core\Messaging\FlashMessage;
use TYPO3\CMS\Core\Messaging\FlashMessageService;
use TYPO3\CMS\Core\Messaging\FlashMessageQueue;
use TYPO3\CMS\Core\Resource\MimeTypeCollection;
use TYPO3\CMS\Core\Resource\MimeTypeDetector;
use TYPO3\CMS\Core\Utility\ArrayUtility;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\MathUtility;
use TYPO3\CMS\Core\Utility\PathUtility;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;
use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\Domain\Repository\PageRepository;

/**
 * Helper class for the 'dlf' extension
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class Helper
{
    /**
     * @access public
     * @static
     * @var string The extension key
     */
    public static string $extKey = 'dlf';

    /**
     * @access protected
     * @static
     * @var string This holds the cipher algorithm
     *
     * @see openssl_get_cipher_methods() for options
     */
    protected static string $cipherAlgorithm = 'aes-256-ctr';

    /**
     * @access protected
     * @static
     * @var string This holds the hash algorithm
     *
     * @see openssl_get_md_methods() for options
     */
    protected static string $hashAlgorithm = 'sha256';

    /**
     * @access protected
     * @static
     * @var array The locallang array for flash messages
     */
    protected static array $messages = [];

    /**
     * Generates a flash message and adds it to a message queue.
     *
     * @access public
     *
     * @static
     *
     * @param string $message The body of the message
     * @param string $title The title of the message
     * @param int $severity The message's severity
     * @param bool $session Should the message be saved in the user's session?
     * @param string $queue The queue's unique identifier
     *
     * @return FlashMessageQueue The queue the message was added to
     */
    public static function addMessage(string $message, string $title, int $severity, bool $session = false, string $queue = 'kitodo.default.flashMessages'): FlashMessageQueue
    {
        $flashMessageService = GeneralUtility::makeInstance(FlashMessageService::class);
        $flashMessageQueue = $flashMessageService->getMessageQueueByIdentifier($queue);
        $flashMessage = GeneralUtility::makeInstance(
            FlashMessage::class,
            $message,
            $title,
            $severity,
            $session
        );
        $flashMessageQueue->enqueue($flashMessage);
        return $flashMessageQueue;
    }

    /**
     * Check if given identifier is a valid identifier of the German National Library
     *
     * @access public
     *
     * @static
     *
     * @param string $id The identifier to check
     * @param string $type What type is the identifier supposed to be? Possible values: PPN, IDN, PND, ZDB, SWD, GKD
     *
     * @return bool Is $id a valid GNL identifier of the given $type?
     */
    public static function checkIdentifier(string $id, string $type): bool
    {
        $digits = substr($id, 0, 8);
        $checksum = self::getChecksum($digits);
        switch (strtoupper($type)) {
            case 'PPN':
            case 'IDN':
            case 'PND':
                if ($checksum == 10) {
                    $checksum = 'X';
                }
                if (!preg_match('/\d{8}[\dX]{1}/i', $id)) {
                    return false;
                } elseif (strtoupper(substr($id, -1, 1)) != $checksum) {
                    return false;
                }
                break;
            case 'ZDB':
                if ($checksum == 10) {
                    $checksum = 'X';
                }
                if (!preg_match('/\d{8}-[\dX]{1}/i', $id)) {
                    return false;
                } elseif (strtoupper(substr($id, -1, 1)) != $checksum) {
                    return false;
                }
                break;
            case 'SWD':
                $checksum = 11 - $checksum;
                if (!preg_match('/\d{8}-\d{1}/i', $id)) {
                    return false;
                } elseif ($checksum == 10) {
                    //TODO: Binary operation "+" between string and 1 results in an error.
                    // @phpstan-ignore-next-line
                    return self::checkIdentifier(($digits + 1) . substr($id, -2, 2), 'SWD');
                } elseif (substr($id, -1, 1) != $checksum) {
                    return false;
                }
                break;
            case 'GKD':
                $checksum = 11 - $checksum;
                if ($checksum == 10) {
                    $checksum = 'X';
                }
                if (!preg_match('/\d{8}-[\dX]{1}/i', $id)) {
                    return false;
                } elseif (strtoupper(substr($id, -1, 1)) != $checksum) {
                    return false;
                }
                break;
        }
        return true;
    }

    /**
     * Get checksum for given digits.
     *
     * @access private
     *
     * @static
     *
     * @param string $digits
     *
     * @return int
     */
    private static function getChecksum(string $digits): int
    {
        $checksum = 0;
        for ($i = 0, $j = strlen($digits); $i < $j; $i++) {
            $checksum += (9 - $i) * (int) substr($digits, $i, 1);
        }
        return (11 - ($checksum % 11)) % 11;
    }

    /**
     * Decrypt encrypted value with given control hash
     *
     * @access public
     *
     * @static
     *
     * @param string $encrypted The encrypted value to decrypt
     *
     * @return mixed The decrypted value or false on error
     */
    public static function decrypt(string $encrypted)
    {
        if (
            !in_array(self::$cipherAlgorithm, openssl_get_cipher_methods(true))
            || !in_array(self::$hashAlgorithm, openssl_get_md_methods(true))
        ) {
            self::log('OpenSSL library doesn\'t support cipher and/or hash algorithm', LOG_SEVERITY_ERROR);
            return false;
        }
        if (empty(self::getEncryptionKey())) {
            self::log('No encryption key set in TYPO3 configuration', LOG_SEVERITY_ERROR);
            return false;
        }
        if (
            empty($encrypted)
            || strlen($encrypted) < openssl_cipher_iv_length(self::$cipherAlgorithm)
        ) {
            self::log('Invalid parameters given for decryption', LOG_SEVERITY_ERROR);
            return false;
        }
        // Split initialisation vector and encrypted data.
        $binary = base64_decode($encrypted);
        $iv = substr($binary, 0, openssl_cipher_iv_length(self::$cipherAlgorithm));
        $data = substr($binary, openssl_cipher_iv_length(self::$cipherAlgorithm));
        $key = openssl_digest(self::getEncryptionKey(), self::$hashAlgorithm, true);
        // Decrypt data.
        return openssl_decrypt($data, self::$cipherAlgorithm, $key, OPENSSL_RAW_DATA, $iv);
    }

    /**
     * Try to parse $content into a `SimpleXmlElement`. If $content is not a
     * string or does not contain valid XML, `false` is returned.
     *
     * @access public
     *
     * @static
     *
     * @param mixed $content content of file to read
     *
     * @return \SimpleXMLElement|false
     */
    public static function getXmlFileAsString($content)
    {
        // Don't make simplexml_load_string throw (when $content is an array
        // or object)
        if (!is_string($content)) {
            return false;
        }

        // Turn off libxml's error logging.
        $libxmlErrors = libxml_use_internal_errors(true);

        if (\PHP_VERSION_ID < 80000) {
            // Disables the functionality to allow external entities to be loaded when parsing the XML, must be kept
            $previousValueOfEntityLoader = libxml_disable_entity_loader(true);
        }

        // Try to load XML from file.
        $xml = simplexml_load_string($content);

        if (\PHP_VERSION_ID < 80000) {
            // reset entity loader setting
            libxml_disable_entity_loader($previousValueOfEntityLoader);
        }
        // Reset libxml's error logging.
        libxml_use_internal_errors($libxmlErrors);
        return $xml;
    }

    /**
     * Add a message to the TYPO3 log
     *
     * @access public
     *
     * @static
     *
     * @param string $message The message to log
     * @param int $severity The severity of the message 0 is info, 1 is notice, 2 is warning, 3 is fatal error, -1 is "OK" message
     *
     * @return void
     */
    public static function log(string $message, int $severity = 0): void
    {
        $logger = GeneralUtility::makeInstance(LogManager::class)->getLogger(get_called_class());

        switch ($severity) {
            case 0:
                $logger->info($message);
                break;
            case 1:
                $logger->notice($message);
                break;
            case 2:
                $logger->warning($message);
                break;
            case 3:
                $logger->error($message);
                break;
            default:
                break;
        }
    }

    /**
     * Digest the given string
     *
     * @access public
     *
     * @static
     *
     * @param string $string The string to encrypt
     *
     * @return mixed Hashed string or false on error
     */
    public static function digest(string $string)
    {
        if (!in_array(self::$hashAlgorithm, openssl_get_md_methods(true))) {
            self::log('OpenSSL library doesn\'t support hash algorithm', LOG_SEVERITY_ERROR);
            return false;
        }
        // Hash string.
        return openssl_digest($string, self::$hashAlgorithm);
    }

    /**
     * Encrypt the given string
     *
     * @access public
     *
     * @static
     *
     * @param string $string The string to encrypt
     *
     * @return mixed Encrypted string or false on error
     */
    public static function encrypt(string $string)
    {
        if (
            !in_array(self::$cipherAlgorithm, openssl_get_cipher_methods(true))
            || !in_array(self::$hashAlgorithm, openssl_get_md_methods(true))
        ) {
            self::log('OpenSSL library doesn\'t support cipher and/or hash algorithm', LOG_SEVERITY_ERROR);
            return false;
        }
        if (empty(self::getEncryptionKey())) {
            self::log('No encryption key set in TYPO3 configuration', LOG_SEVERITY_ERROR);
            return false;
        }
        // Generate random initialization vector.
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length(self::$cipherAlgorithm));
        $key = openssl_digest(self::getEncryptionKey(), self::$hashAlgorithm, true);
        // Encrypt data.
        $encrypted = openssl_encrypt($string, self::$cipherAlgorithm, $key, OPENSSL_RAW_DATA, $iv);
        // Merge initialization vector and encrypted data.
        if ($encrypted !== false) {
            $encrypted = base64_encode($iv . $encrypted);
        }
        return $encrypted;
    }

    /**
     * Clean up a string to use in an URL.
     *
     * @access public
     *
     * @static
     *
     * @param string $string The string to clean up
     *
     * @return string The cleaned up string
     */
    public static function getCleanString(string $string): string
    {
        // Convert to lowercase.
        $string = strtolower($string);
        // Remove non-alphanumeric characters.
        $string = preg_replace('/[^a-z\d_\s-]/', '', $string);
        // Remove multiple dashes or whitespaces.
        $string = preg_replace('/[\s-]+/', ' ', $string);
        // Convert whitespaces and underscore to dash.
        return preg_replace('/[\s_]/', '-', $string);
    }

    /**
     * Get the registered hook objects for a class
     *
     * @access public
     *
     * @static
     *
     * @param string $scriptRelPath The path to the class file
     *
     * @return array Array of hook objects for the class
     */
    public static function getHookObjects(string $scriptRelPath): array
    {
        $hookObjects = [];
        if (is_array(self::getOptions()[self::$extKey . '/' . $scriptRelPath]['hookClass'])) {
            foreach (self::getOptions()[self::$extKey . '/' . $scriptRelPath]['hookClass'] as $classRef) {
                $hookObjects[] = GeneralUtility::makeInstance($classRef);
            }
        }
        return $hookObjects;
    }

    /**
     * Get the "index_name" for an UID
     *
     * @access public
     *
     * @static
     *
     * @param int $uid The UID of the record
     * @param string $table Get the "index_name" from this table
     * @param int $pid Get the "index_name" from this page
     *
     * @return string "index_name" for the given UID
     */
    public static function getIndexNameFromUid(int $uid, string $table, int $pid = -1): string
    {
        // Sanitize input.
        $uid = max($uid, 0);
        if (
            !$uid
            // NOTE: Only use tables that don't have too many entries!
            || !in_array($table, ['tx_dlf_collections', 'tx_dlf_libraries', 'tx_dlf_metadata', 'tx_dlf_metadatasubentries', 'tx_dlf_structures', 'tx_dlf_solrcores'])
        ) {
            self::log('Invalid UID "' . $uid . '" or table "' . $table . '"', LOG_SEVERITY_ERROR);
            return '';
        }

        $makeCacheKey = function ($pid, $uid) {
            return $pid . '.' . $uid;
        };

        static $cache = [];
        if (!isset($cache[$table])) {
            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable($table);

            $result = $queryBuilder
                ->select(
                    $table . '.index_name AS index_name',
                    $table . '.uid AS uid',
                    $table . '.pid AS pid',
                )
                ->from($table)
                ->execute();

            $cache[$table] = [];

            while ($row = $result->fetchAssociative()) {
                $cache[$table][$makeCacheKey($row['pid'], $row['uid'])]
                    = $cache[$table][$makeCacheKey(-1, $row['uid'])]
                    = $row['index_name'];
            }
        }

        $cacheKey = $makeCacheKey($pid, $uid);
        $result = $cache[$table][$cacheKey] ?? '';

        if ($result === '') {
            self::log('No "index_name" with UID ' . $uid . ' and PID ' . $pid . ' found in table "' . $table . '"', LOG_SEVERITY_WARNING);
        }

        return $result;
    }

    /**
     * Get language name from ISO code
     *
     * @access public
     *
     * @static
     *
     * @param string $code ISO 639-1 or ISO 639-2/B language code
     *
     * @return string Localized full name of language or unchanged input
     */
    public static function getLanguageName(string $code): string
    {
        // Analyze code and set appropriate ISO table.
        $isoCode = strtolower(trim($code));
        if (preg_match('/^[a-z]{3}$/', $isoCode)) {
            $file = 'EXT:dlf/Resources/Private/Data/iso-639-2b.xlf';
        } elseif (preg_match('/^[a-z]{2}$/', $isoCode)) {
            $file = 'EXT:dlf/Resources/Private/Data/iso-639-1.xlf';
        } else {
            // No ISO code, return unchanged.
            return $code;
        }
        $lang = LocalizationUtility::translate('LLL:' . $file . ':' . $code);
        if (!empty($lang)) {
            return $lang;
        } else {
            self::log('Language code "' . $code . '" not found in ISO-639 table', LOG_SEVERITY_NOTICE);
            return $code;
        }
    }

    /**
     * Get all document structures as array
     *
     * @access public
     *
     * @static
     *
     * @param int $pid Get the "index_name" from this page only
     *
     * @return array
     */
    public static function getDocumentStructures(int $pid = -1): array
    {
        // TODO: Against redundancy with getIndexNameFromUid

        $connectionPool = GeneralUtility::makeInstance(ConnectionPool::class);
        $queryBuilder = $connectionPool->getQueryBuilderForTable('tx_dlf_structures');

        $where = '';
        // Should we check for a specific PID, too?
        if ($pid !== -1) {
            $pid = max($pid, 0);
            $where = $queryBuilder->expr()->eq('tx_dlf_structures.pid', $pid);
        }

        // Fetch document info for UIDs in $documentSet from DB
        $kitodoStructures = $queryBuilder
            ->select(
                'tx_dlf_structures.uid AS uid',
                'tx_dlf_structures.index_name AS indexName'
            )
            ->from('tx_dlf_structures')
            ->where($where)
            ->execute();

        $allStructures = $kitodoStructures->fetchAllAssociative();

        // make lookup-table indexName -> uid
        return array_column($allStructures, 'indexName', 'uid');
    }

    /**
     * Determine whether or not $url is a valid URL using HTTP or HTTPS scheme.
     *
     * @access public
     *
     * @static
     *
     * @param string $url
     *
     * @return bool
     */
    public static function isValidHttpUrl(string $url): bool
    {
        if (!GeneralUtility::isValidUrl($url)) {
            return false;
        }

        try {
            $uri = new Uri($url);
            return !empty($uri->getScheme());
        } catch (\InvalidArgumentException $e) {
            self::log($e->getMessage(), LOG_SEVERITY_ERROR);
            return false;
        }
    }

    /**
     * Process a data and/or command map with TYPO3 core engine as admin.
     *
     * @access public
     *
     * @param array $data Data map
     * @param array $cmd Command map
     * @param bool $reverseOrder Should the data map be reversed?
     * @param bool $cmdFirst Should the command map be processed first?
     *
     * @return array Array of substituted "NEW..." identifiers and their actual UIDs.
     */
    public static function processDatabaseAsAdmin(array $data = [], array $cmd = [], $reverseOrder = false, $cmdFirst = false)
    {
        $context = GeneralUtility::makeInstance(Context::class);

        if (
            ApplicationType::fromRequest($GLOBALS['TYPO3_REQUEST'])->isBackend()
            && $context->getPropertyFromAspect('backend.user', 'isAdmin')
        ) {
            // Instantiate TYPO3 core engine.
            $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
            // We do not use workspaces and have to bypass restrictions in DataHandler.
            $dataHandler->bypassWorkspaceRestrictions = true;
            // Load data and command arrays.
            $dataHandler->start($data, $cmd);
            // Process command map first if default order is reversed.
            if (
                !empty($cmd)
                && $cmdFirst
            ) {
                $dataHandler->process_cmdmap();
            }
            // Process data map.
            if (!empty($data)) {
                $dataHandler->reverseOrder = $reverseOrder;
                $dataHandler->process_datamap();
            }
            // Process command map if processing order is not reversed.
            if (
                !empty($cmd)
                && !$cmdFirst
            ) {
                $dataHandler->process_cmdmap();
            }
            return $dataHandler->substNEWwithIDs;
        } else {
            self::log('Current backend user has no admin privileges', LOG_SEVERITY_ERROR);
            return [];
        }
    }

    /**
     * Fetches and renders all available flash messages from the queue.
     *
     * @access public
     *
     * @static
     *
     * @param string $queue The queue's unique identifier
     *
     * @return string All flash messages in the queue rendered as HTML.
     */
    public static function renderFlashMessages(string $queue = 'kitodo.default.flashMessages'): string
    {
        $flashMessageService = GeneralUtility::makeInstance(FlashMessageService::class);
        $flashMessageQueue = $flashMessageService->getMessageQueueByIdentifier($queue);
        $flashMessages = $flashMessageQueue->getAllMessagesAndFlush();
        return GeneralUtility::makeInstance(KitodoFlashMessageRenderer::class)
            ->render($flashMessages);
    }

    /**
     * This translates an internal "index_name"
     *
     * @access public
     *
     * @static
     *
     * @param string $indexName The internal "index_name" to translate
     * @param string $table Get the translation from this table
     * @param string $pid Get the translation from this page
     *
     * @return string Localized label for $indexName
     */
    public static function translate(string $indexName, string $table, string $pid): string
    {
        // Load labels into static variable for future use.
        static $labels = [];
        // Sanitize input.
        $pid = max((int) $pid, 0);
        if (!$pid) {
            self::log('Invalid PID ' . $pid . ' for translation', LOG_SEVERITY_WARNING);
            return $indexName;
        }
        /** @var PageRepository $pageRepository */
        $pageRepository = GeneralUtility::makeInstance(PageRepository::class);

        $languageAspect = GeneralUtility::makeInstance(Context::class)->getAspect('language');
        $languageContentId = $languageAspect->getContentId();

        // Check if "index_name" is an UID.
        if (MathUtility::canBeInterpretedAsInteger($indexName)) {
            $indexName = self::getIndexNameFromUid((int) $indexName, $table, $pid);
        }
        /* $labels already contains the translated content element, but with the index_name of the translated content element itself
         * and not with the $indexName of the original that we receive here. So we have to determine the index_name of the
         * associated translated content element. E.g. $labels['title0'] != $indexName = title. */

        $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
            ->getQueryBuilderForTable($table);

        // First fetch the uid of the received index_name
        $result = $queryBuilder
            ->select(
                $table . '.uid AS uid',
                $table . '.l18n_parent AS l18n_parent'
            )
            ->from($table)
            ->where(
                $queryBuilder->expr()->eq($table . '.pid', $pid),
                $queryBuilder->expr()->eq($table . '.index_name', $queryBuilder->expr()->literal($indexName)),
                self::whereExpression($table, true)
            )
            ->setMaxResults(1)
            ->execute();

        $row = $result->fetchAssociative();

        if ($row) {
            // Now we use the uid of the l18_parent to fetch the index_name of the translated content element.
            $result = $queryBuilder
                ->select($table . '.index_name AS index_name')
                ->from($table)
                ->where(
                    $queryBuilder->expr()->eq($table . '.pid', $pid),
                    $queryBuilder->expr()->eq($table . '.uid', $row['l18n_parent']),
                    $queryBuilder->expr()->eq($table . '.sys_language_uid', (int) $languageContentId),
                    self::whereExpression($table, true)
                )
                ->setMaxResults(1)
                ->execute();

            $row = $result->fetchAssociative();

            if ($row) {
                // If there is an translated content element, overwrite the received $indexName.
                $indexName = $row['index_name'];
            }
        }

        // Check if we already got a translation.
        if (empty($labels[$table][$pid][$languageContentId][$indexName])) {
            // Check if this table is allowed for translation.
            if (in_array($table, ['tx_dlf_collections', 'tx_dlf_libraries', 'tx_dlf_metadata', 'tx_dlf_metadatasubentries', 'tx_dlf_structures'])) {
                $additionalWhere = $queryBuilder->expr()->in($table . '.sys_language_uid', [-1, 0]);
                if ($languageContentId > 0) {
                    $additionalWhere = $queryBuilder->expr()->andX(
                        $queryBuilder->expr()->orX(
                            $queryBuilder->expr()->in($table . '.sys_language_uid', [-1, 0]),
                            $queryBuilder->expr()->eq($table . '.sys_language_uid', (int) $languageContentId)
                        ),
                        $queryBuilder->expr()->eq($table . '.l18n_parent', 0)
                    );
                }

                // Get labels from database.
                $result = $queryBuilder
                    ->select('*')
                    ->from($table)
                    ->where(
                        $queryBuilder->expr()->eq($table . '.pid', $pid),
                        $additionalWhere,
                        self::whereExpression($table, true)
                    )
                    ->setMaxResults(10000)
                    ->execute();

                if ($result->rowCount() > 0) {
                    while ($resArray = $result->fetchAssociative()) {
                        // Overlay localized labels if available.
                        if ($languageContentId > 0) {
                            $resArray = $pageRepository->getRecordOverlay($table, $resArray, $languageContentId, $languageAspect->getLegacyOverlayType());
                        }
                        if ($resArray) {
                            $labels[$table][$pid][$languageContentId][$resArray['index_name']] = $resArray['label'];
                        }
                    }
                } else {
                    self::log('No translation with PID ' . $pid . ' available in table "' . $table . '" or translation not accessible', LOG_SEVERITY_NOTICE);
                }
            } else {
                self::log('No translations available for table "' . $table . '"', LOG_SEVERITY_WARNING);
            }
        }

        if (!empty($labels[$table][$pid][$languageContentId][$indexName])) {
            return $labels[$table][$pid][$languageContentId][$indexName];
        } else {
            return $indexName;
        }
    }

    /**
     * This returns the additional WHERE expression of a table based on its TCA configuration
     *
     * @access public
     *
     * @static
     *
     * @param string $table Table name as defined in TCA
     * @param bool $showHidden Ignore the hidden flag?
     *
     * @return string Additional WHERE expression
     */
    public static function whereExpression(string $table, bool $showHidden = false): string
    {
        if (!Environment::isCli() && ApplicationType::fromRequest($GLOBALS['TYPO3_REQUEST'])->isFrontend()) {
            // Should we ignore the record's hidden flag?
            $ignoreHide = 0;
            if ($showHidden) {
                $ignoreHide = 1;
            }
            /** @var PageRepository $pageRepository */
            $pageRepository = GeneralUtility::makeInstance(PageRepository::class);

            $expression = $pageRepository->enableFields($table, $ignoreHide);
            if (!empty($expression)) {
                return substr($expression, 5);
            } else {
                return '';
            }
        } elseif (Environment::isCli() || ApplicationType::fromRequest($GLOBALS['TYPO3_REQUEST'])->isBackend()) {
            return GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable($table)
                ->expr()
                ->eq($table . '.' . $GLOBALS['TCA'][$table]['ctrl']['delete'], 0);
        } else {
            self::log('Unexpected application type (neither frontend or backend)', LOG_SEVERITY_ERROR);
            return '1=-1';
        }
    }

    /**
     * Prevent instantiation by hiding the constructor
     *
     * @access private
     *
     * @return void
     */
    private function __construct()
    {
        // This is a static class, thus no instances should be created.
    }

    /**
     * Returns the LanguageService
     *
     * @access public
     *
     * @static
     *
     * @return LanguageService
     */
    public static function getLanguageService(): LanguageService
    {
        return $GLOBALS['LANG'];
    }

    /**
     * Replacement for the TYPO3 GeneralUtility::getUrl().
     *
     * This method respects the User Agent settings from extConf
     *
     * @access public
     *
     * @static
     *
     * @param string $url
     *
     * @return string|bool
     */
    public static function getUrl(string $url)
    {
        if (!Helper::isValidHttpUrl($url)) {
            return false;
        }

        // Get extension configuration.
        $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get('dlf', 'general');

        /** @var RequestFactory $requestFactory */
        $requestFactory = GeneralUtility::makeInstance(RequestFactory::class);
        $configuration = [
            'timeout' => 30,
            'headers' => [
                'User-Agent' => $extConf['userAgent'] ?? 'Kitodo.Presentation Proxy',
            ],
        ];
        try {
            $response = $requestFactory->request($url, 'GET', $configuration);
        } catch (\Exception $e) {
            self::log('Could not fetch data from URL "' . $url . '". Error: ' . $e->getMessage() . '.', LOG_SEVERITY_WARNING);
            return false;
        }
        return $response->getBody()->getContents();
    }

    /**
     * Check if given value is a valid XML ID.
     * @see https://www.w3.org/TR/xmlschema-2/#ID
     *
     * @access public
     *
     * @static
     *
     * @param mixed $id The ID value to check
     *
     * @return bool TRUE if $id is valid XML ID, FALSE otherwise
     */
    public static function isValidXmlId($id): bool
    {
        return preg_match('/^[_a-z][_a-z0-9-.]*$/i', $id) === 1;
    }

    /**
     * Get options from local configuration.
     *
     * @access private
     *
     * @static
     *
     * @return array
     */
    private static function getOptions(): array
    {
        return self::getLocalConfigurationByPath('SC_OPTIONS');
    }

    /**
     * Get encryption key from local configuration.
     *
     * @access private
     *
     * @static
     *
     * @return string|null
     */
    private static function getEncryptionKey(): ?string
    {
        return self::getLocalConfigurationByPath('SYS/encryptionKey');
    }

    /**
     * Get local configuration for given path.
     *
     * @access private
     *
     * @static
     *
     * @param string $path
     *
     * @return mixed
     */
    private static function getLocalConfigurationByPath(string $path)
    {
        $configurationManager = GeneralUtility::makeInstance(ConfigurationManager::class);

        if (array_key_exists(strtok($path, '/'), $configurationManager->getLocalConfiguration())) {
            return $configurationManager->getLocalConfigurationValueByPath($path);
        }

        return ArrayUtility::getValueByPath($GLOBALS['TYPO3_CONF_VARS'], $path);
    }

    /**
     * Extracts the file extension from a file path or URL
     *
     * @param string $path File path or URL
     * @return string|null File extension in lowercase or null if not found
     */
    private static function getFileExtension(string $path): ?string
    {
        $pathInfo = GeneralUtility::makeInstance(PathUtility::class)->pathinfo($path);

        return isset($pathInfo['extension'])
            ? strtolower($pathInfo['extension'])
            : null;
    }

    /**
     * Filters a file based on its mimetype.
     *
     * This method checks if the provided file array contains a specified mimetype key and
     * verifies if the mimetype belongs to any of the allowed mimetypes or matches any of the additional custom mimetypes.
     *
     * @param string $fileUrl Url to the file
     * @param array $allowedCategories The allowed MIME type categories to filter by (e.g., ['audio'], ['video'] or ['image', 'application'])
     * @param array $dlfMimeTypes The custom DLF mimetype keys IIIF, IIP or ZOOMIFY to check against (default is an empty array)
     *
     * @return bool True if the file mimetype belongs to any of the allowed mimetypes or matches any custom dlf mimetypes, false otherwise
     */
    public static function filterFilesByMimeType(string $fileUrl, array $allowedCategories, array $dlfMimeTypes = []): bool
    {
        if (empty($allowedCategories) && empty($dlfMimeTypes)) {
            return false;
        }

        // Retrieves MIME types from the TYPO3 Core MimeTypeCollection
        $mimeTypeCollection = GeneralUtility::makeInstance(MimeTypeCollection::class);
        $allowedMimeTypes = array_filter(
            $mimeTypeCollection->getMimeTypes(),
            function ($mimeType) use ($allowedCategories) {
                foreach ($allowedCategories as $category) {
                    if (strpos($mimeType, $category . '/') === 0) {
                        return true;
                    }
                }
                return false;
            }
        );

        // Custom dlf MIME types
        $dlfMimeTypeArray = [
            'IIIF' => 'application/vnd.kitodo.iiif',
            'IIP' => 'application/vnd.netfpx',
            'ZOOMIFY' => 'application/vnd.kitodo.zoomify'
        ];
        // Filter custom dlf MIME types based on provided keys
        $filteredDlfMimeTypes = array_intersect_key($dlfMimeTypeArray, array_flip($dlfMimeTypes));

        // Filter file based on its MIME type
        if (!empty($fileUrl)) {
            $fileExtension = self::getFileExtension($fileUrl);
            if ($fileExtension === null) {
                self::log('No file extension found in File URL for MIME type check', LOG_SEVERITY_WARNING);
                return false;
            }
            $assumedMimeTypesOfFile = GeneralUtility::makeInstance(MimeTypeDetector::class)->getMimeTypesForFileExtension($fileExtension);
            $mergedMimeTypes = array_merge($filteredDlfMimeTypes, $allowedMimeTypes);

            foreach ($assumedMimeTypesOfFile as $mimeType) {
                if (in_array($mimeType, $mergedMimeTypes, true)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get file extensions for a given MIME type
     *
     * @param string $mimeType
     * @return array
     */
    public static function getFileExtensionsForMimeType(string $mimeType): array
    {
        $mimeTypeDetector = GeneralUtility::makeInstance(MimeTypeDetector::class);
        return $mimeTypeDetector->getFileExtensionsForMimeType($mimeType);
    }

    /**
     * Get MIME types for a given file extension
     *
     * @param string $fileExtension
     * @return array
     */
    public static function getMimeTypesForFileExtension(string $fileExtension): array
    {
        $mimeTypeDetector = GeneralUtility::makeInstance(MimeTypeDetector::class);
        return $mimeTypeDetector->getMimeTypesForFileExtension($fileExtension);
    }
}
