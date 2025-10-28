import { Badge } from "~/components/ui/badge";
import { CheckCircle2, Clock, XCircle, RefreshCw, AlertCircle } from "lucide-react";

interface PaymentStatusBadgeProps {
  status: string;
  variant?: "default" | "compact";
}

export function PaymentStatusBadge({ status, variant = "default" }: PaymentStatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: "Pendiente de confirmación",
      compactLabel: "Pendiente",
      icon: Clock,
      className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    },
    awaiting_payment: {
      label: "Esperando pago",
      compactLabel: "Por pagar",
      icon: Clock,
      className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    },
    paid: {
      label: "Pagado",
      compactLabel: "Pagado",
      icon: CheckCircle2,
      className: "bg-green-100 text-green-800 hover:bg-green-100",
    },
    refunded: {
      label: "Reembolsado",
      compactLabel: "Reembolsado",
      icon: RefreshCw,
      className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    },
    failed: {
      label: "Pago fallido",
      compactLabel: "Fallido",
      icon: XCircle,
      className: "bg-red-100 text-red-800 hover:bg-red-100",
    },
    cancelled: {
      label: "Cancelado",
      compactLabel: "Cancelado",
      icon: XCircle,
      className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    compactLabel: status,
    icon: AlertCircle,
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  };

  const Icon = config.icon;
  const label = variant === "compact" ? config.compactLabel : config.label;

  return (
    <Badge className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

interface AppointmentStatusBadgeProps {
  appointmentStatus: string;
  paymentStatus?: string;
  variant?: "default" | "compact";
}

/**
 * Combined badge that shows both appointment status and payment status
 */
export function AppointmentStatusBadge({
  appointmentStatus,
  paymentStatus,
  variant = "default",
}: AppointmentStatusBadgeProps) {
  // If there's a payment status and it's relevant, show payment badge
  if (paymentStatus && ["awaiting_payment", "paid", "refunded", "failed"].includes(paymentStatus)) {
    return <PaymentStatusBadge status={paymentStatus} variant={variant} />;
  }

  // Otherwise show appointment status
  const statusConfig = {
    pendiente: {
      label: "Pendiente",
      compactLabel: "Pendiente",
      icon: Clock,
      className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    },
    confirmada: {
      label: "Confirmada",
      compactLabel: "Confirmada",
      icon: CheckCircle2,
      className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    },
    pagada: {
      label: "Pagada",
      compactLabel: "Pagada",
      icon: CheckCircle2,
      className: "bg-green-100 text-green-800 hover:bg-green-100",
    },
    cancelada: {
      label: "Cancelada",
      compactLabel: "Cancelada",
      icon: XCircle,
      className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    },
    finalizada: {
      label: "Finalizada",
      compactLabel: "Finalizada",
      icon: CheckCircle2,
      className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    },
    rechazada: {
      label: "Rechazada",
      compactLabel: "Rechazada",
      icon: XCircle,
      className: "bg-red-100 text-red-800 hover:bg-red-100",
    },
    reprogramacion_sugerida: {
      label: "Reprogramación sugerida",
      compactLabel: "Reprogramar",
      icon: RefreshCw,
      className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    },
  };

  const config = statusConfig[appointmentStatus as keyof typeof statusConfig] || {
    label: appointmentStatus,
    compactLabel: appointmentStatus,
    icon: AlertCircle,
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  };

  const Icon = config.icon;
  const label = variant === "compact" ? config.compactLabel : config.label;

  return (
    <Badge className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
