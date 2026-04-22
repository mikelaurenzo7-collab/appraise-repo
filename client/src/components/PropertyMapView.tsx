import { useEffect, useRef, useState } from "react";
import { MapView } from "./Map";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Home, TrendingDown } from "lucide-react";

interface ComparableProperty {
  address: string;
  salePrice: number;
  saleDate: string;
  similarity?: number;
  lat?: number;
  lng?: number;
}

interface PropertyMapViewProps {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  marketValue?: number;
  assessedValue?: number;
  comparableSales?: ComparableProperty[];
}

export default function PropertyMapView({
  address,
  city,
  state,
  zipCode,
  marketValue,
  assessedValue,
  comparableSales = [],
}: PropertyMapViewProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mainMarker, setMainMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [comparableMarkers, setComparableMarkers] = useState<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: 37.7749, lng: -122.4194 });

  // Geocode the main property address
  useEffect(() => {
    if (!mapRef.current || !address) return;

    const geocoder = new google.maps.Geocoder();
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;

    geocoder.geocode({ address: fullAddress }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();

        // Update map center
        mapRef.current?.setCenter(location);
        mapRef.current?.setZoom(15);
        setMapCenter({ lat, lng });

        // Add main property marker
        if (mainMarker) mainMarker.map = null; // Remove old marker
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: location,
          title: address,
          content: createMarkerContent("Subject Property", marketValue, true),
        });
        setMainMarker(marker);
      }
    });
  }, [address, city, state, zipCode, mapRef.current]);

  // Geocode comparable properties
  useEffect(() => {
    if (!mapRef.current || !comparableSales?.length) return;

    const geocoder = new google.maps.Geocoder();
    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

    comparableSales.forEach((comp, index) => {
      geocoder.geocode({ address: comp.address }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const location = results[0].geometry.location;
          const marker = new google.maps.marker.AdvancedMarkerElement({
            map: mapRef.current,
            position: location,
            title: comp.address,
            content: createMarkerContent(
              `Comp ${index + 1}`,
              comp.salePrice,
              false,
              comp.similarity
            ),
          });
          newMarkers.push(marker);
        }
      });
    });

    return () => {
      // Cleanup old markers
      comparableMarkers.forEach((marker) => {
        marker.map = null;
      });
    };
  }, [comparableSales, mapRef.current]);

  const createMarkerContent = (
    label: string,
    price?: number,
    isSubject: boolean = false,
    similarity?: number
  ) => {
    const div = document.createElement("div");
    div.className = `flex flex-col items-center gap-1`;

    const bgColor = isSubject
      ? "bg-purple-600"
      : similarity && similarity > 0.8
        ? "bg-green-600"
        : "bg-blue-600";

    // Build children with textContent — never innerHTML with interpolated
    // values. If `label` ever comes from user input (addresses, property
    // nicknames, etc.), innerHTML would open an XSS hole.
    const badge = document.createElement("div");
    badge.className = `${bgColor} text-white px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap`;
    badge.textContent = label;
    div.appendChild(badge);

    if (price) {
      const priceEl = document.createElement("div");
      priceEl.className = "text-xs font-semibold text-gray-900 bg-white px-1.5 py-0.5 rounded";
      priceEl.textContent = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 0,
      }).format(price);
      div.appendChild(priceEl);
    }

    return div;
  };

  const assessmentGap = assessedValue && marketValue ? assessedValue - marketValue : 0;
  const gapPercentage = assessedValue && marketValue ? ((assessmentGap / marketValue) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden h-96 border-purple-200">
            <MapView
              initialCenter={mapCenter}
              initialZoom={15}
              onMapReady={(map) => {
                mapRef.current = map;
              }}
              className="w-full h-full"
            />
          </Card>
        </div>

        {/* Property Info */}
        <div className="space-y-3">
          {/* Subject Property */}
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-start gap-2 mb-2">
              <Home className="text-purple-600 mt-0.5" size={18} />
              <div>
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                  Subject Property
                </p>
                <p className="text-sm font-bold text-gray-900">{address}</p>
              </div>
            </div>

            <div className="space-y-2 mt-3 pt-3 border-t border-purple-200">
              {assessedValue && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-700">Assessed Value:</span>
                  <span className="font-semibold text-gray-900">
                    ${(assessedValue / 1000).toFixed(0)}K
                  </span>
                </div>
              )}
              {marketValue && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-700">Market Value:</span>
                  <span className="font-semibold text-gray-900">
                    ${(marketValue / 1000).toFixed(0)}K
                  </span>
                </div>
              )}
              {assessmentGap !== 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                  <span className="text-xs font-semibold text-red-700 flex items-center gap-1">
                    <TrendingDown size={14} />
                    Over-Assessment:
                  </span>
                  <span className="font-bold text-red-700">
                    ${(Math.abs(assessmentGap) / 1000).toFixed(0)}K ({gapPercentage}%)
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Comparable Properties Summary */}
          {comparableSales?.length > 0 && (
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="text-blue-600" size={18} />
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  Comparable Sales ({comparableSales.length})
                </p>
              </div>

              <div className="space-y-2">
                {comparableSales.slice(0, 3).map((comp, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="font-semibold text-gray-900 truncate">{comp.address}</div>
                    <div className="flex justify-between items-center text-gray-700 mt-0.5">
                      <span>${(comp.salePrice / 1000).toFixed(0)}K</span>
                      {comp.similarity && (
                        <Badge variant="outline" className="text-xs">
                          {(comp.similarity * 100).toFixed(0)}% similar
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {comparableSales.length > 3 && (
                  <p className="text-xs text-gray-600 pt-2 border-t border-blue-200">
                    +{comparableSales.length - 3} more comparables
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Map Legend */}
      <Card className="p-3 bg-gray-50 border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-2">Map Legend:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-600"></div>
            <span className="text-gray-700">Subject Property</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-600"></div>
            <span className="text-gray-700">High Similarity Comp</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-600"></div>
            <span className="text-gray-700">Comparable Sale</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
