// Replaces the Base44 SDK stub. Implements the same call shapes the pages/components
// already use (db.auth.*, db.entities.Room.*, db.entities.Signup.*, db.integrations.Core.UploadFile)
// so no page or component code needs to change — only what's underneath it.

async function request(method, url, body) {
  const opts = {
    method,
    headers: {},
    credentials: 'same-origin',
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function applySort(list, sort) {
  if (!sort) return list;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return [...list].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return 0;
    const cmp = av > bv ? 1 : -1;
    return desc ? -cmp : cmp;
  });
}

const RoomEntity = {
  async list(sort, limit) {
    const rows = await request('GET', '/api/rooms');
    const sorted = applySort(rows, sort);
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  },
  async get(id) {
    return request('GET', `/api/rooms/${id}`);
  },
  async create(data) {
    return request('POST', '/api/rooms', data);
  },
  async update(id, data) {
    return request('PUT', `/api/rooms/${id}`, data);
  },
  async delete(id) {
    return request('DELETE', `/api/rooms/${id}`);
  },
  async bulkUpdate(updates) {
    return request('POST', '/api/rooms/bulk-update', updates);
  },
};

const SignupEntity = {
  async list(sort, limit) {
    const rows = await request('GET', '/api/signups');
    const sorted = applySort(rows, sort);
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  },
  async filter(query = {}) {
    const rows = await request('GET', '/api/signups');
    return rows.filter((r) => Object.entries(query).every(([k, v]) => r[k] === v));
  },
  async create(data) {
    return request('POST', '/api/signups', data);
  },
  async update(id, data) {
    return request('PUT', `/api/signups/${id}`, data);
  },
  async delete(id) {
    return request('DELETE', `/api/signups/${id}`);
  },
  async deleteMany(query = {}) {
    const params = new URLSearchParams(query).toString();
    return request('DELETE', `/api/signups?${params}`);
  },
};

export const db = {
  auth: {
    async isAuthenticated() {
      try {
        await request('GET', '/api/auth/me');
        return true;
      } catch {
        return false;
      }
    },
    async me() {
      return request('GET', '/api/auth/me');
    },
    async loginViaEmailPassword(email, password) {
      return request('POST', '/api/auth/login', { email, password });
    },
    async register({ email, password }) {
      return request('POST', '/api/auth/register', { email, password });
    },
    async resetPasswordRequest(email) {
      return request('POST', '/api/auth/forgot-password', { email });
    },
    async resetPassword({ resetToken, newPassword }) {
      return request('POST', '/api/auth/reset-password', { resetToken, newPassword });
    },
    logout(redirectUrl) {
      request('POST', '/api/auth/logout').finally(() => {
        if (redirectUrl) window.location.href = '/';
      });
    },
    redirectToLogin() {
      window.location.href = '/login';
    },
  },
  entities: {
    Room: RoomEntity,
    Signup: SignupEntity,
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data;
      },
    },
  },
  owner: {
    async login(pin) {
      return request('POST', '/api/owner/login', { pin });
    },
    async logout() {
      return request('POST', '/api/owner/logout');
    },
    async status() {
      return request('GET', '/api/owner/status');
    },
    async changePin(currentPin, newPin) {
      return request('POST', '/api/owner/change-pin', { currentPin, newPin });
    },
  },
};

export default db;
