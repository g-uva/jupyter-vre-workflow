"use strict";
(self["webpackChunkecojupyterext"] = self["webpackChunkecojupyterext"] || []).push([["lib_index_js-webpack_sharing_consume_default_dayjs_dayjs"],{

/***/ "./lib/api/getScaphData.js":
/*!*********************************!*\
  !*** ./lib/api/getScaphData.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ getScaphData)
/* harmony export */ });
async function getMetricData(prometheusUrl, metricName, start, end, step) {
    const url = new URL(`${prometheusUrl}/api/v1/query_range`);
    url.searchParams.set('query', metricName);
    url.searchParams.set('start', start.toString());
    url.searchParams.set('end', end.toString());
    url.searchParams.set('step', step.toString());
    const resp = await fetch(url.toString());
    return await resp.json();
}
async function getScaphMetrics(prometheusUrl) {
    const resp = await fetch(`${prometheusUrl}/api/v1/label/__name__/values`);
    const data = await resp.json();
    return data.data.filter((name) => name.startsWith('scaph_'));
}
async function getScaphData({ startTime, endTime }) {
    try {
        const prometheusUrl = 'https://mc-a4.lab.uvalight.net/prometheus';
        const metricNames = [];
        await getScaphMetrics(prometheusUrl).then(response => metricNames.push(...response));
        const step = 15;
        const results = new Map();
        for (const metricName of metricNames) {
            const metricData = await getMetricData(prometheusUrl, metricName, startTime, endTime, step);
            const data = metricData.data.result[0].values; // For some reason the response is within a [].
            results.set(metricName, data);
        }
        return results;
    }
    catch (error) {
        console.error('Error fetching Scaph metrics:', error);
        return new Map();
    }
}


/***/ }),

/***/ "./lib/components/AddButton.js":
/*!*************************************!*\
  !*** ./lib/components/AddButton.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ AddButton)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _mui_icons_material_AddCircleOutlineRounded__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/icons-material/AddCircleOutlineRounded */ "./node_modules/@mui/icons-material/esm/AddCircleOutlineRounded.js");



function AddButton({ handleClickButton }) {
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Button, { onClick: handleClickButton, size: "small", startIcon: react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_icons_material_AddCircleOutlineRounded__WEBPACK_IMPORTED_MODULE_2__["default"], null), sx: { textTransform: 'none' } }, "Add chart"));
}


/***/ }),

/***/ "./lib/components/ChartWrapper.js":
/*!****************************************!*\
  !*** ./lib/components/ChartWrapper.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ChartWrapper)
/* harmony export */ });
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _NumberInput__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./NumberInput */ "./lib/components/NumberInput.js");
/* harmony import */ var _RefreshButton__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./RefreshButton */ "./lib/components/RefreshButton.js");
/* harmony import */ var _DeleteIconButton__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./DeleteIconButton */ "./lib/components/DeleteIconButton.js");
/* harmony import */ var _helpers_constants__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../helpers/constants */ "./lib/helpers/constants.js");






function debounce(func, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
}
function ChartWrapper({ keyId, src, width, height, onDelete }) {
    const iframeRef = react__WEBPACK_IMPORTED_MODULE_1___default().useRef(null);
    const [refreshRateS, setRefreshRateS] = react__WEBPACK_IMPORTED_MODULE_1___default().useState(_helpers_constants__WEBPACK_IMPORTED_MODULE_2__.DEFAULT_REFRESH_RATE);
    const initialSrcWithRefresh = `${src}&refresh=${refreshRateS}s`;
    const [iframeSrc, setIframeSrc] = react__WEBPACK_IMPORTED_MODULE_1___default().useState(initialSrcWithRefresh);
    function refreshUrl() {
        setIframeSrc(prevState => {
            const base = prevState.split('&refresh=')[0];
            return `${base}&refresh=${refreshRateS}s`;
        });
    }
    react__WEBPACK_IMPORTED_MODULE_1___default().useEffect(() => {
        refreshUrl();
        const intervalId = setInterval(() => {
            refreshUrl();
        }, refreshRateS * 1000);
        // Whenever the refresh interval is cleared.
        return () => clearInterval(intervalId);
    }, [refreshRateS]);
    function handleRefreshClick() {
        if (iframeRef.current) {
            const copy_src = structuredClone(iframeRef.current.src);
            iframeRef.current.src = copy_src;
        }
    }
    // Call the debounced function on number change
    function handleNumberChange(value) {
        const parsedValue = Number(value);
        if (!isNaN(parsedValue)) {
            debouncedSetRefreshRateS(parsedValue);
        }
    }
    // Create a debounced version of setRefreshRateS
    // Using 200ms delay instead of 2ms for a noticeable debounce effect.
    const debouncedSetRefreshRateS = react__WEBPACK_IMPORTED_MODULE_1___default().useMemo(() => debounce((value) => setRefreshRateS(value), 1000), []);
    return (react__WEBPACK_IMPORTED_MODULE_1___default().createElement((react__WEBPACK_IMPORTED_MODULE_1___default().Fragment), null,
        react__WEBPACK_IMPORTED_MODULE_1___default().createElement("iframe", { src: iframeSrc, width: width, height: height, sandbox: "allow-scripts allow-same-origin", ref: iframeRef, id: `iframe-item-${keyId}` }),
        react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_0__.Grid2, null,
            react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_RefreshButton__WEBPACK_IMPORTED_MODULE_3__["default"], { handleRefreshClick: handleRefreshClick }),
            react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_NumberInput__WEBPACK_IMPORTED_MODULE_4__["default"]
            // currentRefreshValue={refreshRateS}
            , { 
                // currentRefreshValue={refreshRateS}
                handleRefreshNumberChange: newValue => handleNumberChange(newValue) }),
            react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_DeleteIconButton__WEBPACK_IMPORTED_MODULE_5__["default"], { handleClickButton: () => onDelete(keyId) }))));
}


/***/ }),

/***/ "./lib/components/DateTimeRange.js":
/*!*****************************************!*\
  !*** ./lib/components/DateTimeRange.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ DateTimeRange)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var dayjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! dayjs */ "webpack/sharing/consume/default/dayjs/dayjs?efe8");
/* harmony import */ var dayjs__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(dayjs__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _mui_x_date_pickers_AdapterDayjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @mui/x-date-pickers/AdapterDayjs */ "./node_modules/@mui/x-date-pickers/esm/AdapterDayjs/AdapterDayjs.js");
/* harmony import */ var _mui_x_date_pickers_LocalizationProvider__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @mui/x-date-pickers/LocalizationProvider */ "./node_modules/@mui/x-date-pickers/esm/LocalizationProvider/LocalizationProvider.js");
/* harmony import */ var _mui_x_date_pickers_DateTimePicker__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @mui/x-date-pickers/DateTimePicker */ "./node_modules/@mui/x-date-pickers/esm/DateTimePicker/DateTimePicker.js");






function DateTimeRange({ startTime, endTime, onStartTimeChange, onEndTimeChange }) {
    var _a, _b;
    const [tempStartTime, setTempStartTime] = react__WEBPACK_IMPORTED_MODULE_0__.useState(null);
    const [tempEndTime, setTempEndTime] = react__WEBPACK_IMPORTED_MODULE_0__.useState(null);
    function handleAccept() {
        if (onStartTimeChange) {
            onStartTimeChange(tempStartTime);
        }
        if (onEndTimeChange) {
            onEndTimeChange(tempEndTime);
        }
        setTempStartTime(null);
        setTempEndTime(null);
    }
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: { width: '100%', p: '15px' } },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_x_date_pickers_LocalizationProvider__WEBPACK_IMPORTED_MODULE_3__.LocalizationProvider, { dateAdapter: _mui_x_date_pickers_AdapterDayjs__WEBPACK_IMPORTED_MODULE_4__.AdapterDayjs },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_x_date_pickers_DateTimePicker__WEBPACK_IMPORTED_MODULE_5__.DateTimePicker, { slotProps: { textField: { size: 'small' } }, label: "Start time", value: tempStartTime !== null && tempStartTime !== void 0 ? tempStartTime : startTime, onChange: setTempStartTime, onAccept: handleAccept, maxDateTime: (_a = tempEndTime !== null && tempEndTime !== void 0 ? tempEndTime : endTime) !== null && _a !== void 0 ? _a : undefined, sx: { mr: 2 } })),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_x_date_pickers_LocalizationProvider__WEBPACK_IMPORTED_MODULE_3__.LocalizationProvider, { dateAdapter: _mui_x_date_pickers_AdapterDayjs__WEBPACK_IMPORTED_MODULE_4__.AdapterDayjs },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_x_date_pickers_DateTimePicker__WEBPACK_IMPORTED_MODULE_5__.DateTimePicker, { slotProps: { textField: { size: 'small' } }, label: "End time", value: tempEndTime !== null && tempEndTime !== void 0 ? tempEndTime : endTime, onChange: setTempEndTime, onAccept: handleAccept, minDateTime: (_b = tempStartTime !== null && tempStartTime !== void 0 ? tempStartTime : startTime) !== null && _b !== void 0 ? _b : undefined, maxDateTime: dayjs__WEBPACK_IMPORTED_MODULE_2___default()(new Date()) }))));
}


