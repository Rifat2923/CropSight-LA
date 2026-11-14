  // =====================================================================
// CropSight-LA - Earth Engine App
// Vegetation indices (NDVI, NDRE, EVI) + Historical Weather (GRIDMET) +
// 16-Day Forecast (GFS) + Soil (SOLUS100, gNATSGO) + Field Station Data
// (LaCADIAN) + Crop Section
// Theme: Dark Forest (#0d3d2b) & Lime (#4ade80)
// =====================================================================

// ---------------------------------------------------------------------
// 0. GLOBAL STATE
// ---------------------------------------------------------------------
var MAX_FIELDS = 5;
var maxFieldsAllowed = 1;
var fieldFeatures = [];
var startDateValue = null;     // stays null until the user picks Year, Month and Day (Section 3)
var endDateValue   = null;     // stays null until the user picks Year, Month and Day (Section 3)
var plantingDateValue = null;  // stays null until the user picks Year, Month and Day (Section 8)
var CLOUD_FILTER_DEFAULT = 20; // starting value of the cloud slider (Clear All returns to it)
var CLOUD_FILTER = CLOUD_FILTER_DEFAULT;
var currentVegIndex = 'NDVI';
// ---------------------------------------------------------------------
// THEME — Dark Forest & Lime (defined first so all UI elements can use them)
// ---------------------------------------------------------------------
var COLOR_FOREST      = '#0d3d2b';  // dark forest (primary: headers, bars, buttons)
var COLOR_LIME        = '#4ade80';  // lime (accent text)
var COLOR_LIME_SOFT   = '#86efac';  // soft lime (header subtitle)
var COLOR_MINT        = '#f0fdf4';  // mint panel background
var COLOR_FOREST_DEEP = '#064e3b';  // deep forest (body text)

// ---------------------------------------------------------------------
// LACADIAN — LSU AgCenter Ground Station Network (24 stations)
// Data flow: Azure Blob -> lacadian_upload.py (daily GitHub Action) -> GEE assets.
// REMINDER: the pipeline's Azure SAS token expires 2027-03-01. Renew it and
// update the LACADIAN_SAS_TOKEN GitHub secret before then.
// ---------------------------------------------------------------------
var LACADIAN_STATIONS = [
  {name: 'Ben Hur',         file: 'LAC001_Ben_Hur',         lat: 30.373, lon: -91.164},
  {name: 'Hammond',         file: 'LAC002_Hammond',         lat: 30.504, lon: -90.377},
  {name: 'St Gabriel',      file: 'LAC003_StGabriel',       lat: 30.268, lon: -91.098},
  {name: 'Homer',           file: 'LAC004_Homer',           lat: 32.754, lon: -93.071},
  {name: 'Bossier City',    file: 'LAC005_BossierCity',     lat: 32.411, lon: -93.639},
  {name: 'Winnsboro',       file: 'LAC006_Winnsboro',       lat: 32.146, lon: -91.690},
  {name: 'Chase',           file: 'LAC007_Chase',           lat: 32.100, lon: -91.708},
  {name: 'Alexandria West', file: 'LAC008_Alexandria_West', lat: 31.167, lon: -92.411},
  {name: 'Alexandria East', file: 'LAC009_Alexandria_East', lat: 31.175, lon: -92.389},
  {name: 'St Joseph',       file: 'LAC010_StJoseph',        lat: 31.950, lon: -91.234},
  {name: 'Franklinton',     file: 'LAC011_Franklinton',     lat: 30.786, lon: -90.202},
  {name: 'Clinton',         file: 'LAC012_Clinton',         lat: 30.815, lon: -90.969},
  {name: 'Jeanerette',      file: 'LAC013_Jeanerette',      lat: 29.960, lon: -91.713},
  {name: 'Crowley',         file: 'LAC014_Crowley',         lat: 30.178, lon: -92.354},
  {name: 'Amite',           file: 'LAC015_Amite',           lat: 30.701, lon: -90.431},
  {name: 'LA House',        file: 'LAC016_LAHouse',         lat: 30.404, lon: -91.189},
  {name: 'Lake Providence', file: 'LAC017_LakeProvidence',  lat: 32.751, lon: -91.272},
  {name: 'Tallulah',        file: 'LAC018_Tallulah',        lat: 32.444, lon: -91.159},
  {name: 'Newellton',       file: 'LAC019_Newellton',       lat: 32.099, lon: -91.252},
  {name: 'Deridder',        file: 'LAC020_Deridder',        lat: 30.802, lon: -93.163},
  {name: 'Kinder',          file: 'LAC021_Kinder',          lat: 30.510, lon: -92.830},
  {name: 'Leeville',        file: 'LAC022_Leeville',        lat: 31.173, lon: -93.160},
  {name: 'St Francisville', file: 'LAC023_StFrancisville',  lat: 30.981, lon: -91.348},
  {name: 'Oak Grove',       file: 'LAC024_OakGrove',        lat: 32.791, lon: -91.558}
];

// All 36 daily variables — sanitized names matching the uploaded GEE asset properties.
// Raw header names (e.g. 'air_temp_ave_degC') are sanitized during upload:
//   ( ) → _    /  → _per_    % → pct    multiple _ collapsed    trailing _ stripped
var LACADIAN_VARS = [
  'air_temp_ave_degC',
  'air_temp_max_degC',
  'air_temp_min_degC',
  'atmospheric_pressure_kPa',
  'gust_speed_m_per_s',
  'land_surface_temp_ave_degC',
  'land_surface_temp_max_degC',
  'land_surface_temp_min_degC',
  'matric_potential_20cm_kPa',
  'matric_potential_50cm_kPa',
  'matric_potential_5cm_kPa',
  'NDVI_DAILY',
  'precipitation_EC_mS_per_cm',
  'relative_humidity_ave_pct',
  'relative_humidity_max_pct',
  'relative_humidity_min_pct',
  'saturation_extract_EC_10cm_mS_per_cm',
  'saturation_extract_EC_100cm_mS_per_cm',
  'saturation_extract_EC_20cm_mS_per_cm',
  'saturation_extract_EC_50cm_mS_per_cm',
  'saturation_extract_EC_5cm_mS_per_cm',
  'soil_moisture_10cm_m3_per_m3',
  'soil_moisture_100cm_m3_per_m3',
  'soil_moisture_20cm_m3_per_m3',
  'soil_moisture_50cm_m3_per_m3',
  'soil_moisture_5cm_m3_per_m3',
  'soil_temperature_10cm_degC',
  'soil_temperature_100cm_degC',
  'soil_temperature_20cm_degC',
  'soil_temperature_50cm_degC',
  'soil_temperature_5cm_degC',
  'solar_radiation_W_per_m2',
  'total_precipitation_mm',
  'vapor_pressure_kPa',
  'VPD_mean_kPa',
  'wind_speed_m_per_s'
];

var lacadianNearestStation = null;  // tracks the currently displayed station
var lacadianRequestGen = 0;         // discards results from superseded requests
// LaCADIAN team guidance: station data are not representative beyond about
// 50 km (rainfall and soil moisture can differ even a few km apart). Beyond
// this distance the data are still shown, with a warning.
var LACADIAN_MAX_DIST_KM = 50;

function haversineDist(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestStation(lat, lon) {
  var nearest = null, minDist = Infinity;
  for (var i = 0; i < LACADIAN_STATIONS.length; i++) {
    var s = LACADIAN_STATIONS[i];
    var d = haversineDist(lat, lon, s.lat, s.lon);
    if (d < minDist) { minDist = d; nearest = s; }
  }
  return {station: nearest, distKm: Math.round(minDist)};
}

// Section divider: lime text on dark forest strip
var sectionDivider = function(text) {
  return ui.Label(text, {
    margin: '0px', padding: '8px 12px 6px 12px',
    fontWeight: 'bold', fontSize: '13px',
    color: COLOR_LIME, backgroundColor: COLOR_FOREST,
    textAlign: 'center', stretch: 'horizontal'
  });
};

// ---------------------------------------------------------------------
// CROP SETTINGS (Louisiana crops) — values from manuscript Table 2
// What each field means:
//   tbase  = crop does not accumulate heat units below this °C        [20]
//   tupper = heat above this °C adds no extra heat units              [20]
//   kcIni / kcMid / kcEnd = FAO-56 crop coefficients (Table 12; the
//            midpoint is used where FAO-56 gives a range)             [18]
//   heatStressThresh = count days with Tmax above this °C
//   freezeThresh     = count days with Tmin below this °C (for rice this
//            is a chilling limit; for all other crops a freeze limit)
//   coldLabel (optional) = name for the cold-day count; default "Freeze Risk Days"
//   stageGdd = GDD (°C-days) of the four FAO-56 growth stages:
//            [initial, development, mid-season, late season]. Each value
//            is the average of the short- and long-season values in
//            Paredes et al. (2025) [20]; the season total is their sum.
//   totalGdd = season total, used only for crops with no stage values
//            in [20]; the four stages then end at 18%, 43%, 80% and 100%
//            of this total (see ESTIMATED_STAGE_SPLIT).
// Daily weather comes from GRIDMET. These are published or estimated
// defaults, not measurements from the drawn field or from LaCADIAN.
// ---------------------------------------------------------------------
var STAGE_NAMES = ['Initial', 'Development', 'Mid-season', 'Late season'];
// Stage shares for crops with only a season total: 18% / 25% / 37% / 20%
// (stages end at 18%, 43%, 80% and 100% of the total). These are the
// average stage shares of the six crops with stage values in [20]
// (rice, cotton, corn, soybeans, wheat, sorghum), rounded to whole %.
var ESTIMATED_STAGE_SPLIT = [0.18, 0.25, 0.37, 0.20];

var CROP_CONFIG = {
  // totalGdd for Sugarcane, Sweet Potatoes and Pasture & Forage: season
  // GDD summed per GRIDMET pixel, averaged over Louisiana and over
  // 1996–2025 (Table 2, footnote e). Season = midpoint of the NASS
  // most-active planting period to midpoint of the most-active harvest
  // period [21]; ratoon sugarcane from 1 January; pasture over the NASS
  // hay harvest period (17 Apr – 14 Sep).
  'Sugarcane': {
    tbase: 10, tupper: 45, kcIni: 0.40, kcMid: 1.25, kcEnd: 0.75,
    heatStressThresh: 35, freezeThresh: 0,
    totalGdd: 3651                          // ratoon season, 1 Jan – 17 Nov
  },
  'Rice': {
    tbase: 12, tupper: 35, kcIni: 1.05, kcMid: 1.20, kcEnd: 0.75,
    heatStressThresh: 35, freezeThresh: 15, coldLabel: 'Cold Stress Days',  // chilling limit
    stageGdd: [245, 477.5, 702.5, 307.5]     // total 1732.5
  },
  'Cotton': {
    tbase: 12.5, tupper: 35, kcIni: 0.35, kcMid: 1.18, kcEnd: 0.60,
    heatStressThresh: 32, freezeThresh: -1,
    stageGdd: [312.5, 712.5, 707.5, 317.5]   // total 2050
  },
  'Corn': {
    tbase: 10, tupper: 32, kcIni: 0.30, kcMid: 1.20, kcEnd: 0.48,
    heatStressThresh: 35, freezeThresh: -1,
    stageGdd: [247.5, 400, 637.5, 402.5]     // total 1687.5
  },
  'Soybeans': {
    tbase: 10, tupper: 40, kcIni: 0.40, kcMid: 1.15, kcEnd: 0.50,
    heatStressThresh: 35, freezeThresh: -2,
    stageGdd: [305, 380, 665, 455]           // total 1805
  },
  // Clock starts at transplanting.
  'Sweet Potatoes': {
    tbase: 12, tupper: 30, kcIni: 0.50, kcMid: 1.15, kcEnd: 0.65,
    heatStressThresh: 35, freezeThresh: -1.9,
    totalGdd: 1859                          // 9 Jun – 10 Oct
  },
  'Wheat': {
    tbase: 0, tupper: 35, kcIni: 0.70, kcMid: 1.15, kcEnd: 0.33,
    heatStressThresh: 35, freezeThresh: -1,
    stageGdd: [477.5, 425, 585, 387.5]       // total 1875
  },
  // Bermudagrass hay; no single harvest, so the total only sets the Kc curve.
  'Pasture & Forage': {
    tbase: 10, tupper: 30, kcIni: 0.55, kcMid: 1.00, kcEnd: 0.85,
    heatStressThresh: 38, freezeThresh: -1.1,
    totalGdd: 2452                          // 17 Apr – 14 Sep
  },
  'Sorghum': {
    tbase: 10, tupper: 30, kcIni: 0.30, kcMid: 1.05, kcEnd: 0.55,
    heatStressThresh: 36, freezeThresh: -1,
    stageGdd: [280, 305, 610, 255]           // total 1450
  }
};

// Running GDD total at the END of each of the four stages, e.g. corn:
// [247.5, 647.5, 1285, 1687.5]. The last value is the season total.
(function() {
  Object.keys(CROP_CONFIG).forEach(function(name) {
    var c = CROP_CONFIG[name];
    var lengths = c.stageGdd || ESTIMATED_STAGE_SPLIT.map(function(f) { return f * c.totalGdd; });
    var run = 0;
    c.stageEnds = lengths.map(function(len) { run += len; return Math.round(run * 10) / 10; });
    c.totalGdd = c.stageEnds[3];
  });
})();

// Daily GDD, Eq. (3) of the manuscript (simple method, revised FAO-56 [20]):
//   Tavg = (Tmax + Tmin) / 2
//   GDD  = 0               if Tavg < Tbase
//        = Tavg − Tbase    if Tbase ≤ Tavg ≤ Tupper
//        = Tupper − Tbase  if Tavg > Tupper
function dailyGdd(tmax, tmin, c) {
  var tavg = (tmax + tmin) / 2;
  if (tavg < c.tbase) return 0;
  if (tavg > c.tupper) return c.tupper - c.tbase;
  return tavg - c.tbase;
}

// Daily crop coefficient from the FAO-56 Kc curve on the GDD axis:
//   initial      -> kcIni
//   development  -> rises linearly kcIni -> kcMid
//   mid-season   -> kcMid
//   late season  -> falls linearly kcMid -> kcEnd
//   past the season total -> held at kcEnd
function kcForGdd(cropName, cumGdd) {
  var c = CROP_CONFIG[cropName], e = c.stageEnds;
  if (cumGdd <= e[0]) return c.kcIni;
  if (cumGdd <= e[1]) return c.kcIni + (c.kcMid - c.kcIni) * (cumGdd - e[0]) / (e[1] - e[0]);
  if (cumGdd <= e[2]) return c.kcMid;
  if (cumGdd <= e[3]) return c.kcMid + (c.kcEnd - c.kcMid) * (cumGdd - e[2]) / (e[3] - e[2]);
  return c.kcEnd;
}

// Current stage: the first stage whose end has not been reached yet.
// Past the season total, heat units suggest harvest stage.
function determineGrowthStage(cropName, totalGDD) {
  var e = CROP_CONFIG[cropName].stageEnds;
  for (var i = 0; i < e.length; i++) {
    if (totalGDD < e[i]) return STAGE_NAMES[i];
  }
  if (cropName === 'Pasture & Forage') return 'Late season — season heat-unit total reached';
  return 'Late season — heat units suggest harvest stage';
}

// Points on the GDD axis where a new stage starts, plus the season total.
// Used for the chart's stage lines and the "Stages reached" dates.
function stageMilestones(cropName) {
  var e = CROP_CONFIG[cropName].stageEnds;
  return [
    {name: 'Development starts', gdd: e[0]},
    {name: 'Mid-season starts',  gdd: e[1]},
    {name: 'Late season starts', gdd: e[2]},
    {name: 'Season total',       gdd: e[3]}
  ];
}

// ---------------------------------------------------------------------
// 1. MAP + DRAWING TOOLS
// ---------------------------------------------------------------------
var appMap = ui.Map();
appMap.setOptions('HYBRID');
appMap.setCenter(-92, 31, 7);
appMap.style().set('cursor', 'crosshair');

var drawingTools = appMap.drawingTools();
drawingTools.setShape('polygon');
drawingTools.setDrawModes(['polygon']);
drawingTools.setLinked(false);
drawingTools.stop();

function hideFieldLayers() {
  var layers = drawingTools.layers();
  for (var i = 0; i < layers.length(); i++) layers.get(i).setShown(false);
}

function showFieldLayers() {
  var layers = drawingTools.layers();
  for (var i = 0; i < layers.length(); i++) layers.get(i).setShown(true);
}

function relabelFieldLayers() {
  var layers = drawingTools.layers();
  for (var i = 0; i < layers.length(); i++) layers.get(i).setName('Field ' + (i + 1));
  showFieldLayers();
}

function updateFieldFeatures() {
  fieldFeatures = [];
  var layers = drawingTools.layers();
  for (var i = 0; i < layers.length(); i++) {
    var geom = layers.get(i).getEeObject();
    if (geom) fieldFeatures.push(ee.Feature(geom, {field_id: i + 1, field_name: 'Field ' + (i + 1)}));
  }
  updateAreaDisplay();
}

function enforceFieldLimit() {
  if (drawingTools.layers().length() >= maxFieldsAllowed) drawingTools.stop();
  relabelFieldLayers();
  updateFieldFeatures();
}

// Compute and display AOI area in hectares and acres
var areaLabel = ui.Label('', {
  margin: '4px 8px 2px 8px', fontSize: '12px',
  fontWeight: 'bold', color: COLOR_FOREST
});

// Above this size the vegetation map can be very slow to draw (charts are
// unaffected). The map is not blocked; the user just gets a heads-up.
var LARGE_AREA_ACRES = 10000;   // = 4,047 ha
var largeAreaWarning = ui.Label(
  '⚠️ Large area (over 10,000 acres / 4,047 ha). The map may load slowly or not at all. ' +
  'Charts are unaffected.',
  {margin: '0 8px 4px 8px', padding: '4px 8px', fontSize: '11px', fontWeight: 'bold',
   color: '#b91c1c', backgroundColor: '#fee2e2', shown: false}
);

function updateAreaDisplay() {
  var geom = getFieldsGeometry();
  if (!geom) { areaLabel.setValue(''); largeAreaWarning.style().set('shown', false); return; }
  geom.area(1).evaluate(function(areaM2) {
    if (!areaM2) { areaLabel.setValue(''); largeAreaWarning.style().set('shown', false); return; }
    var ha    = (areaM2 / 10000).toFixed(1);
    var acres = (areaM2 / 4046.86).toFixed(1);
    areaLabel.setValue('AOI Area: ' + ha + ' ha  |  ' + acres + ' acres');
    largeAreaWarning.style().set('shown', areaM2 / 4046.86 > LARGE_AREA_ACRES);
  });
}

drawingTools.onDraw(ui.util.debounce(enforceFieldLimit, 200));
drawingTools.onEdit(ui.util.debounce(updateFieldFeatures, 200));
drawingTools.onErase(ui.util.debounce(function() { relabelFieldLayers(); updateFieldFeatures(); }, 200));

function getFieldsGeometry() {
  if (fieldFeatures.length === 0) return null;
  return ee.FeatureCollection(fieldFeatures).geometry();
}

// ---------------------------------------------------------------------
// 2. HEADER
// ---------------------------------------------------------------------
var titleLabel = ui.Label('CropSight-LA', {
  fontWeight: 'bold', fontSize: '20px',
  color: COLOR_LIME, backgroundColor: COLOR_FOREST,
  margin: '0px', padding: '14px 12px 4px 12px',
  textAlign: 'center', stretch: 'horizontal'
});

var introLabel = ui.Label(
  'MONITOR, FORECAST, AND VISUALIZE AGROCLIMATIC CONDITIONS FOR LOUISIANA CROPLANDS.',
  {margin: '0px', padding: '0 12px 14px 12px',
   fontSize: '12px', color: COLOR_LIME_SOFT, backgroundColor: COLOR_FOREST,
   textAlign: 'center', stretch: 'horizontal'}
);

var fieldInstructionLabel = ui.Label(
  'Select the number of fields (Max ' + MAX_FIELDS + ') and draw them on the map ——>',
  {margin: '10px 8px 4px 8px', fontWeight: 'bold', fontSize: '12px', color: COLOR_FOREST_DEEP}
);

var fieldCountSelect = ui.Select({
  items: ['1', '2', '3', '4', '5'],
  placeholder: 'No. of fields',
  style: {margin: '4px 8px', stretch: 'horizontal'},
  onChange: function(value) {
    maxFieldsAllowed = parseInt(value, 10);
    drawingTools.layers().reset([]);
    fieldFeatures = [];
    drawingTools.setShape('polygon');
    drawingTools.draw();
  }
});

// ---------------------------------------------------------------------
// 3. DATE RANGE
// ---------------------------------------------------------------------
var dateInstructionLabel = ui.Label(
  'Select dates for the vegetation index, historical weather and station data (recommended: up to 10 months)',
  {margin: '14px 8px 4px 8px', fontWeight: 'bold', fontSize: '12px', color: COLOR_FOREST_DEEP}
);

// ── Date dropdown helpers ─────────────────────────────────────────────
// Lists stop at today's date. Tomorrow is not offered until that day arrives.
var today = new Date();
function pad2(n) { return (n < 10 ? '0' : '') + n; }

var MONTH_NAMES_LIST = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var MONTH_NUMS_LIST  = ['01','02','03','04','05','06','07','08','09','10','11','12'];

var YEARS_LIST = [];
for (var yr = 2015; yr <= today.getFullYear(); yr++) YEARS_LIST.push('' + yr);

function monthsAllowed(yearStr) {
  var y = parseInt(yearStr, 10);
  var last = (y === today.getFullYear()) ? today.getMonth() : 11;
  return MONTH_NAMES_LIST.slice(0, last + 1);
}

function daysAllowed(yearStr, monthName) {
  var y = parseInt(yearStr, 10);
  var mi = MONTH_NAMES_LIST.indexOf(monthName);
  if (mi < 0) mi = 0;
  var last = new Date(y, mi + 1, 0).getDate();
  if (y === today.getFullYear() && mi === today.getMonth()) last = today.getDate();
  var out = [];
  for (var d = 1; d <= last; d++) out.push(pad2(d));
  return out;
}

function buildDateFromParts(y, mName, d) {
  var m = MONTH_NUMS_LIST[MONTH_NAMES_LIST.indexOf(mName)];
  if (!y || !m || !d) return null;
  return new Date(y + '-' + m + '-' + d);
}

// ── Start Date ────────────────────────────────────────────────────────
// No default dates: the user picks Year, Month and Day for both the Start
// and End Date (same pattern as the planting date in Section 8). Month stays
// empty until a Year is picked, and Day until a Month is picked. A part that
// no longer exists after a change (e.g. day 31 after switching to February)
// is cleared rather than silently moved to another date.
var startY = null, startM = null, startD = null;
var startYearSel, startMonthSel, startDaySel, startDatePanel;

// Update a date dropdown without wiping what it shows. Replacing a
// dropdown's options clears its displayed value, so the options are replaced
// only when they actually change (e.g. switching year changes which months
// exist). After a replacement the value is re-applied once the new options
// have rendered: first cleared, then set. Setting the SAME value again is
// ignored by Earth Engine (no redraw), so the brief clear forces a redraw and
// the dropdown shows the value instead of its placeholder.
function syncSelect(sel, items, value) {
  var current = sel.items().getJsArray();
  if (current.join('|') !== items.join('|')) {
    sel.items().reset(items);
    ui.util.setTimeout(function() {
      sel.setValue(null, false);
      sel.setValue(value, false);
    }, 0);
  }
  sel.setValue(value, false);
}

function applyStartDate() {
  var months = startY ? monthsAllowed(startY) : [];
  if (months.indexOf(startM) < 0) startM = null;
  var days = (startY && startM) ? daysAllowed(startY, startM) : [];
  if (days.indexOf(startD) < 0) startD = null;
  syncSelect(startYearSel,  YEARS_LIST, startY);
  syncSelect(startMonthSel, months, startM);
  syncSelect(startDaySel,   days, startD);
  startDateValue = (startY && startM && startD) ? buildDateFromParts(startY, startM, startD) : null;
}

startYearSel = ui.Select({
  items: YEARS_LIST, placeholder: 'Year', style: {margin: '0 2px', stretch: 'horizontal'},
  onChange: function(v) { startY = v; applyStartDate(); }
});
startMonthSel = ui.Select({
  items: [], placeholder: 'Month', style: {margin: '0 2px', stretch: 'horizontal'},
  onChange: function(v) { startM = v; applyStartDate(); }
});
startDaySel = ui.Select({
  items: [], placeholder: 'Day', style: {margin: '0 2px', stretch: 'horizontal'},
  onChange: function(v) { startD = v; applyStartDate(); }
});
startDatePanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'), style: {margin: '4px 8px'},
  widgets: [startYearSel, startMonthSel, startDaySel]
});

