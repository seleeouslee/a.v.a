"""Build compact, route-specific STM bus schedules for the static website.

Run: python scripts/update_stm.py [--zip path/to/gtfs_stm.zip]
Source: STM, CC BY 4.0. Metro trip times are deliberately not exported.
"""
import argparse
import csv
import gzip
import io
import json
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile

SOURCE = 'https://www.stm.info/sites/default/files/gtfs/gtfs_stm.zip'
OUTPUT = Path(__file__).resolve().parents[1] / 'data' / 'stm'


def build(archive):
    def rows(name):
        if name not in archive.namelist():
            return []
        return csv.DictReader(io.TextIOWrapper(archive.open(name), encoding='utf-8-sig'))

    feed = next(iter(rows('feed_info.txt')))
    services = list(rows('calendar.txt'))
    service_ids = {s['service_id']: i for i, s in enumerate(services)}
    exceptions = defaultdict(dict)
    for row in rows('calendar_dates.txt'):
        if row['service_id'] not in service_ids:
            service_ids[row['service_id']] = len(services)
            services.append({'service_id': row['service_id']})
        exceptions[row['date']][service_ids[row['service_id']]] = int(row['exception_type'])
    stops = {s['stop_id']: s for s in rows('stops.txt')}
    routes = {r['route_id']: {
        'id': r['route_id'], 'number': r['route_short_name'], 'name': r['route_long_name'],
        'mode': 'metro' if r['route_type'] == '1' else 'bus', 'url': r['route_url'],
        'directions': [], 'stops': {},
    } for r in rows('routes.txt') if r['route_type'] in ('1', '3')}
    compass = {(r['route_id'], r['direction_id']): r['direction_legacy'].lower() for r in rows('directions.txt')}
    trips = {}
    for t in rows('trips.txt'):
        route = routes.get(t['route_id'])
        if route is None:
            continue
        direction = {'name': t['trip_headsign'], 'compass': compass.get((t['route_id'], t['direction_id']), '')}
        if direction not in route['directions']:
            route['directions'].append(direction)
        trips[t['trip_id']] = (t['route_id'], service_ids[t['service_id']], route['directions'].index(direction))
    # Do not silently treat frequency-based bus templates as exact departures.
    for f in rows('frequencies.txt'):
        if f['trip_id'] in trips and routes[trips[f['trip_id']][0]]['mode'] == 'bus':
            raise ValueError('Feed contains frequency-based buses; update the importer before publishing.')

    departures = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    for t in rows('stop_times.txt'):
        if t['trip_id'] not in trips or t.get('pickup_type') == '1':
            continue
        route_id, service, direction = trips[t['trip_id']]
        route = routes[route_id]
        stop_id = t['stop_id']
        stop = stops[stop_id]
        info = route['stops'].setdefault(stop_id, {
            'id': stop_id, 'code': stop['stop_code'], 'name': stop['stop_name'],
            'url': stop.get('stop_url', ''), 'directions': [],
        })
        if direction not in info['directions']:
            info['directions'].append(direction)
        if route['mode'] == 'metro':
            continue
        clock = t['departure_time'] or t['arrival_time']
        if not clock:
            raise ValueError('Bus time interpolation is required for this feed.')
        h, m, s = map(int, clock.split(':'))
        departures[route_id][stop_id][(service, direction)].append(h * 3600 + m * 60 + s)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    index = {
        'source': SOURCE, 'attribution': 'Société de transport de Montréal (STM), CC BY 4.0',
        'version': feed['feed_version'], 'start': feed['feed_start_date'], 'end': feed['feed_end_date'],
        'updated': datetime.now(timezone.utc).isoformat(), 'timezone': 'America/Montreal',
        'services': services, 'exceptions': exceptions, 'routes': list(routes.values()),
    }
    for route in index['routes']:
        route['stops'] = list(route['stops'].values())
        if route['mode'] != 'bus':
            continue
        data = {stop: [[service, direction, sorted(set(times))] for (service, direction), times in groups.items()]
                for stop, groups in departures[route['id']].items()}
        # Versioned names prevent old browser caches mixing schedules and metadata.
        filename = f"bus-{route['id']}-{feed['feed_version']}.json.gz"
        route['file'] = filename
        payload = json.dumps(data, separators=(',', ':')).encode('utf-8')
        (OUTPUT / filename).write_bytes(gzip.compress(payload, mtime=0))
    (OUTPUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f"Built {len(routes)} routes; valid {index['start']} to {index['end']}.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--zip', type=Path)
    args = parser.parse_args()
    if args.zip:
        with ZipFile(args.zip) as archive:
            build(archive)
    else:
        with urllib.request.urlopen(SOURCE, timeout=60) as response:
            payload = response.read()
        with ZipFile(io.BytesIO(payload)) as archive:
            build(archive)
