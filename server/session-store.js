const { Store } = require('express-session');
const db = require('./db');

const getStmt = db.prepare('SELECT sess, expires FROM sessions WHERE sid = ?');
const setStmt = db.prepare(`
  INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
  ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires
`);
const destroyStmt = db.prepare('DELETE FROM sessions WHERE sid = ?');
const touchStmt = db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
const clearExpiredStmt = db.prepare('DELETE FROM sessions WHERE expires < ?');

class SqliteSessionStore extends Store {
  get(sid, cb) {
    try {
      const row = getStmt.get(sid);
      if (!row) return cb(null, null);
      if (row.expires < Date.now()) {
        destroyStmt.run(sid);
        return cb(null, null);
      }
      cb(null, JSON.parse(row.sess));
    } catch (err) {
      cb(err);
    }
  }

  set(sid, session, cb) {
    try {
      const maxAge = session.cookie?.maxAge || 1000 * 60 * 60 * 24 * 7;
      setStmt.run(sid, JSON.stringify(session), Date.now() + maxAge);
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      destroyStmt.run(sid);
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }

  touch(sid, session, cb) {
    try {
      const maxAge = session.cookie?.maxAge || 1000 * 60 * 60 * 24 * 7;
      touchStmt.run(Date.now() + maxAge, sid);
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }
}

setInterval(() => {
  try { clearExpiredStmt.run(Date.now()); } catch (e) { /* ignore */ }
}, 1000 * 60 * 60).unref();

module.exports = SqliteSessionStore;
