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
    document.getElementById('currentMonthLabel').innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    fetchFarmers();
    loadEarnings();
    renderManageList();
}

async function addNewFarmer() {
    const name = document.getElementById('newFarmerName').value.trim();
    if (!name) return;
    const { error } = await _supabase.from('farmers').insert([{ name }]);
    if (!error) {
        document.getElementById('newFarmerName').value = '';
        initApp();
    }
}

async function fetchFarmers() {
    const { data: farmers } = await _supabase.from('farmers').select('*').order('name');
    const select = document.getElementById('farmerSelect');
    select.innerHTML = '<option value="">Select Farmer</option>';
    farmers.forEach(f => {
        select.innerHTML += `<option value="${f.id}">${f.name}</option>`;
    });
}

document.getElementById('recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const farmer_id = document.getElementById('farmerSelect').value;
    const kg_collected = document.getElementById('kgInput').value;
    const { error } = await _supabase.from('daily_records').insert([{ farmer_id, kg_collected }]);
    if (!error) {
        document.getElementById('kgInput').value = '';
        loadEarnings();
        alert("Saved!");
    }
});

async function loadEarnings() {
    const now = new Date();
    const { data } = await _supabase.from('monthly_farmer_earnings')
        .select('*').eq('month_num', now.getMonth() + 1).eq('year_num', now.getFullYear());
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
            <button onclick="deleteFarmer('${f.id}', '${f.name}')" class="btn-del">Del</button>
        </div></li>`;
    });
}

async function editToday(fId, name) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await _supabase.from('daily_records').select('*').eq('farmer_id', fId).eq('date_recorded', today);
    if (data.length === 0) return alert("No record for today.");
    const newKg = prompt(`Edit KG for ${name}:`, data[0].kg_collected);
    if (newKg) {
        await _supabase.from('daily_records').update({ kg_collected: newKg }).eq('id', data[0].id);
        loadEarnings();
    }
}

async function deleteFarmer(id, name) {
    if (confirm(`Delete ${name}?`)) {
        await _supabase.from('farmers').delete().eq('id', id);
        initApp();
    }
}
// 1. Update initApp to set default date and listener
async function initApp() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const dateInput = document.getElementById('dateFilter');
    dateInput.value = today; // Set default to today
    
    // Listen for date changes
    dateInput.addEventListener('change', () => {
        loadDailyLog(dateInput.value);
    });

    document.getElementById('currentMonthLabel').innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    fetchFarmers();
    loadEarnings();        // Monthly summary keeps accumulating
    loadDailyLog(today);   // Load today's records by default
    renderManageList();
}

// 2. Updated Daily Log function to accept a specific date
async function loadDailyLog(selectedDate) {
    const { data, error } = await _supabase
        .from('daily_records')
        .select(`
            id,
            kg_collected,
            created_at,
            farmers ( name )
        `)
        .eq('date_recorded', selectedDate)
        .order('created_at', { ascending: false });

    const tbody = document.getElementById('dailyLogBody');
    tbody.innerHTML = '';

    if (data && data.length > 0) {
        data.forEach(record => {
            const time = new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            tbody.innerHTML += `
                <tr>
                    <td>${record.farmers.name}</td>
                    <td>${record.kg_collected} kg</td>
                    <td style="color: #888; font-size: 12px;">${time}</td>
                </tr>`;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#999;">No records for this date.</td></tr>';
    }
}

// 3. Update the Submit Logic in the form listener
// Change this line inside your recordForm.addEventListener:
if (!error) {
    document.getElementById('kgInput').value = '';
    const currentDateView = document.getElementById('dateFilter').value;
    loadEarnings(); 
    loadDailyLog(currentDateView); // Refresh the view for the currently selected date
    alert("Record Saved!");
}


document.getElementById('downloadBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('printArea'), { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Tea-Report.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
});