// ── End Date (no default; cannot pick a future day) ──────────────────
var endY = null, endM = null, endD = null;
var endYearSel, endMonthSel, endDaySel, endDatePanel;

// The top End Date applies to the vegetation index, historical weather and
// station data. The Crop Section has its own season end date.
function applyEndDate() {
  var months = endY ? monthsAllowed(endY) : [];
  if (months.indexOf(endM) < 0) endM = null;
  var days = (endY && endM) ? daysAllowed(endY, endM) : [];
  if (days.indexOf(endD) < 0) endD = null;
  syncSelect(endYearSel,  YEARS_LIST, endY);
  syncSelect(endMonthSel, months, endM);
  syncSelect(endDaySel,   days, endD);
  endDateValue = (endY && endM && endD) ? buildDateFromParts(endY, endM, endD) : null;
}

endYearSel = ui.Select({
  items: YEARS_LIST, placeholder: 'Year', style: {margin: '0 2px', stretch: 'horizontal'},
  onChange: function(v) { endY = v; applyEndDate(); }
});
endMonthSel = ui.Select({
  items: [], placeholder: 'Month', style: {margin: '0 2px', stretch: 'horizontal'},
  onChange: function(v) { endM = v; applyEndDate(); }
});
endDaySel = ui.Select({
  items: [], placeholder: 'Day', style: {margin: '0 2px', stretch: 'horizontal'},
  onChange: function(v) { endD = v; applyEndDate(); }
});
endDatePanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'), style: {margin: '4px 8px'},
  widgets: [endYearSel, endMonthSel, endDaySel]
});

var startDateLabel = ui.Label('Start Date:', {margin: '4px 8px 0 8px', fontSize: '11px', color: COLOR_FOREST_DEEP});
var endDateLabel   = ui.Label('End Date:',   {margin: '4px 8px 0 8px', fontSize: '11px', color: COLOR_FOREST_DEEP});
var statusLabel    = ui.Label('', {margin: '6px 8px', fontSize: '12px', color: '#a66'});

// 10 months is a recommendation, not a hard limit (like the large-area AOI
// warning): longer ranges still run but may load slowly or not at all.
var RECOMMENDED_MAX_DAYS = 10 * 30;

// Returns a message if the dates cannot be used (missing or reversed),
// otherwise null. Checked in the browser; no server request needed.
function dateProblem() {
  if (!startDateValue || !endDateValue) return 'Please select a Start Date and End Date.';
  if (endDateValue.getTime() < startDateValue.getTime()) return 'End Date must be after Start Date.';
  return null;
}

// Call only after dateProblem() returned null.
function showDateRangeStatus() {
  var days = Math.round((endDateValue.getTime() - startDateValue.getTime()) / 86400000);
  if (days > RECOMMENDED_MAX_DAYS) {
    statusLabel.setValue('⚠️ Date range is longer than the recommended 10 months (' + days +
                         ' days). Charts may load slowly or not at all.');
  } else {
    statusLabel.setValue('Date range OK (' + days + ' days).');
  }
}

// ---------------------------------------------------------------------
// 4. VEGETATION INDICES (NDVI, NDRE, EVI)
// ---------------------------------------------------------------------
function maskS2clouds(image) {
  var scl = image.select('SCL');
  return image.updateMask(scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)));
}

// One image per calendar date. Fields that straddle two Sentinel-2 tiles
// otherwise get two partial-field values on the same day.
function dailyMosaics(col) {
  var days = col.aggregate_array('system:time_start')
    .map(function(t) { return ee.Date(t).format('YYYY-MM-dd'); }).distinct();
  return ee.ImageCollection(days.map(function(d) {
    var start = ee.Date.parse('YYYY-MM-dd', d);
    return col.filterDate(start, start.advance(1, 'day')).mosaic()
      .set('date_str', d).set('system:time_start', start.millis());
  }));
}

var ndviStatusLabel = ui.Label('', {margin: '2px 8px 4px 8px', fontSize: '11px', color: '#a66'});

var ndviDateSelect = ui.Select({
  placeholder: 'Select date',
  style: {margin: '4px 8px', stretch: 'horizontal'},
  onChange: function(dateStr) { showNdviForDate(dateStr); }
});
var vegIndexSelect = ui.Select({
  items: ['NDVI', 'NDRE', 'EVI'],
  value: 'NDVI',
  style: {margin: '4px 8px', stretch: 'horizontal'},
  onChange: function(val) {
    currentVegIndex = val;
    var d = ndviDateSelect.getValue();
    if (d) showNdviForDate(d);
    buildNdviChart();
  }
});
var ndviLegendPanel = ui.Panel({layout: ui.Panel.Layout.flow('vertical'), style: {margin: '4px 8px 6px 8px'}});

function buildNdviLegend() {
  ndviLegendPanel.clear();
  var palette = ['a50026','f46d43','fee08b','d9ef8b','66bd63','006837'];

  // Continuous gradient bar using ui.Thumbnail
  var gradientBar = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select('longitude')
      .unitScale(-180, 180),
    params: {
      bbox: [-180, -10, 180, 10],
      dimensions: '256x12',
      palette: palette,
      min: 0, max: 1,
      format: 'png'
    },
    style: {stretch: 'horizontal', margin: '2px 0', maxHeight: '14px'}
  });

  // Low / High labels below the bar
  var labelRow = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {margin: '0px'}
  });
  labelRow.add(ui.Label('Low',  {fontSize: '10px', margin: '0px', color: '#555'}));
  labelRow.add(ui.Label('',     {stretch: 'horizontal'}));
  labelRow.add(ui.Label('High', {fontSize: '10px', margin: '0px', color: '#555'}));

  ndviLegendPanel.add(gradientBar);
  ndviLegendPanel.add(labelRow);
}
buildNdviLegend();

// keepSelection = true (cloud slider): stay on the date the user is viewing
// if it is still in the new list; otherwise go to the latest date.
// keepSelection = false (Load): always start from the latest date.
function populateNdviDates(keepSelection) {
  var previous = keepSelection ? ndviDateSelect.getValue() : null;
  var geom = getFieldsGeometry();
  if (!geom) { ndviStatusLabel.setValue('Draw and load field(s) first.'); return; }
  var dp = dateProblem();
  if (dp) { ndviStatusLabel.setValue(dp); return; }
  var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(geom)
    .filterDate(ee.Date(startDateValue), ee.Date(endDateValue).advance(1,'day'))
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CLOUD_FILTER));
  var dateList = s2.aggregate_array('system:time_start')
    .map(function(t) { return ee.Date(t).format('YYYY-MM-dd'); }).distinct().sort();
  ndviStatusLabel.setValue('Loading available dates...');
  dateList.evaluate(function(dates) {
    if (!getFieldsGeometry()) return;   // Clear All was pressed while loading
    if (!dates || dates.length === 0) {
      ndviStatusLabel.setValue('No low-cloud Sentinel-2 scenes found.');
      ndviDateSelect.items().reset([]);
      removeVegMapLayer();   // no date left to show
      return;
    }
    ndviStatusLabel.setValue(dates.length + ' date(s) available.');
    if (previous && dates.indexOf(previous) >= 0) {
      // Same date still available: keep it (map already shows it).
      syncSelect(ndviDateSelect, dates, previous);
    } else {
      ndviDateSelect.items().reset(dates);
      ndviDateSelect.setValue(dates[dates.length - 1], true);  // true = draw its map
    }
  });
}

// The vegetation-index map currently on screen. Picking a new date or index
// replaces it instead of stacking another layer on top.
var vegMapLayer = null;
function removeVegMapLayer() {
  if (vegMapLayer) { appMap.layers().remove(vegMapLayer); vegMapLayer = null; }
}

function showNdviForDate(dateStr) {
  var geom = getFieldsGeometry();
  if (!geom || !dateStr) return;
  hideFieldLayers();
  var target = ee.Date.parse('YYYY-MM-dd', dateStr);
  // Use mosaic() instead of median() and skip per-pixel cloud masking for the
  // display layer — reduces GEE tile memory significantly on large polygons.
  // CLOUDY_PIXEL_PERCENTAGE filter still removes cloudy scenes at collection level.
  var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(geom)
    .filterDate(target, target.advance(1, 'day'))
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CLOUD_FILTER))
    .sort('CLOUDY_PIXEL_PERCENTAGE')
    .limit(6);  // cap granules to prevent tile memory overflow on large fields
  // Simplify clip geometry (30m tolerance) — invisible at display zoom but reduces
  // per-tile vector computation significantly for large/complex field boundaries.
  var displayGeom = geom.simplify({maxError: 30});
  var vegIndex;
  if (currentVegIndex === 'NDRE') {
    // B8A/B5 are 20 m bands. Smooth each image BEFORE stitching: Earth Engine
    // cannot resample a mosaic, and doing so made the NDRE map draw nothing.
    vegIndex = s2.select(['B8A', 'B5'])
      .map(function(img) { return img.resample('bilinear'); })
      .mosaic()
      .normalizedDifference(['B8A', 'B5']).rename('NDRE')
      .toFloat()
      .clip(displayGeom);
  } else if (currentVegIndex === 'EVI') {
    var eviMosaic = s2.select(['B8', 'B4', 'B2']).mosaic();
    vegIndex = eviMosaic.expression(
      '2.5 * ((NIR - RED) / (NIR + 6.0 * RED - 7.5 * BLUE + 1.0))',
      {
        'NIR': eviMosaic.select('B8').divide(10000),
        'RED': eviMosaic.select('B4').divide(10000),
        'BLUE': eviMosaic.select('B2').divide(10000)
      }
    ).rename('EVI').toFloat().clip(displayGeom);
  } else {
    vegIndex = s2.select(['B8', 'B4']).mosaic()
      .normalizedDifference(['B8', 'B4']).rename('NDVI')
      .toFloat()
      .clip(displayGeom);
  }
  var visMin = currentVegIndex === 'NDRE' ? 0.0 : (currentVegIndex === 'EVI' ? -0.1 : -0.2);
  var visMax = currentVegIndex === 'NDRE' ? 0.6 : (currentVegIndex === 'EVI' ? 0.8 : 0.9);
  removeVegMapLayer();
  vegMapLayer = ui.Map.Layer(vegIndex,
    {min: visMin, max: visMax, palette: ['a50026','f46d43','fee08b','d9ef8b','66bd63','006837']},
    currentVegIndex + ' ' + dateStr);
  appMap.layers().insert(0, vegMapLayer);   // bottom of the stack: station pin stays on top
  appMap.centerObject(geom);
}

