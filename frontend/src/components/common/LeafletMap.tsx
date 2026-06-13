// src/components/common/LeafletMap.tsx
// Expo Go compatible map using WebView + Leaflet.js
// Same pattern used in SIAGA project — no native SDK needed
// 
// Usage:
//   <LeafletMap
//     center={{ lat: 1.5577, lng: 103.6388 }}
//     zoom={15}
//     markers={rides.map(r => ({ lat: r.originLat, lng: r.originLng, label: r.driverName, color: 'green' }))}
//     onMarkerPress={(id) => navigation.navigate('RideDetail', { rideId: id })}
//   />

import React from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View } from 'react-native';

interface Marker {
  id?: string | number;
  lat: number;
  lng: number;
  label?: string;
  color?: 'green' | 'blue' | 'red' | 'orange';  // green=available ride, blue=user, red=destination
  popup?: string;
}

interface LeafletMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Marker[];
  height?: number;
  onMarkerPress?: (id: string | number) => void;
}

export default function LeafletMap({
  center,
  zoom = 15,
  markers = [],
  height = 300,
  onMarkerPress,
}: LeafletMapProps) {

  const markersJson = JSON.stringify(markers);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100vh; }
  </style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const map = L.map('map', { zoomControl: true }).setView([${center.lat}, ${center.lng}], ${zoom});

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const colorMap = {
    green:  '#1D9E75',
    blue:   '#378ADD',
    red:    '#E24B4A',
    orange: '#BA7517',
  };

  const markers = ${markersJson};

  markers.forEach(m => {
    const color = colorMap[m.color || 'green'];
    const icon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:' + color + ';border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);

    if (m.popup || m.label) {
      marker.bindPopup(m.popup || m.label || '');
    }

    if (m.id !== undefined) {
      marker.on('click', () => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARKER_PRESS', id: m.id }));
      });
    }
  });
</script>
</body>
</html>`;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MARKER_PRESS' && onMarkerPress) {
        onMarkerPress(data.id);
      }
    } catch (_) {}
  };

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        scrollEnabled={false}
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
});