/***/ }),

/***/ "./lib/components/DeleteIconButton.js":
/*!********************************************!*\
  !*** ./lib/components/DeleteIconButton.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ DeleteIconButton)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _mui_icons_material_DeleteOutlineRounded__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/icons-material/DeleteOutlineRounded */ "./node_modules/@mui/icons-material/esm/DeleteOutlineRounded.js");



function DeleteIconButton({ handleClickButton }) {
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.IconButton, { onClick: handleClickButton, size: "small" },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_icons_material_DeleteOutlineRounded__WEBPACK_IMPORTED_MODULE_2__["default"], null)));
}


/***/ }),

/***/ "./lib/components/GoBackButton.js":
/*!****************************************!*\
  !*** ./lib/components/GoBackButton.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ GoBackButton)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _mui_icons_material_ArrowBackRounded__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/icons-material/ArrowBackRounded */ "./node_modules/@mui/icons-material/esm/ArrowBackRounded.js");



function GoBackButton({ handleClick }) {
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.IconButton, { onClick: handleClick, size: "small" },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_icons_material_ArrowBackRounded__WEBPACK_IMPORTED_MODULE_2__["default"], null)));
}


/***/ }),

/***/ "./lib/components/KPIComponent.js":
/*!****************************************!*\
  !*** ./lib/components/KPIComponent.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   KPIComponent: () => (/* binding */ KPIComponent),
/* harmony export */   calculateKPIs: () => (/* binding */ calculateKPIs)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

function calculateKPIs(metrics) {
    const { energyConsumed: E, carbonIntensity: I, embodiedEmissions: M, functionalUnit: R, hepScore23 } = metrics;
    // SCI calculation
    // SCI = ((E * I) + M) / R
    const sci = R > 0 ? (E * I + M) / R : 0;
    // Example extra KPIs:
    const sciPerUnit = R > 0 ? sci / R : 0;
    const energyPerUnit = R > 0 ? E / R : 0;
    // HEPScore23 could be just the metric, or some normalisation.
    return {
        sci,
        hepScore23,
        sciPerUnit,
        energyPerUnit
    };
}
const KPIComponent = ({ metrics }) => {
    const kpi = react__WEBPACK_IMPORTED_MODULE_0___default().useMemo(() => calculateKPIs(metrics), [metrics]);
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
            "SCI: ",
            kpi.sci),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
            "HEPScore23: ",
            kpi.hepScore23),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
            "SCI per Unit: ",
            kpi.sciPerUnit),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
            "Energy per Unit: ",
            kpi.energyPerUnit)));
};


/***/ }),

/***/ "./lib/components/MetricSelector.js":
/*!******************************************!*\
  !*** ./lib/components/MetricSelector.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ MetricSelector)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);


function MetricSelector({ selectedMetric, setSelectedMetric, metrics }) {
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.FormControl, { variant: "outlined", size: "small", style: { margin: 16, minWidth: 200 } },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.InputLabel, { id: "metric-label" }, "Metric"),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Select, { labelId: "metric-label", value: selectedMetric, label: "Metric", onChange: e => setSelectedMetric(e.target.value), size: "small" }, metrics.map(metric => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.MenuItem, { key: metric, value: metric }, metric))))));
}


/***/ }),

/***/ "./lib/components/NumberInput.js":
/*!***************************************!*\
  !*** ./lib/components/NumberInput.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ NumberInput)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _helpers_constants__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../helpers/constants */ "./lib/helpers/constants.js");



function NumberInput({ 
// currentRefreshValue,
handleRefreshNumberChange }) {
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.TextField, { id: "outlined-number", label: "Refresh(S)", type: "number", slotProps: {
            inputLabel: {
                shrink: true
            }
        }, onChange: event => handleRefreshNumberChange(event.target.value), defaultValue: _helpers_constants__WEBPACK_IMPORTED_MODULE_2__.DEFAULT_REFRESH_RATE, size: "small", sx: { maxWidth: 90 } }));
}


/***/ }),

/***/ "./lib/components/RefreshButton.js":
/*!*****************************************!*\
  !*** ./lib/components/RefreshButton.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ RefreshButton)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _mui_icons_material_RefreshRounded__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/icons-material/RefreshRounded */ "./node_modules/@mui/icons-material/esm/RefreshRounded.js");



function RefreshButton({ handleRefreshClick }) {
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react__WEBPACK_IMPORTED_MODULE_0___default().Fragment), null,
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.IconButton, { onClick: handleRefreshClick, size: "small" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_icons_material_RefreshRounded__WEBPACK_IMPORTED_MODULE_2__["default"], null))));
}


/***/ }),

/***/ "./lib/components/ScaphChart.js":
/*!**************************************!*\
  !*** ./lib/components/ScaphChart.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ TimeSeriesLineChart)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _visx_scale__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @visx/scale */ "webpack/sharing/consume/default/@visx/scale/@visx/scale?1592");
/* harmony import */ var _visx_scale__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_visx_scale__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _visx_shape__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @visx/shape */ "webpack/sharing/consume/default/@visx/shape/@visx/shape?7338");
/* harmony import */ var _visx_shape__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_visx_shape__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _visx_axis__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @visx/axis */ "webpack/sharing/consume/default/@visx/axis/@visx/axis");
/* harmony import */ var _visx_axis__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_visx_axis__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _visx_group__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! @visx/group */ "./node_modules/@visx/group/esm/Group.js");
/* harmony import */ var _visx_tooltip__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @visx/tooltip */ "webpack/sharing/consume/default/@visx/tooltip/@visx/tooltip");
/* harmony import */ var _visx_tooltip__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_visx_tooltip__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _visx_event__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @visx/event */ "webpack/sharing/consume/default/@visx/event/@visx/event");
/* harmony import */ var _visx_event__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_visx_event__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var d3_array__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! d3-array */ "./node_modules/d3-array/src/bisector.js");
/* harmony import */ var d3_array__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! d3-array */ "./node_modules/d3-array/src/extent.js");
/* harmony import */ var d3_array__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! d3-array */ "./node_modules/d3-array/src/min.js");
/* harmony import */ var d3_array__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! d3-array */ "./node_modules/d3-array/src/max.js");
/* harmony import */ var _helpers_utils__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../helpers/utils */ "./lib/helpers/utils.js");