// Chart x-values: noon UTC keeps the calendar date unchanged when Google
// Charts displays it in US local time (midnight UTC shows as the day before).
function dateToChartMs(dateStr) { return new Date(dateStr + 'T12:00:00Z').getTime(); }

// Helper: build a feature.byFeature line chart from a client-side array of {date, value} objects
// p.date must be a string like "2025-01-15" — converted to ms timestamp for numeric x-axis
// seriesName (optional) is the label users see when hovering a point, e.g.
// "Precipitation (mm): 69.5". Defaults to the y-axis title.
// opts.minZero: start the value axis at 0 (e.g. irrigation need, which is
// often 0 on every day and otherwise gets a -1 to 1 axis).
function buildDateValueChart(pts, title, yTitle, color, panel, seriesName, opts) {
  opts = opts || {};
  var feats = pts.map(function(p) {
    var ts = dateToChartMs(p.date);  // numeric ms — required by ui.Chart.feature.byFeature
    return ee.Feature(null, {date_ms: ts, value: p.value});
  });
  var vAxis = {title: yTitle};
  if (opts.minZero) {
    vAxis.minValue = 0; vAxis.viewWindow = {min: 0};
    // If every value is 0, Google ignores min 0 and draws -1 to 1: fix the top too.
    if (pts.every(function(p) { return !p.value; })) vAxis.viewWindow.max = 1;
  }
  var hAxis = {title: 'Date', format: 'MM/dd/yy', gridlines: {count: -1}};
  // A single date gives a zero-width date axis and the point disappears:
  // widen the axis by 3 days on each side so the point and its date show.
  if (pts.length === 1) {
    var t1 = dateToChartMs(pts[0].date);
    hAxis.viewWindow = {min: t1 - 3 * 86400000, max: t1 + 3 * 86400000};
  }
  var chart = ui.Chart.feature.byFeature(ee.FeatureCollection(feats), 'date_ms', ['value'])
    .setSeriesNames([seriesName || yTitle])   // hover label instead of the internal name "value"
    .setChartType('LineChart')
    .setOptions({
      title: title,
      vAxis: vAxis,
      hAxis: hAxis,
      lineWidth: 2, pointSize: pts.length === 1 ? 7 : 3,
      legend: {position: 'none'},
      colors: [color]
    });
  panel.add(chart);
  if (pts.length === 1) {
    panel.add(ui.Label('Only one date with data in this period (' + formatDayLabel(pts[0].date, true) + ').',
      {fontSize: '10px', color: '#555', margin: '0 8px 4px 8px', fontStyle: 'italic'}));
  }
}

// Like buildDateValueChart, but visually splits the series at boundaryMs into
// a solid "Final" segment and a dashed "Preliminary" segment (e.g. GRIDMET's
// documented last-60-days preliminary window), rather than silently dropping
// the preliminary data. The point at the boundary is duplicated into both
// series so the two line segments connect without a visual gap.
function buildDateValueChartSplit(pts, title, yTitle, colorFinal, colorPrelim, boundaryMs, panel, seriesName, opts) {
  opts = opts || {};
  var name = seriesName || yTitle;
  if (!pts || pts.length === 0) return;
  var hasFinal = false, hasPrelim = false;
  for (var i = 0; i < pts.length; i++) {
    var ts0 = dateToChartMs(pts[i].date);
    if (ts0 <= boundaryMs) hasFinal = true;
    if (ts0 >= boundaryMs) hasPrelim = true;
  }
  // ui.Chart.feature.byFeature errors with
  // "Source data for final_value y values not found" if every point is
  // only on one side of the 60-day GRIDMET preliminary boundary (e.g.
  // planting date is already inside that window).
  if (!hasFinal || !hasPrelim) {
    buildDateValueChart(pts, title, yTitle, hasPrelim ? colorPrelim : colorFinal, panel, name, opts);
    return;
  }
  var feats = pts.map(function(p) {
    var ts = dateToChartMs(p.date);
    var props = {date_ms: ts};
    if (ts <= boundaryMs) { props.final_value = p.value; }
    if (ts >= boundaryMs) { props.prelim_value = p.value; }
    return ee.Feature(null, props);
  });
  var chart = ui.Chart.feature.byFeature(
      ee.FeatureCollection(feats), 'date_ms', ['final_value', 'prelim_value'])
    // Hover labels instead of the internal names "final_value"/"prelim_value".
    // Both parts use the same label; the dashed line and the legend already
    // show which points are recent.
    .setSeriesNames([name, name])
    .setChartType('LineChart')
    .setOptions({
      title: title,
      vAxis: !opts.minZero ? {title: yTitle}
           : {title: yTitle, minValue: 0,
              viewWindow: pts.every(function(p) { return !p.value; }) ? {min: 0, max: 1} : {min: 0}},
      hAxis: {title: 'Date', format: 'MM/dd/yy', gridlines: {count: -1}},
      lineWidth: 2, pointSize: 3,
      legend: {position: 'bottom'},
      series: {
        0: {color: colorFinal, labelInLegend: 'Final'},
        1: {color: colorPrelim, lineDashStyle: [4, 4], labelInLegend: 'Recent (still finalizing, reliable)'}
      }
    });
  panel.add(chart);
}

// Each chart request gets a number; a slower, older request that finishes
// after a newer one is ignored instead of overwriting the newer chart.
var ndviChartGen = 0;

function buildNdviChart() {
  ndviChartGen++;
  var myGen = ndviChartGen;
  var geom = getFieldsGeometry();
  if (!geom) {
    graphicalInsightPanel.clear();
    graphicalInsightPanel.add(ui.Label('Draw and load field(s) first.', {color:'#999', fontSize:'11px'}));
    return;
  }
  var dp = dateProblem();
  if (dp) {
    graphicalInsightPanel.clear();
    graphicalInsightPanel.add(ui.Label(dp, {color:'#999', fontSize:'11px'}));
    return;
  }
  var masked = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(geom)
    .filterDate(ee.Date(startDateValue), ee.Date(endDateValue).advance(1,'day'))
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CLOUD_FILTER))
    .map(maskS2clouds);
  // Native resolution: 10 m for NDVI/EVI bands, 20 m for NDRE's red-edge band.
  var idxScale = currentVegIndex === 'NDRE' ? 20 : 10;
  var col = dailyMosaics(masked)
    .map(function(img) {
      var idx;
      if (currentVegIndex === 'NDRE') {
        idx = img.select(['B8A', 'B5']).normalizedDifference(['B8A', 'B5']).rename('idx');
      } else if (currentVegIndex === 'EVI') {
        idx = img.expression(
          '2.5 * ((NIR - RED) / (NIR + 6.0 * RED - 7.5 * BLUE + 1.0))',
          {
            'NIR': img.select('B8').divide(10000),
            'RED': img.select('B4').divide(10000),
            'BLUE': img.select('B2').divide(10000)
          }
        ).rename('idx');
      } else {
        idx = img.normalizedDifference(['B8', 'B4']).rename('idx');
      }
      var val = idx.reduceRegion({reducer: ee.Reducer.mean(), geometry: geom, scale: idxScale, maxPixels: 1e9, tileScale: 4}).get('idx');
      return img.set('ndvi_val', val);
    })
    // Drop dates where clouds covered the whole field. aggregate_array skips
    // missing values, so without this the dates and values lists fall out of
    // step and values get attached to the wrong dates.
    .filter(ee.Filter.notNull(['ndvi_val']));

  graphicalInsightPanel.clear();
  graphicalInsightPanel.add(ui.Label('Loading ' + currentVegIndex + ' chart (clouds < ' + CLOUD_FILTER + '%)...',
                                     {color: '#999', fontSize: '11px'}));
  ee.Dictionary({dates: col.aggregate_array('date_str'), values: col.aggregate_array('ndvi_val')})
    .evaluate(function(result) {
      if (myGen !== ndviChartGen) return;  // a newer chart request has replaced this one
      graphicalInsightPanel.clear();
      if (!result || !result.dates || result.dates.length === 0) {
        graphicalInsightPanel.add(ui.Label(
          'No low-cloud Sentinel-2 scenes found for this date range and area.',
          {color: '#a66', fontSize: '11px', margin: '6px 8px'}
        ));
        return;
      }
      var pts = [];
      for (var i = 0; i < result.dates.length; i++) {
        if (result.values[i] !== null && result.values[i] !== undefined) {
          pts.push({date: result.dates[i], value: result.values[i]});
        }
      }
      pts.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
      if (pts.length === 0) {
        graphicalInsightPanel.add(ui.Label('No valid ' + currentVegIndex + ' data for this area and date range.', {color:'#a66', fontSize:'11px'}));
        return;
      }
      buildDateValueChart(pts, 'Mean ' + currentVegIndex + ' Over Time (scenes < ' + CLOUD_FILTER + '% cloud)', currentVegIndex, '2a7d2e', graphicalInsightPanel);
      graphicalInsightPanel.add(ui.Label(
        'ℹ️ The chart can show fewer dates than the map selector: dates where clouds ' +
        'covered your whole field are left out of the chart.',
        {fontSize: '11px', color: '#555', margin: '4px 8px 6px 8px', fontStyle: 'italic'}
      ));
    });
}

// ---------------------------------------------------------------------
// 5. 16-DAY FORECAST (NOAA GFS) with fallback logic
// ---------------------------------------------------------------------
var FORECAST_HOURS_DAILY = [];
for (var fh = 0; fh <= 384; fh += 24) FORECAST_HOURS_DAILY.push(fh);
var FORECAST_DAY_ENDS = FORECAST_HOURS_DAILY.slice(1); // [24, 48, ..., 384]

// Forecast day N is built from its four 6-hourly steps (dayEnd-18 ... dayEnd).
// GFS precipitation AND max/min temperature only cover a resetting 1-6 hour
// window per step, so a single step never represents the whole day.
function forecastDaily(run, dayFn) {
  return ee.ImageCollection(FORECAST_DAY_ENDS.map(function(dayEnd) {
    var blocks = run.filter(ee.Filter.inList('forecast_hours',
                   [dayEnd - 18, dayEnd - 12, dayEnd - 6, dayEnd]));
    return ee.Image(dayFn(blocks, dayEnd)).set('forecast_day', dayEnd / 24);
  }));
}

