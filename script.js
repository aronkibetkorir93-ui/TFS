// DATABASE CONFIG
const SUB_URL = 'https://ilohlmmbgwywulojiadd.supabase.co';
const SUB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb2hsbW1iZ3d5d3Vsb2ppYWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTgwOTIsImV4cCI6MjA5Mjk5NDA5Mn0.LIx-wCr_P4tcF-lw7Lo7FvCzWw2ScmpyMvlx-BgoGgY';
const _supabase = supabase.createClient(SUB_URL, SUB_KEY);

// LOGIN LOGIC (Pin is 1234)
function handleLogin() {
    const pin = document.getElementById('password').value;
    if(pin === "1234") {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        init();
    } else {
        alert("Wrong Pin. Please check with the administrator.");
    }
}

// NAVIGATION
function switchTab(e, tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
    e.target.classList.add('active');
    document.getElementById(tab + 'Section').style.display = 'block';
    if(tab === 'monthly') loadMonthlySummary();
    if(tab === 'farmers') loadFarmerList();
}

// INITIALIZATION
async function init() {
    const today = new Date();
    document.getElementById('dateFilter').value = today.toISOString().split('T')[0];
    
    // Set monthly dropdown to current month
    const currentMonth = ("0" + (today.getMonth() + 1)).slice(-2);
    document.getElementById('monthSelect').value = currentMonth;

    document.getElementById('dateFilter').addEventListener('change', loadDailyData);
    await loadFarmerList();
    await loadDailyData();
}

// RECORDING WITH DUPLICATE SHIELD
async function saveRecord() {
    const fId = document.getElementById('farmerSelect').value;
    const kg = parseFloat(document.getElementById('kgInput').value);
    const date = document.getElementById('dateFilter').value;

    if(!kg || kg <= 0) return alert("Please enter a valid weight.");

    // CHECK FOR DUPLICATE (One record per farmer per day)
    const { data: existing } = await _supabase
        .from('daily_records')
        .select('id')
        .eq('farmer_id', fId)
        .eq('date_recorded', date);

    if (existing && existing.length > 0) {
        return alert("ACCESS DENIED: This farmer already has a record for today. Delete the old entry first if you need to correct it.");
    }

    const { error } = await _supabase.from('daily_records').insert([{ farmer_id: fId, kg_collected: kg, date_recorded: date }]);
    if(!error) {
        document.getElementById('kgInput').value = '';
        loadDailyData();
    }
}

// DAILY VIEW
async function loadDailyData() {
    const date = document.getElementById('dateFilter').value;
    const { data } = await _supabase.from('daily_records').select('id, kg_collected, created_at, farmers(name)').eq('date_recorded', date);
    
    const tbody = document.getElementById('dailyLogBody');
    tbody.innerHTML = '';
    let total = 0;
    
    data?.forEach(r => {
        total += r.kg_collected;
        tbody.innerHTML += `<tr>
            <td>${r.farmers.name}</td>
            <td>${r.kg_collected} kg</td>
            <td>${new Date(r.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
            <td><button onclick="deleteRecord('${r.id}')" style="background:none; border:none; color:red; font-size:16px;">❌</button></td>
        </tr>`;
    });
    
    document.getElementById('dayTotalKg').innerText = total + " kg";
    document.getElementById('dayTotalValue').innerText = "Ksh " + (total * 8);
}

// MONTHLY VIEW (Filtered by Month & Year)
async function loadMonthlySummary() {
    const monthNum = document.getElementById('monthSelect').value;
    const year = new Date().getFullYear();
    const filterString = `${year}-${monthNum}`;

    const { data } = await _supabase
        .from('daily_records')
        .select('kg_collected, farmers(name)')
        .like('date_recorded', `${filterString}%`);

    const summary = {};
    data?.forEach(r => {
        const name = r.farmers ? r.farmers.name : "Unknown";
        summary[name] = (summary[name] || 0) + r.kg_collected;
    });

    const tbody = document.getElementById('monthlyBody');
    tbody.innerHTML = '';
    
    const entries = Object.entries(summary);
    if(entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#555; padding:20px;">No records for this month.</td></tr>';
    } else {
        entries.forEach(([name, kg]) => {
            tbody.innerHTML += `<tr><td>${name}</td><td>${kg} kg</td><td class="neon-text">Ksh ${kg * 8}</td></tr>`;
        });
    }
}

// FARMER MANAGEMENT
async function loadFarmerList() {
    const { data } = await _supabase.from('farmers').select('*').order('name');
    
    // Update Dropdown
    const select = document.getElementById('farmerSelect');
    select.innerHTML = data.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    
    // Update Management List
    const list = document.getElementById('farmerList');
    list.innerHTML = data.map(f => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #222;">
            <span>${f.name}</span>
            <button onclick="deleteFarmer('${f.id}', '${f.name}')" style="background:none; border:none; color:#ff4d4d; font-size:18px; cursor:pointer;">🗑️</button>
        </div>
    `).join('');
}

async function addNewFarmer() {
    const name = document.getElementById('newFarmerName').value.trim();
    if(!name) return;
    const { error } = await _supabase.from('farmers').insert([{ name }]);
    if(!error) {
        document.getElementById('newFarmerName').value = '';
        loadFarmerList();
    }
}

async function deleteFarmer(id, name) {
    if(confirm(`Are you sure you want to delete ${name}? Their past records will remain in the database, but they will be removed from the active list.`)) {
        const { error } = await _supabase.from('farmers').delete().eq('id', id);
        if(!error) loadFarmerList();
        else alert("Cannot delete farmer who has active records.");
    }
}

async function deleteRecord(id) {
    if(confirm("Delete this entry?")) {
        await _supabase.from('daily_records').delete().eq('id', id);
        loadDailyData();
    }
}

function takeSnapshot() {
    html2canvas(document.getElementById('printArea'), { backgroundColor: '#161616' }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'Mama_Tea_Ledger.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}
