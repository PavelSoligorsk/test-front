/**
 * @typedef {Object} LoginRequest
 * @property {string} username
 * @property {string} password
 */

/**
 * @typedef {Object} RegisterRequest
 * @property {string} username
 * @property {string} password
 * @property {string} [first_name]
 * @property {string} [last_name]
 * @property {string} [email]
 */

/**
 * @typedef {Object} AuthResponse
 * @property {string} access_token
 * @property {string} token_type
 * @property {number} id
 * @property {string} username
 * @property {string} role
 */

export {};
