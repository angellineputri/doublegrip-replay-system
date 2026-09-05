'use strict';

function log(level, message, meta = {}) {
  const entry = { timestamp: new Date().toISOString(), level, message, ...meta };
  const out = JSON.stringify(entry);
  if (level === 'error') {
    console.error(out);
  } else {
    console.log(out);
  }
}

module.exports = { log };