const margin = { top: 20, right: 30, bottom: 40, left: 60 };
const width = 400;
const height = 300;
const bisectDate = (0,d3_array__WEBPACK_IMPORTED_MODULE_6__["default"])(d => d.date).left;
function TimeSeriesLineChart({ rawData }) {
    var _a, _b;
    const [data, setData] = react__WEBPACK_IMPORTED_MODULE_0___default().useState([]);
    react__WEBPACK_IMPORTED_MODULE_0___default().useEffect(() => {
        const data = (0,_helpers_utils__WEBPACK_IMPORTED_MODULE_7__.downSample)((0,_helpers_utils__WEBPACK_IMPORTED_MODULE_7__.parseData)(rawData));
        setData(data);
    }, [rawData]);
    const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop } = (0,_visx_tooltip__WEBPACK_IMPORTED_MODULE_4__.useTooltip)();
    const { containerRef, TooltipInPortal } = (0,_visx_tooltip__WEBPACK_IMPORTED_MODULE_4__.useTooltipInPortal)();
    function handleTooltip(event) {
        const { x: xPoint } = (0,_visx_event__WEBPACK_IMPORTED_MODULE_5__.localPoint)(event) || { x: 0 };
        const x0 = xScale.invert(xPoint);
        const index = bisectDate(data, x0, 1);
        const d0 = data[index - 1];
        const d1 = data[index];
        let d = d0;
        if (d1 && d0) {
            d =
                x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime()
                    ? d1
                    : d0;
        }
        showTooltip({
            tooltipData: d,
            tooltipLeft: xScale(d.date),
            tooltipTop: yScale(d.value)
        });
    }
    const x = (d) => d.date;
    const y = (d) => d.value;
    const xExtent = (0,d3_array__WEBPACK_IMPORTED_MODULE_8__["default"])(data, x);
    const xDomain = xExtent[0] && xExtent[1]
        ? [xExtent[0], xExtent[1]]
        : [new Date(), new Date()];
    const xScale = (0,_visx_scale__WEBPACK_IMPORTED_MODULE_1__.scaleTime)({
        domain: xDomain,
        range: [margin.left, width - margin.right]
    });
    const yMin = (_a = (0,d3_array__WEBPACK_IMPORTED_MODULE_9__["default"])(data, y)) !== null && _a !== void 0 ? _a : 0;
    const yMax = (_b = (0,d3_array__WEBPACK_IMPORTED_MODULE_10__["default"])(data, y)) !== null && _b !== void 0 ? _b : 0;
    const yBuffer = (yMax - yMin) * 0.1; // 10% buffer
    const baseline = Math.max(0, yMin - yBuffer);
    const yScale = (0,_visx_scale__WEBPACK_IMPORTED_MODULE_1__.scaleLinear)({
        domain: [baseline, yMax],
        nice: true,
        range: [height - margin.bottom, margin.top]
    });
    const TooltipPortal = ({ tooltipData }) => TooltipInPortal({
        top: tooltipTop,
        left: tooltipLeft,
        style: {
            backgroundColor: 'white',
            color: '#1976d2',
            border: '1px solid #1976d2',
            padding: '6px 10px',
            borderRadius: 4,
            fontSize: 13,
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            maxWidth: '80px'
        },
        children: (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", null, (tooltipData === null || tooltipData === void 0 ? void 0 : tooltipData.value) ? (0,_helpers_utils__WEBPACK_IMPORTED_MODULE_7__.shortNumber)(tooltipData === null || tooltipData === void 0 ? void 0 : tooltipData.value) : 'N/A')),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { fontSize: 11, color: '#333' } }, tooltipData === null || tooltipData === void 0 ? void 0 : tooltipData.date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }))))
    });
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { ref: containerRef, style: { position: 'relative' } },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("svg", { width: width, height: height },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_visx_group__WEBPACK_IMPORTED_MODULE_11__["default"], null,
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_visx_shape__WEBPACK_IMPORTED_MODULE_2__.LinePath, { data: data, x: d => xScale(x(d)), y: d => yScale(y(d)), stroke: "#1976d2", strokeWidth: 2 })),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_visx_axis__WEBPACK_IMPORTED_MODULE_3__.AxisLeft, { scale: yScale, top: 0, left: margin.left, 
                // label="Value"
                tickFormat: v => (0,_helpers_utils__WEBPACK_IMPORTED_MODULE_7__.shortNumber)(Number(v)), stroke: "#888", tickStroke: "#888", tickLabelProps: () => ({
                    fill: '#333',
                    fontSize: 12,
                    textAnchor: 'end',
                    dx: '-0.25em',
                    dy: '0.25em'
                }) }),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_visx_axis__WEBPACK_IMPORTED_MODULE_3__.AxisBottom, { scale: xScale, top: height - margin.bottom, left: 0, label: "Time", numTicks: 6, tickFormat: date => date instanceof Date
                    ? date.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : new Date(Number(date)).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    }), stroke: "#888", tickStroke: "#888", tickLabelProps: () => ({
                    fill: '#333',
                    fontSize: 12,
                    textAnchor: 'middle'
                }) }),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("rect", { width: width - margin.left - margin.right, height: height - margin.top - margin.bottom, fill: "transparent", rx: 14, x: margin.left, y: margin.top, onMouseMove: handleTooltip, onMouseLeave: hideTooltip }),
            tooltipData ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("g", null,
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("circle", { cx: tooltipLeft, cy: tooltipTop, r: 5, fill: "#1976d2", stroke: "#fff", strokeWidth: 2, pointerEvents: "none" }))) : null),
        tooltipData ? TooltipPortal({ tooltipData }) : null));
}


/***/ }),

/***/ "./lib/components/SelectComponent.js":
/*!*******************************************!*\
  !*** ./lib/components/SelectComponent.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ MultipleSelectCheckmarks)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material_OutlinedInput__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @mui/material/OutlinedInput */ "./node_modules/@mui/material/OutlinedInput/OutlinedInput.js");
/* harmony import */ var _mui_material_MenuItem__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @mui/material/MenuItem */ "./node_modules/@mui/material/MenuItem/MenuItem.js");
/* harmony import */ var _mui_material_FormControl__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material/FormControl */ "./node_modules/@mui/material/FormControl/FormControl.js");
/* harmony import */ var _mui_material_ListItemText__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @mui/material/ListItemText */ "./node_modules/@mui/material/ListItemText/ListItemText.js");
/* harmony import */ var _mui_material_Select__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/material/Select */ "./node_modules/@mui/material/Select/Select.js");
/* harmony import */ var _mui_material_Checkbox__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @mui/material/Checkbox */ "./node_modules/@mui/material/Checkbox/Checkbox.js");
/* harmony import */ var _helpers_constants__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../helpers/constants */ "./lib/helpers/constants.js");








const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250
        }
    }
};
const metrics = [
    'CPU Usage',
    'CPU Time',
    'CPU Frequency',
    'Memory Energy',
    'Memory Used',
    'Network I/O',
    'Network Connections'
];
const noMetricSelected = 'No metric selected';
function MultipleSelectCheckmarks() {
    const [metricName, setMetricName] = react__WEBPACK_IMPORTED_MODULE_0__.useState([]);
    const handleChange = (event) => {
        const { target: { value } } = event;
        setMetricName(
        // On autofill we get a stringified value.
        typeof value === 'string' ? value.split(',') : value);
    };
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", null,
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_FormControl__WEBPACK_IMPORTED_MODULE_1__["default"], { sx: { width: '100%' } },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Select__WEBPACK_IMPORTED_MODULE_2__["default"], { labelId: "metrics-multiple-checkbox-label", id: "metrics-multiple-checkbox", multiple: true, value: metricName, onChange: handleChange, input: react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_OutlinedInput__WEBPACK_IMPORTED_MODULE_3__["default"], { label: "Metric", sx: { width: '100%' } }), renderValue: selected => {
                    if (selected.length === 0) {
                        return react__WEBPACK_IMPORTED_MODULE_0__.createElement("em", null, noMetricSelected);
                    }
                    return selected.join(', ');
                }, MenuProps: MenuProps, size: "small", name: _helpers_constants__WEBPACK_IMPORTED_MODULE_4__.METRICS_GRAFANA_KEY },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_MenuItem__WEBPACK_IMPORTED_MODULE_5__["default"], { disabled: true, value: "" },
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement("em", null, noMetricSelected)),
                metrics.map(metric => (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_MenuItem__WEBPACK_IMPORTED_MODULE_5__["default"], { key: metric, value: metric },
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Checkbox__WEBPACK_IMPORTED_MODULE_6__["default"], { checked: metricName.includes(metric) }),
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_ListItemText__WEBPACK_IMPORTED_MODULE_7__["default"], { primary: metric }))))),
            metricName.length > 0
                ? `${metricName.length} metric${metricName.length > 1 ? 's' : ''} selected.`
                : null)));
}


/***/ }),

/***/ "./lib/components/VerticalLinearStepper.js":
/*!*************************************************!*\
  !*** ./lib/components/VerticalLinearStepper.js ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ VerticalLinearStepper)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material_Box__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! @mui/material/Box */ "./node_modules/@mui/material/Box/Box.js");
