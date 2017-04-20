/**
* Copyright 2016, GeoSolutions Sas.
* All rights reserved.
*
* This source code is licensed under the BSD-style license found in the
* LICENSE file in the root directory of this source tree.
*/

const {createSelector} = require('reselect');

const contextLayersSelector = (state) => (state.layers && state.layers.flat && state.layers.flat.filter((layer) => layer.hasOwnProperty('active')) || []);
let activeLayerSelector = (state) => (state.layers && state.layers.flat ? (state.layers.flat.filter((layer) => layer.hasOwnProperty('active') && layer.active === true) || [null])[0] : null);
const lhtac = createSelector(
    [contextLayersSelector, activeLayerSelector],
    (contextLayers, activeLayer) => ({
        contextLayers,
        activeLayer,
        filterActive: (activeLayer && activeLayer.params && activeLayer.params.cql_filter
          && activeLayer.params.cql_filter !== "INCLUDE") ? true : false
        })
);

module.exports = lhtac;