// ── "Forecast issued" label ──────────────────────────────────────────
// Set whenever a forecast run is picked; shown under every forecast chart.
var forecastIssuedText = '';
function formatForecastIssued(ms) {
  var d = new Date(ms);
  var text = 'GFS forecast issued: ' + d.getUTCDate() + ' ' + MONTH_NAMES_LIST[d.getUTCMonth()] + ' ' +
             d.getUTCFullYear() + ', ' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ' UTC';
  try {
    // Local Central time (follows daylight saving automatically).
    var central = d.toLocaleTimeString('en-US', {timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit'}) + ' Central';
    var centralDay = parseInt(d.toLocaleDateString('en-US', {timeZone: 'America/Chicago', day: 'numeric'}), 10);
    if (centralDay !== d.getUTCDate()) {   // e.g. 00:00 UTC is the previous evening in Central time
      central += ', ' + centralDay + ' ' +
                 MONTH_NAMES_LIST[parseInt(d.toLocaleDateString('en-US', {timeZone: 'America/Chicago', month: 'numeric'}), 10) - 1];
    }
    text += ' (' + central + ')';
  } catch (e) { /* browser without time-zone support: show UTC only */ }
  return text;
}

// ── Extraterrestrial radiation Ra (FAO-56, eq. 21) ────────────────────
// Solar energy at the top of the atmosphere, MJ/m²/day. Depends only on
// latitude (taken per pixel) and day of year, so no weather data is needed.
// Louisiana (~30°N): about 19 in late December, 31 in March/September,
// 41 in late June.
function extraterrestrialRadiation(dayOfYear) {
  var J    = ee.Number(dayOfYear);
  var dr   = J.multiply(2 * Math.PI / 365).cos().multiply(0.033).add(1);           // Earth–Sun distance
  var decl = J.multiply(2 * Math.PI / 365).subtract(1.39).sin().multiply(0.409);   // solar declination
  var lat  = ee.Image.pixelLonLat().select('latitude').multiply(Math.PI / 180);
  var ws   = lat.tan().multiply(ee.Image.constant(decl.tan())).multiply(-1)
                .clamp(-1, 1).acos();                                             // sunset hour angle
  return ws.multiply(lat.sin()).multiply(ee.Image.constant(decl.sin()))
    .add(lat.cos().multiply(ee.Image.constant(decl.cos())).multiply(ws.sin()))
    .multiply(ee.Image.constant(dr.multiply(24 * 60 / Math.PI * 0.0820)))
    .rename('Ra');
}

// quiet = true: leave the 16-Day Forecast section's labels untouched (used by
// the Crop air-temp check). The callback also receives the run's issue time.
function getReliableGfsRun(geom, callback, quiet) {
  // Use the second-newest GFS run. The newest run may still be arriving in
  // Earth Engine, so the one before it is almost always complete. This is
  // about 6 hours older than the newest possible forecast.
  // Only search the last few days, not the whole archive back to 2015. The
  // window reaches 17 days ahead so it works whether system:time_start marks
  // the run's start or each forecast's valid time.
  var nowMs = Date.now();
  var gfs = ee.ImageCollection('NOAA/GFS0P25')
    .filterDate(ee.Date(nowMs - 3 * 86400000), ee.Date(nowMs + 17 * 86400000));
  // Get the two most recent distinct creation_times so we can pick the complete one
  gfs.aggregate_array('creation_time')
     .distinct()
     .sort()
     .slice(-2)   // last 2 run timestamps
     .evaluate(function(times) {
    if (!times || times.length === 0) {
      if (!quiet) forecastStatusLabel.setValue('No GFS data available. Try again in a few minutes.');
      callback(null);
      return;
    }
    // Use the second-to-last (almost always complete); fall back to the only one if just one exists
    var useTime = times.length >= 2 ? times[times.length - 2] : times[times.length - 1];
    if (!quiet) {
      forecastIssuedText = formatForecastIssued(useTime);
      forecastStatusLabel.setValue('');
    }
    callback(gfs.filter(ee.Filter.eq('creation_time', useTime)), useTime);
  });
}

var forecastStatusLabel = ui.Label('', {margin: '2px 8px 4px 8px', fontSize: '11px', color: '#a66'});
var forecastChartPanel  = ui.Panel({layout: ui.Panel.Layout.flow('vertical'), style: {margin: '6px 8px'}});
forecastChartPanel.add(ui.Label('(forecast chart will appear here)', {color: '#999', fontSize: '11px'}));

// ── FORECAST CHART ENGINE ────────────────────────────────────────────
// All forecast parameters use ui.Chart.image.series, Earth Engine's native
// image charting, which samples GFS reliably at the field centroid.
// Each function prepares a daily ImageCollection (one image per forecast
// day, with one band per chart line) and hands it to GEE's chart renderer.
// ─────────────────────────────────────────────────────────────────────

// Internal helper — render a prepared daily collection (one image per
// forecast day, property 'forecast_day' = 1..16) as a chart. Pass one colour
// for a single band, or an array of colours for several bands (one series each).
function showForecastChart(col, geom, title, yTitle, chartType, color, footerNote, extraOpts) {
  forecastChartPanel.clear();
  forecastStatusLabel.setValue('Loading ' + title + ' ...');
  // GFS pixels are 27.8 km wide — sample at the field centroid so even small fields
  // always intersect a pixel (a Point always hits exactly one pixel at any scale).
  var gfsPoint = geom.centroid({maxError: 1});
  var colors = Array.isArray(color) ? color : [color || COLOR_FOREST];
  var opts = {
    title: title,
    vAxis: {title: yTitle},
    hAxis: {title: 'Days ahead', gridlines: {count: 16}},
    lineWidth: 2, pointSize: 4,
    colors: colors,
    legend: {position: colors.length > 1 ? 'bottom' : 'none'}
  };
  if (extraOpts) { for (var k in extraOpts) opts[k] = extraOpts[k]; }
  var chart = ui.Chart.image.series({
    imageCollection: col,
    region: gfsPoint,
    reducer: ee.Reducer.mean(),
    scale: 27830,
    xProperty: 'forecast_day'
  }).setChartType(chartType || 'LineChart').setOptions(opts);
  forecastChartPanel.add(chart);
  forecastStatusLabel.setValue((footerNote ? footerNote + ' ' : '') + forecastIssuedText);
}

// Temperature — daily high and low (°C) from GFS's max/min bands, taken
// across the day's four 6-hour blocks.
function buildTemperatureForecastChart(run, geom) {
  var col = forecastDaily(run, function(blocks) {
    var high = blocks.select('maximum_temperature_2m_above_ground').max().rename('High');
    var low  = blocks.select('minimum_temperature_2m_above_ground').min().rename('Low');
    return high.addBands(low);
  });
  showForecastChart(col, geom, 'Temperature — 16-Day Forecast', 'Temperature (°C)',
    'LineChart', ['#d62728', '#1f77b4'],
    'Daily high and low from four 6-hour GFS blocks per day.');
}

// Precipitation — daily total = sum of the four non-overlapping 6-hour
// accumulation blocks (hours dayEnd-18, -12, -6, dayEnd).
function buildPrecipForecastChart(run, geom) {
  var col = forecastDaily(run, function(blocks) {
    return blocks.select('total_precipitation_surface').sum().rename('Precip_mm');
  });
  showForecastChart(col, geom, 'Precipitation — 16-Day Forecast', 'Precipitation (mm)',
    'ColumnChart', COLOR_FOREST,
    'Daily totals = sum of four 6-hour GFS accumulation blocks per day.');
}

// Wind Speed — daily mean of the four 6-hourly speeds.
function buildWindSpeedForecastChart(run, geom) {
  var col = forecastDaily(run, function(blocks) {
    return blocks
      .select(['u_component_of_wind_10m_above_ground', 'v_component_of_wind_10m_above_ground'])
      .map(function(img) { return img.select(0).hypot(img.select(1)).rename('Wind_ms'); })
      .mean();
  });
  showForecastChart(col, geom, 'Wind Speed — 16-Day Forecast', 'Wind speed (m/s)',
    'LineChart', COLOR_FOREST, 'Daily mean of four 6-hourly GFS values.');
}

// Wind Direction — direction of the day's average wind vector.
// Meteorological convention: direction FROM which wind blows (0–360°, N=0).
function buildWindDirForecastChart(run, geom) {
  var col = forecastDaily(run, function(blocks) {
    var uv = blocks
      .select(['u_component_of_wind_10m_above_ground', 'v_component_of_wind_10m_above_ground'])
      .mean();
    return uv.select(0).multiply(-1).atan2(uv.select(1).multiply(-1))
             .multiply(180 / Math.PI).add(360).mod(360).rename('Wind_Dir');
  });
  showForecastChart(col, geom, 'Wind Direction — 16-Day Forecast', 'Direction (°)',
    'ScatterChart', COLOR_FOREST, 'Direction of the day\'s average wind (from four 6-hourly GFS values).',
    {vAxis: {title: 'Direction (°)', minValue: 0, maxValue: 360,
             ticks: [{v:0,f:'N'},{v:45,f:'NE'},{v:90,f:'E'},{v:135,f:'SE'},
                     {v:180,f:'S'},{v:225,f:'SW'},{v:270,f:'W'},{v:315,f:'NW'},{v:360,f:'N'}]},
     // Same 1–16 day axis as the other forecast charts.
     hAxis: {title: 'Days ahead', viewWindow: {min: 1, max: 16}, gridlines: {count: 16}},
     // Dots only: a line from 350° to 10° would cross the whole chart even
     // though the wind only shifted slightly across north.
     lineWidth: 0, pointSize: 6});
}

// VPD — daily mean of four 6-hourly values, each from GFS temperature and
// relative humidity: VPD = es(T) × (1 − RH/100).
function buildVpdForecastChart(run, geom) {
  var col = forecastDaily(run, function(blocks) {
    return blocks
      .select(['temperature_2m_above_ground', 'relative_humidity_2m_above_ground'])
      .map(function(img) {
        var T_C = img.select('temperature_2m_above_ground');
        var RH  = img.select('relative_humidity_2m_above_ground'); // %
        var es  = T_C.multiply(17.27).divide(T_C.add(237.3)).exp().multiply(0.6108);
        return es.multiply(ee.Image(1).subtract(RH.divide(100))).max(0).rename('VPD_kPa');
      })
      .mean();
  });
  showForecastChart(col, geom,
    'Vapor Pressure Deficit — 16-Day Forecast', 'VPD (kPa)',
    'LineChart', '#7c3aed',
    'Daily mean of four 6-hourly values; VPD = es(T) × (1 − RH/100) from GFS temperature and humidity.');
}

// ET₀ (simplified estimate) — Hargreaves-Samani with the day's full range:
// Tmax = highest max across the four 6-hour blocks, Tmin = lowest min,
// Tmean = (Tmax + Tmin) / 2. Ra is computed for the field's latitude and each
// forecast day's date (FAO-56 eq. 21), then converted to mm/day with × 0.408.
// Still a simplified estimate, not a full FAO-56 Penman-Monteith calculation.
function buildEtoForecastChart(run, geom) {
  var col = forecastDaily(run, function(blocks, dayEnd) {
    var tmax  = blocks.select('maximum_temperature_2m_above_ground').max();
    var tmin  = blocks.select('minimum_temperature_2m_above_ground').min();
    var tmean = tmax.add(tmin).divide(2);
    // Date of this forecast day = run start + (dayEnd − 12) hours (mid-day).
    var dayOfYear = ee.Date(blocks.first().get('creation_time'))
      .advance(dayEnd - 12, 'hour').getRelative('day', 'year').add(1);
    var raMm = extraterrestrialRadiation(dayOfYear).multiply(0.408);
    return tmean.add(17.8).multiply(tmax.subtract(tmin).max(0).sqrt())
                .multiply(raMm).multiply(0.0023).max(0).rename('ETo_mm');
  });
  showForecastChart(col, geom,
    'Evapotranspiration ET₀ (Simplified Estimate) — 16-Day Forecast', 'ET₀ (mm/day)',
    'LineChart', '#059669',
    'Simplified Hargreaves-Samani using the day\'s GFS high/low (four 6-hour blocks) and Ra for the field\'s latitude and date (FAO-56). Not a full FAO-56 Penman-Monteith calculation.');
}

var forecastParamSelect = ui.Select({
  items: ['Temperature', 'Precipitation', 'Wind Speed', 'Wind Direction',
          'VPD', 'Evapotranspiration ET₀ (Simplified Estimate)'],
  placeholder: 'Select weather parameter',
  style: {margin: '4px 8px', stretch: 'horizontal'},
  onChange: function(paramName) {
    var geom = getFieldsGeometry();
    if (!geom) { forecastStatusLabel.setValue('Draw and load field(s) first.'); return; }
    forecastStatusLabel.setValue('Checking GFS data availability...');
    getReliableGfsRun(geom, function(run) {
      if (!run) return;
      if (paramName === 'Temperature')
        buildTemperatureForecastChart(run, geom);
      else if (paramName === 'Wind Speed')
        buildWindSpeedForecastChart(run, geom);
      else if (paramName === 'Wind Direction')
        buildWindDirForecastChart(run, geom);
      else if (paramName === 'Precipitation')
        buildPrecipForecastChart(run, geom);
      else if (paramName === 'VPD')
        buildVpdForecastChart(run, geom);
      else if (paramName === 'Evapotranspiration ET₀ (Simplified Estimate)')
        buildEtoForecastChart(run, geom);
      if (forecastStatusLabel.getValue() === 'Checking GFS data availability...') forecastStatusLabel.setValue('');
    });
  }
});

// ---------------------------------------------------------------------
// 6. SOIL PARAMETER — SOLUS100 (100 m, USDA-NRCS, 2024 release) + gNATSGO (10 m, USDA-NRCS;
//    via the Earth Engine community catalogue, from Microsoft Planetary Computer)
// ---------------------------------------------------------------------
var SOIL_PARAMETERS = {
  'Soil pH (H₂O)': {
    source: 'SOLUS', assetId: 'USDA/SOLUS100/V0/ph1to1h2o',
    bands: ['r_0_cm_p','r_5_cm_p','r_15_cm_p','r_30_cm_p','r_60_cm_p','r_100_cm_p','r_150_cm_p'],
    depths: [0,5,15,30,60,100,150], unit: 'pH', geeScale: 100
  },
  'Bulk Density': {
    source: 'SOLUS', assetId: 'USDA/SOLUS100/V0/dbovendry',
    bands: ['r_0_cm_p','r_5_cm_p','r_15_cm_p','r_30_cm_p','r_60_cm_p','r_100_cm_p','r_150_cm_p'],
    depths: [0,5,15,30,60,100,150], unit: 'g/cm³', geeScale: 100
  },
  'Sand Content': {
    source: 'SOLUS', assetId: 'USDA/SOLUS100/V0/sandtotal',
    bands: ['r_0_cm_p','r_5_cm_p','r_15_cm_p','r_30_cm_p','r_60_cm_p','r_100_cm_p','r_150_cm_p'],
    depths: [0,5,15,30,60,100,150], unit: '%'
  },
  'Clay Content': {
    source: 'SOLUS', assetId: 'USDA/SOLUS100/V0/claytotal',
    bands: ['r_0_cm_p','r_5_cm_p','r_15_cm_p','r_30_cm_p','r_60_cm_p','r_100_cm_p','r_150_cm_p'],
    depths: [0,5,15,30,60,100,150], unit: '%'
  },
  'Silt Content': {
    source: 'SOLUS', assetId: 'USDA/SOLUS100/V0/silttotal',
    bands: ['r_0_cm_p','r_5_cm_p','r_15_cm_p','r_30_cm_p','r_60_cm_p','r_100_cm_p','r_150_cm_p'],
    depths: [0,5,15,30,60,100,150], unit: '%'
  },
  'Calcium Carbonate (CaCO₃)': {
    source: 'SOLUS', assetId: 'USDA/SOLUS100/V0/caco3',
    bands: ['r_0_cm_p','r_5_cm_p','r_15_cm_p','r_30_cm_p','r_60_cm_p','r_100_cm_p','r_150_cm_p'],
    depths: [0,5,15,30,60,100,150], unit: '%'
    // Plain percentage like Sand/Silt/Clay: no rescaling. Checked in two field tests.
  },
  'Cation Exchange Capacity (CEC)': {
    source: 'SOLUS', assetId: 'USDA/SOLUS100/V0/cec7',
    bands: ['r_0_cm_p','r_5_cm_p','r_15_cm_p','r_30_cm_p','r_60_cm_p','r_100_cm_p','r_150_cm_p'],
    depths: [0,5,15,30,60,100,150], unit: 'cmolc/kg', geeScale: 10
  },
  'Electrical Conductivity (EC)': {
    source: 'SOLUS', assetId: 'USDA/SOLUS100/V0/ec',
    bands: ['r_0_cm_p','r_5_cm_p','r_15_cm_p','r_30_cm_p','r_60_cm_p','r_100_cm_p','r_150_cm_p'],
    depths: [0,5,15,30,60,100,150], unit: 'dS/m', geeScale: 10
  },
  'Organic Carbon (SOC)': {
    source: 'gNATSGO',
    layers: [
      {id: 'projects/sat-io/open-datasets/gNATSGO/raster/soc0_5',    depth: 2.5,  label: '0–5', thick: 5},
      {id: 'projects/sat-io/open-datasets/gNATSGO/raster/soc5_20',   depth: 12.5, label: '5–20', thick: 15},
      {id: 'projects/sat-io/open-datasets/gNATSGO/raster/soc20_50',  depth: 35,   label: '20–50', thick: 30},
      {id: 'projects/sat-io/open-datasets/gNATSGO/raster/soc50_100', depth: 75,   label: '50–100', thick: 50},
      {id: 'projects/sat-io/open-datasets/gNATSGO/raster/soc100_150',depth: 125,  label: '100–150', thick: 50}
    ],
    unit: 'g C/m²', geeScale: 1,
    // gNATSGO gives a TOTAL per layer, and the layers differ in thickness
    // (5, 15, 30, 50, 50 cm). Bars are shown per cm of soil so depths can be
    // compared fairly; layer totals appear on hover and in the summary line.
    perCm: true, totalLabel: 'Total organic carbon'
  },
  'Available Water Storage': {
    source: 'gNATSGO',
    layers: [
      {id: 'projects/sat-io/open-datasets/gNATSGO/raster/aws0_5',    depth: 2.5,  label: '0–5', thick: 5},
      {id: 'projects/sat-io/open-datasets/gNATSGO/raster/aws5_20',   depth: 12.5, label: '5–20', thick: 15},
      {id: 'projects/sat-io/open-datasets/gNATSGO/raster/aws20_50',  depth: 35,   label: '20–50', thick: 30},
      {id: 'projects/sat-io/open-datasets/gNATSGO/raster/aws50_100', depth: 75,   label: '50–100', thick: 50},
      {id: 'projects/sat-io/open-datasets/gNATSGO/raster/aws100_150',depth: 125,  label: '100–150', thick: 50}
    ],
    unit: 'mm', geeScale: 1,
    perCm: true, totalLabel: 'Total plant-available water'   // see note under Organic Carbon
  },
  'Root Zone Available Water Storage': {
    source: 'gNATSGO', type: 'single',
    layerId: 'projects/sat-io/open-datasets/gNATSGO/raster/rootznaws',
    unit: 'mm', geeScale: 1
    // Continuous value (not a depth series) — root-zone-adjusted AWS, i.e. how
    // much plant-available water the soil holds within the depth commodity
    // crop roots can actually reach, rather than a fixed depth band.
  },
};

var soilStatusLabel = ui.Label('', {margin: '2px 8px 4px 8px', fontSize: '11px', color: '#a66'});
var soilChartPanel  = ui.Panel({layout: ui.Panel.Layout.flow('vertical'), style: {margin: '6px 8px'}});
soilChartPanel.add(ui.Label('(soil depth chart will appear here)', {color: '#999', fontSize: '11px'}));

function buildSoilDepthChart(paramName, geom) {
  var config = SOIL_PARAMETERS[paramName];
  soilStatusLabel.setValue('Loading soil data...');
  soilChartPanel.clear();

  if (config.source === 'SOLUS') {
    // SCALING: SOLUS100 stores values as integers with a per-property scale
    // factor (official layer table, Final_Layer_Table_20231215.csv):
    //   Sand, Silt, Clay, CaCO3 -> 1 (no geeScale)
    //   pH, Bulk Density        -> 100
    //   CEC, EC                 -> 10
    // EC confirmed directly: a raw stored value of 5 = 0.5 dS/m.
    var img = ee.ImageCollection('USDA/SOLUS100/V0')
      .filter(ee.Filter.eq('system:index', config.assetId.split('/').pop()))
      .first()
      .select(config.bands);
    if (config.geeScale) { img = img.divide(config.geeScale); }
    img.reduceRegion({reducer: ee.Reducer.mean(), geometry: geom, scale: 100, maxPixels: 1e9})
      .evaluate(function(result) {
        if (!result) { soilStatusLabel.setValue('No SOLUS data returned for this area.'); return; }
        var features = [], missing = 0;
        for (var i = 0; i < config.bands.length; i++) {
          var val = result[config.bands[i]];
          // No data at this depth: leave the bar out rather than draw a fake 0.
          if (val === null || val === undefined) { missing++; continue; }
          features.push(ee.Feature(null, {depth_cm: config.depths[i], value: val}));
        }
        if (features.length === 0) { soilStatusLabel.setValue('No SOLUS data for this area.'); return; }
        var chart = ui.Chart.feature.byFeature(ee.FeatureCollection(features), 'depth_cm', ['value'])
          .setSeriesNames([paramName + ' (' + config.unit + ')'])   // hover label, e.g. "Clay Content (%): 16.2"
          .setChartType('ColumnChart')
          .setOptions({title: paramName + ' by Depth',
            hAxis: {title: 'Depth (cm)'},
            // Start at 0 so bar heights show true proportions (no zoomed-in axis).
            vAxis: {title: config.unit, minValue: 0, viewWindow: {min: 0}},
            legend: {position: 'none'}, colors: ['8b5e34']});
        soilChartPanel.clear(); soilChartPanel.add(chart);
        soilStatusLabel.setValue(missing ? ('No data at ' + missing + ' depth(s); those bars are left out.') : '');
      });

  } else if (config.type === 'single') {
    // Single-value gNATSGO property (no depth layers), e.g. root-zone available
    // water storage: averaged over the field and shown as one bar starting at 0.
    ee.ImageCollection(config.layerId).mosaic()
      .divide(config.geeScale || 1)
      .reduceRegion({reducer: ee.Reducer.mean(), geometry: geom, scale: 10, maxPixels: 1e9})
      .evaluate(function(result) {
        if (!result) { soilStatusLabel.setValue('No gNATSGO data returned for this area.'); return; }
        var keys = Object.keys(result);
        var val = keys.length > 0 ? result[keys[0]] : null;
        if (val === null || val === undefined) { soilStatusLabel.setValue('No gNATSGO value for this area.'); return; }
        var features = [ee.Feature(null, {category: paramName, value: val})];
        // minValue: 0 so a single bar reads proportionally (Google Charts
        // otherwise auto-zooms tightly around one data point, e.g. 192.8-195.0
        // for a value of 193.9, making it look misleadingly "full-scale").
        var vAxisOpts = {title: config.unit, minValue: 0};
        var chart = ui.Chart.feature.byFeature(ee.FeatureCollection(features), 'category', ['value'])
          .setSeriesNames([paramName + ' (' + config.unit + ')'])   // hover label instead of "value"
          .setChartType('ColumnChart')
          .setOptions({title: paramName,
            hAxis: {title: ''}, vAxis: vAxisOpts,
            legend: {position: 'none'}, colors: ['8b5e34']});
        soilChartPanel.clear(); soilChartPanel.add(chart);
        soilStatusLabel.setValue('');
      });

  } else {
    // gNATSGO multi-depth (SOC, AWS) - parallel evaluate() calls
    var layers = config.layers;
    var results = new Array(layers.length);
    var remaining = layers.length;
    layers.forEach(function(layer, i) {
      ee.ImageCollection(layer.id).mosaic()
        .divide(config.geeScale)
        .reduceRegion({reducer: ee.Reducer.mean(), geometry: geom, scale: 10, maxPixels: 1e9})
        .evaluate(function(res) {
          var keys = res ? Object.keys(res) : [];
          results[i] = keys.length > 0 ? res[keys[0]] : null;   // null = no data at this depth
          remaining--;
          if (remaining === 0) {
            // Per cm of soil: layer total ÷ layer thickness, so layers of
            // different thickness (5 … 50 cm) can be compared fairly.
            // Plain keyboard characters only in the chart data: Excel opens the
            // "Download CSV" file in an older character set, which garbles the
            // en dash and the superscript 2 (e.g. "0â€“5", "mÂ²"). Labels end in
            // "cm" so Excel does not turn "5-20" into a date ("20-May").
            var csvUnit = config.unit.replace('²', '2');
            var features = [], missingG = 0, total = 0, top50 = 0, nLayers = 0;
            for (var j = 0; j < layers.length; j++) {
              var v = results[j];
              if (v === null || v === undefined) { missingG++; continue; }
              var layerLabel = layers[j].label.replace('–', '-') + ' cm';
              features.push(ee.Feature(null, {layer: layerLabel, value: v / layers[j].thick}));
              total += v; nLayers++;
              if (j < 3) top50 += v;   // layers 0–5, 5–20, 20–50 cm
            }
            if (features.length === 0) { soilStatusLabel.setValue('No gNATSGO data for this area.'); return; }
            var chart = ui.Chart.feature.byFeature(ee.FeatureCollection(features), 'layer', ['value'])
              .setSeriesNames([paramName + ' (' + csvUnit + ' per cm)'])   // hover label
              .setChartType('ColumnChart')
              .setOptions({
                title: paramName + ' by Depth (per cm of soil)',
                // Smaller, horizontal layer labels so "100-150 cm" fits in the narrow
                // side panel instead of being tilted and cut off ("0-…", "5-…").
                hAxis: {title: 'Soil layer', textStyle: {fontSize: 10},
                        slantedText: false, showTextEvery: 1, maxAlternation: 1},
                vAxis: {title: config.unit + ' per cm of soil', minValue: 0, viewWindow: {min: 0}},   // start at 0
                legend: {position: 'none'}, colors: ['8b5e34']
              });
            var fmt = function(x) { return Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
            var summary = (missingG === 0)
              ? config.totalLabel + ', 0–150 cm: ' + fmt(total) + ' ' + config.unit +
                ' (top 50 cm: ' + fmt(top50) + ' ' + config.unit + ')'
              : config.totalLabel + ' of the ' + nLayers + ' layers with data: ' + fmt(total) + ' ' + config.unit;
            soilChartPanel.clear();
            soilChartPanel.add(chart);
            soilChartPanel.add(ui.Label(summary,
              {fontSize: '11px', color: '#555', fontStyle: 'italic', margin: '2px 8px 4px 8px'}));
            soilStatusLabel.setValue(missingG ? ('No data at ' + missingG + ' depth(s); those bars are left out.') : '');
          }
        });
    });
  }
}

var soilParamSelect = ui.Select({
  items: Object.keys(SOIL_PARAMETERS),
  placeholder: 'Select soil parameter',
  style: {margin: '4px 8px', stretch: 'horizontal'},
  onChange: function(paramName) {
    var geom = getFieldsGeometry();
    if (!geom) { soilStatusLabel.setValue('Draw and load field(s) first.'); return; }
    buildSoilDepthChart(paramName, geom);
  }
});

// ---------------------------------------------------------------------
// 7. HISTORICAL WEATHER — GRIDMET daily data (~4 km)
// ---------------------------------------------------------------------
var WEATHER_PARAMS = {
  'Precipitation':          {source: 'GRIDMET', band: 'pr',   scale_val: 4000, offset: 0,       chartType: 'LineChart', color: '1a73e8', isTemp: false, unit: 'mm'},
  'Max Temperature':        {source: 'GRIDMET', band: 'tmmx', scale_val: 4000, offset: -273.15, chartType: 'LineChart', color: 'd62728', isTemp: true,  unit: null /* set from tempUnit at render time */},
  'Min Temperature':        {source: 'GRIDMET', band: 'tmmn', scale_val: 4000, offset: -273.15, chartType: 'LineChart', color: '1f77b4', isTemp: true,  unit: null /* set from tempUnit at render time */},
  'Max Relative Humidity':  {source: 'GRIDMET', band: 'rmax', scale_val: 4000, offset: 0,       chartType: 'LineChart', color: '9467bd', isTemp: false, unit: '%'},
  'Min Relative Humidity':  {source: 'GRIDMET', band: 'rmin', scale_val: 4000, offset: 0,       chartType: 'LineChart', color: 'e377c2', isTemp: false, unit: '%'},
  'Wind Speed':             {source: 'GRIDMET', band: 'vs',   scale_val: 4000, offset: 0,       chartType: 'LineChart', color: '8c564b', isTemp: false, unit: 'm/s'},
  'Solar Radiation':        {source: 'GRIDMET', band: 'srad', scale_val: 4000, offset: 0,       chartType: 'LineChart', color: 'ff7f0e', isTemp: false, unit: 'W/m²'},
  'VPD': {source: 'GRIDMET', band: 'vpd', scale_val: 4000, offset: 0,  chartType: 'LineChart', color: '7c3aed', isTemp: false, unit: 'kPa'}
};

var weatherStatusLabel = ui.Label('', {margin: '2px 8px 4px 8px', fontSize: '11px', color: '#a66'});
var weatherChartPanel  = ui.Panel({layout: ui.Panel.Layout.flow('vertical'), style: {margin: '6px 8px'}});
weatherChartPanel.add(ui.Label('(weather chart will appear here)', {color: '#999', fontSize: '11px'}));

// Temperature unit toggle — shown only when a temperature parameter is selected
var tempUnit = 'C';  // default

var tempUnitPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {margin: '4px 8px 0 8px', shown: false}
});
tempUnitPanel.add(ui.Label('Unit:', {margin: '6px 6px 0 0', fontSize: '11px', color: COLOR_FOREST_DEEP}));

var btnC = ui.Button({
  label: '°C',
  style: {margin: '2px 4px', color: COLOR_LIME, backgroundColor: COLOR_FOREST},
  onClick: function() {
    tempUnit = 'C';
    btnC.style().set({color: COLOR_LIME, backgroundColor: COLOR_FOREST});
    btnF.style().set({color: COLOR_FOREST, backgroundColor: COLOR_MINT});
    buildWeatherChart(weatherParamSelect.getValue());
  }
});
var btnF = ui.Button({
  label: '°F',
  style: {margin: '2px 4px', color: COLOR_FOREST, backgroundColor: COLOR_MINT},
  onClick: function() {
    tempUnit = 'F';
    btnF.style().set({color: COLOR_LIME, backgroundColor: COLOR_FOREST});
    btnC.style().set({color: COLOR_FOREST, backgroundColor: COLOR_MINT});
    buildWeatherChart(weatherParamSelect.getValue());
  }
});
tempUnitPanel.add(btnC);
tempUnitPanel.add(btnF);

function buildWeatherChart(paramName) {
  if (!paramName) return;
  var geom = getFieldsGeometry();
  if (!geom) { weatherStatusLabel.setValue('Draw and load field(s) first.'); return; }
  var dp = dateProblem();
  if (dp) { weatherStatusLabel.setValue(dp); return; }
  var cfg = WEATHER_PARAMS[paramName];
  weatherStatusLabel.setValue('Loading ' + paramName + ' data...');
  weatherChartPanel.clear();

  var useFahrenheit = cfg.isTemp && tempUnit === 'F';
  var unit = cfg.isTemp ? (useFahrenheit ? '°F' : '°C') : cfg.unit;

  // GRIDMET (Climatology Lab) states that data for the last 60 days are
  // "preliminary and subject to change". Recent days are built from daily
  // PRISM and CFSv2 anomalies, with CFSv2 filling only the newest 3-4 days,
  // and are replaced as final data arrive. Rather than dropping that window,
  // we fetch it and flag it visually (dashed line), but only when the
  // selected range reaches into it; a fully historical query shows no
  // preliminary note or legend.
  var nowDate = ee.Date(Date.now());
  var userEndDate = ee.Date(endDateValue).advance(1, 'day');
  var gridmetPrelimBoundaryMs = Date.now() - 60 * 24 * 3600 * 1000;
  var rangeReachesPrelimWindow = endDateValue.getTime() >= gridmetPrelimBoundaryMs;

  var dataEndDate = ee.Date(ee.Algorithms.If(
    userEndDate.millis().lt(nowDate.millis()), userEndDate, nowDate));
  var col = ee.ImageCollection('IDAHO_EPSCOR/GRIDMET')
    .filterBounds(geom)
    .filterDate(ee.Date(startDateValue), dataEndDate)
    .select(cfg.band)
    .map(function(img) {
      var converted = img.add(ee.Number(cfg.offset));  // K → °C (or no-op)
      if (useFahrenheit) { converted = converted.multiply(9/5).add(32); }
      return converted.rename(cfg.band).copyProperties(img, ['system:time_start']);
    });

  // Add date+value as image properties, then extract via aggregate_array
  var bandName = cfg.band;
  var scaleVal = cfg.scale_val;
  var sampleGeom = geom.centroid({maxError: 1}); // GRIDMET pixels (~4km) always exceed typical field size
  var colWithProps = col.map(function(img) {
    var val = img.reduceRegion({
      reducer: ee.Reducer.mean(), geometry: sampleGeom, scale: scaleVal, maxPixels: 1e9
    }).get(bandName);
    return img.set('date_str', img.date().format('YYYY-MM-dd')).set('mean_val', val);
  }).filter(ee.Filter.notNull(['mean_val']));  // keep dates and values in step

  ee.Dictionary({dates: colWithProps.aggregate_array('date_str'), values: colWithProps.aggregate_array('mean_val')})
    .evaluate(function(result) {
      weatherChartPanel.clear();
      if (!result || !result.dates || result.dates.length === 0) {
        weatherStatusLabel.setValue('No data found for this parameter and date range.');
        weatherChartPanel.add(ui.Label(
          'No data available. Check that the date range and location are within the dataset coverage.',
          {color: '#a66', fontSize: '11px', margin: '6px 8px'}
        ));
        return;
      }
      var pts = [];
      for (var i = 0; i < result.dates.length; i++) {
        if (result.values[i] !== null && result.values[i] !== undefined) {
          pts.push({date: result.dates[i], value: result.values[i]});
        }
      }
      pts.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
      if (pts.length === 0) { weatherStatusLabel.setValue('No valid data points returned.'); return; }
      if (rangeReachesPrelimWindow) {
        buildDateValueChartSplit(
          pts, paramName, unit, cfg.color, 'f4a261',
          gridmetPrelimBoundaryMs, weatherChartPanel, paramName + ' (' + unit + ')'
        );
        weatherStatusLabel.setValue(
          'Dashed = recent data, still being finalized but reliable. Solid = final.'
        );
      } else {
        buildDateValueChart(pts, paramName, unit, cfg.color, weatherChartPanel, paramName + ' (' + unit + ')');
        weatherStatusLabel.setValue('');
      }
    });
}

var weatherParamSelect = ui.Select({
  items: Object.keys(WEATHER_PARAMS),
  placeholder: 'Select weather parameter',
  style: {margin: '4px 8px', stretch: 'horizontal'},
  onChange: function(paramName) {
    // Show/hide unit toggle based on whether it's a temperature parameter
    tempUnitPanel.style().set('shown', WEATHER_PARAMS[paramName].isTemp);
    buildWeatherChart(paramName);
  }
});

// ---------------------------------------------------------------------
// 8. CROP SECTION (GRIDMET + Sentinel-2 EVI)
// ---------------------------------------------------------------------
var cropStatusLabel  = ui.Label('', {margin: '2px 8px 4px 8px', fontSize: '11px', color: '#a66'});
var cropPrelimNote    = ui.Label('', {margin: '2px 8px 4px 8px', fontSize: '11px', color: '#a66'});
var growthStageLabel = ui.Label('', {margin: '6px 8px 4px 8px', fontSize: '12px', fontWeight: 'bold', color: COLOR_FOREST});
// Dates on which each growth stage was reached (under the stage line).
var stagesReachedLabel = ui.Label('', {margin: '0 8px 4px 8px', fontSize: '11px', color: COLOR_FOREST_DEEP});
var heatStressLabel  = ui.Label('', {margin: '2px 8px', fontSize: '11px', color: '#c0392b'});
var freezeRiskLabel  = ui.Label('', {margin: '2px 8px 8px 8px', fontSize: '11px', color: '#2980b9'});

var cropChartPanel = ui.Panel({layout: ui.Panel.Layout.flow('vertical'), style: {margin: '4px 8px'}});
var cropSeasonHeading = ui.Label('Crop season', {margin: '12px 8px 4px 8px', fontSize: '13px', fontWeight: 'bold', color: COLOR_FOREST_DEEP});
cropChartPanel.add(ui.Label('(crop charts will appear here)', {color: '#999', fontSize: '11px'}));

var plantingDateLabel = ui.Label('Planting Date (YYYY-MM-DD):', {margin: '8px 8px 0 8px', fontSize: '11px', fontWeight: 'bold', color: COLOR_FOREST_DEEP});
// ── Planting Date ─────────────────────────────────────────────────────
// No default planting date: the user must choose Year, Month and Day.
// Month stays empty until a Year is picked, and Day until a Month is picked,
// because which months/days exist depends on them (no dates after today).
// A part that no longer exists after a change (e.g. day 31 after switching
// to February) is cleared rather than silently moved to another date.
var plantY = null, plantM = null, plantD = null;
var plantYearSel, plantMonthSel, plantDaySel;
var PLANT_DATE_PROMPT = 'Select a planting date and a season end date to see crop results.';

// '2026-04-01' -> '1 Apr 2026' (or '1 Apr' when withYear is false)
function formatDayLabel(dateStr, withYear) {
  var parts = dateStr.split('-');
  var label = parseInt(parts[2], 10) + ' ' + MONTH_NAMES_LIST[parseInt(parts[1], 10) - 1];
  return withYear ? label + ' ' + parts[0] : label;
}

function applyPlantDate() {
  var months = plantY ? monthsAllowed(plantY) : [];
  if (months.indexOf(plantM) < 0) plantM = null;
  var days = (plantY && plantM) ? daysAllowed(plantY, plantM) : [];
  if (days.indexOf(plantD) < 0) plantD = null;

  syncSelect(plantYearSel,  YEARS_LIST, plantY);
  syncSelect(plantMonthSel, months, plantM);
  syncSelect(plantDaySel,   days, plantD);

  plantingDateValue = (plantY && plantM && plantD) ? buildDateFromParts(plantY, plantM, plantD) : null;

  // Results appear once BOTH a crop and a full planting date are chosen, in
  // either order. buildCropSection shows the prompt if the date is incomplete.
  if (cropSelect.getValue()) { buildCropSection(cropSelect.getValue()); }
}

plantYearSel = ui.Select({
  items: YEARS_LIST, placeholder: 'Year', style: {margin: '0 2px', stretch: 'horizontal'},
  onChange: function(v) { plantY = v; applyPlantDate(); }
});
plantMonthSel = ui.Select({
  items: [], placeholder: 'Month', style: {margin: '0 2px', stretch: 'horizontal'},
  onChange: function(v) { plantM = v; applyPlantDate(); }
});
plantDaySel = ui.Select({
  items: [], placeholder: 'Day', style: {margin: '0 2px', stretch: 'horizontal'},
  onChange: function(v) { plantD = v; applyPlantDate(); }
});
var plantDatePanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'), style: {margin: '4px 8px'},
  widgets: [plantYearSel, plantMonthSel, plantDaySel]
});

