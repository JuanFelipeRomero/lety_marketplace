import { describe, test, expect } from "@jest/globals";
import {
  isValidNIT,
  isValidPhoneNumber,
  isValidEmail,
  isValidTimeFormat,
  isValidCoordinates,
  isValidFileType,
  isValidFileSize,
} from "../../helpers/vetsHelpers.js";

describe("Vets Validation Tests", () => {
  describe("isValidNIT", () => {
    test("should return true for valid NIT formats", () => {
      const validNITs = [
        "123456789-1",
        "987654321-0",
        "111111111-9",
        "000000000-0",
      ];

      validNITs.forEach((nit) => {
        expect(isValidNIT(nit)).toBe(true);
      });
    });

    test("should return false for invalid NIT formats", () => {
      const invalidNITs = [
        "123456789", // Missing dash and check digit
        "123456789-", // Missing check digit
        "12345678-1", // Too few digits before dash
        "1234567890-1", // Too many digits before dash
        "123456789-12", // Too many check digits
        "123456789-a", // Invalid check digit
        "abc456789-1", // Non-numeric characters
        "",
        null,
        undefined,
        "123-456-789-1", // Too many dashes
        "123.456.789-1", // Wrong separator
      ];

      invalidNITs.forEach((nit) => {
        expect(isValidNIT(nit)).toBe(false);
      });
    });
  });

  describe("isValidPhoneNumber", () => {
    test("should return true for valid Colombian mobile numbers", () => {
      const validPhones = [
        "3001234567",
        "3101234567",
        "3201234567",
        "3009999999",
        "3159999999",
      ];

      validPhones.forEach((phone) => {
        expect(isValidPhoneNumber(phone)).toBe(true);
      });
    });

    test("should return false for invalid phone numbers", () => {
      const invalidPhones = [
        "300123456", // Too short
        "30012345678", // Too long
        "2001234567", // Doesn't start with 3
        "4001234567", // Doesn't start with 3
        "300123456a", // Contains letters
        "300-123-4567", // Contains dashes
        "300 123 4567", // Contains spaces
        "+573001234567", // International format
        "",
        null,
        undefined,
        "123",
        "abcdefghij",
      ];

      invalidPhones.forEach((phone) => {
        expect(isValidPhoneNumber(phone)).toBe(false);
      });
    });
  });

  describe("isValidEmail", () => {
    test("should return true for valid email addresses", () => {
      const validEmails = [
        "test@example.com",
        "user@veterinaria.co",
        "admin@clinic.com.co",
        "test.email@domain.com",
        "user+tag@example.org",
        "123@example.com",
      ];

      validEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    test("should return false for invalid email addresses", () => {
      const invalidEmails = [
        "invalid-email",
        "@domain.com",
        "user@",
        "user@domain",
        "user name@domain.com", // Space in local part
        "user@domain .com", // Space in domain
        "user@@domain.com", // Double @
        "",
        null,
        undefined,
        "user@",
        "@domain.com",
        "user@domain@com",
      ];

      invalidEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe("isValidTimeFormat", () => {
    test("should return true for valid time formats", () => {
      const validTimes = ["00:00", "08:30", "12:00", "18:45", "23:59"];

      validTimes.forEach((time) => {
        expect(isValidTimeFormat(time)).toBe(true);
      });
    });

    test("should return false for invalid time formats", () => {
      const invalidTimes = [
        "24:00", // Invalid hour
        "25:30", // Invalid hour
        "12:60", // Invalid minute
        "8:30", // Missing leading zero for hour
        "08:5", // Missing leading zero for minute
        "8:5", // Missing leading zeros
        "08:30:00", // Includes seconds
        "08.30", // Wrong separator
        "08-30", // Wrong separator
        "invalid",
        "",
        null,
        undefined,
      ];

      invalidTimes.forEach((time) => {
        expect(isValidTimeFormat(time)).toBe(false);
      });
    });
  });

  describe("isValidCoordinates", () => {
    test("should return true for valid latitude and longitude", () => {
      const validCoordinates = [
        [4.6097, -74.0817], // Bogotá
        [0, 0], // Equator and Prime Meridian
        [90, 180], // North Pole, Date Line
        [-90, -180], // South Pole, Date Line
        [45.5, -122.6], // Portland
        [-34.6, -58.4], // Buenos Aires
      ];

      validCoordinates.forEach(([lat, lng]) => {
        expect(isValidCoordinates(lat, lng)).toBe(true);
      });
    });

    test("should return false for invalid coordinates", () => {
      const invalidCoordinates = [
        [91, 0], // Latitude too high
        [-91, 0], // Latitude too low
        [0, 181], // Longitude too high
        [0, -181], // Longitude too low
        ["4.6097", "-74.0817"], // String values
        [null, null], // Null values
        [undefined, undefined], // Undefined values
        [NaN, NaN], // NaN values
        [4.6097], // Missing longitude
        [], // Empty array
      ];

      invalidCoordinates.forEach((coords) => {
        if (Array.isArray(coords) && coords.length >= 2) {
          expect(isValidCoordinates(coords[0], coords[1])).toBe(false);
        } else if (Array.isArray(coords)) {
          expect(isValidCoordinates(coords[0], coords[1])).toBe(false);
        } else {
          // For non-array values, test with undefined parameters
          expect(isValidCoordinates(undefined, undefined)).toBe(false);
        }
      });
    });
  });

  describe("isValidFileType", () => {
    test("should return true for allowed file types", () => {
      const validTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
      ];

      validTypes.forEach((type) => {
        expect(isValidFileType(type)).toBe(true);
      });
    });

    test("should return false for disallowed file types", () => {
      const invalidTypes = [
        "application/msword",
        "text/plain",
        "video/mp4",
        "audio/mpeg",
        "application/zip",
        "image/gif", // Not in allowed list
        "image/bmp", // Not in allowed list
        "",
        null,
        undefined,
        "invalid/type",
      ];

      invalidTypes.forEach((type) => {
        expect(isValidFileType(type)).toBe(false);
      });
    });
  });

  describe("isValidFileSize", () => {
    test("should return true for files within size limit", () => {
      const validSizes = [
        1024, // 1KB
        1024 * 1024, // 1MB
        5 * 1024 * 1024, // 5MB
        10 * 1024 * 1024 - 1, // Just under 10MB
      ];

      validSizes.forEach((size) => {
        expect(isValidFileSize(size)).toBe(true);
      });
    });

    test("should return true for files within custom size limit", () => {
      const size = 20 * 1024 * 1024; // 20MB
      const customLimit = 25; // 25MB limit

      expect(isValidFileSize(size, customLimit)).toBe(true);
    });

    test("should return false for files exceeding size limit", () => {
      const invalidSizes = [
        10 * 1024 * 1024 + 1, // Just over 10MB
        20 * 1024 * 1024, // 20MB
        50 * 1024 * 1024, // 50MB
      ];

      invalidSizes.forEach((size) => {
        expect(isValidFileSize(size)).toBe(false);
      });
    });

    test("should handle edge cases", () => {
      expect(isValidFileSize(0)).toBe(true); // Empty file
      expect(isValidFileSize(10 * 1024 * 1024)).toBe(true); // Exactly 10MB
      expect(isValidFileSize(-1)).toBe(true); // Negative size (technically passes)
    });
  });

  describe("Coordinate Edge Cases", () => {
    test("should handle boundary values correctly", () => {
      // Exact boundaries
      expect(isValidCoordinates(90, 180)).toBe(true);
      expect(isValidCoordinates(-90, -180)).toBe(true);
      expect(isValidCoordinates(0, 0)).toBe(true);

      // Just over boundaries
      expect(isValidCoordinates(90.1, 180)).toBe(false);
      expect(isValidCoordinates(90, 180.1)).toBe(false);
      expect(isValidCoordinates(-90.1, -180)).toBe(false);
      expect(isValidCoordinates(-90, -180.1)).toBe(false);
    });

    test("should handle floating point precision", () => {
      expect(isValidCoordinates(4.123456789, -74.987654321)).toBe(true);
      expect(isValidCoordinates(89.9999999, 179.9999999)).toBe(true);
    });
  });

  describe("Time Format Edge Cases", () => {
    test("should validate boundary times", () => {
      expect(isValidTimeFormat("00:00")).toBe(true);
      expect(isValidTimeFormat("23:59")).toBe(true);
      expect(isValidTimeFormat("24:00")).toBe(false);
      expect(isValidTimeFormat("00:60")).toBe(false);
    });

    test("should require exact format", () => {
      expect(isValidTimeFormat("8:30")).toBe(false); // Missing leading zero
      expect(isValidTimeFormat("08:5")).toBe(false); // Missing leading zero
      expect(isValidTimeFormat("08:30:00")).toBe(false); // Has seconds
      expect(isValidTimeFormat("8:05")).toBe(false); // Missing leading zero for hour
    });
  });

  describe("NIT Edge Cases", () => {
    test("should validate check digit position", () => {
      expect(isValidNIT("123456789-1")).toBe(true);
      expect(isValidNIT("123456789-0")).toBe(true);
      expect(isValidNIT("123456789-9")).toBe(true);
      expect(isValidNIT("123456789-10")).toBe(false); // Two digit check
      expect(isValidNIT("123456789-")).toBe(false); // Missing check digit
    });

    test("should validate exact format requirements", () => {
      expect(isValidNIT("12345678-1")).toBe(false); // 8 digits instead of 9
      expect(isValidNIT("1234567890-1")).toBe(false); // 10 digits instead of 9
      expect(isValidNIT("123-456-789-1")).toBe(false); // Multiple dashes
      expect(isValidNIT("123456789_1")).toBe(false); // Underscore instead of dash
    });
  });

  describe("Email Edge Cases", () => {
    test("should handle complex valid emails", () => {
      const complexValidEmails = [
        "test.email+tag@domain.co.uk",
        "user123@sub.domain.com",
        "a@b.co", // Minimal valid email
        "very.long.email.address@very.long.domain.name.com",
      ];

      complexValidEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    test("should reject tricky invalid emails", () => {
      const trickyInvalidEmails = [
        "user@domain.", // Ends with dot
        ".user@domain.com", // Starts with dot
        "user.@domain.com", // Ends with dot before @
        "user..double@domain.com", // Double dots
        "user@domain..com", // Double dots in domain
      ];

      trickyInvalidEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe("File Validation Combined Tests", () => {
    test("should validate common certificate file scenarios", () => {
      // Valid certificate scenarios
      expect(
        isValidFileType("application/pdf") && isValidFileSize(2 * 1024 * 1024)
      ).toBe(true);
      expect(
        isValidFileType("image/jpeg") && isValidFileSize(5 * 1024 * 1024)
      ).toBe(true);

      // Invalid scenarios
      expect(
        isValidFileType("application/pdf") && isValidFileSize(20 * 1024 * 1024)
      ).toBe(false); // Too large
      expect(
        isValidFileType("text/plain") && isValidFileSize(1 * 1024 * 1024)
      ).toBe(false); // Wrong type
    });
  });
});
