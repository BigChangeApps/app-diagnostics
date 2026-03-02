'use strict';

// ---------------------------------------------------------------------------
// Endpoint definitions per environment
// ---------------------------------------------------------------------------
const ENVIRONMENTS = {
  prod: {
    device:    'device.bigchange.com',
    nodejs:    'nodejs.bigchange.com',
    clients:   'clients.bigchange.com',
    cdn:       'cdn.bigchange.com',
    help:      'help.bigchange.com',
  },
  beta: {
    device:    'beta.device.bigchange.com',
    nodejs:    'beta.nodejs.bigchange.com',
    clients:   'beta.clients.bigchange.com',
    cdn:       'cdn.bigchange.com',
    help:      'help.bigchange.com',
  },
  test: {
    device:    'device.test.bigchange.com',
    nodejs:    'test.nodejs.bigchange.com',
    clients:   'test.clients.bigchange.com',
    cdn:       'cdn.bigchange.com',
    help:      'help.bigchange.com',
  },
  alpha: {
    device:    'alpha-device.test.bigchange.com',
    nodejs:    'nodejs.alpha.bigchange.com',
    clients:   'test.clients.bigchange.com',
    cdn:       'cdn.bigchange.com',
    help:      'help.bigchange.com',
  },
};

// Third-party endpoints (same for all environments)
const THIRD_PARTY = {
  realm:        'realm.mongodb.com',
  mongodb:      'services.cloud.mongodb.com',
  s3:           's3-eu-west-1.amazonaws.com',
  googleMaps:   'maps.googleapis.com',
  firebase:     'firebaseinstallations.googleapis.com',
  fcm:          'fcm.googleapis.com',
  pendo:        'app.pendo.io',
  playStore:    'play.google.com',
};

