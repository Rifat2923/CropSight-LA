#!/usr/bin/env python3
"""
lacadian_upload.py
------------------
Downloads LaCADIAN daily station data from Azure Blob Storage and
uploads each station as a GEE FeatureCollection asset.

Two modes:
  --mode base    One-time historical upload (Jan 2025 – Jul 30 2026).
                 Creates assets named  LAC001_Ben_Hur_base, etc.
                 Run this ONCE manually, then never again.

  --mode recent  Daily update (Jul 31 2026 – today).
                 Creates assets named  LAC001_Ben_Hur_recent, etc.
                 Run this every day via GitHub Actions.

Credentials (do not hard-code secrets in this file)
---------------------------------------------------
    LACADIAN_SAS_TOKEN   Azure SAS query string for the LaCADIAN container
    GEE_KEY_FILE         Path to a GEE service-account JSON key
                         (default: key.json, or set the env var)

Requirements
------------
    pip install earthengine-api requests

Usage
-----
    export LACADIAN_SAS_TOKEN='sp=...&sig=...'   # from a secret store
    export GEE_KEY_FILE=key.json
    python lacadian_upload.py                      # daily recent update (default)
    python lacadian_upload.py --mode base          # one-time base upload
    python lacadian_upload.py --station LAC001     # single station
    python lacadian_upload.py --no-wait            # fire tasks and exit

Safe replacement
----------------
When waiting (the default), each station is exported to a temporary
<name>_tmp asset first. Only after that export succeeds is the old asset
deleted and the temporary one renamed into place, so the app keeps reading
the old data until the new data is ready. With --no-wait the old asset is
deleted before the export starts (the app shows no recent data meanwhile).
"""

import argparse
import datetime
import json
import math
import os
import re
import sys
import time

import ee
import requests

# ── Azure access (token MUST come from the environment) ──────────────────────
SAS_TOKEN = os.environ.get('LACADIAN_SAS_TOKEN', '').strip()
BLOB_BASE = 'https://sharelabdata.blob.core.windows.net/data/LaCADIAN/Daily/'
HEADER_URL = (
    'https://sharelabdata.blob.core.windows.net/data/'
    'LaCADIAN/Header/daily.txt'
)

# ── GEE destination ──────────────────────────────────────────────────────────
GEE_PROJECT = 'project-foysal'
GEE_FOLDER  = 'projects/project-foysal/assets/lacadian'
KEY_FILE    = os.environ.get('GEE_KEY_FILE', 'key.json')

# ── Base / Recent split date ─────────────────────────────────────────────────
BASE_END_DATE     = '2026-07-30'   # last date stored in _base assets
RECENT_START_DATE = '2026-07-31'   # first date stored in _recent assets
RECENT_START_YEAR = 2026           # year RECENT_START_DATE falls in

