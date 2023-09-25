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

namespace Kitodo\Dlf\Common\Solr;

use Kitodo\Dlf\Common\Helper;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use TYPO3\CMS\Core\Cache\CacheManager;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\MathUtility;

/**
 * Solr class for the 'dlf' extension
 *
 * @author Sebastian Meyer <sebastian.meyer@slub-dresden.de>
 * @author Henrik Lochmann <dev@mentalmotive.com>
 * @package TYPO3
 * @subpackage dlf
 * @access public
 * @property-read string|null $core This holds the core name for the current instance
 * @property-write int $cPid This holds the PID for the configuration
 * @property int $limit This holds the max results
 * @property-read int $numberOfHits This holds the number of hits for last search
 * @property-write array $params This holds the additional query parameters
 * @property-read bool $ready Is the Solr service instantiated successfully?
 * @property-read \Solarium\Client $service This holds the Solr service object
 */
class Solr implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    /**
     * This holds the Solr configuration
     *
     * @var array
     * @access protected
     */
    protected $config = [];

    /**
     * This holds the core name
     *
     * @var string|null
     * @access protected
     */
    protected $core = null;

    /**
     * This holds the PID for the configuration
     *
     * @var int
     * @access protected
     */
    protected $cPid = 0;

    /**
     * The extension key
     *
     * @var string
     * @access public
     */
    public static $extKey = 'dlf';

    /**
     * The fields for SOLR index
     *
     * @var array
     * @access public
     */
    public static $fields = [];

    /**
     * This holds the max results
     *
     * @var int
     * @access protected
     */
    protected $limit = 50000;

    /**
     * This holds the number of hits for last search
     *
     * @var int
     * @access protected
     */
    protected $numberOfHits = 0;

    /**
     * This holds the additional query parameters
     *
     * @var array
     * @access protected
     */
    protected $params = [];

    /**
     * Is the search instantiated successfully?
     *
     * @var bool
     * @access protected
     */
    protected $ready = false;

    /**
     * This holds the singleton search objects with their core as array key
     *
     * @var array (\Kitodo\Dlf\Common\Solr\Solr)
     * @access protected
     */
    protected static $registry = [];

    /**
     * This holds the Solr service object
     *
     * @var \Solarium\Client
     * @access protected
     */
    protected $service;

    /**
     * Add a new core to Apache Solr
     *
     * @access public
     *
     * @param string $core: The name of the new core. If empty, the next available core name is used.
     *
     * @return string The name of the new core
     */
    public static function createCore($core = '')
    {
        // Get next available core name if none given.
        if (empty($core)) {
            $core = 'dlfCore' . self::getNextCoreNumber();
        }
        // Get Solr service instance.
        $solr = self::getInstance($core);
        // Create new core if core with given name doesn't exist.
        if ($solr->ready) {
            // Core already exists.
            return $core;
        } else {
            // Core doesn't exist yet.
            $solrAdmin = self::getInstance();
            if ($solrAdmin->ready) {
                $query = $solrAdmin->service->createCoreAdmin();
                $action = $query->createCreate();
                $action->setConfigSet('dlf');
                $action->setCore($core);
                $action->setDataDir('data');
                $action->setInstanceDir($core);
                $query->setAction($action);
                try {
                    $response = $solrAdmin->service->coreAdmin($query);
                    if ($response->getWasSuccessful()) {
                        // Core successfully created.
                        return $core;
                    }
                } catch (\Exception $e) {
                    // Nothing to do here.
                }
            } else {
                Helper::log('Apache Solr not available', LOG_SEVERITY_ERROR);
            }
        }
        return '';
    }

    /**
     * Escape special characters in a query string
     *
     * @access public
     *
     * @param string $query: The query string
     *
     * @return string The escaped query string
     */
    public static function escapeQuery($query)
    {
        // Escape query by disallowing range and field operators
        // Permit operators: wildcard, boolean, fuzzy, proximity, boost, grouping
        // https://solr.apache.org/guide/solr/latest/query-guide/standard-query-parser.html
        return preg_replace('/(\{|}|\[|]|:|\/|\\\)/', '\\\$1', $query);
    }

    /**
     * Escape all special characters in a query string while retaining valid field queries
     *
     * @access public
     *
     * @param string $query: The query string
     * @param int $pid: The PID for the field configuration
     *
     * @return string The escaped query string
     */
    public static function escapeQueryKeepField($query, $pid)
    {
        // Is there a field query?
        if (preg_match('/^[[:alnum:]]+_[tu][su]i:\(?.*\)?$/', $query)) {
            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable('tx_dlf_metadata');

            // Get all indexed fields.
            $fields = [];
            $result = $queryBuilder
                ->select(
                    'tx_dlf_metadata.index_name AS index_name',
                    'tx_dlf_metadata.index_tokenized AS index_tokenized',
                    'tx_dlf_metadata.index_stored AS index_stored'
                )
                ->from('tx_dlf_metadata')
                ->where(
                    $queryBuilder->expr()->eq('tx_dlf_metadata.index_indexed', 1),
                    $queryBuilder->expr()->eq('tx_dlf_metadata.pid', intval($pid)),
                    $queryBuilder->expr()->orX(
                        $queryBuilder->expr()->in('tx_dlf_metadata.sys_language_uid', [-1, 0]),
                        $queryBuilder->expr()->eq('tx_dlf_metadata.l18n_parent', 0)
                    ),
                    Helper::whereExpression('tx_dlf_metadata')
                )
                ->execute();

            while ($resArray = $result->fetchAssociative()) {
                $fields[] = $resArray['index_name'] . '_' . ($resArray['index_tokenized'] ? 't' : 'u') . ($resArray['index_stored'] ? 's' : 'u') . 'i';
            }

            // Check if queried field is valid.
            $splitQuery = explode(':', $query, 2);
            if (in_array($splitQuery[0], $fields)) {
                $query = $splitQuery[0] . ':(' . self::escapeQuery(trim($splitQuery[1], '()')) . ')';
            } else {
                $query = self::escapeQuery($query);
            }
        } else {
            $query = self::escapeQuery($query);
        }
        return $query;
    }

    /**
     * Get fields for index.
     *
     * @access public
     *
     * @return array fields
     */
    public static function getFields()
    {
        if (empty(self::$fields)) {
            $conf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey);

            self::$fields['id'] = $conf['solrFieldId'];
            self::$fields['uid'] = $conf['solrFieldUid'];
            self::$fields['pid'] = $conf['solrFieldPid'];
            self::$fields['page'] = $conf['solrFieldPage'];
            self::$fields['partof'] = $conf['solrFieldPartof'];
            self::$fields['root'] = $conf['solrFieldRoot'];
            self::$fields['sid'] = $conf['solrFieldSid'];
            self::$fields['toplevel'] = $conf['solrFieldToplevel'];
            self::$fields['type'] = $conf['solrFieldType'];
            self::$fields['title'] = $conf['solrFieldTitle'];
            self::$fields['volume'] = $conf['solrFieldVolume'];
            self::$fields['date'] = $conf['solrFieldDate'];
            self::$fields['thumbnail'] = $conf['solrFieldThumbnail'];
            self::$fields['default'] = $conf['solrFieldDefault'];
            self::$fields['timestamp'] = $conf['solrFieldTimestamp'];
            self::$fields['autocomplete'] = $conf['solrFieldAutocomplete'];
            self::$fields['fulltext'] = $conf['solrFieldFulltext'];
            self::$fields['record_id'] = $conf['solrFieldRecordId'];
            self::$fields['purl'] = $conf['solrFieldPurl'];
            self::$fields['urn'] = $conf['solrFieldUrn'];
            self::$fields['location'] = $conf['solrFieldLocation'];
            self::$fields['collection'] = $conf['solrFieldCollection'];
            self::$fields['license'] = $conf['solrFieldLicense'];
            self::$fields['terms'] = $conf['solrFieldTerms'];
            self::$fields['restrictions'] = $conf['solrFieldRestrictions'];
            self::$fields['geom'] = $conf['solrFieldGeom'];
        }

        return self::$fields;
    }

    /**
     * This is a singleton class, thus instances must be created by this method
     *
     * @access public
     *
     * @param mixed $core: Name or UID of the core to load or null to get core admin endpoint
     *
     * @return \Kitodo\Dlf\Common\Solr\Solr Instance of this class
     */
    public static function getInstance($core = null)
    {
        // Get core name if UID is given.
        if (MathUtility::canBeInterpretedAsInteger($core)) {
            $core = Helper::getIndexNameFromUid($core, 'tx_dlf_solrcores');
        }
        // Check if core is set or null.
        if (
            empty($core)
            && $core !== null
        ) {
            Helper::log('Invalid core UID or name given for Apache Solr', LOG_SEVERITY_ERROR);
        }
        if (!empty($core)) {
            // Check if there is an instance in the registry already.
            if (
                is_object(self::$registry[$core])
                && self::$registry[$core] instanceof self
            ) {
                // Return singleton instance if available.
                return self::$registry[$core];
            }
        }
        // Create new instance...
        $instance = new self($core);
        // ...and save it to registry.
        if (!empty($instance->core)) {
            self::$registry[$instance->core] = $instance;
        }
        return $instance;
    }

    /**
     * Get next unused Solr core number
     *
     * @access public
     *
     * @param int $number: Number to start with
     *
     * @return int First unused core number found
     */
    public static function getNextCoreNumber($number = 0)
    {
        $number = max(intval($number), 0);
        // Check if core already exists.
        $solr = self::getInstance('dlfCore' . $number);
        if (!$solr->ready) {
            return $number;
        } else {
            return self::getNextCoreNumber($number + 1);
        }
    }

    /**
     * Sets the connection information for Solr
     *
     * @access protected
     *
     * @return void
     */
    protected function loadSolrConnectionInfo()
    {
        if (empty($this->config)) {
            $config = [];
            // Extract extension configuration.
            $conf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey);
            // Derive Solr scheme
            $config['scheme'] = empty($conf['solrHttps']) ? 'http' : 'https';
            // Derive Solr host name.
            $config['host'] = ($conf['solrHost'] ? $conf['solrHost'] : '127.0.0.1');
            // Set username and password.
            $config['username'] = $conf['solrUser'];
            $config['password'] = $conf['solrPass'];
            // Set port if not set.
            $config['port'] = MathUtility::forceIntegerInRange($conf['solrPort'], 1, 65535, 8983);
            // Trim path of slashes and (re-)add trailing slash if path not empty.
            $config['path'] = trim($conf['solrPath'], '/');
            if (!empty($config['path'])) {
                $config['path'] .= '/';
            }
            // Add "/solr" API endpoint when using Solarium <5.x
                // Todo: Remove when dropping support for Solarium 4.x
            if (!\Solarium\Client::checkMinimal('5.0.0')) {
                $config['path'] .= 'solr/';
            }
            // Set connection timeout lower than PHP's max_execution_time.
            $max_execution_time = intval(ini_get('max_execution_time')) ? : 30;
            $config['timeout'] = MathUtility::forceIntegerInRange($conf['solrTimeout'], 1, $max_execution_time, 10);
            $this->config = $config;
        }
    }

    /**
     * Processes a search request and returns the raw Apache Solr Documents.
     *
     * @access public
     *
     * @param array $parameters: Additional search parameters
     *
     * @return array The Apache Solr Documents that were fetched
     */
    public function search_raw($parameters = [])
    {
        // Set additional query parameters.
        $parameters['start'] = 0;
        $parameters['rows'] = $this->limit;
        // Calculate cache identifier.
        $cacheIdentifier = Helper::digest($this->core . print_r(array_merge($this->params, $parameters), true));
        $cache = GeneralUtility::makeInstance(CacheManager::class)->getCache('tx_dlf_solr');
        $resultSet = [];
        if (($entry = $cache->get($cacheIdentifier)) === false) {
            $selectQuery = $this->service->createSelect(array_merge($this->params, $parameters));
            $result = $this->service->select($selectQuery);
            foreach ($result as $doc) {
                $resultSet[] = $doc;
            }
            // Save value in cache.
            $cache->set($cacheIdentifier, $resultSet);
        } else {
            // Return cache hit.
            $resultSet = $entry;
        }
        return $resultSet;
    }

    /**
     * This returns $this->core via __get()
     *
     * @access protected
     *
     * @return string|null The core name of the current query endpoint or null if core admin endpoint
     */
    protected function _getCore()
    {
        return $this->core;
    }

    /**
     * This returns $this->limit via __get()
     *
     * @access protected
     *
     * @return int The max number of results
     */
    protected function _getLimit()
    {
        return $this->limit;
    }

    /**
     * This returns $this->numberOfHits via __get()
     *
     * @access protected
     *
     * @return int Total number of hits for last search
     */
    protected function _getNumberOfHits()
    {
        return $this->numberOfHits;
    }

    /**
     * This returns $this->ready via __get()
     *
     * @access protected
     *
     * @return bool Is the search instantiated successfully?
     */
    protected function _getReady()
    {
        return $this->ready;
    }

    /**
     * This returns $this->service via __get()
     *
     * @access protected
     *
     * @return \Solarium\Client Apache Solr service object
     */
    protected function _getService()
    {
        return $this->service;
    }

    /**
     * This sets $this->cPid via __set()
     *
     * @access protected
     *
     * @param int $value: The new PID for the metadata definitions
     *
     * @return void
     */
    protected function _setCPid($value)
    {
        $this->cPid = max(intval($value), 0);
    }

    /**
     * This sets $this->limit via __set()
     *
     * @access protected
     *
     * @param int $value: The max number of results
     *
     * @return void
     */
    protected function _setLimit($value)
    {
        $this->limit = max(intval($value), 0);
    }

    /**
     * This sets $this->params via __set()
     *
     * @access protected
     *
     * @param array $value: The query parameters
     *
     * @return void
     */
    protected function _setParams(array $value)
    {
        $this->params = $value;
    }

    /**
     * This magic method is called each time an invisible property is referenced from the object
     *
     * @access public
     *
     * @param string $var: Name of variable to get
     *
     * @return mixed Value of $this->$var
     */
    public function __get($var)
    {
        $method = '_get' . ucfirst($var);
        if (
            !property_exists($this, $var)
            || !method_exists($this, $method)
        ) {
            $this->logger->warning('There is no getter function for property "' . $var . '"');
            return;
        } else {
            return $this->$method();
        }
    }

    /**
     * This magic method is called each time an invisible property is checked for isset() or empty()
     *
     * @access public
     *
     * @param string $var: Name of variable to check
     *
     * @return bool true if variable is set and not empty, false otherwise
     */
    public function __isset($var)
    {
        return !empty($this->__get($var));
    }

    /**
     * This magic method is called each time an invisible property is referenced from the object
     *
     * @access public
     *
     * @param string $var: Name of variable to set
     * @param mixed $value: New value of variable
     *
     * @return void
     */
    public function __set($var, $value)
    {
        $method = '_set' . ucfirst($var);
        if (
            !property_exists($this, $var)
            || !method_exists($this, $method)
        ) {
            $this->logger->warning('There is no setter function for property "' . $var . '"');
        } else {
            $this->$method($value);
        }
    }

    /**
     * This is a singleton class, thus the constructor should be private/protected
     *
     * @access protected
     *
     * @param string|null $core: The name of the core to use or null for core admin endpoint
     *
     * @return void
     */
    protected function __construct($core)
    {
        // Get Solr connection parameters from configuration.
        $this->loadSolrConnectionInfo();
        // Configure connection adapter.
        $adapter = GeneralUtility::makeInstance(\Solarium\Core\Client\Adapter\Http::class);
            // Todo: When updating to TYPO3 >=10.x and Solarium >=6.x
            // the timeout must be set with the adapter instead of the
            // endpoint (see below).
            // $adapter->setTimeout($this->config['timeout']);
        // Configure event dispatcher.
            // Todo: When updating to TYPO3 >=10.x and Solarium >=6.x
            // we have to provide an PSR-14 Event Dispatcher instead of
            // "null".
            // $eventDispatcher = GeneralUtility::makeInstance(\TYPO3\CMS\Core\EventDispatcher\EventDispatcher::class);
        // Configure endpoint.
        $config = [
            'endpoint' => [
                'default' => [
                    'scheme' => $this->config['scheme'],
                    'host' => $this->config['host'],
                    'port' => $this->config['port'],
                    'path' => '/' . $this->config['path'],
                    'core' => $core,
                    'username' => $this->config['username'],
                    'password' => $this->config['password'],
                    'timeout' => $this->config['timeout'] // Remove when upgrading to Solarium 6.x
                ]
            ]
        ];
        // Instantiate Solarium\Client class.
        $this->service = GeneralUtility::makeInstance(\Solarium\Client::class, $config);
        $this->service->setAdapter($adapter);
            // Todo: When updating to TYPO3 >=10.x and Solarium >=6.x
            // $adapter and $eventDispatcher are mandatory arguments
            // of the \Solarium\Client constructor.
            // $this->service = GeneralUtility::makeInstance(\Solarium\Client::class, $adapter, $eventDispatcher, $config);
        // Check if connection is established.
        $query = $this->service->createCoreAdmin();
        $action = $query->createStatus();
        if ($core !== null) {
            $action->setCore($core);
        }
        $query->setAction($action);
        try {
            $response = $this->service->coreAdmin($query);
            if ($response->getWasSuccessful()) {
                // Solr is reachable, but is the core as well?
                if ($core !== null) {
                    $result = $response->getStatusResult();
                    if (
                        $result instanceof \Solarium\QueryType\Server\CoreAdmin\Result\StatusResult
                        && $result->getUptime() > 0
                    ) {
                        // Set core name.
                        $this->core = $core;
                    } else {
                        // Core not available.
                        return;
                    }
                }
                // Instantiation successful!
                $this->ready = true;
            }
        } catch (\Exception $e) {
            // Nothing to do here.
        }
    }
}
