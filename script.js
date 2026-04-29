// CONFIGURATION - Your Supabase Credentials
const SUB_URL = 'https://ilohlmmbgwywulojiadd.supabase.co'; // Extracted from your token
const SUB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsb2hsbW1iZ3d5d3Vsb2ppYWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTgwOTIsImV4cCI6MjA5Mjk5NDA5Mn0.LIx-wCr_P4tcF-lw7Lo7FvCzWw2ScmpyMvlx-BgoGgY';
const _supabase = supabase.createClient(SUB_URL, SUB_KEY);

// LOGIN LOGIC
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Attempt to sign in
    const { data, error } = await _supabase.auth.signInWithPassword({ 
        email: email, 
        password: password 
    });
    
    if (error) {
        alert("Login Failed: " + error.message);
    } else {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        initApp();
    }
}

async function handleLogout() {
    await _supabase.auth.signOut();
    location.reload();
}

// INITIALIZE APP
async function initApp() {
    const now = new Date();
    // Display current month and year (e.g., April 2026)
    document.getElementById('currentMonthLabel').innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    await fetchFarmers();
    await loadEarnings();
}

// ADD NEW FARMER
async function addNewFarmer() {
    const nameInput = document.getElementById('newFarmerName');
    const name = nameInput.value.trim();
    if (!name) return alert("Please enter a farmer's name");

    const { error } = await _supabase.from('farmers').insert([{ name: name }]);
    
    if (error) {
        alert("Error: " + error.message);
    } else {
        nameInput.value = '';
        await fetchFarmers();
        alert(name + " added to the system!");
    }
}

// FETCH FARMERS FOR DROPDOWN
async function fetchFarmers() {
    const { data: farmers, error } = await _supabase
        .from('farmers')
        .select('*')
        .order('name', { ascending: true });

    if (error) return console.error(error);

    const select = document.getElementById('farmerSelect');
    select.innerHTML = '<option value="">Select Farmer</option>';
    
    farmers.forEach(f => {
        let opt = document.createElement('option');
        opt.value = f.id; 
        opt.textContent = f.name;
        select.appendChild(opt);
    });
}

// SAVE DAILY RECORD
document.getElementById('recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const farmer_id = document.getElementById('farmerSelect').value;
    const kg_collected = document.getElementById('kgInput').value;

    const { error } = await _supabase.from('daily_records').insert([
        { farmer_id: farmer_id, kg_collected: parseFloat(kg_collected) }
    ]);

    if (error) {
        alert("Error saving record: " + error.message);
    } else {
        document.getElementById('kgInput').value = '';
        await loadEarnings();
        alert("Tea weight saved successfully!");
    }
});

// LOAD AND CALCULATE EARNINGS
async function loadEarnings() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data, error } = await _supabase
        .from('monthly_farmer_earnings')
        .select('*')
        .eq('month_num', currentMonth)
        .eq('year_num', currentYear);

    if (error) {
        console.error("View Error:", error.message);
        return;
    }

    const tbody = document.getElementById('earningsBody');
    tbody.innerHTML = '';
    
    data.forEach(row => {
        tbody.innerHTML += `
            <tr>
                <td>${row.farmer_name}</td>
                <td>${row.total_kg} kg</td>
                <td>Ksh ${Number(row.total_earnings_ksh).toLocaleString()}</td>
            </tr>`;
    });
}

// DOWNLOAD REPORT AS IMAGE
document.getElementById('downloadBtn').addEventListener('click', () => {
    const element = document.getElementById('printArea');
    
    // Ensure the background is white for the screenshot
    html2canvas(element, { 
        backgroundColor: "#ffffff",
        scale: 2 
    }).then(canvas => {
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `Tea-Report-${timestamp}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
});
