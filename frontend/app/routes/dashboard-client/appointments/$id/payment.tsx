import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ExternalLink, CreditCard, AlertCircle, CheckCircle2, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { PaymentStatusBadge } from "~/components/payment-status-badge";
import { toast } from "sonner";
import { useAuthStore } from "~/stores/useAuthStore";

export default function AppointmentPayment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [appointmentInfo, setAppointmentInfo] = useState<any>(null);

  useEffect(() => {
    fetchPaymentInfo();
    fetchAppointmentInfo();
  }, [id]);

  const fetchPaymentInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/payments/status/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al obtener información de pago");
      }

      const data = await response.json();
      setPaymentInfo(data);
    } catch (error) {
      console.error("Error fetching payment info:", error);
      toast.error("Error al cargar información de pago");
    }
  };

  const fetchAppointmentInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/appointments/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al obtener información de la cita");
      }

      const data = await response.json();
      setAppointmentInfo(data.appointment);
    } catch (error) {
      console.error("Error fetching appointment info:", error);
      toast.error("Error al cargar información de la cita");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = () => {
    if (paymentInfo?.payment_url) {
      window.open(paymentInfo.payment_url, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Cargando información de pago...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentInfo || !appointmentInfo) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se pudo cargar la información de pago. Por favor, intenta de nuevo.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => navigate("/dashboard-client/appointments")}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a mis citas
        </Button>
      </div>
    );
  }

  const isPaid = paymentInfo.payment_status === "paid";
  const isRefunded = paymentInfo.payment_status === "refunded";
  const isAwaitingPayment = paymentInfo.payment_status === "awaiting_payment";

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard-client/appointments")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a mis citas
        </Button>
        <h1 className="text-3xl font-bold mb-2">Pago de Cita</h1>
        <p className="text-muted-foreground">
          Completa el pago de tu cita veterinaria
        </p>
      </div>

      {/* Payment Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Estado del Pago
              </CardTitle>
            </div>
            <PaymentStatusBadge status={paymentInfo.payment_status} />
          </div>
        </CardHeader>
        <CardContent>
          {isPaid && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Pago confirmado</strong>
                <br />
                Tu cita ha sido pagada exitosamente.
                {paymentInfo.payment_date && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    Fecha de pago: {new Date(paymentInfo.payment_date).toLocaleDateString("es-ES")}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {isRefunded && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Pago reembolsado</strong>
                <br />
                El pago de esta cita ha sido reembolsado a tu método de pago original.
              </AlertDescription>
            </Alert>
          )}

          {isAwaitingPayment && paymentInfo.payment_url && (
            <div className="space-y-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Pago pendiente</strong>
                  <br />
                  La veterinaria ha confirmado tu cita. Completa el pago para finalizar tu reserva.
                </AlertDescription>
              </Alert>
              <Button onClick={handlePaymentClick} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ir a pagar ahora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Resumen de la Cita</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Servicio</p>
              <p className="font-medium">{appointmentInfo.service}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Clínica</p>
              <p className="font-medium">{appointmentInfo.clinicName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Fecha</p>
              <p className="font-medium">{appointmentInfo.date}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Hora</p>
              <p className="font-medium">{appointmentInfo.time}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Mascota</p>
              <p className="font-medium">{appointmentInfo.petName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Duración</p>
              <p className="font-medium">{appointmentInfo.duration} minutos</p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total a pagar</span>
              <span className="text-2xl font-bold">${paymentInfo.amount?.toLocaleString()} COP</span>
            </div>
            {paymentInfo.marketplace_fee && (
              <p className="text-xs text-muted-foreground mt-1">
                Incluye comisión de plataforma: ${paymentInfo.marketplace_fee.toLocaleString()} COP
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Pago</CardTitle>
          <CardDescription>Pago seguro procesado por Mercado Pago</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Métodos de pago aceptados</h4>
                <p className="text-sm text-muted-foreground">
                  Tarjetas de crédito y débito, PSE, efectivo en puntos autorizados
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Transacción segura</h4>
                <p className="text-sm text-muted-foreground">
                  Tus datos están protegidos con encriptación de última generación
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Política de reembolso</h4>
                <p className="text-sm text-muted-foreground">
                  Reembolso completo al cancelar con 24 horas o más de anticipación
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Al completar el pago, aceptas los términos y condiciones de la clínica veterinaria.
              El pago se acreditará directamente a la cuenta de la veterinaria.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
