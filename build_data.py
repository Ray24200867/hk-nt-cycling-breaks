#!/usr/bin/env python3
"""Build the data layer for the cycling story site.

Reads the raw files in hk_cycling_story_data, recomputes every figure used on
the page, and writes:
  assets/data/estates_nt.csv
  assets/data/district_coverage.csv
  assets/data/accident_severity_2025.csv
  assets/data/map-data.js
"""

import csv
import json
import math
import re
import statistics
from collections import Counter, defaultdict

DATA = "hk_cycling_story_data"
OUT = "assets/data"

# --- traditional Chinese conversion for the Housing Authority's sc export ---
S2T = {
    "圣": "聖", "业": "業", "丰": "豐", "丽": "麗", "瑶": "瑤",
    "轩": "軒", "凤": "鳳", "岭": "嶺", "华": "華", "爱": "愛",
    "兴": "興", "窝": "窩", "悦": "悅", "泽": "澤", "荫": "蔭",
    "宝": "寶", "乡": "鄉", "东": "東", "广": "廣", "园": "園",
    "围": "圍", "显": "顯", "径": "徑", "晖": "暉", "树": "樹",
    "边": "邊", "沥": "瀝", "满": "滿", "篱": "籬", "硕": "碩",
    "龙": "龍", "来": "來", "联": "聯", "运": "運", "银": "銀",
    "长": "長", "贵": "貴", "隽": "雋", "宁": "寧", "骏": "駿",
    "台": "臺", "湾": "灣", "离": "離", "岛": "島", "区": "區",
    "门": "門", "头": "頭", "达": "達", "启": "啟", "贡": "貢",
    "黄": "黃", "观": "觀", "湾": "灣", "划": "劃", "买": "買", "转": "轉", "计": "計",
}


def t(text):
    return "".join(S2T.get(c, c) for c in text)


def load(name):
    with open(f"{DATA}/{name}", encoding="utf-8") as f:
        return json.load(f)


def point_features(fc):
    out = []
    for f in fc["features"]:
        lon, lat = f["geometry"]["coordinates"][:2]
        out.append((lon, lat, f["properties"]))
    return out


def lines(fc):
    out = []
    for f in fc["features"]:
        g = f["geometry"]
        if g["type"] == "LineString":
            out.append(g["coordinates"])
        else:
            out.extend(g["coordinates"])
    return out


def haversine(a, b):
    lon1, lat1 = a
    lon2, lat2 = b
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    h = (
        math.sin((p2 - p1) / 2) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(h))


parking = point_features(load("bicycle_parking.geojson"))
estates = point_features(load("public_housing_estates.geojson"))
mtr = point_features(load("mtr_access_points.geojson"))
lrt = point_features(load("light_rail_access_points.geojson"))
tracks = lines(load("cycle_tracks.geojson"))
conns = lines(load("cycle_connections.geojson"))

NT_DISTRICTS = ("屯門", "元朗", "北區", "大埔", "沙田", "西貢", "葵青", "荃灣", "離島")
NT_RAIL_DISTRICTS = (
    "屯門區", "元朗區", "北區", "大埔區", "沙田區", "西貢區",
    "葵青區", "荃灣區", "離島區",
)

# ---------------------------------------------------------------- flat distance
LAT0 = 22.4
PPD_X = 111320 * math.cos(math.radians(LAT0))
PPD_Y = 110540


def proj(lon, lat):
    return (lon * PPD_X, lat * PPD_Y)


def track_segments():
    segs = []
    for line in tracks:
        pts = [proj(x, y) for x, y in line]
        for i in range(len(pts) - 1):
            segs.append((pts[i], pts[i + 1]))
    return segs


SEGS = track_segments()


def dist_to_track(lon, lat):
    px, py = proj(lon, lat)
    best = float("inf")
    for (x1, y1), (x2, y2) in SEGS:
        dx, dy = x2 - x1, y2 - y1
        den = dx * dx + dy * dy
        if den == 0:
            d = math.hypot(px - x1, py - y1)
        else:
            tt = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / den))
            d = math.hypot(px - (x1 + tt * dx), py - (y1 + tt * dy))
        if d < best:
            best = d
    return best


# ---------------------------------------------------------------- estate table
rows = []
for lon, lat, p in estates:
    if p["region"] != "新界":
        continue
    near = [(s, haversine((lon, lat), (plon, plat))) for plon, plat, s in parking]
    nearest = min(d for _, d in near)
    within = [(s, d) for s, d in near if d <= 500]
    rows.append(
        {
            "name": t(p["estate_name"]),
            "district": t(p["district"]),
            "type": t(p["estate_type"]),
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "nearest_m": round(nearest),
            "sites_500m": len(within),
            "spaces_500m": sum(s["PARKING_SPACE"] for s, _ in within),
            "track_m": round(dist_to_track(lon, lat)),
        }
    )
rows.sort(key=lambda r: r["nearest_m"])

