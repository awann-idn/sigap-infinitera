'use client';

import React, { useEffect, useState } from 'react';
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    import('leaflet').then((L) => {
      const container = document.getElementById('sigap-map');
      if (!container) return;

      if ((container as any)._leaflet_id) {
        (container as any)._leaflet_id = null;
        container.innerHTML = '';
      }

      const map = L.map('sigap-map', {
        zoomControl: interactive,
        scrollWheelZoom: interactive,
        dragging: interactive,
      }).setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SIGAP',
      }).addTo(map);

      // Render Monochrome Square Markers
      reports.forEach((report) => {
        const customIcon = L.divIcon({
          className: 'sigap-marker-wrapper',
          html: `
            <div class="sigap-custom-marker">
              <div class="sigap-custom-marker-dot"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([report.lat_gps, report.lng_gps], { icon: customIcon }).addTo(map);

        const popupContent = document.createElement('div');
        popupContent.className = 'flex flex-col gap-2 p-1 max-w-[260px] font-body text-[13px] text-[#F5F5F5]';
        popupContent.innerHTML = `
          <div class="relative w-full h-[120px] bg-[#141414] overflow-hidden border border-[#333333]">
            <img src="${report.foto_url}" alt="Foto Kebakaran" class="w-full h-full object-cover" />
          </div>
          <div class="font-mono text-[11px] text-[#F5F5F5] font-bold uppercase tracking-[0.06em]">
            ${report.kode}
          </div>
          <div class="font-bold text-[14px] leading-tight text-[#F5F5F5]">
            ${report.wilayah}
          </div>
          <div class="font-mono text-[11px] text-[#8A8A8A]">
            SKALA: ${report.skala}
          </div>
          <div class="font-mono text-[10px] text-[#4A4A4A]">
            ${new Date(report.created_at).toLocaleString('id-ID')}
          </div>
        `;

        marker.bindPopup(popupContent);

        if (onSelectReport) {
          marker.on('click', () => onSelectReport(report));
        }
      });

      if (draggablePin) {
        const dragIcon = L.divIcon({
          className: 'sigap-pin-wrapper',
          html: `
            <div class="sigap-custom-marker border-[#F5F5F5] bg-[#F5F5F5]/20">
              <div class="sigap-custom-marker-dot bg-[#F5F5F5]"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const pinMarker = L.marker(center, { icon: dragIcon, draggable: true }).addTo(map);

        pinMarker.on('dragend', (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          if (onPinDragEnd) {
            onPinDragEnd(lat, lng);
          }
        });
      }
    });
  }, [isClient, reports, center, zoom, interactive, draggablePin]);

  if (!isClient) {
    return (
      <div className="w-full h-full min-h-[300px] bg-[#0a0a0a] flex items-center justify-center border border-[#1F1F1F]">
        <div className="font-mono text-[11px] text-[#4A4A4A] uppercase tracking-[0.08em] animate-pulse">
          MEMUAT PETA LEAFLET...
        </div>
      </div>
    );
  }

  return <div id="sigap-map" className="w-full h-full min-h-[300px] border border-[#1F1F1F]" />;
}
