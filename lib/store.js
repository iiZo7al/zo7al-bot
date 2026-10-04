'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
class Store {
  constructor(config) {
    this.config = config;
    this.state = { points: {}, languages: {} };
    this.queue = Promise.resolve();
  }
  async init() {
    if (this.config.mongo) {
      const mongoose = require('mongoose');
      this.connection = await mongoose.createConnection(this.config.mongo, { serverSelectionTimeoutMS: 10000 }).asPromise();
      this.Point = this.connection.model('point', new mongoose.Schema({ _id: String, points: { type: Number, default: 0 } }));
      this.Lang = this.connection.model('lang', new mongoose.Schema({ _id: String, lang: String }));
      console.log('Zo7al • MongoDB storage ready.');
    } else {
      await fs.mkdir(this.config.dataDir, { recursive: true });
      this.file = path.join(this.config.dataDir, 'zo7al.json');
      try {
        const state = JSON.parse(await fs.readFile(this.file, 'utf8'));
        if (!state.points || !state.languages || Array.isArray(state.points) || Array.isArray(state.languages)
          || Object.values(state.points).some(x=>!Number.isSafeInteger(x) || x<0)
          || Object.values(state.languages).some(x=>!['ar','en'].includes(x))) throw new Error('Invalid data/zo7al.json structure.');
        this.state = state;
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      console.log('Zo7al • Local storage ready.');
    }
    return this;
  }
  async mutate(action) {
    const operation = this.queue.then(async () => {
      const previous = structuredClone(this.state);
      try {
        const result = action();
        await fs.writeFile(`${this.file}.tmp`, JSON.stringify(this.state, null, 2));
        await fs.rename(`${this.file}.tmp`, this.file);
        return result;
      } catch (error) { this.state = previous; throw error; }
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
  async addPoint(id) {
    if (this.Point) {
      const value = await this.Point.findOneAndUpdate({ _id: id }, { $inc: { points: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: false }).lean();
      return value.points;
    }
    return this.mutate(() => (this.state.points[id] = (this.state.points[id] || 0) + 1));
  }
  async points(id) {
    if (this.Point) return (await this.Point.findById(id).lean())?.points || 0;
    await this.queue;
    return this.state.points[id] || 0;
  }
  async top(limit = 10) {
    if (this.Point) return (await this.Point.find({ points: { $gt: 0 } }).sort({ points: -1, _id: 1 }).limit(limit).lean()).map(x => ({ id: x._id, points: x.points }));
    await this.queue;
    return Object.entries(this.state.points).map(([id, points]) => ({ id, points })).filter(x => x.points > 0).sort((a, b) => b.points - a.points || a.id.localeCompare(b.id)).slice(0, limit);
  }
  async language(guildId) {
    if (this.Lang) {
      const value = await this.Lang.findById(guildId).lean();
      return ['ar','en'].includes(value?.lang) ? value.lang : this.config.defaultLanguage;
    }
    await this.queue;
    return this.state.languages[guildId] || this.config.defaultLanguage;
  }
  async setLanguage(guildId, lang) {
    if (!['ar', 'en'].includes(lang)) throw new Error('Unsupported language.');
    if (this.Lang) return this.Lang.findOneAndUpdate({ _id: guildId }, { $set: { lang } }, { upsert: true }).lean();
    return this.mutate(() => { this.state.languages[guildId] = lang; });
  }
  async close() { await this.queue; await this.connection?.close(); }
}
module.exports = { Store };
