# 香港单车故事数据包

整理日期：2026-09-30。把文件放进同一个文件夹后，可以直接拖入 QGIS 等地图软件。

## 文件说明

| 文件 | 内容 | 数量 |
| --- | --- | --- |
| `CYCTRACK.kmz` / `cycle_tracks.geojson` | 运输署单车径，同一数据的原始版和 GeoJSON 版 | 1,607 个地图线段 |
| `CYCPARKSPACE.kmz` / `bicycle_parking.geojson` | 运输署公共单车泊位，同一数据的原始版和 GeoJSON 版 | 515 个位置 |
| `bicycle_parking.csv` | 上述泊位的表格版，含 `PARKING_SPACE` 数量和经纬度 | 合计 42,008 个泊位 |
| `CYCRAMP.kmz` / `cycle_connections.geojson` | 单车斜道、隧道、桥梁等连接设施 | 407 个地图线段 |
| `public_housing_estates.geojson` | 房委会公共租住屋邨位置，保留名称、地区、类型等故事相关字段 | 244 个屋邨点 |
| `public_housing_estates_source.json` | 房委会下载的原始 JSON | 244 条记录 |
| `mtr_access_points.geojson` | 地政总署 iGeoCom 中 `TYPE=MTA` 的港铁站进出口 | 611 个出口点 |
| `light_rail_access_points.geojson` | iGeoCom 中 `TYPE=LRA` 的轻铁站进出口 | 68 个出口点 |
| `high_speed_rail_access_points.geojson` | iGeoCom 中 `TYPE=HSA` 的高铁站进出口 | 14 个出口点 |

## 官方来源

- 运输署单车资料（2026-09-28 下载）：https://data.gov.hk/en-data/dataset/hk-td-tis_20-cycling-information
- 房委会公共屋邨资料（2026-09-30 下载）：https://data.housingauthority.gov.hk/psi/rest/export/prh-estates/sc/json
- 地政总署社区地理数据库 iGeoCom（2026-09-30 下载）：https://open.hkmapservice.gov.hk/OpenData/directDownload?productFormat=GEOJSON&productName=iGeoCom&sheetName=iGeoCom
- iGeoCom 数据介绍：https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-development-hkms-digital-geocom
- 单车节活动及路线图：https://www.discoverhongkong.com/eng/events/cyclothon.html

## 使用时注意

1. `.kmz` 和对应 `.geojson` 是同一数据的不同格式，不要把它们当成两套设施相加。
2. `1,607` 是单车径线段数，不是路线条数或公里数；`515` 是泊位位置数，不是车位数。
3. `42,008` 是这个运输署数据层记录的泊位总数，不应直接写成香港所有公共单车泊位的总数。数据不显示实时空位。
4. 房委会数据只覆盖公共租住屋邨，不代表香港所有住宅。铁路出口点数也不等于车站数。
5. 地图上的直线距离不等于实际可骑路线。单车径数据不包含所有允许骑车的普通道路；是否安全、合法、方便仍须检查道路规则与现场环境。
6. 单车节比赛路线图是图片，不在这些单车径地理数据内，不能视为平日可骑路线。