/* harmony import */ var _mui_material_Stepper__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @mui/material/Stepper */ "./node_modules/@mui/material/Stepper/Stepper.js");
/* harmony import */ var _mui_material_Step__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @mui/material/Step */ "./node_modules/@mui/material/Step/Step.js");
/* harmony import */ var _mui_material_StepLabel__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @mui/material/StepLabel */ "./node_modules/@mui/material/StepLabel/StepLabel.js");
/* harmony import */ var _mui_material_StepContent__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @mui/material/StepContent */ "./node_modules/@mui/material/StepContent/StepContent.js");
/* harmony import */ var _mui_material_Button__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @mui/material/Button */ "./node_modules/@mui/material/Button/Button.js");
/* harmony import */ var _mui_material_Paper__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! @mui/material/Paper */ "./node_modules/@mui/material/Paper/Paper.js");
/* harmony import */ var _mui_material_Typography__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/material/Typography */ "./node_modules/@mui/material/Typography/Typography.js");
/* harmony import */ var _progress_CircularWithValueLabel__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./progress/CircularWithValueLabel */ "./lib/components/progress/CircularWithValueLabel.js");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _table_CollapsibleTable__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./table/CollapsibleTable */ "./lib/components/table/CollapsibleTable.js");
/* harmony import */ var _progress_LinearProgress__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./progress/LinearProgress */ "./lib/components/progress/LinearProgress.js");













const steps = [
    {
        label: 'Approach'
    },
    {
        label: 'Fetch/compute',
        hasButtons: false
    },
    {
        label: 'Visualisation options'
    },
    {
        label: 'Deployment',
        hasButtons: false
    }
];
function StepOne() {
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, null,
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.FormControl, null,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.RadioGroup, { "aria-labelledby": "demo-radio-buttons-group-label", defaultValue: "pre-compute", name: "radio-buttons-group" },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.FormControlLabel, { value: "pre-compute", control: react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Radio, null), label: "Pre-Compute" }),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.FormControlLabel, { value: "sample", control: react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Radio, null), label: "Sample Computation" }),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.FormControlLabel, { value: "simulation-pred", control: react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Radio, null), label: "Simulation/Prediction" })))));
}
function StepTwo({ handleFinish, label }) {
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, null,
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Typography__WEBPACK_IMPORTED_MODULE_2__["default"], null, label),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_progress_CircularWithValueLabel__WEBPACK_IMPORTED_MODULE_3__["default"], { onFinish: handleFinish })));
}
function StepThree() {
    return react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", null);
}
function StepFour({ handleFinish, label }) {
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, null,
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Button__WEBPACK_IMPORTED_MODULE_4__["default"], { onClick: handleFinish, title: "Reset" })));
}
function ContentHandler({ step, triggerNextStep, handleLastStep }) {
    switch (step) {
        default:
        case 0:
            return react__WEBPACK_IMPORTED_MODULE_0__.createElement(StepOne, null);
        case 1:
            return (react__WEBPACK_IMPORTED_MODULE_0__.createElement(StepTwo, { handleFinish: triggerNextStep, label: "Predicting results..." }));
        case 2:
            return react__WEBPACK_IMPORTED_MODULE_0__.createElement(StepThree, null);
        case 3:
            return (react__WEBPACK_IMPORTED_MODULE_0__.createElement(StepFour, { handleFinish: handleLastStep, label: "Deploying application..." }));
    }
}
function VerticalLinearStepper() {
    const [activeStep, setActiveStep] = react__WEBPACK_IMPORTED_MODULE_0__.useState(0);
    const [complete, setComplete] = react__WEBPACK_IMPORTED_MODULE_0__.useState(false);
    const [checkedIndex, setCheckedIndex] = react__WEBPACK_IMPORTED_MODULE_0__.useState(null);
    const disableNextStepThree = activeStep === 2 && checkedIndex === null;
    const handleNext = () => {
        setActiveStep(prevActiveStep => prevActiveStep + 1);
    };
    const handleBack = () => {
        setActiveStep(prevActiveStep => prevActiveStep - (prevActiveStep === 2 ? 2 : 1));
    };
    const handleReset = () => {
        setActiveStep(0);
        setComplete(false);
    };
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: { display: 'flex', width: '100%', height: '500px' } },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, null,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Stepper__WEBPACK_IMPORTED_MODULE_5__["default"], { activeStep: activeStep, orientation: "vertical" }, steps.map((step, index) => (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Step__WEBPACK_IMPORTED_MODULE_6__["default"], { key: step.label },
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_StepLabel__WEBPACK_IMPORTED_MODULE_7__["default"], { optional: index === steps.length - 1 ? (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Typography__WEBPACK_IMPORTED_MODULE_2__["default"], { variant: "caption" }, "Last step")) : null }, step.label),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_StepContent__WEBPACK_IMPORTED_MODULE_8__["default"], null,
                    react__WEBPACK_IMPORTED_MODULE_0__.createElement(ContentHandler, { step: activeStep, triggerNextStep: handleNext, handleLastStep: handleReset }),
                    step.hasButtons !== false && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Box__WEBPACK_IMPORTED_MODULE_9__["default"], { sx: { mb: 2 } },
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Button__WEBPACK_IMPORTED_MODULE_4__["default"], { variant: "contained", onClick: handleNext, sx: { mt: 1, mr: 1 }, disabled: disableNextStepThree }, index === steps.length - 1 ? 'Finish' : 'Continue'),
                        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Button__WEBPACK_IMPORTED_MODULE_4__["default"], { disabled: index === 0, onClick: handleBack, sx: { mt: 1, mr: 1 } }, "Back"))))))))),
        activeStep === 2 && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Paper__WEBPACK_IMPORTED_MODULE_10__["default"], { square: true, elevation: 0, sx: { p: 3, width: '100%', overflow: 'visible' } },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_table_CollapsibleTable__WEBPACK_IMPORTED_MODULE_11__["default"], { checkedIndex: checkedIndex, setCheckedIndex: setCheckedIndex }))),
        activeStep === 3 && (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: { width: '400px' } }, complete ? (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: { display: 'flex', justifyContent: 'center' } },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Typography__WEBPACK_IMPORTED_MODULE_2__["default"], null, "Deployment complete!"),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Button__WEBPACK_IMPORTED_MODULE_4__["default"], { title: "Reset", onClick: handleReset }))) : (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Typography__WEBPACK_IMPORTED_MODULE_2__["default"], null, "Deploying..."),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_progress_LinearProgress__WEBPACK_IMPORTED_MODULE_12__["default"], { setComplete: () => setComplete(true) })))))));
}


/***/ }),

/***/ "./lib/components/progress/CircularWithValueLabel.js":
/*!***********************************************************!*\
  !*** ./lib/components/progress/CircularWithValueLabel.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ CircularWithValueLabel)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material_CircularProgress__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/material/CircularProgress */ "./node_modules/@mui/material/CircularProgress/CircularProgress.js");
/* harmony import */ var _mui_material_Typography__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @mui/material/Typography */ "./node_modules/@mui/material/Typography/Typography.js");
/* harmony import */ var _mui_material_Box__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material/Box */ "./node_modules/@mui/material/Box/Box.js");




function CircularProgressWithLabel(props) {
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Box__WEBPACK_IMPORTED_MODULE_1__["default"], { sx: { position: 'relative', display: 'inline-flex' } },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_CircularProgress__WEBPACK_IMPORTED_MODULE_2__["default"], { variant: "determinate", ...props }),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Box__WEBPACK_IMPORTED_MODULE_1__["default"], { sx: {
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            } },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Typography__WEBPACK_IMPORTED_MODULE_3__["default"], { variant: "caption", component: "div", sx: { color: 'text.secondary' } }, `${Math.round(props.value)}%`))));
}
function CircularWithValueLabel({ onFinish }) {
    const [progress, setProgress] = react__WEBPACK_IMPORTED_MODULE_0__.useState(10);
    function handleConclusion() {
        onFinish();
        return 0;
    }
    react__WEBPACK_IMPORTED_MODULE_0__.useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prevProgress => prevProgress >= 100 ? handleConclusion() : prevProgress + 10);
        }, 400);
        return () => {
            clearInterval(timer);
        };
    }, []);
    return react__WEBPACK_IMPORTED_MODULE_0__.createElement(CircularProgressWithLabel, { value: progress });
}


/***/ }),

/***/ "./lib/components/progress/LinearProgress.js":
/*!***************************************************!*\
  !*** ./lib/components/progress/LinearProgress.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ LinearBuffer)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material_Box__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material/Box */ "./node_modules/@mui/material/Box/Box.js");
