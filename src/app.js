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

function setCheckStatus(idx, status, latencyMs, detail) {
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
      badge.textContent = 'slow';
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

      try {
        if (check.type === 'websocket') {
          log(`[${ci}] Testing WebSocket: ${check.url}`, 'log-info');
          result = await checkWebSocket(check.url, abortController.signal);
        } else {
          log(`[${ci}] Testing HTTPS: ${check.url}`, 'log-info');
          result = await checkHTTPS(check.url, abortController.signal);
        }
      } catch (err) {
        result = { ok: false, latency: 0, error: err.message };
      }

      // Determine status
      let status;
      if (result.error === 'aborted') {
        status = 'skip';
      } else if (!result.ok) {
        status = 'fail';
      } else if (result.latency > SLOW_THRESHOLD_MS) {
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
        type: check.type || 'https',
        description: check.description,
      };
      checkResults.push(entry);

      setCheckStatus(ci, status, result.latency, result.error || result.note);

      // Log result
      const latStr = `${Math.round(result.latency)}ms`;
      if (status === 'ok') {
        log(`[${ci}] OK ${check.host} (${latStr})${result.note ? ' - ' + result.note : ''}`, 'log-ok');
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

  // Run secondary DNS check for any failed hosts
  const failedHosts = checkResults.filter(r => r.status === 'fail' && r.type !== 'websocket').map(r => r.host);
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
    const icon = r.status === 'ok' ? 'OK  ' : r.status === 'warn' ? 'SLOW' : r.status === 'fail' ? 'FAIL' : 'SKIP';
    const crit = r.critical ? ' [CRITICAL]' : '';
    const lat = r.latencyMs !== null ? ` (${r.latencyMs}ms)` : '';
    const err = r.error ? ` - ${r.error}` : '';
    text += `${icon} ${r.name}${crit} - ${r.host}${lat}${err}\n`;
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
