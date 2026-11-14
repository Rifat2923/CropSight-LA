// =====================================================================
// CropSight-LA — season GDD totals for sugarcane, sweet potatoes and
// pasture, from 30 years (1996–2025) of GRIDMET, averaged over Louisiana.
// Run in the Earth Engine Code Editor; results appear in the Console.
//
// Method (same as the app, manuscript Eq. 3):
//   Tavg = (Tmax + Tmin) / 2
//   GDD  = 0 if Tavg < Tbase; Tavg − Tbase if between; Tupper − Tbase if Tavg > Tupper
// For each year, daily GDD are summed from the planting date to the
// harvest date, per GRIDMET pixel; the statewide mean of that sum is
// taken; the 30 yearly values are then averaged.
// Season dates: midpoint of the NASS "most active" planting period to
// midpoint of the NASS "most active" harvesting period [21].
// =====================================================================

var START_YEAR = 1996, END_YEAR = 2025;

// ⚠ FILL IN: NASS Louisiana "most active" periods, as 'MM-DD'.
// The script takes the midpoint of each period.
var CROPS = [
  {
    name: 'Sugarcane (ratoon)', tbase: 10, tupper: 45,
    // NASS gives plant-cane planting (Aug–Sep), not ratoon regrowth, so the
    // ratoon season is counted from 1 January (calendar-year season).
    plantMostActive:   ['01-01', '01-01'],   // ratoon season start: 1 January
    harvestMostActive: ['10-18', '12-17']    // NASS LA harvest, most active [21]
  },
  {
    name: 'Sweet potatoes', tbase: 12, tupper: 30,
    plantMostActive:   ['05-24', '06-25'],   // NASS LA planting, most active [21]
    harvestMostActive: ['09-10', '11-10']    // NASS LA harvest, most active [21]
  },
  {
    name: 'Pasture & forage', tbase: 10, tupper: 30,
    // NASS gives no "most active" period for Louisiana other hay, so the
    // season runs from the first to the last hay harvest date [21].
    plantMostActive:   ['04-17', '04-17'],   // NASS LA other hay, harvest begins [21]
    harvestMostActive: ['09-14', '09-14']    // NASS LA other hay, harvest ends [21]
  }
];

// Midpoint of an 'MM-DD' period, as [month, day] (non-leap reference year).
function midpoint(period) {
  var a = new Date(Date.UTC(2001, +period[0].slice(0, 2) - 1, +period[0].slice(3)));
  var b = new Date(Date.UTC(2001, +period[1].slice(0, 2) - 1, +period[1].slice(3)));
  var m = new Date((a.getTime() + b.getTime()) / 2);
  return [m.getUTCMonth() + 1, m.getUTCDate()];
}

var louisiana = ee.FeatureCollection('TIGER/2018/States')
  .filter(ee.Filter.eq('NAME', 'Louisiana')).geometry();
var gridmet = ee.ImageCollection('IDAHO_EPSCOR/GRIDMET').select(['tmmx', 'tmmn']);

// Season GDD total for one crop and one year (one image, per pixel).
function seasonGdd(crop, start, end, year) {
  var s = ee.Date.fromYMD(year, start[0], start[1]);
  var e = ee.Date.fromYMD(year, end[0], end[1]).advance(1, 'day');   // include harvest day
  return gridmet.filterDate(s, e).map(function(img) {
    var tavg = img.select('tmmx').add(img.select('tmmn')).divide(2).subtract(273.15);
    // clamp(Tavg, Tbase, Tupper) − Tbase is exactly Eq. 3
    return tavg.max(crop.tbase).min(crop.tupper).subtract(crop.tbase).rename('gdd');
  }).sum();
}

CROPS.forEach(function(crop) {
  var start = midpoint(crop.plantMostActive);
  var end   = midpoint(crop.harvestMostActive);
  var yearly = ee.FeatureCollection(ee.List.sequence(START_YEAR, END_YEAR).map(function(y) {
    var v = seasonGdd(crop, start, end, ee.Number(y)).reduceRegion({
      reducer: ee.Reducer.mean(), geometry: louisiana, scale: 4000,
      maxPixels: 1e9, tileScale: 4
    }).get('gdd');
    return ee.Feature(null, {year: y, gdd: v});
  }));

  print('── ' + crop.name + ' (Tbase ' + crop.tbase + ', Tupper ' + crop.tupper + ' °C), season ' +
        start[1] + '/' + start[0] + ' → ' + end[1] + '/' + end[0] + ' (day/month)');
  print('30-year mean GDD (°C-days):', yearly.aggregate_mean('gdd'));
  print('Lowest / highest year:', yearly.aggregate_min('gdd'), yearly.aggregate_max('gdd'));
  print(ui.Chart.feature.byFeature(yearly, 'year', 'gdd')
    .setOptions({title: crop.name + ' — season GDD by year (Louisiana mean)',
                 hAxis: {format: '####'}, vAxis: {title: 'GDD (°C-days)'}, legend: {position: 'none'}}));
});
