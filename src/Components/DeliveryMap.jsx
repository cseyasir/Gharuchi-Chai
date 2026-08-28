import React from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  className: "delivery-map-pin",
  html: "<span class=\"delivery-map-pin-dot\"></span>",
  iconSize: [32, 42],
  iconAnchor: [16, 39]
});

function MapClickHandler({ onPositionChange }) {
  useMapEvents({
    click: event => onPositionChange([event.latlng.lat, event.latlng.lng])
  });
  return null;
}

export default function DeliveryMap({ position, onPositionChange, interactive = false, className = "" }) {
  return (
    <MapContainer
      center={position}
      zoom={interactive ? 17 : 15}
      scrollWheelZoom={interactive}
      className={`delivery-map ${interactive ? "delivery-map-interactive" : ""} ${className}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {interactive && <MapClickHandler onPositionChange={onPositionChange} />}
      <Marker
        position={position}
        icon={pinIcon}
        draggable={interactive}
        eventHandlers={interactive ? {
          dragend: event => {
            const marker = event.target;
            const nextPosition = marker.getLatLng();
            onPositionChange([nextPosition.lat, nextPosition.lng]);
          }
        } : undefined}
      />
    </MapContainer>
  );
}
