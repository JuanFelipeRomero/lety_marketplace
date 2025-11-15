import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  User,
  Mail,
  Phone,
  FileText,
  CalendarCheck,
  Ban,
  CalendarClock,
} from "lucide-react";

interface VetAppointment {
  id_cita: number;
  id_mascota: number;
  nombre_mascota: string;
  foto_mascota?: string;
  id_usuario: number;
  nombre_usuario: string;
  correo_usuario: string;
  telefono_usuario: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  motivo: string;
  notas_adicionales?: string;
  motivo_reprogramacion?: string;
  motivo_cancelacion?: string;
  diagnostico?: string;
  tratamiento?: string;
}

interface VetAppointmentCardProps {
  appointment: VetAppointment;
  onConfirm: (id: number) => void;
  onReject: (id: number) => void;
  onReschedule: (id: number) => void;
  onFinalize: (id: number) => void;
  onViewDetails: (id: number) => void;
}

const normalizeStatus = (status: string): "confirmed" | "pending" | "completed" | "cancelled" | "rejected" => {
  const normalized = status.toLowerCase();
  if (normalized === "confirmada") return "confirmed";
  if (normalized === "pendiente") return "pending";
  if (normalized === "completada" || normalized === "finalizada") return "completed";
  if (normalized === "cancelada") return "cancelled";
  if (normalized === "rechazada") return "rejected";
  return "pending";
};

const getStatusBadge = (status: string) => {
  const normalizedStatus = normalizeStatus(status);

  switch (normalizedStatus) {
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
    case "rejected":
      return (
        <Badge className="bg-red-500 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 px-3 py-1">
          <Ban className="mr-1.5 h-4 w-4" />
          Rechazada
        </Badge>
      );
  }
};

const getStatusIcon = (status: string) => {
  const normalizedStatus = normalizeStatus(status);

  switch (normalizedStatus) {
    case "confirmed":
      return <CheckCircle className="h-6 w-6 text-[#007A55]" />;
    case "pending":
      return <Clock className="h-6 w-6 text-amber-500" />;
    case "completed":
      return <CheckCircle className="h-6 w-6 text-slate-600" />;
    case "cancelled":
      return <XCircle className="h-6 w-6 text-slate-400" />;
    case "rejected":
      return <Ban className="h-6 w-6 text-red-500" />;
  }
};

const getStatusBorderColor = (status: string) => {
  const normalizedStatus = normalizeStatus(status);

  switch (normalizedStatus) {
    case "confirmed":
      return "border-l-[#007A55]";
    case "pending":
      return "border-l-amber-500";
    case "completed":
      return "border-l-slate-600";
    case "cancelled":
      return "border-l-slate-400";
    case "rejected":
      return "border-l-red-500";
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function VetAppointmentCard({
  appointment,
  onConfirm,
  onReject,
  onReschedule,
  onFinalize,
  onViewDetails,
}: VetAppointmentCardProps) {
  const normalizedStatus = normalizeStatus(appointment.estado);
  const hasCompletedRecords = appointment.diagnostico || appointment.tratamiento;

  return (
    <Card
      className={`overflow-hidden border-l-4 ${getStatusBorderColor(appointment.estado)} transition-all duration-300 hover:shadow-xl hover:scale-[1.01]`}
    >
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Pet & Owner Info Section - Left */}
          <div className="flex flex-col gap-4 border-b p-6 lg:w-1/3 lg:border-b-0 lg:border-r bg-gradient-to-br from-slate-50 to-gray-50">
            {/* Pet Info */}
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 ring-4 ring-white shadow-lg">
                <img
                  src={appointment.foto_mascota || "/placeholder.svg"}
                  alt={appointment.nombre_mascota}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-gray-900 truncate">
                  {appointment.nombre_mascota}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                  <Calendar className="h-4 w-4 text-[#007A55]" />
                  <p className="truncate">{formatDate(appointment.fecha_inicio)}</p>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Clock className="h-4 w-4 text-[#007A55]" />
                  <p>{formatTime(appointment.fecha_inicio)}</p>
                </div>
              </div>
            </div>

            {/* Owner Contact Info */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="font-semibold text-gray-900 truncate">
                  {appointment.nombre_usuario}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <a
                  href={`mailto:${appointment.correo_usuario}`}
                  className="text-gray-600 hover:text-[#007A55] transition-colors truncate"
                >
                  {appointment.correo_usuario}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <a
                  href={`tel:${appointment.telefono_usuario}`}
                  className="text-gray-600 hover:text-[#007A55] transition-colors"
                >
                  {appointment.telefono_usuario}
                </a>
              </div>
            </div>
          </div>

          {/* Appointment Details & Actions Section - Right */}
          <div className="flex flex-1 flex-col justify-between p-6 bg-white">
            <div>
              <div className="mb-3 flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {getStatusBadge(appointment.estado)}
                  {hasCompletedRecords && (
                    <Badge className="bg-blue-500 text-white border-0 shadow-md">
                      <FileText className="mr-1.5 h-4 w-4" />
                      Con Registros
                    </Badge>
                  )}
                </div>
              </div>

              {/* Appointment Details Box */}
              <div className="mt-3 flex items-start gap-3 bg-slate-50 rounded-lg p-4">
                <div className="mt-0.5 flex-shrink-0">
                  {getStatusIcon(appointment.estado)}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm">
                    <span className="font-bold text-gray-900">Motivo:</span>{" "}
                    <span className="text-gray-700">{appointment.motivo}</span>
                  </p>

                  {appointment.notas_adicionales && (
                    <p className="text-sm">
                      <span className="font-bold text-gray-900">Notas:</span>{" "}
                      <span className="text-gray-700">{appointment.notas_adicionales}</span>
                    </p>
                  )}

                  {appointment.estado === "Cancelada" && appointment.motivo_cancelacion && (
                    <p className="text-sm">
                      <span className="font-bold text-red-700">
                        Motivo de cancelación:
                      </span>{" "}
                      <span className="text-gray-700">
                        {appointment.motivo_cancelacion}
                      </span>
                    </p>
                  )}

                  {appointment.motivo_reprogramacion && (
                    <p className="text-sm">
                      <span className="font-bold text-blue-700">
                        Motivo de reprogramación:
                      </span>{" "}
                      <span className="text-gray-700">
                        {appointment.motivo_reprogramacion}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {/* Confirm Button - Only for pending appointments */}
              {normalizedStatus === "pending" && (
                <Button
                  size="sm"
                  onClick={() => onConfirm(appointment.id_cita)}
                  className="bg-[#007A55] hover:bg-[#006644] text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Confirmar
                </Button>
              )}

              {/* Reject Button - Only for pending appointments */}
              {normalizedStatus === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(appointment.id_cita)}
                  className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 transition-all duration-300"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Rechazar
                </Button>
              )}

              {/* Reschedule Button - For pending and confirmed */}
              {(normalizedStatus === "pending" || normalizedStatus === "confirmed") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReschedule(appointment.id_cita)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-300"
                >
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Reprogramar
                </Button>
              )}

              {/* Finalize Button - Only for confirmed appointments */}
              {normalizedStatus === "confirmed" && (
                <Button
                  size="sm"
                  onClick={() => onFinalize(appointment.id_cita)}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Finalizar
                </Button>
              )}

              {/* View Details Button - Always visible */}
              <Button
                size="sm"
                onClick={() => onViewDetails(appointment.id_cita)}
                className="bg-[#007A55] hover:bg-[#006644] text-white shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Search className="mr-2 h-4 w-4" />
                Ver Detalles
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
