import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Slider } from "~/components/ui/slider";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Search, MapPin, Star, Filter, Clock, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import axios from "axios";
import ClinicImageCarousel from "./ClinicImageCarousel";
import ClinicDefaultImage from "./ClinicDefaultImage";
import MapView from "./MapView";
import config from "~/config";
import { useAuthStore } from "~/stores/useAuthStore";

interface ClinicPhoto {
  id_foto: number;
  id_clinica: number;
  url: string;
  titulo?: string;
  tipo?: string;
  es_principal: boolean;
  created_at: string;
}

interface Clinic {
  id_clinica: number;
  nombre: string;
  direccion: string;
  telefono: string;
  correo: string;
  certificado_url?: string;
  // Coordenadas
  latitud?: number;
  longitud?: number;
  // Propiedades adicionales para UI y filtrado
  photos?: ClinicPhoto[];
  rating?: number;
  reviews?: number;
  distance?: string;
  specialties?: string[];
  availability?: string;
  services?: string[];
  openNow?: boolean;
  price?: "$" | "$$" | "$$$";
  petTypes?: string[];
  featured?: boolean;
  favorite?: boolean;
  detalles?: {
    especialidades?: string[];
  };
}

export default function ClinicsPage() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [distance, setDistance] = useState([5]);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedPetTypes, setSelectedPetTypes] = useState<string[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const initialRenderDone = useRef(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  // Initialize the map with a delay to ensure DOM is fully rendered
  useEffect(() => {
    if (!initialRenderDone.current) {
      initialRenderDone.current = true;

      // Delay initialization to ensure DOM is ready
      const timer = setTimeout(() => {
        console.log("Delayed map initialization");
        setMapInitialized(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // Función para cargar las clínicas desde el backend
    const fetchClinics = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/clinics`);

        if (response.data && response.data.clinicas) {
          // Función para calcular la distancia entre dos puntos usando la fórmula de Haversine
          const calculateDistance = (
            lat1: number,
            lon1: number,
            lat2: number,
            lon2: number
          ) => {
            const R = 6371; // Radio de la Tierra en km
            const dLat = (lat2 - lat1) * (Math.PI / 180);
            const dLon = (lon2 - lon1) * (Math.PI / 180);
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) *
                Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // Distancia en km
          };

          // Obtener la ubicación del usuario
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setUserLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                });
              },
              (error) => {
                console.error("Error al obtener la ubicación:", error);
              }
            );
          }

          // Transformar los datos del backend al formato que espera nuestra UI
          const formattedClinics = response.data.clinicas.map((clinic: any) => {
            let distance = undefined;
            if (userLocation && clinic.latitud && clinic.longitud) {
              const dist = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                clinic.latitud,
                clinic.longitud
              );
              distance = `${dist.toFixed(1)} km`;
            }

            return {
              id_clinica: clinic.id_clinica,
              nombre: clinic.nombre,
              direccion: clinic.direccion,
              telefono: clinic.telefono,
              correo: clinic.correo,
              certificado_url: clinic.certificado_url,
              latitud: clinic.latitud || undefined,
              longitud: clinic.longitud || undefined,
              photos: clinic.photos || [], // Usar fotos que vienen del backend
              distance, // Usar la distancia calculada o undefined
              specialties: ["Consulta general", "Vacunación"], // Especialidades por defecto
              availability:
                Math.random() > 0.3
                  ? "Abierto ahora • Cierra a las 18:00"
                  : "Cerrado • Abre mañana a las 9:00",
              openNow: Math.random() > 0.3, // Aleatoriamente abierto o cerrado
              price: ["$", "$$", "$$$"][Math.floor(Math.random() * 3)] as
                | "$"
                | "$$"
                | "$$$", // Precio aleatorio
              petTypes: clinic.detalles?.especialidades || ["Perros", "Gatos"],
              featured: false,
              favorite: Math.random() > 0.8, // Algunas clínicas favoritas
            };
          });

          setClinics(formattedClinics);
        } else {
          setError("Formato de respuesta inesperado del servidor");
        }
      } catch (err) {
        console.error("Error al obtener las clínicas:", err);
        setError(
          "Error al cargar las clínicas veterinarias. Por favor, intenta de nuevo."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchClinics();
  }, []);

  // Filtrar clínicas según los criterios seleccionados
  const filteredClinics = clinics.filter((clinic) => {
    // Filtro por búsqueda
    const matchesSearch =
      searchQuery === "" ||
      clinic.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.direccion.toLowerCase().includes(searchQuery.toLowerCase());

    // Filtro por distancia (si la distancia está disponible)
    const clinicDistance = clinic.distance ? parseFloat(clinic.distance) : 0;
    const matchesDistance = clinicDistance <= distance[0];

    // Filtro por tipos de mascotas
    const matchesPetTypes =
      selectedPetTypes.length === 0 ||
      (clinic.petTypes &&
        selectedPetTypes.some((p) => clinic.petTypes?.includes(p)));

    return matchesSearch && matchesDistance && matchesPetTypes;
  });

  const handlePetTypeChange = (petType: string, checked: boolean) => {
    if (checked) {
      setSelectedPetTypes([...selectedPetTypes, petType]);
    } else {
      setSelectedPetTypes(selectedPetTypes.filter((p) => p !== petType));
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDistance([5]);
    setSelectedPetTypes([]);
  };

  const toggleFavorite = (id: number) => {
    // En una aplicación real, esto enviaría una solicitud al servidor
    console.log(`Toggling favorite for clinic ${id}`);

    // Actualizar estado local para UI
    setClinics(
      clinics.map((clinic) => {
        if (clinic.id_clinica === id) {
          return { ...clinic, favorite: !clinic.favorite };
        }
        return clinic;
      })
    );
  };

  // Función para iniciar el proceso de programación de citas
  const handleScheduleAppointment = (clinicId: number) => {
    navigate(`/pet-dashboard/appointments/schedule?clinic=${clinicId}`);
  };

  // Manejar la selección de una clínica desde el mapa
  const handleClinicSelect = (clinicId: number) => {
    // Buscar la clínica seleccionada
    const selectedClinic = clinics.find(
      (clinic) => clinic.id_clinica === clinicId
    );
    if (selectedClinic) {
      // Podemos redirigir a la vista de detalle o realizar alguna acción
      navigate(`/pet-dashboard/clinics/${clinicId}`);
    }
  };

  useEffect(() => {
    // Initialize map once on component mount
    if (!mapInitialized) {
      setMapInitialized(true);
    }
  }, [mapInitialized]);

  // Mostrar mensaje de carga o error
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Cargando veterinarias...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-4">
          <Search className="h-10 w-10 text-red-500" />
        </div>
        <h3 className="mb-2 text-xl font-semibold">Error</h3>
        <p className="text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    );
  }

  // Función para renderizar la sección de imagen de cada clínica
  const renderClinicImage = (clinic: Clinic) => {
    const hasPhotos = clinic.photos && clinic.photos.length > 0;

    // Elemento de "favorito" que se mostrará sobre la imagen
    const favoriteButton = (
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-3 top-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm z-10"
        onClick={() => toggleFavorite(clinic.id_clinica)}
      >
        <Heart
          className={`h-4 w-4 ${
            clinic.favorite ? "fill-red-500 text-red-500" : ""
          }`}
        />
      </Button>
    );

    // Badge de "destacado" que se mostrará sobre la imagen
    const featuredBadge = null;

    if (hasPhotos) {
      return (
        <div className="relative w-full md:w-1/3 p-3">
          <div className="overflow-hidden rounded-lg shadow-sm">
            <ClinicImageCarousel
              photos={clinic.photos!}
              clinicName={clinic.nombre}
            />
          </div>
          {favoriteButton}
        </div>
      );
    } else {
      return (
        <div className="relative w-full md:w-1/3 p-3">
          <div className="overflow-hidden rounded-lg shadow-sm">
            <ClinicDefaultImage clinicName={clinic.nombre} />
          </div>
          {favoriteButton}
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Buscar Veterinarias
        </h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            Lista
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("map")}
          >
            Mapa
          </Button>
        </div>
      </div>

      {/* Barra de búsqueda principal */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre, dirección o especialidad..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedPetTypes.join(",")}
            onValueChange={(values) => setSelectedPetTypes(values.split(","))}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tipo de mascota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Perros">Perros</SelectItem>
              <SelectItem value="Gatos">Gatos</SelectItem>
              <SelectItem value="Aves">Aves</SelectItem>
              <SelectItem value="Exóticos">Exóticos</SelectItem>
              <SelectItem value="Reptiles">Reptiles</SelectItem>
              <SelectItem value="Pequeños mamíferos">
                Pequeños mamíferos
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={clearFilters}
            title="Limpiar filtros"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Panel de filtros */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Distancia máxima</h3>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between">
                      <span className="text-sm">Distancia</span>
                      <span className="text-sm font-medium">
                        {distance[0]} km
                      </span>
                    </div>
                    <Slider
                      value={distance}
                      min={1}
                      max={20}
                      step={1}
                      onValueChange={setDistance}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Tipo de mascotas</h3>
                <div className="space-y-2">
                  {[
                    "Perros",
                    "Gatos",
                    "Aves",
                    "Exóticos",
                    "Reptiles",
                    "Pequeños mamíferos",
                  ].map((petType) => (
                    <div key={petType} className="flex items-center space-x-2">
                      <Checkbox
                        id={`pet-${petType}`}
                        checked={selectedPetTypes.includes(petType)}
                        onCheckedChange={(checked) =>
                          handlePetTypeChange(petType, checked as boolean)
                        }
                      />
                      <Label htmlFor={`pet-${petType}`} className="text-sm">
                        {petType}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={clearFilters}
              >
                Limpiar filtros
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Resultados */}
        <div className="lg:col-span-3">
          {/* List View - Hidden when map view is active */}
          <div
            className={`space-y-4 ${viewMode === "map" ? "hidden" : "block"}`}
          >
            {filteredClinics.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  No se encontraron resultados
                </h3>
                <p className="text-muted-foreground">
                  Intenta ajustar tus filtros o buscar con otros términos
                </p>
                <Button className="mt-4" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              </Card>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filteredClinics.length}{" "}
                    {filteredClinics.length === 1 ? "resultado" : "resultados"}{" "}
                    encontrados
                  </p>
                  <Select defaultValue="distance">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distance">
                        Distancia: más cercanos
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filteredClinics.map((clinic) => (
                  <Card key={clinic.id_clinica} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        {renderClinicImage(clinic)}

                        <div className="flex flex-1 flex-col p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                              {clinic.nombre}
                            </h3>
                            {/* Comentado temporalmente hasta que se implemente el sistema de ratings
                            <div className="flex items-center">
                              <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">
                                {clinic.rating}
                              </span>
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({clinic.reviews})
                              </span>
                            </div>
                            */}
                          </div>

                          <div className="mb-2 flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-1 h-4 w-4" />
                            <span>
                              {clinic.distance ? `${clinic.distance} • ` : ""}
                              {clinic.direccion}
                            </span>
                          </div>

                          <div className="mb-2 flex items-center text-sm text-muted-foreground">
                            <Clock className="mr-1 h-4 w-4" />
                            <span>{clinic.availability}</span>
                          </div>

                          <div className="mb-3 flex flex-wrap gap-1">
                            {clinic.specialties?.map((specialty) => (
                              <Badge
                                key={specialty}
                                variant="secondary"
                                className="text-xs"
                              >
                                {specialty}
                              </Badge>
                            ))}
                          </div>

                          <div className="mb-3 flex flex-wrap gap-1">
                            {clinic.petTypes?.map((petType) => (
                              <Badge
                                key={petType}
                                variant="outline"
                                className="text-xs"
                              >
                                {petType}
                              </Badge>
                            ))}
                          </div>

                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link
                                  to={`/dashboard-client/vet-search/${clinic.id_clinica}`}
                                >
                                  Ver perfil
                                </Link>
                              </Button>
                              <Button className="w-full sm:w-auto" asChild>
                                <Link
                                  to={`/dashboard-client/appointments/schedule?clinic=${clinic.id_clinica}`}
                                >
                                  Agendar cita
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>

          {/* Map View - Only load MapView component when needed */}
          <div
            ref={mapContainerRef}
            className={`overflow-hidden rounded-lg shadow-sm ${
              viewMode === "list" ? "hidden" : "block"
            }`}
            style={{ height: "calc(100vh - 250px)", minHeight: "500px" }}
          >
            {mapInitialized && (
              <MapView
                clinics={filteredClinics}
                onClinicSelect={handleClinicSelect}
                isMapViewActive={viewMode === "map"}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