# ── All 24 LaCADIAN stations ─────────────────────────────────────────────────
STATIONS = [
    {'name': 'Ben Hur',         'file': 'LAC001_Ben_Hur',         'lat': 30.373, 'lon': -91.164},
    {'name': 'Hammond',         'file': 'LAC002_Hammond',         'lat': 30.504, 'lon': -90.377},
    {'name': 'St Gabriel',      'file': 'LAC003_StGabriel',       'lat': 30.268, 'lon': -91.098},
    {'name': 'Homer',           'file': 'LAC004_Homer',           'lat': 32.754, 'lon': -93.071},
    {'name': 'Bossier City',    'file': 'LAC005_BossierCity',     'lat': 32.411, 'lon': -93.639},
    {'name': 'Winnsboro',       'file': 'LAC006_Winnsboro',       'lat': 32.146, 'lon': -91.690},
    {'name': 'Chase',           'file': 'LAC007_Chase',           'lat': 32.100, 'lon': -91.708},
    {'name': 'Alexandria West', 'file': 'LAC008_Alexandria_West', 'lat': 31.167, 'lon': -92.411},
    {'name': 'Alexandria East', 'file': 'LAC009_Alexandria_East', 'lat': 31.175, 'lon': -92.389},
    {'name': 'St Joseph',       'file': 'LAC010_StJoseph',        'lat': 31.950, 'lon': -91.234},
    {'name': 'Franklinton',     'file': 'LAC011_Franklinton',     'lat': 30.786, 'lon': -90.202},
    {'name': 'Clinton',         'file': 'LAC012_Clinton',         'lat': 30.815, 'lon': -90.969},
    {'name': 'Jeanerette',      'file': 'LAC013_Jeanerette',      'lat': 29.960, 'lon': -91.713},
    {'name': 'Crowley',         'file': 'LAC014_Crowley',         'lat': 30.178, 'lon': -92.354},
    {'name': 'Amite',           'file': 'LAC015_Amite',           'lat': 30.701, 'lon': -90.431},
    {'name': 'LA House',        'file': 'LAC016_LAHouse',         'lat': 30.404, 'lon': -91.189},
    {'name': 'Lake Providence', 'file': 'LAC017_LakeProvidence',  'lat': 32.751, 'lon': -91.272},
    {'name': 'Tallulah',        'file': 'LAC018_Tallulah',        'lat': 32.444, 'lon': -91.159},
    {'name': 'Newellton',       'file': 'LAC019_Newellton',       'lat': 32.099, 'lon': -91.252},
    {'name': 'Deridder',        'file': 'LAC020_Deridder',        'lat': 30.802, 'lon': -93.163},
    {'name': 'Kinder',          'file': 'LAC021_Kinder',          'lat': 30.510, 'lon': -92.830},
    {'name': 'Leeville',        'file': 'LAC022_Leeville',        'lat': 31.173, 'lon': -93.160},
    {'name': 'St Francisville', 'file': 'LAC023_StFrancisville',  'lat': 30.981, 'lon': -91.348},
    {'name': 'Oak Grove',       'file': 'LAC024_OakGrove',        'lat': 32.791, 'lon': -91.558},
]

# Missing-data codes that must never be stored as real measurements.
# CONFIRM against LaCADIAN's documentation and add its actual code(s).
MISSING_VALUES = {-9999.0, -999.0, -99.0}

# Columns that are coordinates — skip them
SKIP_COLS = {'longitude(deg)', 'latitude(deg)', 'Longitude', 'Latitude',
             'longitude', 'latitude', ''}


def require_sas_token():
    if SAS_TOKEN:
        return
    print(
        'ERROR: LACADIAN_SAS_TOKEN is not set.\n'
        'Export the Azure SAS query string from a secret store, e.g.\n'
        '  export LACADIAN_SAS_TOKEN="sp=...&sig=..."\n'
        'Do not commit the token to git.'
    )
    sys.exit(1)


def with_sas(url: str) -> str:
    sep = '&' if '?' in url else '?'
    return url + sep + SAS_TOKEN


# ── Helpers ──────────────────────────────────────────────────────────────────

def sanitize_prop(name: str) -> str:
    s = name.replace('%', 'pct')
    s = s.replace('/', '_per_')
    s = re.sub(r'[()]', '_', s)
    s = re.sub(r'_+', '_', s)
    return s.strip('_')


def fetch_headers() -> list:
    r = requests.get(with_sas(HEADER_URL), timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f'Could not fetch header file: HTTP {r.status_code}')
    headers = [h.strip() for h in r.text.strip().split('\t')]
    print(f'Header file loaded: {len(headers)} columns')
    return headers


def fetch_tsv(station_file: str, year: int) -> str | None:
    url = with_sas(f'{BLOB_BASE}{year}/{station_file}_DAILY_{year}.txt')
    try:
        r = requests.get(url, timeout=30)
    except requests.RequestException as exc:
        print(f'    Network error: {exc}')
        return None
    if r.status_code == 404:
        return None
    if r.status_code != 200:
        print(f'    HTTP {r.status_code} for {station_file}/{year}')
        return None
    return r.text


