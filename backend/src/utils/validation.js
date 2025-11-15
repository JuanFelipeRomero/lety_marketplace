/**
 * Validation utilities for authentication
 */

/**
 * Validate login request body
 * @param {Object} body - Request body
 * @returns {Object} - Validation result
 */
export const validateLoginRequest = (body) => {
  const errors = [];

  if (!body) {
    errors.push("Request body is required");
    return { isValid: false, errors };
  }

  const { email, password } = body;

  // Check required fields
  if (!email || email.trim() === "") {
    errors.push("Email is required");
  }

  if (!password || password.trim() === "") {
    errors.push("Password is required");
  }

  // Validate email format
  if (email && !isValidEmail(email)) {
    errors.push("Email format is invalid");
  }

  // Validate password strength
  if (password && !isValidPassword(password)) {
    errors.push("Password must be at least 6 characters long");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Is valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {boolean} - Is valid password
 */
export const isValidPassword = (password) => {
  return !!(password && password.length >= 6);
};

/**
 * Validate clinic status
 * @param {string} estado - Clinic status
 * @returns {boolean} - Is confirmed status
 */
export const isConfirmedClinic = (estado) => {
  return estado === "confirmado";
};
