const express = require('express');
const cors = require('cors');
const path = require('path');
const replaysRouter = require('./routes/replays');
const { seedIfEmpty } = require('./seed');
const db = require('./db');
const { log } = require('./logger');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/media', express.static(path.join(__dirname, 'media')));
app.use('/api', replaysRouter);
seedIfEmpty();

if (process.env.NODE_ENV !== 'test') {
  // Any replay that was mid-flight when the server last stopped will never get its
  // 60s timer fired — mark them abandoned now so the history panel stays honest.
  const { changes } = db.prepare("UPDATE replays SET status = 'abandoned' WHERE status = 'created'").run();
  if (changes > 0) {
    log('warn', 'startup reconciliation — in-flight replays marked abandoned', { count: changes });
  }
  log('info', 'server ready');
}

app.use((err, req, res, next) => {
  log('error', err.message, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => log('info', 'server listening', { port: PORT }));
}

module.exports = app;