function buildChecks(env) {
  const e = ENVIRONMENTS[env];
  return [
    // BigChange core
    {
      group: 'BigChange Core Services',
      checks: [
        {
          name: 'Device Service API',
          url: `https://${e.device}/S01.ashx`,
          host: e.device,
          critical: true,
          description: 'Primary API endpoint for all device sync, asset sync, job data',
        },
        {
          name: 'Device Service API (root)',
          url: `https://${e.device}/`,
          host: e.device,
          critical: true,
          description: 'Retrofit base URL',
        },
        {
          name: 'Node.js / Socket.IO',
          url: `https://${e.nodejs}/`,
          host: e.nodejs,
          critical: true,
          description: 'Real-time notifications, hypertracking, outbox push',
        },
        {
          name: 'WebSocket (Socket.IO)',
          url: `wss://${e.nodejs}/socket.io/?EIO=4&transport=websocket`,
          host: e.nodejs,
          critical: true,
          type: 'websocket',
          description: 'Socket.IO WebSocket transport',
        },
        {
          name: 'Client Portal / Attachments',
          url: `https://${e.clients}/`,
          host: e.clients,
          critical: false,
          description: 'Job attachment viewer (WebView)',
        },
        {
          name: 'CDN (static assets)',
          url: `https://${e.cdn}/`,
          host: e.cdn,
          critical: false,
          description: 'Resource icons and static images',
        },
        {
          name: 'Help Centre',
          url: `https://${e.help}/`,
          host: e.help,
          critical: false,
          description: 'In-app help articles',
        },
      ],
    },
    // Third-party services
    {
      group: 'Third-Party Services',
      checks: [
        {
          name: 'MongoDB Atlas / Realm Sync',
          url: `https://${THIRD_PARTY.realm}/`,
          host: THIRD_PARTY.realm,
          critical: true,
          description: 'Realm Device Sync (jobs, tasks)',
        },
        {
          name: 'MongoDB Cloud Services',
          url: `https://${THIRD_PARTY.mongodb}/`,
          host: THIRD_PARTY.mongodb,
          critical: true,
          description: 'Atlas App Services backend',
        },
        {
          name: 'AWS S3 (eu-west-1)',
          url: `https://${THIRD_PARTY.s3}/`,
          host: THIRD_PARTY.s3,
          critical: true,
          description: 'Photo upload/download via presigned URLs',
        },
        {
          name: 'Google Maps API',
          url: `https://${THIRD_PARTY.googleMaps}/`,
          host: THIRD_PARTY.googleMaps,
          critical: false,
          description: 'Reverse geocoding and map tiles',
        },
        {
          name: 'Firebase / Google Services',
          url: `https://${THIRD_PARTY.firebase}/`,
          host: THIRD_PARTY.firebase,
          critical: false,
          description: 'Firebase installations, analytics, crashlytics',
        },
        {
          name: 'Firebase Cloud Messaging',
          url: `https://${THIRD_PARTY.fcm}/`,
          host: THIRD_PARTY.fcm,
          critical: false,
          description: 'Push notifications',
        },
        {
          name: 'Pendo Analytics',
          url: `https://${THIRD_PARTY.pendo}/`,
          host: THIRD_PARTY.pendo,
          critical: false,
          description: 'Product analytics SDK',
        },
        {
          name: 'Google Play Store',
          url: `https://${THIRD_PARTY.playStore}/`,
          host: THIRD_PARTY.playStore,
          critical: false,
          description: 'Force update redirect',
        },
      ],
    },
    // Connectivity baseline
    {
      group: 'General Connectivity',
      checks: [
        {
          name: 'DNS / Internet (Google)',
          url: 'https://www.google.com/generate_204',
          host: 'www.google.com',
          critical: false,
          description: 'Baseline internet connectivity check',
        },
        {
          name: 'DNS / Internet (Cloudflare)',
          url: 'https://1.1.1.1/',
          host: '1.1.1.1',
          critical: false,
          description: 'Baseline connectivity via IP (bypasses DNS)',
        },
      ],
    },
    // Proxy / interception detection
    {
      group: 'Proxy / Interception Detection',
      checks: [
        {
          name: 'HTTP 204 Interception',
          url: 'https://www.google.com/generate_204',
          host: 'www.google.com',
          critical: false,
          type: 'proxy-204',
          description: 'Fetches Google 204 endpoint with CORS; expects status 204 + empty body',
        },
        {
          name: 'Via / Proxy Header',
          url: 'https://www.google.com/generate_204',
          host: 'www.google.com',
          critical: false,
          type: 'proxy-via',
          description: 'Inspects CORS response for Via, X-Forwarded-For, and other proxy headers',
        },
        {
          name: 'NXDOMAIN Interception',
          url: 'https://nxdomain-proxy-test.invalid/',
          host: 'nxdomain-proxy-test.invalid',
          critical: false,
          type: 'proxy-nxdomain',
          description: 'Requests a guaranteed-nonexistent domain; success means DNS is being hijacked',
        },
        {
          name: 'IP vs DNS Latency Differential',
          url: '-',
          host: 'google.com vs 1.1.1.1',
          critical: false,
          type: 'proxy-latency',
          description: 'Compares Google (DNS) vs Cloudflare (IP) latency; large differential suggests proxy',
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let checkResults = [];
let abortController = null;
let logEntries = [];
let runStartTime = null;

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
function log(msg, cls) {
  const ts = new Date().toISOString().slice(11, 23);
  logEntries.push({ ts, msg, cls: cls || '' });
  const box = document.getElementById('log-box');
  const line = document.createElement('span');
  line.className = cls || '';
  line.textContent = `[${ts}] ${msg}\n`;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

function toggleLog() {
  const box = document.getElementById('log-box');
  const toggle = box.previousElementSibling;
  if (box.style.display === 'none') {
    box.style.display = 'block';
    toggle.textContent = '\u25BC Detailed Log';
  } else {
    box.style.display = 'none';
    toggle.textContent = '\u25B6 Detailed Log';
  }
}

// ---------------------------------------------------------------------------
// UI rendering
// ---------------------------------------------------------------------------
function renderChecks(groups) {
  const container = document.getElementById('checks-container');
  container.innerHTML = '';
  let idx = 0;

  for (const group of groups) {
    const div = document.createElement('div');
    div.className = 'group';
    div.innerHTML = `<div class="group-heading">${group.group}</div>`;
    const list = document.createElement('div');
    list.className = 'check-list';

    for (const check of group.checks) {
      const row = document.createElement('div');
      row.className = 'check-row';
      row.id = `check-${idx}`;
      row.innerHTML = `
        <div class="status-icon status-pending" id="icon-${idx}">&bull;</div>
        <div class="check-info">
          <div class="check-name">${check.name}${check.critical ? ' <span style="color:#dc2626;font-size:0.7rem">CRITICAL</span>' : ''}</div>
          <div class="check-url">${check.host}</div>
        </div>
        <div class="check-latency" id="latency-${idx}">&mdash;</div>
        <div><span class="check-badge badge-pending" id="badge-${idx}">pending</span></div>
      `;
      list.appendChild(row);
      idx++;
    }
    div.appendChild(list);
    container.appendChild(div);
  }
}

function setCheckStatus(idx, status, latencyMs, detail, badgeOverride) {
  const icon = document.getElementById(`icon-${idx}`);
  const latency = document.getElementById(`latency-${idx}`);
  const badge = document.getElementById(`badge-${idx}`);
  if (!icon) return;

  icon.innerHTML = '';
  icon.className = 'status-icon';
  badge.className = 'check-badge';

  switch (status) {
    case 'running':
      icon.classList.add('status-running');
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      icon.appendChild(spinner);
      badge.classList.add('badge-pending');
      badge.textContent = 'testing...';
      break;
    case 'ok':
      icon.classList.add('status-ok');
      icon.textContent = '\u2713';
      badge.classList.add('badge-ok');
      badge.textContent = 'pass';
      break;
    case 'warn':
      icon.classList.add('status-warn');
      icon.textContent = '!';
      badge.classList.add('badge-warn');
      badge.textContent = badgeOverride || 'slow';
      break;
    case 'fail':
      icon.classList.add('status-fail');
      icon.textContent = '\u2717';
      badge.classList.add('badge-fail');
      badge.textContent = 'fail';
      break;
    case 'skip':
      icon.classList.add('status-skip');
      icon.textContent = '-';
      badge.classList.add('badge-skip');
      badge.textContent = 'skipped';
      break;
  }

  if (latencyMs !== null && latencyMs !== undefined) {
    latency.textContent = `${Math.round(latencyMs)} ms`;
  }
  if (detail) {
    latency.title = detail;
  }
}

function updateSummary() {
  let total = checkResults.length;
  let pass = 0, warn = 0, fail = 0, skip = 0;
  for (const r of checkResults) {
    if (r.status === 'ok') pass++;
    else if (r.status === 'warn') warn++;
    else if (r.status === 'fail') fail++;
    else if (r.status === 'skip') skip++;
  }
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pass').textContent = pass;
  document.getElementById('stat-warn').textContent = warn;
  document.getElementById('stat-fail').textContent = fail;
  document.getElementById('stat-skip').textContent = skip;
}

// ---------------------------------------------------------------------------
// Connectivity check logic
// ---------------------------------------------------------------------------

// HTTPS check using fetch with no-cors (works cross-origin, detects DNS/network failure)
async function checkHTTPS(url, signal, timeoutMs) {
  const start = performance.now();
  const timeout = timeoutMs || 15000;

  const timeoutId = setTimeout(() => {
    if (!signal.aborted) signal.reason = 'timeout';
  }, timeout);

  const timeoutAbort = new AbortController();
  const timer = setTimeout(() => timeoutAbort.abort(), timeout);

  // Race between user abort signal and timeout
  const combinedSignal = signal.aborted ? signal : timeoutAbort.signal;

  try {
    // Use no-cors mode: we won't get body/status, but a successful opaque
    // response proves the host resolved and TCP connected.
    // If DNS fails or host is unreachable, fetch throws TypeError.
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: combinedSignal,
    });
    const elapsed = performance.now() - start;
    clearTimeout(timer);
    clearTimeout(timeoutId);
    return { ok: true, latency: elapsed, httpStatus: response.status, type: response.type };
  } catch (err) {
    const elapsed = performance.now() - start;
    clearTimeout(timer);
    clearTimeout(timeoutId);

    if (signal.aborted) {
      return { ok: false, latency: elapsed, error: 'aborted' };
    }
    if (elapsed >= timeout - 100) {
      return { ok: false, latency: elapsed, error: `timeout (${timeout}ms)` };
    }
    return { ok: false, latency: elapsed, error: err.message || 'network error' };
  }
}

// WebSocket check
async function checkWebSocket(url, signal, timeoutMs) {
  const start = performance.now();
  const timeout = timeoutMs || 10000;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch (_) {}
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ ok: false, latency: performance.now() - start, error: `timeout (${timeout}ms)` });
    }, timeout);

    if (signal.aborted) {
      clearTimeout(timer);
      resolve({ ok: false, latency: 0, error: 'aborted' });
      return;
    }
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      finish({ ok: false, latency: performance.now() - start, error: 'aborted' });
    });

    let ws;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      clearTimeout(timer);
      finish({ ok: false, latency: performance.now() - start, error: err.message });
      return;
    }

    ws.onopen = () => {
      clearTimeout(timer);
      finish({ ok: true, latency: performance.now() - start });
    };
    ws.onerror = () => {
      clearTimeout(timer);
      // WebSocket connected to server but got rejected (e.g., auth) still means DNS+TCP worked
      const elapsed = performance.now() - start;
      // If error came very quickly (<200ms) it's likely DNS/network failure
      // If it took longer, the server probably responded (TCP connected, then rejected)
      if (elapsed < 200) {
        finish({ ok: false, latency: elapsed, error: 'connection failed' });
      } else {
        finish({ ok: true, latency: elapsed, note: 'TCP connected (WS handshake rejected, expected)' });
      }
    };
    ws.onclose = (e) => {
      clearTimeout(timer);
      const elapsed = performance.now() - start;
      if (!settled) {
        // Close without open = likely server reachable but rejected upgrade
        finish({ ok: true, latency: elapsed, note: `closed (code: ${e.code})` });
      }
    };
  });
}