// ── Season End Date ───────────────────────────────────────────────────
// The Crop Section's own end date: the top End Date does not apply here.
// Blank until the user chooses it; same Year → Month → Day behaviour as the
// planting date (no dates after today).
var seasonY = null, seasonM = null, seasonD = null;
var seasonEndDateValue = null;
var seasonYearSel, seasonMonthSel, seasonDaySel;
var seasonEndLabel = ui.Label('Season End Date (YYYY-MM-DD):', {margin: '8px 8px 0 8px', fontSize: '11px', fontWeight: 'bold', color: COLOR_FOREST_DEEP});

function applySeasonEndDate() {
  var months = seasonY ? monthsAllowed(seasonY) : [];
  if (months.indexOf(seasonM) < 0) seasonM = null;
  var days = (seasonY && seasonM) ? daysAllowed(seasonY, seasonM) : [];
  if (days.indexOf(seasonD) < 0) seasonD = null;
  syncSelect(seasonYearSel,  YEARS_LIST, seasonY);
  syncSelect(seasonMonthSel, months, seasonM);
  syncSelect(seasonDaySel,   days, seasonD);
  seasonEndDateValue = (seasonY && seasonM && seasonD) ? buildDateFromParts(seasonY, seasonM, seasonD) : null;
  if (cropSelect.getValue()) { buildCropSection(cropSelect.getValue()); }
}

