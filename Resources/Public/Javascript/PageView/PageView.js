/**
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

/**
 * @TODO Trigger resize map event after fullscreen is toggled
 * @param {Object} settings
 *      {string=} div
 *      {Array.<?>} images
 *      {Array.<?>} fulltexts
 *      {Array.<?>} controls
 * @constructor
 */
var dlfViewer = function(settings){

    /**
     * The element id of the map container
     * @type {string}
     * @private
     */
    this.div = dlfUtils.exists(settings.div) ? settings.div : "tx-dlf-map";

    /**
     * Openlayers map object
     * @type {ol.Map|null}
     * @private
     */
    this.map = null;

    /**
     * Contains image information (e.g. URL, width, height)
     * @type {Array.<string>}
     * @private
     */
    this.imageUrls = dlfUtils.exists(settings.images) ? settings.images : [];

    /**
     * Contains image information (e.g. URL, width, height)
     * @type {Array.<{src: *, width: *, height: *}>}
     * @private
     */
    this.images = [];

    /**
     * Fulltext information (e.g. URL)
     * @type {Array.<string|?>}
     * @private
     */
    this.fulltexts = dlfUtils.exists(settings.fulltexts) ? settings.fulltexts : [];

    /**
     * IIIF annotation lists URLs for the current canvas
     * @type {Array.<string|?>}
     * @private
     */
    this.annotationContainers = dlfUtils.exists(settings.annotationContainers) ? settings.annotationContainers : [];

    /**
     * @type {Array.<number>}
     * @private
     */
    this.highlightFields = [];

    /**
     * @type {Object|undefined}
     * @private
     */
    this.highlightFieldParams = undefined;

    /**
     * @type {string|undefined}
     * @private
     */
     this.highlightWords = null;

    /**
     * @type {Object|undefined}
     * @private
     */
    this.imageManipulationControl = undefined;

    /**
     * @type {Object|undefined}
     * @private
     */
    this.selection = undefined;

    /**
     * @type {Object|undefined}
     * @private
     */
    this.source = undefined;

    /**
     * @type {Object|undefined}
     * @private
     */
    this.selectionLayer = undefined;

    /**
     * @type {Object|undefined}
     * @private
     */
    this.draw = undefined;

    /**
     * @type {Object|null}
     * @private
     */
    this.source = null;

    /**
     * @type {Object|null}
     * @private
     */
    this.view = null;

    /**
     * @type {Object|null}
     * @private
     */
    this.ov_view = null;

    /**
     * @type {Boolean|false}
     * @private
     */
    this.magnifierEnabled = false;

    /**
     * @type {Boolean|false}
     * @private
     */
    this.initMagnifier = false;

    /**
     * use internal proxy setting
     * @type {boolean}
     * @private
     */
    this.useInternalProxy = dlfUtils.exists(settings.useInternalProxy) ? settings.useInternalProxy : false;

    this.init(dlfUtils.exists(settings.controls) ? settings.controls : []);
};

/**
 * Methods inits and binds the custom controls to the dlfViewer. Right now that are the
 * fulltext and the image manipulation control
 *
 * @param {Array.<string>} controlNames
 */
