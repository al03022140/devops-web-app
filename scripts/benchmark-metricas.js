import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin1234!';

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map(arg => {
      const [k, v] = arg.replace(/^--/, '').split('=');
      return [k, v === undefined ? true : v];
    })
  );
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const defaultSemana = `${yyyy}-${mm}-${dd}`;
  return {
    iterations: Number(args.iterations ?? 3),
    concurrent: Number(args.concurrent ?? 1),
    warmup: Number(args.warmup ?? 1),
    semana: String(args.semana ?? defaultSemana),
    verbose: args.verbose === 'true' || args.verbose === true || false
  };
}

async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login fallo: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.token;
}

async function recalc(token, semana) {
  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}/api/metricas/semanales/recalcular?semana=${encodeURIComponent(semana)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const t1 = Date.now();
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Recalculo fallo: ${res.status} ${text}`);
  }
  return t1 - t0;
}

async function getMetrics(token) {
  const res = await fetch(`${BASE_URL}/api/metricas/semanales`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET metricas fallo: ${res.status} ${text}`);
  }
  const data = await res.json(); // { items, total, page, limit }
  return data;
}

async function run() {
  const { iterations, concurrent, warmup, verbose, semana } = parseArgs();
  console.log(`→ Benchmark métricas semanales: iterations=${iterations}, concurrent=${concurrent}, warmup=${warmup}, semana=${semana}, BASE_URL=${BASE_URL}`);
  const token = await login();

  // Warmup
  for (let i = 0; i < warmup; i++) {
    await recalc(token, semana);
  }

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const batch = Array.from({ length: concurrent }, () => recalc(token, semana));
    const results = await Promise.all(batch);
    const max = Math.max(...results);
    const min = Math.min(...results);
    const avg = results.reduce((a,b) => a+b, 0) / results.length;
    times.push(...results);
    if (verbose) {
      console.log(`   • Iteración ${i+1}: min=${min}ms avg=${avg.toFixed(2)}ms max=${max}ms`);
    }
  }

  const globalMax = Math.max(...times);
  const globalMin = Math.min(...times);
  const globalAvg = times.reduce((a,b)=>a+b,0)/times.length;
  console.log(`✔️  Resultado: min=${globalMin}ms avg=${globalAvg.toFixed(2)}ms max=${globalMax}ms muestras=${times.length}`);

  // Validar forma de datos
  const sampleData = await getMetrics(token);
  const items = Array.isArray(sampleData.items) ? sampleData.items : [];
  console.log(`Métricas disponibles: ${items.length} semanas (ejemplo semana_inicio=${items[0]?.semana_inicio ?? 'N/A'})`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});