import { describe, test, expect } from "@jest/globals";
import {
  isValidPetSpecies,
  isValidPetGender,
  isValidPetAge,
  isValidPetWeight,
  isValidPetName,
  isValidPetBreed,
} from "../../helpers/mascotasHelpers.js";

describe("Mascotas Validation Utils", () => {
  describe("isValidPetSpecies", () => {
    test("should return true for valid pet species", () => {
      const validSpecies = [
        "Perro",
        "Gato",
        "Conejo",
        "Hamster",
        "Pájaro",
        "Otro",
      ];

      validSpecies.forEach((species) => {
        expect(isValidPetSpecies(species)).toBe(true);
      });
    });

    test("should return false for invalid pet species", () => {
      const invalidSpecies = [
        "",
        "perro",
        "GATO",
        "Dragon",
        "Unicornio",
        null,
        undefined,
      ];

      invalidSpecies.forEach((species) => {
        expect(isValidPetSpecies(species)).toBe(false);
      });
    });

    test("should be case sensitive", () => {
      expect(isValidPetSpecies("perro")).toBe(false);
      expect(isValidPetSpecies("Perro")).toBe(true);
      expect(isValidPetSpecies("PERRO")).toBe(false);
    });
  });

  describe("isValidPetGender", () => {
    test("should return true for valid genders", () => {
      expect(isValidPetGender("Macho")).toBe(true);
      expect(isValidPetGender("Hembra")).toBe(true);
    });

    test("should return false for invalid genders", () => {
      const invalidGenders = [
        "",
        "macho",
        "hembra",
        "M",
        "F",
        "Male",
        "Female",
        null,
        undefined,
      ];

      invalidGenders.forEach((gender) => {
        expect(isValidPetGender(gender)).toBe(false);
      });
    });

    test("should be case sensitive", () => {
      expect(isValidPetGender("macho")).toBe(false);
      expect(isValidPetGender("MACHO")).toBe(false);
      expect(isValidPetGender("Macho")).toBe(true);
    });
  });

  describe("isValidPetAge", () => {
    test("should return true for valid ages", () => {
      const validAges = [1, 5, 10, 15, 20, 25, 30, "1", "15", "30"];

      validAges.forEach((age) => {
        expect(isValidPetAge(age)).toBe(true);
      });
    });

    test("should return false for invalid ages", () => {
      const invalidAges = [
        0,
        -1,
        31,
        100,
        "",
        "abc",
        null,
        undefined,
        "0",
        "-5",
      ];

      invalidAges.forEach((age) => {
        expect(isValidPetAge(age)).toBe(false);
      });
    });

    test("should handle string numbers correctly", () => {
      expect(isValidPetAge("5")).toBe(true);
      expect(isValidPetAge("15")).toBe(true);
      expect(isValidPetAge("0")).toBe(false);
      expect(isValidPetAge("31")).toBe(false);
    });

    test("should handle edge cases", () => {
      expect(isValidPetAge(1)).toBe(true);
      expect(isValidPetAge(30)).toBe(true);
      expect(isValidPetAge(0.5)).toBe(false); // Should be integer
      expect(isValidPetAge(30.5)).toBe(false); // Should be integer
    });
  });

  describe("isValidPetWeight", () => {
    test("should return true for valid weights", () => {
      const validWeights = [
        0.1,
        1,
        5.5,
        10,
        25.7,
        50,
        100,
        200,
        "1.5",
        "25",
        "100.5",
      ];

      validWeights.forEach((weight) => {
        expect(isValidPetWeight(weight)).toBe(true);
      });
    });

    test("should return false for invalid weights", () => {
      const invalidWeights = [
        0,
        -1,
        -5.5,
        201,
        1000,
        "",
        "abc",
        null,
        undefined,
        "0",
        "-10",
      ];

      invalidWeights.forEach((weight) => {
        expect(isValidPetWeight(weight)).toBe(false);
      });
    });

    test("should handle string numbers correctly", () => {
      expect(isValidPetWeight("5.5")).toBe(true);
      expect(isValidPetWeight("25")).toBe(true);
      expect(isValidPetWeight("0")).toBe(false);
      expect(isValidPetWeight("201")).toBe(false);
    });

    test("should handle decimal weights", () => {
      expect(isValidPetWeight(0.1)).toBe(true);
      expect(isValidPetWeight(5.75)).toBe(true);
      expect(isValidPetWeight(199.99)).toBe(true);
      expect(isValidPetWeight(200.0)).toBe(true);
      expect(isValidPetWeight(200.01)).toBe(false);
    });

    test("should handle edge cases", () => {
      expect(isValidPetWeight(0.01)).toBe(true);
      expect(isValidPetWeight(200)).toBe(true);
      expect(isValidPetWeight(0)).toBe(false);
      expect(isValidPetWeight(200.1)).toBe(false);
    });
  });

  describe("isValidPetName", () => {
    test("should return true for valid names", () => {
      const validNames = [
        "Fluffy",
        "Max",
        "Luna",
        "Bella Estrella",
        "Rocky Jr.",
        "A",
        "Very Long Pet Name That Is Still Valid But Almost At The Limit Of One Hundred Characters Long",
      ];

      validNames.forEach((name) => {
        expect(isValidPetName(name)).toBe(true);
      });
    });

    test("should return false for invalid names", () => {
      const invalidNames = [
        "",
        "   ",
        null,
        undefined,
        123,
        "This name is way too long and exceeds the maximum limit of one hundred characters which should not be allowed",
      ];

      invalidNames.forEach((name) => {
        expect(isValidPetName(name)).toBe(false);
      });
    });

    test("should handle whitespace correctly", () => {
      expect(isValidPetName("  Fluffy  ")).toBe(true); // Trimmed name is valid
      expect(isValidPetName("   ")).toBe(false); // Only whitespace
      expect(isValidPetName("")).toBe(false); // Empty string
    });

    test("should handle special characters", () => {
      expect(isValidPetName("Max Jr.")).toBe(true);
      expect(isValidPetName("Luna-Belle")).toBe(true);
      expect(isValidPetName("Rocky O'Connor")).toBe(true);
      expect(isValidPetName("Pet #1")).toBe(true);
    });

    test("should enforce length limits", () => {
      const exactlyHundredChars = "A".repeat(100);
      const oneHundredOneChars = "A".repeat(101);

      expect(isValidPetName(exactlyHundredChars)).toBe(true);
      expect(isValidPetName(oneHundredOneChars)).toBe(false);
    });
  });

  describe("isValidPetBreed", () => {
    test("should return true for valid breeds", () => {
      const validBreeds = [
        "Golden Retriever",
        "Siamese",
        "Persian",
        "Mestizo",
        "Mixed",
        "A",
        "Very Long Breed Name That Is Still Valid But Almost At The Limit Of One Hundred Characters",
      ];

      validBreeds.forEach((breed) => {
        expect(isValidPetBreed(breed)).toBe(true);
      });
    });

    test("should return false for invalid breeds", () => {
      const invalidBreeds = [
        "",
        "   ",
        null,
        undefined,
        123,
        "This breed name is way too long and exceeds the maximum limit of one hundred characters which is not allowed",
      ];

      invalidBreeds.forEach((breed) => {
        expect(isValidPetBreed(breed)).toBe(false);
      });
    });

    test("should handle whitespace correctly", () => {
      expect(isValidPetBreed("  Golden Retriever  ")).toBe(true); // Trimmed breed is valid
      expect(isValidPetBreed("   ")).toBe(false); // Only whitespace
      expect(isValidPetBreed("")).toBe(false); // Empty string
    });

    test("should handle special characters", () => {
      expect(isValidPetBreed("St. Bernard")).toBe(true);
      expect(isValidPetBreed("Jack-Russell")).toBe(true);
      expect(isValidPetBreed("Maine Coon")).toBe(true);
      expect(isValidPetBreed("Breed #1")).toBe(true);
    });

    test("should enforce length limits", () => {
      const exactlyHundredChars = "B".repeat(100);
      const oneHundredOneChars = "B".repeat(101);

      expect(isValidPetBreed(exactlyHundredChars)).toBe(true);
      expect(isValidPetBreed(oneHundredOneChars)).toBe(false);
    });
  });

  describe("Validation integration scenarios", () => {
    test("should validate complete pet data correctly", () => {
      const validPetData = {
        petName: "Luna",
        petAge: "3",
        petBreed: "Golden Retriever",
        petSpecies: "Perro",
        petGender: "Hembra",
        petWeight: "25.5",
      };

      expect(isValidPetName(validPetData.petName)).toBe(true);
      expect(isValidPetAge(validPetData.petAge)).toBe(true);
      expect(isValidPetBreed(validPetData.petBreed)).toBe(true);
      expect(isValidPetSpecies(validPetData.petSpecies)).toBe(true);
      expect(isValidPetGender(validPetData.petGender)).toBe(true);
      expect(isValidPetWeight(validPetData.petWeight)).toBe(true);
    });

    test("should detect invalid pet data correctly", () => {
      const invalidPetData = {
        petName: "",
        petAge: "0",
        petBreed: "",
        petSpecies: "Dragon",
        petGender: "Other",
        petWeight: "0",
      };

      expect(isValidPetName(invalidPetData.petName)).toBe(false);
      expect(isValidPetAge(invalidPetData.petAge)).toBe(false);
      expect(isValidPetBreed(invalidPetData.petBreed)).toBe(false);
      expect(isValidPetSpecies(invalidPetData.petSpecies)).toBe(false);
      expect(isValidPetGender(invalidPetData.petGender)).toBe(false);
      expect(isValidPetWeight(invalidPetData.petWeight)).toBe(false);
    });

    test("should validate different pet types correctly", () => {
      const dogData = {
        petSpecies: "Perro",
        petBreed: "Golden Retriever",
        petWeight: "30",
      };

      const catData = {
        petSpecies: "Gato",
        petBreed: "Persian",
        petWeight: "4.5",
      };

      const rabbitData = {
        petSpecies: "Conejo",
        petBreed: "Holland Lop",
        petWeight: "2.1",
      };

      expect(isValidPetSpecies(dogData.petSpecies)).toBe(true);
      expect(isValidPetBreed(dogData.petBreed)).toBe(true);
      expect(isValidPetWeight(dogData.petWeight)).toBe(true);

      expect(isValidPetSpecies(catData.petSpecies)).toBe(true);
      expect(isValidPetBreed(catData.petBreed)).toBe(true);
      expect(isValidPetWeight(catData.petWeight)).toBe(true);

      expect(isValidPetSpecies(rabbitData.petSpecies)).toBe(true);
      expect(isValidPetBreed(rabbitData.petBreed)).toBe(true);
      expect(isValidPetWeight(rabbitData.petWeight)).toBe(true);
    });
  });
});