dlfViewer.prototype.addCustomControls = function() {
    var fulltextControl = undefined,
        fulltextDownloadControl = undefined,
        annotationControl = undefined,
        imageManipulationControl = undefined,
        images = this.images;

    // Adds fulltext behavior and download only if there is fulltext available and no double page
    // behavior is active
    if (dlfUtils.isFulltextDescriptor(this.fulltexts[0]) && this.images.length === 1) {
        fulltextControl = new dlfViewerFullTextControl(this.map, this.images[0], this.fulltexts[0].url);
        fulltextDownloadControl = new dlfViewerFullTextDownloadControl(this.map, this.images[0], this.fulltexts[0].url);
    } else {
        $('#tx-dlf-tools-fulltext').remove();
    }

    if (this.annotationContainers[0] !== undefined && this.annotationContainers[0].annotationContainers !== undefined
        && this.annotationContainers[0].annotationContainers.length > 0 && this.images.length === 1) {
        // Adds annotation behavior only if there are annotations available and view is single page
        annotationControl = new DlfAnnotationControl(this.map, this.images[0], this.annotationContainers[0]);
        if (fulltextControl !== undefined) {
            $(fulltextControl).on("activate-fulltext", $.proxy(annotationControl.deactivate, annotationControl));
            $(annotationControl).on("activate-annotations", $.proxy(fulltextControl.deactivate, fulltextControl));
        }
    }
    else {
        $('#tx-dlf-tools-annotations').remove();
    }

    //
    // Add image manipulation tool if container is added.
    //
    if ($('#tx-dlf-tools-imagetools').length > 0) {

        // should be called if cors is enabled
        imageManipulationControl = new dlfViewerImageManipulationControl({
            controlTarget: $('.tx-dlf-tools-imagetools')[0],
            map: this.map,
        });

        // bind behavior of both together
        if (fulltextControl !== undefined) {
            $(imageManipulationControl).on("activate-imagemanipulation", $.proxy(fulltextControl.deactivate, fulltextControl));
            $(fulltextControl).on("activate-fulltext", $.proxy(imageManipulationControl.deactivate, imageManipulationControl));
        }
        if (annotationControl !== undefined) {
            $(imageManipulationControl).on("activate-imagemanipulation", $.proxy(annotationControl.deactivate, annotationControl));
            $(annotationControl).on("activate-annotations", $.proxy(imageManipulationControl.deactivate, imageManipulationControl));
        }

        // set on object scope
        this.imageManipulationControl = imageManipulationControl;

    }
};

/**
 * Add highlight field
 *
 * @param {Array.<number>} highlightField
 * @param {number} imageIndex
 * @param {number} width
 * @param {number} height
 *
 * @return void
 */
dlfViewer.prototype.addHighlightField = function(highlightField, imageIndex, width, height) {

    this.highlightFields.push(highlightField);

    this.highlightFieldParams = {
        index: imageIndex,
        width,
        height
    };

    if (this.map) {
        this.displayHighlightWord();
    }
};

/**
 * Creates OL3 controls
 * @param {Array.<string>} controlNames
 * @param {Array.<ol.layer.Layer>} layers
 * @return {Array.<ol.control.Control>}
 * @private
 */
dlfViewer.prototype.createControls_ = function(controlNames, layers) {

    var controls = [];

    for (var i in controlNames) {

        if (controlNames[i] !== "") {

            switch(controlNames[i]) {

                case "OverviewMap":

                    controls.push(new ol.control.OverviewMap({layers}));
                    break;

                case "ZoomPanel":

                    controls.push(new ol.control.Zoom());
                    break;

                default:

                    break;

            }
        }
    }

    return controls;
};

/**
 * Displays highlight words
 */
