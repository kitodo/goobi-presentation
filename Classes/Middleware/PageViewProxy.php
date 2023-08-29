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

namespace Kitodo\Dlf\Middleware;

use Kitodo\Dlf\Common\Helper;
use Kitodo\Dlf\Common\StdOutStream;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\Core\Http\RequestFactory;
use TYPO3\CMS\Core\Http\Response;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * Image proxy Middleware for plugin 'Page View' of the 'dlf' extension
 *
 * Supported query parameters:
 * - `url` (mandatory): The URL to be proxied
 * - `uHash` (mandatory): HMAC of the URL
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class PageViewProxy implements MiddlewareInterface
{
    /**
     * @access protected
     * @var RequestFactory
     */
    protected RequestFactory $requestFactory;

    /**
     * @access protected
     * @var array
     */
    protected array $extConf;

    /**
     * Constructs the instance
     *
     * @access public
     *
     * @return void
     */
    public function __construct()
    {
        $this->requestFactory = GeneralUtility::makeInstance(RequestFactory::class);
        $this->extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get('dlf', 'general');
    }

    /**
     * The process method of the middleware.
     *
     * @access public
     *
     * @param ServerRequestInterface $request
     * @param RequestHandlerInterface $handler
     *
     * @return ResponseInterface
     */
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $response = $handler->handle($request);
        // Get input parameters and decrypt core name.
        $parameters = $request->getQueryParams();
        // Return if not this middleware
        if (!isset($parameters['middleware']) || ($parameters['middleware'] != 'dlf/page-view-proxy')) {
            return $response;
        }

        switch ($request->getMethod()) {
            case 'OPTIONS':
                return $this->handleOptions($request);

            case 'GET':
                return $this->handleGet($request);

            case 'HEAD':
                return $this->handleHead($request);

            default:
                // 405 Method Not Allowed
                return GeneralUtility::makeInstance(Response::class)
                    ->withStatus(405);
        }
    }

    /**
     * Return a response that is derived from $response and contains CORS
     * headers to be sent to the client.
     *
     * @access protected
     *
     * @param ResponseInterface $response
     * @param ServerRequestInterface $request The incoming request.
     *
     * @return ResponseInterface
     */
    protected function withCorsResponseHeaders(
        ResponseInterface $response,
        ServerRequestInterface $request
    ): ResponseInterface {
        $origin = (string) ($request->getHeaderLine('Origin') ? : '*');

        return $response
            ->withHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD')
            ->withHeader('Access-Control-Allow-Origin', $origin)
            ->withHeader('Access-Control-Max-Age', '86400');
    }

    /**
     * Takes headers listed in $headerNames from $fromResponse, adds them to
     * $toResponse and returns the result.
     *
     * @access protected
     *
     * @param ResponseInterface $fromResponse
     * @param ResponseInterface $toResponse
     * @param array $headerNames
     *
     * @return ResponseInterface
     */
    protected function copyHeaders(
        ResponseInterface $fromResponse,
        ResponseInterface $toResponse,
        array $headerNames
    ): ResponseInterface {
        $result = $toResponse;

        foreach ($headerNames as $headerName) {
            $headerValues = $fromResponse->getHeader($headerName);
            // Don't include empty header field when not present
            if (!empty($headerValues)) {
                $result = $result->withAddedHeader($headerName, $headerValues);
            }
        }

        return $result;
    }

    /**
     * Handle an OPTIONS request.
     *
     * @access protected
     *
     * @param ServerRequestInterface $request
     *
     * @return ResponseInterface
     */
    protected function handleOptions(ServerRequestInterface $request): ResponseInterface
    {
        // 204 No Content
        $response = GeneralUtility::makeInstance(Response::class)
            ->withStatus(204);
        return $this->withCorsResponseHeaders($response, $request);
    }

    /**
     * Handle an HEAD request.
     *
     * @access protected
     *
     * @param ServerRequestInterface $request
     *
     * @return ResponseInterface
     */
    protected function handleHead(ServerRequestInterface $request): ResponseInterface
    {
        $queryParams = $request->getQueryParams();

        $url = (string) ($queryParams['url'] ?? '');
        try {
            $targetResponse = $this->requestFactory->request($url, 'HEAD', [
                'headers' => [
                    'User-Agent' => $this->extConf['userAgent'] ?? 'Kitodo.Presentation Proxy',
                ]
            ]);
        } catch (\Exception $e) {
            return new JsonResponse(['message' => 'Could not fetch resource of given URL.'], 500);
        }

        $clientResponse = GeneralUtility::makeInstance(Response::class)
            ->withStatus($targetResponse->getStatusCode());

        $clientResponse = $this->copyHeaders($targetResponse, $clientResponse, [
            'Content-Length',
            'Content-Type',
            'Last-Modified',
        ]);

        return $this->withCorsResponseHeaders($clientResponse, $request);
    }

    /**
     * Handle a GET request.
     *
     * @access protected
     *
     * @param ServerRequestInterface $request
     *
     * @return ResponseInterface
     */
    protected function handleGet(ServerRequestInterface $request): ResponseInterface
    {
        $queryParams = $request->getQueryParams();

        $url = (string) ($queryParams['url'] ?? '');
        if (!Helper::isValidHttpUrl($url)) {
            return new JsonResponse(['message' => 'Did not receive a valid URL.'], 400);
        }

        // get and verify the uHash
        $uHash = (string) ($queryParams['uHash'] ?? '');
        if (!hash_equals(GeneralUtility::hmac($url, 'PageViewProxy'), $uHash)) {
            return new JsonResponse(['message' => 'No valid uHash passed!'], 401);
        }
        try {
            $targetResponse = $this->requestFactory->request($url, 'GET', [
                'headers' => [
                    'User-Agent' => $this->extConf['userAgent'] ?? 'Kitodo.Presentation Proxy',
                ],

                // For performance, don't download content up-front. Rather, we'll
                // download and upload simultaneously.
                // https://docs.guzzlephp.org/en/6.5/request-options.html#stream
                'stream' => true,

                // Don't throw exceptions when a non-success status code is
                // received. We handle these manually.
                'http_errors' => false,
            ]);
        } catch (\Exception $e) {
            return new JsonResponse(['message' => 'Could not fetch resource of given URL.'], 500);
        }

        $body = new StdOutStream($targetResponse->getBody());

        $clientResponse = GeneralUtility::makeInstance(Response::class)
            ->withStatus($targetResponse->getStatusCode())
            ->withBody($body);

        $clientResponse = $this->copyHeaders($targetResponse, $clientResponse, [
            'Content-Length',
            'Content-Type',
            'Last-Modified',
        ]);

        return $this->withCorsResponseHeaders($clientResponse, $request);
    }
}
