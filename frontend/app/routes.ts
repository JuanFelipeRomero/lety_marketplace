import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  layout("layouts/DashboardLayoutVet/index.tsx", [
    route("dashboard-vet", "routes/DashboardVet/index.tsx"),
    route("dashboard-vet/photos", "routes/DashboardVet/PhotosVet/index.tsx"),
    route(
      "dashboard-vet/analytics",
      "routes/DashboardVet/VetAnalytics/index.tsx"
    ), // Ruta para analytics
    route("dashboard-vet/appointments", "routes/DashboardVet/appointments.tsx"), // Ruta para citas
    route(
      "dashboard-vet/general-information",
      "routes/DashboardVet/GeneralInformation/index.tsx"
    ),
    route(
      "dashboard-vet/services",
      "routes/DashboardVet/ServicesVet/index.tsx"
    ), // Ruta para general information
    route(
      "dashboard-vet/mercadopago-setup",
      "routes/dashboard-vet/mercadopago-setup.tsx"
    ), // Ruta para configuración de Mercado Pago
  ]),
  layout("layouts/DashboardLayoutClient/index.tsx", [
    route("dashboard-client", "routes/DashboardClient/index.tsx"),
    route(
      "dashboard-client/vet-search",
      "routes/DashboardClient/BusquedaVeterinarias/index.tsx"
    ),
    route(
      "dashboard-client/appointments",
      "routes/DashboardClient/Citas/appointments.tsx"
    ),
    route(
      "dashboard-client/appointments/schedule",
      "routes/DashboardClient/Citas/Agendar/client-schedule.tsx"
    ),
    route(
      "dashboard-client/appointments/:id",
      "routes/DashboardClient/Citas/ID_citas/id-schedule.tsx"
    ),
    route(
      "dashboard-client/appointments/:id/payment",
      "routes/dashboard-client/appointments/$id/payment.tsx"
    ),
    route(
      "dashboard-client/appointment/:id/reschedule",
      "routes/DashboardClient/Citas/Reprogramar/client-reschedule.tsx"
    ),
    route("dashboard-client/pets", "routes/DashboardClient/pets.tsx"),
    route("dashboard-client/pets/:id", "components/ui/pet-details.tsx"),
    route("dashboard-client/vet-search/:id", "routes/DashboardClient/BusquedaVeterinarias/VetProfilePage.tsx"),
    route("/dashboard-client/profile", "routes/DashboardClient/profile/UserProfile.tsx")
  ]),
  route("login", "routes/LoginPage/index.tsx"),
  route("unauthorized", "routes/Unauthorized/index.tsx"),
] satisfies RouteConfig;
