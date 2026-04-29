// SUPABASE CONNECTION
const SUB_URL = 'https://ilohlmmbgwywulojiadd.supabase.co';
const SUB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb2hsbW1iZ3d5d3Vsb2ppYWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTgwOTIsImV4cCI6MjA5Mjk5NDA5Mn0.LIx-wCr_P4tcF-lw7Lo7FvCzWw2ScmpyMvlx-BgoGgY';
const _supabase = supabase.createClient(SUB_URL, SUB_KEY);

let productionChart;

// VOICE FEEDBACK
function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
}

// NAVIGATION
function switchTab(event, tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
    
    event.currentTarget.classList.add('active');
    document.getElementById(tabName + 'Section').style.display = 'block';

    if (tabName === 'monthly') loadMonthlySummary();
    if (tabName === 'farmers') loadFarmerList();
}

// AUTHENTICATION
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        speak("Access denied.");
        alert(error.message);
    } else {
        speak("System online.");
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        initApp();
    }
}

async function handleLogout() { await _supabase.auth.signOut(); location.reload(); }

// INITIALIZATION
async function initApp() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;

    document.getElementById('dateFilter').addEventListener('change', () => loadDailyData());
    
    await fetchFarmersForSelect();
    await loadDailyData();
    initChart();
}

// FARMER MANAGEMENT
async function addNewFarmer() {
    const name = document.getElementById('newFarmerName').value.trim();
    if (!name) return alert("Please enter a name.");

    const { error } = await _supabase.from('farmers').insert([{ name }]);
    if (!error) {
        speak("Farmer registered.");
        document.getElementById('newFarmerName').value = '';
        loadFarmerList();
        fetchFarmersForSelect();
    }
}

async function loadFarmerList() {
    const { data } = await _supabase.from('farmers').select('*').order('name');
    const container = document.getElementById('farmerList');
    container.innerHTML = data.map(f => `<div style="padding:15px; border-bottom:1px solid #222;">${f.name}</div>`).join('');
}

async function fetchFarmersForSelect() {
    const { data } = await _supabase.from('farmers').select('*').order('name');
    const select = document.getElementById('farmerSelect');
    select.innerHTML = data.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
}

// DAILY LOGIC
async function saveRecord() {
    const fId = document.getElementById('farmerSelect').value;
    const kg = parseFloat(document.getElementById('kgInput').value);
    const date = document.getElementById('dateFilter').value;

    if (!kg) return alert("Enter weight.");

    const { error } = await _supabase.from('daily_records').insert([{ farmer_id: fId, kg_collected: kg, date_recorded: date }]);
    if (!error) {
        speak("Record saved.");
        document.getElementById('kgInput').value = '';
        loadDailyData();
        updateChart();
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
        tbody.innerHTML += `<tr>
            <td>${r.farmers.name}</td>
            <td>${r.kg_collected} kg</td>
            <td>${new Date(r.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
            <td><button onclick="deleteRecord('${r.id}')" style="background:none; border:none; color:red;">❌</button></td>
        </tr>`;
    });

    document.getElementById('dayTotalKg').innerText = total + " kg";
    document.getElementById('dayTotalValue').innerText = "Ksh " + (total * 8);
}

async function deleteRecord(id) {
    if (confirm("Delete entry?")) {
        await _supabase.from('daily_records').delete().eq('id', id);
        loadDailyData();
    }
}

// MONTHLY LOGIC
async function loadMonthlySummary() {
    const monthNum = document.getElementById('monthSelect').value;
    const { data } = await _supabase.from('daily_records').select('kg_collected, farmers(name)');
    
    // Grouping logic (simplified for frontend)
    const summary = {};
    data.forEach(r => {
        const name = r.farmers.name;
        summary[name] = (summary[name] || 0) + r.kg_collected;
    });

    const tbody = document.getElementById('monthlyBody');
    tbody.innerHTML = Object.entries(summary).map(([name, kg]) => `
        <tr><td>${name}</td><td>${kg} kg</td><td>Ksh ${kg * 8}</td></tr>
    `).join('');
}

// CHARTING & EXTRAS
function initChart() {
    const ctx = document.getElementById('productionChart').getContext('2d');
    productionChart = new Chart(ctx, {
        type: 'line',
        data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [{ data: [0,0,0,0,0,0,0], borderColor: '#39ff14', tension: 0.4 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }
    });
}

async function updateChart() {
    // In a real scenario, you'd fetch the last 7 days here.
}

function takeSnapshot() {
    html2canvas(document.getElementById('printArea'), { backgroundColor: '#161616' }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'TeaReport.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}

async function exportToExcel() {
    const { data } = await _supabase.from('daily_records').select('date_recorded, kg_collected, farmers(name)');
    let csv = "Date,Farmer,KG\n";
    data.forEach(r => csv += `${r.date_recorded},${r.farmers.name},${r.kg_collected}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Monthly_Tea_Report.csv'; a.click();
}
