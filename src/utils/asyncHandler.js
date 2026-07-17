/**
 * Higher-order function that wraps async Express route handlers.
 * Catches any rejected promise and forwards the error to Express's next()
 * middleware, eliminating repetitive try/catch boilerplate in controllers.
 *
 * @param {Function} fn - Async Express route handler (req, res, next) => Promise
 * @returns {Function} Wrapped handler that catches async errors automatically
 *
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userService.findAll();
 *   res.json(users);
 * }));
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
