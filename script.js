// --- 1. SETUP SUPABASE ---
const SUB_URL = 'https://ilohlmmbgwywulojiadd.supabase.co';
const SUB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb2hsbW1iZ3d5d3Vsb2ppYWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTgwOTIsImV4cCI6MjA5Mjk5NDA5Mn0.LIx-wCr_P4tcF-lw7Lo7FvCzWw2ScmpyMvlx-BgoGgY';
const _supabase = supabase.createClient(SUB_URL, SUB_KEY);

// --- 2. LOGIN & VOICE GREETING ---
async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if(!email || !password) return alert("Please enter your email and password.");

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        alert("Login failed. Check your password or email. Error: " + error.message);
    } else {
        // Hide login and show app
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        // Voice Greeting Magic
        const greeting = new SpeechSynthesisUtterance("Welcome to the Tea Farming management system.");
        greeting.rate = 0.9; // Slightly slower, friendly speed
        window.speechSynthesis.speak(greeting);

        initApp();
    }
}

async function handleLogout() { 
    await _supabase.auth.signOut(); 
    location.reload(); 
}

// --- 3. INITIALIZE & SYNC LOGIC ---
async function initApp() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const dateFilter = document.getElementById('dateFilter');
    dateFilter.value = today;
    
    // Listen for Date changes to update both Daily & Monthly tables!
    dateFilter.addEventListener('change', (e) => {
        const selectedDate = e.target.value;
        const d = new Date(selectedDate);
        
        loadDailyLog(selectedDate);
        loadEarnings(d.getMonth() + 1, d.getFullYear()); // Syncs the month
    });

    await fetchFarmers();
    await loadDailyLog(today);
    await loadEarnings(now.getMonth() + 1, now.getFullYear());
    await renderManageList();
}

// --- 4. FARMER REGISTRATION ---
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
    if(farmers) farmers.forEach(f => select.innerHTML += `<option value="${f.id}">${f.name}</option>`);
}

// --- 5. RECORD DATA (NO DUPLICATES) ---
document.getElementById('recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const farmer_id = document.getElementById('farmerSelect').value;
    const kg_collected = parseFloat(document.getElementById('kgInput').value);
    const today = new Date().toISOString().split('T')[0];

    // Duplicate Check
    const { data: existing } = await _supabase.from('daily_records')
        .select('id').eq('farmer_id', farmer_id).eq('date_recorded', today);

    if (existing && existing.length > 0) {
        alert("Wait! This farmer already has a record today. Use 'Edit Today' to change it.");
        return;
    }

    const { error } = await _supabase.from('daily_records').insert([{ farmer_id, kg_collected }]);
    if (!error) {
        document.getElementById('kgInput').value = '';
        initApp(); // Refresh everything
    } else {
        alert("Error saving: " + error.message);
    }
});

// --- 6. LOAD TABLES ---
async function loadDailyLog(selectedDate) {
    const { data } = await _supabase.from('daily_records')
        .select(`kg_collected, created_at, farmers(name)`)
        .eq('date_recorded', selectedDate)
        .order('created_at', { ascending: false });
    
    const tbody = document.getElementById('dailyLogBody');
    tbody.innerHTML = '';
    if (data && data.length > 0) {
        data.forEach(r => {
            const time = new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            tbody.innerHTML += `<tr><td>${r.farmers.name}</td><td><strong>${r.kg_collected} kg</strong></td><td style="color:#666;">${time}</td></tr>`;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#999;">No records found for this date.</td></tr>';
    }
}

async function loadEarnings(month, year) {
    const targetMonth = month;
    const targetYear = year;

    // Update the label UI to match the selected month
    const monthName = new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    document.getElementById('currentMonthLabel').innerText = monthName;

    const { data } = await _supabase.from('monthly_farmer_earnings')
        .select('*').eq('month_num', targetMonth).eq('year_num', targetYear);
    
    const tbody = document.getElementById('earningsBody');
    tbody.innerHTML = '';
    if(data) {
        data.forEach(row => {
            tbody.innerHTML += `<tr><td>${row.farmer_name}</td><td>${row.total_kg} kg</td><td><strong>Ksh ${row.total_earnings_ksh.toLocaleString()}</strong></td></tr>`;
        });
    }
}

// --- 7. MANAGE (EDIT / DELETE) ---
async function renderManageList() {
    const { data: farmers } = await _supabase.from('farmers').select('*').order('name');
    const list = document.getElementById('manageFarmersList');
    list.innerHTML = '';
    if(farmers) {
        farmers.forEach(f => {
            list.innerHTML += `<li class="manage-item"><strong>${f.name}</strong><div>
                <button onclick="editToday('${f.id}', '${f.name}')" class="btn-edit">Edit Today</button>
                <button onclick="deleteFarmer('${f.id}', '${f.name}')" class="btn-del">Delete</button>
            </div></li>`;
        });
    }
}

async function editToday(fId, name) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await _supabase.from('daily_records').select('*').eq('farmer_id', fId).eq('date_recorded', today);
    if (!data || data.length === 0) return alert(`No record for ${name} today.`);
    
    const newKg = prompt(`Update KG for ${name}:`, data[0].kg_collected);
    if (newKg !== null && !isNaN(newKg)) {
        await _supabase.from('daily_records').update({ kg_collected: parseFloat(newKg) }).eq('id', data[0].id);
        initApp();
    }
}

async function deleteFarmer(id, name) {
    if (confirm(`Warning: Delete ${name} and ALL their past records forever?`)) {
        await _supabase.from('farmers').delete().eq('id', id);
        initApp();
    }
}

// --- 8. DOWNLOAD IMAGES ---
document.getElementById('downloadBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('printArea'), { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Monthly-Tea-Report.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
});

document.getElementById('downloadDailyBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('dailyPrintArea'), { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
        const link = document.createElement('a');
        const d = document.getElementById('dateFilter').value;
        link.download = `Daily-Tea-Ledger-${d}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
});