dlfViewer.prototype.displayHighlightWord = function(highlightWords = null) {
    if(highlightWords != null) {
        this.highlightWords = highlightWords;
    }

    if (!dlfUtils.exists(this.highlightLayer)) {

        this.highlightLayer = new ol.layer.Vector({
            'source': new ol.source.Vector(),
            'style': dlfViewerOL3Styles.wordStyle
        });

        this.map.addLayer(this.highlightLayer);
    }

    // check if highlight by coords should be activate
    if (this.highlightFields.length > 0) {
        // clear in case of old displays
        this.highlightLayer.getSource().clear();

        // create features and scale it down
        for (var i = 0; i < this.highlightFields.length; i++) {

            var field = this.highlightFields[i],
              coordinates = [[
                  [field[0], field[1]],
                  [field[2], field[1]],
                  [field[2], field[3]],
                  [field[0], field[3]],
                  [field[0], field[1]],
              ]],
              offset = this.highlightFieldParams.index === 1 ? this.images[0].width : 0;
            var feature = dlfUtils.scaleToImageSize([new ol.Feature(new ol.geom.Polygon(coordinates))],
              this.images[this.highlightFieldParams.index],
              this.highlightFieldParams.width,
              this.highlightFieldParams.height,
              offset);

            // add feature to layer and map
            this.highlightLayer.getSource().addFeatures(feature);
        }
    }

    if (dlfUtils.isFulltextDescriptor(this.fulltexts[0]) && this.images.length > 0) {
        var values = [],
            fulltextData = dlfFullTextUtils.fetchFullTextDataFromServer(this.fulltexts[0].url, this.images[0]),
            fulltextDataImageTwo = undefined;

        if(this.highlightWords != null) {
            values = decodeURIComponent(this.highlightWords).split(';');
        }

        // check if there is another image / fulltext to look for
        if (this.images.length === 2 && dlfUtils.isFulltextDescriptor(this.fulltexts[1])) {
            var image = $.extend({}, this.images[1]);
            image.width = image.width + this.images[0].width;
            fulltextDataImageTwo = dlfFullTextUtils.fetchFullTextDataFromServer(this.fulltexts[1].url, this.images[1], this.images[0].width);
        }

        var stringFeatures = fulltextDataImageTwo === undefined ? fulltextData.getStringFeatures() :
          fulltextData.getStringFeatures().concat(fulltextDataImageTwo.getStringFeatures());
        values.forEach($.proxy(function(value) {
            var features = dlfUtils.searchFeatureCollectionForCoordinates(stringFeatures, value);
            if (features !== undefined) {
                for (var i = 0; i < features.length; i++) {
                    this.highlightLayer.getSource().addFeatures([features[i]]);
                }
            }
        }, this));
    };
};

/**
 * Start the init process of loading the map, etc.
 *
 * @param {Array.<string>} controlNames
 * @private
 */
dlfViewer.prototype.init = function(controlNames) {

    if (this.imageUrls.length <= 0)
        throw new Error('Missing image source objects.');

    this.initLayer(this.imageUrls)
        .done($.proxy(function(layers){

            var controls = controlNames.length > 0 || controlNames[0] === ""
                ? this.createControls_(controlNames, layers)
                : [];
                //: [ new ol.control.MousePosition({
                //        coordinateFormat: ol.coordinate.createStringXY(4),
                //        undefinedHTML: '&nbsp;'
                //    })];

            // create map
            this.map = new ol.Map({
                layers: layers,
                target: this.div,
                controls: controls,
                interactions: [
                    new ol.interaction.DragRotate(),
                    new ol.interaction.DragPan(),
                    new ol.interaction.DragZoom(),
                    new ol.interaction.PinchRotate(),
                    new ol.interaction.PinchZoom(),
                    new ol.interaction.MouseWheelZoom(),
                    new ol.interaction.KeyboardPan(),
                    new ol.interaction.KeyboardZoom(),
                    new ol.interaction.DragRotateAndZoom()
                ],
                // necessary for proper working of the keyboard events
                keyboardEventTarget: document,
                view: dlfUtils.createOl3View(this.images),
                renderer: 'canvas'
            });

            // Position image according to user preferences
            var lon = dlfUtils.getCookie("tx-dlf-pageview-centerLon"),
              lat = dlfUtils.getCookie("tx-dlf-pageview-centerLat"),
              zoom = dlfUtils.getCookie("tx-dlf-pageview-zoomLevel");
            if (!dlfUtils.isNullEmptyUndefinedOrNoNumber(lon) && !dlfUtils.isNullEmptyUndefinedOrNoNumber(lat) && !dlfUtils.isNullEmptyUndefinedOrNoNumber(zoom)) {
                // make sure, zoom center is on viewport
                var center = this.map.getView().getCenter();
                if ((lon < (2.2 * center[0])) && (lat < (-0.2 * center[1])) && (lat > (2.2 * center[1]))) {
                    this.map.zoomTo([lon, lat], zoom);
                }
            }

            this.addCustomControls();

            // highlight word in case a highlight field is registered
            this.displayHighlightWord();

            // trigger event after all has been initialize
            $(window).trigger("map-loadend", window);

            // append listener for saving view params in case of flipping pages
            $(window).on("unload", $.proxy(function() {
                // check if image manipulation control exists and if yes deactivate it first for proper recognition of
                // the actual map view
                if (this.imageManipulationControl !== undefined && this.imageManipulationControl.isActive()) {
                    this.imageManipulationControl.deactivate();
                }

                var zoom = this.map.getZoom() !== undefined ? this.map.getZoom() : '',
                    center = this.map.getView().getCenter() !== undefined ? this.map.getView().getCenter() : ['', ''];

                // save actual map view parameters to cookie
                dlfUtils.setCookie('tx-dlf-pageview-zoomLevel', zoom);
                dlfUtils.setCookie('tx-dlf-pageview-centerLon', center[0]);
                dlfUtils.setCookie('tx-dlf-pageview-centerLat', center[1]);
            }, this));
        }, this));
        this.source = new ol.source.Vector();
        // crop selection style
        this.selection = new ol.interaction.DragBox({
            condition: ol.events.condition.noModifierKeys,
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: [0, 0, 255, 1]
                })
            })
        });

        this.initCropping();
};

