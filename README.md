# CropSight-LA

**A Google Earth Engine web application for crop monitoring and agroclimatic decision support in Louisiana.**

CropSight-LA lets users draw their fields on a map and, in one interface, view satellite vegetation indices, historical weather, a 16-day weather forecast, soil properties, daily data from the nearest LaCADIAN field station, and crop-specific indicators (growth stage, crop water use, irrigation need and cold/heat days).

- **Live app:** https://project-foysal.projects.earthengine.app/view/cropsight-la
- **Platform:** Google Earth Engine (JavaScript API)
- **Version:** v1.0 
- **License:** MIT (see [LICENSE.txt](LICENSE.txt))

---

## Features

| Module | What it shows | Data source |
|---|---|---|
| Vegetation Index Map and Time Series | NDVI, NDRE or EVI map for a selected date, and a field-mean time series; adjustable cloud-cover filter | Sentinel-2 Level-2A |
| Historical Weather | Daily precipitation, max/min temperature (°C or °F), max/min relative humidity, wind speed, solar radiation and VPD | gridMET |
| 16-Day Forecast | Daily temperature (high/low), precipitation, wind speed, wind direction, VPD and a simplified ET₀ estimate | NOAA GFS 0.25° |
| Soil Parameter | 11 properties: pH, bulk density, sand, silt, clay, CaCO₃, CEC and EC by depth (SOLUS100); organic carbon and available water storage by depth, and root-zone available water storage (gNATSGO) | SOLUS100, gNATSGO |
| Field Station Data | 36 daily variables from the nearest of 24 LaCADIAN stations, with a warning when the station is more than 50 km from the field | LaCADIAN (LSU AgCenter) |
| Crop Section | For 9 Louisiana crops: growth stage from growing degree days, crop water use (ETc), daily irrigation need, EVI time series, heat-stress days and cold days | gridMET, gNATSGO, Sentinel-2 |
| Crop air-temp check | Share of days with air minimum temperature at or above the crop's base temperature, for the season and for the next 16 days | gridMET, NOAA GFS |

Supported crops: Sugarcane, Rice, Cotton, Corn, Soybeans, Sweet Potatoes, Wheat, Pasture & Forage, and Sorghum.

Crop parameters (base and upper temperatures, crop coefficients, heat and cold limits and season GDD totals) are listed in Table 2 of the accompanying article. The season GDD totals for sugarcane, sweet potatoes and pasture were calculated with [`tools/GDD_Calculation.js`](tools/GDD_Calculation.js), which can be run in the Earth Engine Code Editor.

## How to use the app

1. Open the [live app](https://project-foysal.projects.earthengine.app/view/cropsight-la).
2. Select the number of fields (1–5) and draw them on the map. All fields are analyzed as one combined area, so draw fields that are close together.
3. Select a Start Date and End Date (recommended: up to 10 months) and click **Click to Load**.
4. Select any parameter in a section to view its chart.
5. For the Crop Section, select a crop, a planting date and a season end date.
6. Click **Clear All** to reset.

Every chart can be downloaded as CSV, SVG or PNG from its pop-out menu.

## Running the code yourself

The application is a single Earth Engine script: [`src/cropsight-la.js`](src/cropsight-la.js).

1. Sign in to the [Earth Engine Code Editor](https://code.earthengine.google.com/) with an account registered for Earth Engine.
2. Create a new script, paste the contents of `src/cropsight-la.js` and click **Run**.

All satellite, weather, forecast and soil datasets are public Earth Engine datasets. The LaCADIAN station data are read from shared Earth Engine assets (`projects/project-foysal/assets/lacadian/`), which are kept up to date by the pipeline described below.

## Repository structure

```
CropSight-LA/
├── README.md                 This file
├── LICENSE.txt               MIT license
├── src/
│   └── cropsight-la.js       The Earth Engine application
├── tools/
│   └── GDD_Calculation.js    Season GDD totals for sugarcane, sweet potatoes and pasture
└── pipeline/                 Daily LaCADIAN station-data update (documentation copy)
    ├── README.md             How the pipeline works
    ├── lacadian_upload.py    Downloads LaCADIAN data and uploads it to Earth Engine
    ├── make_lacadian_public.py  Grants the app read access to the station assets
    ├── update_lacadian.yml   GitHub Actions workflow (runs daily)
    └── requirements.txt      Python dependencies
```

## LaCADIAN station-data pipeline

Earth Engine apps cannot download external data directly, so LaCADIAN station data are copied into Earth Engine once a day by a GitHub Actions workflow. Each station has two assets:

- `<station>_base`: historical data (January 2025 to 30 July 2026), uploaded once.
- `<station>_recent`: data from 31 July 2026 onward, replaced daily.

The app combines both. See [`pipeline/README.md`](pipeline/README.md) for details.

## Data sources

| Dataset | Earth Engine ID | Resolution |
|---|---|---|
| Sentinel-2 MSI Level-2A (Harmonized) | `COPERNICUS/S2_SR_HARMONIZED` | 10–20 m |
| gridMET daily meteorology | `IDAHO_EPSCOR/GRIDMET` | ~4 km, daily |
| NOAA Global Forecast System | `NOAA/GFS0P25` | 0.25°, 6-hourly |
| SOLUS100 soil properties | `USDA/SOLUS100/V0` | 100 m |
| gNATSGO soil (community catalog) | `projects/sat-io/open-datasets/gNATSGO` | 10 m |
| LaCADIAN field stations (LSU AgCenter) | `projects/project-foysal/assets/lacadian` | 24 stations, daily |

## Limitations

- gridMET, SOLUS100 and gNATSGO cover the contiguous United States only. Outside it, the weather, soil and crop modules do not work; the vegetation index and forecast modules still do.
- gridMET data for the most recent ~60 days are preliminary and may change; the app marks them with a dashed line.
- Multiple fields are combined into one area. Weather, forecast, soil-water and station data are taken at the center of that combined area.
- The vegetation index map is not cloud-masked at the pixel level; scenes are filtered by overall cloud cover.
- The forecast ET₀ is a simplified Hargreaves–Samani estimate, not a full FAO-56 Penman–Monteith calculation.
- Growth stages are estimated from heat units only.
- The soil-water balance is simplified (effective rainfall = 80% of precipitation; readily available water = 50% of root-zone available water storage for all crops). For rice, flood water, seepage and percolation are not included.
- LaCADIAN station data are shown as provided, without additional quality control.

## Authors

- **Mohammad Arif Foysal Rifat**, Department of Geography & Anthropology, Louisiana State University
- **Vinit Sehgal**, School of Plant, Environmental and Soil Sciences, Louisiana State University
- **Michael Leitner**, Department of Geography & Anthropology, Louisiana State University
- **Ivan Grijalva**, Department of Entomology, Louisiana State University

Contact: ariffoysalr@gmail.com

## Acknowledgments

Field station data are provided by the Louisiana Climate and Digital Ag Network (LaCADIAN), operated by the LSU AgCenter and the SHaRE Lab ([project page](https://www.lsuagcenter.com/portals/our_offices/departments/spess/lacadian), [data portal](https://sharelab.data.lsuagcenter.com/)). The LaCADIAN project is sponsored by the USDA Natural Resources Conservation Service (USDA-NRCS).

## Citation

If you use CropSight-LA, please cite the accompanying article (manuscript submitted to *SoftwareX*; citation details will be added on publication).