// DNS resolution timing via Image trick (backup method)
function checkDNSviaImage(host) {
  return new Promise((resolve) => {
    const start = performance.now();
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = '';
      resolve({ ok: false, latency: performance.now() - start, error: 'timeout' });
    }, 10000);

    img.onload = img.onerror = () => {
      clearTimeout(timer);
      const elapsed = performance.now() - start;
      // Both onload and onerror mean DNS resolved (server responded, even if no image)
      resolve({ ok: true, latency: elapsed });
    };
    // Request a path that won't exist -- we only care about DNS + TCP
    img.src = `https://${host}/favicon.ico?_dc=${Date.now()}`;
  });
}

// ---------------------------------------------------------------------------
// Proxy / interception detection
// ---------------------------------------------------------------------------
let cors204Response = null;

async function fetchCORS204(signal) {
  if (cors204Response) return cors204Response;

  const start = performance.now();
  const timeoutAbort = new AbortController();
  const timer = setTimeout(() => timeoutAbort.abort(), 10000);

  try {
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: signal.aborted ? signal : timeoutAbort.signal,
    });
    clearTimeout(timer);
    const elapsed = performance.now() - start;
    const body = await response.text();

    const proxyHeaders = {};
    for (const name of ['via', 'x-forwarded-for', 'x-proxy-id', 'x-cache', 'x-squid-error']) {
      const val = response.headers.get(name);
      if (val) proxyHeaders[name] = val;
    }

    cors204Response = { body, elapsed, proxyHeaders, status: response.status, error: null };
  } catch (err) {
    clearTimeout(timer);
    const elapsed = performance.now() - start;
    cors204Response = { error: signal.aborted ? 'aborted' : (err.message || 'network error'), elapsed };
  }
  return cors204Response;
}

