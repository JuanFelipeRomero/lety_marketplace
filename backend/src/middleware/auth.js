// filepath: src/middleware/auth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Configurar variables de entorno
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware para verificar token para rutas protegidas
const autenticacionToken = (req, res, next) => {
  console.log(`[Auth Middleware] Incoming request to: ${req.path}`);
  console.log(`[Auth Middleware] Full URL: ${req.originalUrl}`);

  // List of path prefixes to exclude from authentication
  const excludedPaths = [
    "/api/places/autocomplete",
    "/api/places/details",
    "/payments/webhook"  // Mercado Pago webhooks don't send JWT tokens
  ];

  // Check if the request path matches any of the excluded paths
  const isExcluded = excludedPaths.some(
    (path) => req.path === path || req.originalUrl.startsWith(path)
  );

  console.log(`[Auth Middleware] Is route excluded? ${isExcluded}`);

  if (isExcluded) {
    console.log(
      `[Auth Middleware] Skipping auth check for excluded path: ${req.originalUrl}`
    );
    return next();
  }

  // Also check for token in cookies (since owner login sets a cookie)
  const authHeader = req.headers["authorization"];
  const headerToken = authHeader && authHeader.split(" ")[1];
  const cookieToken = req.cookies?.auth_token; // Using optional chaining

  console.log(`[Auth Middleware] Header token present: ${!!headerToken}`);
  console.log(`[Auth Middleware] Cookie token present: ${!!cookieToken}`);

  const token = headerToken || cookieToken;

  if (!token) {
    console.log(
      `[Auth Middleware] No token found for path: ${req.originalUrl}`
    );
    return res.status(401).json({ message: "No token, autorización denegada" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error(
        `[Auth Middleware] Token verification failed:`,
        err.message
      );
      return res.status(403).json({ message: "Token inválido o expirado" });
    }

    req.user = user;
    next();
  });
};

export default autenticacionToken;
