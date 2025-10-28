import { ExternalLink, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Alert, AlertDescription } from "~/components/ui/alert";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  paymentUrl: string;
  amount: number;
  serviceName: string;
  clinicName: string;
  appointmentDate: string;
  appointmentTime: string;
}

export function PaymentModal({
  open,
  onClose,
  paymentUrl,
  amount,
  serviceName,
  clinicName,
  appointmentDate,
  appointmentTime,
}: PaymentModalProps) {
  const handlePaymentClick = () => {
    // Open payment URL in new tab
    window.open(paymentUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle>Completar Pago</DialogTitle>
          </div>
          <DialogDescription>
            Tu cita ha sido confirmada por la veterinaria. Procede con el pago para finalizar la reserva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Appointment Summary */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Servicio:</span>
              <span className="font-medium">{serviceName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Clínica:</span>
              <span className="font-medium">{clinicName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fecha:</span>
              <span className="font-medium">{appointmentDate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hora:</span>
              <span className="font-medium">{appointmentTime}</span>
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold">Total a pagar:</span>
                <span className="font-semibold text-lg">${amount.toLocaleString()} COP</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Pago seguro con Mercado Pago</strong>
              <br />
              Podrás pagar con tarjeta de crédito, débito, PSE o efectivo.
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Política de reembolso:</strong> Reembolso completo al cancelar con 24 horas
              o más de anticipación.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Pagar más tarde
          </Button>
          <Button onClick={handlePaymentClick} className="w-full sm:w-auto">
            <ExternalLink className="h-4 w-4 mr-2" />
            Ir a pagar
          </Button>
        </DialogFooter>

        <p className="text-xs text-center text-muted-foreground">
          Serás redirigido a Mercado Pago para completar el pago de forma segura
        </p>
      </DialogContent>
    </Dialog>
  );
}
