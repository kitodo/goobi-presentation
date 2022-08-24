'use strict';

/**
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

// Internet Explorer does not support String.prototype.endsWith
if (String.prototype.endsWith === undefined) {
    String.prototype.endsWith = function(searchString, length) {
        if (searchString === null || searchString === '' || length !== null && searchString.length > length || searchString.length > this.length) {
            return false;
        }
        length = length === null || length > this.length || length <= 0 ? this.length : length;
        var substr = this.substr(0, length);
        return substr.lastIndexOf(searchString) === length - searchString.length;
    };
}

/**
 * Base namespace for utility functions used by the dlf module.
 *
 * @const
 */
var dlfUtils;
dlfUtils = dlfUtils || {};

/**
 * @type {{ZOOMIFY: string}}
 */
dlfUtils.CUSTOM_MIMETYPE = {
    IIIF: 'application/vnd.kitodo.iiif',
    IIP: 'application/vnd.netfpx',
    ZOOMIFY: 'application/vnd.kitodo.zoomify'
};

/**
 * @type {number}
 */
dlfUtils.RUNNING_INDEX = 99999999;

/**
 * Check if arrays {@link lhs} and {@link rhs} contain exactly the same elements (compared via `===`).
 *
 * @template {T}
 * @param {T[]} lhs
 * @param {T[]} rhs
 * @returns {boolean}
 */
dlfUtils.arrayEqualsByIdentity = function (lhs, rhs) {
    if (lhs.length !== rhs.length) {
        return false;
    }

    for (let i = 0; i < lhs.length; i++) {
        if (lhs[i] !== rhs[i]) {
            return false;
        }
    }

    return true;
};

/**
 * Clone OpenLayers layer for dlfViewer (only properties used there are
 * considered).
 *
 * @param {ol.layer.Layer} layer
 * @returns {ol.layer.Layer}
 */
dlfUtils.cloneOlLayer = function (layer) {
    // Get a fresh instance of layer's class (ol.layer.Tile or ol.layer.Image)
    var LayerClass = layer.constructor;

    return new LayerClass({
        source: layer.getSource()
    });
};

/**
 * @param imageSourceObjs
 * @param {string=} origin
 * @returns {Array.<ol.layer.Layer>}
 */
dlfUtils.createOlLayers = function (imageSourceObjs, origin) {

    var widthSum = 0,
        offsetWidth = 0,
        layers = [];

    imageSourceObjs.forEach(function (imageSourceObj) {
        if (widthSum > 0) {
            // Set offset width in case of multiple images
            offsetWidth = widthSum;
        }

        //
        // Create layer
        //
        var extent = [offsetWidth, -imageSourceObj.height, imageSourceObj.width + offsetWidth, 0],
            layer = void 0;

        // OL's Zoomify source also supports IIP; we just need to make sure the url is a proper template.
        if (imageSourceObj.mimetype === dlfUtils.CUSTOM_MIMETYPE.ZOOMIFY
            || imageSourceObj.mimetype === dlfUtils.CUSTOM_MIMETYPE.IIP
        ) {
            // Create zoomify layer
            var url = imageSourceObj.src;

            if (imageSourceObj.mimetype === dlfUtils.CUSTOM_MIMETYPE.IIP
                && url.indexOf('JTL') === -1
            ) {
                url += '&JTL={z},{tileIndex}';
            }

            layer = new ol.layer.Tile({
                source: new ol.source.Zoomify({
                    url,
                    size: [imageSourceObj.width, imageSourceObj.height],
                    crossOrigin: origin,
                    extent,
                    zDirection: -1
                })
            });
        } else if (imageSourceObj.mimetype === dlfUtils.CUSTOM_MIMETYPE.IIIF) {
            var options = $.extend({
                projection: new ol.proj.Projection({
                    code: 'kitodo-image',
                    units: 'pixels',
                    extent
                }),
                crossOrigin: origin,
                extent,
                zDirection: -1
            }, imageSourceObj.iiifSourceOptions);

            layer = new ol.layer.Tile({
                source: new ol.source.IIIF(options)
            });
        } else {

            // Create static image source
            layer = new ol.layer.Image({
                source: new ol.source.ImageStatic({
                    url: imageSourceObj.src,
                    projection: new ol.proj.Projection({
                        code: 'kitodo-image',
                        units: 'pixels',
                        extent
                    }),
                    imageExtent: extent,
                    crossOrigin: origin
                })
            });
        }
        layers.push(layer);

        // Add to cumulative width
        widthSum += imageSourceObj.width;
    });

    return layers;
};

/**
 * @param {Array.<{src: *, width: *, height: *}>} images
 * @returns {ol.View}
 */
