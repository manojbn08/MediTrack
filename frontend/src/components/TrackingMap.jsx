import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Custom clean SVG markers
const createCustomIcon = (bgColor, label) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="background-color: ${bgColor}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold;">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const pharmacyIcon = createCustomIcon('#0F6B66', 'Rx');
const customerIcon = createCustomIcon('#1F7A4D', '⌂');
const riderIcon = createCustomIcon('#1D5FA8', '🏍');

export default function TrackingMap({
  pharmacyPos = [12.9716, 77.5946],
  customerPos = [12.9304, 77.6784],
  riderPos = [12.9510, 77.6365],
  status = 'OUT_FOR_DELIVERY',
}) {
  const center = riderPos || pharmacyPos;

  return (
    <div className="w-full h-80 relative rounded-panel overflow-hidden border border-neutral-300">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeView center={center} zoom={13} />
        
        {/* OpenStreetMap public tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Pharmacy Marker */}
        <Marker position={pharmacyPos} icon={pharmacyIcon}>
          <Popup>
            <div className="text-xs font-sans">
              <strong className="text-brand">MediTrack Central Pharmacy</strong><br/>
              Dispensing & Handover Hub
            </div>
          </Popup>
        </Marker>

        {/* Customer Address Marker */}
        <Marker position={customerPos} icon={customerIcon}>
          <Popup>
            <div className="text-xs font-sans">
              <strong>Delivery Destination</strong><br/>
              Customer Address
            </div>
          </Popup>
        </Marker>

        {/* Live Delivery Partner Marker */}
        {(status === 'OUT_FOR_DELIVERY' || status === 'ASSIGNED' || status === 'PICKED_UP') && (
          <Marker position={riderPos} icon={riderIcon}>
            <Popup>
              <div className="text-xs font-sans">
                <strong>Delivery Partner in Transit</strong><br/>
                En route to delivery address
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Mini status overlay */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-control border border-neutral-200 text-xs font-medium shadow-sm z-[1000] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-semantic-info animate-ping" />
        <span>Live GPS Tracking (OSM)</span>
      </div>
    </div>
  );
}