/* harmony import */ var _mui_material_LinearProgress__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/material/LinearProgress */ "./node_modules/@mui/material/LinearProgress/LinearProgress.js");



function LinearBuffer({ setComplete }) {
    const [progress, setProgress] = react__WEBPACK_IMPORTED_MODULE_0__.useState(0);
    const [buffer, setBuffer] = react__WEBPACK_IMPORTED_MODULE_0__.useState(10);
    const progressRef = react__WEBPACK_IMPORTED_MODULE_0__.useRef(() => { });
    react__WEBPACK_IMPORTED_MODULE_0__.useEffect(() => {
        progressRef.current = () => {
            if (progress === 100) {
                setComplete();
            }
            else {
                setProgress(progress + 1);
                if (buffer < 100 && progress % 5 === 0) {
                    const newBuffer = buffer + 1 + Math.random() * 10;
                    setBuffer(newBuffer > 100 ? 100 : newBuffer);
                }
            }
        };
    });
    react__WEBPACK_IMPORTED_MODULE_0__.useEffect(() => {
        const timer = setInterval(() => {
            progressRef.current();
        }, 50);
        return () => {
            clearInterval(timer);
        };
    }, []);
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Box__WEBPACK_IMPORTED_MODULE_1__["default"], { sx: { width: '100%' } },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_LinearProgress__WEBPACK_IMPORTED_MODULE_2__["default"], { variant: "buffer", value: progress, valueBuffer: buffer })));
}


/***/ }),

/***/ "./lib/components/table/CollapsibleTable.js":
/*!**************************************************!*\
  !*** ./lib/components/table/CollapsibleTable.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ CollapsibleTable)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material_Box__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! @mui/material/Box */ "./node_modules/@mui/material/Box/Box.js");
/* harmony import */ var _mui_material_Collapse__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @mui/material/Collapse */ "./node_modules/@mui/material/Collapse/Collapse.js");
/* harmony import */ var _mui_material_IconButton__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @mui/material/IconButton */ "./node_modules/@mui/material/IconButton/IconButton.js");
/* harmony import */ var _mui_material_Table__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! @mui/material/Table */ "./node_modules/@mui/material/Table/Table.js");
/* harmony import */ var _mui_material_TableBody__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! @mui/material/TableBody */ "./node_modules/@mui/material/TableBody/TableBody.js");
/* harmony import */ var _mui_material_TableCell__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @mui/material/TableCell */ "./node_modules/@mui/material/TableCell/TableCell.js");
/* harmony import */ var _mui_material_TableContainer__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! @mui/material/TableContainer */ "./node_modules/@mui/material/TableContainer/TableContainer.js");
/* harmony import */ var _mui_material_TableHead__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! @mui/material/TableHead */ "./node_modules/@mui/material/TableHead/TableHead.js");
/* harmony import */ var _mui_material_TableRow__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/material/TableRow */ "./node_modules/@mui/material/TableRow/TableRow.js");
/* harmony import */ var _mui_material_Typography__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @mui/material/Typography */ "./node_modules/@mui/material/Typography/Typography.js");
/* harmony import */ var _mui_material_Paper__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! @mui/material/Paper */ "./node_modules/@mui/material/Paper/Paper.js");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _mui_icons_material_KeyboardArrowDown__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @mui/icons-material/KeyboardArrowDown */ "./node_modules/@mui/icons-material/esm/KeyboardArrowDown.js");
/* harmony import */ var _mui_icons_material_KeyboardArrowUp__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @mui/icons-material/KeyboardArrowUp */ "./node_modules/@mui/icons-material/esm/KeyboardArrowUp.js");

// import PropTypes from 'prop-types';














function createData(sci, time, availability) {
    const datacentres = Array.from({ length: 2 }, (_, index) => ({
        label: `Data Centre ${index + 1}`,
        details: {
            cpu: {
                usage: Number((Math.random() * 100).toFixed(2)),
                time: Math.floor(Math.random() * 10000),
                frequency: Number((Math.random() * 3 + 2).toFixed(2))
            },
            memory: {
                energy: Number((Math.random() * 1000).toFixed(2)),
                used: Math.floor(Math.random() * 1000000)
            },
            network: {
                io: Number((Math.random() * 100).toFixed(2)),
                connections: Math.floor(Math.random() * 50)
            }
        }
    }));
    return { sci, time, availability, datacentres };
}
function Row({ row, checkedIndex, setSelectedIndex, rowIndex }) {
    const [open, setOpen] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(false);
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react__WEBPACK_IMPORTED_MODULE_0___default().Fragment), null,
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableRow__WEBPACK_IMPORTED_MODULE_2__["default"], null,
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableCell__WEBPACK_IMPORTED_MODULE_3__["default"], null,
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: { display: 'flex', alignItems: 'center' } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_Typography__WEBPACK_IMPORTED_MODULE_4__["default"], null, rowIndex),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_IconButton__WEBPACK_IMPORTED_MODULE_5__["default"], { "aria-label": "expand row", size: "small", onClick: () => setOpen(!open) }, open ? react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_icons_material_KeyboardArrowUp__WEBPACK_IMPORTED_MODULE_6__["default"], null) : react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_icons_material_KeyboardArrowDown__WEBPACK_IMPORTED_MODULE_7__["default"], null)),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Checkbox, { checked: checkedIndex, onClick: setSelectedIndex }))),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableCell__WEBPACK_IMPORTED_MODULE_3__["default"], null, row.sci),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableCell__WEBPACK_IMPORTED_MODULE_3__["default"], { align: "right" }, row.time),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableCell__WEBPACK_IMPORTED_MODULE_3__["default"], { align: "center" }, row.availability)),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableRow__WEBPACK_IMPORTED_MODULE_2__["default"], null,
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableCell__WEBPACK_IMPORTED_MODULE_3__["default"], { style: { paddingBottom: 0, paddingTop: 0 }, colSpan: 4 },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_Collapse__WEBPACK_IMPORTED_MODULE_8__["default"], { in: open, timeout: "auto", unmountOnExit: true },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_Box__WEBPACK_IMPORTED_MODULE_9__["default"], { sx: { m: 1 } }, row.datacentres.map((datacentre, index) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_Box__WEBPACK_IMPORTED_MODULE_9__["default"], { key: index, sx: {
                            mb: 2,
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            p: 2
                        } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_Typography__WEBPACK_IMPORTED_MODULE_4__["default"], { sx: { fontWeight: 'bold', mb: 1 }, variant: "subtitle1" }, datacentre.label),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { container: true, spacing: 2, sx: { display: 'flex', justifyContent: 'space-between' } },
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    flexGrow: 1
                                } },
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_Typography__WEBPACK_IMPORTED_MODULE_4__["default"], { sx: { fontWeight: 'bold' } }, "CPU"),
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("ul", { style: { paddingInlineStart: '10px' } },
                                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("li", null,
                                        "Usage: ",
                                        datacentre.details.cpu.usage,
                                        " %"),
                                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("li", null,
                                        "Time: ",
                                        datacentre.details.cpu.time,
                                        " \u03BCs"),
                                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("li", null,
                                        "Frequency: ",
                                        datacentre.details.cpu.frequency,
                                        " GHz"))),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    flexGrow: 1
                                } },
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_Typography__WEBPACK_IMPORTED_MODULE_4__["default"], { sx: { fontWeight: 'bold' } }, "Memory"),
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("ul", { style: { paddingInlineStart: '10px' } },
                                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("li", null,
                                        "Energy: ",
                                        datacentre.details.memory.energy,
                                        " \u03BCJ"),
                                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("li", null,
                                        "Used: ",
                                        datacentre.details.memory.used,
                                        " Bytes"))),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    flexGrow: 1
                                } },
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_Typography__WEBPACK_IMPORTED_MODULE_4__["default"], { sx: { fontWeight: 'bold' } }, "Network"),
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("ul", { style: { paddingInlineStart: '10px' } },
                                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("li", null,
                                        "IO: ",
                                        datacentre.details.network.io,
                                        " B/s"),
                                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("li", null,
                                        "Connections: ",
                                        datacentre.details.network.connections)))))))))))));
}
const rows = [
    createData(12.33, 4500, '++'),
    createData(14.12, 5200, '+'),
    createData(10.89, 4300, '+++')
];
function CollapsibleTable({ checkedIndex, setCheckedIndex }) {
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableContainer__WEBPACK_IMPORTED_MODULE_10__["default"], { component: _mui_material_Paper__WEBPACK_IMPORTED_MODULE_11__["default"] },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_Table__WEBPACK_IMPORTED_MODULE_12__["default"], { "aria-label": "collapsible table" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableHead__WEBPACK_IMPORTED_MODULE_13__["default"], null,
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableRow__WEBPACK_IMPORTED_MODULE_2__["default"], null,
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableCell__WEBPACK_IMPORTED_MODULE_3__["default"], null),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableCell__WEBPACK_IMPORTED_MODULE_3__["default"], null, "SCI"),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableCell__WEBPACK_IMPORTED_MODULE_3__["default"], { align: "right" }, "Est. Time (s)"),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableCell__WEBPACK_IMPORTED_MODULE_3__["default"], { align: "center" }, "Availability"))),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material_TableBody__WEBPACK_IMPORTED_MODULE_14__["default"], null, rows.map((row, index) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(Row, { key: index, row: row, rowIndex: index, checkedIndex: index === checkedIndex, setSelectedIndex: () => {
                    const newValue = index === checkedIndex ? null : index;
                    setCheckedIndex(newValue);
                } })))))));
}


