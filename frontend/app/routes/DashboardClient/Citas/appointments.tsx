import { useState, useEffect } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Input } from "~/components/ui/input";
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Calendar,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { useAuthStore } from "~/stores/useAuthStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";


interface Appointment {
  id: number;
  petName: string;
  petImage: string;
  clinicName: string;
  clinicAddress: string;
  date: string;
  time: string;
  reason: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  notes?: string;
  motivo_reprogramacion?: string;
  motivo_cancelacion?: string;
  payment_status?: "pending" | "awaiting_payment" | "paid" | "refunded" | "failed";
  payment_url?: string;
  payment_amount?: number;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const router = useNavigate();
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);

  const token = useAuthStore((state) => state.token);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  // Function to verify payment status with Mercado Pago
  const verifyPayment = async (appointmentId: number, paymentId?: string) => {
    if (!token) return;

    setIsVerifyingPayment(true);
    try {
      console.log(`🔍 Verifying payment for appointment ${appointmentId}`);

      const response = await fetch(`${API_URL}/payments/verify/${appointmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payment_id: paymentId }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show appropriate message based on payment status
        if (data.payment_status === 'paid') {
          toast.success(data.message || '¡Pago confirmado!');
        } else if (data.mp_status === 'pending') {
          toast.info(data.message || 'Tu pago está pendiente');
          // Show pending payment info if available
          if (data.pending_info) {
            toast.info(data.pending_info.message, { duration: 8000 });
          }
        } else if (data.mp_status === 'rejected') {
          toast.error(data.message || 'El pago fue rechazado');
        } else if (data.already_processed) {
          toast.success(data.message);
        } else {
          toast.info(data.message || 'Estado de pago actualizado');
        }

        // Refresh appointments list
        fetchAppointments();
      } else {
        if (data.requires_payment) {
          toast.warning(data.message || 'No se encontró ningún pago para esta cita');
        } else {
          toast.error(data.message || 'Error al verificar el pago');
        }
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Error al verificar el pago. Por favor intenta nuevamente.');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const fetchAppointments = async () => {
    try {

      if (!token) {
        console.error("Token no encontrado");
        return;
      }

      const response = await fetch(`${API_URL}/appointments/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al traer citas");
      }

      const data = await response.json();

      setAppointments(data.citas || []);
    } catch (error) {
      console.error("Error trayendo citas:", error);
    }
  };

  // Check for payment status on page load (when returning from Mercado Pago)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment'); // 'success', 'pending', 'failure'
    const paymentId = urlParams.get('payment_id') || urlParams.get('collection_id');

    if (paymentStatus && appointments.length > 0) {
      // Find the most recent appointment with awaiting_payment status
      const pendingAppointment = appointments.find(
        apt => apt.payment_status === 'awaiting_payment'
      );

      if (pendingAppointment) {
        console.log(`📥 Returned from MP with status: ${paymentStatus}, verifying payment...`);
        verifyPayment(pendingAppointment.id, paymentId || undefined);

        // Clean URL params after verification
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [appointments]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const filteredAppointments = appointments.filter((appointment) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      appointment.petName.toLowerCase().includes(searchLower) ||
      appointment.clinicName.toLowerCase().includes(searchLower) ||
      appointment.reason.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-[#007A55] text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 px-3 py-1">
            <CheckCircle className="mr-1.5 h-4 w-4" />
            Confirmada
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 px-3 py-1">
            <Clock className="mr-1.5 h-4 w-4" />
            Pendiente
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-slate-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 px-3 py-1">
            <CheckCircle className="mr-1.5 h-4 w-4" />
            Completada
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-slate-400 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 px-3 py-1">
            <XCircle className="mr-1.5 h-4 w-4" />
            Cancelada
          </Badge>
        );
    }
  };

  const getStatusIcon = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-6 w-6 text-[#007A55]" />;
      case "pending":
        return <Clock className="h-6 w-6 text-amber-500" />;
      case "completed":
        return <CheckCircle className="h-6 w-6 text-slate-600" />;
      case "cancelled":
        return <XCircle className="h-6 w-6 text-slate-400" />;
    }
  };

  const getStatusBorderColor = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return "border-l-[#007A55]";
      case "pending":
        return "border-l-amber-500";
      case "completed":
        return "border-l-slate-600";
      case "cancelled":
        return "border-l-slate-400";
    }
  };

  const handleCancelAppointment = async () => {
    if (!cancelReason.trim()) {
      toast.error("Por favor, proporciona un motivo para la cancelación.");
      return;
    }

    if (!selectedAppointmentId) {
      toast.error("No se pudo identificar la cita.");
      return;
    }
    
    try {
    const response = await fetch(`${API_URL}/appointment/${selectedAppointmentId}/cancel`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: cancelReason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Error al cancelar la cita.");
    }

    toast.success("Cita cancelada exitosamente.");
    setIsCancelDialogOpen(false);
    setCancelReason("");
    setSelectedAppointmentId(null);
    setAppointments((prevAppointments) =>
      prevAppointments.map((appt) =>
        appt.id === selectedAppointmentId
          ? { ...appt, status: "cancelled" }
          : appt
      )
    );
  } catch (error: any) {
    toast.error(error.message);
  }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Mis Citas</h1>
        <Button asChild>
          <Link to="/dashboard-client/appointments/schedule">
            <Plus className="mr-2 h-4 w-4" />
            Agendar Cita
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar cita por mascota, clínica o motivo..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Todas</span>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <span>Próximas</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <span>Completadas</span>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            <span>Canceladas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Calendar className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium">
                No se encontraron citas
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No hay citas que coincidan con tu búsqueda
              </p>
              <Button className="mt-4" asChild>
                <Link to="/dashboard-client/appointments/schedule">
                  Agendar Cita
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <Card
                  key={appointment.id}
                  className={`overflow-hidden border-l-4 ${getStatusBorderColor(appointment.status)} transition-all duration-300 hover:shadow-xl hover:scale-[1.01]`}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Pet Info Section - Left */}
                      <div className="flex items-center gap-4 border-b p-6 md:w-1/3 md:border-b-0 md:border-r bg-gradient-to-br from-slate-50 to-gray-50">
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 ring-4 ring-white shadow-lg">
                          <img
                            src={appointment.petImage || "/placeholder.svg"}
                            alt={appointment.petName}
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-900 truncate">{appointment.petName}</h3>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                            <Calendar className="h-4 w-4 text-[#007A55]" />
                            <p className="truncate">{appointment.date}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Clock className="h-4 w-4 text-[#007A55]" />
                            <p>{appointment.time}</p>
                          </div>
                        </div>
                      </div>

                      {/* Clinic & Details Section - Right */}
                      <div className="flex flex-1 flex-col justify-between p-6 bg-white">
                        <div>
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <h4 className="font-bold text-lg text-gray-900 flex-1">
                              {appointment.clinicName}
                            </h4>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            {appointment.clinicAddress}
                          </p>
                          <div className="mt-3 flex items-start gap-3 bg-slate-50 rounded-lg p-4">
                            <div className="mt-0.5 flex-shrink-0">
                              {getStatusIcon(appointment.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">
                                <span className="font-bold text-gray-900">Motivo:</span>{" "}
                                <span className="text-gray-700">{appointment.reason}</span>
                              </p>
                              {appointment.status === "cancelled" && appointment.motivo_cancelacion && (
                                <p className="text-sm mt-2">
                                 <span className="font-bold text-red-700">Motivo de cancelación:</span>{" "}
                                  <span className="text-gray-700">{appointment.motivo_cancelacion}</span>
                                </p>
                              )}

                              {appointment.status !== "cancelled" && appointment.motivo_reprogramacion && (
                                <p className="text-sm mt-2">
                                  <span className="font-bold text-blue-700">Motivo de reprogramación:</span>{" "}
                                  <span className="text-gray-700">{appointment.motivo_reprogramacion}</span>
                                </p>
                              )}
                              {appointment.notes && (
                                <p className="mt-2 text-sm text-gray-600 italic">
                                  {appointment.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                          {/* Botón de Pagar - Mostrar si la cita está confirmada y tiene payment_url */}
                          {appointment.status === "confirmed" &&
                            appointment.payment_url &&
                            appointment.payment_status === "awaiting_payment" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-[#007A55] hover:bg-[#006644] text-white shadow-md hover:shadow-lg transition-all duration-300"
                                asChild
                              >
                                <a href={appointment.payment_url} target="_blank" rel="noopener noreferrer">
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Pagar
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => verifyPayment(appointment.id)}
                                disabled={isVerifyingPayment}
                                className="border-[#007A55] text-[#007A55] hover:bg-[#007A55]/5 transition-all duration-300"
                              >
                                {isVerifyingPayment ? (
                                  <>
                                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                                    Verificando...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Verificar Estado
                                  </>
                                )}
                              </Button>
                            </>
                          )}

                          {/* Mostrar badge si ya está pagado */}
                          {appointment.payment_status === "paid" && (
                            <Badge className="bg-[#007A55] text-white shadow-md">
                              <CheckCircle className="mr-1.5 h-4 w-4" />
                              Pagado
                            </Badge>
                          )}

                          {(appointment.status === "confirmed" ||
                            appointment.status === "pending") && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-300"
                            >
                              <Link
                                to={`/dashboard-client/appointment/${appointment.id}/reschedule`}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Reprogramar
                              </Link>
                            </Button>
                          )}
                          {(appointment.status === "confirmed" ||
                            appointment.status === "pending") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-300"
                              onClick={() => {
                                setSelectedAppointmentId(appointment.id);
                                setIsCancelDialogOpen(true);
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            asChild
                            className="bg-[#007A55] hover:bg-[#006644] text-white shadow-md hover:shadow-lg transition-all duration-300"
                          >
                            <Link
                              to={`/dashboard-client/appointments/${appointment.id}`}
                            >
                              <Search className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="space-y-4">
            {filteredAppointments
              .filter(
                (appointment) =>
                  appointment.status === "confirmed" ||
                  appointment.status === "pending"
              )
              .map((appointment) => (
                <Card
                  key={appointment.id}
                  className={`overflow-hidden border-l-4 ${getStatusBorderColor(appointment.status)} transition-all duration-300 hover:shadow-xl hover:scale-[1.01]`}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Pet Info Section - Left */}
                      <div className="flex items-center gap-4 border-b p-6 md:w-1/3 md:border-b-0 md:border-r bg-gradient-to-br from-slate-50 to-gray-50">
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 ring-4 ring-white shadow-lg">
                          <img
                            src={appointment.petImage || "/placeholder.svg"}
                            alt={appointment.petName}
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-900 truncate">{appointment.petName}</h3>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                            <Calendar className="h-4 w-4 text-[#007A55]" />
                            <p className="truncate">{appointment.date}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Clock className="h-4 w-4 text-[#007A55]" />
                            <p>{appointment.time}</p>
                          </div>
                        </div>
                      </div>

                      {/* Clinic & Details Section - Right */}
                      <div className="flex flex-1 flex-col justify-between p-6 bg-white">
                        <div>
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <h4 className="font-bold text-lg text-gray-900 flex-1">
                              {appointment.clinicName}
                            </h4>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            {appointment.clinicAddress}
                          </p>
                          <div className="mt-3 flex items-start gap-3 bg-slate-50 rounded-lg p-4">
                            <div className="mt-0.5 flex-shrink-0">
                              {getStatusIcon(appointment.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">
                                <span className="font-bold text-gray-900">Motivo:</span>{" "}
                                <span className="text-gray-700">{appointment.reason}</span>
                              </p>
                              {appointment.motivo_reprogramacion && (
                                <p className="text-sm mt-2">
                                  <span className="font-bold text-blue-700">Motivo de reprogramación:</span>{" "}
                                  <span className="text-gray-700">{appointment.motivo_reprogramacion}</span>
                                </p>
                              )}
                              {appointment.notes && (
                                <p className="mt-2 text-sm text-gray-600 italic">
                                  {appointment.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-300"
                          >
                            <Link to={`/dashboard-client/appointment/${appointment.id}/reschedule`}>
                              <Calendar className="mr-2 h-4 w-4" />
                              Reprogramar
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-300"
                            onClick={() => {
                              setSelectedAppointmentId(appointment.id);
                              setIsCancelDialogOpen(true);
                            }}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            asChild
                            className="bg-[#007A55] hover:bg-[#006644] text-white shadow-md hover:shadow-lg transition-all duration-300"
                          >
                            <Link to={`/dashboard-client/appointments/${appointment.id}`}>
                              <Search className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="space-y-4">
            {filteredAppointments
              .filter((appointment) => appointment.status === "completed")
              .map((appointment) => (
                <Card
                  key={appointment.id}
                  className={`overflow-hidden border-l-4 ${getStatusBorderColor(appointment.status)} transition-all duration-300 hover:shadow-xl hover:scale-[1.01]`}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Pet Info Section - Left */}
                      <div className="flex items-center gap-4 border-b p-6 md:w-1/3 md:border-b-0 md:border-r bg-gradient-to-br from-slate-50 to-gray-50">
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 ring-4 ring-white shadow-lg">
                          <img
                            src={appointment.petImage || "/placeholder.svg"}
                            alt={appointment.petName}
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-900 truncate">{appointment.petName}</h3>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                            <Calendar className="h-4 w-4 text-[#007A55]" />
                            <p className="truncate">{appointment.date}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Clock className="h-4 w-4 text-[#007A55]" />
                            <p>{appointment.time}</p>
                          </div>
                        </div>
                      </div>

                      {/* Clinic & Details Section - Right */}
                      <div className="flex flex-1 flex-col justify-between p-6 bg-white">
                        <div>
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <h4 className="font-bold text-lg text-gray-900 flex-1">
                              {appointment.clinicName}
                            </h4>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            {appointment.clinicAddress}
                          </p>
                          <div className="mt-3 flex items-start gap-3 bg-slate-50 rounded-lg p-4">
                            <div className="mt-0.5 flex-shrink-0">
                              {getStatusIcon(appointment.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">
                                <span className="font-bold text-gray-900">Motivo:</span>{" "}
                                <span className="text-gray-700">{appointment.reason}</span>
                              </p>
                              {appointment.notes && (
                                <p className="mt-2 text-sm text-gray-600 italic">
                                  {appointment.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            asChild
                            className="bg-[#007A55] hover:bg-[#006644] text-white shadow-md hover:shadow-lg transition-all duration-300"
                          >
                            <Link to={`/dashboard-client/appointments/${appointment.id}`}>
                              <Search className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          <div className="space-y-4">
            {filteredAppointments
              .filter((appointment) => appointment.status === "cancelled")
              .map((appointment) => (
                <Card
                  key={appointment.id}
                  className={`overflow-hidden border-l-4 ${getStatusBorderColor(appointment.status)} transition-all duration-300 hover:shadow-xl hover:scale-[1.01]`}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Pet Info Section - Left */}
                      <div className="flex items-center gap-4 border-b p-6 md:w-1/3 md:border-b-0 md:border-r bg-gradient-to-br from-slate-50 to-gray-50">
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 ring-4 ring-white shadow-lg">
                          <img
                            src={appointment.petImage || "/placeholder.svg"}
                            alt={appointment.petName}
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-900 truncate">{appointment.petName}</h3>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                            <Calendar className="h-4 w-4 text-[#007A55]" />
                            <p className="truncate">{appointment.date}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Clock className="h-4 w-4 text-[#007A55]" />
                            <p>{appointment.time}</p>
                          </div>
                        </div>
                      </div>

                      {/* Clinic & Details Section - Right */}
                      <div className="flex flex-1 flex-col justify-between p-6 bg-white">
                        <div>
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <h4 className="font-bold text-lg text-gray-900 flex-1">
                              {appointment.clinicName}
                            </h4>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            {appointment.clinicAddress}
                          </p>
                          <div className="mt-3 flex items-start gap-3 bg-slate-50 rounded-lg p-4">
                            <div className="mt-0.5 flex-shrink-0">
                              {getStatusIcon(appointment.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">
                                <span className="font-bold text-gray-900">Motivo:</span>{" "}
                                <span className="text-gray-700">{appointment.reason}</span>
                              </p>
                              {appointment.motivo_cancelacion && (
                                <p className="text-sm mt-2">
                                 <span className="font-bold text-red-700">Motivo de cancelación:</span>{" "}
                                  <span className="text-gray-700">{appointment.motivo_cancelacion}</span>
                                </p>
                              )}
                              {appointment.notes && (
                                <p className="mt-2 text-sm text-gray-600 italic">
                                  {appointment.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            asChild
                            className="bg-[#007A55] hover:bg-[#006644] text-white shadow-md hover:shadow-lg transition-all duration-300"
                          >
                            <Link to={`/dashboard-client/appointment/${appointment.id}/reschedule`}>
                              <Calendar className="mr-2 h-4 w-4" />
                              Reagendar
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogo de cancelación */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Cita</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar esta cita? Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason" className="required">
                Motivo de cancelación
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="Indica el motivo de la cancelación..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Importante</AlertTitle>
              <AlertDescription>
                Las cancelaciones con menos de 24 horas de anticipación pueden
                estar sujetas a cargos según la política de la clínica.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
            >
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancelAppointment}>
              Cancelar Cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
