import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const pinIcon = L.divIcon({
  className: 'custom-pin-marker',
  html: `
    <div style="background-color: #0F6B66; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
      <div style="transform: rotate(45deg); color: white; font-size: 13px; font-weight: bold;">📍</div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const pharmacyHubIcon = L.divIcon({
  className: 'pharmacy-hub-marker',
  html: `
    <div style="background-color: #1F7A4D; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold;">
      Rx
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapEventsHandler({ onLocationChange }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function PanToCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.panTo(center);
    }
  }, [center, map]);
  return null;
}

export default function MapPicker({ lat, lng, onLocationChange, pharmacyPos = [12.9716, 77.5946] }) {
  const currentPos = [lat || 12.9304, lng || 77.6784];

  return (
    <div className="w-full h-72 relative rounded-panel overflow-hidden border border-neutral-300">
      <MapContainer
        center={currentPos}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <PanToCenter center={currentPos} />
        <MapEventsHandler onLocationChange={onLocationChange} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Central Pharmacy Hub */}
        <Marker position={pharmacyPos} icon={pharmacyHubIcon}>
          <Popup>
            <div className="text-xs font-sans">
              <strong className="text-brand">MediTrack Central Pharmacy</strong><br />
              Delivery Geofence Center (15 km limit)
            </div>
          </Popup>
        </Marker>

        {/* Draggable Customer Pin */}
        <Marker
          position={currentPos}
          icon={pinIcon}
          draggable={true}
          eventHandlers={{
            dragend(e) {
              const marker = e.target;
              const pos = marker.getLatLng();
              onLocationChange(pos.lat, pos.lng);
            },
          }}
        >
          <Popup>
            <div className="text-xs font-sans">
              <strong>Your Delivery Pin</strong><br />
              Drag to adjust exact location
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-medium text-neutral-700 border border-neutral-200 z-[1000] shadow-sm">
        Click or drag pin to set location
      </div>
    </div>
  );
}
