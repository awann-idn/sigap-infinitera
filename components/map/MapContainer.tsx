'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LaporanItem } from '@/lib/db/store';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  reports: LaporanItem[];
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  selectedId?: string;
  onSelectReport?: (report: LaporanItem) => void;
  draggablePin?: boolean;
  onPinDragEnd?: (lat: number, lng: number) => void;
}

export default function LeafletMapComponent({
  reports,
  center = [-3.0, 104.5],
  zoom = 7,
  interactive = true,
  onSelectReport,
  draggablePin = false,
  onPinDragEnd,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const pinMarkerRef = useRef<any>(null);
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

    import('leaflet').then((L) => {
      if (disposed || mapRef.current || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: interactive,
        scrollWheelZoom: interactive,
        dragging: interactive,
      }).setView([centerLat, centerLng], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SIGAP',
      }).addTo(map);

      leafletRef.current = L;
      mapRef.current = map;
      markerLayerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    });

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerLayerRef.current = null;
      pinMarkerRef.current = null;
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  // Keep the viewport in sync when the center/zoom props change.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    mapRef.current.setView([centerLat, centerLng], zoom);
  }, [ready, centerLat, centerLng, zoom]);

  // Render report markers.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = markerLayerRef.current;
    if (!ready || !L || !layer) return;

    layer.clearLayers();

    reports.forEach((report) => {
      const customIcon = L.divIcon({
        className: 'sigap-marker-wrapper',
        html: `<div class="sigap-custom-marker"><div class="sigap-custom-marker-dot"></div></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([report.lat_gps, report.lng_gps], { icon: customIcon }).addTo(layer);

      const popupContent = document.createElement('div');
      popupContent.className = 'flex flex-col gap-2 p-1 max-w-[260px] font-body text-[13px]';
      popupContent.innerHTML = `
        <div class="relative w-full h-[120px] bg-[#3D0010] overflow-hidden border border-[#5C0016]">
          <img src="${report.foto_url}" alt="Foto Kebakaran" class="w-full h-full object-cover" />
        </div>
        <div class="font-mono text-[11px] text-[#800020] font-bold uppercase tracking-[0.06em]">${report.kode}</div>
        <div class="font-bold text-[14px] leading-tight text-[#272E3B]">${report.wilayah}</div>
        <div class="font-mono text-[11px] text-[#525866]">SKALA: ${report.skala}</div>
        <div class="font-mono text-[10px] text-[#8E95A3]">${new Date(report.created_at).toLocaleString('id-ID')}</div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => onSelectRef.current?.(report));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reportsSignature]);

  // Draggable fallback pin.
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
      pinMarkerRef.current = pinMarker;
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
      <div className="w-full h-full min-h-[300px] bg-[#3D0010] flex items-center justify-center border border-[#5C0016]">
        <div className="font-mono text-[11px] text-[#E8C9CF] uppercase tracking-[0.08em] animate-pulse">
          MEMUAT PETA LEAFLET...
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full min-h-[300px] border border-[#5C0016]" />;
}