/**
 * Function generate the ol3 layer objects for given image sources. Returns a promise.
 *
 * @param {Array.<{url: *, mimetype: *}>} imageSourceObjs
 * @return {jQuery.Deferred.<function(Array.<ol.layer.Layer>)>}
 * @private
 */
dlfViewer.prototype.initLayer = function(imageSourceObjs) {

    // use deferred for async behavior
    var deferredResponse = new $.Deferred(),
      /**
       * @param {Array.<{src: *, width: *, height: *}>} imageSourceData
       * @param {Array.<ol.layer.Layer>} layers
       */
      resolveCallback = $.proxy(function(imageSourceData, layers) {
            this.images = imageSourceData;
            deferredResponse.resolve(layers);
        }, this);

    dlfUtils.fetchImageData(imageSourceObjs)
      .done(function(imageSourceData) {
          resolveCallback(imageSourceData, dlfUtils.createOl3Layers(imageSourceData));
      });

    return deferredResponse;
};

dlfViewer.prototype.degreeToRadian = function (degree) {
    return degree * (Math.PI / 180);
};

dlfViewer.prototype.radianToDegree = function (radian) {
    return radian * (180 / Math.PI);
};

/**
 * activates the crop selection
 */
dlfViewer.prototype.activateSelection = function () {
    var viewerObject = this;

    // remove all features
    viewerObject.resetCropSelection();

    // add selection layer and crop interaction
    this.map.addLayer(this.selectionLayer);
    this.map.addInteraction(this.draw);
};

/**
 * reset the crop selection
 */
dlfViewer.prototype.resetCropSelection = function () {
    this.map.removeLayer(this.selectionLayer);
    this.source.clear();
    this.setNewCropDrawer(this.source);
};

/**
 * initialise crop selection
 */
dlfViewer.prototype.initCropping = function () {
    var viewerObject = this;

    var source = new ol.source.Vector({wrapX: false});

    this.selectionLayer = new ol.layer.Vector({
        source: source
    });

    value = 'LineString';
    maxPoints = 2;
    geometryFunction = function(coordinates, geometry) {
        if (!geometry) {
            geometry = new ol.geom.Polygon(null);
        }
        var start = coordinates[0];
        var end = coordinates[1];
        geometry.setCoordinates([
            [start, [start[0], end[1]], end, [end[0], start[1]], start]
        ]);

        // add to basket button
        var extent = geometry.getExtent();
        var imageExtent = viewerObject.map.getLayers().item(0).getSource().getProjection().getExtent();

        var pixel = ol.extent.getIntersection(imageExtent, extent);
        var rotation = viewerObject.map.getView().getRotation();

        // fill form with coordinates
        $('#addToBasketForm #startX').val(Math.round(pixel[0]));
        $('#addToBasketForm #startY').val(Math.round(pixel[1]));
        $('#addToBasketForm #endX').val(Math.round(pixel[2]));
        $('#addToBasketForm #endY').val(Math.round(pixel[3]));
        $('#addToBasketForm #rotation').val(Math.round(viewerObject.radianToDegree(rotation)));

        return geometry;
    };

    this.setNewCropDrawer(source);
};