seasonYearSel = ui.Select({
  items: YEARS_LIST, placeholder: 'Year', style: {margin: '0 2px', stretch: 'horizontal'},
  onChange: function(v) { seasonY = v; applySeasonEndDate(); }
});
seasonMonthSel = ui.Select({
  items: [], placeholder: 'Month', style: {margin: '0 2px', stretch: 'horizontal'},
  onChange: function(v) { seasonM = v; applySeasonEndDate(); }
});
seasonDaySel = ui.Select({
  items: [], placeholder: 'Day', style: {margin: '0 2px', stretch: 'horizontal'},
  onChange: function(v) { seasonD = v; applySeasonEndDate(); }
});
var seasonEndPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'), style: {margin: '4px 8px'},
  widgets: [seasonYearSel, seasonMonthSel, seasonDaySel]
});

// Generation counter: every buildCropSection() call gets a unique id. If a
// newer call starts before an older one's async Earth Engine results come
// back, the older call's callbacks check this and discard their results
// instead of adding them — otherwise, rapidly changing the planting date
// (Year, then Month, then Day) fires multiple overlapping calculations that
// all add their charts to the same panel instead of replacing each other.
var cropRequestGen = 0;

// Growth Stages chart: cumulative GDD since planting (thick line; solid =
// final GRIDMET data, dashed = last ~60 days, preliminary) with a thin
// horizontal line at each stage threshold, so users see when each stage
// was reached.
function buildStageChart(pts, cropName, boundaryMs, panel) {
  // Stages already reached plus the next one, so the axis fits the season
  // (all stages would squeeze an early-season line at the bottom).
  var allStages = stageMilestones(cropName);   // stage starts + season total
  var total = pts.length ? pts[pts.length - 1].value : 0;
  var stages = [];
  for (var si = 0; si < allStages.length; si++) {
    stages.push(allStages[si]);
    if (allStages[si].gdd > total) break;   // the next stage ahead: stop after it
  }
  var isRecent = function(p) { return boundaryMs !== null && dateToChartMs(p.date) >= boundaryMs; };
  var hasFinal = pts.some(function(p) { return !isRecent(p); });
  var hasRecent = pts.some(isRecent);
  var props = pts.map(function(p) {
    var o = {date_ms: dateToChartMs(p.date)};
    if (isRecent(p)) o.recent_gdd = p.value; else o.final_gdd = p.value;
    stages.forEach(function(st, i) { o['stage' + i] = st.gdd; });
    return o;
  });
  // Join the dashed part to the solid part (no gap between them).
  for (var i = 1; i < props.length; i++) {
    if (props[i].recent_gdd !== undefined && props[i - 1].final_gdd !== undefined) {
      props[i - 1].recent_gdd = props[i - 1].final_gdd; break;
    }
  }
  var cols = [], names = [], series = {}, k = 0;
  var stageColors = ['b08968', 'a78bfa', '60a5fa', '4ade80', 'f472b6'];
  if (hasFinal)  { cols.push('final_gdd');  names.push('Cumulative GDD');
                   series[k++] = {color: 'e67e22', lineWidth: 3, labelInLegend: hasRecent ? 'Final' : 'Cumulative GDD'}; }
  if (hasRecent) { cols.push('recent_gdd'); names.push('Cumulative GDD');
                   series[k++] = {color: 'f4a261', lineWidth: 3, lineDashStyle: [4, 4], labelInLegend: 'Recent (still finalizing, reliable)'}; }
  stages.forEach(function(st, i) {
    cols.push('stage' + i); names.push(st.name + ' (' + st.gdd + ' GDD)');
    series[k++] = {color: stageColors[i % stageColors.length], lineWidth: 1, pointSize: 0,
                   labelInLegend: st.name + ' (' + st.gdd + ')'};
  });
  var chart = ui.Chart.feature.byFeature(
      ee.FeatureCollection(props.map(function(o) { return ee.Feature(null, o); })), 'date_ms', cols)
    .setSeriesNames(names)
    .setChartType('LineChart')
    .setOptions({
      title: cropName + ' — Growth Stages (cumulative GDD)',
      vAxis: {title: 'GDD (°C-days)', minValue: 0, viewWindow: {min: 0}},
      hAxis: {title: 'Date', format: 'MM/dd/yy', gridlines: {count: -1}},
      // Legend above the chart on up to 3 lines: no paging in the narrow panel.
      pointSize: 0, legend: {position: 'top', maxLines: 3}, series: series
    });
  panel.add(chart);
}

// "Stages reached: First Square: 16 May · …" from the cumulative GDD. A date in
// the last ~60 days (preliminary GRIDMET) is marked as possibly shifting.
function stagesReachedText(cropName, cumPts, boundaryMs) {
  var stages = stageMilestones(cropName), parts = [];
  stages.forEach(function(st) {
    for (var i = 0; i < cumPts.length; i++) {
      if (cumPts[i].value >= st.gdd) {
        var t = st.name + ': ' + formatDayLabel(cumPts[i].date, false);
        if (boundaryMs !== null && dateToChartMs(cumPts[i].date) >= boundaryMs) t += ' (recent data, may shift slightly)';
        parts.push(t);
        return;
      }
    }
  });
  if (parts.length === 0) return 'Stages reached: none yet (next: ' + stages[0].name + ' at ' + stages[0].gdd + ' GDD).';
  return 'Stages reached: ' + parts.join(' · ');
}

// Daily air Tmin with a flat line at the crop's base temperature. With a
// boundary, the last ~60 days (GRIDMET preliminary) are drawn dashed.
function buildTminBaseChart(pts, title, base, cropName, boundaryMs, panel, color) {
  var isRecent = function(p) { return boundaryMs !== null && dateToChartMs(p.date) >= boundaryMs; };
  var hasFinal = pts.some(function(p) { return !isRecent(p); });
  var hasRecent = pts.some(isRecent);
  var props = pts.map(function(p) {
    var o = {date_ms: dateToChartMs(p.date), base: base};
    if (isRecent(p)) o.recent_t = p.value; else o.final_t = p.value;
    return o;
  });
  for (var i = 1; i < props.length; i++) {
    if (props[i].recent_t !== undefined && props[i - 1].final_t !== undefined) {
      props[i - 1].recent_t = props[i - 1].final_t; break;
    }
  }
  var cols = [], names = [], series = {}, k = 0;
  // Column names go into the downloaded CSV: plain "deg C" (Excel garbles °).
  if (hasFinal)  { cols.push('final_t');  names.push('Air Tmin (deg C)');
                   series[k++] = {color: color, lineWidth: 2, labelInLegend: hasRecent ? 'Final' : 'Air Tmin'}; }
  if (hasRecent) { cols.push('recent_t'); names.push('Air Tmin (deg C)');
                   series[k++] = {color: 'f4a261', lineWidth: 2, lineDashStyle: [4, 4], labelInLegend: 'Recent (still finalizing, reliable)'}; }
  cols.push('base'); names.push(cropName + ' base temperature (deg C)');
  series[k++] = {color: '991b1b', lineWidth: 1, pointSize: 0, labelInLegend: cropName + ' base temperature (' + base + ' °C)'};
  var chart = ui.Chart.feature.byFeature(
      ee.FeatureCollection(props.map(function(o) { return ee.Feature(null, o); })), 'date_ms', cols)
    .setSeriesNames(names)
    .setChartType('LineChart')
    .setOptions({
      title: title,
      vAxis: {title: '°C'},
      hAxis: {title: 'Date', format: 'MM/dd/yy', gridlines: {count: -1}},
      pointSize: 3, legend: {position: 'bottom'}, series: series
    });
  panel.add(chart);
}

function airTempRating(pct) {
  return pct >= 70 ? {text: 'Mostly above base', color: '#166534'}
       : pct >= 40 ? {text: 'Mixed', color: '#92400e'}
       :             {text: 'Mostly below base', color: '#991b1b'};
}

function buildCropSection(cropName) {
  var geom = getFieldsGeometry();
  if (!geom) { cropStatusLabel.setValue('Draw and load field(s) first.'); return; }

  cropRequestGen++;
  var myGen = cropRequestGen;
  var config = CROP_CONFIG[cropName];

  cropChartPanel.clear();
  growthStageLabel.setValue('');
  stagesReachedLabel.setValue('');
  heatStressLabel.setValue('');
  freezeRiskLabel.setValue('');
  cropPrelimNote.setValue('');
  // Air-temp check, past part (filled in below with the crop results).
  airTempChartPanel.clear();
  airTempStatusLabel.setValue('');
  airTempStatusLabel.style().set('color', '#a66');
  airTempPrelimNote.setValue('');

  // No planting date or season end date yet (or only part of one): wait for
  // the user. The counter above has already discarded older results.
  cropSeasonHeading.setValue('Crop season');
  if (!plantingDateValue || !seasonEndDateValue) {
    cropChartPanel.add(ui.Label('(crop charts will appear here)', {color: '#999', fontSize: '11px'}));
    airTempChartPanel.add(ui.Label('(air-temp chart will appear here)', {color: '#999', fontSize: '11px'}));
    cropStatusLabel.setValue(PLANT_DATE_PROMPT);
    return;
  }

  // One growing season at a time: the planting date must fall within the
  // 12 months before the season end date (a far-back date would add up
  // several seasons of heat and water as if they were one crop).
  var nowMs = Date.now();
  var endMs = Math.min(seasonEndDateValue.getTime() + 86400000, nowMs);
  var spanDays = (endMs - plantingDateValue.getTime()) / 86400000;
  if (spanDays <= 0) {
    cropStatusLabel.setValue('Season end date must be after the planting date.');
    return;
  }
  if (spanDays > 367) {
    cropStatusLabel.setValue('Planting date must be within 12 months of the season end date (one growing season at a time).');
    return;
  }
  var plantStr = plantingDateValue.toISOString().slice(0, 10);
  var endStr = seasonEndDateValue.toISOString().slice(0, 10);
  cropSeasonHeading.setValue('Crop season (' + cropName + ', ' +
    formatDayLabel(plantStr, plantStr.slice(0, 4) !== endStr.slice(0, 4)) + ' – ' + formatDayLabel(endStr, true) + ')');
  cropStatusLabel.setValue('Loading crop data...');

  // Fixed-order sub-panels so charts always appear GDD → ETc → Irrigation → EVI,
  // whichever request finishes first.
  var gddPanel = ui.Panel({style: {margin: '0px'}});
  var etcPanel = ui.Panel({style: {margin: '0px'}});
  var irrPanel = ui.Panel({style: {margin: '0px'}});
  var eviPanel = ui.Panel({style: {margin: '0px'}});
  cropChartPanel.add(gddPanel); cropChartPanel.add(etcPanel);
  cropChartPanel.add(irrPanel); cropChartPanel.add(eviPanel);

  // GRIDMET's last ~60 days are preliminary: fetched, but drawn dashed.
  var prelimBoundaryMs = nowMs - 60 * 86400000;
  var reachesPrelim = seasonEndDateValue.getTime() >= prelimBoundaryMs;
  var point = geom.centroid({maxError: 1});   // GRIDMET 4 km pixel at the field

  // One request: daily GRIDMET values at the field, plus root-zone available
  // water storage (gNATSGO) for the soil-water bucket.
  var gridmet = ee.ImageCollection('IDAHO_EPSCOR/GRIDMET')
    .filterDate(ee.Date(plantingDateValue), ee.Date(endMs))
    .select(['tmmx', 'tmmn', 'eto', 'pr']);
  var rootZoneAws = ee.ImageCollection(SOIL_PARAMETERS['Root Zone Available Water Storage'].layerId)
    .mosaic()
    .reduceRegion({reducer: ee.Reducer.first(), geometry: point, scale: 10});

  ee.List([gridmet.getRegion(point, 4000), rootZoneAws]).evaluate(function(res, err) {
    if (myGen !== cropRequestGen) return; // a newer request has superseded this one
    if (err || !res) {
      cropStatusLabel.setValue('Could not load GRIDMET data: ' + (err || 'no response'));
      return;
    }
    var table = res[0], awsDict = res[1] || {};
    var header = table[0];
    var iT = header.indexOf('time'), iMax = header.indexOf('tmmx'), iMin = header.indexOf('tmmn');
    var iEto = header.indexOf('eto'), iPr = header.indexOf('pr');

    // One record per calendar date (guards against any duplicate images).
    var byDate = {};
    for (var r = 1; r < table.length; r++) {
      var row = table[r];
      var vals = [row[iMax], row[iMin], row[iEto], row[iPr]];
      if (vals.some(function(v) { return v === null || v === undefined; })) continue;
      var dateStr = new Date(row[iT]).toISOString().slice(0, 10);
      byDate[dateStr] = {tmax: row[iMax] - 273.15, tmin: row[iMin] - 273.15,
                         eto: row[iEto], pr: row[iPr]};
    }
    var dates = Object.keys(byDate).sort();
    if (dates.length === 0) {
      cropStatusLabel.setValue(
        'No GRIDMET data for this period. Check the planting date and that the field is within CONUS.');
      return;
    }

    // Soil-water bucket. The soil starts full at planting and can hold up to
    // half of the root-zone available water storage (FAO-56 "readily
    // available water", p = 0.5). Effective rain refills it; the crop draws
    // on it; irrigation is needed only when rain + stored water fall short.
    var awsVals = Object.keys(awsDict).map(function(k) { return awsDict[k]; })
      .filter(function(v) { return v !== null && v > 0; });
    var rootZoneMm = awsVals.length > 0 ? awsVals[0] : null;
    var usableMax = 0.5 * (rootZoneMm || 150);   // 150 mm fallback if gNATSGO has no value
    var stored = usableMax;

    var cumGdd = 0, heatDays = 0, freezeDays = 0, totalNeed = 0, totalEtc = 0, warmDays = 0;
    var cumPts = [], etcPts = [], needPts = [], tminPts = [];
    dates.forEach(function(d) {
      var w = byDate[d];
      var gdd = dailyGdd(w.tmax, w.tmin, config);   // Eq. (3), simple method [20]
      var kc = kcForGdd(cropName, cumGdd);        // stage reached before today
      cumGdd += gdd;
      if (w.tmax > config.heatStressThresh) heatDays++;
      if (w.tmin < config.freezeThresh) freezeDays++;
      if (w.tmin >= config.tbase) warmDays++;          // air-temp check: night warm enough

      var etc = w.eto * kc;
      stored = Math.min(usableMax, stored + w.pr * 0.8);   // effective rain = 80% of GRIDMET pr
      var need = 0;
      if (stored >= etc) { stored -= etc; }
      else { need = etc - stored; stored = 0; }
      totalNeed += need;
      totalEtc += etc;

      cumPts.push({date: d, value: cumGdd});
      tminPts.push({date: d, value: w.tmin});
      etcPts.push({date: d, value: etc});
      needPts.push({date: d, value: need});
    });

    function addChart(pts, title, yTitle, color, panel, opts) {
      if (reachesPrelim) buildDateValueChartSplit(pts, title, yTitle, color, 'f4a261', prelimBoundaryMs, panel, undefined, opts);
      else buildDateValueChart(pts, title, yTitle, color, panel, undefined, opts);
    }
    buildStageChart(cumPts, cropName, reachesPrelim ? prelimBoundaryMs : null, gddPanel);
    addChart(etcPts, cropName + ' — Crop Water Use (ETc)', 'ETc (mm/day)', '0077b6', etcPanel);
    // Short title so it fits the narrow panel; the note under the chart explains
    // that the need is calculated after rain and stored soil water.
    addChart(needPts, cropName + ' — Daily Irrigation Need',
             'Water need (mm/day)', '1a73e8', irrPanel, {minZero: true});

    // Period actually covered by the data (GRIDMET runs a few days behind today).
    var firstDay = dates[0], lastDay = dates[dates.length - 1];
    var sameYear = firstDay.slice(0, 4) === lastDay.slice(0, 4);
    var period = formatDayLabel(firstDay, !sameYear) + ' – ' + formatDayLabel(lastDay, true);
    growthStageLabel.setValue('► Current Stage: ' + determineGrowthStage(cropName, cumGdd) +
      ' (' + Math.round(cumGdd) + ' GDD, ' + period + ')');
    stagesReachedLabel.setValue(stagesReachedText(cropName, cumPts, reachesPrelim ? prelimBoundaryMs : null));
    heatStressLabel.setValue('🔥 Heat Stress Days: ' + heatDays + ' (Tmax > ' + config.heatStressThresh + '°C)');
    freezeRiskLabel.setValue('❄ ' + (config.coldLabel || 'Freeze Risk Days') + ': ' + freezeDays + ' (Tmin < ' + config.freezeThresh + '°C)');
    cropPrelimNote.setValue(reachesPrelim
      ? 'Totals include the last ~60 days — still finalizing, but reliable (see the chart).' : '');
    irrPanel.add(ui.Label(
      'Total irrigation need: ' + Math.round(totalNeed) + ' mm over ' + dates.length + ' days ' +
      '(crop water use ' + Math.round(totalEtc) + ' mm). ' +
      'Kc follows growth stage (' + config.kcIni + ' → ' + config.kcMid + ' → ' + config.kcEnd + '); ' +
      'effective rain = GRIDMET pr × 0.8; soil holds up to ' + Math.round(usableMax) + ' mm usable water ' +
      (rootZoneMm ? '(half of gNATSGO root-zone AWS).' : '(default; no gNATSGO value here).'),
      {fontSize: '10px', color: '#555', margin: '2px 8px 4px 8px', fontStyle: 'italic'}
    ));
    // Rice is usually grown flooded in Louisiana; the soil-water bucket does
    // not model the flood (establishment, seepage, percolation), so say so.
    if (cropName === 'Rice') {
      irrPanel.add(ui.Label(
        'Rice: irrigation need covers crop water use only; flooding, seepage and percolation are not included.',
        {fontSize: '10px', color: '#a66', margin: '0 8px 4px 8px', fontStyle: 'italic'}
      ));
    }

    // Crop air-temp check, past part: same crop, season and data as above.
    var warmPct = Math.round(warmDays / dates.length * 100);
    var rating = airTempRating(warmPct);
    var warmText = cropName + ' (base ' + config.tbase + '°C): warm enough on ' + warmPct +
                   '% of days (' + period + ') — ' + rating.text;
    airTempStatusLabel.setValue(warmText);
    airTempStatusLabel.style().set('color', rating.color);
    airTempPrelimNote.setValue('✓ ' + dates.length + ' days of GRIDMET air Tmin' +
      (reachesPrelim ? ' · includes the last ~60 days — still finalizing, but reliable (see the chart).' : '.'));
    buildTminBaseChart(tminPts, 'Daily air Tmin, ' + period + ' (GRIDMET) — not soil temperature',
                       config.tbase, cropName, reachesPrelim ? prelimBoundaryMs : null, airTempChartPanel, '8b5e34');
    airTempChartPanel.add(ui.Label(warmText, {fontSize: '11px', color: rating.color, margin: '2px 8px 4px 8px'}));
    cropStatusLabel.setValue('');
  });

  // EVI from Sentinel-2 — one value per date, at native 10 m resolution.
  var eviMasked = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(geom)
    .filterDate(ee.Date(plantingDateValue), ee.Date(endMs))
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CLOUD_FILTER))
    .map(maskS2clouds);
  var eviCol = dailyMosaics(eviMasked).map(function(img) {
    var evi = img.expression(
      '2.5 * ((NIR - RED) / (NIR + 6.0 * RED - 7.5 * BLUE + 1.0))',
      {'NIR': img.select('B8').divide(10000),
       'RED': img.select('B4').divide(10000),
       'BLUE': img.select('B2').divide(10000)}
    ).rename('EVI');
    var val = evi.reduceRegion({reducer: ee.Reducer.mean(), geometry: geom, scale: 10,
                                maxPixels: 1e9, tileScale: 4}).get('EVI');
    return img.set('evi_val', val);
  }).filter(ee.Filter.notNull(['evi_val']));   // keep dates and values in step

  ee.Dictionary({dates: eviCol.aggregate_array('date_str'), values: eviCol.aggregate_array('evi_val')})
    .evaluate(function(r) {
      if (myGen !== cropRequestGen) return;
      var pts = [];
      if (r && r.dates) {
        for (var i = 0; i < r.dates.length; i++) pts.push({date: r.dates[i], value: r.values[i]});
      }
      pts.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
      if (pts.length === 0) {
        eviPanel.add(ui.Label('No cloud-free Sentinel-2 views of the field in this period (EVI).',
                              {color: '#999', fontSize: '11px'}));
        return;
      }
      buildDateValueChart(pts, cropName + ' — EVI Time Series', 'EVI', '27ae60', eviPanel);
    });
}

