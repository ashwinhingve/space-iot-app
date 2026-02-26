'use client';

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix default icon URLs for Next.js
// @ts-expect-error leaflet icon url override
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ManifoldLocation {
  _id: string;
  name: string;
  status: string;
  installationDetails?: {
    location?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  metadata?: {
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
  };
  valveCount?: number;
}

interface Props {
  manifolds: ManifoldLocation[];
}

export default function CommandAreaMap({ manifolds }: Props) {
  // Filter manifolds that have valid non-zero coordinates
  const mappable = useMemo(
    () =>
      manifolds.filter((m) => {
        const lat = m.installationDetails?.coordinates?.latitude;
        const lng = m.installationDetails?.coordinates?.longitude;
        return lat != null && lng != null && !(lat === 0 && lng === 0);
      }),
    [manifolds]
  );

  // Centroid of all mappable manifolds, fallback to India centre
  const center = useMemo<[number, number]>(() => {
    if (mappable.length === 0) return [20.5937, 78.9629];
    const latSum = mappable.reduce(
      (s, m) => s + (m.installationDetails?.coordinates?.latitude ?? 0),
      0
    );
    const lngSum = mappable.reduce(
      (s, m) => s + (m.installationDetails?.coordinates?.longitude ?? 0),
      0
    );
    return [latSum / mappable.length, lngSum / mappable.length];
  }, [mappable]);

  const statusColor = (status: string) => {
    if (status === 'Active') return '#10b981';
    if (status === 'Fault') return '#ef4444';
    if (status === 'Maintenance') return '#f59e0b';
    return '#64748b';
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/50" style={{ height: 480 }}>
      <MapContainer
        center={center}
        zoom={mappable.length === 0 ? 5 : 12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mappable.map((m) => {
          const lat = m.installationDetails!.coordinates!.latitude;
          const lng = m.installationDetails!.coordinates!.longitude;
          return (
            <Marker key={m._id} position={[lat, lng]}>
              <Popup>
                <div className="text-sm space-y-1 min-w-[160px]">
                  <p className="font-bold text-base">{m.name}</p>
                  <p style={{ color: statusColor(m.status) }} className="text-xs font-semibold">
                    ● {m.status}
                  </p>
                  {m.installationDetails?.location && (
                    <p className="text-gray-600 text-xs">{m.installationDetails.location}</p>
                  )}
                  {m.valveCount != null && (
                    <p className="text-gray-500 text-xs">{m.valveCount} valves</p>
                  )}
                  {m.metadata?.lastMaintenanceDate && (
                    <p className="text-gray-500 text-xs">
                      Last service: {new Date(m.metadata.lastMaintenanceDate).toLocaleDateString()}
                    </p>
                  )}
                  {m.metadata?.nextMaintenanceDate && (
                    <p className="text-gray-500 text-xs">
                      Next service: {new Date(m.metadata.nextMaintenanceDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* No GPS overlay */}
      {mappable.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm z-[1000] rounded-xl">
          <div className="text-center px-6">
            <p className="text-muted-foreground text-sm font-medium">
              No manifolds have GPS coordinates set.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Set coordinates in the Manifold detail page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
