'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LaporanItem } from '@/lib/db/store';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

export const SOUTH_SUMATRA_BOUNDS: [[number, number], [number, number]] = [
  [-5.5, 102.0],
  [-1.3, 106.5],
];

export const DEFAULT_CENTER: [number, number] = [-3.1, 104.0];

interface MapProps {
  reports: LaporanItem[];
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  scrollWheelZoom?: boolean;
  selectedId?: string;
  onSelectReport?: (report: LaporanItem) => void;
  draggablePin?: boolean;
  onPinDragEnd?: (lat: number, lng: number) => void;
  roundCoords?: boolean;
}

export default function LeafletMapComponent({
  reports,
  center = DEFAULT_CENTER,
  zoom = 8,
  interactive = true,
  scrollWheelZoom,
  onSelectReport,
  draggablePin = false,
  onPinDragEnd,
  roundCoords = true,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const pinMarkerRef = useRef<any>(null);
  const boundaryLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const onSelectRef = useRef(onSelectReport);
  const onPinDragEndRef = useRef(onPinDragEnd);

  const [isClient, setIsClient] = useState(false);
  const [ready, setReady] = useState(false);

  const centerLat = center[0];
  const centerLng = center[1];
  const reportsSignature = reports
    .map((r) => `${r.id}|${r.kode}|${r.lat_gps}|${r.lng_gps}|${r.skala}`)
    .join('~');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    onSelectRef.current = onSelectReport;
  }, [onSelectReport]);

  useEffect(() => {
    onPinDragEndRef.current = onPinDragEnd;
  }, [onPinDragEnd]);

  // Initialize the map exactly once.
  useEffect(() => {
    if (!isClient) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    import('leaflet').then((L) => {
      if (disposed || mapRef.current || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: interactive,
        scrollWheelZoom: scrollWheelZoom ?? interactive,
        dragging: interactive,
        minZoom: 7,
        maxBounds: SOUTH_SUMATRA_BOUNDS,
        maxBoundsViscosity: 1.0,
      }).setView([centerLat, centerLng], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SIGAP',
      }).addTo(map);

      leafletRef.current = L;
      mapRef.current = map;

      // Inject custom cluster styles (maroon bg, cream text)
      if (!document.getElementById('sigap-cluster-styles')) {
        const style = document.createElement('style');
        style.id = 'sigap-cluster-styles';
        style.textContent = `
          .sigap-cluster {
            background: #800020;
            border: 3px solid #5C0016;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFF9F2;
            font-family: 'Space Mono', monospace;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.04em;
            box-shadow: 0 2px 8px rgba(128,0,32,0.45);
            transition: transform 0.15s ease;
          }
          .sigap-cluster:hover { transform: scale(1.1); }
          .sigap-cluster-sm  { width: 36px; height: 36px; }
          .sigap-cluster-md  { width: 46px; height: 46px; font-size: 14px; }
          .sigap-cluster-lg  { width: 58px; height: 58px; font-size: 16px; background: #5C0016; }
          /* Hide the default MarkerCluster canvas blobs */
          .leaflet-cluster-anim .leaflet-marker-icon,
          .leaflet-cluster-anim .leaflet-marker-shadow { transition: transform 0.3s ease, opacity 0.3s ease; }
          .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large,
          .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div { display: none !important; }
        `;
        document.head.appendChild(style);
      }

      // Use markerClusterGroup for automatic clustering
      const clusterGroup = (L as any).markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          let sizeClass = 'sigap-cluster-sm';
          if (count >= 10) sizeClass = 'sigap-cluster-lg';
          else if (count >= 5) sizeClass = 'sigap-cluster-md';
          return (L as any).divIcon({
            html: `<div class="sigap-cluster ${sizeClass}">${count}</div>`,
            className: '',
            iconSize: (L as any).point(0, 0),
          });
        },
      });
      clusterGroup.addTo(map);
      markerLayerRef.current = clusterGroup;

      // Load South Sumatra Province boundary GeoJSON outline
      fetch('/data/sumsel.geojson')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load sumsel.geojson');
          return res.json();
        })
        .then((geojson) => {
          if (disposed || !mapRef.current) return;
          const boundaryLayer = L.geoJSON(geojson, {
            style: {
              color: '#800020',
              weight: 2,
              fillColor: 'transparent',
              fillOpacity: 0,
            },
            interactive: false,
          }).addTo(mapRef.current);
          boundaryLayerRef.current = boundaryLayer;
        })
        .catch((err) => {
          console.warn('Could not load sumsel.geojson boundary:', err);
        });

      setReady(true);

      // Invalidate map size to prevent tile clipping
      window.setTimeout(() => map.invalidateSize(), 0);
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (mapRef.current) {
        if (boundaryLayerRef.current) {
          mapRef.current.removeLayer(boundaryLayerRef.current);
          boundaryLayerRef.current = null;
        }
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerLayerRef.current = null;
      pinMarkerRef.current = null;
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  // Keep the viewport in sync when the center/zoom props change (smooth flyTo).
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    mapRef.current.flyTo([centerLat, centerLng], zoom, { duration: 0.8 });
  }, [ready, centerLat, centerLng, zoom]);

  // Render report markers.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = markerLayerRef.current;
    if (!ready || !L || !layer) return;

    layer.clearLayers();

    reports.forEach((report) => {
      // Round coordinates to 3 decimal places (±100m precision) for public map privacy
      const lat = roundCoords ? Number(report.lat_gps.toFixed(3)) : report.lat_gps;
      const lng = roundCoords ? Number(report.lng_gps.toFixed(3)) : report.lng_gps;

      const customIcon = L.divIcon({
        className: 'sigap-marker-wrapper',
        html: `<div class="sigap-custom-marker"><div class="sigap-custom-marker-dot"></div></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = (L as any).marker([lat, lng], { icon: customIcon });

      const popupContent = document.createElement('div');
      popupContent.className = 'flex flex-col gap-2 p-1 max-w-[260px] font-body text-[13px]';
      popupContent.innerHTML = `
        <div class="relative w-full h-[120px] bg-[#3D0010] overflow-hidden border border-[#5C0016]">
          <img src="${report.foto_url}" alt="Foto Kebakaran" class="w-full h-full object-cover" />
        </div>
        <div class="font-mono text-[11px] text-[#800020] font-bold uppercase tracking-[0.06em]">${report.kode}</div>
        <div class="font-bold text-[14px] leading-tight text-[#272E3B]">${report.wilayah}</div>
        <div class="flex items-center justify-between font-mono text-[11px] text-[#525866]">
          <span>SKALA: ${report.skala}</span>
          <span class="text-[#800020] font-bold">${report.tingkat_keyakinan || 'TINJAUAN'}</span>
        </div>
        <div class="font-mono text-[10px] text-[#8E95A3] border-t border-[#D0D5DD] pt-1">
          AREA: ±${lat}, ${lng}
        </div>
        <div class="font-mono text-[10px] text-[#8E95A3]">
          ${new Date(report.created_at).toLocaleString('id-ID')}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => onSelectRef.current?.(report));
      layer.addLayer(marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reportsSignature, roundCoords]);

  // Draggable / clickable pin.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    if (pinMarkerRef.current) {
      map.removeLayer(pinMarkerRef.current);
      pinMarkerRef.current = null;
    }

    if (draggablePin) {
      const dragIcon = L.divIcon({
        className: 'sigap-pin-wrapper',
        html: `<div class="sigap-custom-marker border-[#F5F5F5] bg-[#F5F5F5]/20"><div class="sigap-custom-marker-dot bg-[#F5F5F5]"></div></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const pinMarker = L.marker([centerLat, centerLng], { icon: dragIcon, draggable: true }).addTo(map);
      pinMarker.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        onPinDragEndRef.current?.(lat, lng);
      });

      const handleMapClick = (e: any) => {
        const { lat, lng } = e.latlng;
        pinMarker.setLatLng([lat, lng]);
        onPinDragEndRef.current?.(lat, lng);
      };
      map.on('click', handleMapClick);

      pinMarkerRef.current = pinMarker;

      return () => {
        map.off('click', handleMapClick);
        if (pinMarkerRef.current && mapRef.current) {
          mapRef.current.removeLayer(pinMarkerRef.current);
          pinMarkerRef.current = null;
        }
      };
    }

    return () => {
      if (pinMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(pinMarkerRef.current);
        pinMarkerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, draggablePin, centerLat, centerLng]);

  if (!isClient) {
    return (
      <div className="w-full h-full min-h-[300px] bg-[#FFF9F2] flex items-center justify-center border border-[#800020]">
        <div className="font-mono text-[11px] text-[#800020] uppercase tracking-[0.08em] animate-pulse">
          MEMUAT PETA LEAFLET SUMATERA SELATAN...
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full min-h-[300px] border-0" />;
}