dlfUtils.createOlView = function (images) {

    //
    // Calculate map extent
    //
    var maxLonX = images.reduce(function (prev, curr) {
        return prev + curr.width;
    }, 0),
        maxLatY = images.reduce(function (prev, curr) {
        return Math.max(prev, curr.height);
    }, 0),
        extent = [0, -maxLatY, maxLonX, 0];

    // Globally define max zoom
    window.DLF_MAX_ZOOM = 5;

    // Define map projection
    var proj = new ol.proj.Projection({
        code: 'kitodo-image',
        units: 'pixels',
        extent
    });

    // Define view
    var viewParams = {
        projection: proj,
        center: ol.extent.getCenter(extent),
        zoom: 1,
        maxZoom: window.DLF_MAX_ZOOM,
        minZoom: 1,
        extent,
        constrainOnlyCenter: true,
        constrainRotation: false
    };

    return new ol.View(viewParams);
};

/**
 * Returns true if the specified value is not undefined
 * @param {?} val
 * @returns {boolean}
 */
dlfUtils.exists = function (val) {
    return val !== undefined;
};

/**
 * Get the value in {@link map} of the first key in {@link keys} that is set.
 *
 * @template T
 * @param {string[]} keys
 * @param {Record<string, T>} map
 * @returns {T}
 */
dlfUtils.findFirstSet = function (map, keys) {
    for (const fileGrp of keys) {
        if (map[fileGrp]) {
            return map[fileGrp];
        }
    }
};

/**
 * Fetch image data for given image sources.
 *
 * @param {dlf.ImageDesc[]} imageSourceObjs
 * @param {LoadingIndicator} loadingIndicator
 * @returns {JQueryStatic.Deferred}
 */
dlfUtils.fetchImageData = function (imageSourceObjs, loadingIndicator) {

    // Use deferred for async behavior
    var deferredResponse = new $.Deferred();

    /**
     * This holds information about the loading state of the images
     * @type {Array.<number>}
     */
    var imageSourceData = [],
        loadCount = 0,
        finishLoading = function finishLoading() {
        loadCount += 1;

        if (loadCount === imageSourceObjs.length) {
            deferredResponse.resolve(imageSourceData);
        }
    };

    imageSourceObjs.forEach(function (imageSourceObj, index) {
        if (imageSourceObj.mimetype === dlfUtils.CUSTOM_MIMETYPE.ZOOMIFY) {
            dlfUtils.fetchZoomifyData(imageSourceObj)
                .done(function (imageSourceDataObj) {
                    imageSourceData[index] = imageSourceDataObj;
                    finishLoading();
            });
        } else if (imageSourceObj.mimetype === dlfUtils.CUSTOM_MIMETYPE.IIIF) {
            dlfUtils.getIIIFResource(imageSourceObj)
                .done(function (imageSourceDataObj) {
                    imageSourceData[index] = imageSourceDataObj;
                      finishLoading();
            });
        } else if (imageSourceObj.mimetype === dlfUtils.CUSTOM_MIMETYPE.IIP) {
            dlfUtils.fetchIIPData(imageSourceObj)
                .done(function (imageSourceDataObj) {
                    imageSourceData[index] = imageSourceDataObj;
                    finishLoading();
            });
        } else {
            // In the worse case expect static image file
            dlfUtils.fetchStaticImageData(imageSourceObj, loadingIndicator)
                .done(function (imageSourceDataObj) {
                    imageSourceData[index] = imageSourceDataObj;
                    finishLoading();
            });
        }
    });

    return deferredResponse;
};


/**
 * Fetches the image data for static images source.
 *
 * @param {dlf.ImageDesc} imageSourceObj
 * @param {LoadingIndicator} loadingIndicator
 * @returns {JQueryStatic.Deferred}
 */
