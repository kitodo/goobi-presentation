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
 * This is necessary to support the scrolling of the element into the viewport
 * in case of text hover on the map.
 *
 * @param elem
 * @param speed
 * @returns {jQuery}
 */
jQuery.fn.scrollTo = function(elem, speed) {
    var manualOffsetTop = $(elem).parent().height() / 2;
    $(this).animate({
        scrollTop:  $(this).scrollTop() - $(this).offset().top + $(elem).offset().top - manualOffsetTop
    }, speed === undefined ? 1000 : speed);
    return this;
};

/**
 * Represents segments on the fulltext plane that are addressable by coordinate.
 *
 * This assumes that the segments are rectangles parallel to the page.
 */
var dlfFulltextSegments = function () {
    /**
     * @type {{ feature: ol.Feature; extent: ol.Extent }}
     * @private
     */
    this.segments_ = [];
};

/**
 * Add {@link features} to the list of segments.
 *
 * @param {ol.Feature[]} features
 */
dlfFulltextSegments.prototype.populate = function (features) {
    for (var i = 0; i < features.length; i++) {
        var feature = features[i];

        this.segments_.push({
            feature,
            extent: feature.getGeometry().getExtent()
        });
    }
};

/**
 * Returns the feature at a given {@link coordinate}, or `undefined` if no such feature is found.
 *
 * @param {ol.Coordinate} coordinate
 * @returns {ol.Feature | undefined}
 */
dlfFulltextSegments.prototype.coordinateToFeature = function (coordinate) {
    for (var i = 0; i < this.segments_.length; i++) {
        var segment = this.segments_[i];
        if (ol.extent.containsCoordinate(segment.extent, coordinate)) {
            return segment.feature;
        }
    }
};

/**
 * Encapsulates especially the fulltext behavior
 * @constructor
 * @param {ol.Map} map
 */