for r in rows:
    r["covered"] = r["nearest_m"] <= 500
    r["track_near"] = r["track_m"] <= 500

n = len(rows)
covered = sum(r["covered"] for r in rows)
no_parking = n - covered
track_near = sum(r["track_near"] for r in rows)
both = sum(r["covered"] and r["track_near"] for r in rows)
neither = sum(not r["covered"] and not r["track_near"] for r in rows)

# district table
districts = {}
for r in rows:
    districts.setdefault(r["district"], []).append(r)
district_rows = []
for d in NT_DISTRICTS:
    v = districts[d]
    c = sum(x["covered"] for x in v)
    tn = sum(x["track_near"] for x in v)
    b = sum(x["covered"] and x["track_near"] for x in v)
    district_rows.append(
        {
            "district": d,
            "estates": len(v),
            "parking": c,
            "pct": round(c / len(v) * 100, 1),
            "track": tn,
            "both": b,
            "neither": len(v) - c - tn + b,
            "median_m": round(statistics.median(x["nearest_m"] for x in v)),
        }
    )
district_rows.sort(key=lambda x: x["pct"])

# ---------------------------------------------------------------- write CSVs
with open(f"{OUT}/estates_nt.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(
        [
            "estate", "district", "type", "latitude", "longitude",
            "nearest_parking_m", "parking_sites_within_500m",
            "parking_spaces_within_500m", "nearest_cycle_track_m",
        ]
    )
    for r in rows:
        w.writerow(
            [
                r["name"], r["district"], r["type"], r["lat"], r["lon"],
                r["nearest_m"], r["sites_500m"], r["spaces_500m"], r["track_m"],
            ]
        )

with open(f"{OUT}/district_coverage.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(
        ["district", "estates", "with_parking_within_500m", "pct_with_parking",
         "with_cycle_track_within_500m", "with_both", "with_neither", "median_nearest_parking_m"]
    )
    for d in district_rows:
        w.writerow(
            [d["district"], d["estates"], d["parking"], d["pct"], d["track"],
             d["both"], d["neither"], d["median_m"]]
        )

accident = [
    ("單車徑", 1, 9, 930, 940),
    ("行車道路", 11, 22, 808, 841),
]
with open(f"{OUT}/accident_severity_2025.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["road_type", "fatal", "serious", "slight", "total", "fatal_or_serious_pct"])
    for name, fatal, serious, slight, total in accident:
        w.writerow([name, fatal, serious, slight, total, round((fatal + serious) / total * 100, 1)])

# ---------------------------------------------------------------- district outlines
DISTRICT_NAMES = {
    "Wong Tai Sin": "黃大仙", "Kowloon City": "九龍城", "Kwun Tong": "觀塘",
    "Sham Shui Po": "深水埗", "Yau Tsim Mong": "油尖旺", "Tsuen Wan": "荃灣",
    "Tuen Mun": "屯門", "Yuen Long": "元朗", "North": "北區", "Tai Po": "大埔",
    "Sha Tin": "沙田", "Sai Kung": "西貢", "Islands": "離島", "Kwai Tsing": "葵青",
    "Central & Western": "中西區", "Wan Chai": "灣仔", "Eastern": "東區",
    "Southern": "南區",
}
with open("assets/data/hk18_districts_source.geojson", encoding="utf-8") as f:
    district_fc = json.load(f)

# ---------------------------------------------------------------- map geometry
def rdp(points, eps):
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        ax, ay = points[a]
        bx, by = points[b]
        dx, dy = bx - ax, by - ay
        den = dx * dx + dy * dy
        best, idx = -1.0, -1
        for i in range(a + 1, b):
            px, py = points[i]
            if den == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                tt = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / den))
                d = math.hypot(px - (ax + tt * dx), py - (ay + tt * dy))
            if d > best:
                best, idx = d, i
        if best > eps:
            keep[idx] = True
            stack.append((a, idx))
            stack.append((idx, b))
    return [p for p, k in zip(points, keep) if k]


# bounding box over every layer, with a little padding
xs, ys = [], []
for line in tracks + conns:
    for lon, lat in line:
        xs.append(lon)
        ys.append(lat)
for lon, lat, _ in parking + estates:
    xs.append(lon)
    ys.append(lat)

W = 1000.0
# The map is cropped to the New Territories network. Three remote Lantau
# estates (龍田邨, 雅寧苑, 長貴邨) fall outside it and are listed in the table.
lon0, lon1 = 113.900, 114.290
lat0, lat1 = 22.250, 22.550
scale = W / ((lon1 - lon0) * math.cos(math.radians(LAT0)))
H = round((lat1 - lat0) * scale, 1)


def mp(lon, lat):
    return (
        round((lon - lon0) * math.cos(math.radians(LAT0)) * scale, 1),
        round((lat1 - lat) * scale, 1),
    )