async function checkHTTP204Interception(signal) {
  const data = await fetchCORS204(signal);
  if (data.error === 'aborted') return { ok: false, latency: data.elapsed, error: 'aborted' };
  if (data.error) return { ok: false, latency: data.elapsed, error: data.error };

  const issues = [];
  if (data.status !== 204) issues.push(`status ${data.status} (expected 204)`);
  if (data.body.length > 0) issues.push(`non-empty body (${data.body.length} bytes)`);

  if (issues.length > 0) {
    return { ok: false, latency: data.elapsed, detail: `Proxy/captive portal likely: ${issues.join(', ')}` };
  }
  return { ok: true, latency: data.elapsed, detail: 'Status 204, empty body - no interception detected' };
}

async function checkViaHeader(signal) {
  const data = await fetchCORS204(signal);
  if (data.error === 'aborted') return { ok: false, latency: data.elapsed, error: 'aborted' };
  if (data.error) return { ok: false, latency: data.elapsed, error: data.error };

  const found = Object.entries(data.proxyHeaders);
  if (found.length > 0) {
    const headerStr = found.map(([k, v]) => `${k}: ${v}`).join('; ');
    return { ok: false, latency: data.elapsed, detail: `Proxy headers detected: ${headerStr}` };
  }
  return { ok: true, latency: data.elapsed, detail: 'No proxy headers visible (CORS may hide some headers)' };
}