def parse_tsv(text: str, station: dict, headers: list,
              date_filter=None) -> list:
    """
    Parse TSV into ee.Feature list.
    date_filter: optional callable(date_str) -> bool; keep row if True.
    """
    lines = text.strip().split('\n')
    features = []

    for raw_line in lines:
        cols = raw_line.split('\t')
        date_str = cols[0].strip() if cols else ''
        if not date_str:
            continue
        try:
            dt = datetime.datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            continue

        # Normalise to zero-padded YYYY-MM-DD so string comparisons
        # (date_filter, BASE_END_DATE) always work, e.g. '2026-7-5'.
        date_str = dt.strftime('%Y-%m-%d')
        if date_filter and not date_filter(date_str):
            continue

        ts_ms = int(datetime.datetime(
            dt.year, dt.month, dt.day,
            tzinfo=datetime.timezone.utc).timestamp() * 1000)

        props = {
            'date':              date_str,
            'system:time_start': ts_ms,
            'station_name':      station['name'],
            'station_file':      station['file'],
        }

        for i, header in enumerate(headers):
            if header in SKIP_COLS or i >= len(cols):
                continue
            val = cols[i].strip()
            if not val:
                continue
            try:
                num = float(val)
            except ValueError:
                continue
            # Drop NaN/inf and missing-data codes instead of storing them.
            if math.isnan(num) or math.isinf(num) or num in MISSING_VALUES:
                continue
            props[sanitize_prop(header)] = num

        geom = ee.Geometry.Point([station['lon'], station['lat']])
        features.append(ee.Feature(geom, props))

    return features


def ensure_folder():
    try:
        ee.data.createAsset({'type': 'Folder'}, GEE_FOLDER)
        print(f'Created GEE folder: {GEE_FOLDER}')
    except ee.EEException as exc:
        msg = str(exc).lower()
        if 'already exists' in msg or 'cannot overwrite' in msg:
            print(f'GEE folder already exists: {GEE_FOLDER}')
        else:
            raise


def delete_if_exists(asset_id: str):
    try:
        ee.data.deleteAsset(asset_id)
        print(f'  Deleted existing asset: {asset_id}')
    except Exception:
        pass


def upload_station(station: dict, years: list, headers: list,
                   asset_suffix: str, date_filter, safe_swap: bool):
    """Start the export. Returns (task, export_id, final_id) or None."""
    all_features = []

    for year in years:
        print(f'  Downloading {station["file"]}/{year} ...', end=' ', flush=True)
        text = fetch_tsv(station['file'], year)
        if text is None:
            print('(not available)')
            continue
        feats = parse_tsv(text, station, headers, date_filter)
        print(f'{len(feats)} records kept')
        all_features.extend(feats)

    if not all_features:
        print(f'  No data for {station["name"]} — skipping.')
        return None

    fc       = ee.FeatureCollection(all_features)
    asset_id = f'{GEE_FOLDER}/{station["file"]}{asset_suffix}'

    if safe_swap:
        export_id = asset_id + '_tmp'
        delete_if_exists(export_id)          # leftover from an earlier failed run
    else:
        export_id = asset_id
        delete_if_exists(asset_id)

    task = ee.batch.Export.table.toAsset(
        collection=fc,
        description=f'LaCADIAN_{station["file"]}{asset_suffix}',
        assetId=export_id,
    )
    task.start()
    print(f'  Export started → {export_id}  ({len(all_features)} records)')
    return task, export_id, asset_id


def swap_into_place(export_id: str, final_id: str):
    """Replace final_id with the freshly exported export_id."""
    if export_id == final_id:
        return
    delete_if_exists(final_id)
    ee.data.renameAsset(export_id, final_id)


