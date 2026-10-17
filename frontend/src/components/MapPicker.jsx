import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, AlertCircle, CheckCircle } from 'lucide-react';

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

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function MapPicker({ lat, lng, onLocationChange, pharmacyPos = [12.9716, 77.5946] }) {
  const currentPos = [lat || 12.9304, lng || 77.6784];
  const [geoStatus, setGeoStatus] = useState({ state: 'idle', message: '' });

  const handleRequestLiveLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus({ state: 'error', message: 'Geolocation is not supported by your browser.' });
      return;
    }

    setGeoStatus({ state: 'loading', message: 'Requesting browser location permission...' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const distFromHub = calculateDistanceKm(pharmacyPos[0], pharmacyPos[1], userLat, userLng);

        if (distFromHub > 15.0) {
          setGeoStatus({
            state: 'error',
            message: `Detected device GPS is ${distFromHub.toFixed(1)} km away, outside our 15 km Bengaluru zone. Please pick a location within Bengaluru.`
          });
        } else {
          onLocationChange(userLat, userLng);
          setGeoStatus({
            state: 'success',
            message: `Live Location Detected (${userLat.toFixed(4)}, ${userLng.toFixed(4)}) • In Delivery Zone`
          });
        }
      },
      (error) => {
        let msg = 'Location permission denied. Please allow location access or select manually.';
        if (error.code === error.TIMEOUT) msg = 'Location request timed out. Please try again.';
        else if (error.code === error.POSITION_UNAVAILABLE) msg = 'Location information is unavailable.';
        setGeoStatus({ state: 'error', message: msg });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="space-y-2">
      {/* Live Location Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleRequestLiveLocation}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-semibold rounded-control hover:bg-brand-hover shadow-xs transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Detect My Live Location</span>
        </button>

        {geoStatus.state === 'loading' && (
          <span className="text-xs text-brand font-medium animate-pulse flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
            {geoStatus.message}
          </span>
        )}

        {geoStatus.state === 'success' && (
          <span className="text-xs text-semantic-success font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" />
            {geoStatus.message}
          </span>
        )}

        {geoStatus.state === 'error' && (
          <span className="text-xs text-semantic-danger font-medium flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" />
            {geoStatus.message}
          </span>
        )}
      </div>

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

        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-medium text-neutral-700 border border-neutral-200 z-[1000] shadow-sm">
          Click or drag pin to adjust location
        </div>
      </div>
    </div>
  );
}