async function checkNXDOMAINInterception(signal) {
  const start = performance.now();
  const timeoutAbort = new AbortController();
  const timer = setTimeout(() => timeoutAbort.abort(), 8000);

  try {
    const response = await fetch('https://nxdomain-proxy-test.invalid/', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: signal.aborted ? signal : timeoutAbort.signal,
    });
    clearTimeout(timer);
    const elapsed = performance.now() - start;
    return { ok: false, latency: elapsed, detail: `Proxy intercepting NXDOMAIN: got ${response.type} response for .invalid TLD` };
  } catch (err) {
    clearTimeout(timer);
    const elapsed = performance.now() - start;
    if (signal.aborted) return { ok: false, latency: elapsed, error: 'aborted' };
    return { ok: true, latency: elapsed, detail: 'NXDOMAIN correctly failed - no DNS interception' };
  }
}

function checkLatencyDifferential() {
  const googleResult = checkResults.find(r => r.host === 'www.google.com');
  const cloudflareResult = checkResults.find(r => r.host === '1.1.1.1');

  if (!googleResult || !cloudflareResult) {
    return { ok: true, latency: 0, detail: 'Cannot compare - baseline results unavailable' };
  }
  if (googleResult.status === 'fail' || cloudflareResult.status === 'fail') {
    return { ok: true, latency: 0, detail: 'Cannot compare - one or both baseline checks failed' };
  }

  const dnsLatency = googleResult.latencyMs;
  const ipLatency = cloudflareResult.latencyMs;

  if (ipLatency === 0) {
    return { ok: true, latency: 0, detail: `DNS: ${dnsLatency}ms, IP: ${ipLatency}ms - IP too fast to compare` };
  }

  const ratio = dnsLatency / ipLatency;
  const differential = dnsLatency - ipLatency;

  if (ratio > 3 && differential > 500) {
    return { ok: false, latency: differential, detail: `DNS ${dnsLatency}ms vs IP ${ipLatency}ms (${ratio.toFixed(1)}x) - proxy overhead likely` };
  }

  return { ok: true, latency: differential > 0 ? differential : 0, detail: `DNS ${dnsLatency}ms vs IP ${ipLatency}ms (${ratio.toFixed(1)}x) - within normal range` };
}

// ---------------------------------------------------------------------------
// Main check runner
// ---------------------------------------------------------------------------
const SLOW_THRESHOLD_MS = 3000;

