import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { Search, MapPin, Star, Filter, Clock, Heart, X } from "lucide-react";
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

interface OpeningHours {
  monday?: { open: string; close: string; is24Hours: boolean; closed: boolean };
  tuesday?: {
    open: string;
    close: string;
    is24Hours: boolean;
    closed: boolean;
  };
  wednesday?: {
    open: string;
    close: string;
    is24Hours: boolean;
    closed: boolean;
  };
  thursday?: {
    open: string;
    close: string;
    is24Hours: boolean;
    closed: boolean;
  };
  friday?: { open: string; close: string; is24Hours: boolean; closed: boolean };
  saturday?: {
    open: string;
    close: string;
    is24Hours: boolean;
    closed: boolean;
  };
  sunday?: { open: string; close: string; is24Hours: boolean; closed: boolean };
}

interface Clinic {
  id_clinica: number;
  nombre: string;
  direccion: string;
  telefono: string;
  correo: string;
  certificado_url?: string;
  latitud?: number;
  longitud?: number;
  detalles?: {
    especialidades?: string[];
    instalaciones?: string[];
    metodos_pago?: string[];
  };
  // Datos enriquecidos desde backend
  photos?: ClinicPhoto[];
  averageRating?: number;
  reviewCount?: number;
  serviceCategories?: string[];
  openingHours?: OpeningHours;
  specialties?: string[];
  facilities?: string[];
  paymentMethods?: string[];
  // UI state
  favorite?: boolean;
}