dlfUtils.fetchStaticImageData = function (imageSourceObj, loadingIndicator) {
    // Load the image while trying to reconcile the following constraints:
    //
    // - Determine width/height of the image before passing it to OpenLayers.
    //   -> This is used in `createOlLayers` to calculate the image extent.
    //
    // - Pass a URL to OpenLayers.
    //   -> OL apparently won't let us pass the Image object directly.
    //      ("imageLoadFunction" wants us to modify a given image object as well.)
    //
    // - Avoid duplicate image loading.
    //   -> When we just pass the original URL to OL, the image may be loaded twice depending on browser cache behavior.
    //   -> This constraint may be violated in a non-CORS or mixed content scenario.
    //
    // - Don't fail in non-CORS or mixed content scenarios.
    //   -> When loading the image into a Blob (via XHR),
    //      a) the image becomes active content (which is blocked in a mixed context), and
    //      b) we now "read" instead of merely "embed" the image (which is blocked in non-CORS scenarios).
    //
    // - Don't fail when the CSP rejects "blob:" URLs.
    //   -> Fall back to a "data:" URL.
    //
    // TODO: Revisit this. Perhaps we find a way to pass the Image directly to OpenLayers.
    //       Even so, loading via XHR is beneficial in that it allows implementing a loading indicator.

    // Use deferred for async behavior
    var deferredResponse = new $.Deferred();
    var imageKey = imageSourceObj.url;

    var loadFailed = function () {
        loadingIndicator.done(imageKey);
        deferredResponse.reject();
    };

    /**
     *
     * @param {string | Blob} src
     * @param {string} mimetype
     */
    var makeImage = function (src, mimetype) {
        var image = new Image();
        image.onload = function () {
            loadingIndicator.done(imageKey);

            var imageDataObj = {
                src: this.src,
                mimetype,
                width: this.width,
                height: this.height
            };

            deferredResponse.resolve(imageDataObj);
        };
        if (src instanceof Blob) {
            var objectUrl = URL.createObjectURL(src);

            image.onerror = function () {
                URL.revokeObjectURL(objectUrl);

                // CSP rejects "blob:" URL? Try converting to "data:" URL.
                var reader = new FileReader();
                reader.onload = function () {
                    // Don't get stuck in a retry loop if there's another error
                    // (such as broken image or unsupported MIME type).
                    image.onerror = loadFailed;
                    image.src = reader.result;
                };
                reader.onerror = loadFailed;
                reader.readAsDataURL(src);
            };
            image.src = objectUrl;
        } else {
            image.onerror = loadFailed;
            image.src = src;
        }
    };

    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onprogress = function (e) {
        if (e.lengthComputable) {
            loadingIndicator.progress(imageKey, e.loaded, e.total);
        } else {
            loadingIndicator.indeterminate(imageKey);
        }
    };
    xhr.onload = function () {
        if (200 <= xhr.status && xhr.status < 300) {
            var blob = xhr.response;
            makeImage(blob, imageSourceObj.mimetype);
        } else {
            loadFailed();
        }
    };
    xhr.onerror = function () {
        // Mixed content or bad CORS headers? Try again using passive content.
        loadingIndicator.indeterminate(imageKey);
        makeImage(imageSourceObj.url, imageSourceObj.mimetype);
    };
    xhr.open('GET', imageSourceObj.url);
    xhr.send();

    return deferredResponse;
};

/**
 * @param imageSourceObj
 * @returns {JQueryStatic.Deferred}
 */
dlfUtils.getIIIFResource = function getIIIFResource(imageSourceObj) {

    var deferredResponse = new $.Deferred();
    var type = 'GET';
    $.ajax({
        url: dlfViewerSource.IIIF.getMetdadataURL(imageSourceObj.url),
        type,
        dataType: 'json'
    }).done(cb);

    function cb(data) {
        var format = new ol.format.IIIFInfo(data);
        var options = format.getTileSourceOptions();

        if (options === undefined || options.version === undefined) {
            deferredResponse.reject();
        } else {
            deferredResponse.resolve({
                mimetype: dlfUtils.CUSTOM_MIMETYPE.IIIF,
                width: options.size[0],
                height: options.size[1],
                iiifSourceOptions: options
            });
        }
    }

    return deferredResponse;
};

/**
 * Fetches the image data for iip images source.
 *
 * @param {dlf.ImageDesc} imageSourceObj
 * @returns {JQueryStatic.Deferred}
 */
dlfUtils.fetchIIPData = function (imageSourceObj) {

    // Use deferred for async behavior
    var deferredResponse = new $.Deferred();

    $.ajax({
        url: dlfViewerSource.IIP.getMetdadataURL(imageSourceObj.url) //'http://localhost:8000/fcgi-bin/iipsrv.fcgi?FIF=F4713/HD7.tif&obj=IIP,1.0&obj=Max-size&obj=Tile-size&obj=Resolution-number',
    }).done(cb);
    function cb(response, type) {
        if (type !== 'success') {
            throw new Error('Problems while fetching ImageProperties.xml');
        }

        var imageDataObj = $.extend({
            src: imageSourceObj.url,
            mimetype: imageSourceObj.mimetype
        }, dlfViewerSource.IIP.parseMetadata(response));

        deferredResponse.resolve(imageDataObj);
    }

    return deferredResponse;
};

/**
 * Fetch image data for zoomify source.
 *
 * @param {dlf.ImageDesc} imageSourceObj
 * @returns {JQueryStatic.Deferred}
 */
dlfUtils.fetchZoomifyData = function (imageSourceObj) {

    // Use deferred for async behavior
    var deferredResponse = new $.Deferred();

    $.ajax({
        url: imageSourceObj.url
    }).done(cb);
    function cb(response, type) {
        if (type !== 'success') {
            throw new Error('Problems while fetching ImageProperties.xml');
        }

        var properties = $(response).find('IMAGE_PROPERTIES');

        var imageDataObj = {
            src: imageSourceObj.url.substring(0, imageSourceObj.url.lastIndexOf("/") + 1),
            width: parseInt(properties.attr('WIDTH')),
            height: parseInt(properties.attr('HEIGHT')),
            tilesize: parseInt(properties.attr('TILESIZE')),
            mimetype: imageSourceObj.mimetype
        };

        deferredResponse.resolve(imageDataObj);
    }

    return deferredResponse;
};