async function runAllChecks() {
  const env = document.getElementById('env-select').value;
  const groups = buildChecks(env);
  const allChecks = groups.flatMap(g => g.checks);

  // Reset
  checkResults = [];
  logEntries = [];
  cors204Response = null;
  document.getElementById('log-box').innerHTML = '';
  runStartTime = new Date();
  document.getElementById('run-timestamp').textContent = `Run: ${runStartTime.toISOString().replace('T', ' ').slice(0, 19)} UTC`;

  renderChecks(groups);

  abortController = new AbortController();
  document.getElementById('run-btn').disabled = true;
  document.getElementById('stop-btn').style.display = '';

  log(`Starting connectivity checks for environment: ${env.toUpperCase()}`, 'log-info');
  log(`Checking ${allChecks.length} endpoints...`, 'log-info');

  // Run checks in batches of 4 to avoid overwhelming the browser
  const BATCH_SIZE = 4;
  let idx = 0;

  for (let batch = 0; batch < allChecks.length; batch += BATCH_SIZE) {
    if (abortController.signal.aborted) break;

    const batchChecks = allChecks.slice(batch, batch + BATCH_SIZE);
    const batchIndices = [];
    for (let i = 0; i < batchChecks.length; i++) {
      batchIndices.push(batch + i);
    }

    // Mark batch as running
    for (const bi of batchIndices) {
      setCheckStatus(bi, 'running');
    }

    // Run batch in parallel
    const promises = batchChecks.map(async (check, i) => {
      const ci = batchIndices[i];
      let result;

      const isProxyCheck = (check.type || '').startsWith('proxy-');

      try {
        if (check.type === 'websocket') {
          log(`[${ci}] Testing WebSocket: ${check.url}`, 'log-info');
          result = await checkWebSocket(check.url, abortController.signal);
        } else if (check.type === 'proxy-204') {
          log(`[${ci}] Testing HTTP 204 interception`, 'log-info');
          result = await checkHTTP204Interception(abortController.signal);
        } else if (check.type === 'proxy-via') {
          log(`[${ci}] Testing proxy header detection`, 'log-info');
          result = await checkViaHeader(abortController.signal);
        } else if (check.type === 'proxy-nxdomain') {
          log(`[${ci}] Testing NXDOMAIN interception`, 'log-info');
          result = await checkNXDOMAINInterception(abortController.signal);
        } else if (check.type === 'proxy-latency') {
          log(`[${ci}] Comparing IP vs DNS latency`, 'log-info');
          result = checkLatencyDifferential();
        } else {
          log(`[${ci}] Testing HTTPS: ${check.url}`, 'log-info');
          result = await checkHTTPS(check.url, abortController.signal);
        }
      } catch (err) {
        result = { ok: false, latency: 0, error: err.message };
      }

      // Determine status
      let status;
      let badgeOverride = null;
      if (result.error === 'aborted') {
        status = 'skip';
      } else if (isProxyCheck && result.error) {
        status = 'fail';
      } else if (isProxyCheck && !result.ok) {
        status = 'warn';
        badgeOverride = 'detected';
      } else if (!result.ok) {
        status = 'fail';
      } else if (result.latency > SLOW_THRESHOLD_MS && !isProxyCheck) {
        status = 'warn';
      } else {
        status = 'ok';
      }

      const entry = {
        name: check.name,
        host: check.host,
        url: check.url,
        critical: check.critical,
        status,
        latencyMs: Math.round(result.latency),
        error: result.error || null,
        note: result.note || null,
        detail: result.detail || null,
        type: check.type || 'https',
        description: check.description,
      };
      checkResults.push(entry);

      setCheckStatus(ci, status, result.latency, result.error || result.detail || result.note, badgeOverride);

      // Log result
      const latStr = `${Math.round(result.latency)}ms`;
      if (status === 'ok') {
        log(`[${ci}] OK ${check.host} (${latStr})${result.detail || result.note ? ' - ' + (result.detail || result.note) : ''}`, 'log-ok');
      } else if (status === 'warn' && isProxyCheck) {
        log(`[${ci}] WARN ${check.host} (${latStr}) - ${result.detail}`, 'log-warn');
      } else if (status === 'warn') {
        log(`[${ci}] SLOW ${check.host} (${latStr})`, 'log-warn');
      } else if (status === 'fail') {
        log(`[${ci}] FAIL ${check.host} - ${result.error} (${latStr})`, 'log-fail');
      } else {
        log(`[${ci}] SKIPPED ${check.host}`, '');
      }

      updateSummary();
    });

    await Promise.allSettled(promises);
  }

  // Run secondary DNS check for any failed hosts (exclude proxy and websocket checks)
  const failedHosts = checkResults.filter(r => r.status === 'fail' && r.type !== 'websocket' && !(r.type || '').startsWith('proxy-')).map(r => r.host);
  if (failedHosts.length > 0) {
    log('', '');
    log(`Running secondary DNS probe (image method) for ${failedHosts.length} failed host(s)...`, 'log-info');
    for (const host of [...new Set(failedHosts)]) {
      if (abortController.signal.aborted) break;
      const dnsResult = await checkDNSviaImage(host);
      if (dnsResult.ok) {
        log(`  DNS probe OK for ${host} (${Math.round(dnsResult.latency)}ms) - host resolves but HTTPS failed (CORS/firewall?)`, 'log-warn');
      } else {
        log(`  DNS probe FAIL for ${host} - likely DNS resolution failure or host unreachable`, 'log-fail');
      }
    }
  }

  // Summary
  log('', '');
  const pass = checkResults.filter(r => r.status === 'ok').length;
  const warn = checkResults.filter(r => r.status === 'warn').length;
  const fail = checkResults.filter(r => r.status === 'fail').length;
  const critFail = checkResults.filter(r => r.status === 'fail' && r.critical).length;
  log(`Done. ${pass} passed, ${warn} slow, ${fail} failed (${critFail} critical).`, fail > 0 ? 'log-fail' : 'log-ok');

  if (critFail > 0) {
    log('', '');
    log('CRITICAL FAILURES:', 'log-fail');
    for (const r of checkResults.filter(r => r.status === 'fail' && r.critical)) {
      log(`  ${r.name} (${r.host}) - ${r.error}`, 'log-fail');
    }
    log('', '');
    log('These failures will cause asset sync errors, job completion blocking,', 'log-fail');
    log('and "Sending job data, please wait" stuck messages on devices.', 'log-fail');
  }

  const proxyWarnings = checkResults.filter(r => (r.type || '').startsWith('proxy-') && r.status === 'warn');
  if (proxyWarnings.length > 0) {
    log('', '');
    log('PROXY / INTERCEPTION INDICATORS:', 'log-warn');
    for (const r of proxyWarnings) {
      log(`  ${r.name} - ${r.detail}`, 'log-warn');
    }
  }

  document.getElementById('run-btn').disabled = false;
  document.getElementById('stop-btn').style.display = 'none';
  abortController = null;
}