def path_of(lines_, eps=0.55):
    parts = []
    for line in lines_:
        pts = [mp(lon, lat) for lon, lat in line]
        pts = rdp(pts, eps)
        if len(pts) < 2:
            continue
        d = f"M{pts[0][0]} {pts[0][1]}"
        for x, y in pts[1:]:
            d += f"L{x} {y}"
        parts.append(d)
    return "".join(parts)


def polygon_paths(fc):
    out = []
    for feature in fc["features"]:
        g = feature["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        parts = []
        for poly in polys:
            for ring in poly:
                pts = [mp(lon, lat) for lon, lat in ring]
                pts = rdp(pts, 0.9)
                if len(pts) < 3:
                    continue
                d = f"M{pts[0][0]} {pts[0][1]}"
                for x, y in pts[1:]:
                    d += f"L{x} {y}"
                parts.append(d + "Z")
        props = feature["properties"]
        out.append({
            "n": DISTRICT_NAMES.get(props.get("EName"), props.get("EName")),
            "r": props.get("EArea"),
            "d": "".join(parts),
        })
    return out


district_paths = polygon_paths(district_fc)

track_path = path_of(tracks)
conn_path = path_of(conns)

map_parking = [
    {"x": mp(lon, lat)[0], "y": mp(lon, lat)[1], "s": p["PARKING_SPACE"]}
    for lon, lat, p in parking
]
map_estates = [
    {
        "x": mp(r["lon"], r["lat"])[0],
        "y": mp(r["lon"], r["lat"])[1],
        "n": r["name"],
        "d": r["district"],
        "m": r["nearest_m"],
        "s": r["sites_500m"],
        "c": r["spaces_500m"],
        "t": r["track_m"],
    }
    for r in rows
]

# one marker per rail station, NT only
def station_name(name):
    name = name.replace("香港鐵路", "").replace("輕鐵－", "")
    name = re.sub(r"-[A-Z0-9]+ ?(進出口|Access).*$", "", name)
    return name.strip()


stations = {}
for lon, lat, p in mtr + lrt:
    if p.get("district_zh") not in NT_RAIL_DISTRICTS:
        continue
    key = ("MTR" if p["type_code"] == "MTA" else "LRT", station_name(p["name_zh"]))
    stations.setdefault(key, []).append((lon, lat))
map_rail = []
for (kind, name), pts_ in sorted(stations.items()):
    lon = statistics.mean(p[0] for p in pts_)
    lat = statistics.mean(p[1] for p in pts_)
    x, y = mp(lon, lat)
    map_rail.append({"x": x, "y": y, "n": name, "k": kind, "e": len(pts_)})

label_anchors = {
    "葵青": (114.158, 22.350),
    "荃灣": (114.098, 22.378),
    "屯門": (113.940, 22.392),
    "元朗": (114.060, 22.442),
    "北區": (114.160, 22.512),
    "大埔": (114.202, 22.462),
    "沙田": (114.216, 22.406),
    "西貢": (114.270, 22.342),
    "離島": (113.925, 22.302),
}
map_labels = [
    {"n": d, "x": mp(lon, lat)[0], "y": mp(lon, lat)[1]}
    for d, (lon, lat) in label_anchors.items()
]
context_anchors = {"九龍": (114.170, 22.322), "香港島": (114.165, 22.272)}
context_labels = [
    {"n": d, "x": mp(lon, lat)[0], "y": mp(lon, lat)[1]}
    for d, (lon, lat) in context_anchors.items()
]

map_data = {
    "width": W,
    "height": H,
    "kmPerPx": 111.32 / scale,
    "tracks": track_path,
    "connections": conn_path,
    "districts": district_paths,
    "parking": map_parking,
    "estates": map_estates,
    "rail": map_rail,
    "labels": map_labels,
    "contextLabels": context_labels,
}

with open(f"{OUT}/map-data.js", "w", encoding="utf-8") as f:
    f.write("window.MAP_DATA=")
    json.dump(map_data, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

# ---------------------------------------------------------------- report
print(f"estates {n}, parking<=500m {covered} ({covered/n*100:.1f}%), none {no_parking}")
print(f"track<=500m {track_near} ({track_near/n*100:.1f}%)")
print(f"both {both} ({both/n*100:.1f}%), neither {neither}")
print(f"parking sites {len(parking)}, spaces {sum(p['PARKING_SPACE'] for _,_,p in parking)}")
print(f"map {W}x{H}, track path {len(track_path)/1024:.0f}KB, conn {len(conn_path)/1024:.0f}KB")
print("district:", [(d['district'], d['estates'], d['parking'], d['pct']) for d in district_rows])
print("rail stations on map", Counter(r["k"] for r in map_rail))
print("map-data.js", round(len(json.dumps(map_data, ensure_ascii=False)) / 1024), "KB")
print("district paths", len(district_paths), "KB", round(sum(len(d["d"]) for d in district_paths)/1024))