var cropSelect = ui.Select({
  items: Object.keys(CROP_CONFIG),
  placeholder: 'Select crop',
  style: {margin: '4px 8px', stretch: 'horizontal'},
  onChange: function(cropName) {
    clearAirTempForecast();   // forecast belongs to the previous crop: needs a new click
    buildCropSection(cropName);
  }
});

// ---------------------------------------------------------------------
// 9. LACADIAN GROUND-TRUTH DATA
// ---------------------------------------------------------------------
var lacadianStationLabel = ui.Label('Nearest station: —', {
  margin: '4px 8px 2px 8px', fontSize: '11px',
  fontWeight: 'bold', color: COLOR_FOREST_DEEP
});

var lacadianVarSelect = ui.Select({
  items: LACADIAN_VARS,
  value: 'air_temp_ave_degC',
  placeholder: 'Select variable',
  style: {margin: '4px 8px', stretch: 'horizontal'}
});

var lacadianStatusLabel = ui.Label('', {
  margin: '2px 8px 4px 8px', fontSize: '11px', color: '#a66'
});

var lacadianChartPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {margin: '6px 8px'}
});
lacadianChartPanel.add(ui.Label('(LaCADIAN chart will appear here)', {color: '#999', fontSize: '11px'}));

var lacadianLoadBtn = ui.Button({
  label: '📡 Load Ground-Truth Data',
  style: {
    margin: '4px 8px', stretch: 'horizontal',
    color: '#000000', backgroundColor: COLOR_FOREST_DEEP
  },
  onClick: function() {
    var geom = getFieldsGeometry();
    if (!geom) {
      lacadianStatusLabel.setValue('Draw and load a field first.');
      return;
    }
    lacadianStatusLabel.setValue('Finding nearest station...');
    geom.centroid(500).coordinates().evaluate(function(coords) {
      if (!coords) { lacadianStatusLabel.setValue('Could not get field centroid.'); return; }
      buildLaCADIANChart(coords[1], coords[0]);  // GEE returns [lon, lat]
    });
  }
});

function buildLaCADIANChart(fieldLat, fieldLon) {
  lacadianRequestGen++;
  var myGen = lacadianRequestGen;
  var dp = dateProblem();
  if (dp) { lacadianStatusLabel.setValue(dp); return; }
  var result  = findNearestStation(fieldLat, fieldLon);
  var station = result.station;
  lacadianNearestStation = station;

  var far = result.distKm > LACADIAN_MAX_DIST_KM;
  lacadianStationLabel.setValue(
    'Nearest: ' + station.name + '  (' + result.distKm + ' km away)' +
    (far ? ' — far from your field; readings may not represent it.' : '')
  );
  lacadianStatusLabel.setValue('Loading station data...');
  lacadianChartPanel.clear();
  lacadianChartPanel.add(ui.Label('Loading...', {color: '#999', fontSize: '11px'}));

  // Add/update orange station pin (preserve existing NDVI/satellite layers)
  var mapLayers = appMap.layers();
  for (var li = mapLayers.length() - 1; li >= 0; li--) {
    if (mapLayers.get(li).getName().indexOf('LaCADIAN') === 0) {
      mapLayers.remove(mapLayers.get(li));
    }
  }
  appMap.addLayer(
    ee.Geometry.Point([station.lon, station.lat]),
    {color: 'FF6600'},
    'LaCADIAN: ' + station.name
  );

  var selectedVar = lacadianVarSelect.getValue() || 'air_temp_ave_degC';

  // GEE's sandbox blocks client-side HTTP, so the data is pre-uploaded as
  // FeatureCollection assets by lacadian_upload.py (a fixed _base asset plus
  // a daily-refreshed _recent asset).
  var assetId = 'projects/project-foysal/assets/lacadian/' + station.file;
  var base   = ee.FeatureCollection(assetId + '_base');
  var recent = ee.FeatureCollection(assetId + '_recent');

  // Keep only rows that actually have the selected variable, so the dates
  // and values lists stay in step (aggregate_array skips missing values).
  function query(fc) {
    return fc.filterDate(ee.Date(startDateValue), ee.Date(endDateValue).advance(1, 'day'))
             .filter(ee.Filter.notNull([selectedVar]))
             .sort('date');
  }

  function render(fc, note) {
    ee.Dictionary({dates: fc.aggregate_array('date'), values: fc.aggregate_array(selectedVar)})
      .evaluate(function(res, err) {
        if (myGen !== lacadianRequestGen) return;
        lacadianChartPanel.clear();
        if (err || !res || !res.dates || res.dates.length === 0) {
          lacadianStatusLabel.setValue('No "' + selectedVar + '" data at ' + station.name + ' for these dates.');
          return;
        }
        var pts = [];
        for (var i = 0; i < res.dates.length; i++) pts.push({date: res.dates[i], value: res.values[i]});
        pts.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
        buildDateValueChart(pts, station.name + ' — ' + selectedVar, selectedVar, 'FF6600', lacadianChartPanel);
        lacadianStatusLabel.setValue('✓ ' + pts.length + ' daily records · ' + station.name +
                                     ' · LSU AgCenter LaCADIAN' + (note ? ' · ' + note : ''));
      });
  }

  query(base.merge(recent)).size().evaluate(function(n, err) {
    if (myGen !== lacadianRequestGen) return;
    if (err) {
      // Usually the daily update is replacing the _recent asset right now:
      // fall back to the older (_base) data instead of failing outright.
      query(base).size().evaluate(function(n2, err2) {
        if (myGen !== lacadianRequestGen) return;
        lacadianChartPanel.clear();
        if (err2 || !n2) {
          lacadianStatusLabel.setValue('Station data is updating right now. Please try again in a few minutes.');
          return;
        }
        render(query(base), 'recent days are updating; showing older data only');
      });
      return;
    }
    if (!n) {
      lacadianChartPanel.clear();
      lacadianStatusLabel.setValue('No "' + selectedVar + '" data at ' + station.name +
        ' for these dates. Try another variable or date range.');
      return;
    }
    render(query(base.merge(recent)), '');
  });
}

// Auto-refresh chart when variable changes (if a station is already loaded)
lacadianVarSelect.onChange(function() {
  if (!lacadianNearestStation) return;
  var geom = getFieldsGeometry();
  if (!geom) return;
  lacadianStatusLabel.setValue('Refreshing...');
  geom.centroid(500).coordinates().evaluate(function(coords) {
    if (coords) buildLaCADIANChart(coords[1], coords[0]);
  });
});

// ---------------------------------------------------------------------
// 10. COVERAGE WARNING — GRIDMET covers CONUS only (approx. lon -125 to -66, lat 24 to 49)
// ---------------------------------------------------------------------
var CONUS_LON_MIN = -125, CONUS_LON_MAX = -66;
var CONUS_LAT_MIN =   24, CONUS_LAT_MAX =  49;

var coverageWarningStyle = {
  margin: '0 8px 2px 8px', padding: '4px 8px',
  fontSize: '11px', fontWeight: 'bold',
  color: '#7c2d12', backgroundColor: '#fed7aa',
  shown: false
};
var weatherCoverageWarning = ui.Label('', coverageWarningStyle);
var cropCoverageWarning    = ui.Label('', coverageWarningStyle);

function checkConusCoverage() {
  var geom = getFieldsGeometry();
  if (!geom) return;
  geom.centroid(500).coordinates().evaluate(function(coords) {
    if (!coords) return;
    var lon = coords[0], lat = coords[1];
    var inConus = (lon >= CONUS_LON_MIN && lon <= CONUS_LON_MAX &&
                   lat >= CONUS_LAT_MIN && lat <= CONUS_LAT_MAX);
    if (inConus) {
      weatherCoverageWarning.style().set('shown', false);
      cropCoverageWarning.style().set('shown', false);
    } else {
      var msg = (lon < -180 || lon > 180)
        ? 'Field outside valid bounds.'
        // SOLUS100 and gNATSGO (soil) cover the contiguous U.S. only, like GRIDMET;
        // Sentinel-2 (vegetation index) and GFS (forecast) are global.
        : 'Outside CONUS — GRIDMET and soil data unavailable. Weather, crop and soil charts will not work here (vegetation index and 16-day forecast still work).';
      weatherCoverageWarning.setValue(msg);
      weatherCoverageWarning.style().set('shown', true);
      cropCoverageWarning.setValue(msg);
      cropCoverageWarning.style().set('shown', true);
    }
  });
}

// =====================================================================
// 11. CROP AIR-TEMP CHECK (GRIDMET historical)
// Daily air Tmin (not soil). % of days with Tmin ≥ crop GDD tbase.
// =====================================================================
var airTempStatusLabel = ui.Label('', {margin: '2px 8px 4px 8px', fontSize: '11px', color: '#a66'});
var airTempPrelimNote  = ui.Label('', {margin: '2px 8px 4px 8px', fontSize: '11px', color: '#a66'});
var airTempChartPanel  = ui.Panel({layout: ui.Panel.Layout.flow('vertical'), style: {margin: '6px 8px'}});
airTempChartPanel.add(ui.Label('(air-temp chart will appear here)', {color: '#999', fontSize: '11px'}));

// Past part: calculated with the crop results in buildCropSection (selected
// crop, planting date → season end date), shown in airTempStatusLabel /
// airTempPrelimNote / airTempChartPanel.
//
// Forecast part: next 16 days from the latest GFS run, for the selected crop
// only, on request (button). Independent of the planting and season end
// dates. Changing the crop clears it (a new click is needed).
var airFcRequestGen = 0;
var airFcNote   = ui.Label('', {margin: '2px 8px 2px 8px', fontSize: '11px', color: '#a66'});
var airFcResult = ui.Label('', {margin: '2px 8px 4px 8px', fontSize: '11px', color: '#a66'});
var airFcChartPanel = ui.Panel({layout: ui.Panel.Layout.flow('vertical'), style: {margin: '6px 8px'}});

function clearAirTempForecast() {
  airFcRequestGen++;             // discard a forecast still loading
  airFcNote.setValue('');
  airFcResult.setValue('');
  airFcResult.style().set('color', '#a66');
  airFcChartPanel.clear();
}

function buildAirTempForecast() {
  var geom = getFieldsGeometry();
  var cropName = cropSelect.getValue();
  if (!geom) { airFcResult.setValue('Draw and load field(s) first.'); return; }
  if (!cropName) { airFcResult.setValue('Select a crop first.'); return; }
  clearAirTempForecast();
  var myGen = airFcRequestGen;
  var base = CROP_CONFIG[cropName].tbase;
  airFcResult.setValue('Loading the GFS forecast...');
  getReliableGfsRun(geom, function(run, useTime) {
    if (myGen !== airFcRequestGen) return;
    if (!run) { airFcResult.setValue('No GFS data available. Try again in a few minutes.'); return; }
    // Daily minimum = lowest of the four 6-hourly minimum-temperature steps.
    var daily = forecastDaily(run, function(blocks) {
      return blocks.select('minimum_temperature_2m_above_ground').min().rename('tmin');
    });
    var pt = geom.centroid({maxError: 1});
    var withVals = daily.map(function(img) {
      return img.set('tmin_val', img.reduceRegion({reducer: ee.Reducer.first(), geometry: pt, scale: 27830}).get('tmin'));
    }).filter(ee.Filter.notNull(['tmin_val']));
    ee.Dictionary({days: withVals.aggregate_array('forecast_day'), vals: withVals.aggregate_array('tmin_val')})
      .evaluate(function(r, err) {
        if (myGen !== airFcRequestGen) return;
        if (err || !r || !r.days || r.days.length === 0) {
          airFcResult.setValue('The forecast could not be loaded. Try again in a few minutes.');
          return;
        }
        var pts = [], warm = 0;
        for (var i = 0; i < r.days.length; i++) {
          // Forecast day N = the 24 h from (N-1)×24 h after issue; label it by its middle.
          var d = new Date(useTime + (r.days[i] * 24 - 12) * 3600000).toISOString().slice(0, 10);
          pts.push({date: d, value: r.vals[i]});
          if (r.vals[i] >= base) warm++;
        }
        pts.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
        var startLabel = formatDayLabel(new Date(useTime).toISOString().slice(0, 10), true);
        var rating = airTempRating(Math.round(warm / pts.length * 100));
        var resultText = cropName + ' — next ' + pts.length + ' days: ' + warm + ' of ' + pts.length +
                         ' days at or above base (' + base + ' °C)';
        airFcResult.setValue(resultText);
        airFcResult.style().set('color', rating.color);
        airFcNote.setValue('Forecast: next 16 days from ' + startLabel + ' · ' +
                           formatForecastIssued(useTime).replace('issued:', 'issued') +
                           ' · Independent of the planting and season end dates.');
        buildTminBaseChart(pts, 'Next 16 days — forecast Tmin from ' + startLabel + ' (GFS)',
                           base, cropName, null, airFcChartPanel, '7c3aed');
        airFcChartPanel.add(ui.Label(resultText, {fontSize: '11px', color: rating.color, margin: '2px 8px 2px 8px'}));
        airFcChartPanel.add(ui.Label('This is air temperature, not soil.',
          {fontSize: '10px', color: '#555', margin: '2px 8px 4px 8px', fontStyle: 'italic'}));
      });
  }, true);
}

var airFcBtn = ui.Button({
  label: 'Check next 16 days (forecast)',
  style: {margin: '4px 8px', stretch: 'horizontal', color: '#000000', backgroundColor: COLOR_FOREST_DEEP},
  onClick: function() { buildAirTempForecast(); }
});

// ---------------------------------------------------------------------
// 12. LOAD / CLEAR BUTTONS
// ---------------------------------------------------------------------

var loadButton = ui.Button({
  label: 'Click to Load',
  style: {margin: '10px 8px 4px 8px', stretch: 'horizontal',
          color: '#000000', backgroundColor: COLOR_FOREST},
  onClick: function() {
    updateFieldFeatures();
    if (fieldFeatures.length === 0) { statusLabel.setValue('Draw at least one field first.'); return; }
    var dp = dateProblem();
    if (dp) { statusLabel.setValue(dp); return; }   // missing or reversed dates: do not run
    showDateRangeStatus();                           // over 10 months: warn, but still run
    populateNdviDates();
    buildNdviChart();
    checkConusCoverage();
  }
});