export default function ClinicsPage() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);

  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceCategories, setSelectedServiceCategories] = useState<
    string[]
  >([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<
    string[]
  >([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [showOpenNow, setShowOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "rating">("name");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  // Obtener opciones únicas de filtros desde los datos
  const allServiceCategories = Array.from(
    new Set(clinics.flatMap((c) => c.serviceCategories || [])),
  ).sort();

  const allSpecialties = Array.from(
    new Set(clinics.flatMap((c) => c.specialties || [])),
  ).sort();

  const allFacilities = Array.from(
    new Set(clinics.flatMap((c) => c.facilities || [])),
  ).sort();

  const allPaymentMethods = Array.from(
    new Set(clinics.flatMap((c) => c.paymentMethods || [])),
  ).sort();

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/clinics`);

        if (response.data && response.data.clinicas) {
          setClinics(response.data.clinicas);
        } else {
          setError("Formato de respuesta inesperado del servidor");
        }
      } catch (err) {
        console.error("Error al obtener las clínicas:", err);
        setError(
          "Error al cargar las clínicas veterinarias. Por favor, intenta de nuevo.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchClinics();
  }, []);

  // Función para verificar si una clínica está abierta ahora
  const isOpenNow = (clinic: Clinic): boolean => {
    if (!clinic.openingHours) return false;

    const now = new Date();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const currentDay = dayNames[now.getDay()] as keyof OpeningHours;
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    const todaySchedule = clinic.openingHours[currentDay];
    if (!todaySchedule || todaySchedule.closed) return false;
    if (todaySchedule.is24Hours) return true;

    return (
      currentTime >= todaySchedule.open && currentTime <= todaySchedule.close
    );
  };

  // Función para obtener el texto de disponibilidad
  const getAvailabilityText = (clinic: Clinic): string => {
    if (!clinic.openingHours) return "Horario no disponible";

    const now = new Date();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const currentDay = dayNames[now.getDay()] as keyof OpeningHours;

    const todaySchedule = clinic.openingHours[currentDay];
    if (!todaySchedule) return "Horario no disponible";
    if (todaySchedule.closed) return "Cerrado hoy";
    if (todaySchedule.is24Hours) return "Abierto 24 horas";

    const isOpen = isOpenNow(clinic);
    if (isOpen) {
      return `Abierto ahora • Cierra a las ${todaySchedule.close}`;
    } else {
      return `Cerrado • Abre a las ${todaySchedule.open}`;
    }
  };

  // Filtrar clínicas según los criterios seleccionados
  const filteredClinics = clinics
    .filter((clinic) => {
      // Filtro por búsqueda (nombre o dirección)
      const matchesSearch =
        searchQuery === "" ||
        clinic.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clinic.direccion.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtro por categorías de servicio
      const matchesServiceCategory =
        selectedServiceCategories.length === 0 ||
        (clinic.serviceCategories &&
          selectedServiceCategories.some((cat) =>
            clinic.serviceCategories?.includes(cat),
          ));

      // Filtro por especialidades (tipos de mascotas)
      const matchesSpecialty =
        selectedSpecialties.length === 0 ||
        (clinic.specialties &&
          selectedSpecialties.some((spec) =>
            clinic.specialties?.includes(spec),
          ));

      // Filtro por instalaciones
      const matchesFacility =
        selectedFacilities.length === 0 ||
        (clinic.facilities &&
          selectedFacilities.some((fac) => clinic.facilities?.includes(fac)));

      // Filtro por métodos de pago
      const matchesPayment =
        selectedPaymentMethods.length === 0 ||
        (clinic.paymentMethods &&
          selectedPaymentMethods.some((pm) =>
            clinic.paymentMethods?.includes(pm),
          ));

      // Filtro por calificación mínima
      const matchesRating =
        minRating === 0 ||
        (clinic.averageRating && clinic.averageRating >= minRating);

      // Filtro por "abierto ahora"
      const matchesOpenNow = !showOpenNow || isOpenNow(clinic);

      return (
        matchesSearch &&
        matchesServiceCategory &&
        matchesSpecialty &&
        matchesFacility &&
        matchesPayment &&
        matchesRating &&
        matchesOpenNow
      );
    })
    .sort((a, b) => {
      if (sortBy === "rating") {
        return (b.averageRating || 0) - (a.averageRating || 0);
      }
      return a.nombre.localeCompare(b.nombre);
    });

  // Manejadores de filtros
  const handleServiceCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedServiceCategories([...selectedServiceCategories, category]);
    } else {
      setSelectedServiceCategories(
        selectedServiceCategories.filter((c) => c !== category),
      );
    }
  };

  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    if (checked) {
      setSelectedSpecialties([...selectedSpecialties, specialty]);
    } else {
      setSelectedSpecialties(
        selectedSpecialties.filter((s) => s !== specialty),
      );
    }
  };

  const handleFacilityChange = (facility: string, checked: boolean) => {
    if (checked) {
      setSelectedFacilities([...selectedFacilities, facility]);
    } else {
      setSelectedFacilities(selectedFacilities.filter((f) => f !== facility));
    }
  };

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    if (checked) {
      setSelectedPaymentMethods([...selectedPaymentMethods, method]);
    } else {
      setSelectedPaymentMethods(
        selectedPaymentMethods.filter((m) => m !== method),
      );
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedServiceCategories([]);
    setSelectedSpecialties([]);
    setSelectedFacilities([]);
    setSelectedPaymentMethods([]);
    setMinRating(0);
    setShowOpenNow(false);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedServiceCategories.length > 0) count++;
    if (selectedSpecialties.length > 0) count++;
    if (selectedFacilities.length > 0) count++;
    if (selectedPaymentMethods.length > 0) count++;
    if (minRating > 0) count++;
    if (showOpenNow) count++;
    return count;
  };

  const toggleFavorite = (id: number) => {
    // En una aplicación real, esto enviaría una solicitud al servidor
    console.log(`Toggling favorite for clinic ${id}`);

    setClinics(
      clinics.map((clinic) => {
        if (clinic.id_clinica === id) {
          return { ...clinic, favorite: !clinic.favorite };
        }
        return clinic;
      }),
    );
  };

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
        {getActiveFiltersCount() > 0 && (
          <Badge variant="secondary">
            {getActiveFiltersCount()}{" "}
            {getActiveFiltersCount() === 1
              ? "filtro activo"
              : "filtros activos"}
          </Badge>
        )}
      </div>

      {/* Barra de búsqueda principal */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre o dirección..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {getActiveFiltersCount() > 0 && (
          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Panel de filtros */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Filtros
                <Filter className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filtro: Abierto Ahora */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="open-now" className="text-sm font-medium">
                    Abierto ahora
                  </Label>
                  <Switch
                    id="open-now"
                    checked={showOpenNow}
                    onCheckedChange={setShowOpenNow}
                  />
                </div>
              </div>

              {/* Filtro: Calificación */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Calificación mínima</h3>
                <div className="space-y-2">
                  {[4, 3, 2, 0].map((rating) => (
                    <div key={rating} className="flex items-center space-x-2">
                      <Checkbox
                        id={`rating-${rating}`}
                        checked={minRating === rating}
                        onCheckedChange={(checked) =>
                          setMinRating(checked ? rating : 0)
                        }
                      />
                      <Label
                        htmlFor={`rating-${rating}`}
                        className="text-sm flex items-center gap-1"
                      >
                        {rating === 0 ? (
                          "Todas"
                        ) : (
                          <>
                            {rating}+{" "}
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          </>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filtro: Categoría de Servicio */}
              {allServiceCategories.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Servicios</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allServiceCategories.map((category) => (
                      <div
                        key={category}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`service-${category}`}
                          checked={selectedServiceCategories.includes(category)}
                          onCheckedChange={(checked) =>
                            handleServiceCategoryChange(
                              category,
                              checked as boolean,
                            )
                          }
                        />
                        <Label
                          htmlFor={`service-${category}`}
                          className="text-sm"
                        >
                          {category}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro: Especialidades (Tipos de Mascotas) */}
              {allSpecialties.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Tipo de mascotas</h3>
                  <div className="space-y-2">
                    {allSpecialties.map((specialty) => (
                      <div
                        key={specialty}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`specialty-${specialty}`}
                          checked={selectedSpecialties.includes(specialty)}
                          onCheckedChange={(checked) =>
                            handleSpecialtyChange(specialty, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={`specialty-${specialty}`}
                          className="text-sm"
                        >
                          {specialty}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro: Instalaciones */}
              {allFacilities.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Instalaciones</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allFacilities.map((facility) => (
                      <div
                        key={facility}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`facility-${facility}`}
                          checked={selectedFacilities.includes(facility)}
                          onCheckedChange={(checked) =>
                            handleFacilityChange(facility, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={`facility-${facility}`}
                          className="text-sm"
                        >
                          {facility}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro: Métodos de Pago */}
              {allPaymentMethods.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Métodos de pago</h3>
                  <div className="space-y-2">
                    {allPaymentMethods.map((method) => (
                      <div key={method} className="flex items-center space-x-2">
                        <Checkbox
                          id={`payment-${method}`}
                          checked={selectedPaymentMethods.includes(method)}
                          onCheckedChange={(checked) =>
                            handlePaymentMethodChange(
                              method,
                              checked as boolean,
                            )
                          }
                        />
                        <Label
                          htmlFor={`payment-${method}`}
                          className="text-sm"
                        >
                          {method}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
          <div className="space-y-4">
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
                  <Select
                    value={sortBy}
                    onValueChange={(value) =>
                      setSortBy(value as "name" | "rating")
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Nombre (A-Z)</SelectItem>
                      <SelectItem value="rating">Mejor calificadas</SelectItem>
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
                            {clinic.averageRating !== undefined &&
                              clinic.reviewCount !== undefined &&
                              clinic.reviewCount > 0 && (
                                <div className="flex items-center">
                                  <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm font-medium">
                                    {clinic.averageRating.toFixed(1)}
                                  </span>
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    ({clinic.reviewCount})
                                  </span>
                                </div>
                              )}
                          </div>

                          <div className="mb-2 flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-1 h-4 w-4" />
                            <span>{clinic.direccion}</span>
                          </div>

                          <div className="mb-2 flex items-center text-sm">
                            <Clock className="mr-1 h-4 w-4" />
                            <span
                              className={
                                isOpenNow(clinic)
                                  ? "text-green-600 font-medium"
                                  : "text-muted-foreground"
                              }
                            >
                              {getAvailabilityText(clinic)}
                            </span>
                          </div>

                          {clinic.serviceCategories &&
                            clinic.serviceCategories.length > 0 && (
                              <div className="mb-3 flex flex-wrap gap-1">
                                {clinic.serviceCategories
                                  .slice(0, 3)
                                  .map((category) => (
                                    <Badge
                                      key={category}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {category}
                                    </Badge>
                                  ))}
                                {clinic.serviceCategories.length > 3 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    +{clinic.serviceCategories.length - 3} más
                                  </Badge>
                                )}
                              </div>
                            )}

                          {clinic.specialties &&
                            clinic.specialties.length > 0 && (
                              <div className="mb-3 flex flex-wrap gap-1">
                                {clinic.specialties.map((specialty) => (
                                  <Badge
                                    key={specialty}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {specialty}
                                  </Badge>
                                ))}
                              </div>
                            )}

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
        </div>
      </div>
    </div>
  );
}
