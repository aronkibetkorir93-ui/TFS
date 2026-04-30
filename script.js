// CONFIGURATION
const URL = 'https://ilohlmmbgwywulojiadd.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb2hsbW1iZ3d5d3Vsb2ppYWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTgwOTIsImV4cCI6MjA5Mjk5NDA5Mn0.LIx-wCr_P4tcF-lw7Lo7FvCzWw2ScmpyMvlx-BgoGgY';
const _db = supabase.createClient(URL, KEY);

let editingId = null;

// 1. PIN LOGIN
function handleLogin() {
    if(document.getElementById('password').value === "1234") {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        initApp();
    } else { alert("Wrong PIN"); }
}

// 2. STARTUP
async function initApp() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;
    document.getElementById('monthSelect').value = ("0" + (new Date().getMonth() + 1)).slice(-2);
    
    await loadFarmers();
    await loadDaily();
    document.getElementById('dateFilter').addEventListener('change', loadDaily);
}

// 3. TAB SWITCHING
function switchTab(e, tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
    e.target.classList.add('active');
    document.getElementById(tab + 'Section').style.display = 'block';
    if(tab === 'monthly') loadMonthlySummary();
    if(tab === 'farmers') loadFarmers();
}

// 4. ADD NEW FARMER (FIXED)
async function addNewFarmer() {
    const input = document.getElementById('newFarmerName');
    const name = input.value.trim();
    if(!name) return alert("Enter a name");

    const { error } = await _db.from('farmers').insert([{ name }]);
    if(error) {
        alert("Error saving farmer. Check your internet.");
    } else {
        input.value = '';
        alert("Farmer added!");
        loadFarmers(); // Refresh list
    }
}

// 5. SAVE DAILY RECORD
async function saveRecord() {
    const fId = document.getElementById('farmerSelect').value;
    const kg = parseFloat(document.getElementById('kgInput').value);
    const date = document.getElementById('dateFilter').value;

    if(!kg || !fId) return alert("Select farmer and enter weight");

    if (!navigator.onLine) {
        let q = JSON.parse(localStorage.getItem('tea_q') || "[]");
        q.push({ farmer_id: fId, kg_collected: kg, date_recorded: date });
        localStorage.setItem('tea_q', JSON.stringify(q));
        alert("Saved Offline!");
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

// 6. LOAD DAILY LOG
async function loadDaily() {
    const date = document.getElementById('dateFilter').value;
    const { data } = await _db.from('daily_records').select('id, farmer_id, kg_collected, created_at, farmers(name)').eq('date_recorded', date);
    
    const body = document.getElementById('dailyLogBody');
    body.innerHTML = '';
    let total = 0;
    
    data?.forEach(r => {
        total += r.kg_collected;
        body.innerHTML += `<tr>
            <td>${r.farmers?.name || 'User'}</td>
            <td>${r.kg_collected} kg</td>
            <td>${new Date(r.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
            <td><button onclick="prepareEdit('${r.id}','${r.farmer_id}',${r.kg_collected})" style="background:none; border:none; color:cyan;">📝</button></td>
        </tr>`;
    });
    document.getElementById('dayTotalKg').innerText = total + " kg";
    document.getElementById('dayTotalValue').innerText = "Ksh " + (total * 8);
}

// 7. MONTHLY SUMMARY (FIXED RANGE)
async function loadMonthlySummary() {
    const m = document.getElementById('monthSelect').value;
    const y = new Date().getFullYear();
    const start = `${y}-${m}-01`;
    const end = `${y}-${m}-31`;

    const { data } = await _db.from('daily_records').select('kg_collected, farmers(name)')
        .gte('date_recorded', start)
        .lte('date_recorded', end);

    const summary = {};
    data?.forEach(r => {
        const n = r.farmers?.name || "Unknown";
        summary[n] = (summary[n] || 0) + r.kg_collected;
    });

    const tbody = document.getElementById('monthlyBody');
    tbody.innerHTML = '';
    const entries = Object.entries(summary);
    
    if(entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#555;">No records found.</td></tr>';
    } else {
        entries.forEach(([name, kg]) => {
            tbody.innerHTML += `<tr><td>${name}</td><td>${kg} kg</td><td class="neon-text">Ksh ${kg * 8}</td></tr>`;
        });
    }
}

// 8. HELPERS
async function loadFarmers() {
    const { data } = await _db.from('farmers').select('*').order('name');
    if(data) {
        document.getElementById('farmerSelect').innerHTML = data.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        document.getElementById('farmerList').innerHTML = data.map(f => `<div class="card" style="margin-bottom:8px; padding:12px;">${f.name}</div>`).join('');
    }
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

function takeSnapshot() {
    html2canvas(document.getElementById('printArea'), { backgroundColor: '#1a1a1a' }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'TeaHub_Report.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}