function stopChecks() {
  if (abortController) {
    abortController.abort();
    log('Checks stopped by user.', 'log-warn');
  }
  document.getElementById('run-btn').disabled = false;
  document.getElementById('stop-btn').style.display = 'none';
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
function exportResults() {
  const data = {
    tool: 'BigChange Connectivity Diagnostics',
    environment: document.getElementById('env-select').value,
    timestamp: runStartTime ? runStartTime.toISOString() : new Date().toISOString(),
    userAgent: navigator.userAgent,
    results: checkResults,
    summary: {
      total: checkResults.length,
      pass: checkResults.filter(r => r.status === 'ok').length,
      slow: checkResults.filter(r => r.status === 'warn').length,
      fail: checkResults.filter(r => r.status === 'fail').length,
      criticalFail: checkResults.filter(r => r.status === 'fail' && r.critical).length,
    },
    log: logEntries.map(e => `[${e.ts}] ${e.msg}`),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bigchange-connectivity-${data.environment}-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function copyResults() {
  if (checkResults.length === 0) {
    alert('Run checks first.');
    return;
  }

  const env = document.getElementById('env-select').value.toUpperCase();
  const ts = runStartTime ? runStartTime.toISOString().replace('T', ' ').slice(0, 19) : 'N/A';
  const pass = checkResults.filter(r => r.status === 'ok').length;
  const warn = checkResults.filter(r => r.status === 'warn').length;
  const fail = checkResults.filter(r => r.status === 'fail').length;

  let text = `BigChange Connectivity Report (${env}) - ${ts} UTC\n`;
  text += `${'='.repeat(60)}\n`;
  text += `Pass: ${pass}  |  Slow: ${warn}  |  Fail: ${fail}  |  Total: ${checkResults.length}\n\n`;

  for (const r of checkResults) {
    const isProxy = (r.type || '').startsWith('proxy-');
    const icon = r.status === 'ok' ? 'OK  ' : r.status === 'warn' && isProxy ? 'WARN' : r.status === 'warn' ? 'SLOW' : r.status === 'fail' ? 'FAIL' : 'SKIP';
    const crit = r.critical ? ' [CRITICAL]' : '';
    const lat = r.latencyMs !== null ? ` (${r.latencyMs}ms)` : '';
    const err = r.error ? ` - ${r.error}` : '';
    const det = r.detail && !r.error ? ` - ${r.detail}` : '';
    text += `${icon} ${r.name}${crit} - ${r.host}${lat}${err}${det}\n`;
  }

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('[onclick="copyResults()"]');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  }).catch(() => {
    // Fallback for non-HTTPS contexts
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ---------------------------------------------------------------------------
// Init: render default checks
// ---------------------------------------------------------------------------
renderChecks(buildChecks('prod'));
