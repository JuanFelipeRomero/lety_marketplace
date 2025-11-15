import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Check, ChevronRight, Clock, PawPrint, AlertCircle, Loader2, CalendarDays, X, CheckCircle2, XCircle, AlertTriangle, CreditCard, Info } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { format, addDays, startOfDay, addMinutes, isAfter, isBefore, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import "react-day-picker/style.css";
import { useAuthStore } from "~/stores/useAuthStore";
import type { Owner } from "~/types/usersTypes";
import { toast } from "sonner";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Checkbox } from "~/components/ui/checkbox";

interface AppointmentSchedulerProps {
  clinicId: string;
}

interface Mascota {
  id: string;
  name: string;
  type: string;
  breed: string;
  image?: string;
}

interface Servicio {
  id: string;
  name: string;
  duration: number;
  price: number;
  description?: string;
  image?: string;
}

interface ClinicConfig {
  nombre: string;
  estado: string;
  tiempo_minimo_anticipacion: number; // minutes
  tiempo_maximo_anticipacion: number; // days
  duracion_slot_cita: number; // minutes
}

interface BusinessHours {
  dia_semana: string;
  hora_apertura: string;
  hora_cierre: string;
  es_24h: boolean;
  esta_cerrado: boolean;
}

interface TimeSlot {
  time: string; // "HH:MM" format (24-hour)
  available: boolean;
  reason?: string;
}

