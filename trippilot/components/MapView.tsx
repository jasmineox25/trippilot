import React, { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "../services/googleMaps";
import { Place } from "../data";
import { IMAGES } from "../constants";
import { Icon } from "./Icon";

declare const google: any;

interface MapViewProps {
  places: Place[];
}

export const MapView: React.FC<MapViewProps> = ({ places }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    (window as any).gm_authFailure = () => {
      console.error("Google Maps authentication failed");
      setMapError(true);
    };

    const initMap = async () => {
      try {
        await loadGoogleMaps();
        if (!mapRef.current || mapInstanceRef.current) return;

        const { Map } = await google.maps.importLibrary("maps");

        mapInstanceRef.current = new Map(mapRef.current, {
          center: { lat: 35.6762, lng: 139.6503 }, // Default to Tokyo
          zoom: 12,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
          mapId: "DEMO_MAP_ID",
        });
      } catch (e) {
        console.error("Failed to load map", e);
        setMapError(true);
      }
    };

    initMap();

    return () => {
      // cleanup
    };
  }, []);

  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapInstanceRef.current || mapError) return;

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];

      const bounds = new google.maps.LatLngBounds();
      let hasValidPlaces = false;

      // Ensure Marker library is loaded - Migrate to AdvancedMarkerElement
      const { AdvancedMarkerElement, PinElement } =
        await google.maps.importLibrary("marker");
      const { InfoWindow } = await google.maps.importLibrary("maps");

      places.forEach((place) => {
        if (place.lat !== undefined && place.lng !== undefined) {
          // Create a pin for the marker
          const pin = new PinElement({
            glyphColor: "white",
          });

          // Standard Marker -> AdvancedMarkerElement
          const marker = new AdvancedMarkerElement({
            position: { lat: place.lat, lng: place.lng },
            map: mapInstanceRef.current,
            title: place.name,
            content: pin,
            // animation: google.maps.Animation.DROP is not supported in AdvancedMarkerElement
          });

          const infoWindow = new InfoWindow({
            content: `<div style="color: black; font-weight: bold;">${place.name}</div><div style="color: grey;">${place.loc}</div>`,
          });

          marker.addListener("click", () => {
            infoWindow.open({
              anchor: marker,
              map: mapInstanceRef.current,
            });
          });

          markersRef.current.push(marker);
          bounds.extend(marker.position as any);
          hasValidPlaces = true;
        }
      });

      if (hasValidPlaces) {
        mapInstanceRef.current.fitBounds(bounds);

        // Prevent zooming in too much if only one point
        const listener = google.maps.event.addListenerOnce(
          mapInstanceRef.current,
          "bounds_changed",
          () => {
            if (mapInstanceRef.current.getZoom() > 15) {
              mapInstanceRef.current.setZoom(15);
            }
          },
        );
      }
    };

    updateMarkers();
  }, [places, mapError]);

  if (mapError) {
    return (
      <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50 blur-[2px]"
          style={{ backgroundImage: `url(${IMAGES.MAP_BACKGROUND})` }}
        ></div>

        {/* Render pins on the static background for context */}
        {places.map((place, i) => (
          <div
            key={place.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{
              // Random-ish positioning based on index to simulate a map view
              top: `${40 + ((i * 10) % 40)}%`,
              left: `${30 + ((i * 15) % 60)}%`,
            }}
          >
            <div className="size-4 rounded-full bg-primary ring-2 ring-white shadow-md"></div>
          </div>
        ))}

        <div className="z-10 p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl text-center max-w-sm mx-4 border border-white/20">
          <div className="inline-flex p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 mb-3">
            <Icon name="location_off" className="text-3xl" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">
            Map Unavailable
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            The map cannot be displayed due to an API key restriction. You can
            still manage your itinerary.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-full bg-slate-200 dark:bg-slate-800"
    />
  );
};