/***/ }),

/***/ "./lib/dialog/CreateChartDialog.js":
/*!*****************************************!*\
  !*** ./lib/dialog/CreateChartDialog.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ CreateChartDialog)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material_Button__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! @mui/material/Button */ "./node_modules/@mui/material/Button/Button.js");
/* harmony import */ var _mui_material_TextField__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @mui/material/TextField */ "./node_modules/@mui/material/TextField/TextField.js");
/* harmony import */ var _mui_material_Dialog__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material/Dialog */ "./node_modules/@mui/material/Dialog/Dialog.js");
/* harmony import */ var _mui_material_DialogActions__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @mui/material/DialogActions */ "./node_modules/@mui/material/DialogActions/DialogActions.js");
/* harmony import */ var _mui_material_DialogContent__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @mui/material/DialogContent */ "./node_modules/@mui/material/DialogContent/DialogContent.js");
/* harmony import */ var _mui_material_DialogContentText__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @mui/material/DialogContentText */ "./node_modules/@mui/material/DialogContentText/DialogContentText.js");
/* harmony import */ var _mui_material_DialogTitle__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @mui/material/DialogTitle */ "./node_modules/@mui/material/DialogTitle/DialogTitle.js");
/* harmony import */ var _components_SelectComponent__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../components/SelectComponent */ "./lib/components/SelectComponent.js");
/* harmony import */ var _helpers_constants__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../helpers/constants */ "./lib/helpers/constants.js");










const isValidUrl = (urlString) => {
    const urlPattern = new RegExp('^(http?:\\/\\/)?' + // validate protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // validate domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // validate OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // validate port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // validate query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // validate fragment locator
    return !!urlPattern.test(urlString);
};
function CreateChartDialog({ open, handleClose, sendNewMetrics, sendNewUrl }) {
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null,
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Dialog__WEBPACK_IMPORTED_MODULE_1__["default"], { open: open, onClose: (_e, reason) => {
                if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                    return;
                }
                else {
                    handleClose(true);
                }
            }, slotProps: {
                paper: {
                    component: 'form',
                    onSubmit: (event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        const formJson = Object.fromEntries(formData.entries());
                        if (_helpers_constants__WEBPACK_IMPORTED_MODULE_2__.METRICS_GRAFANA_KEY in formJson) {
                            const metrics = formJson.metrics_grafana;
                            sendNewMetrics(metrics.split(','));
                        }
                        if (_helpers_constants__WEBPACK_IMPORTED_MODULE_2__.URL_GRAFANA_KEY in formJson) {
                            const url = formJson.url_grafana;
                            // Only send the URl if it is valid, since it is optional.
                            if (isValidUrl(url)) {
                                sendNewUrl(url);
                            }
                        }
                        else {
                            throw 'Some error happened with the form.';
                        }
                    }
                }
            } },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_DialogTitle__WEBPACK_IMPORTED_MODULE_3__["default"], null, "Add Metric Chart"),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_DialogContent__WEBPACK_IMPORTED_MODULE_4__["default"], null,
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_DialogContentText__WEBPACK_IMPORTED_MODULE_5__["default"], null, "To create a chart, you must either select a metric from the list, and/or provide the URL from the Grafana's dashboard."),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_components_SelectComponent__WEBPACK_IMPORTED_MODULE_6__["default"], null),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_TextField__WEBPACK_IMPORTED_MODULE_7__["default"], { autoFocus: true, 
                    // required
                    margin: "dense", id: "name", name: _helpers_constants__WEBPACK_IMPORTED_MODULE_2__.URL_GRAFANA_KEY, label: "Grafana URL", type: "url", fullWidth: true, variant: "outlined", size: "small" })),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_DialogActions__WEBPACK_IMPORTED_MODULE_8__["default"], null,
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Button__WEBPACK_IMPORTED_MODULE_9__["default"], { onClick: () => handleClose(true), sx: { textTransform: 'none' } }, "Cancel"),
                react__WEBPACK_IMPORTED_MODULE_0__.createElement(_mui_material_Button__WEBPACK_IMPORTED_MODULE_9__["default"], { type: "submit", sx: { textTransform: 'none' } }, "Create")))));
}


/***/ }),

/***/ "./lib/helpers/constants.js":
/*!**********************************!*\
  !*** ./lib/helpers/constants.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DEFAULT_REFRESH_RATE: () => (/* binding */ DEFAULT_REFRESH_RATE),
/* harmony export */   METRICS_GRAFANA_KEY: () => (/* binding */ METRICS_GRAFANA_KEY),
/* harmony export */   URL_GRAFANA_KEY: () => (/* binding */ URL_GRAFANA_KEY)
/* harmony export */ });
const DEFAULT_REFRESH_RATE = 2;
const URL_GRAFANA_KEY = 'url_grafana';
const METRICS_GRAFANA_KEY = 'metrics_grafana';


/***/ }),

/***/ "./lib/helpers/utils.js":
/*!******************************!*\
  !*** ./lib/helpers/utils.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   downSample: () => (/* binding */ downSample),
/* harmony export */   parseData: () => (/* binding */ parseData),
/* harmony export */   shortNumber: () => (/* binding */ shortNumber)
/* harmony export */ });
// Downsample: pick every Nth point to reduce chart density
function downSample(data, maxPoints = 250) {
    if (data.length <= maxPoints) {
        return data;
    }
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, idx) => idx % step === 0);
}
const parseData = (data) => data.map(([timestamp, value]) => ({
    date: new Date(timestamp * 1000),
    value: Number(value)
}));
function shortNumber(num, digits = 3) {
    if (num === null || num === undefined) {
        return '';
    }
    const units = [
        { value: 1e12, symbol: 'T' },
        { value: 1e9, symbol: 'B' },
        { value: 1e6, symbol: 'M' },
        { value: 1e3, symbol: 'K' }
    ];
    for (const unit of units) {
        if (Math.abs(num) >= unit.value) {
            return ((num / unit.value).toFixed(digits).replace(/\.0+$/, '') + unit.symbol);
        }
    }
    return num.toString();
}


/***/ }),

/***/ "./lib/index.js":
/*!**********************!*\
  !*** ./lib/index.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _jupyterlab_application__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/application */ "webpack/sharing/consume/default/@jupyterlab/application");
/* harmony import */ var _jupyterlab_application__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_application__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/apputils */ "webpack/sharing/consume/default/@jupyterlab/apputils");
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _widget__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./widget */ "./lib/widget.js");



/**
 * Main reference: https://github.com/jupyterlab/extension-examples/blob/71486d7b891175fb3883a8b136b8edd2cd560385/react/react-widget/src/index.ts
 * And all other files in the repo.
 */
const namespaceId = 'gdapod';
/**
 * Initialization data for the GreenDIGIT JupyterLab extension.
 */
