const SUB_URL = 'https://ilohlmmbgwywulojiadd.supabase.co';
const SUB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb2hsbW1iZ3d5d3Vsb2ppYWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTgwOTIsImV4cCI6MjA5Mjk5NDA5Mn0.LIx-wCr_P4tcF-lw7Lo7FvCzWw2ScmpyMvlx-BgoGgY';
const _supabase = supabase.createClient(SUB_URL, SUB_KEY);

function handleLogin() {
    if(document.getElementById('password').value === "1234") { // Set your own pin
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        init();
    } else { alert("Wrong Pin"); }
}

function switchTab(e, tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
    e.target.classList.add('active');
    document.getElementById(tab + 'Section').style.display = 'block';
    if(tab === 'monthly') loadMonthlySummary();
}

async function init() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;
    document.getElementById('dateFilter').addEventListener('change', loadDailyData);
    await loadFarmerList();
    await loadDailyData();
}

// DUPLICATE PROTECTION LOGIC
async function saveRecord() {
    const fId = document.getElementById('farmerSelect').value;
    const kg = parseFloat(document.getElementById('kgInput').value);
    const date = document.getElementById('dateFilter').value;

    if(!kg) return alert("Enter KG");

    // Check if record exists for this farmer on this date
    const { data: existing } = await _supabase
        .from('daily_records')
        .select('id')
        .eq('farmer_id', fId)
        .eq('date_recorded', date);

    if (existing && existing.length > 0) {
        return alert("STOP: This farmer already has a record for today! Delete the old one if you need to correct it.");
    }

    const { error } = await _supabase.from('daily_records').insert([{ farmer_id: fId, kg_collected: kg, date_recorded: date }]);
    if(!error) {
        document.getElementById('kgInput').value = '';
        loadDailyData();
    }
}

async function loadDailyData() {
    const date = document.getElementById('dateFilter').value;
    const { data } = await _supabase.from('daily_records').select('id, kg_collected, created_at, farmers(name)').eq('date_recorded', date);
    
    const tbody = document.getElementById('dailyLogBody');
    tbody.innerHTML = '';
    let total = 0;
    
    data?.forEach(r => {
        total += r.kg_collected;
        tbody.innerHTML += `<tr><td>${r.farmers.name}</td><td>${r.kg_collected}</td><td>${new Date(r.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td><td><button onclick="deleteRec('${r.id}')">❌</button></td></tr>`;
    });
    
    document.getElementById('dayTotalKg').innerText = total + " kg";
    document.getElementById('dayTotalValue').innerText = "Ksh " + (total * 8);
}

// CORRECT MONTHLY AGGREGATION
async function loadMonthlySummary() {
    const month = document.getElementById('monthSelect').value;
    const { data } = await _supabase.from('daily_records').select('kg_collected, farmers(name)');
    
    // Group records by farmer
    const summary = {};
    data.forEach(r => {
        const name = r.farmers.name;
        summary[name] = (summary[name] || 0) + r.kg_collected;
    });

    const tbody = document.getElementById('monthlyBody');
    tbody.innerHTML = '';
    Object.entries(summary).forEach(([name, kg]) => {
        tbody.innerHTML += `<tr><td>${name}</td><td>${kg} kg</td><td>Ksh ${kg * 8}</td></tr>`;
    });
}

async function loadFarmerList() {
    const { data } = await _supabase.from('farmers').select('*').order('name');
    const select = document.getElementById('farmerSelect');
    const list = document.getElementById('farmerList');
    select.innerHTML = data.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    list.innerHTML = data.map(f => `<div class="card">${f.name}</div>`).join('');
}

async function deleteRec(id) {
    if(confirm("Delete this?")) {
        await _supabase.from('daily_records').delete().eq('id', id);
        loadDailyData();
    }
}

function takeSnapshot() {
    html2canvas(document.getElementById('printArea')).then(canvas => {
        const link = document.createElement('a');
        link.download = 'Tea_Report.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}
