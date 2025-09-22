import { describe, test, expect } from "@jest/globals";
import {
  validateLoginRequest,
  isValidEmail,
  isValidPassword,
  isConfirmedClinic,
} from "../../../src/utils/validation.js";

describe("Validation Utils", () => {
  describe("validateLoginRequest", () => {
    test("should return valid for correct login data", () => {
      const body = {
        email: "test@example.com",
        password: "password123",
      };

      const result = validateLoginRequest(body);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should return invalid when email is missing", () => {
      const body = {
        password: "password123",
      };

      const result = validateLoginRequest(body);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Email is required");
    });

    test("should return invalid when password is missing", () => {
      const body = {
        email: "test@example.com",
      };

      const result = validateLoginRequest(body);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password is required");
    });

    test("should return invalid when both fields are missing", () => {
      const body = {};

      const result = validateLoginRequest(body);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Email is required");
      expect(result.errors).toContain("Password is required");
    });

    test("should return invalid for empty strings", () => {
      const body = {
        email: "",
        password: "",
      };

      const result = validateLoginRequest(body);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Email is required");
      expect(result.errors).toContain("Password is required");
    });

    test("should return invalid for whitespace-only strings", () => {
      const body = {
        email: "   ",
        password: "   ",
      };

      const result = validateLoginRequest(body);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Email is required");
      expect(result.errors).toContain("Password is required");
    });

    test("should return invalid for malformed email", () => {
      const body = {
        email: "invalid-email",
        password: "password123",
      };

      const result = validateLoginRequest(body);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Email format is invalid");
    });

    test("should return invalid for short password", () => {
      const body = {
        email: "test@example.com",
        password: "123",
      };

      const result = validateLoginRequest(body);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must be at least 6 characters long"
      );
    });

    test("should handle null body", () => {
      const result = validateLoginRequest(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Request body is required");
    });

    test("should handle undefined body", () => {
      const result = validateLoginRequest(undefined);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Request body is required");
    });
  });

  describe("isValidEmail", () => {
    test("should return true for valid emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name+tag@domain.co.uk")).toBe(true);
      expect(isValidEmail("user123@test-domain.org")).toBe(true);
    });

    test("should return false for invalid emails", () => {
      expect(isValidEmail("invalid.email")).toBe(false);
      expect(isValidEmail("@domain.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
      expect(isValidEmail("user@@domain.com")).toBe(false);
      expect(isValidEmail("user name@domain.com")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });
  });

  describe("isValidPassword", () => {
    test("should return true for valid passwords", () => {
      expect(isValidPassword("password123")).toBe(true);
      expect(isValidPassword("123456")).toBe(true);
      expect(isValidPassword("abcdef")).toBe(true);
    });

    test("should return false for invalid passwords", () => {
      expect(isValidPassword("12345")).toBe(false);
      expect(isValidPassword("")).toBe(false);
      expect(isValidPassword(null)).toBe(false);
      expect(isValidPassword(undefined)).toBe(false);
    });
  });

  describe("isConfirmedClinic", () => {
    test("should return true for confirmed clinic", () => {
      expect(isConfirmedClinic("confirmado")).toBe(true);
    });

    test("should return false for non-confirmed clinics", () => {
      expect(isConfirmedClinic("pendiente")).toBe(false);
      expect(isConfirmedClinic("rechazado")).toBe(false);
      expect(isConfirmedClinic("")).toBe(false);
      expect(isConfirmedClinic(null)).toBe(false);
      expect(isConfirmedClinic(undefined)).toBe(false);
    });
  });
});
