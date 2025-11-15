import { Link } from "react-router";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  CreditCard,
} from "lucide-react";

interface Appointment {
  id: number;
  petId?: number;
  petName: string;
  petImage: string;
  clinicId?: number;
  clinicName: string;
  clinicAddress: string;
  serviceId?: number;
  serviceName?: string;
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

interface AppointmentCardProps {
  appointment: Appointment;
  onCancel: (id: number) => void;
  onVerifyPayment: (id: number) => void;
  isVerifyingPayment: boolean;
}

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

export function AppointmentCard({
  appointment,
  onCancel,
  onVerifyPayment,
  isVerifyingPayment,
}: AppointmentCardProps) {
  return (
    <Card
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
              <h3 className="font-bold text-lg text-gray-900 truncate">
                {appointment.petName}
              </h3>
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
                  {appointment.status === "cancelled" &&
                    appointment.motivo_cancelacion && (
                      <p className="text-sm mt-2">
                        <span className="font-bold text-red-700">
                          Motivo de cancelación:
                        </span>{" "}
                        <span className="text-gray-700">
                          {appointment.motivo_cancelacion}
                        </span>
                      </p>
                    )}

                  {appointment.status !== "cancelled" &&
                    appointment.motivo_reprogramacion && (
                      <p className="text-sm mt-2">
                        <span className="font-bold text-blue-700">
                          Motivo de reprogramación:
                        </span>{" "}
                        <span className="text-gray-700">
                          {appointment.motivo_reprogramacion}
                        </span>
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
              {/* Payment Button - Show if awaiting payment */}
              {appointment.status === "confirmed" &&
                appointment.payment_url &&
                appointment.payment_status === "awaiting_payment" && (
                  <>
                    <Button
                      size="sm"
                      className="bg-[#007A55] hover:bg-[#006644] text-white shadow-md hover:shadow-lg transition-all duration-300"
                      asChild
                    >
                      <a
                        href={appointment.payment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pagar
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onVerifyPayment(appointment.id)}
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

              {/* Paid Badge */}
              {appointment.payment_status === "paid" && (
                <Badge className="bg-[#007A55] text-white shadow-md">
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  Pagado
                </Badge>
              )}

              {/* Reschedule Button */}
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

              {/* Cancel Button */}
              {(appointment.status === "confirmed" ||
                appointment.status === "pending") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-300"
                  onClick={() => onCancel(appointment.id)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              )}

              {/* Reagendar Button (for cancelled appointments) */}
              {appointment.status === "cancelled" && (
                <Button
                  size="sm"
                  asChild
                  className="bg-[#007A55] hover:bg-[#006644] text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <Link
                    to={`/dashboard-client/appointment/${appointment.id}/reschedule`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Reagendar
                  </Link>
                </Button>
              )}

              {/* View Details Button */}
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
  );
}
