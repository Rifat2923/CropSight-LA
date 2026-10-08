"""
make_lacadian_public.py
-----------------------
Grants CropSight-LA app read access to all LaCADIAN assets under
projects/project-foysal/assets/lacadian/

Handles both asset types:
  LAC001_Ben_Hur_base    (permanent historical asset, Jan 2025 - Jul 30 2026)
  LAC001_Ben_Hur_recent  (daily-updated asset, Jul 31 2026 - today)

If an asset doesn't exist yet it is skipped gracefully — not a failure.

Requirements:
  - earthengine-api installed
  - GEE_KEY_FILE env var pointing to service account JSON key
"""

import copy
import json
import os
import sys

import ee

# ── CONFIG ────────────────────────────────────────────────────────────────────
KEY_FILE = os.environ.get('GEE_KEY_FILE', 'key.json')
FOLDER   = 'projects/project-foysal/assets/lacadian'
SERVICE_ACCOUNT = None   # resolved in init_ee() after key file is verified

# Single source of truth: the station list lives in lacadian_upload.py
# (same folder), so the two scripts can never drift apart.
from lacadian_upload import STATIONS as _UPLOAD_STATIONS
STATIONS = [s['file'] for s in _UPLOAD_STATIONS]

# Both asset suffixes — permissions applied to each
SUFFIXES = ['_base', '_recent']


# ── INIT ──────────────────────────────────────────────────────────────────────
def init_ee():
    global SERVICE_ACCOUNT
    if not os.path.exists(KEY_FILE):
        print(f'ERROR: Key file not found: {KEY_FILE}')
        sys.exit(1)
    with open(KEY_FILE) as f:
        SERVICE_ACCOUNT = json.load(f)['client_email']
    credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, KEY_FILE)
    ee.Initialize(credentials, project='project-foysal')
    print(f'Earth Engine initialized as: {SERVICE_ACCOUNT}')


# ── GET FOLDER POLICY ─────────────────────────────────────────────────────────
def get_folder_policy():
    try:
        policy = ee.data.getIamPolicy(FOLDER)
        print(f"Folder policy retrieved ({len(policy.get('bindings', []))} binding(s)):")
        for b in policy.get('bindings', []):
            print(f"  role={b.get('role')}  members={b.get('members')}")
        check_reader_binding(policy)
        return policy
    except Exception as e:
        print(f'ERROR: Could not read folder policy: {e}')
        sys.exit(1)


def check_reader_binding(policy):
    """Fail loudly if the folder grants nobody read access.

    This script copies the folder's policy onto every asset. If the folder
    itself has no reader binding (allUsers or the app's service account),
    every asset would 'succeed' while the app still could not read them.
    """
    readers = [m for b in policy.get('bindings', [])
               if any(w in (b.get('role') or '').lower() for w in ('viewer', 'reader'))
               for m in b.get('members', [])]
    if not readers:
        print('ERROR: the folder policy has no reader/viewer binding, so the '
              'CropSight-LA app could not read these assets. Grant read access '
              'on the folder (allUsers or the app\'s service account) first.')
        sys.exit(1)
    print(f'Readers on folder: {readers}')


# ── APPLY POLICY TO ONE ASSET ─────────────────────────────────────────────────
def apply_policy(asset_path, policy):
    """Apply the folder IAM policy to a single asset. Returns 'ok'/'skip'/'fail'."""
    try:
        existing   = ee.data.getIamPolicy(asset_path)
        new_policy = copy.deepcopy(policy)
        new_policy.pop('etag', None)
        if 'etag' in existing:
            new_policy['etag'] = existing['etag']
        ee.data.setIamPolicy(asset_path, new_policy)
        print(f"  ✓  {asset_path.split('/')[-1]}")
        return 'ok'
    except Exception as e:
        err = str(e).lower()
        if 'not found' in err or '404' in err or 'does not exist' in err:
            print(f"  ⚠  {asset_path.split('/')[-1]}: not found (skipping)")
            return 'skip'
        print(f"  ✗  {asset_path.split('/')[-1]}: {e}")
        return 'fail'


# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    print('=' * 60)
    print('  make_lacadian_public.py — Grant CropSight-LA Access')
    print('=' * 60)

    init_ee()

    print('\nStep 1: Reading folder IAM policy ...')
    folder_policy = get_folder_policy()

    total = len(STATIONS) * len(SUFFIXES)
    print(f'\nStep 2: Applying policy to up to {total} assets '
          f'({len(STATIONS)} stations × {len(SUFFIXES)} suffixes) ...')

    succeeded = failed = skipped = 0
    for station in STATIONS:
        for suffix in SUFFIXES:
            asset_path = f'{FOLDER}/{station}{suffix}'
            result = apply_policy(asset_path, folder_policy)
            if result == 'ok':
                succeeded += 1
            elif result == 'skip':
                skipped += 1
            else:
                failed += 1

    print(f'\nDone — {succeeded} succeeded, {skipped} skipped '
          f'(not yet created), {failed} failed.')
    if failed > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
