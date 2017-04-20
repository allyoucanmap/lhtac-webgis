/**
 * Copyright 2016, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const {connect} = require('react-redux');

const {Glyphicon, Alert} = require('react-bootstrap');

const FilterUtils = require('../../MapStore2/web/client/utils/FilterUtils');

const Spinner = require('react-spinkit');
const {createSelector} = require('reselect');

const {
    changeDrawingStatus
} = require('../../MapStore2/web/client/actions/draw');
const {
    highlightStatus
} = require('../../MapStore2/web/client/actions/highlight');
const {
    loadFeatures,
    featureSelectorError} = require('../actions/featureselector');
const {
    addLayer,
    changeLayerProperties
} = require('../../MapStore2/web/client/actions/layers');

const lhtac = require('../selectors/lhtac');

const FeatureSelector = React.createClass({
    propTypes: {
        maxSelectableFeatures: React.PropTypes.number,
        sidePanelExpanded: React.PropTypes.bool,
        bboxGlyph: React.PropTypes.string,
        polyGlyph: React.PropTypes.string,
        drawFeatures: React.PropTypes.bool,
        request: React.PropTypes.object,
        drawMethod: React.PropTypes.string,
        drawStatus: React.PropTypes.string,
        geometry: React.PropTypes.object,
        geometryStatus: React.PropTypes.string,
        open: React.PropTypes.bool,
        spatialMethodOptions: React.PropTypes.array,
        features: React.PropTypes.array,
        hstatus: React.PropTypes.string,
        changeDrawingStatus: React.PropTypes.func,
        loadFeatures: React.PropTypes.func,
        featureSelectorError: React.PropTypes.func,
        addLayer: React.PropTypes.func,
        changeLayerProperties: React.PropTypes.func,
        changeHighlightStatus: React.PropTypes.func,
        queryform: React.PropTypes.object,
        advancedFilterStatus: React.PropTypes.bool,
        error: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.bool])
    },
    contextTypes: {
        messages: React.PropTypes.object
    },
    getDefaultProps() {
        return {
            advancedFilterStatus: false,
            bboxGlyph: "unchecked",
            polyGlyph: "edit",
            drawFeatures: true,
            drawMethod: "Polygon",
            spatialMethodOptions: [
                {id: "BBOX", name: "queryform.spatialfilter.methods.box"},
                {id: "Polygon", name: "queryform.spatialfilter.methods.poly"}
            ],
            simpleFilterFields: [],
            changeDrawingStatus: () => {},
            loadFeatures: () => {},
            addLayer: () => {},
            changeLayerProperties: () => {},
            changeHighlightStatus: () => {}
        };
    },
    componentDidMount() {
        this.addKey = false;
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);

    },
    componentWillUnmount() {
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
    },
    componentWillReceiveProps(nextProps) {
        if (this.props.features !== nextProps.features && nextProps.drawFeatures) {
            this.props.changeLayerProperties("featureselector", {features: nextProps.features});
            if (this.props.hstatus === 'disabled') {
                this.props.changeHighlightStatus('enabled');
            }else {
                this.props.changeHighlightStatus('update');
            }
        }

        if (nextProps.geometry && nextProps.geometryStatus === "created" && nextProps.queryform.spatialField) {

            let spatialField = nextProps.queryform.spatialField;
            // prevGeometry is the area selected in the areaFilter and changes only over there


            if (nextProps.queryform.spatialField) {
                let newSpatialFilter = {
                    attribute: spatialField.attribute,
                    method: nextProps.drawMethod,
                    operation: spatialField.operation,
                    geometry: nextProps.geometry
                };
                let filterOpt = {spatialField: newSpatialFilter};
                if (this.props.maxSelectableFeatures) {
                    filterOpt.pagination = {
                            maxFeatures: this.props.maxSelectableFeatures,
                            startIndex: 0
                    };
                }

                filterOpt.crossLayerFilter = this.createCrossLayerFilterObj(spatialField.attribute, nextProps.queryform.spatialField);
                if (this.props.advancedFilterStatus && this.props.queryform.simpleFilterFields && this.props.queryform.simpleFilterFields.length > 0) {
                    filterOpt.simpleFilterFields = this.props.queryform.simpleFilterFields;
                }
                let ogcFilter = FilterUtils.toOGCFilter(nextProps.activeLayer.name, filterOpt, "1.1.0");
                this.props.loadFeatures(nextProps.queryform.searchUrl, ogcFilter, this.addKey, this.props.maxSelectableFeatures);
                if (!this.addKey) {
                    // features selected and highlighted will be cleaned if the CTRL button is NOT pressed
                    this.props.changeHighlightStatus('disabled');
                }
                this.addKey = false;
            } else {
                this.addKey = false;
                this.props.featureSelectorError("Select some features");
            }
            this.props.changeDrawingStatus("clean", '', 'featureselector', []);
        }
        if ( this.props.open && !nextProps.open) {
            this.props.changeDrawingStatus("clean", '', 'featureselector', []);
        }
    },
    renderError() {
        return this.props.error ? (
            <Alert calssName="selector-error" bsStyle="warning"
                    onDismiss={() => {this.props.featureSelectorError(false); }}>
            {this.props.error}
            </Alert>
        ) : null;
    },
    render() {
        return this.props.open ? (
            <div id="feature-selection-bar"
                className={this.props.sidePanelExpanded ? "side-expanded" : "side-unexpanded"}
                onKeyDown={this.keyDown}>
                    {(this.props.request.state === 'loading') ? (
                       <div className="selector-spinner">
                            <Spinner spinnerName="wordpress" noFadeIn/>
                        </div>) : (
                 <div className="button-container">
                    <div style={{"float": "left"}} className={this.getButtonClass("BBOX")}
                    onClick={this.updateSpatialMethod.bind(null, 'BBOX')}>
                            <Glyphicon glyph={this.props.bboxGlyph}/>
                    </div>
                    <div style={{"float": "right"}} className={this.getButtonClass("Polygon")}
                            onClick={this.updateSpatialMethod.bind(null, 'Polygon')}>
                            <Glyphicon glyph={this.props.polyGlyph}/>
                    </div>
                </div>
                )
                }
                {this.renderError()}
            </div>
            ) : null;
    },
    getButtonClass(type) {
        return (type === this.props.drawMethod && this.props.drawStatus === "start" ) ? "pressed" : "";
    },
    toggleDrawSupport() {
        let isActiveDraw = (this.props.drawStatus === "start") ? true : false;
        let newStatus = isActiveDraw ? "stop" : "start";
        this.props.changeDrawingStatus(newStatus, this.props.drawMethod, 'featureselector', []);
    },
    updateSpatialMethod(value) {
        if (this.props.drawMethod === value) {
            this.props.changeDrawingStatus('stop', '', "featureselector", []);
        }else {
            this.props.changeDrawingStatus('start', value, "featureselector", []);
        }
    },
    handleKeyDown(e) {
        this.addKey = e.ctrlKey || e.metaKey;
    },
    handleKeyUp() {
        window.setTimeout(() => {this.addKey = false; }, 100);
    },
    createCrossLayerFilterObj(geomAttribute, spatialField) {

        let zone;
        let attribute;
        let filter = null;
        let cqlFilter = "INCLUDE";
        // Get the latest zone with value in the array
        for (let i = spatialField.zoneFields.length - 1; i >= 0; i--) {
            if (spatialField.zoneFields[i].value && spatialField.zoneFields[i].active) {
                zone = spatialField.zoneFields[i];
                break;
            }
        }
        if (zone) {
            // Get the attribute name (check for dotted notation)
            attribute = zone.valueField.indexOf(".") !== -1 ? zone.valueField.split('.')[zone.valueField.split('.').length - 1] : zone.valueField;
            if (zone.values.length !== zone.value.length) {
                // select only chosen ones
                cqlFilter = attribute;
                if (zone.value instanceof Array) {
                    cqlFilter += " IN (";
                    cqlFilter += zone.value.map((value) => "'" + value + "'").join(",");
                    cqlFilter += ")";
                } else {
                    cqlFilter += " = '" + zone.value + "'";
                }
            }
            // Prepare the cql cross layer filter
            filter = {
                attribute: geomAttribute,
                operation: spatialField.operation,
                collectGeometries: {
                    queryCollection: {
                        typeName: zone.typeName,
                        geometryName: zone.geometryName,
                        cqlFilter
                    }
                }
            };

        }
        return filter;
    }
});

const selector = createSelector([
     lhtac,
    (state) => (state.draw || {}),
    (state) => (state.featureselector || {}),
    (state) => (state.queryform || {}),
    (state) => (state.highlight && state.highlight.status || 'disabled'),
    (state) => (state.advancedfilter || {}),
    (state) => (state.controls)
], (lhtacState, draw, featureselector, queryform, hstatus, advancedfilter, controls) => ({
    activeLayer: lhtacState.activeLayer,
    open: lhtacState.filterActive,
    ...draw,
    ...featureselector,
    queryform,
    hstatus,
    advancedFilterStatus: advancedfilter.filterstatus,
    sidePanelExpanded: controls.drawer.enabled
}));

const FeatureSelectorPlugin = connect(selector, {
        changeDrawingStatus: changeDrawingStatus,
        loadFeatures: loadFeatures,
        featureSelectorError: featureSelectorError,
        addLayer,
        changeLayerProperties,
        changeHighlightStatus: highlightStatus
})(FeatureSelector);

module.exports = {
    FeatureSelectorPlugin: FeatureSelectorPlugin,
    reducers: {
        featureselector: require("../reducers/featureselector")
    }
};
