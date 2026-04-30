// Local Storage Persistence
let farmers = JSON.parse(localStorage.getItem('tea_farmers')) || [];
let records = JSON.parse(localStorage.getItem('tea_records')) || [];

// PIN SECURITY
function checkPin() {
    const input = document.getElementById('pinInput').value;
    if (input === "1234") {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        initApp();
    } else {
        alert("Access Denied: Wrong PIN");
        document.getElementById('pinInput').value = '';
    }
}

// INITIALIZE APP
function initApp() {
    // Set Date
    document.getElementById('dateFilter').value = new Date().toISOString().split('T')[0];
    
    // Setup Month Dropdown
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const mSelect = document.getElementById('monthSelect');
    mSelect.innerHTML = months.map((m, i) => `<option value="${("0"+(i+1)).slice(-2)}">${m}</option>`).join('');
    mSelect.value = ("0" + (new Date().getMonth() + 1)).slice(-2);

    updateFarmerUI();
    loadDaily();
    
    // Auto-load when date changes
    document.getElementById('dateFilter').addEventListener('change', loadDaily);
}

// NAVIGATION
function switchTab(e, tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
    e.target.classList.add('active');
    document.getElementById(tab + 'Section').style.display = 'block';
    
    if(tab === 'monthly') loadMonthlySummary();
    if(tab === 'farmers') displayFarmersList();
}

// FARMER MANAGEMENT
function addNewFarmer() {
    const input = document.getElementById('newFarmerName');
    const name = input.value.trim();
    if(!name) return alert("Enter a name");
    
    farmers.push(name);
    localStorage.setItem('tea_farmers', JSON.stringify(farmers));
    input.value = '';
    updateFarmerUI();
    displayFarmersList();
    alert("Farmer added!");
}

function updateFarmerUI() {
    const select = document.getElementById('farmerSelect');
    select.innerHTML = farmers.map(f => `<option value="${f}">${f}</option>`).join('');
}

function displayFarmersList() {
    const list = document.getElementById('farmerList');
    list.innerHTML = farmers.map(f => `<div class="card" style="margin-bottom:8px; padding:12px;">${f}</div>`).join('');
}

// RECORDS LOGIC
function saveRecord() {
    const name = document.getElementById('farmerSelect').value;
    const kg = parseFloat(document.getElementById('kgInput').value);
    const date = document.getElementById('dateFilter').value;

    if(!name || !kg) return alert("Select farmer and enter weight");

    records.push({ id: Date.now(), name, kg, date });
    localStorage.setItem('tea_records', JSON.stringify(records));
    
    document.getElementById('kgInput').value = '';
    loadDaily();
    alert("Record Saved!");
}

function loadDaily() {
    const day = document.getElementById('dateFilter').value;
    const filtered = records.filter(r => r.date === day);
    const body = document.getElementById('dailyLogBody');
    
    body.innerHTML = filtered.map(r => `
        <tr>
            <td>${r.name}</td>
            <td>${r.kg} kg</td>
            <td><button onclick="deleteRecord(${r.id})" style="color:red; background:none; border:none; font-size:16px;">&times;</button></td>
        </tr>
    `).join('');
}

function loadMonthlySummary() {
    const month = document.getElementById('monthSelect').value;
    const summary = {};

    records.forEach(r => {
        if(r.date.split('-')[1] === month) {
            summary[r.name] = (summary[r.name] || 0) + r.kg;
        }
    });

    const body = document.getElementById('monthlyBody');
    body.innerHTML = Object.entries(summary).map(([name, total]) => `
        <tr>
            <td>${name}</td>
            <td>${total.toFixed(2)} kg</td>
            <td style="color:#39ff14">Ksh ${Math.round(total * 8)}</td>
        </tr>
    `).join('');
}

function deleteRecord(id) {
    if(confirm("Remove this entry?")) {
        records = records.filter(r => r.id !== id);
        localStorage.setItem('tea_records', JSON.stringify(records));
        loadDaily();
    }
                  }