def wait_for_tasks(tasks: list):
    print('\nWaiting for GEE export tasks ...')
    print('(monitor at https://code.earthengine.google.com/tasks)\n')

    while True:
        running = [t for t in tasks
                   if t[1].status()['state'] in ('READY', 'RUNNING')]
        if not running:
            break
        print(f'  {len(running)} task(s) still running...', flush=True)
        time.sleep(30)

    ok = fail = 0
    for name, task, export_id, final_id in tasks:
        status = task.status()
        state = status['state']
        if state == 'COMPLETED':
            try:
                swap_into_place(export_id, final_id)
                print(f'  ✓  {name}')
                ok += 1
            except Exception as exc:
                print(f'  ✗  {name}  (exported, but swap failed): {exc}')
                fail += 1
        else:
            err = status.get('error_message', 'no details')
            print(f'  ✗  {name}  ({state}): {err}  — previous asset left untouched')
            fail += 1

    print(f'\n{ok} succeeded, {fail} failed.')
    if fail > 0:
        sys.exit(1)


# ── Entry point ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Upload LaCADIAN data to GEE.')
    parser.add_argument(
        '--mode', choices=['base', 'recent'], default='recent',
        help=('"base": one-time historical upload (Jan 2025 – Jul 30 2026). '
              '"recent": daily update (Jul 31 2026 – today). Default: recent'))
    parser.add_argument('--station', type=str, default=None,
                        help='Upload only one station, e.g. --station LAC001')
    parser.add_argument('--no-wait', action='store_true',
                        help='Start tasks and exit without waiting')
    args = parser.parse_args()

    require_sas_token()

    if args.mode == 'base':
        years        = [2025, 2026]
        asset_suffix = '_base'
        date_filter  = lambda d: d <= BASE_END_DATE
        print('Mode: BASE  (Jan 2025 – Jul 30 2026 → _base assets)')
    else:
        years        = list(range(RECENT_START_YEAR,
                                  datetime.datetime.now().year + 1))
        asset_suffix = '_recent'
        date_filter  = lambda d: d >= RECENT_START_DATE
        print(f'Mode: RECENT  ({RECENT_START_DATE} – today → _recent assets)')

    if not os.path.exists(KEY_FILE):
        print(f'ERROR: Key file not found: {KEY_FILE}')
        sys.exit(1)
    with open(KEY_FILE) as f:
        key_data = json.load(f)
    service_account = key_data['client_email']
    credentials = ee.ServiceAccountCredentials(service_account, KEY_FILE)
    ee.Initialize(credentials, project=GEE_PROJECT)
    print(f'Authenticated as: {service_account}')

    stations = STATIONS
    if args.station:
        prefix   = args.station.upper()
        stations = [s for s in STATIONS
                    if s['file'].upper().startswith(prefix)]
        if not stations:
            print(f'No station matching "{args.station}".')
            sys.exit(1)

    print(f'\nStations : {len(stations)}')
    print(f'Years    : {years}')
    print(f'Suffix   : {asset_suffix}')
    print(f'Dest     : {GEE_FOLDER}/\n')

    ensure_folder()

    print('Fetching column headers ...')
    headers = fetch_headers()

    tasks = []
    for station in stations:
        print(f'\n[{station["file"]}]  {station["name"]}')
        started = upload_station(station, years, headers, asset_suffix,
                                 date_filter, safe_swap=not args.no_wait)
        if started:
            tasks.append((station['name'],) + started)

    if not tasks:
        # No data for any station almost always means something broke
        # (expired SAS token, changed file format, LaCADIAN outage).
        print('\nERROR: No tasks started — no data was retrieved for any station.')
        sys.exit(1)

    print(f'\n{len(tasks)} export task(s) submitted to GEE.')

    if args.no_wait:
        print('Monitor at: https://code.earthengine.google.com/tasks')
    else:
        wait_for_tasks(tasks)


if __name__ == '__main__':
    main()
