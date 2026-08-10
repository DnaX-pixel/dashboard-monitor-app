// Express 4 does not forward rejected promises from async handlers, so an
// unhandled DB error escapes as an unhandledRejection — which Node 22 turns
// into an uncaughtException and kills the whole process (dropping the cron
// scheduler and the Baileys WhatsApp session with it). Wrapping a handler
// routes its rejection to the error middleware in index.js instead.
module.exports = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
