import { memo, useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";

export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  tone?: "destination" | "pickup" | "default";
};

type OpenStreetMapProps = {
  center: { latitude: number; longitude: number };
  markers: MapMarker[];
  zoom?: number;
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
};

const markerIcons = {
  destination: makeIcon("#4f46e5"),
  pickup: makeIcon("#059669"),
  default: makeIcon("#f97316"),
};

function makeIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:18px;height:18px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 8px 20px rgba(15,23,42,.28)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

function MapUpdater({ center, markers, zoom }: Pick<OpenStreetMapProps, "center" | "markers" | "zoom">) {
  const map = useMap();
  useEffect(() => {
    const points = markers
      .filter(marker => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude))
      .map(marker => [marker.latitude, marker.longitude] as [number, number]);
    if (points.length > 1) {
      map.fitBounds(points, { padding: [38, 38], maxZoom: 13 });
      return;
    }
    map.setView([center.latitude, center.longitude], zoom ?? 11, { animate: true });
  }, [center.latitude, center.longitude, map, markers, zoom]);
  return null;
}

function OpenStreetMap({ center, markers, zoom = 11, className = "", onMarkerClick }: OpenStreetMapProps) {
  const mapCenter = useMemo<LatLngExpression>(() => [center.latitude, center.longitude], [center.latitude, center.longitude]);
  const validMarkers = markers.filter(marker => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude));

  return (
    <div className={`overflow-hidden rounded-3xl border border-stone-100 bg-stone-100 shadow-sm ${className}`}>
      <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom={false} className="h-full min-h-[260px] w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <MapUpdater center={center} markers={validMarkers} zoom={zoom} />
        {validMarkers.map(marker => (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={markerIcons[marker.tone ?? "default"]}
            eventHandlers={{ click: () => onMarkerClick?.(marker) }}
          >
            <Popup>
              <div className="min-w-40">
                <strong>{marker.title}</strong>
                {marker.description && <p className="mt-1 text-xs">{marker.description}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default memo(OpenStreetMap);
