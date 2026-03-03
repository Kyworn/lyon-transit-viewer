# GTFS Data Files

This directory should contain GTFS (General Transit Feed Specification) data files from TCL Lyon.

## Required Files

Download the GTFS data from [GrandLyon Open Data](https://data.grandlyon.com/):

- `agency.txt`
- `calendar.txt`
- `calendar_dates.txt`
- `feed_info.txt`
- `routes.txt`
- `shapes.txt`
- `stops.txt`
- `stop_times.txt`
- `transfers.txt`
- `trips.txt`

## Download Instructions

1. Visit: https://data.grandlyon.com/portail/fr/jeux-de-donnees/horaires-theoriques-reseau-transports-commun-lyonnais/info
2. Download the GTFS ZIP file
3. Extract all `.txt` files to this directory

**Note:** These files are excluded from Git due to their large size (>100 MB total).

## Alternative

The application will work without GTFS files using only real-time data, but route shapes and schedules won't be available.
