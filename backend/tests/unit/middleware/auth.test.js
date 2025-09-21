import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";
import autenticacionToken from "../../../src/middleware/auth.js";

// Mock jwt
jest.mock("jsonwebtoken");

describe("Authentication Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      path: "/api/test",
      originalUrl: "/api/test",
      headers: {},
      cookies: {},
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  test("should skip auth for excluded paths", () => {
    req.path = "/api/places/autocomplete";
    req.originalUrl = "/api/places/autocomplete?query=test";

    autenticacionToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("should return 401 when no token provided", () => {
    autenticacionToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "No token, autorización denegada",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("should authenticate with valid header token", () => {
    const testUser = { userId: 1, userType: "owner" };
    req.headers.authorization = "Bearer valid-token";

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, testUser);
    });

    autenticacionToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      "valid-token",
      expect.any(String),
      expect.any(Function)
    );
    expect(req.user).toEqual(testUser);
    expect(next).toHaveBeenCalled();
  });

  test("should authenticate with valid cookie token", () => {
    const testUser = { userId: 1, userType: "owner" };
    req.cookies.auth_token = "valid-cookie-token";

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, testUser);
    });

    autenticacionToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      "valid-cookie-token",
      expect.any(String),
      expect.any(Function)
    );
    expect(req.user).toEqual(testUser);
    expect(next).toHaveBeenCalled();
  });

  test("should return 403 for invalid token", () => {
    req.headers.authorization = "Bearer invalid-token";

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(new Error("Invalid token"), null);
    });

    autenticacionToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Token inválido o expirado",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("should prefer header token over cookie token", () => {
    const testUser = { userId: 1, userType: "owner" };
    req.headers.authorization = "Bearer header-token";
    req.cookies.auth_token = "cookie-token";

    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, testUser);
    });

    autenticacionToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      "header-token",
      expect.any(String),
      expect.any(Function)
    );
  });
});
