// Data persistence using LocalStorage
let farmers = JSON.parse(localStorage.getItem('farmers_list')) || [];
let teaRecords = JSON.parse(localStorage.getItem('tea_records_list')) || [];

// Initialize app
window.onload = () => {
    // Set default date to today
    document.getElementById('dateFilter').value = new Date().toISOString().split('T')[0];
    // Set default month to current month
    document.getElementById('monthSelect').value = ("0" + (new Date().getMonth() + 1)).slice(-2);
    
    updateFarmerDropdown();
    loadDaily();
};

// Switching Tabs
function switchTab(e, sectionId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
    
    e.target.classList.add('active');
    document.getElementById(sectionId + 'Section').style.display = 'block';
    
    if(sectionId === 'monthly') loadMonthlySummary();
    if(sectionId === 'farmers') displayFarmersList();
}

// Add New Farmer
function addNewFarmer() {
    const nameInput = document.getElementById('newFarmerName');
    const name = nameInput.value.trim();
    
    if(!name) return alert("Please enter a name");
    
    farmers.push(name);
    localStorage.setItem('farmers_list', JSON.stringify(farmers));
    nameInput.value = '';
    displayFarmersList();
    updateFarmerDropdown();
    alert("Farmer " + name + " added successfully!");
}

function displayFarmersList() {
    const listDiv = document.getElementById('farmerList');
    listDiv.innerHTML = farmers.map(f => `<div class="card" style="margin-bottom:5px; padding:10px;">${f}</div>`).join('');
}

function updateFarmerDropdown() {
    const select = document.getElementById('farmerSelect');
    select.innerHTML = farmers.map(f => `<option value="${f}">${f}</option>`).join('');
}

// Save Tea Record
function saveRecord() {
    const name = document.getElementById('farmerSelect').value;
    const kg = parseFloat(document.getElementById('kgInput').value);
    const date = document.getElementById('dateFilter').value;

    if(!name || !kg) return alert("Please select farmer and enter weight");

    const newRecord = {
        id: Date.now(),
        name: name,
        kg: kg,
        date: date
    };

    teaRecords.push(newRecord);
    localStorage.setItem('tea_records_list', JSON.stringify(teaRecords));
    
    document.getElementById('kgInput').value = '';
    loadDaily();
    alert("Record saved to memory!");
}

// Load Daily View
function loadDaily() {
    const selectedDate = document.getElementById('dateFilter').value;
    const filtered = teaRecords.filter(r => r.date === selectedDate);
    
    const body = document.getElementById('dailyLogBody');
    body.innerHTML = filtered.map(r => `
        <tr>
            <td>${r.name}</td>
            <td>${r.kg} kg</td>
            <td><button onclick="deleteRecord(${r.id})" style="color:red; background:none; border:none; font-size:12px;">Remove</button></td>
        </tr>
    `).join('');
}

// Load Monthly Summary
function loadMonthlySummary() {
    const selectedMonth = document.getElementById('monthSelect').value;
    const summary = {};

    teaRecords.forEach(r => {
        const recordMonth = r.date.split('-')[1]; // Gets the MM from YYYY-MM-DD
        if(recordMonth === selectedMonth) {
            summary[r.name] = (summary[r.name] || 0) + r.kg;
        }
    });

    const body = document.getElementById('monthlyBody');
    body.innerHTML = Object.entries(summary).map(([name, totalKg]) => `
        <tr>
            <td>${name}</td>
            <td>${totalKg.toFixed(2)} kg</td>
            <td style="color:#39ff14">Ksh ${(totalKg * 8).toLocaleString()}</td>
        </tr>
    `).join('');
}

function deleteRecord(id) {
    if(confirm("Delete this entry?")) {
        teaRecords = teaRecords.filter(r => r.id !== id);
        localStorage.setItem('tea_records_list', JSON.stringify(teaRecords));
        loadDaily();
    }
}

