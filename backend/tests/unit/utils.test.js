import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  uploadFile,
  deleteFile,
  getFilePathFromUrl,
  validateDate,
} from "../../src/utils.js";
import { createMockSupabaseClient } from "../helpers/testHelpers.js";

// Mock Supabase client
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

// Mock fs module
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  createReadStream: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe("Utils Functions", () => {
  let mockSupabaseClient;
  let mockFs;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    mockFs = require("fs");
  });

  describe("validateDate", () => {
    test("should return true for valid date string", () => {
      expect(validateDate("2024-01-15")).toBe(true);
      expect(validateDate("2024-01-15T10:30:00Z")).toBe(true);
    });

    test("should return false for invalid date string", () => {
      expect(validateDate("invalid-date")).toBe(false);
      expect(validateDate("2024-13-45")).toBe(false);
    });

    test("should return true for null or undefined", () => {
      expect(validateDate(null)).toBe(true);
      expect(validateDate(undefined)).toBe(true);
      expect(validateDate("")).toBe(true);
    });
  });

  describe("getFilePathFromUrl", () => {
    const testBucketName = "test-bucket";
    // Use the actual SUPABASE_URL from environment
    const supabaseUrl = process.env.SUPABASE_URL;

    test("should extract file path from valid URL", () => {
      const url = `${supabaseUrl}/storage/v1/object/public/${testBucketName}/path/to/file.jpg`;
      const result = getFilePathFromUrl(url, testBucketName);
      expect(result).toBe("path/to/file.jpg");
    });

    test("should handle URL encoded paths", () => {
      const url = `${supabaseUrl}/storage/v1/object/public/${testBucketName}/path%20with%20spaces/file.jpg`;
      const result = getFilePathFromUrl(url, testBucketName);
      expect(result).toBe("path with spaces/file.jpg");
    });

    test("should return null for invalid URL", () => {
      const invalidUrl = "https://other-domain.com/file.jpg";
      const result = getFilePathFromUrl(invalidUrl, testBucketName);
      expect(result).toBe(null);
    });

    test("should return null for null/undefined inputs", () => {
      expect(getFilePathFromUrl(null, testBucketName)).toBe(null);
      expect(getFilePathFromUrl("valid-url", null)).toBe(null);
    });
  });

  describe("uploadFile", () => {
    test("should return null for invalid file object", async () => {
      const result = await uploadFile(null, "test-bucket");
      expect(result).toBe(null);
    });

    test("should return null when file path does not exist", async () => {
      mockFs.existsSync.mockReturnValue(false);

      const file = {
        path: "/nonexistent/path",
        originalname: "test.jpg",
        mimetype: "image/jpeg",
      };

      const result = await uploadFile(file, "test-bucket");
      expect(result).toBe(null);
    });
  });

  describe("deleteFile", () => {
    test("should return true for null file path", async () => {
      const result = await deleteFile(null, "test-bucket");
      expect(result).toBe(true);
    });

    test("should return true for empty file path", async () => {
      const result = await deleteFile("", "test-bucket");
      expect(result).toBe(true);
    });
  });
});
