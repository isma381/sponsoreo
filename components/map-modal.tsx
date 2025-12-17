"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LocateFixedIcon } from "lucide-react"

// Dynamic imports for Leaflet (client-side only)
let MapContainer: any, TileLayer: any, Marker: any, useMapEvents: any, useMap: any, L: any;

if (typeof window !== 'undefined') {
  // Load Leaflet CSS dynamically
  if (!document.querySelector('link[href*="leaflet"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  const leaflet = require('leaflet');
  const reactLeaflet = require('react-leaflet');
  
  MapContainer = reactLeaflet.MapContainer;
  TileLayer = reactLeaflet.TileLayer;
  Marker = reactLeaflet.Marker;
  useMapEvents = reactLeaflet.useMapEvents;
  useMap = reactLeaflet.useMap;
  L = leaflet;

  // Fix para los iconos de Leaflet
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  });
}

interface MapModalProps {
  isOpen: boolean
  onClose: () => void
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void
  initialLocation?: { lat: number; lng: number }
  onGetCurrentLocation?: () => void
}

// Componente para actualizar la vista del mapa cuando cambie la posición
function MapUpdater({ position }: { position: { lat: number; lng: number } | null }) {
  if (typeof window === 'undefined' || !useMap) return null;
  
  const map = useMap()
  
  React.useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], 15, {
        animate: true,
        duration: 1.0
      })
    }
  }, [map, position])
  
  return null
}

function LocationMarker({ position, setPosition }: { position: any, setPosition: any }) {
  if (typeof window === 'undefined' || !useMapEvents || !Marker || !L) return null;
  
  useMapEvents({
    click(e: any) {
      setPosition(e.latlng)
    },
  })
  
  const eventHandlers = {
    dragend(e: any) {
      const marker = e.target
      if (marker && marker.getLatLng) {
        setPosition(marker.getLatLng())
      }
    },
  }
  
  // Crear el ícono personalizado simple
  const customIcon = L.divIcon({
    html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="#000" stroke="white" stroke-width="1">
             <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
             <circle cx="12" cy="10" r="3" fill="white"/>
           </svg>`,
    className: 'custom-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 24]
  });
  
  return position ? <Marker position={position} draggable eventHandlers={eventHandlers} icon={customIcon} /> : null
}

// Función para formatear la dirección: País, Provincia, Ciudad, Barrio (opcional), Calles
const formatAddress = (data: any): string => {
  const parts: string[] = []
  
  // Agregar país (primero)
  if (data.address?.country) {
    parts.push(data.address.country)
  }
  
  // Agregar provincia/estado (segundo)
  if (data.address?.state || data.address?.province || data.address?.region) {
    const state = data.address.state || data.address.province || data.address.region
    parts.push(state)
  }
  
  // Agregar ciudad (tercero)
  if (data.address?.city || data.address?.town || data.address?.village || data.address?.municipality) {
    let city = data.address.city || data.address.town || data.address.village || data.address.municipality
    
    // Limpiar la palabra "Municipio" o "Municipio de" si aparece
    if (city && typeof city === 'string') {
      city = city.replace(/^Municipio\s+de\s+/i, '').replace(/^Municipio\s+/i, '')
    }
    
    if (city) {
      parts.push(city)
    }
  }
  
  // Agregar barrio/vecindario si existe (cuarto - opcional)
  if (data.address?.suburb || data.address?.neighbourhood || data.address?.quarter) {
    const neighbourhood = data.address.suburb || data.address.neighbourhood || data.address.quarter
    parts.push(neighbourhood)
  }
  
  // Agregar calle y número si existen (último - más específico)
  if (data.address) {
    const { house_number, road, pedestrian, footway } = data.address
    const street = road || pedestrian || footway
    if (street) {
      const streetWithNumber = house_number ? `${street} ${house_number}` : street
      parts.push(streetWithNumber)
    }
  }
  
  // Fallback: si no se pudo construir dirección estructurada, usar método anterior
  if (parts.length === 0) {
    const displayParts = data.display_name?.split(', ') || []
    return displayParts.slice(-4).join(', ')
  }
  
  return parts.join(', ')
}

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`)
    if (!response.ok) return "Dirección no encontrada"
    const data = await response.json()
    return formatAddress(data)
  } catch {
    return "Error al obtener dirección"
  }
}

export default function MapModal({ isOpen, onClose, onLocationSelect, initialLocation, onGetCurrentLocation }: MapModalProps) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(initialLocation || null)
  const [address, setAddress] = useState<string>("")
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Función para obtener ubicación actual dentro del modal
  const handleGetCurrentLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setIsGettingLocation(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const newCoords = { lat: latitude, lng: longitude }
          setPos(newCoords)
          setIsGettingLocation(false)
        },
        (error) => {
          setIsGettingLocation(false)
          console.error("Error al obtener ubicación:", error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      )
    } else {
      console.error("Geolocalización no soportada")
    }
  }

  useEffect(() => {
    if (pos) {
      setLoadingAddress(true)
      reverseGeocode(pos.lat, pos.lng).then(addr => {
        setAddress(addr)
        setLoadingAddress(false)
      })
    }
  }, [pos])

  useEffect(() => {
    if (isOpen && initialLocation) {
      setPos(initialLocation)
    }
    if (!isOpen) {
      setAddress("")
    }
  }, [isOpen, initialLocation])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleccionar Ubicación en el Mapa</DialogTitle>
          <DialogDescription>
            Haz clic en el mapa, arrastra el marcador o usa tu ubicación actual.
          </DialogDescription>
          <div className="flex justify-start pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGetCurrentLocation}
              disabled={isGettingLocation}
              className="flex items-center gap-2"
            >
              <LocateFixedIcon className="h-4 w-4" />
              {isGettingLocation ? "Obteniendo..." : "Usar mi ubicación"}
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-grow w-full rounded-md overflow-hidden" style={{ minHeight: '200px' }}>
          {isClient && MapContainer ? (
            <MapContainer
              center={pos || { lat: -34.6037, lng: -58.3816 }}
              zoom={13}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater position={pos} />
              <LocationMarker position={pos} setPosition={setPos} />
            </MapContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted rounded-md">
              <p className="text-muted-foreground">Cargando mapa...</p>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium">Ubicación seleccionada:</p>
          <p className="text-lg font-semibold overflow-x-auto whitespace-nowrap">{loadingAddress ? "Cargando dirección..." : address}</p>
          {pos && (
            <p className="text-xs text-muted-foreground">
              Lat: {pos.lat.toFixed(4)}, Lon: {pos.lng.toFixed(4)}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="">
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (pos && address) onLocationSelect({ lat: pos.lat, lng: pos.lng, address })
              onClose()
            }}
            disabled={!pos}
          >
            Confirmar Ubicación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
