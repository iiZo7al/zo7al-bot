'use strict';
class Sessions {
  constructor() { this.active = new Map(); }
  acquire(guildId, channelId, ownerId) {
    const key = `${guildId}:${channelId}`;
    if (this.active.has(key)) return null;
    const session = { key, guildId, channelId, ownerId, stopped: false, controller: new AbortController(), collector: null, timers: new Set(), cleanups: [] };
    this.active.set(key, session);
    return session;
  }
  release(session) {
    if (this.active.get(session.key) === session) this.active.delete(session.key);
    for (const timer of session.timers) clearTimeout(timer);
    session.timers.clear();
  }
  async cancel(session) {
    if (!session || session.stopped) return;
    session.stopped = true;
    session.controller.abort();
    session.collector?.stop('cancelled');
    this.release(session);
    await Promise.allSettled(session.cleanups.map(fn => fn()));
  }
  async cancelGuild(guildId) {
    await Promise.all([...this.active.values()].filter(s => s.guildId === guildId).map(s => this.cancel(s)));
  }
  get(guildId, channelId) { return this.active.get(`${guildId}:${channelId}`); }
}
module.exports = { Sessions };