const plugin = {
    id: 'jupyterlab-greendigit',
    description: 'GreenDIGIT App',
    autoStart: true,
    requires: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.ICommandPalette, _jupyterlab_application__WEBPACK_IMPORTED_MODULE_0__.ILayoutRestorer],
    activate: async (app, palette, restorer) => {
        // console.log('JupyterLab extension GreenDIGIT is activated!');
        const { shell } = app;
        // Create a widget tracker
        const tracker = new _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.WidgetTracker({
            namespace: namespaceId
        });
        // Ensure the tracker is restored properly on refresh
        restorer.restore(tracker, {
            command: `${namespaceId}:open`,
            name: () => 'greendigit-jupyterlab'
            // when: app.restored, // Ensure restorer waits for the app to be fully restored
        });
        // Define a widget creator function
        const newWidget = async () => {
            const content = new _widget__WEBPACK_IMPORTED_MODULE_2__.MainWidget();
            const widget = new _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.MainAreaWidget({ content });
            widget.id = 'greendigit-jupyterlab';
            widget.title.label = 'GreenDIGIT Dashboard';
            widget.title.closable = true;
            return widget;
        };
        // Add an application command
        const openCommand = `${namespaceId}:open`;
        app.commands.addCommand(openCommand, {
            label: 'Open GreenDIGIT Dashboard',
            execute: async () => {
                let widget = tracker.currentWidget;
                if (!widget || widget.isDisposed) {
                    widget = await newWidget();
                    // Add the widget to the tracker and shell
                    tracker.add(widget);
                    shell.add(widget, 'main');
                }
                if (!widget.isAttached) {
                    shell.add(widget, 'main');
                }
                shell.activateById(widget.id);
            }
        });
        // Add the command to the palette
        palette.addItem({ command: openCommand, category: 'Sustainability' });
        // Restore the widget if available
        if (!tracker.currentWidget) {
            const widget = await newWidget();
            tracker.add(widget);
            shell.add(widget, 'main');
        }
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (plugin);


/***/ }),

/***/ "./lib/pages/ChartsPage.js":
/*!*********************************!*\
  !*** ./lib/pages/ChartsPage.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ChartsPage)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _components_AddButton__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../components/AddButton */ "./lib/components/AddButton.js");
/* harmony import */ var _dialog_CreateChartDialog__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../dialog/CreateChartDialog */ "./lib/dialog/CreateChartDialog.js");
/* harmony import */ var _components_ChartWrapper__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../components/ChartWrapper */ "./lib/components/ChartWrapper.js");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _components_GoBackButton__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../components/GoBackButton */ "./lib/components/GoBackButton.js");






const CONFIG_BASE_URL = 'http://localhost:3000/';
const DEFAULT_SRC_IFRAME = `${CONFIG_BASE_URL}d-solo/behmsglt2r08wa/memory-and-cpu?orgId=1&from=1743616284487&to=1743621999133&timezone=browser&theme=light&panelId=1&__feature.dashboardSceneSolo`;
function ChartsPage({ handleGoBack }) {
    const [iframeMap, setIFrameMap] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(new Map());
    const [createChartOpen, setCreateChartOpen] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(false);
    function handleDeleteIFrame(keyId) {
        setIFrameMap(prevMap => {
            const newMap = new Map(prevMap);
            newMap === null || newMap === void 0 ? void 0 : newMap.delete(keyId);
            return newMap;
        });
    }
    function createIFrame({ src, height, width, keyId }) {
        return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_ChartWrapper__WEBPACK_IMPORTED_MODULE_2__["default"], { keyId: keyId, src: src, width: width, height: height, onDelete: handleDeleteIFrame }));
    }
    function createChart(newUrl) {
        const newKeyId = Number(String(Date.now()) + String(Math.round(Math.random() * 10000)));
        const iframe = createIFrame({
            src: newUrl !== null && newUrl !== void 0 ? newUrl : DEFAULT_SRC_IFRAME,
            height: 400,
            width: 600,
            keyId: newKeyId
        });
        return [newKeyId, iframe];
    }
    function handleOpenCreateChartDialog() {
        setCreateChartOpen(true);
    }
    function handleNewMetrics(newMetrics) {
        const newMap = new Map(iframeMap);
        for (let i = 0; i < newMetrics.length; i++) {
            newMap.set(...createChart(DEFAULT_SRC_IFRAME));
        }
        setIFrameMap(newMap);
        setCreateChartOpen(false);
    }
    function handleSubmitUrl(newUrl) {
        const newMap = new Map(iframeMap);
        newMap.set(...createChart(newUrl));
        // setIFrameMap(newMap);
    }
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: { display: 'flex', flexDirection: 'column' } },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: { display: 'flex' } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_GoBackButton__WEBPACK_IMPORTED_MODULE_3__["default"], { handleClick: handleGoBack })),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_AddButton__WEBPACK_IMPORTED_MODULE_4__["default"], { handleClickButton: handleOpenCreateChartDialog }),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: { display: 'flex', flexDirection: 'row' } }, iframeMap ? iframeMap.values() : null),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_dialog_CreateChartDialog__WEBPACK_IMPORTED_MODULE_5__["default"], { open: createChartOpen, handleClose: (isCancel) => isCancel && setCreateChartOpen(false), sendNewMetrics: handleNewMetrics, sendNewUrl: (url) => handleSubmitUrl(url) })));
}


/***/ }),

/***/ "./lib/pages/GeneralDashboard.js":
/*!***************************************!*\
  !*** ./lib/pages/GeneralDashboard.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ GeneralDashboard)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var dayjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! dayjs */ "webpack/sharing/consume/default/dayjs/dayjs?efe8");
/* harmony import */ var dayjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(dayjs__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _components_ScaphChart__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../components/ScaphChart */ "./lib/components/ScaphChart.js");
/* harmony import */ var _api_getScaphData__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../api/getScaphData */ "./lib/api/getScaphData.js");
/* harmony import */ var _components_MetricSelector__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../components/MetricSelector */ "./lib/components/MetricSelector.js");
/* harmony import */ var _components_DateTimeRange__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../components/DateTimeRange */ "./lib/components/DateTimeRange.js");
/* harmony import */ var _components_KPIComponent__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../components/KPIComponent */ "./lib/components/KPIComponent.js");








const styles = {
    main: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        flexWrap: 'wrap',
        boxSizing: 'border-box',
        padding: '10px',
        whiteSpace: 'nowrap'
    },
    grid: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    },
    chartsWrapper: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center'
    }
};
const NR_CHARTS = 4;
const end = Math.floor(Date.now() / 1000);
const start = end - 3600; // last hour
const endDateJs = dayjs__WEBPACK_IMPORTED_MODULE_1___default()(end * 1000);
const startDateJs = dayjs__WEBPACK_IMPORTED_MODULE_1___default()(start * 1000);
const DEFAULT_METRICS = {
    energyConsumed: 2.7,
    carbonIntensity: 400,
    embodiedEmissions: 50000,
    functionalUnit: 10,
    hepScore23: 42.3 // HEPScore23
};
function GeneralDashboard() {
    const [startDate, setStartDate] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(startDateJs);
    const [endDate, setEndDate] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(endDateJs);
    const [metrics, setMetrics] = react__WEBPACK_IMPORTED_MODULE_0___default().useState([]);
    const [dataMap, setDataMap] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(new Map());
    const [selectedMetric, setSelectedMetric] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(new Array(NR_CHARTS).fill(''));
    const [loading, setLoading] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(true);
    function handleUpdateSelectedMetric(index, newMetric) {
        setSelectedMetric(prev => {
            const updated = [...prev];
            updated[index] = newMetric;
            return updated;
        });
    }
    react__WEBPACK_IMPORTED_MODULE_0___default().useEffect(() => {
        setLoading(true);
        (0,_api_getScaphData__WEBPACK_IMPORTED_MODULE_3__["default"])({ startTime: startDate.unix(), endTime: endDate.unix() }).then(results => {
            if (results.size === 0) {
                console.error('No metrics found');
                setLoading(false);
                return;
            }
            setDataMap(results);
            const keys = Array.from(results.keys());
            setMetrics(keys);
            setLoading(false);
        });
    }, [startDate, endDate]);
    react__WEBPACK_IMPORTED_MODULE_0___default().useEffect(() => {
        for (let i = 0; i < NR_CHARTS; i++) {
            if (selectedMetric[i] === '') {
                handleUpdateSelectedMetric(i, metrics[i] || '');
            }
        }
    }, [metrics]);
    const Charts = [];
    for (let i = 0; i < NR_CHARTS; i++) {
        Charts.push(react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Grid2, { sx: { m: 5 } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Paper, { elevation: 0, sx: {
                    p: 2,
                    width: '100%',
                    borderRadius: 3,
                    border: '1px solid #ccc'
                } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_MetricSelector__WEBPACK_IMPORTED_MODULE_4__["default"], { selectedMetric: selectedMetric[i], setSelectedMetric: newMetric => handleUpdateSelectedMetric(i, newMetric), metrics: metrics }),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_ScaphChart__WEBPACK_IMPORTED_MODULE_5__["default"], { key: `${selectedMetric}-${i}`, rawData: dataMap.get(selectedMetric[i]) || [] }))));
    }
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: styles.main },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Paper, { key: "grid-element-main", style: {
                ...styles.grid,
                flexDirection: 'column',
                minWidth: '100%',
                minHeight: '300px',
                borderRadius: '15px'
            }, elevation: 3 }, loading ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_2__.CircularProgress, null)) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Grid2, { sx: { width: '100%', height: '100%' } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Grid2, { sx: {
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between'
                } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Grid2, null,
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_DateTimeRange__WEBPACK_IMPORTED_MODULE_6__["default"], { startTime: startDate, endTime: endDate, onStartTimeChange: newValue => {
                            if (newValue) {
                                setStartDate(newValue);
                            }
                        }, onEndTimeChange: newValue => {
                            if (newValue) {
                                setEndDate(newValue);
                            }
                        } })),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Grid2, { sx: {
                        ...styles.grid,
                        p: 2,
                        m: 2,
                        border: '1px solid #ccc',
                        borderRadius: '15px'
                    } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_KPIComponent__WEBPACK_IMPORTED_MODULE_7__.KPIComponent, { metrics: DEFAULT_METRICS }))),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Grid2, { sx: { ...styles.chartsWrapper } }, Charts))))));
}