export function AppointmentScheduler({ clinicId }: AppointmentSchedulerProps) {
  const router = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    petId: "",
    serviceId: "",
    date: undefined as Date | undefined,
    timeSlot: "",
    reason: "",
    notes: "",
    reminderPreference: "both",
    acceptedTerms: false,
  });

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const token = useAuthStore((state) => state.token);

  // State for fetched data
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Loading states
  const [loadingPets, setLoadingPets] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Error states
  const [errors, setErrors] = useState<string[]>([]);

  // Fetch pets
  useEffect(() => {
    const fetchMascotas = async () => {
      try {
        const user = useAuthStore.getState().user;
        const userType = useAuthStore.getState().userType;

        if (!token || !user || userType !== "owner") {
          toast.error("Debes iniciar sesión para agendar una cita");
          return;
        }

        const owner = user as Owner;

        const response = await fetch(
          `${API_URL}/pets/get?id_usuario=${owner.id_usuario}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Error al obtener mascotas");
        }

        const data = await response.json();

        const mascotasFormateadas = data.mascotas.map((mascota: any) => ({
          id: mascota.id_mascota || mascota.id,
          name: mascota.nombre || "Sin nombre",
          type: mascota.especie || "Sin tipo",
          breed: mascota.raza || "Sin raza",
          image:
            mascota.foto_url ||
            "/placeholder.svg?height=60&width=60&text=" +
              encodeURIComponent(mascota.nombre || "Mascota"),
        }));

        setMascotas(mascotasFormateadas);
      } catch (error) {
        console.error("Error trayendo mascotas:", error);
        toast.error("No se pudieron cargar tus mascotas");
      } finally {
        setLoadingPets(false);
      }
    };

    fetchMascotas();
  }, [token, API_URL]);

  // Fetch services
  useEffect(() => {
    const fetchServicios = async () => {
      try {
        const response = await fetch(`${API_URL}/clinic/${clinicId}/services`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Error al obtener servicios");
        }

        const data = await response.json();

        // Filter only available services
        const serviciosFormateados = data.servicios
          .filter((s: any) => s.disponible !== false)
          .map((servicio: any) => ({
            id: servicio.id_servicio,
            name: servicio.nombre,
            duration: servicio.duracion_minutos || 30,
            price: servicio.precio || 0,
            description: servicio.descripcion || "",
            image: servicio.imagen || "/placeholder.svg",
          }));

        setServicios(serviciosFormateados);
      } catch (error) {
        console.error("Error trayendo servicios:", error);
        toast.error("No se pudieron cargar los servicios");
      } finally {
        setLoadingServices(false);
      }
    };

    if (clinicId) {
      fetchServicios();
    }
  }, [clinicId, API_URL]);

  // Fetch clinic configuration and business hours
  useEffect(() => {
    const fetchClinicData = async () => {
      try {
        // Fetch clinic profile (includes all info + hours + services)
        const clinicResponse = await fetch(`${API_URL}/veterinary/profile/${clinicId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!clinicResponse.ok) {
          throw new Error("Error al obtener información de la clínica");
        }

        const clinicData = await clinicResponse.json();

        // Check if clinic is confirmed
        if (clinicData.estado !== "confirmado") {
          toast.error("Esta clínica no está disponible para agendar citas");
          setErrors(["La clínica no está activa actualmente"]);
        }

        setClinicConfig({
          nombre: clinicData.nombre,
          estado: clinicData.estado,
          tiempo_minimo_anticipacion: clinicData.tiempo_minimo_anticipacion || 120,
          tiempo_maximo_anticipacion: clinicData.tiempo_maximo_anticipacion || 90,
          duracion_slot_cita: clinicData.duracion_slot_cita || 30,
        });

        // Transform openingHours format to businessHours format
        if (clinicData.openingHours) {
          const transformedHours = Object.entries(clinicData.openingHours).map(([day, hours]: [string, any]) => ({
            dia_semana: day,
            hora_apertura: hours.open + ":00",
            hora_cierre: hours.close + ":00",
            es_24h: hours.is24Hours,
            esta_cerrado: hours.closed,
          }));
          setBusinessHours(transformedHours);
        } else {
          console.warn("No se encontraron horarios para esta clínica");
          setBusinessHours([]);
        }
      } catch (error) {
        console.error("Error trayendo datos de clínica:", error);
        toast.error("No se pudo cargar la información de la clínica");
      } finally {
        setLoadingClinic(false);
      }
    };

    if (clinicId) {
      fetchClinicData();
    }
  }, [clinicId, API_URL]);

  // Generate time slots when date is selected
  useEffect(() => {
    if (!formData.date || !clinicConfig || businessHours.length === 0) {
      setTimeSlots([]);
      return;
    }

    const generateTimeSlots = async () => {
      setLoadingTimeSlots(true);
      try {
        const selectedDate = formData.date;
        const dayOfWeek = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ][selectedDate.getDay()];

        // Find business hours for selected day
        const dayHours = businessHours.find((h) => h.dia_semana === dayOfWeek);

        if (!dayHours || dayHours.esta_cerrado) {
          setTimeSlots([]);
          toast.error("La clínica está cerrada este día");
          return;
        }

        // Fetch existing appointments for this day
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const appointmentsResponse = await fetch(
          `${API_URL}/appointments/clinic/${clinicId}/availability?date=${dateStr}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        let bookedSlots: string[] = [];
        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json();
          // Extract booked time ranges
          bookedSlots = appointmentsData.citas
            ?.map((c: any) => ({
              start: parseISO(c.fecha_inicio),
              end: parseISO(c.fecha_fin),
            })) || [];
        }

        // Generate slots
        const slots: TimeSlot[] = [];
        const slotDuration = clinicConfig.duracion_slot_cita;
        const now = new Date();
        const minAdvanceMs = clinicConfig.tiempo_minimo_anticipacion * 60 * 1000;

        let currentTime: Date;
        let endTime: Date;

        if (dayHours.es_24h) {
          currentTime = new Date(selectedDate);
          currentTime.setHours(0, 0, 0, 0);
          endTime = new Date(selectedDate);
          endTime.setHours(23, 59, 0, 0);
        } else {
          const [openHour, openMin] = dayHours.hora_apertura.split(":").map(Number);
          const [closeHour, closeMin] = dayHours.hora_cierre.split(":").map(Number);

          currentTime = new Date(selectedDate);
          currentTime.setHours(openHour, openMin, 0, 0);

          endTime = new Date(selectedDate);
          endTime.setHours(closeHour, closeMin, 0, 0);
        }

        // Generate slots at correct intervals
        while (isBefore(currentTime, endTime)) {
          const slotTime = format(currentTime, "HH:mm");
          const slotDateTime = new Date(currentTime);

          // Check if slot is in the past or too soon
          const isTooSoon = slotDateTime.getTime() - now.getTime() < minAdvanceMs;

          // Check if slot conflicts with existing appointments
          const selectedService = servicios.find((s) => s.id === formData.serviceId);
          const serviceDuration = selectedService?.duration || 30;
          const slotEnd = addMinutes(slotDateTime, serviceDuration);

          const hasConflict = bookedSlots.some((booked: any) => {
            // Check for overlap: (Start_A < End_B) AND (End_A > Start_B)
            return slotDateTime < booked.end && slotEnd > booked.start;
          });

          let available = true;
          let reason = "";

          if (isTooSoon) {
            available = false;
            reason = `Debe agendar con al menos ${Math.floor(clinicConfig.tiempo_minimo_anticipacion / 60)} horas de anticipación`;
          } else if (hasConflict) {
            available = false;
            reason = "Horario no disponible";
          }

          slots.push({
            time: slotTime,
            available,
            reason,
          });

          currentTime = addMinutes(currentTime, slotDuration);
        }

        setTimeSlots(slots);
      } catch (error) {
        console.error("Error generando horarios:", error);
        toast.error("No se pudieron cargar los horarios disponibles");
      } finally {
        setLoadingTimeSlots(false);
      }
    };

    generateTimeSlots();
  }, [formData.date, formData.serviceId, clinicConfig, businessHours, clinicId, servicios, token, API_URL]);

  const handleNext = async () => {
    setErrors([]);

    if (step < 4) {
      setStep(step + 1);
      window.scrollTo(0, 0);
    } else {
      // Submit appointment
      setSubmitting(true);

      try {
        if (!token) {
          toast.error("No estás autenticado");
          return;
        }

        if (!formData.acceptedTerms) {
          toast.error("Debes aceptar los términos y condiciones");
          return;
        }

        // Format date as YYYY-MM-DD
        const dateStr = formData.date ? format(formData.date, "yyyy-MM-dd") : "";

        const response = await fetch(`${API_URL}/appointments/schedule`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            petId: parseInt(formData.petId),
            serviceId: parseInt(formData.serviceId),
            clinicId: parseInt(clinicId),
            date: dateStr,
            timeSlot: formData.timeSlot,
            reason: formData.reason,
            notes: formData.notes,
            acceptedTerms: formData.acceptedTerms,
            reminderPreference: formData.reminderPreference,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle specific error responses
          if (response.status === 409) {
            // Conflict - time slot already booked
            toast.error("Este horario ya no está disponible. Por favor, selecciona otro.");
            setStep(3); // Go back to date/time selection
          } else if (response.status === 400 && data.errors) {
            // Validation errors array
            setErrors(data.errors);
            toast.error("Hay errores en la información de la cita");
          } else {
            // Generic error
            toast.error(data.message || "Error al crear la cita");
            setErrors(data.errors || [data.message]);
          }
          return;
        }

        // Success
        toast.success("¡Cita agendada exitosamente!");
        router("/dashboard-client/appointments?success=true");
      } catch (error) {
        console.error("Error agendando cita:", error);
        toast.error("Hubo un problema al programar tu cita. Inténtalo más tarde.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo(0, 0);
      setErrors([]);
    }
  };

  // Helper function: Calculate end time based on slot start time and service duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, durationMinutes);
    return format(endDate, "HH:mm");
  };

  // Helper function: Get status icon based on slot availability
  const getStatusIcon = (slot: TimeSlot) => {
    if (!slot.available) {
      if (slot.reason?.includes("anticipación")) {
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      }
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  };

  // Calculate availability statistics
  const availableSlots = timeSlots.filter((slot) => slot.available).length;
  const totalSlots = timeSlots.length;

  const isStepComplete = () => {
    switch (step) {
      case 1:
        return !!formData.petId;
      case 2:
        return !!formData.serviceId;
      case 3:
        return !!formData.date && !!formData.timeSlot;
      case 4:
        return formData.acceptedTerms;
      default:
        return false;
    }
  };

  // Disable dates outside booking window
  const isDateDisabled = (date: Date) => {
    if (!clinicConfig) return true;

    const today = startOfDay(new Date());
    const selectedDate = startOfDay(date);

    // Can't book in the past
    if (isBefore(selectedDate, today)) return true;

    // Can't book beyond max advance window
    const maxDate = addDays(today, clinicConfig.tiempo_maximo_anticipacion);
    if (isAfter(selectedDate, maxDate)) return true;

    // Check if clinic is open on this day
    const dayOfWeek = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][date.getDay()];

    const dayHours = businessHours.find((h) => h.dia_semana === dayOfWeek);
    if (!dayHours || dayHours.esta_cerrado) return true;

    return false;
  };

  const selectedPet = mascotas.find((pet) => pet.id === formData.petId);
  const selectedService = servicios.find(
    (service) => service.id === formData.serviceId
  );

  // Show loading screen while critical data loads
  if (loadingClinic || loadingPets || loadingServices) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando información...</p>
        </div>
      </div>
    );
  }

  // Show error if clinic is not available
  if (clinicConfig?.estado !== "confirmado") {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta clínica no está disponible para agendar citas en este momento.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Error alerts */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center mb-2",
                  step === i
                    ? "bg-primary text-primary-foreground"
                    : step > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > i ? <Check className="h-5 w-5" /> : <span>{i}</span>}
              </div>
              <span
                className={cn(
                  "text-xs hidden md:block",
                  step === i
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                )}
              >
                {i === 1
                  ? "Mascota"
                  : i === 2
                  ? "Servicio"
                  : i === 3
                  ? "Fecha y Hora"
                  : "Confirmación"}
              </span>
            </div>
          ))}
        </div>
        <div className="relative mt-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-1 bg-muted" />
          </div>
          <div
            className="absolute inset-0 flex items-center transition-all duration-300"
            style={{ width: `${((step - 1) * 100) / 3}%` }}
          >
            <div className="h-1 bg-primary w-full" />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="mb-8">
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Selecciona tu mascota
            </h2>
            <div className="grid gap-4">
              {mascotas.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <PawPrint className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-medium mb-2">No tienes mascotas registradas</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Primero debes registrar una mascota para poder agendar una cita
                    </p>
                    <Button asChild>
                      <a href="/dashboard-client/pets">
                        <PawPrint className="mr-2 h-4 w-4" />
                        Agregar mascota
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {mascotas.map((pet) => (
                    <Card
                      key={pet.id}
                      className={cn(
                        "cursor-pointer transition-all",
                        formData.petId === pet.id
                          ? "border-primary ring-2 ring-primary ring-opacity-50"
                          : "hover:border-primary/50"
                      )}
                      onClick={() => setFormData({ ...formData, petId: pet.id })}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                            <PawPrint className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{pet.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {pet.type} • {pet.breed}
                            </p>
                          </div>
                          <div className="flex items-center justify-center w-6 h-6 rounded-full border">
                            {formData.petId === pet.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button variant="outline" className="mt-2" asChild>
                    <a href="/dashboard-client/pets">
                      <PawPrint className="mr-2 h-4 w-4" />
                      Agregar nueva mascota
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Selecciona el servicio
            </h2>
            <div className="grid gap-4">
              {servicios.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-medium mb-2">No hay servicios disponibles</h3>
                    <p className="text-sm text-muted-foreground">
                      Esta clínica no tiene servicios disponibles en este momento
                    </p>
                  </CardContent>
                </Card>
              ) : (
                servicios.map((service) => (
                  <Card
                    key={service.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      formData.serviceId === service.id
                        ? "border-primary ring-2 ring-primary ring-opacity-50"
                        : "hover:border-primary/50"
                    )}
                    onClick={() =>
                      setFormData({ ...formData, serviceId: service.id })
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{service.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Duración: {service.duration} minutos
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-lg">
                            ${service.price.toLocaleString()}
                          </span>
                          <div className="flex items-center justify-center w-6 h-6 rounded-full border">
                            {formData.serviceId === service.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Selecciona fecha y hora
            </h2>

            {clinicConfig && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Puedes agendar con {Math.floor(clinicConfig.tiempo_minimo_anticipacion / 60)} horas de
                  anticipación mínima y hasta {clinicConfig.tiempo_maximo_anticipacion} días de
                  anticipación máxima.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              {/* Calendario mejorado */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-semibold">Selecciona tu fecha</CardTitle>
                  </div>
                  {clinicConfig && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Disponible hasta {clinicConfig.tiempo_maximo_anticipacion} días adelante
                    </p>
                  )}
                </CardHeader>
                <CardContent className="p-3">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => {
                      setFormData({ ...formData, date, timeSlot: "" });
                    }}
                    disabled={isDateDisabled}
                    className="rounded-md border-0"
                  />
                </CardContent>
              </Card>

              {/* Horarios - Timeline Visual */}
              {formData.date && (
                <Card className="shadow-lg border-2">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Horarios Disponibles</CardTitle>
                      </div>
                      {/* Contador de disponibilidad */}
                      {totalSlots > 0 && (
                        <Badge
                          variant={availableSlots > 0 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {availableSlots} de {totalSlots} disponibles
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingTimeSlots ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-3 text-sm text-muted-foreground">
                          Cargando horarios disponibles...
                        </span>
                      </div>
                    ) : timeSlots.length === 0 ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No hay horarios disponibles para esta fecha. Por favor, selecciona otra fecha.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <ScrollArea className="w-full">
                        <div className="flex gap-3 px-1 pb-4">
                          {timeSlots.map((slot) => {
                            const isSelected = formData.timeSlot === slot.time;
                            const serviceDuration = selectedService?.duration || 30;
                            const endTime = calculateEndTime(slot.time, serviceDuration);
                            const statusIcon = getStatusIcon(slot);

                            return (
                              <button
                                key={slot.time}
                                onClick={() =>
                                  slot.available && setFormData({ ...formData, timeSlot: slot.time })
                                }
                                disabled={!slot.available}
                                className={cn(
                                  "relative flex flex-col items-center justify-center shrink-0",
                                  "min-w-[110px] p-4 rounded-xl border-2 transition-all duration-200",
                                  "hover:shadow-md active:scale-95",
                                  // Estado seleccionado
                                  isSelected && "border-primary bg-primary shadow-lg scale-105",
                                  // Estado disponible
                                  !isSelected && slot.available && "border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5",
                                  // Estado no disponible
                                  !slot.available && "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60",
                                  // Focus
                                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                )}
                                title={slot.reason || ""}
                              >
                                {/* Icono de estado en la esquina */}
                                <div className="absolute top-2 right-2">
                                  {statusIcon}
                                </div>

                                {/* Hora de inicio */}
                                <div className={cn(
                                  "text-xl font-bold mb-1",
                                  isSelected && "text-white",
                                  !isSelected && slot.available && "text-gray-900",
                                  !slot.available && "text-gray-400"
                                )}>
                                  {slot.time}
                                </div>

                                {/* Separador */}
                                <div className={cn(
                                  "w-8 h-px mb-1",
                                  isSelected && "bg-white/50",
                                  !isSelected && slot.available && "bg-gray-300",
                                  !slot.available && "bg-gray-300"
                                )} />

                                {/* Hora de fin */}
                                <div className={cn(
                                  "text-xs font-medium mb-1",
                                  isSelected && "text-white/90",
                                  !isSelected && slot.available && "text-gray-600",
                                  !slot.available && "text-gray-400"
                                )}>
                                  hasta {endTime}
                                </div>

                                {/* Duración */}
                                <div className={cn(
                                  "text-[10px] font-medium px-2 py-0.5 rounded-full mt-1",
                                  isSelected && "bg-white/20 text-white",
                                  !isSelected && slot.available && "bg-gray-100 text-gray-600",
                                  !slot.available && "bg-gray-200 text-gray-400"
                                )}>
                                  {serviceDuration} min
                                </div>

                                {/* Badge de estado para slots no disponibles */}
                                {!slot.available && slot.reason && (
                                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                      {slot.reason.includes("anticipación") ? "Muy pronto" : "Ocupado"}
                                    </Badge>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    )}

                    {/* Leyenda de estados */}
                    {timeSlots.length > 0 && !loadingTimeSlots && (
                      <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t">
                        <div className="flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-gray-600">Disponible</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                          <span className="text-gray-600">Ocupado</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                          <span className="text-gray-600">Muy pronto</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {formData.date && formData.timeSlot && (
                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Motivo de la consulta
                  </h3>
                  <Textarea
                    placeholder="Describe brevemente el motivo de tu visita..."
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    className="resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Confirma tu cita</h2>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Resumen de la cita</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPet && (
                  <div className="flex items-center gap-4">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      <PawPrint className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">{selectedPet.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedPet.type} • {selectedPet.breed}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid gap-2 pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Servicio:</span>
                    <span className="font-medium">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span className="font-medium">
                      {formData.date &&
                        format(formData.date, "PPP", { locale: es })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hora:</span>
                    <span className="font-medium">{formData.timeSlot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duración:</span>
                    <span className="font-medium">
                      {selectedService?.duration} minutos
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precio:</span>
                    <span className="font-medium">
                      ${selectedService?.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                {formData.reason && (
                  <div className="pt-2 border-t">
                    <h4 className="text-sm font-medium mb-1">
                      Motivo de la consulta:
                    </h4>
                    <p className="text-sm">{formData.reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Notas adicionales (opcional)
                </h3>
                <Textarea
                  placeholder="¿Algo más que debamos saber?"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="resize-none"
                  rows={3}
                />
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">
                  Preferencia de recordatorio
                </h3>
                <RadioGroup
                  value={formData.reminderPreference}
                  onValueChange={(value) =>
                    setFormData({ ...formData, reminderPreference: value })
                  }
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both">Email y SMS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="email" />
                    <Label htmlFor="email">Solo email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sms" id="sms" />
                    <Label htmlFor="sms">Solo SMS</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Payment Disclaimer */}
              <Alert className="border-primary/50 bg-primary/5">
                <CreditCard className="h-4 w-4" />
                <AlertDescription>
                  <strong>Pago tras confirmación:</strong> Una vez que la veterinaria confirme tu cita,
                  recibirás un link de pago seguro por Mercado Pago. Tu cita quedará reservada
                  definitivamente después de completar el pago.
                </AlertDescription>
              </Alert>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Política de reembolso:</strong> Reembolso completo al cancelar con 24 horas
                  o más de anticipación. Cancelaciones tardías pueden estar sujetas a cargos.
                </AlertDescription>
              </Alert>

              <div className="flex items-start space-x-2 pt-4">
                <Checkbox
                  id="terms"
                  checked={formData.acceptedTerms}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, acceptedTerms: checked as boolean })
                  }
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Acepto los términos y condiciones de la clínica veterinaria, autorizo
                  el tratamiento de mis datos personales y comprendo que debo completar el pago
                  para confirmar definitivamente mi cita.
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1 || submitting}
        >
          Atrás
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isStepComplete() || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : step < 4 ? (
            <>
              Continuar
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            "Confirmar Cita"
          )}
        </Button>
      </div>
    </div>
  );
}
