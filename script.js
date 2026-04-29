const SUB_URL = 'https://ilohlmmbgwywulojiadd.supabase.co';
const SUB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb2hsbW1iZ3d5d3Vsb2ppYWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTgwOTIsImV4cCI6MjA5Mjk5NDA5Mn0.LIx-wCr_P4tcF-lw7Lo7FvCzWw2ScmpyMvlx-BgoGgY';
const _supabase = supabase.createClient(SUB_URL, SUB_KEY);

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        initApp();
    }
}

async function handleLogout() { await _supabase.auth.signOut(); location.reload(); }

async function initApp() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;
    document.getElementById('currentMonthLabel').innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    document.getElementById('dateFilter').addEventListener('change', (e) => loadDailyLog(e.target.value));

    fetchFarmers();
    loadEarnings();
    loadDailyLog(today);
    renderManageList();
}

async function addNewFarmer() {
    const name = document.getElementById('newFarmerName').value.trim();
    if (!name) return;
    await _supabase.from('farmers').insert([{ name }]);
    document.getElementById('newFarmerName').value = '';
    initApp();
}

async function fetchFarmers() {
    const { data: farmers } = await _supabase.from('farmers').select('*').order('name');
    const select = document.getElementById('farmerSelect');
    select.innerHTML = '<option value="">Select Farmer</option>';
    farmers.forEach(f => select.innerHTML += `<option value="${f.id}">${f.name}</option>`);
}

// RECORD WITH ANTI-DUPLICATE
document.getElementById('recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const farmer_id = document.getElementById('farmerSelect').value;
    const kg_collected = document.getElementById('kgInput').value;
    const today = new Date().toISOString().split('T')[0];

    // Duplicate Check
    const { data: existing } = await _supabase.from('daily_records').select('id').eq('farmer_id', farmer_id).eq('date_recorded', today);

    if (existing && existing.length > 0) {
        alert("Farmer already recorded for today. Use the 'Edit' button to change weight.");
        return;
    }

    const { error } = await _supabase.from('daily_records').insert([{ farmer_id, kg_collected }]);
    if (!error) {
        document.getElementById('kgInput').value = '';
        loadEarnings();
        loadDailyLog(today);
        alert("Saved!");
    }
});

async function loadDailyLog(selectedDate) {
    const { data } = await _supabase.from('daily_records').select(`kg_collected, created_at, farmers(name)`).eq('date_recorded', selectedDate);
    const tbody = document.getElementById('dailyLogBody');
    tbody.innerHTML = '';
    if (data && data.length > 0) {
        data.forEach(r => {
            const time = new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            tbody.innerHTML += `<tr><td>${r.farmers.name}</td><td>${r.kg_collected} kg</td><td>${time}</td></tr>`;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No records.</td></tr>';
    }
}

async function loadEarnings() {
    const now = new Date();
    const { data } = await _supabase.from('monthly_farmer_earnings').select('*').eq('month_num', now.getMonth() + 1).eq('year_num', now.getFullYear());
    const tbody = document.getElementById('earningsBody');
    tbody.innerHTML = '';
    data.forEach(row => {
        tbody.innerHTML += `<tr><td>${row.farmer_name}</td><td>${row.total_kg} kg</td><td>Ksh ${row.total_earnings_ksh.toLocaleString()}</td></tr>`;
    });
}

async function renderManageList() {
    const { data: farmers } = await _supabase.from('farmers').select('*').order('name');
    const list = document.getElementById('manageFarmersList');
    list.innerHTML = '';
    farmers.forEach(f => {
        list.innerHTML += `<li class="manage-item"><span>${f.name}</span><div>
            <button onclick="editToday('${f.id}', '${f.name}')" class="btn-edit">Edit Today</button>
            <button onclick="deleteFarmer('${f.id}', '${f.name}')" class="btn-del">Delete</button>
        </div></li>`;
    });
}

async function editToday(fId, name) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await _supabase.from('daily_records').select('*').eq('farmer_id', fId).eq('date_recorded', today);
    if (data.length === 0) return alert("No record for today.");
    const newKg = prompt(`Update KG for ${name}:`, data[0].kg_collected);
    if (newKg) {
        await _supabase.from('daily_records').update({ kg_collected: newKg }).eq('id', data[0].id);
        initApp();
    }
}

async function deleteFarmer(id, name) {
    if (confirm(`Delete ${name} and all their records?`)) {
        await _supabase.from('farmers').delete().eq('id', id);
        initApp();
    }
}

// DOWNLOAD AS IMAGES
document.getElementById('downloadBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('printArea'), { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Monthly-Tea-Report.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
});

document.getElementById('downloadDailyBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('dailyPrintArea'), { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Daily-Tea-Ledger.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
});
            
