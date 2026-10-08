# LaCADIAN station-data pipeline

Earth Engine apps cannot download data from outside Earth Engine, so the CropSight-LA app reads LaCADIAN station data from Earth Engine assets. The scripts in this folder create and update those assets.

> **Note:** This folder is a documentation copy. The live pipeline runs from a separate private repository, so the workflow file is stored here as `update_lacadian.yml` rather than in `.github/workflows/`, where GitHub would run it.

## How it works

```
LaCADIAN daily files (Azure Blob Storage, LSU AgCenter / SHaRE Lab)
        │   lacadian_upload.py  (download, clean, convert to features)
        ▼
Earth Engine assets: projects/project-foysal/assets/lacadian/<station>_base | _recent
        │   make_lacadian_public.py  (grant read access)
        ▼
CropSight-LA app  (merges _base + _recent for the selected dates)
```

Each of the 24 stations has two assets:

| Asset | Period | How it is created |
|---|---|---|
| `<station>_base` | 1 Jan 2025 – 30 Jul 2026 | Once, with `python lacadian_upload.py --mode base` |
| `<station>_recent` | 31 Jul 2026 – today | Daily, with `python lacadian_upload.py --mode recent` |

In `recent` mode each station is first exported to a temporary `<station>_recent_tmp` asset. Only when that export succeeds is the old asset replaced, so the app keeps showing the previous data until the new data are ready.

Values are stored with sanitized property names (for example, `air_temp_ave_degC`); missing-data codes, NaN and infinite values are dropped.

## Files

| File | Purpose |
|---|---|
| `lacadian_upload.py` | Downloads each station's daily files from Azure and exports them to Earth Engine |
| `make_lacadian_public.py` | Copies the folder's sharing settings onto every station asset, so the app can read replaced assets |
| `update_lacadian.yml` | GitHub Actions workflow: runs the two scripts daily at 10:00 UTC (can also be started manually) |
| `requirements.txt` | Python dependencies |

## Requirements

- Python 3.10 or later
- `pip install -r requirements.txt`
- An Earth Engine service account with write access to the asset folder
- Read access (an Azure SAS token) to the LaCADIAN data container

## Credentials

No credentials are stored in this repository. Both are supplied as GitHub Actions secrets (**Settings → Secrets and variables → Actions**):

| Secret | Contents |
|---|---|
| `GEE_SERVICE_ACCOUNT_KEY` | Full JSON key of the Earth Engine service account |
| `LACADIAN_SAS_TOKEN` | Azure SAS query string (without a leading `?`) |

The workflow writes the key to a temporary `key.json` file during the run and deletes it at the end.

## Running locally

```bash
pip install -r requirements.txt
export LACADIAN_SAS_TOKEN='sp=...&sig=...'   # from a secret store; never commit it
export GEE_KEY_FILE=key.json                  # path to the service-account key
python lacadian_upload.py --mode recent       # daily update (default)
python lacadian_upload.py --station LAC001    # one station only
python make_lacadian_public.py                # grant the app read access
```

## Maintenance

- The Azure SAS token expires periodically. Renew it and update the `LACADIAN_SAS_TOKEN` secret before it expires; otherwise the daily update stops.
- GitHub disables scheduled workflows in public repositories after 60 days without repository activity. Check the **Actions** tab occasionally.
