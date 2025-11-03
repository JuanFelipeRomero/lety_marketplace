import { useEffect, useState } from "react";
import { DollarSign, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner";
import { useAuthStore } from "~/stores/useAuthStore";

interface Earning {
  id_earning: number;
  amount_total: number;
  platform_commission: number;
  clinic_amount: number;
  status: 'pending' | 'paid_out' | 'held' | 'cancelled';
  payment_date: string;
  payout_date?: string;
  payout_method?: string;
  notes?: string;
  citas: {
    id_cita: number;
    fecha_inicio: string;
    servicios: {
      nombre: string;
    };
    usuarios: {
      nombre: string;
      correo: string;
    };
  };
}

interface Totals {
  pending: number;
  paid_out: number;
  total_earned: number;
}

export default function VetEarnings() {
  const token = useAuthStore((state) => state.token);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [totals, setTotals] = useState<Totals>({ pending: 0, paid_out: 0, total_earned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/payments/clinic-earnings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al obtener ganancias");
      }

      const data = await response.json();
      setEarnings(data.earnings || []);
      setTotals(data.totals || { pending: 0, paid_out: 0, total_earned: 0 });
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast.error("Error al cargar ganancias");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pendiente
          </Badge>
        );
      case 'paid_out':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Pagado
          </Badge>
        );
      case 'held':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-600">
            <AlertCircle className="h-3 w-3" />
            Retenido
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Cancelado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>

        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Ganancias</h1>
        <p className="text-muted-foreground">
          Historial de ganancias y pagos recibidos de la plataforma
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente de Pago</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.pending)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Monto acumulado por pagar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Recibidos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.paid_out)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total pagado a la fecha
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ganado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.total_earned)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ganancias totales (neto de comisión 10%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Información sobre pagos:</strong> Los pagos de la plataforma se procesan periódicamente.
          Cuando un cliente paga por un servicio, la plataforma retiene una comisión del 10% y el resto
          queda pendiente de pago para tu clínica. Los pagos se realizan mediante transferencia bancaria
          o el método acordado con la plataforma.
        </AlertDescription>
      </Alert>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Ganancias</CardTitle>
          <CardDescription>
            Detalle de todos los servicios pagados y sus ganancias asociadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay ganancias registradas</h3>
              <p className="text-muted-foreground">
                Cuando los clientes paguen por tus servicios, verás las ganancias aquí
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha de Pago</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="text-right">Monto Total</TableHead>
                    <TableHead className="text-right">Comisión (10%)</TableHead>
                    <TableHead className="text-right">Tu Ganancia</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => (
                    <TableRow key={earning.id_earning}>
                      <TableCell className="font-medium">
                        {formatDate(earning.payment_date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{earning.citas.usuarios.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {earning.citas.usuarios.correo}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{earning.citas.servicios.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            Cita #{earning.citas.id_cita}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(earning.amount_total)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(earning.platform_commission)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(earning.clinic_amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(earning.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {earnings.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  Mostrando {earnings.length} registro{earnings.length !== 1 ? 's' : ''}
                </span>
                <div className="space-x-4">
                  <span className="text-muted-foreground">
                    Comisión total: {formatCurrency(
                      earnings
                        .filter(e => e.status !== 'cancelled')
                        .reduce((sum, e) => sum + e.platform_commission, 0)
                    )}
                  </span>
                  <span className="font-semibold">
                    Ganancias netas: {formatCurrency(totals.total_earned)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
