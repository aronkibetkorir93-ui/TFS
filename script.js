// CONFIGURATION
const SUB_URL = 'https://ilohlmmbgwywulojiadd.supabase.co';
const SUB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb2hsbW1iZ3d5d3Vsb2ppYWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTgwOTIsImV4cCI6MjA5Mjk5NDA5Mn0.LIx-wCr_P4tcF-lw7Lo7FvCzWw2ScmpyMvlx-BgoGgY';
const _supabase = supabase.createClient(SUB_URL, SUB_KEY);

let productionChart;

// VOICE ENGINE
function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1;
    window.speechSynthesis.speak(msg);
}

// LOGIN LOGIC
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        speak("Access denied.");
        alert(error.message);
    } else {
        speak("System online. Welcome back.");
        document.getElementById('loginOverlay').classList.add('animate__fadeOut');
        setTimeout(() => {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            initApp();
        }, 500);
    }
}

async function handleLogout() { await _supabase.auth.signOut(); location.reload(); }

// INITIALIZE APP
async function initApp() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;

    // Load Local Branding/Price
    document.getElementById('priceSetting').value = localStorage.getItem('teaPrice') || 8;
    document.getElementById('businessNameInput').value = localStorage.getItem('teaBusinessName') || "LeafLedger Hub";
    document.getElementById('displayBusinessName').innerText = document.getElementById('businessNameInput').value;

    document.getElementById('dateFilter').addEventListener('change', () => {
        loadDailyLog(document.getElementById('dateFilter').value);
        updateChart();
    });

    await fetchFarmers();
    await loadDailyLog(today);
    initChart();
}

// FETCH FARMERS LIST
async function fetchFarmers() {
    const { data } = await _supabase.from('farmers').select('*').order('name');
    const select = document.getElementById('farmerSelect');
    select.innerHTML = '<option value="">Choose Farmer</option>';
    data?.forEach(f => select.innerHTML += `<option value="${f.id}">${f.name}</option>`);
}

// SAVE ENTRY
document.getElementById('recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fId = document.getElementById('farmerSelect').value;
    const kg = parseFloat(document.getElementById('kgInput').value);
    const date = document.getElementById('dateFilter').value;

    const { error } = await _supabase.from('daily_records').insert([{ farmer_id: fId, kg_collected: kg, date_recorded: date }]);

    if (!error) {
        speak(`Confirmed. ${kg} kilos saved.`);
        document.getElementById('kgInput').value = '';
        loadDailyLog(date);
        updateChart();
    }
});

// LOAD TABLE & STATS
async function loadDailyLog(dateToLoad) {
    const { data } = await _supabase.from('daily_records').select(`id, kg_collected, created_at, farmers(name)`).eq('date_recorded', dateToLoad);
    const tbody = document.getElementById('dailyLogBody');
    tbody.innerHTML = '';
    
    let totalKg = 0;
    const price = parseFloat(document.getElementById('priceSetting').value);

    data?.forEach(r => {
        totalKg += r.kg_collected;
        tbody.innerHTML += `<tr class="animate__animated animate__fadeIn">
            <td>${r.farmers.name}</td>
            <td><strong>${r.kg_collected}</strong></td>
            <td>${new Date(r.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
            <td><button onclick="deleteRecord('${r.id}')" style="background:none; border:none; color:red;">❌</button></td>
        </tr>`;
    });

    document.getElementById('dayTotalKg').innerText = `${totalKg} kg`;
    document.getElementById('dayTotalValue').innerText = `Ksh ${(totalKg * price).toLocaleString()}`;
}

// DELETE LOGIC
async function deleteRecord(id) {
    if(confirm("Delete this entry?")) {
        const { error } = await _supabase.from('daily_records').delete().eq('id', id);
        if(!error) {
            speak("Entry removed.");
            loadDailyLog(document.getElementById('dateFilter').value);
            updateChart();
        }
    }
}

// CHARTING
function initChart() {
    const ctx = document.getElementById('productionChart').getContext('2d');
    productionChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Daily Yield', data: [], borderColor: '#39ff14', backgroundColor: 'rgba(57, 255, 20, 0.1)', fill: true, tension: 0.4 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#222' } }, x: { grid: { display: false } } } }
    });
    updateChart();
}

async function updateChart() {
    const { data } = await _supabase.from('daily_records').select('date_recorded, kg_collected');
    const grouped = {};
    data?.forEach(r => grouped[r.date_recorded] = (grouped[r.date_recorded] || 0) + r.kg_collected);
    
    const labels = Object.keys(grouped).sort().slice(-7);
    productionChart.data.labels = labels;
    productionChart.data.datasets[0].data = labels.map(l => grouped[l]);
    productionChart.update();
}

// SETTINGS & EXCEL
function saveSettings() {
    localStorage.setItem('teaPrice', document.getElementById('priceSetting').value);
    localStorage.setItem('teaBusinessName', document.getElementById('businessNameInput').value);
    speak("System settings updated.");
    location.reload();
}

async function exportToExcel() {
    const { data } = await _supabase.from('daily_records').select(`date_recorded, kg_collected, farmers(name)`);
    let csv = "Date,Farmer,Kilograms\n";
    data?.forEach(r => csv += `${r.date_recorded},${r.farmers.name},${r.kg_collected}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'LeafLedger_Backup.csv'; a.click();
    speak("Excel file exported.");
}

// SCREENSHOTS
document.getElementById('downloadDailyBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('dailyPrintArea'), { backgroundColor: '#0d0d0d' }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'DailyReport.png';
        link.href = canvas.toDataURL();
        link.click();
        speak("Snapshot saved.");
    });
});