/**
 * @param {string} name Name of the cookie
 * @returns {string|null} Value of the cookie
 */
dlfUtils.getCookie = function (name) {

    var results = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");

    if (results) {

        return decodeURI(results[2]);
    } else {

        return null;
    }
};

/**
 * Returns url parameters
 * @returns {string|null}
 */
dlfUtils.getUrlParam = function (param) {
    if (Object.prototype.hasOwnProperty.call(location, 'search')) {
        const urlParams = new URLSearchParams(location.search);
        return urlParams.get(param);
    }
    return null;
};

/**
 * Returns true if the specified value is null.
 * @param {?} val
 * @returns {boolean}
 */
dlfUtils.isNull = function (val) {
    return val === null;
};

/**
 * Returns true if the specified value is null, empty or undefined.
 * @param {?} val
 * @returns {boolean}
 */
dlfUtils.isNullEmptyUndefinedOrNoNumber = function (val) {
    return val === null || val === undefined || val === '' || isNaN(val);
};

/**
 * Checks if {@link obj} is a valid object describing the location of a fulltext
 * @see PageView::getFulltext in PageView.php
 *
 * @param {any} obj The object to test.
 * @returns {obj is dlf.FulltextDesc}
 */
dlfUtils.isFulltextDescriptor = function (obj) {
    return (
        typeof obj === 'object'
        && obj !== null
        && 'url' in obj
        && obj.url !== ''
    );
};

/**
 * @param {Element | null} element
 * @returns {Object}
 */
dlfUtils.parseDataDic = function (element) {
    var dataDicString = $('html').find(element).data('dic') || '',
        dataDicRecords = dataDicString.split(';'),
        dataDic = {};

    for (var i = 0, ii = dataDicRecords.length; i < ii; i++) {
        var key = dataDicRecords[i].split(':')[0],
            value = dataDicRecords[i].split(':')[1];
        dataDic[key] = value;
    }

    return dataDic;
};

/**
 * Set a cookie value
 *
 * @param {string} name The key of the value
 * @param {?} value The value to save
 * @param {string} samesite Sets the SameSite attribute: lax, strict or none
 *
 */
dlfUtils.setCookie = function (name, value, samesite) {
    switch(samesite) {
        case "lax":
        case "strict":
            break;
        case "none":
            samesite+= ";secure"
            break;
        default:
            samesite = "lax"
    }

    document.cookie = name + "=" + decodeURI(value) + "; path=/" + "; SameSite=" + samesite;
};

/**
 * Scales down the given features geometries.
 * As a further improvement this function adds a unique ID to every feature.
 * @param {Array.<ol.Feature>} features
 * @param {Object} imageObj
 * @param {number} width
 * @param {number} height
 * @param {number=} optOffset
 * @deprecated
 * @returns {Array.<ol.Feature>}
 */
dlfUtils.scaleToImageSize = function (features, imageObj, width, height, optOffset) {

    // Update size / scale settings of imageObj
    var image = void 0;
    if (width && height) {

        image = {
            'width': width,
            'height': height,
            'scale': imageObj.width / width
        };
    }

    if (image === undefined) {
        return [];
    }

    var scale = image.scale,
        offset = optOffset !== undefined ? optOffset : 0;

    // Do rescaling and set an ID
    for (var i in features) {

        if (features.hasOwnProperty(i)) {
            var oldCoordinates = features[i].getGeometry().getCoordinates()[0],
                newCoordinates = [];

            for (var j = 0; j < oldCoordinates.length; j++) {
                newCoordinates.push(
                  [offset + scale * oldCoordinates[j][0], 0 - scale * oldCoordinates[j][1]]);
            }

            features[i].setGeometry(new ol.geom.Polygon([newCoordinates]));

            // Set index
            dlfUtils.RUNNING_INDEX += 1;
            features[i].setId('' + dlfUtils.RUNNING_INDEX);
        }
    }

    return features;
};

/**
 * Search a feature collection for a feature with the given coordinates
 * @param {Array.<ol.Feature>} featureCollection
 * @param {string} coordinates
 * @returns {Array.<ol.Feature>|undefined}
 */
dlfUtils.searchFeatureCollectionForCoordinates = function (featureCollection, coordinates) {
    var features = [];
    featureCollection.forEach(function (ft) {
        if (ft.values_.fulltext !== undefined) {
            if (ft.values_.fulltext.includes(coordinates)) {
                features.push(ft);
            }
        }
    });
    return features.length > 0 ? features : undefined;
};
