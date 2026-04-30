const SB_URL = 'https://ilohlmmbgwywulojiadd.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb2hsbW1iZ3d5d3Vsb2ppYWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTgwOTIsImV4cCI6MjA5Mjk5NDA5Mn0.LIx-wCr_P4tcF-lw7Lo7FvCzWw2ScmpyMvlx-BgoGgY';
const _db = supabase.createClient(SB_URL, SB_KEY);

// PIN LOGIN
function checkPin() {
    const pin = document.getElementById('pinInput').value;
    if (pin === "1234") {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        initApp();
    } else {
        alert("WRONG PIN");
        document.getElementById('pinInput').value = '';
    }
}

// INITIALIZE
async function initApp() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;
    
    // Setup Months
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const mSelect = document.getElementById('monthSelect');
    mSelect.innerHTML = months.map((m, i) => `<option value="${("0"+(i+1)).slice(-2)}">${m}</option>`).join('');
    mSelect.value = ("0" + (new Date().getMonth() + 1)).slice(-2);

    await loadFarmers();
    await loadDaily();
    document.getElementById('dateFilter').addEventListener('change', loadDaily);
}

// NAVIGATION
function switchTab(e, tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
    e.target.classList.add('active');
    document.getElementById(tab + 'Section').style.display = 'block';
    if(tab === 'monthly') loadMonthlySummary();
    if(tab === 'farmers') loadFarmers();
}

// FARMERS
async function loadFarmers() {
    const { data, error } = await _db.from('farmers').select('*').order('name');
    if (data) {
        document.getElementById('farmerSelect').innerHTML = data.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        document.getElementById('farmerList').innerHTML = data.map(f => `<div class="card">${f.name}</div>`).join('');
    }
}

async function addNewFarmer() {
    const name = document.getElementById('newFarmerName').value.trim();
    if(!name) return;
    const { error } = await _db.from('farmers').insert([{ name }]);
    if(error) alert(error.message);
    else {
        document.getElementById('newFarmerName').value = '';
        await loadFarmers();
        alert("Farmer Added!");
    }
}

// RECORDS
async function saveRecord() {
    const fId = document.getElementById('farmerSelect').value;
    const kg = parseFloat(document.getElementById('kgInput').value);
    const date = document.getElementById('dateFilter').value;
    
    if(!kg) return alert("Enter KG");

    const { error } = await _db.from('daily_records').insert([{ 
        farmer_id: fId, 
        kg_collected: kg, 
        date_recorded: date 
    }]);

    if(error) alert(error.message);
    else {
        document.getElementById('kgInput').value = '';
        await loadDaily();
        alert("Record Saved!");
    }
}

async function loadDaily() {
    const date = document.getElementById('dateFilter').value;
    const { data } = await _db.from('daily_records')
        .select('id, kg_collected, farmers(name)')
        .eq('date_recorded', date);
    
    const body = document.getElementById('dailyLogBody');
    body.innerHTML = data?.map(r => `
        <tr>
            <td>${r.farmers?.name || 'Unknown'}</td>
            <td>${r.kg_collected} kg</td>
            <td><button onclick="deleteRecord('${r.id}')" style="color:red; background:none; border:none;">&times;</button></td>
        </tr>
    `).join('') || '';
}

async function loadMonthlySummary() {
    const month = document.getElementById('monthSelect').value;
    const year = new Date().getFullYear();
    const start = `${year}-${month}-01`;
    const end = `${year}-${month}-31`;

    const { data } = await _db.from('daily_records')
        .select('kg_collected, farmers(name)')
        .gte('date_recorded', start)
        .lte('date_recorded', end);

    const summary = {};
    data?.forEach(r => {
        const n = r.farmers?.name || "Unknown";
        summary[n] = (summary[n] || 0) + r.kg_collected;
    });

    document.getElementById('monthlyBody').innerHTML = Object.entries(summary).map(([name, kg]) => `
        <tr>
            <td>${name}</td>
            <td>${kg.toFixed(1)} kg</td>
            <td class="neon-text">Ksh ${Math.round(kg * 8)}</td>
        </tr>
    `).join('');
}

async function deleteRecord(id) {
    if(confirm("Delete record?")) {
        await _db.from('daily_records').delete().eq('id', id);
        loadDaily();
    }
}