/**
 * set the draw interaction for crop selection
 */
dlfViewer.prototype.setNewCropDrawer = function (source) {
    viewerObject = this;
    this.draw = new ol.interaction.Draw({
        source: source,
        type: /** @type {ol.geom.GeometryType} */ (value),
        geometryFunction: geometryFunction,
        maxPoints: maxPoints
    });

    // reset crop interaction
    this.draw.on('drawend', function (event) {
        viewerObject.map.removeInteraction(viewerObject.draw);
    });

    this.selectionLayer = new ol.layer.Vector({
        source: source
    });
};

/**
 * add magnifier map
 */
dlfViewer.prototype.addMagnifier = function (rotation) {

    //magnifier map
    var extent = [0, 0, 1000, 1000];

    var layerProj = new ol.proj.Projection({
        code: 'kitodo-image',
        units: 'pixels',
        extent: extent
    });

    this.ov_view = new ol.View({
        projection: layerProj,
        center: ol.extent.getCenter(extent),
        zoom: 3,
        rotation: rotation,
    });

    this.ov_map = new ol.Map({
        target: 'ov_map',
        view: this.ov_view,
        controls: [],
        interactions: []
    });

    this.ov_map.addLayer(this.map.getLayers().getArray()[0]);

    var mousePosition = null;
    var dlfViewer = this;
    var ov_map = this.ov_map;

    this.map.on('pointermove', function (evt) {
        mousePosition = dlfViewer.map.getEventCoordinate(evt.originalEvent);
        dlfViewer.ov_view.setCenter(mousePosition);
    });

    var adjustViews = function(sourceView, destMap) {
            var rotateDiff = sourceView.getRotation() !== destMap.getView().getRotation();
            var centerDiff = sourceView.getCenter() !== destMap.getView().getCenter();

            if (rotateDiff || centerDiff) {
                destMap.getView().rotate(sourceView.getRotation());
            }
        },
        adjustViewHandler = function(event) {
            adjustViews(event.target, ov_map);
        };

    this.map.getView().on('change:rotation', adjustViewHandler, this.map);
    adjustViews(this.map.getView(), this.ov_map);

    this.initMagnifier = true;
};

/**
 * activates the magnifier map
 */
dlfViewer.prototype.activateMagnifier = function () {
    if (!this.initMagnifier) {
        var rotation = this.map.getView().getRotation();
        this.addMagnifier(rotation);
    }

    if (!this.magnifierEnabled) {
        $('#ov_map').show();
        this.magnifierEnabled = true;
    } else {
        $('#ov_map').hide();
        this.magnifierEnabled = false;
    }
};

/**
 * @constructor
 * @extends {ol.interaction.Pointer}
 */
function Drag() {

    ol.interaction.Pointer.call(this, {
        handleDownEvent: Drag.prototype.handleDownEvent,
        handleDragEvent: Drag.prototype.handleDragEvent,
        handleMoveEvent: Drag.prototype.handleMoveEvent,
        handleUpEvent: Drag.prototype.handleUpEvent
    });

    /**
     * @type {ol.Pixel}
     * @private
     */
    this.coordinate_ = null;

    /**
     * @type {string|undefined}
     * @private
     */
    this.cursor_ = 'pointer';

    /**
     * @type {ol.Feature}
     * @private
     */
    this.feature_ = null;

    /**
     * @type {string|undefined}
     * @private
     */
    this.previousCursor_ = undefined;

};
