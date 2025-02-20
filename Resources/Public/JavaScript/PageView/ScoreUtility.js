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

/**
 * Base namespace for utility functions used by the dlf module.
 *
 * @const
 */
let dlfScoreUtils;
dlfScoreUtils = dlfScoreUtils || {};

/**
 * Parse from an alto element a OpenLayers geometry object
 * @param {Element} node
 * @returns {ol.geom.Polygon|undefined}
 * @private
 */
dlfScoreUtil.parseGeometry_ = function(node) {
  var width = parseInt(node.getAttribute("lrx")) - parseInt(node.getAttribute("ulx")),
    height = parseInt(node.getAttribute("lry")) - parseInt(node.getAttribute("uly")),
    x1 = parseInt(node.getAttribute("ulx")),
    y1 = parseInt(node.getAttribute("uly")),
    x2 = x1 + width,
    y2 = y1 + height,
    coordinatesWithoutScale = [[[x1, -y1], [x2, -y1], [x2, -y2], [x1, -y2], [x1, -y1]]];

  if (isNaN(width) || isNaN(height)) {
    return undefined;
  }

  // Return geometry without rescale
  if (!dlfUtils.exists(this.image_) || !dlfUtils.exists(this.width_)) {
    return new ol.geom.Polygon(coordinatesWithoutScale);
  }

  // Rescale coordinates
  var scale = this.image_.width / this.width_;
  var offset = dlfUtils.exists(this.offset_) ? this.offset_ : 0;
  var coordinatesRescale = [];

  for (var i = 0; i < coordinatesWithoutScale[0].length; i++) {
    coordinatesRescale.push([offset + ( scale * coordinatesWithoutScale[0][i][0]),
      0 - (scale * coordinatesWithoutScale[0][i][1])]);
  };

  return new ol.geom.Polygon([coordinatesRescale]);
};

/**
 * Parse from an alto element a OpenLayers feature object ulx, uly, lrx, lry
 * @param {Element} node
 * @returns {ol.Feature}
 * @private
 */
dlfScoreUtil.parseFeatureWithGeometry_ = function(node) {
  var geometry = this.parseGeometry_(node),
    width = parseInt(node.getAttribute("lrx")) - parseInt(node.getAttribute("ulx")),
    height = parseInt(node.getAttribute("lry")) - parseInt(node.getAttribute("uly")),
    hpos = parseInt(node.getAttribute("ulx")),
    vpos = parseInt(node.getAttribute("uly")),
    type = node.nodeName.toLowerCase(),
    id = node.getAttribute("xml:id"),
    feature = new ol.Feature(geometry);

  feature.setId(id);
  feature.setProperties({
    type,
    width,
    height,
    hpos,
    vpos
  });

  return feature;
};
