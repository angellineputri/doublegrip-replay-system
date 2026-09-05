const express = require('express');
const cors = require('cors');
const path = require('path');
const replaysRouter = require('./routes/replays');
const { seedIfEmpty } = require('./seed');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/media', express.static(path.join(__dirname, 'media')));
app.use('/api', replaysRouter);
seedIfEmpty();

// Any replay that was mid-flight when the server last stopped will never get its
// 60s timer fired — mark them abandoned now so the history panel stays honest.
if (process.env.NODE_ENV !== 'test') {
  db.prepare("UPDATE replays SET status = 'abandoned' WHERE status = 'created'").run();
}

app.use((err, req, res, next) => {
  console.error(JSON.stringify({ level: 'error', message: err.message, stack: err.stack }));
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;