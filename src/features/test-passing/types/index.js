/**
 * @typedef {Object} TestMeta
 * @property {number} id
 * @property {string} title
 * @property {string} topic
 * @property {number} task_count
 * @property {number} [time_limit]
 */

/**
 * @typedef {Object} Assignment
 * @property {number} id
 * @property {string} title
 * @property {string} group_name
 * @property {string} deadline
 * @property {string} status
 */

/**
 * @typedef {Object} TestQuestion
 * @property {number} id
 * @property {string} question
 * @property {string} type
 * @property {string[]} options
 * @property {string} [image_url]
 * @property {number} [difficulty]
 */

/**
 * @typedef {Object} TestResult
 * @property {number} id
 * @property {number} score
 * @property {number} total
 * @property {number} percent
 * @property {string} status
 * @property {Object[]} answers
 */

export {};