var dlfViewerFullTextControl = function(map) {

    /**
     * @private
     * @type {ol.Map}
     */
    this.map = map;

    /**
     * @type {Object}
     * @private
     */
    this.dic = $('#tx-dlf-tools-fulltext').length > 0 && $('#tx-dlf-tools-fulltext').data('dic') ?
        dlfUtils.parseDataDic($('#tx-dlf-tools-fulltext')) :
        {
            'fulltext':'Fulltext',
            'fulltext-loading':'Loading full text...',
            'fulltext-on':'Activate Fulltext',
            'fulltext-off':'Deactivate Fulltext',
            'activate-full-text-initially':'0',
            'full-text-scroll-element':'#tx-dlf-fulltextselection'};

    /**
     * @private
     * @type {boolean}
     */
    this.isActive = false;

    /**
     * @type {number}
     * @private
     */
    this.activateFullTextInitially = this.dic['activate-full-text-initially'] === "1" ? 1 : 0;

    /**
     * @type {string}
     * @private
     */
    let regex = /[^A-Za-z0-9\.\-\#\s_]/g;
    let fullTextScrollElementUnChecked = this.dic['full-text-scroll-element'];
    if (regex.fullTextScrollElementUnChecked) {
        this.fullTextScrollElement = "";
    } else {
        this.fullTextScrollElement = fullTextScrollElementUnChecked;
    }

    /**
     * @type {Object}
     * @private
     */
    this.layers_ = {
        textblock: new ol.layer.Vector({
            'source': new ol.source.Vector(),
            'style': dlfViewerOLStyles.defaultStyle()
        }),
        textline: new ol.layer.Vector({
            'source': new ol.source.Vector(),
            'style': dlfViewerOLStyles.invisibleStyle()
        }),
        select: new ol.layer.Vector({
            'source': new ol.source.Vector(),
            'style': dlfViewerOLStyles.selectStyle()
        }),
        hoverTextblock: new ol.layer.Vector({
            'source': new ol.source.Vector(),
            'style': dlfViewerOLStyles.hoverStyle()
        }),
        hoverTextline: new ol.layer.Vector({
            'source': new ol.source.Vector(),
            'style': dlfViewerOLStyles.textlineStyle()
        })
    };

    /**
     * @private
     */
    this.textblockFeatures_ = undefined;

    /**
     * @type {ol.Feature}
     * @private
     */
    this.selectedFeature_ = undefined;

    /**
     * @type {ol.Feature[] | undefined}
     * @private
     */
    this.lastRenderedFeatures_ = undefined;

    /**
     * @type {Array}
     * @private
     */
     this.positions = {};


    /**
     * @type {dlfFulltextSegments}
     * @private
     */
    this.textlines_ = new dlfFulltextSegments();

    /**
     * @type {dlfFulltextSegments}
     * @private
     */
    this.textblocks_ = new dlfFulltextSegments();

    /**
     * @type {Object}
     * @private
     */
    this.handlers_ = {
        // On some systems in Firefox, the call to forEachFeatureAtPixel takes very long when no feature is found.
        // For now, we thus replace this with manual bounds checking in dlfFulltextSegments.
        //
        // Inspiration from https://stackoverflow.com/a/47101658
        // Issues:
        // - https://github.com/openlayers/openlayers/issues/4232
        // - https://github.com/openlayers/openlayers/issues/8592#issuecomment-419817607
        // - https://stackoverflow.com/questions/45710306/firefox-very-slow-with-foreachfeatureatpixel
        // - https://stackoverflow.com/questions/33246093/very-slow-hover-interactions-in-openlayers-3-with-any-browser-except-chrome
        mapClick: $.proxy(function(event) {
                // the click handler adds the clicked feature to a
                // select layer which could be used to create a highlight
                // effect on the map

                var mouseCoordinate = this.map.getCoordinateFromPixel(event['pixel']);
                var feature = this.textblocks_.coordinateToFeature(mouseCoordinate);

                // deselect all
                if (feature === undefined) {
                    this.layers_.select.getSource().clear();
                    this.selectedFeature_ = undefined;
                    this.showFulltext(this.textblockFeatures_);
                    return;
                }

                this.handleLayersForClick(feature);

                this.selectedFeature_ = feature;


                if (dlfUtils.exists(feature)) {
                    this.showFulltext([feature]);
                }

            },
        this),
        mapHover: $.proxy(function(event) {
                // hover in case of dragging
                if (event['dragging']) {
                    return;
                }

                var hoverSourceTextblock_ = this.layers_.hoverTextblock.getSource(),
                    hoverSourceTextline_ = this.layers_.hoverTextline.getSource(),
                    selectSource_ = this.layers_.select.getSource(),
                    mouseCoordinate = this.map.getCoordinateFromPixel(event['pixel']),
                    textblockFeature = this.textblocks_.coordinateToFeature(mouseCoordinate),
                    textlineFeature = this.textlines_.coordinateToFeature(mouseCoordinate);

                this.handleTextBlockElements(textblockFeature, selectSource_, hoverSourceTextblock_);
                this.handleTextLineElements(textlineFeature, hoverSourceTextline_);
            },
        this)
    };

    $('html').find(this.fullTextScrollElement).text(this.dic['fulltext-loading']);

    this.changeActiveBehaviour();
};

/**
 * @param {FullTextFeature} fulltextData
 */
dlfViewerFullTextControl.prototype.loadFulltextData = function (fulltextData) {
    // remove previously inserted features
    this.layers_.textblock.getSource().clear();
    this.layers_.textline.getSource().clear();
    this.layers_.select.getSource().clear();
    this.textblocks_ = new dlfFulltextSegments();
    this.textlines_ = new dlfFulltextSegments();

    // add features to fulltext layer
    this.textblockFeatures_ = fulltextData.getTextblocks();
    this.layers_.textblock.getSource().addFeatures(this.textblockFeatures_);
    this.textblocks_.populate(this.textblockFeatures_);

    const textlineFeatures = fulltextData.getTextlines();
    this.layers_.textline.getSource().addFeatures(textlineFeatures);
    this.textlines_.populate(textlineFeatures);

    // add first feature of textBlockFeatures to map
    if (this.textblockFeatures_.length > 0) {
        this.layers_.select.getSource().addFeature(this.textblockFeatures_[0]);
        this.selectedFeature_ = this.textblockFeatures_[0];

        // If the control is *not* yet active, the fulltext is instead rendered on activation.
        if (this.isActive) {
            this.showFulltext(this.textblockFeatures_);
            this.enableFulltextSelect();
        }
    }
};

/**
 * Add active / deactive behavior in case of click on control depending if the full text should be activated initially.
 */
dlfViewerFullTextControl.prototype.changeActiveBehaviour = function() {
    if (this.activateFullTextInitially === 1) {
        this.addActiveBehaviourForSwitchOn();
    } else {
        this.addActiveBehaviourForSwitchOff();
    }
};

dlfViewerFullTextControl.prototype.addActiveBehaviourForSwitchOn = function() {
    var anchorEl = $('#tx-dlf-tools-fulltext');
    if (anchorEl.length > 0){
        var toogleFulltext = $.proxy(function(event) {
            event.preventDefault();

            this.activateFullTextInitially = 0;

            if ($(event.target).hasClass('active')) {
                this.deactivate();
                return;
            }

            this.activate();
        }, this);

        anchorEl.on('click', toogleFulltext);
        anchorEl.on('touchstart', toogleFulltext);
    }

    // set initial title of fulltext element
    $("#tx-dlf-tools-fulltext")
        .text(this.dic['fulltext'])
        .attr('title', this.dic['fulltext']);

    this.activate();
};

dlfViewerFullTextControl.prototype.addActiveBehaviourForSwitchOff = function() {
    var anchorEl = $('#tx-dlf-tools-fulltext');
    if (anchorEl.length > 0){
        var toogleFulltext = $.proxy(function(event) {
            event.preventDefault();

            if ($(event.target).hasClass('active')) {
                this.deactivate();
                return;
            }

            this.activate();
        }, this);

        anchorEl.on('click', toogleFulltext);
        anchorEl.on('touchstart', toogleFulltext);
    }

    // set initial title of fulltext element
    $("#tx-dlf-tools-fulltext")
        .text(this.dic['fulltext-on'])
        .attr('title', this.dic['fulltext-on']);

    // if fulltext is activated via cookie then run activation method
    if (dlfUtils.getCookie("tx-dlf-pageview-fulltext-select") === 'enabled') {
        // activate the fulltext behavior
        this.activate();
    }
};

/**
 * Recalculate position of text lines if full text container was resized
 */
dlfViewerFullTextControl.prototype.onResize = function() {
    if (this.element != undefined && this.element.css('width') != this.lastHeight) {
        this.lastHeight = this.element.css('width');
        this.calculatePositions();
    }
};

/**
 * Calculate positions of text lines for scrolling
 */
dlfViewerFullTextControl.prototype.calculatePositions = function() {
    this.positions.length = 0;

    let texts = $('html').find(this.fullTextScrollElement).children('span.textline');
    // check if fulltext exists for this page
    if (texts.length > 0) {
        let offset = $('#' + texts[0].id).position().top;

        for(let text of texts) {
            let pos = $('#' + text.id).position().top;
            this.positions[text.id] = pos - offset;
        }
    }
};

/**
 * Handle layers for click
 * @param {ol.Feature|undefined} feature
 */
dlfViewerFullTextControl.prototype.handleLayersForClick = function(feature) {
    // highlight features
    if (this.selectedFeature_) {
        // remove old clicks
        this.layers_.select.getSource().removeFeature(this.selectedFeature_);
    }

    if (feature) {
        // remove hover for preventing an adding of styles
        this.layers_.hoverTextblock.getSource().clear();

        // add feature
        this.layers_.select.getSource().addFeature(feature);
    }
};

/**
 * Handle TextBlock elements
 * @param {ol.Feature|undefined} textblockFeature
 * @param {ol.Feature|undefined} selectSource_
 * @param {any} hoverSourceTextblock_
 */
dlfViewerFullTextControl.prototype.handleTextBlockElements = function(textblockFeature, selectSource_, hoverSourceTextblock_) {
    var activeSelectTextBlockEl_ = dlfFullTextUtils.getFeature(selectSource_),
        activeHoverTextBlockEl_ = dlfFullTextUtils.getFeature(hoverSourceTextblock_),
        isFeatureEqualSelectFeature_ = dlfFullTextUtils.isFeatureEqual(activeSelectTextBlockEl_, textblockFeature),
        isFeatureEqualToOldHoverFeature_ = dlfFullTextUtils.isFeatureEqual(activeHoverTextBlockEl_);

    if (!isFeatureEqualToOldHoverFeature_ && !isFeatureEqualSelectFeature_) {
        // remove old textblock hover features
        hoverSourceTextblock_.clear();

        if (textblockFeature) {
            // add textblock feature to hover
            hoverSourceTextblock_.addFeature(textblockFeature);
        }
    }
};

/**
 * Handle TextLine elements
 * @param {ol.Feature|undefined} textlineFeature
 * @param {any} hoverSourceTextline_
 */
dlfViewerFullTextControl.prototype.handleTextLineElements = function(textlineFeature, hoverSourceTextline_) {
    var activeHoverTextBlockEl_ = dlfFullTextUtils.getFeature(hoverSourceTextline_),
        isFeatureEqualToOldHoverFeature_ = dlfFullTextUtils.isFeatureEqual(activeHoverTextBlockEl_, textlineFeature);

    if (!isFeatureEqualToOldHoverFeature_) {
        this.removeHighlightEffect(activeHoverTextBlockEl_, hoverSourceTextline_);
        this.addHighlightEffect(textlineFeature, hoverSourceTextline_);
    }
};

/**
 * Remove highlight effect from full text view
 * @param {ol.Feature|undefined} activeHoverTextBlockEl_
 * @param {any} hoverSourceTextline_
 */
dlfViewerFullTextControl.prototype.removeHighlightEffect = function(activeHoverTextBlockEl_, hoverSourceTextline_) {
    if (activeHoverTextBlockEl_) {
        var oldTargetElem = $('#' + activeHoverTextBlockEl_.getId());

        if (oldTargetElem.hasClass('highlight') ) {
            oldTargetElem.removeClass('highlight');
        }

        // remove old textline hover features
        hoverSourceTextline_.clear();
    }
};

/**
 * Add highlight effect from full text view
 * @param {ol.Feature|undefined} textlineFeature
 * @param {any} hoverSourceTextline_
 */
dlfViewerFullTextControl.prototype.addHighlightEffect = function(textlineFeature, hoverSourceTextline_) {
    if (textlineFeature) {
        var targetElem = $('#' + textlineFeature.getId());

        if (targetElem.length > 0 && !targetElem.hasClass('highlight')) {
            targetElem.addClass('highlight');
            this.onResize();
            setTimeout(this.scrollToText, 1000, targetElem, this.fullTextScrollElement, this.positions);
            hoverSourceTextline_.addFeature(textlineFeature);
        }
    }
};

/**
 * Scroll to full text element if it is highlighted
 * @param {any} element
 * @param {string} fullTextScrollElement
 */
dlfViewerFullTextControl.prototype.scrollToText = function(element, fullTextScrollElement, positions) {
    if (element.hasClass('highlight')) {
        $(fullTextScrollElement).animate({
            scrollTop: positions[element[0].id]
        }, 500);
    }
};

/**
 * Activate Fulltext Features
 */
dlfViewerFullTextControl.prototype.activate = function() {

    var controlEl = $('#tx-dlf-tools-fulltext');

    this.showFulltext(this.textblockFeatures_);

    // now activate the fulltext overlay and map behavior
    this.enableFulltextSelect();
    dlfUtils.setCookie("tx-dlf-pageview-fulltext-select", 'enabled', "lax");
    $(controlEl).addClass('active');
    this.isActive = true;

    // trigger event
    $(this).trigger("activate-fulltext", this);
};

/**
 * Deactivate Fulltext Features
 */
dlfViewerFullTextControl.prototype.deactivate = function() {

    var controlEl = $('#tx-dlf-tools-fulltext');

    // deactivate fulltext
    this.disableFulltextSelect();
    dlfUtils.setCookie("tx-dlf-pageview-fulltext-select", 'disabled', "lax");
    $(controlEl).removeClass('active');
    this.isActive = false;

    // trigger event
    $(this).trigger("deactivate-fulltext", this);
};

/**
 * Disable Fulltext Features
 *
 * @return void
 */
dlfViewerFullTextControl.prototype.disableFulltextSelect = function() {

    // register event listeners
    this.map.un('click', this.handlers_.mapClick);
    this.map.un('pointermove', this.handlers_.mapHover);

    // remove layers
    for (var key in this.layers_) {
        if (this.layers_.hasOwnProperty(key)) {
            this.map.removeLayer(this.layers_[String(key)]);
        }
    }

    var className = 'fulltext-visible';
    $("#tx-dlf-tools-fulltext").removeClass(className);

    if(this.activateFullTextInitially === 0) {
        $("#tx-dlf-tools-fulltext")
        .text(this.dic['fulltext-on'])
        .attr('title', this.dic['fulltext-on']);
    }

    $('html').find(this.fullTextScrollElement).removeClass(className);
    $('html').find(this.fullTextScrollElement).hide();

    $('body').removeClass(className);

};

/**
 * Activate Fulltext Features
 */
dlfViewerFullTextControl.prototype.enableFulltextSelect = function() {

    // register event listeners
    this.map.on('click', this.handlers_.mapClick);
    this.map.on('pointermove', this.handlers_.mapHover);

    // add layers to map
    for (var key in this.layers_) {
        if (this.layers_.hasOwnProperty(key)) {
            this.map.addLayer(this.layers_[String(key)]);
        }
    }

    // show fulltext container
    var className = 'fulltext-visible';
    $("#tx-dlf-tools-fulltext").addClass(className);

    if(this.activateFullTextInitially=== 0) {
        $("#tx-dlf-tools-fulltext")
        .text(this.dic['fulltext-off'])
        .attr('title', this.dic['fulltext-off']);
    }

    $('html').find(this.fullTextScrollElement).addClass(className);
    $('html').find(this.fullTextScrollElement).show();
    $('body').addClass(className);
};

/**
 * Template elements to be used via cloneNode when rendering fulltext.
 */
var dlfTmplFulltext = {
    word: document.createElement('span'),
    textline: document.createElement('span'),
    space: document.createElement('span'),
};

dlfTmplFulltext.textline.className = "textline";
dlfTmplFulltext.space.className = "sp";

/**
 * Show full text
 *
 * @param {Array.<ol.Feature>|undefined} features
 */
dlfViewerFullTextControl.prototype.showFulltext = function(features) {
    if (features === undefined) {
        return;
    }

    // Don't rerender when it's the same features as last time
    if (this.lastRenderedFeatures_ !== undefined
        && dlfUtils.arrayEqualsByIdentity(features, this.lastRenderedFeatures_)
    ) {
        return;
    }

    // in getElementById no '#' is necessary / allowed at the beginning
    // of the string. Therefor remove '#' if present
    let fullTextScrollElementId = this.fullTextScrollElement;
    if (fullTextScrollElementId.substr(0,1) === '#') {
        fullTextScrollElementId = fullTextScrollElementId.substr(1);
    }
    var target = document.getElementById(fullTextScrollElementId);
    if (target !== null) {
        target.innerHTML = "";
        for (var feature of features) {
            var textLines = feature.get('textlines');
            for (var textLine of textLines) {
                var textLineSpan = this.getTextLineSpan(textLine);
                target.append(textLineSpan);
            }
            target.append(document.createElement('br'), document.createElement('br'));
        }

        this.calculatePositions();
        this.lastRenderedFeatures_ = features;
    }
};

/**
 * Append text line span
 *
 * @param {Object} textLine
 */
dlfViewerFullTextControl.prototype.getTextLineSpan = function(textLine) {
    var textLineSpan = dlfTmplFulltext.textline.cloneNode();
    textLineSpan.id = textLine.getId();

    var content = textLine.get('content');

    for (var item of content) {
        textLineSpan.append(this.getItemForTextLineSpan(item));
    }

    // clone space only if last element is not a hyphen
    if (content[content.length - 1].get('type') != 'hyp') {
        textLineSpan.append(dlfTmplFulltext.space.cloneNode());
    }

    return textLineSpan;
};

/**
 * Get item with id for string elements and without id
 * for spaces or text lines.
 *
 * @param {Object} item
 *
 * @return {HTMLElement}
 */
dlfViewerFullTextControl.prototype.getItemForTextLineSpan = function(item) {
    var type = item.get('type');
    var span = dlfTmplFulltext.word.cloneNode();
    span.className = type;
    if (type === 'string') {
        span.id = item.getId();
    }

    var spanText = item.get('fulltext');
    var spanTextLines = spanText.split(/\n/g);
    for (const [i, spanTextLine] of spanTextLines.entries()) {
        span.append(document.createTextNode(spanTextLine));
        if (i < spanTextLines.length - 1) {
            span.append(document.createElement('br'));
        }
    }

    return span;
};
