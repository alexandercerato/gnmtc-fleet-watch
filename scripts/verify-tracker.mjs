// Isolated integration checks: real SQLite, real writer validation, no web server.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { build } = require(require.resolve('esbuild', { paths: [require.resolve('wrangler/package.json')] }));

const sql = new DatabaseSync(':memory:');
sql.exec(readFileSync('drizzle/0000_motionless_changeling.sql', 'utf8'));
class Statement {
  constructor(query, params = []) { this.query = query; this.params = params; }
  bind(...params) { return new Statement(this.query, params); }
  async first() { return sql.prepare(this.query).get(...this.params) ?? null; }
  async all() { return { results: sql.prepare(this.query).all(...this.params) }; }
  async run() { sql.prepare(this.query).run(...this.params); return { success: true }; }
}
globalThis.__fleetQaEnv = { DB: { prepare: q => new Statement(q), async batch(statements) { sql.exec('BEGIN'); try { for (const s of statements) await s.run(); sql.exec('COMMIT'); } catch (e) { sql.exec('ROLLBACK'); throw e; } return statements.map(() => ({ success: true })); } } };
const result = await build({ stdin: { contents: 'export {POST} from "./app/api/updates/route.ts"; export {updateGuide} from "./lib/update-guide.ts";', resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false, plugins: [{ name: 'isolated-d1', setup(b) { b.onResolve({filter:/^cloudflare:workers$/}, () => ({path:'cloudflare:workers',namespace:'test'})); b.onLoad({filter:/.*/,namespace:'test'}, () => ({contents:'export const env = globalThis.__fleetQaEnv;',loader:'js'})); } }] });
const { POST, updateGuide } = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].contents).toString('base64'));
const seed = JSON.parse(readFileSync('lib/fleet-seed.json', 'utf8'));
assert.equal(seed.vessels.length, 18);
assert.equal(new Set(seed.vessels.map(v => v.imo)).size, 18);
for (const {imo} of seed.vessels) assert.equal([...imo.slice(0,6)].reduce((s,n,i) => s + Number(n)*(7-i),0)%10, Number(imo[6]), 'valid IMO check digit');
const now = () => new Date().toISOString();
const observation = Object.fromEntries(updateGuide.observationFields.map(k => [k, seed.vessels[0][k]]));
observation.sourceCheckedAt = now();
async function write(payload, origin) { const r = await POST(new Request('https://fleet.example/api/updates', { method: 'POST', headers: {'Content-Type':'application/json', ...(origin ? {Origin:origin} : {})}, body:JSON.stringify(payload) })); return {status:r.status,body:await r.json()}; }
const payload = {runId:'qa-initial-check',observations:[observation],failures:[]};
assert.equal((await write(payload)).status,200);
assert.equal((await write(payload)).body.duplicate,true);
assert.equal((await write(payload,'https://other.example')).status,403);
assert.equal((await write({runId:'qa-bad-imo',observations:[{...observation,imo:'0000000'}]})).status,400);
assert.equal((await write({runId:'qa-duplicate-imo',observations:[observation,observation]})).status,400);
assert.equal((await write({runId:'qa-future',observations:[{...observation,sourceCheckedAt:new Date(Date.now()+3600000).toISOString()}]})).status,400);
assert.equal((await write({runId:'qa-bad-null',observations:[{...observation,destinationKind:'unavailable'}]})).status,400);
assert.equal((await write({runId:'qa-bad-source',observations:[{...observation,sourceUrl:'javascript:alert(1)'}]})).status,400);
const checkTime = observation.sourceCheckedAt;
await write({runId:'qa-failed-check',observations:[],failures:[{imo:observation.imo,checkedAt:now(),message:'Source unavailable during isolated QA'}]});
let saved = JSON.parse(sql.prepare('SELECT payload FROM vessel_states WHERE imo = ?').get(observation.imo).payload);
assert.equal(saved.sourceCheckedAt,checkTime); assert.equal(saved.destinationPort,observation.destinationPort); assert.ok(saved.checkError);
assert.equal((await write({runId:'qa-older-check',observations:[{...observation,sourceCheckedAt:'2020-01-01T00:00:00Z',destinationPort:'Outdated port'}]})).body.verified,0);
await write({runId:'qa-real-change',observations:[{...observation,sourceCheckedAt:now(),destinationPort:'Isolated QA new port'}]});
saved = JSON.parse(sql.prepare('SELECT payload FROM vessel_states WHERE imo = ?').get(observation.imo).payload);
assert.equal(saved.destinationPort,'Isolated QA new port');
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM destination_changes').get().n,1);
await write({runId:'qa-unavailable-destination',observations:[{...observation,sourceCheckedAt:now(),destinationPort:null,destinationCountry:null,destinationKind:'unavailable'}]});
saved = JSON.parse(sql.prepare('SELECT payload FROM vessel_states WHERE imo = ?').get(observation.imo).payload);
assert.equal(saved.destinationPort,null); assert.equal(saved.checkError,null);
sql.close(); delete globalThis.__fleetQaEnv;
console.log('PASS: 18 valid IMOs; writer/readback; retries; origin/invalid/duplicate/future/source rejection; failed-check preservation; stale-update rejection; change history; explicit unavailable destinations.');