var clearAllButton = ui.Button({
  label: 'Clear All',
  style: {margin: '4px 8px 14px 8px', stretch: 'horizontal',
          color: COLOR_FOREST, backgroundColor: COLOR_MINT},
  onClick: function() {
    drawingTools.layers().reset([]);
    fieldFeatures = [];
    fieldCountSelect.setValue(null, false);
    maxFieldsAllowed = 1;
    cropRequestGen++;      // discard crop results still loading
    lacadianRequestGen++;  // discard station results still loading
    ndviChartGen++;        // discard an NDVI chart still loading
    // Start and End Date back to blank (Year / Month / Day placeholders).
    startY = null; startM = null; startD = null;
    applyStartDate();      // also sets startDateValue to null
    endY = null; endM = null; endD = null;
    applyEndDate();        // also sets endDateValue to null
    // Vegetation index and cloud filter back to their starting values.
    currentVegIndex = 'NDVI';
    vegIndexSelect.setValue('NDVI', false);
    CLOUD_FILTER = CLOUD_FILTER_DEFAULT;
    cloudSlider.setValue(CLOUD_FILTER_DEFAULT, false);
    // Planting date back to blank (Year / Month / Day placeholders).
    plantY = null; plantM = null; plantD = null;
    plantingDateValue = null;
    syncSelect(plantYearSel,  YEARS_LIST, null);
    syncSelect(plantMonthSel, [], null);
    syncSelect(plantDaySel,   [], null);
    // Season end date back to blank as well.
    seasonY = null; seasonM = null; seasonD = null;
    seasonEndDateValue = null;
    syncSelect(seasonYearSel,  YEARS_LIST, null);
    syncSelect(seasonMonthSel, [], null);
    syncSelect(seasonDaySel,   [], null);
    areaLabel.setValue('');
    largeAreaWarning.style().set('shown', false);
    statusLabel.setValue('');
    ndviStatusLabel.setValue('');
    ndviDateSelect.items().reset([]);
    appMap.layers().reset([]);
    vegMapLayer = null;
    forecastParamSelect.setValue(null, false);
    forecastStatusLabel.setValue('');
    forecastChartPanel.clear();
    forecastChartPanel.add(ui.Label('(forecast chart will appear here)', {color:'#999', fontSize:'11px'}));
    soilParamSelect.setValue(null, false);
    soilStatusLabel.setValue('');
    soilChartPanel.clear();
    soilChartPanel.add(ui.Label('(soil depth chart will appear here)', {color:'#999', fontSize:'11px'}));
    weatherParamSelect.setValue(null, false);
    tempUnitPanel.style().set('shown', false);
    tempUnit = 'C';
    btnC.style().set({color: COLOR_LIME, backgroundColor: COLOR_FOREST});
    btnF.style().set({color: COLOR_FOREST, backgroundColor: COLOR_MINT});
    weatherStatusLabel.setValue('');
    weatherChartPanel.clear();
    weatherChartPanel.add(ui.Label('(weather chart will appear here)', {color:'#999', fontSize:'11px'}));
    cropSelect.setValue(null, false);
    cropStatusLabel.setValue('');
    growthStageLabel.setValue('');
    stagesReachedLabel.setValue('');
    heatStressLabel.setValue('');
    freezeRiskLabel.setValue('');
    cropPrelimNote.setValue('');
    cropChartPanel.clear();
    cropChartPanel.add(ui.Label('(crop charts will appear here)', {color:'#999', fontSize:'11px'}));
    cropSeasonHeading.setValue('Crop season');
    graphicalInsightPanel.clear();
    graphicalInsightPanel.add(ui.Label('(NDVI time series will appear here)', {color:'#999', fontSize:'11px'}));
    weatherCoverageWarning.style().set('shown', false);
    cropCoverageWarning.style().set('shown', false);
    // LaCADIAN reset
    lacadianVarSelect.setValue('air_temp_ave_degC', false);
    lacadianStationLabel.setValue('Nearest station: —');
    lacadianStatusLabel.setValue('');
    lacadianNearestStation = null;
    lacadianChartPanel.clear();
    lacadianChartPanel.add(ui.Label('(LaCADIAN chart will appear here)', {color:'#999', fontSize:'11px'}));
    // Air-temp check reset
    airTempStatusLabel.setValue('');
    airTempStatusLabel.style().set('color', '#a66');
    airTempPrelimNote.setValue('');
    clearAirTempForecast();
    airTempChartPanel.clear();
    airTempChartPanel.add(ui.Label('(air-temp chart will appear here)', {color:'#999', fontSize:'11px'}));
  }
});

// ---------------------------------------------------------------------
// 13. GRAPHICAL INSIGHT
// ---------------------------------------------------------------------
var graphicalInsightPanel = ui.Panel({layout: ui.Panel.Layout.flow('vertical'), style: {margin: '6px 8px'}});
graphicalInsightPanel.add(ui.Label('(NDVI time series will appear here)', {color: '#999', fontSize: '11px'}));

// ---------------------------------------------------------------------
// 14. ASSEMBLE PANELS
// ---------------------------------------------------------------------

// ── LEFT: Controls only ──────────────────────────────────────────────
var controlPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '414px', padding: '0px', backgroundColor: COLOR_MINT}
});

// Header — title + subtitle on dark green background
var headerSection = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {backgroundColor: COLOR_FOREST, margin: '0px', padding: '0px'}
});
headerSection.add(titleLabel);
headerSection.add(introLabel);
controlPanel.add(headerSection);

// ---------------------------------------------------------------------
// HOW TO USE — accordion (above Location Search)
// ---------------------------------------------------------------------
var howToUseOpen = false;

var howToUseContent = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {margin: '0px', padding: '5px 0px 8px 0px', backgroundColor: COLOR_MINT, shown: false}
});

var howToUseInstructions = [
  'Zoom/pan the map to navigate to your area',
  'Select number of fields (1–5); all are analyzed as one combined area, so draw fields that are close together',
  'Draw polygon(s) on the map',
  'Set date range (recommended: up to 10 months) and click Load',
  'Select any parameter to view charts',
  'Click Clear All to reset'
];

for (var hi = 0; hi < howToUseInstructions.length; hi++) {
  var hBadge = ui.Label(String(hi + 1), {
    margin: '0px', padding: '2px 0px',
    width: '18px', height: '18px',
    fontSize: '10px', fontWeight: 'bold',
    color: COLOR_LIME, backgroundColor: COLOR_FOREST,
    textAlign: 'center'
  });
  var hText = ui.Label(howToUseInstructions[hi], {
    margin: '0px 6px 0px 6px', padding: '0px',
    fontSize: '12px', color: COLOR_FOREST_DEEP
  });
  howToUseContent.add(ui.Panel({
    widgets: [hBadge, hText],
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {margin: '4px 8px', padding: '0px', stretch: 'horizontal'}
  }));
}

var howToUseToggle = ui.Button({
  label: '📋 How to Use  ▶',
  style: {
    margin: '0px', padding: '7px 12px',
    fontSize: '13px', fontWeight: 'bold',
    color: '#000000', backgroundColor: COLOR_FOREST,
    border: '0px', stretch: 'horizontal', textAlign: 'center'
  }
});

howToUseToggle.onClick(function() {
  howToUseOpen = !howToUseOpen;
  howToUseContent.style().set('shown', howToUseOpen);
  howToUseToggle.setLabel(howToUseOpen ? '📋 How to Use  ▼' : '📋 How to Use  ▶');
});

controlPanel.add(howToUseToggle);
controlPanel.add(howToUseContent);

// Field + Date setup
controlPanel.add(fieldInstructionLabel);
controlPanel.add(fieldCountSelect);
controlPanel.add(dateInstructionLabel);
controlPanel.add(startDateLabel);
controlPanel.add(startDatePanel);
controlPanel.add(endDateLabel);
controlPanel.add(endDatePanel);
controlPanel.add(loadButton);
controlPanel.add(clearAllButton);
controlPanel.add(areaLabel);
controlPanel.add(largeAreaWarning);
controlPanel.add(statusLabel);

// NDVI controls
controlPanel.add(sectionDivider('🌿 Vegetation Index Map'));
controlPanel.add(ui.Label('Select date for the vegetation index map:', {margin: '6px 10px 2px 10px', fontSize: '12px', color: COLOR_FOREST_DEEP, textAlign: 'center', stretch: 'horizontal'}));
controlPanel.add(ndviDateSelect);
controlPanel.add(vegIndexSelect);
controlPanel.add(ndviLegendPanel);
controlPanel.add(ndviStatusLabel);
controlPanel.add(ui.Label('Cloud cover filter (max %):', {margin: '6px 10px 0px 10px', fontSize: '11px', color: COLOR_FOREST_DEEP}));
// Named so Clear All can reset it.
var cloudSlider = ui.Slider({
  min: 5, max: 80, value: CLOUD_FILTER, step: 5,
  style: {margin: '2px 8px 4px 8px', stretch: 'horizontal'},
  // Wait until the user stops dragging (0.5 s), then update BOTH the date
  // list and the chart so they always use the same cloud limit.
  onChange: ui.util.debounce(function(val) {
    CLOUD_FILTER = val;
    if (!getFieldsGeometry()) return;   // nothing loaded yet
    populateNdviDates(true);
    buildNdviChart();
  }, 500)
});
controlPanel.add(cloudSlider);

// Weather controls
controlPanel.add(sectionDivider('🌧 Historical Weather'));
controlPanel.add(weatherCoverageWarning);
controlPanel.add(ui.Label('Select a historical weather variable:', {margin: '6px 10px 2px 10px', fontSize: '12px', color: COLOR_FOREST_DEEP, textAlign: 'center', stretch: 'horizontal'}));
controlPanel.add(weatherParamSelect);
controlPanel.add(tempUnitPanel);
controlPanel.add(weatherStatusLabel);

// Forecast controls
controlPanel.add(sectionDivider('📊 16-Day Forecast'));
controlPanel.add(ui.Label('Select weather parameter for next 16 days:', {margin: '6px 10px 2px 10px', fontSize: '12px', color: COLOR_FOREST_DEEP, textAlign: 'center', stretch: 'horizontal'}));
controlPanel.add(forecastParamSelect);
controlPanel.add(forecastStatusLabel);

// Soil controls
controlPanel.add(sectionDivider('🪨 Soil Parameter'));
controlPanel.add(soilParamSelect);
controlPanel.add(ui.Label(
  'Soil data stays fixed, regardless of dates chosen.',
  {margin: '2px 8px 4px 8px', fontSize: '11px', color: '#a66'}
));
controlPanel.add(soilStatusLabel);

// LaCADIAN controls
controlPanel.add(sectionDivider('📡 Field Station Data'));
controlPanel.add(ui.Label(
  'Daily station data from 24 LSU AgCenter sites across Louisiana (updated once a day).',
  {margin: '6px 10px 2px 10px', fontSize: '12px', color: COLOR_FOREST_DEEP,
   textAlign: 'center', stretch: 'horizontal'}
));
controlPanel.add(ui.Label(
  '⚠️ Note: Station data availability varies by location. For best results, start from January 2026. Some stations may have data from mid-2025.',
  {margin: '2px 10px 4px 10px', fontSize: '11px', color: '#92400e',
   backgroundColor: '#fef3c7', padding: '4px 6px', stretch: 'horizontal'}
));
controlPanel.add(lacadianStationLabel);
controlPanel.add(lacadianVarSelect);
controlPanel.add(lacadianLoadBtn);
controlPanel.add(lacadianStatusLabel);

// Small bold sub-heading used inside a section (e.g. the Crop Section's parts).
function subHeading(text) {
  return ui.Label(text, {margin: '12px 8px 4px 8px', fontSize: '13px', fontWeight: 'bold', color: COLOR_FOREST_DEEP});
}

// Crop controls
controlPanel.add(sectionDivider('🌾 Crop Section'));
controlPanel.add(cropCoverageWarning);
controlPanel.add(ui.Label('Uses its own planting and season end dates.',
  {margin: '6px 10px 0 10px', fontSize: '11px', color: '#555', fontStyle: 'italic', textAlign: 'center', stretch: 'horizontal'}));
controlPanel.add(ui.Label('Select crop, planting date and season end date:', {margin: '6px 10px 2px 10px', fontSize: '12px', color: COLOR_FOREST_DEEP, textAlign: 'center', stretch: 'horizontal'}));
controlPanel.add(cropSelect);
controlPanel.add(plantingDateLabel);
controlPanel.add(plantDatePanel);
controlPanel.add(seasonEndLabel);
controlPanel.add(seasonEndPanel);
controlPanel.add(growthStageLabel);
controlPanel.add(stagesReachedLabel);
controlPanel.add(heatStressLabel);
controlPanel.add(freezeRiskLabel);
controlPanel.add(cropPrelimNote);
controlPanel.add(cropStatusLabel);

// Crop air-temp check (selected crop): past part appears with the crop
// results; the 16-day forecast part is on request and independent of dates.
controlPanel.add(subHeading('Crop air-temp check'));
controlPanel.add(ui.Label('For the selected crop · air temperature, not soil.',
  {margin: '0 8px 4px 8px', fontSize: '11px', color: '#555', fontStyle: 'italic'}));
controlPanel.add(airTempStatusLabel);
controlPanel.add(airTempPrelimNote);
controlPanel.add(airFcBtn);
controlPanel.add(airFcNote);
controlPanel.add(airFcResult);

// ── Data Sources ──────────────────────────────────────────────────────
controlPanel.add(sectionDivider('📡 Data Sources'));
controlPanel.add(ui.Label(
  'Sentinel-2 (COPERNICUS/S2_SR_HARMONIZED) · GRIDMET (IDAHO_EPSCOR/GRIDMET) · ' +
  'NOAA GFS 0.25° (NOAA/GFS0P25) · ' +
  'SOLUS 100m Soil (USDA/SOLUS100/V0) · gNATSGO 10m Soil (sat-io/gNATSGO) · ' +
  'LaCADIAN (LSU AgCenter / SHaRE Lab, Azure Blob Storage)',
  {margin: '6px 8px 8px 8px', fontSize: '10px', color: COLOR_FOREST_DEEP}
));

// ── Developed By ──────────────────────────────────────────────────────
controlPanel.add(sectionDivider('🖥 Developed By'));
controlPanel.add(ui.Label(
  'Dr. Ivan Grijalva',
  {margin: '6px 8px 0px 8px', fontSize: '11px', fontWeight: 'bold', color: COLOR_FOREST}
));
controlPanel.add(ui.Label(
  'Department of Entomology, Louisiana State University',
  {margin: '0px 8px 6px 8px', fontSize: '10px', color: COLOR_FOREST_DEEP}
));
controlPanel.add(ui.Label(
  'Mohammad Arif Foysal Rifat',
  {margin: '2px 8px 0px 8px', fontSize: '11px', fontWeight: 'bold', color: COLOR_FOREST}
));
controlPanel.add(ui.Label(
  'Department of Geography & Anthropology, Louisiana State University',
  {margin: '0px 8px 4px 8px', fontSize: '10px', color: COLOR_FOREST_DEEP}
));
controlPanel.add(ui.Label(
  'CropSight-LA is built on Google Earth Engine to monitor, forecast, and visualize agroclimatic conditions for Louisiana croplands. © 2026',
  {margin: '4px 8px 10px 8px', fontSize: '10px', color: COLOR_FOREST_DEEP}
));

// ── MIDDLE: Charts only ──────────────────────────────────────────────
var chartsPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {width: '477px', padding: '0px', backgroundColor: '#ffffff'}
});

var chartsDivider = function(text) {
  return ui.Label(text, {
    margin: '0px', padding: '6px 12px 4px 12px',
    fontWeight: 'bold', fontSize: '13px',
    color: COLOR_LIME, backgroundColor: COLOR_FOREST,
    textAlign: 'center', stretch: 'horizontal'
  });
};

// NDVI time series
chartsPanel.add(chartsDivider('🌿 Vegetation Index Time Series'));
chartsPanel.add(graphicalInsightPanel);

// Weather chart
chartsPanel.add(chartsDivider('🌧 Historical Weather'));
chartsPanel.add(weatherChartPanel);

// Forecast chart
chartsPanel.add(chartsDivider('📊 16-Day Forecast'));
chartsPanel.add(forecastChartPanel);

// Soil chart
chartsPanel.add(chartsDivider('🪨 Soil Parameter'));
chartsPanel.add(soilChartPanel);

// LaCADIAN ground-truth chart
chartsPanel.add(chartsDivider('📡 Field Station Data'));
chartsPanel.add(lacadianChartPanel);

// Crop charts
chartsPanel.add(chartsDivider('🌾 Crop Charts'));
chartsPanel.add(cropSeasonHeading);
chartsPanel.add(cropChartPanel);
chartsPanel.add(subHeading('Crop air-temp check'));
chartsPanel.add(airTempChartPanel);
chartsPanel.add(airFcChartPanel);

// ---------------------------------------------------------------------
// 15. LAYOUT  (Controls | Map | Charts)
// ---------------------------------------------------------------------
ui.root.clear();
ui.root.add(controlPanel);
ui.root.add(appMap);
ui.root.add(chartsPanel);
