// 1. CONFIGURATION
const SUB_URL = 'https://ilohlmmbgwywulojiadd.supabase.co';
const SUB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb2hsbW1iZ3d5d3Vsb2ppYWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTgwOTIsImV4cCI6MjA5Mjk5NDA5Mn0.LIx-wCr_P4tcF-lw7Lo7FvCzWw2ScmpyMvlx-BgoGgY';
const _supabase = supabase.createClient(SUB_URL, SUB_KEY);

// 2. LOGIN & VOICE GREETING
async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if(!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            alert("Login failed: " + error.message);
        } else {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            
            // Voice Welcome
            const msg = new SpeechSynthesisUtterance("Welcome to the Tea Farming management system.");
            window.speechSynthesis.speak(msg);

            initApp();
        }
    } catch (err) {
        alert("Connection Error: " + err.message);
    }
}

async function handleLogout() { 
    await _supabase.auth.signOut(); 
    location.reload(); 
}

function saveSettings() {
    const newPrice = document.getElementById('priceSetting').value;
    localStorage.setItem('teaPrice', newPrice); // Saves it on the phone memory
    
    // Refresh the tables to show new calculations
    const selectedDate = document.getElementById('dateFilter').value;
    const d = new Date(selectedDate);
    loadEarnings(d.getMonth() + 1, d.getFullYear());
    
    alert("Price updated to Ksh " + newPrice);
}



// 3. INITIALIZE DASHBOARD
async function initApp() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dateFilter = document.getElementById('dateFilter');
    
    dateFilter.value = today;
    
    // Sync Daily Ledger and Monthly Report when date changes
    dateFilter.addEventListener('change', (e) => {
        const selectedDate = e.target.value;
        const d = new Date(selectedDate);
        loadDailyLog(selectedDate);
        loadEarnings(d.getMonth() + 1, d.getFullYear());
    });

    await fetchFarmers();
    await loadDailyLog(today);
    await loadEarnings(now.getMonth() + 1, now.getFullYear());
    await renderManageList();
}

// 4. FARMER MANAGEMENT
async function fetchFarmers() {
    const { data } = await _supabase.from('farmers').select('*').order('name');
    const select = document.getElementById('farmerSelect');
    select.innerHTML = '<option value="">Select Farmer</option>';
    if(data) data.forEach(f => select.innerHTML += `<option value="${f.id}">${f.name}</option>`);
}

async function addNewFarmer() {
    const name = document.getElementById('newFarmerName').value.trim();
    if (!name) return;
    await _supabase.from('farmers').insert([{ name }]);
    document.getElementById('newFarmerName').value = '';
    initApp();
}

// 5. SAVE RECORD (FOLLOWS THE CALENDAR DATE)
document.getElementById('recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const farmer_id = document.getElementById('farmerSelect').value;
    const kg_collected = parseFloat(document.getElementById('kgInput').value);
    
    // IMPORTANT: Get date from the calendar, not from real-time clock
    const selectedDate = document.getElementById('dateFilter').value; 

    // Check for duplicates on the SELECTED date
    const { data: existing } = await _supabase.from('daily_records')
        .select('id').eq('farmer_id', farmer_id).eq('date_recorded', selectedDate);

    if (existing && existing.length > 0) {
        alert("This farmer already has a record for " + selectedDate);
        return;
    }

    // Insert record for the chosen date
    const { error } = await _supabase.from('daily_records').insert([
        { farmer_id, kg_collected, date_recorded: selectedDate }
    ]);

    if (!error) {
        document.getElementById('kgInput').value = '';
        loadDailyLog(selectedDate);
        const d = new Date(selectedDate);
        loadEarnings(d.getMonth() + 1, d.getFullYear());
        alert("Saved for " + selectedDate);
    } else {
        alert("Error: " + error.message);
    }
});

// 6. TABLE LOADERS
async function loadDailyLog(dateToLoad) {
    const { data } = await _supabase.from('daily_records')
        .select(`kg_collected, created_at, farmers(name)`)
        .eq('date_recorded', dateToLoad)
        .order('created_at', { ascending: false });
    
    const tbody = document.getElementById('dailyLogBody');
    tbody.innerHTML = '';
    if (data && data.length > 0) {
        data.forEach(r => {
            const time = new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            tbody.innerHTML += `<tr><td>${r.farmers.name}</td><td><strong>${r.kg_collected} kg</strong></td><td>${time}</td></tr>`;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No records for this date.</td></tr>';
    }
}

async function loadEarnings(month, year) {
    // Get the price from the input box or default to 8
    const currentPrice = parseFloat(document.getElementById('priceSetting').value) || 8;
    
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    document.getElementById('currentMonthLabel').innerText = monthName;

    const { data } = await _supabase.from('monthly_farmer_earnings')
        .select('*').eq('month_num', month).eq('year_num', year);
    
    const tbody = document.getElementById('earningsBody');
    tbody.innerHTML = '';
    
    if(data) {
        data.forEach(row => {
            // DYNAMIC CALCULATION: No more hardcoded 8!
            const dynamicPayable = row.total_kg * currentPrice;
            
            tbody.innerHTML += `
                <tr>
                    <td>${row.farmer_name}</td>
                    <td>${row.total_kg} kg</td>
                    <td><strong>Ksh ${dynamicPayable.toLocaleString()}</strong></td>
                </tr>`;
        });
    }
}


// 7. EDIT / DELETE
async function renderManageList() {
    const { data: farmers } = await _supabase.from('farmers').select('*').order('name');
    const list = document.getElementById('manageFarmersList');
    list.innerHTML = '';
    if(farmers) {
        farmers.forEach(f => {
            list.innerHTML += `<li class="manage-item"><span>${f.name}</span><div>
                <button onclick="editToday('${f.id}', '${f.name}')" class="btn-edit">Edit Today</button>
                <button onclick="deleteFarmer('${f.id}', '${f.name}')" class="btn-del">Delete</button>
            </div></li>`;
        });
    }
}

async function editToday(fId, name) {
    const selectedDate = document.getElementById('dateFilter').value;
    const { data } = await _supabase.from('daily_records')
        .select('*').eq('farmer_id', fId).eq('date_recorded', selectedDate);
    
    if (!data || data.length === 0) return alert(`No record found for ${name} on ${selectedDate}`);
    
    const newKg = prompt(`Update KG for ${name} (${selectedDate}):`, data[0].kg_collected);
    if (newKg) {
        await _supabase.from('daily_records').update({ kg_collected: parseFloat(newKg) }).eq('id', data[0].id);
        initApp();
    }
}

async function deleteFarmer(id, name) {
    if (confirm(`Delete ${name} and all their history?`)) {
        await _supabase.from('farmers').delete().eq('id', id);
        initApp();
    }
}

// 8. DOWNLOADS
document.getElementById('downloadBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('printArea'), { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Monthly-Report.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
});

document.getElementById('downloadDailyBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('dailyPrintArea'), { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Daily-Ledger.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
});
