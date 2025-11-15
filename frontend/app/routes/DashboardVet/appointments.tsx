import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  CalendarClock,
  RefreshCw,
  ClipboardCheck,
  Plus,
  Trash,
  Calendar,
  Clock,
  Search,
  CalendarDays,
} from "lucide-react";
import { useAuthStore } from "~/stores/useAuthStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "react-hot-toast";
import { VetAppointmentCard } from "~/components/vet-appointment-card";
import { VetAppointmentFilters } from "~/components/vet-appointment-filters";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface Appointment {
  id: number;
  petName: string;
  petImage: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  date: string;
  time: string;
  reason: string;
  status: string;
  notes: string;
}

type StatusAction = "confirmada" | "rechazada" | "reprogramacion_sugerida";

// Tipos para formulario de finalización
interface Medicamento {
  id: string;
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
}

interface ServicioAdicional {
  id: string;
  nombre: string;
  costo: number;
}

interface ProductoVendido {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
}

interface FinalizacionForm {
  diagnostico: string;
  tratamiento: string;
  medicamentos: Medicamento[];
  recomendaciones: string;
  instrucciones_seguimiento: string;
  notas_internas: string;
  servicios_adicionales: ServicioAdicional[];
  productos_vendidos: ProductoVendido[];
}

export default function VetAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingAppointment, setUpdatingAppointment] =
    useState<boolean>(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false);
  const [reprogramarDialogOpen, setReprogramarDialogOpen] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoHorario, setNuevoHorario] = useState("");
  const [finalizacionForm, setFinalizacionForm] = useState<FinalizacionForm>({
    diagnostico: "",
    tratamiento: "",
    medicamentos: [],
    recomendaciones: "",
    instrucciones_seguimiento: "",
    notas_internas: "",
    servicios_adicionales: [],
    productos_vendidos: [],
  });

  // Estados para filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedPets, setSelectedPets] = useState<number[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<number[]>([]);

  const token = useAuthStore((state) => state.token);

  // Cargar citas
  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!token) throw new Error("No autenticado");

        const res = await fetch(`${API_URL}/appointments/clinic`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!res.ok) throw new Error("Error al obtener citas");

        const data = await res.json();
        setAppointments(data.citas || []);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [token]);

  // Función para actualizar estado de cita
  const updateAppointmentStatus = async (
    appointmentId: number,
    status: StatusAction,
    message?: string
  ) => {
    if (!token) return;

    setUpdatingAppointment(true);
    try {
      const res = await fetch(
        `${API_URL}/appointments/${appointmentId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status, message }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al actualizar cita");
      }

      // Actualizar la lista de citas para reflejar el cambio
      setAppointments((prev) =>
        prev.map((app) => (app.id === appointmentId ? { ...app, status } : app))
      );

      const successMessage =
        status === "confirmada"
          ? "Cita confirmada exitosamente"
          : status === "rechazada"
          ? "Cita rechazada"
          : "Se ha sugerido reprogramación";

      toast.success(successMessage);
    } catch (err: any) {
      console.error("Error al actualizar cita:", err);
      let errorMessage = "Error al actualizar el estado de la cita";

      try {
        // Para errores de fetch, intentamos extraer los datos del error
        if (err.message && err.message.includes("Error al actualizar cita")) {
          errorMessage = err.message;
        } else {
          // Ver si podemos mostrar detalles adicionales del error que viene del backend
          const errorJson = err.error || err.details;
          if (errorJson) {
            errorMessage = `${errorMessage}: ${
              typeof errorJson === "string"
                ? errorJson
                : JSON.stringify(errorJson)
            }`;
          }
        }
      } catch (parseError) {
        console.error("Error parseando detalles del error:", parseError);
      }

      toast.error(errorMessage);
    } finally {
      setUpdatingAppointment(false);
      setDialogOpen(false);
      setMessage("");
      setSelectedAppointment(null);
      setStatusAction(null);
    }
  };

  // Manejador para iniciar acción (abre diálogo según la acción)
  const handleActionStart = (
    appointment: Appointment,
    action: StatusAction
  ) => {
    setSelectedAppointment(appointment);
    setStatusAction(action);

    // Confirmar directamente sin diálogo
    if (action === "confirmada") {
      updateAppointmentStatus(appointment.id, action);
      return;
    }

    // Para rechazar o reprogramar, abrir diálogo para agregar mensaje
    setDialogOpen(true);
  };

  // Manejador para confirmar acción en el diálogo
  const handleActionConfirm = () => {
    if (!selectedAppointment || !statusAction) return;
    updateAppointmentStatus(selectedAppointment.id, statusAction, message);
  };

  // Funciones para la finalización de citas
  const handleFinalizarStart = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setFinalizarDialogOpen(true);
    // Reiniciar el formulario
    setFinalizacionForm({
      diagnostico: "",
      tratamiento: "",
      medicamentos: [],
      recomendaciones: "",
      instrucciones_seguimiento: "",
      notas_internas: "",
      servicios_adicionales: [],
      productos_vendidos: [],
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFinalizacionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addMedicamento = () => {
    setFinalizacionForm((prev) => ({
      ...prev,
      medicamentos: [
        ...prev.medicamentos,
        {
          id: crypto.randomUUID(),
          nombre: "",
          dosis: "",
          frecuencia: "",
          duracion: "",
        },
      ],
    }));
  };

  const updateMedicamento = (
    id: string,
    field: keyof Medicamento,
    value: string
  ) => {
    setFinalizacionForm((prev) => ({
      ...prev,
      medicamentos: prev.medicamentos.map((med) =>
        med.id === id ? { ...med, [field]: value } : med
      ),
    }));
  };

  const removeMedicamento = (id: string) => {
    setFinalizacionForm((prev) => ({
      ...prev,
      medicamentos: prev.medicamentos.filter((med) => med.id !== id),
    }));
  };

  const addServicioAdicional = () => {
    setFinalizacionForm((prev) => ({
      ...prev,
      servicios_adicionales: [
        ...prev.servicios_adicionales,
        {
          id: crypto.randomUUID(),
          nombre: "",
          costo: 0,
        },
      ],
    }));
  };

  const updateServicioAdicional = (
    id: string,
    field: keyof ServicioAdicional,
    value: string | number
  ) => {
    setFinalizacionForm((prev) => ({
      ...prev,
      servicios_adicionales: prev.servicios_adicionales.map((serv) =>
        serv.id === id ? { ...serv, [field]: value } : serv
      ),
    }));
  };

  const removeServicioAdicional = (id: string) => {
    setFinalizacionForm((prev) => ({
      ...prev,
      servicios_adicionales: prev.servicios_adicionales.filter(
        (serv) => serv.id !== id
      ),
    }));
  };

  const addProductoVendido = () => {
    setFinalizacionForm((prev) => ({
      ...prev,
      productos_vendidos: [
        ...prev.productos_vendidos,
        {
          id: crypto.randomUUID(),
          nombre: "",
          cantidad: 1,
          precio: 0,
        },
      ],
    }));
  };

  const updateProductoVendido = (
    id: string,
    field: keyof ProductoVendido,
    value: string | number
  ) => {
    setFinalizacionForm((prev) => ({
      ...prev,
      productos_vendidos: prev.productos_vendidos.map((prod) =>
        prod.id === id ? { ...prod, [field]: value } : prod
      ),
    }));
  };

  const removeProductoVendido = (id: string) => {
    setFinalizacionForm((prev) => ({
      ...prev,
      productos_vendidos: prev.productos_vendidos.filter(
        (prod) => prod.id !== id
      ),
    }));
  };

  const finalizarCita = async () => {
    if (!selectedAppointment || !token) return;

    setUpdatingAppointment(true);
    try {
      const res = await fetch(
        `${API_URL}/appointments/${selectedAppointment.id}/finalize`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(finalizacionForm),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al finalizar la cita");
      }

      // Actualizar la lista de citas para reflejar el cambio
      setAppointments((prev) =>
        prev.map((app) =>
          app.id === selectedAppointment.id
            ? { ...app, status: "finalizada" }
            : app
        )
      );

      toast.success("Cita finalizada exitosamente");
    } catch (err: any) {
      console.error("Error al finalizar cita:", err);
      let errorMessage = "Error al finalizar la cita";

      try {
        if (err.message) {
          errorMessage = err.message;
        }
      } catch (parseError) {
        console.error("Error parseando detalles del error:", parseError);
      }

      toast.error(errorMessage);
    } finally {
      setUpdatingAppointment(false);
      setFinalizarDialogOpen(false);
      setSelectedAppointment(null);
    }
  };

  // Funciones adicionales para reprogramar citas
  const handleReprogramarStart = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setReprogramarDialogOpen(true);
    setNuevaFecha("");
    setNuevoHorario("");
    setMessage("");
  };

  const reprogramarCita = async () => {
    if (!selectedAppointment || !token || !nuevaFecha || !nuevoHorario) return;

    setUpdatingAppointment(true);
    try {
      const res = await fetch(
        `${API_URL}/appointments/${selectedAppointment.id}/reschedule`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            date: nuevaFecha,
            timeSlot: nuevoHorario,
            message: message || "Cita reprogramada por la clínica",
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al reprogramar la cita");
      }

      // Actualizar la lista de citas
      const fechaFormateada = new Date(nuevaFecha).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      setAppointments((prev) =>
        prev.map((app) =>
          app.id === selectedAppointment.id
            ? {
                ...app,
                date: fechaFormateada,
                time: nuevoHorario,
                status: "reprogramacion_sugerida",
              }
            : app
        )
      );

      toast.success("Cita reprogramada exitosamente");
    } catch (err: any) {
      console.error("Error al reprogramar cita:", err);
      let errorMessage = "Error al reprogramar la cita";

      try {
        if (err.message) {
          errorMessage = err.message;
        }
      } catch (parseError) {
        console.error("Error parseando detalles del error:", parseError);
      }

      toast.error(errorMessage);
    } finally {
      setUpdatingAppointment(false);
      setReprogramarDialogOpen(false);
      setSelectedAppointment(null);
      setNuevaFecha("");
      setNuevoHorario("");
      setMessage("");
    }
  };

  // Preparar datos para filtros
  const filterOptions = useMemo(() => {
    const pets = Array.from(
      new Map(
        appointments.map((app) => [app.petName, { id: app.id, name: app.petName }])
      ).values()
    );

    const owners = Array.from(
      new Map(
        appointments.map((app) => [
          app.ownerName,
          { id: app.id, name: app.ownerName },
        ])
      ).values()
    );

    return { pets, owners };
  }, [appointments]);

  // Lógica de filtrado y búsqueda
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.petName.toLowerCase().includes(query) ||
          app.ownerName.toLowerCase().includes(query) ||
          app.reason.toLowerCase().includes(query) ||
          app.ownerEmail.toLowerCase().includes(query) ||
          app.ownerPhone.toLowerCase().includes(query)
      );
    }

    // Filtrar por mascotas seleccionadas
    if (selectedPets.length > 0) {
      filtered = filtered.filter((app) => selectedPets.includes(app.id));
    }

    // Filtrar por dueños seleccionados
    if (selectedOwners.length > 0) {
      filtered = filtered.filter((app) => selectedOwners.includes(app.id));
    }

    // Filtrar por estados seleccionados
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((app) =>
        selectedStatuses.includes(app.status)
      );
    }

    // Filtrar por tab (estado general)
    switch (selectedTab) {
      case "pending":
        filtered = filtered.filter((app) => app.status.toLowerCase() === "pendiente");
        break;
      case "confirmed":
        filtered = filtered.filter((app) => app.status.toLowerCase() === "confirmada");
        break;
      case "completed":
        filtered = filtered.filter(
          (app) => app.status.toLowerCase() === "finalizada" || app.status.toLowerCase() === "completada"
        );
        break;
      case "cancelled":
        filtered = filtered.filter(
          (app) => app.status.toLowerCase() === "cancelada" || app.status.toLowerCase() === "rechazada"
        );
        break;
    }

    return filtered;
  }, [appointments, searchQuery, selectedPets, selectedOwners, selectedStatuses, selectedTab]);

  // Contador de citas por estado
  const appointmentCounts = useMemo(() => {
    return {
      all: appointments.length,
      pending: appointments.filter((app) => app.status.toLowerCase() === "pendiente").length,
      confirmed: appointments.filter((app) => app.status.toLowerCase() === "confirmada").length,
      completed: appointments.filter(
        (app) => app.status.toLowerCase() === "finalizada" || app.status.toLowerCase() === "completada"
      ).length,
      cancelled: appointments.filter(
        (app) => app.status.toLowerCase() === "cancelada" || app.status.toLowerCase() === "rechazada"
      ).length,
    };
  }, [appointments]);

  const handleResetFilters = () => {
    setSelectedPets([]);
    setSelectedStatuses([]);
    setSelectedOwners([]);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-[#007A55]" />
              Citas Veterinarias
            </h1>
            <p className="text-gray-600 mt-1">
              Gestiona las citas programadas con tus clientes
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por mascota, dueño, motivo, email o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base border-slate-300 focus:border-[#007A55] focus:ring-[#007A55]"
            />
          </div>
        </div>

        {/* Filters */}
        <VetAppointmentFilters
          pets={filterOptions.pets}
          owners={filterOptions.owners}
          selectedPets={selectedPets}
          selectedStatuses={selectedStatuses}
          selectedOwners={selectedOwners}
          onPetsChange={setSelectedPets}
          onStatusChange={setSelectedStatuses}
          onOwnersChange={setSelectedOwners}
          onReset={handleResetFilters}
        />
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6 h-12">
          <TabsTrigger value="all" className="text-sm font-medium">
            Todas
            {appointmentCounts.all > 0 && (
              <Badge variant="secondary" className="ml-2 bg-slate-200">
                {appointmentCounts.all}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-sm font-medium">
            Pendientes
            {appointmentCounts.pending > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
                {appointmentCounts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-sm font-medium">
            Confirmadas
            {appointmentCounts.confirmed > 0 && (
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                {appointmentCounts.confirmed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-sm font-medium">
            Completadas
            {appointmentCounts.completed > 0 && (
              <Badge variant="secondary" className="ml-2 bg-slate-200">
                {appointmentCounts.completed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-sm font-medium">
            Canceladas
            {appointmentCounts.cancelled > 0 && (
              <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700">
                {appointmentCounts.cancelled}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        {["all", "pending", "confirmed", "completed", "cancelled"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0">
            {loading ? (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <RefreshCw className="h-12 w-12 animate-spin mb-4 text-[#007A55]" />
                    <p>Cargando citas...</p>
                  </div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-red-500">
                    <XCircle className="h-12 w-12 mb-4" />
                    <p className="font-semibold">Error al cargar las citas</p>
                    <p className="text-sm text-gray-600 mt-2">{error}</p>
                  </div>
                </CardContent>
              </Card>
            ) : filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <CalendarDays className="h-16 w-16 mb-4 text-gray-300" />
                    <p className="text-lg font-semibold">No hay citas para mostrar</p>
                    <p className="text-sm text-gray-600 mt-2">
                      {searchQuery || selectedPets.length > 0 || selectedStatuses.length > 0 || selectedOwners.length > 0
                        ? "Intenta ajustar los filtros de búsqueda"
                        : "Las nuevas citas aparecerán aquí"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => {
                  // Transformar datos al formato del nuevo componente
                  const transformedAppointment = {
                    id_cita: appointment.id,
                    id_mascota: 0, // No disponible en el formato actual
                    nombre_mascota: appointment.petName,
                    foto_mascota: appointment.petImage,
                    id_usuario: 0, // No disponible en el formato actual
                    nombre_usuario: appointment.ownerName,
                    correo_usuario: appointment.ownerEmail,
                    telefono_usuario: appointment.ownerPhone,
                    fecha_inicio: appointment.date,
                    fecha_fin: appointment.date,
                    estado: appointment.status,
                    motivo: appointment.reason,
                    notas_adicionales: appointment.notes,
                  };

                  return (
                    <VetAppointmentCard
                      key={appointment.id}
                      appointment={transformedAppointment}
                      onConfirm={() => handleActionStart(appointment, "confirmada")}
                      onReject={() => handleActionStart(appointment, "rechazada")}
                      onReschedule={() => handleReprogramarStart(appointment)}
                      onFinalize={() => handleFinalizarStart(appointment)}
                      onViewDetails={() => console.log("Ver detalles", appointment.id)}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Diálogo para confirmar/rechazar citas */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAppointment(null);
            setStatusAction(null);
            setMessage("");
          }
          setDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusAction === "rechazada"
                ? "Rechazar cita"
                : "Sugerir reprogramación"}
            </DialogTitle>
            <DialogDescription>
              {statusAction === "rechazada"
                ? "Ingrese el motivo de rechazo"
                : "Ingrese un mensaje para el cliente"}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            id="message"
            placeholder="Mensaje..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />

          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setSelectedAppointment(null);
                setStatusAction(null);
                setMessage("");
              }}
              disabled={updatingAppointment}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleActionConfirm}
              disabled={updatingAppointment || !message.trim()}
            >
              {statusAction === "rechazada"
                ? "Rechazar"
                : "Sugerir reprogramación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para finalizar cita */}
      <Dialog open={finalizarDialogOpen} onOpenChange={setFinalizarDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar cita</DialogTitle>
            <DialogDescription>
              Complete la información de atención médica para finalizar la cita.
              Esta información será visible para el propietario de la mascota.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Diagnóstico */}
            <div className="space-y-2">
              <label htmlFor="diagnostico" className="font-medium text-sm">
                Diagnóstico
              </label>
              <Textarea
                id="diagnostico"
                name="diagnostico"
                placeholder="Diagnóstico de la mascota"
                value={finalizacionForm.diagnostico}
                onChange={handleInputChange}
                rows={3}
              />
            </div>

            {/* Tratamiento */}
            <div className="space-y-2">
              <label htmlFor="tratamiento" className="font-medium text-sm">
                Tratamiento
              </label>
              <Textarea
                id="tratamiento"
                name="tratamiento"
                placeholder="Tratamiento indicado"
                value={finalizacionForm.tratamiento}
                onChange={handleInputChange}
                rows={3}
              />
            </div>

            {/* Medicamentos */}
            <div className="col-span-1 md:col-span-2 space-y-3">
              <div className="flex justify-between items-center">
                <label className="font-medium text-sm">Medicamentos</label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addMedicamento}
                >
                  <Plus className="h-4 w-4 mr-1" /> Añadir medicamento
                </Button>
              </div>

              {finalizacionForm.medicamentos.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay medicamentos añadidos.
                </p>
              )}

              {finalizacionForm.medicamentos.map((med) => (
                <div
                  key={med.id}
                  className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded-md"
                >
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium">Nombre</label>
                    <input
                      type="text"
                      className="w-full border rounded-md px-2 py-1 text-sm"
                      value={med.nombre}
                      onChange={(e) =>
                        updateMedicamento(med.id, "nombre", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Dosis</label>
                    <input
                      type="text"
                      className="w-full border rounded-md px-2 py-1 text-sm"
                      value={med.dosis}
                      onChange={(e) =>
                        updateMedicamento(med.id, "dosis", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Frecuencia</label>
                    <input
                      type="text"
                      className="w-full border rounded-md px-2 py-1 text-sm"
                      value={med.frecuencia}
                      onChange={(e) =>
                        updateMedicamento(med.id, "frecuencia", e.target.value)
                      }
                    />
                  </div>
                  <div className="flex items-end space-x-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium">Duración</label>
                      <input
                        type="text"
                        className="w-full border rounded-md px-2 py-1 text-sm"
                        value={med.duracion}
                        onChange={(e) =>
                          updateMedicamento(med.id, "duracion", e.target.value)
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500"
                      onClick={() => removeMedicamento(med.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Recomendaciones */}
            <div className="space-y-2">
              <label htmlFor="recomendaciones" className="font-medium text-sm">
                Recomendaciones
              </label>
              <Textarea
                id="recomendaciones"
                name="recomendaciones"
                placeholder="Recomendaciones generales"
                value={finalizacionForm.recomendaciones}
                onChange={handleInputChange}
                rows={3}
              />
            </div>

            {/* Instrucciones de seguimiento */}
            <div className="space-y-2">
              <label
                htmlFor="instrucciones_seguimiento"
                className="font-medium text-sm"
              >
                Instrucciones de seguimiento
              </label>
              <Textarea
                id="instrucciones_seguimiento"
                name="instrucciones_seguimiento"
                placeholder="Instrucciones para el seguimiento"
                value={finalizacionForm.instrucciones_seguimiento}
                onChange={handleInputChange}
                rows={3}
              />
            </div>

            {/* Notas internas (solo para la clínica) */}
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label htmlFor="notas_internas" className="font-medium text-sm">
                Notas internas (solo visibles para la clínica)
              </label>
              <Textarea
                id="notas_internas"
                name="notas_internas"
                placeholder="Notas internas para la clínica"
                value={finalizacionForm.notas_internas}
                onChange={handleInputChange}
                rows={2}
              />
            </div>

            {/* Servicios adicionales */}
            <div className="col-span-1 md:col-span-2 space-y-3">
              <div className="flex justify-between items-center">
                <label className="font-medium text-sm">
                  Servicios adicionales realizados
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addServicioAdicional}
                >
                  <Plus className="h-4 w-4 mr-1" /> Añadir servicio
                </Button>
              </div>

              {finalizacionForm.servicios_adicionales.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay servicios adicionales añadidos.
                </p>
              )}

              {finalizacionForm.servicios_adicionales.map((serv) => (
                <div
                  key={serv.id}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-md"
                >
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium">
                      Nombre del servicio
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded-md px-2 py-1 text-sm"
                      value={serv.nombre}
                      onChange={(e) =>
                        updateServicioAdicional(
                          serv.id,
                          "nombre",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="flex items-end space-x-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium">Costo ($)</label>
                      <input
                        type="number"
                        className="w-full border rounded-md px-2 py-1 text-sm"
                        value={serv.costo}
                        onChange={(e) =>
                          updateServicioAdicional(
                            serv.id,
                            "costo",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500"
                      onClick={() => removeServicioAdicional(serv.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Productos vendidos */}
            <div className="col-span-1 md:col-span-2 space-y-3">
              <div className="flex justify-between items-center">
                <label className="font-medium text-sm">
                  Productos vendidos
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addProductoVendido}
                >
                  <Plus className="h-4 w-4 mr-1" /> Añadir producto
                </Button>
              </div>

              {finalizacionForm.productos_vendidos.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay productos vendidos añadidos.
                </p>
              )}

              {finalizacionForm.productos_vendidos.map((prod) => (
                <div
                  key={prod.id}
                  className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border rounded-md"
                >
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium">
                      Nombre del producto
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded-md px-2 py-1 text-sm"
                      value={prod.nombre}
                      onChange={(e) =>
                        updateProductoVendido(prod.id, "nombre", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border rounded-md px-2 py-1 text-sm"
                      value={prod.cantidad}
                      onChange={(e) =>
                        updateProductoVendido(
                          prod.id,
                          "cantidad",
                          parseInt(e.target.value) || 1
                        )
                      }
                    />
                  </div>
                  <div className="flex items-end space-x-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium">Precio ($)</label>
                      <input
                        type="number"
                        className="w-full border rounded-md px-2 py-1 text-sm"
                        value={prod.precio}
                        onChange={(e) =>
                          updateProductoVendido(
                            prod.id,
                            "precio",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500"
                      onClick={() => removeProductoVendido(prod.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => setFinalizarDialogOpen(false)}
              disabled={updatingAppointment}
            >
              Cancelar
            </Button>
            <Button
              onClick={finalizarCita}
              disabled={
                updatingAppointment || !finalizacionForm.diagnostico.trim()
              }
            >
              {updatingAppointment && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              Finalizar cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para reprogramar cita */}
      <Dialog
        open={reprogramarDialogOpen}
        onOpenChange={setReprogramarDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reprogramar cita</DialogTitle>
            <DialogDescription>
              Seleccione una nueva fecha y hora para la cita.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label
                htmlFor="nuevaFecha"
                className="text-sm font-medium flex gap-2 items-center"
              >
                <Calendar className="h-4 w-4" /> Nueva fecha
              </label>
              <input
                type="date"
                id="nuevaFecha"
                className="w-full px-3 py-2 border rounded-md"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="nuevoHorario"
                className="text-sm font-medium flex gap-2 items-center"
              >
                <Clock className="h-4 w-4" /> Nuevo horario
              </label>
              <select
                id="nuevoHorario"
                className="w-full px-3 py-2 border rounded-md"
                value={nuevoHorario}
                onChange={(e) => setNuevoHorario(e.target.value)}
              >
                <option value="">Seleccione un horario</option>
                <option value="08:00 - 09:00">08:00 - 09:00</option>
                <option value="09:00 - 10:00">09:00 - 10:00</option>
                <option value="10:00 - 11:00">10:00 - 11:00</option>
                <option value="11:00 - 12:00">11:00 - 12:00</option>
                <option value="12:00 - 13:00">12:00 - 13:00</option>
                <option value="14:00 - 15:00">14:00 - 15:00</option>
                <option value="15:00 - 16:00">15:00 - 16:00</option>
                <option value="16:00 - 17:00">16:00 - 17:00</option>
                <option value="17:00 - 18:00">17:00 - 18:00</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="mensaje" className="text-sm font-medium">
                Mensaje para el cliente (opcional)
              </label>
              <Textarea
                id="mensaje"
                placeholder="Indique el motivo de la reprogramación"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setReprogramarDialogOpen(false)}
              disabled={updatingAppointment}
            >
              Cancelar
            </Button>
            <Button
              onClick={reprogramarCita}
              disabled={updatingAppointment || !nuevaFecha || !nuevoHorario}
            >
              {updatingAppointment && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              Reprogramar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
