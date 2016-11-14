// 地図の初期化
var map = L.map('map').setView([34.63867, 135.41219], 14);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 津波避難ビルのGeoJSONレイヤを追加
var popups = {};
var tunamiHinanLayer = L.geoJson(null, {
  onEachFeature: function(feature, layer) {
    // マーカークリック時にポップアップ表示
    var popup = layer.bindPopup(feature.properties.name);
    var key = feature.properties['#property'];
    popups[key] = popup;
  }
}).addTo(map);

// AjaxでGeoJSONを読み込み後、レイヤにデータを追加
var features;
$.getJSON('data/tunamihinan.geojson', function(data) {
  tunamiHinanLayer.addData(data);
  features = data;
});

// 現在位置を取得し、円を表示
var currentPosition;
map.on('locationfound', function(e) {
  if (currentPosition) {
    map.removeLayer(currentPosition);
  }
  currentPosition = L.circle(e.latlng, 10);
  map.addLayer(currentPosition);
});
map.on('locationerror', function(e) {
  alert(e.message);
  currentPosition = null;
});
$('#navbar-get-location').on('click', function(e) {
  map.locate({setView: true, maxZoom: 16});
});

// 地図中心位置から最寄りの津波避難ビルを表示
var nearestFeature;
$('#navbar-search-nearest').on('click', function(e) {
  var center = map.getCenter();
  var point = turf.point([center.lng, center.lat]);
  var feature = turf.nearest(point, features);
  var coords = feature.geometry.coordinates;
  map.panTo([coords[1], coords[0]]);
  var key = feature.properties['#property'];
  popups[key].openPopup();
  nearestFeature = feature;
});

// 現在位置から最寄りのビルまでの経路を検索
var route;
$('#navbar-search-route').on('click', function(e) {
  if (!currentPosition || !nearestFeature) {
    alert('現在地の取得か最寄りのビル検索が実行されていません');
    return;
  }

  if (route) {
    map.removeLayer(route);
  }
  // OSRMでルート検索
  var currentLatLng = currentPosition.getLatLng();
  var nearestCoords = nearestFeature.geometry.coordinates;
  var osrmPath = 'https://router.project-osrm.org/route/v1/driving/'
    + currentLatLng.lng + ',' + currentLatLng.lat + ';'
    + nearestCoords[0] + ',' + nearestCoords[1]
    + '?overview=false&alternatives=false&steps=true&hints=;';
  $.getJSON(osrmPath, function(data) {
    console.log(data);
    if (data.code === 'Ok') {
      var latlngs = [];
      var steps = data.routes[0].legs[0].steps;
      for (var i = 0; i < steps.length; i++) {
        var intersections = steps[i].intersections;
        for (var j = 0; j < intersections.length; j++) {
          var coords = intersections[j].location;
          latlngs.push([coords[1], coords[0]]);
        }
      }
      route = L.polyline(latlngs, {color: 'red'}).addTo(map);
      map.fitBounds(route.getBounds());
    }
  })
});
