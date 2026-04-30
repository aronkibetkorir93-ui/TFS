const URL = 'https://ilohlmmbgwywulojiadd.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb2hsbW1iZ3d5d3Vsb2ppYWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTgwOTIsImV4cCI6MjA5Mjk5NDA5Mn0.LIx-wCr_P4tcF-lw7Lo7FvCzWw2ScmpyMvlx-BgoGgY';
const _db = supabase.createClient(URL, KEY);

let editingId = null;

function handleLogin() {
    if(document.getElementById('password').value === "1234") {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        init();
    }
}

async function init() {
    const now = new Date();
    document.getElementById('dateFilter').value = now.toISOString().split('T')[0];
    document.getElementById('monthSelect').value = ("0" + (now.getMonth() + 1)).slice(-2);
    await loadFarmers();
    await loadDaily();
    document.getElementById('dateFilter').addEventListener('change', loadDaily);
}

function switchTab(e, tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
    e.target.classList.add('active');
    document.getElementById(tab + 'Section').style.display = 'block';
    if(tab === 'monthly') loadMonthlySummary();
}

async function saveRecord() {
    const fId = document.getElementById('farmerSelect').value;
    const kg = parseFloat(document.getElementById('kgInput').value);
    const date = document.getElementById('dateFilter').value;
    if(!kg) return;

    if (!navigator.onLine) {
        let q = JSON.parse(localStorage.getItem('tea_q') || "[]");
        q.push({ farmer_id: fId, kg_collected: kg, date_recorded: date });
        localStorage.setItem('tea_q', JSON.stringify(q));
        alert("Offline: Saved to phone memory!");
    } else {
        if(editingId) {
            await _db.from('daily_records').update({ farmer_id: fId, kg_collected: kg }).eq('id', editingId);
            cancelEdit();
        } else {
            await _db.from('daily_records').insert([{ farmer_id: fId, kg_collected: kg, date_recorded: date }]);
        }
    }
    document.getElementById('kgInput').value = '';
    loadDaily();
}

window.addEventListener('online', async () => {
    let q = JSON.parse(localStorage.getItem('tea_q') || "[]");
    if(q.length > 0) {
        await _db.from('daily_records').insert(q);
        localStorage.removeItem('tea_q');
        loadDaily();
        alert("Sync Complete!");
    }
});

async function loadDaily() {
    const d = document.getElementById('dateFilter').value;
    const { data } = await _db.from('daily_records').select('id, farmer_id, kg_collected, created_at, farmers(name)').eq('date_recorded', d);
    const body = document.getElementById('dailyLogBody');
    body.innerHTML = '';
    let total = 0;
    data?.forEach(r => {
        total += r.kg_collected;
        body.innerHTML += `<tr><td>${r.farmers.name}</td><td>${r.kg_collected} kg</td><td>${new Date(r.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td><td><button onclick="prepareEdit('${r.id}','${r.farmer_id}',${r.kg_collected})" style="background:none; border:none; color:cyan;">📝</button></td></tr>`;
    });
    document.getElementById('dayTotalKg').innerText = total + " kg";
    document.getElementById('dayTotalValue').innerText = "Ksh " + (total * 8);
}

function prepareEdit(id, fId, kg) {
    editingId = id;
    document.getElementById('farmerSelect').value = fId;
    document.getElementById('kgInput').value = kg;
    document.getElementById('saveBtn').innerText = "UPDATE RECORD";
    document.getElementById('cancelEditBtn').style.display = "block";
    window.scrollTo(0,0);
}

function cancelEdit() {
    editingId = null;
    document.getElementById('saveBtn').innerText = "SECURE RECORD";
    document.getElementById('cancelEditBtn').style.display = "none";
}

async function loadMonthlySummary() {
    const m = document.getElementById('monthSelect').value;
    const y = new Date().getFullYear();
    const { data } = await _db.from('daily_records').select('kg_collected, farmers(name)').gte('date_recorded', `${y}-${m}-01`).lte('date_recorded', `${y}-${m}-31`);
    const agg = {};
    data?.forEach(r => { agg[r.farmers.name] = (agg[r.farmers.name] || 0) + r.kg_collected; });
    const body = document.getElementById('monthlyBody');
    body.innerHTML = '';
    Object.entries(agg).forEach(([n, k]) => {
        body.innerHTML += `<tr><td>${n}</td><td>${k} kg</td><td class="neon-text">Ksh ${k * 8}</td></tr>`;
    });
}

async function loadFarmers() {
    const { data } = await _db.from('farmers').select('*').order('name');
    document.getElementById('farmerSelect').innerHTML = data.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    document.getElementById('farmerList').innerHTML = data.map(f => `<div class="card">${f.name}</div>`).join('');
}

function takeSnapshot() {
    html2canvas(document.getElementById('printArea'), { backgroundColor: '#161616' }).then(c => {
        const a = document.createElement('a'); a.download = 'TeaReport.png'; a.href = c.toDataURL(); a.click();
    });
}
