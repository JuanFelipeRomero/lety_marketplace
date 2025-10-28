import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink, CreditCard } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { useAuthStore } from "~/stores/useAuthStore";

export default function MercadoPagoSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const [status, setStatus] = useState<{
    connected: boolean;
    needs_refresh: boolean;
    user_id: string | null;
    expires_at: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Check for OAuth callback status
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      toast.success("¡Mercado Pago conectado exitosamente!");
      // Clear query params
      window.history.replaceState({}, "", "/dashboard-vet/mercadopago-setup");
      fetchStatus();
    } else if (error) {
      const errorMessages: Record<string, string> = {
        missing_params: "Parámetros faltantes en la respuesta de Mercado Pago",
        invalid_state: "Estado de sesión inválido. Por favor intenta de nuevo",
        expired_state: "La sesión expiró. Por favor intenta de nuevo",
        store_failed: "Error al guardar los tokens. Por favor intenta de nuevo",
        callback_failed: "Error en la conexión. Por favor intenta de nuevo",
      };

      toast.error(errorMessages[error] || "Error al conectar Mercado Pago");
      // Clear query params
      window.history.replaceState({}, "", "/dashboard-vet/mercadopago-setup");
    }
  }, [searchParams]);

  // Fetch current status
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/mercadopago/oauth/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al verificar estado");
      }

      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Error fetching MP status:", error);
      toast.error("Error al verificar estado de Mercado Pago");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Redirect to OAuth authorization
      window.location.href = `${API_URL}/mercadopago/oauth/authorize`;
    } catch (error) {
      console.error("Error initiating OAuth:", error);
      toast.error("Error al iniciar conexión");
      setConnecting(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/mercadopago/oauth/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Error al refrescar token");
      }

      toast.success("Token actualizado exitosamente");
      fetchStatus();
    } catch (error) {
      console.error("Error refreshing token:", error);
      toast.error("Error al actualizar token");
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("¿Estás seguro de que deseas desconectar Mercado Pago? No podrás recibir pagos hasta que vuelvas a conectarlo.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch(`${API_URL}/mercadopago/oauth/disconnect`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al desconectar");
      }

      toast.success("Mercado Pago desconectado exitosamente");
      fetchStatus();
    } catch (error: any) {
      console.error("Error disconnecting MP:", error);
      toast.error(error.message || "Error al desconectar Mercado Pago");
    } finally {
      setDisconnecting(false);
    }
  };

  const formatExpirationDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysUntilExpiration = (dateString: string) => {
    const now = new Date();
    const expiration = new Date(dateString);
    const daysUntilExpiration = Math.floor((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration;
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Verificando estado de Mercado Pago...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Configuración de Pagos</h1>
        <p className="text-muted-foreground">
          Conecta tu cuenta de Mercado Pago para recibir pagos de tus clientes
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Estado de Conexión
              </CardTitle>
              <CardDescription className="mt-1">
                {status?.connected
                  ? "Tu cuenta de Mercado Pago está conectada"
                  : "Conecta Mercado Pago para empezar a recibir pagos"}
              </CardDescription>
            </div>
            <Badge
              variant={status?.connected ? "default" : "secondary"}
              className="text-sm"
            >
              {status?.connected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Conectado
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  No conectado
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {status?.connected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ID de Usuario MP</p>
                  <p className="font-mono text-sm">{status.user_id}</p>
                </div>
                {status.expires_at && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Token expira</p>
                    <p className="text-sm">
                      {formatExpirationDate(status.expires_at)}
                      <span className="text-muted-foreground ml-2">
                        ({getDaysUntilExpiration(status.expires_at)} días)
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {status.needs_refresh && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Tu token de acceso está próximo a vencer.
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-1"
                      onClick={handleRefresh}
                      disabled={loading}
                    >
                      Actualizar ahora
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Actualizar Token"
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Desconectando...
                    </>
                  ) : (
                    "Desconectar"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Para recibir pagos de tus clientes, necesitas conectar tu cuenta de Mercado Pago.
                Este proceso es seguro y te tomará solo unos minutos.
              </p>

              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Conectar Mercado Pago
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                1
              </div>
              <div>
                <h4 className="font-medium mb-1">Conecta tu cuenta</h4>
                <p className="text-sm text-muted-foreground">
                  Autoriza a Lety Marketplace para procesar pagos en tu nombre de forma segura
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                2
              </div>
              <div>
                <h4 className="font-medium mb-1">Confirma las citas</h4>
                <p className="text-sm text-muted-foreground">
                  Cuando confirmes una cita, se generará automáticamente un link de pago para tu cliente
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                3
              </div>
              <div>
                <h4 className="font-medium mb-1">Recibe tus pagos</h4>
                <p className="text-sm text-muted-foreground">
                  Los pagos se acreditan directamente en tu cuenta de Mercado Pago.
                  La plataforma cobra una comisión del 10% por cada transacción.
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Los tokens de acceso expiran cada 6 meses.
              Te notificaremos cuando sea necesario renovarlos.
            </AlertDescription>
          </Alert>

          {!status?.connected && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>¿No tienes cuenta de Mercado Pago?</strong>
                <br />
                Crea una gratis en{" "}
                <a
                  href="https://www.mercadopago.com.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary"
                >
                  www.mercadopago.com.co
                </a>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