/***/ }),

/***/ "./lib/pages/GrafanaPage.js":
/*!**********************************!*\
  !*** ./lib/pages/GrafanaPage.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ GrafanaPage)
/* harmony export */ });
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _components_GoBackButton__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../components/GoBackButton */ "./lib/components/GoBackButton.js");



const mc_grafana_url = 'https://mc-a4.lab.uvalight.net/grafana/';
function GrafanaPage({ handleGoBack }) {
    return (react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_0__.Grid2, { sx: { display: 'flex', flexDirection: 'column' } },
        react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_0__.Grid2, { sx: { display: 'flex' } },
            react__WEBPACK_IMPORTED_MODULE_1___default().createElement(_components_GoBackButton__WEBPACK_IMPORTED_MODULE_2__["default"], { handleClick: handleGoBack })),
        react__WEBPACK_IMPORTED_MODULE_1___default().createElement("iframe", { src: mc_grafana_url, width: "100%", height: "600", style: { border: 'none' } })));
}


/***/ }),

/***/ "./lib/pages/WelcomePage.js":
/*!**********************************!*\
  !*** ./lib/pages/WelcomePage.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ WelcomePage)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _GeneralDashboard__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./GeneralDashboard */ "./lib/pages/GeneralDashboard.js");



// import ScaphInstaller from '../components/ScaphInstaller';
const styles = {
    main: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
    },
    title: {
        my: 2
    },
    buttonGrid: {
        display: 'flex',
        width: '100%',
        gap: 3,
        justifyContent: 'center',
        alignContent: 'center',
        '& .MuiButtonBase-root': {
            textTransform: 'none'
        },
        mb: 2
    }
};
function WelcomePage({ handleRealTimeClick, handlePredictionClick, handleGrafanaClick }) {
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: styles.main },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Typography, { variant: "h4", sx: styles.title }, "GreenDIGIT Dashboard"),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Grid2, { sx: styles.buttonGrid },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Button, { variant: "outlined", disabled: true, onClick: handleRealTimeClick }, "Real-time Tracking Monitor"),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Button, { variant: "outlined", onClick: handlePredictionClick }, "Resource Usage Prediction"),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_1__.Button, { variant: "outlined", disabled: true, onClick: handleGrafanaClick }, "Grafana Dashboard")),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_GeneralDashboard__WEBPACK_IMPORTED_MODULE_2__["default"], null)));
}


/***/ }),

/***/ "./lib/widget.js":
/*!***********************!*\
  !*** ./lib/widget.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MainWidget: () => (/* binding */ MainWidget),
/* harmony export */   Page: () => (/* binding */ Page)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/apputils */ "webpack/sharing/consume/default/@jupyterlab/apputils");
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/material */ "webpack/sharing/consume/default/@mui/material/@mui/material");
/* harmony import */ var _mui_material__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_mui_material__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _pages_ChartsPage__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./pages/ChartsPage */ "./lib/pages/ChartsPage.js");
/* harmony import */ var _pages_WelcomePage__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./pages/WelcomePage */ "./lib/pages/WelcomePage.js");
/* harmony import */ var _components_VerticalLinearStepper__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./components/VerticalLinearStepper */ "./lib/components/VerticalLinearStepper.js");
/* harmony import */ var _components_GoBackButton__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./components/GoBackButton */ "./lib/components/GoBackButton.js");
/* harmony import */ var _pages_GrafanaPage__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./pages/GrafanaPage */ "./lib/pages/GrafanaPage.js");








const styles = {
    main: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        flexWrap: 'wrap',
        boxSizing: 'border-box',
        padding: '3px'
    },
    grid: {
        display: 'flex',
        flexDirection: 'column',
        whiteSpace: 'wrap',
        // justifyContent: 'center',
        // alignItems: 'center',
        flex: '0 1 100%',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        padding: '10px'
    }
};
function Prediction({ handleGoBack }) {
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Grid2, { sx: { width: '100%', px: 3, py: 5 } },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_GoBackButton__WEBPACK_IMPORTED_MODULE_3__["default"], { handleClick: handleGoBack }),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_VerticalLinearStepper__WEBPACK_IMPORTED_MODULE_4__["default"], null)));
}
var Page;
(function (Page) {
    Page[Page["WelcomePage"] = 0] = "WelcomePage";
    Page[Page["ChartsPage"] = 1] = "ChartsPage";
    Page[Page["Prediction"] = 2] = "Prediction";
    Page[Page["Grafana"] = 3] = "Grafana";
})(Page || (Page = {}));
/**
 * React component for a counter.
 *
 * @returns The React component
 */
const App = () => {
    const [activePageState, setActivePageState] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(Page.WelcomePage);
    function handleRealTimeClick() {
        setActivePageState(Page.ChartsPage);
    }
    function handlePredictionClick() {
        setActivePageState(Page.Prediction);
    }
    function handleGrafanaClick() {
        setActivePageState(Page.Grafana);
    }
    function goToMainPage() {
        setActivePageState(Page.WelcomePage);
    }
    const ActivePage = {
        [Page.WelcomePage]: (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_pages_WelcomePage__WEBPACK_IMPORTED_MODULE_5__["default"], { handleRealTimeClick: handleRealTimeClick, handlePredictionClick: handlePredictionClick, handleGrafanaClick: handleGrafanaClick })),
        [Page.ChartsPage]: react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_pages_ChartsPage__WEBPACK_IMPORTED_MODULE_6__["default"], { handleGoBack: goToMainPage }),
        [Page.Prediction]: react__WEBPACK_IMPORTED_MODULE_0___default().createElement(Prediction, { handleGoBack: goToMainPage }),
        [Page.Grafana]: react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_pages_GrafanaPage__WEBPACK_IMPORTED_MODULE_7__["default"], { handleGoBack: goToMainPage })
    };
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: styles.main },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_mui_material__WEBPACK_IMPORTED_MODULE_2__.Paper, { style: styles.grid }, ActivePage[activePageState])));
};
/**
 * A Counter Lumino Widget that wraps a CounterComponent.
 */
class MainWidget extends _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.ReactWidget {
    /**
     * Constructs a new CounterWidget.
     */
    constructor() {
        super();
        this.addClass('jp-ReactWidget');
    }
    render() {
        return react__WEBPACK_IMPORTED_MODULE_0___default().createElement(App, null);
    }
}


/***/ })

}]);
//# sourceMappingURL=lib_index_js-webpack_sharing_consume_default_dayjs_dayjs.795d1dc74ca4e17c83c7.js.map