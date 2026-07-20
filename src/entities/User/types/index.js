/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} username
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} role - 'student' | 'teacher' | 'admin'
 * @property {string} [phone]
 * @property {string} [tg_username]
 */

/**
 * @typedef {Object} UserStats
 * @property {number} total_attempts
 * @property {number} avg_score
 * @property {number} [best_score]
 * @property {number} [total_tasks]
 * @property {number} [correct_tasks]
 * @property {number} [streak_days]
 */

/**
 * @typedef {Object} SessionData
 * @property {string} username
 * @property {string} role
 * @property {string} token
 */

export {};
