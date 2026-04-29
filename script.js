// DATABASE CONFIG
const SUB_URL = 'https://ilohlmmbgwywulojiadd.supabase.co';
const SUB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb2hsbW1iZ3d5d3Vsb2ppYWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTgwOTIsImV4cCI6MjA5Mjk5NDA5Mn0.LIx-wCr_P4tcF-lw7Lo7FvCzWw2ScmpyMvlx-BgoGgY';
const _supabase = supabase.createClient(SUB_URL, SUB_KEY);

let editingId = null; // Stores ID if we are editing an existing record

// 1. ACCESS CONTROL (Pin: 1234)
function handleLogin() {
    const pin = document.getElementById('password').value;
    if(pin === "1234") {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        init();
    } else {
        alert("Incorrect PIN.");
    }
}

// 2. INITIALIZATION
async function init() {
    const today = new Date();
    document.getElementById('dateFilter').value = today.toISOString().split('T')[0];
    const currentMonth = ("0" + (today.getMonth() + 1)).slice(-2);
    document.getElementById('monthSelect').value = currentMonth;

    document.getElementById('dateFilter').addEventListener('change', loadDailyData);
    await loadFarmerList();
    await loadDailyData();
}

// 3. NAVIGATION
function switchTab(e, tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
    e.target.classList.add('active');
    document.getElementById(tab + 'Section').style.display = 'block';
    if(tab === 'monthly') loadMonthlySummary();
    if(tab === 'farmers') loadFarmerList();
}

// 4. SAVE OR UPDATE RECORD
async function saveRecord() {
    const fId = document.getElementById('farmerSelect').value;
    const kg = parseFloat(document.getElementById('kgInput').value);
    const date = document.getElementById('dateFilter').value;

    if(!kg || kg <= 0) return alert("Please enter a valid weight.");

    if (editingId) {
        // UPDATE EXISTING
        const { error } = await _supabase.from('daily_records').update({ farmer_id: fId, kg_collected: kg }).eq('id', editingId);
        if(!error) {
            alert("Record updated successfully.");
            cancelEdit();
        }
    } else {
        // INSERT NEW (With Duplicate Blocker)
        const { data: existing } = await _supabase.from('daily_records').select('id').eq('farmer_id', fId).eq('date_recorded', date);
        if (existing && existing.length > 0) return alert("Farmer already has a record for today. Edit the existing one instead.");

        await _supabase.from('daily_records').insert([{ farmer_id: fId, kg_collected: kg, date_recorded: date }]);
    }
    
    document.getElementById('kgInput').value = '';
    loadDailyData();
}

// 5. DAILY VIEW WITH EDIT/DELETE
async function loadDailyData() {
    const date = document.getElementById('dateFilter').value;
    const { data } = await _supabase.from('daily_records').select('id, farmer_id, kg_collected, created_at, farmers(name)').eq('date_recorded', date);
    
    const tbody = document.getElementById('dailyLogBody');
    tbody.innerHTML = '';
    let total = 0;
    
    data?.forEach(r => {
        total += r.kg_collected;
        tbody.innerHTML += `<tr>
            <td>${r.farmers.name}</td>
            <td>${r.kg_collected} kg</td>
            <td>${new Date(r.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
            <td>
                <button onclick="prepareEdit('${r.id}', '${r.farmer_id}', ${r.kg_collected})" style="background:none; border:none; color:cyan; font-size:16px; cursor:pointer;">📝</button>
                <button onclick="deleteRecord('${r.id}')" style="background:none; border:none; color:#ff4d4d; font-size:16px; cursor:pointer;">❌</button>
            </td>
        </tr>`;
    });
    
    document.getElementById('dayTotalKg').innerText = total + " kg";
    document.getElementById('dayTotalValue').innerText = "Ksh " + (total * 8);
}

// 6. EDIT MODE HANDLERS
function prepareEdit(id, fId, kg) {
    editingId = id;
    document.getElementById('farmerSelect').value = fId;
    document.getElementById('kgInput').value = kg;
    document.getElementById('formTitle').innerText = "✏️ Edit Record";
    document.getElementById('saveBtn').innerText = "UPDATE RECORD";
    document.getElementById('cancelEditBtn').style.display = "block";
    window.scrollTo(0,0);
}

function cancelEdit() {
    editingId = null;
    document.getElementById('kgInput').value = '';
    document.getElementById('formTitle').innerText = "📝 Record Entry";
    document.getElementById('saveBtn').innerText = "SECURE RECORD";
    document.getElementById('cancelEditBtn').style.display = "none";
}

// 7. MONTHLY FILTER (FIXED RANGE)
async function loadMonthlySummary() {
    const monthNum = document.getElementById('monthSelect').value;
    const year = new Date().getFullYear();
    const start = `${year}-${monthNum}-01`;
    const end = `${year}-${monthNum}-31`;

    const { data } = await _supabase.from('daily_records').select('kg_collected, farmers(name)').gte('date_recorded', start).lte('date_recorded', end);

    const summary = {};
    data?.forEach(r => {
        const name = r.farmers ? r.farmers.name : "Unknown";
        summary[name] = (summary[name] || 0) + r.kg_collected;
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

// 8. FARMER MANAGEMENT
async function loadFarmerList() {
    const { data } = await _supabase.from('farmers').select('*').order('name');
    document.getElementById('farmerSelect').innerHTML = data.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    document.getElementById('farmerList').innerHTML = data.map(f => `
        <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #222;">
            <span>${f.name}</span>
            <button onclick="deleteFarmer('${f.id}', '${f.name}')" style="background:none; border:none; color:#ff4d4d; font-size:18px;">🗑️</button>
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
    if(confirm(`Delete ${name}?`)) {
        const { error } = await _supabase.from('farmers').delete().eq('id', id);
        if(!error) loadFarmerList();
        else alert("Farmer has existing records and cannot be deleted.");
    }
}

async function deleteRecord(id) {
    if(confirm("Delete record?")) {
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
