/* -------------------------------------------------------------------------- */
/* 3. Navigation                                                              */
/* -------------------------------------------------------------------------- */
function setupNavListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget.getAttribute('data-target');
            if (target) switchTab(target);
            closeMobileMenu();
        });
    });
}

const closeMobileMenu = () => { document.getElementById('mobile-sidebar').classList.add('-translate-x-full'); document.getElementById('mobile-sidebar-overlay').classList.add('hidden'); };

async function switchTab(tab) {
    currentView = tab;
    document.querySelectorAll('.nav-item').forEach(i => {
        if (i.getAttribute('data-target') === tab) { i.classList.add('active'); document.getElementById('page-title').innerText = i.innerText.trim(); }
        else i.classList.remove('active');
    });
    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="flex justify-center py-10"><i class="fa-solid fa-spinner fa-spin text-primary text-4xl"></i></div>`;
    try {
        if (tab === 'dashboard') await renderDashboard();
        else if (tab === 'income') await renderTableTab('rentIncome', 'Income', 'Income Records', ['date', 'amount', 'addedBy']);
        else if (tab === 'expenses') await renderTableTab('expenses', 'Expense', 'Expense Records', ['date', 'category', 'description', 'amount', 'bill', 'addedBy']);
        else if (tab === 'monthlyKm') await renderTableTab('monthlyKm', 'KM Log', 'Monthly KM Logs', ['date', 'startKm', 'endKm', 'monthlyKm', 'currentKm', 'addedBy']);
        else if (tab === 'services') await renderTableTab('serviceTracker', 'Service', 'Service Records', ['serviceDate', 'serviceKm', 'intervalKm', 'nextServiceKm', 'remainingKm', 'status', 'addedBy']);
        else if (tab === 'renewals') await renderTableTab('renewals', 'Vehicle Document', 'Vehicle Documents', ['type', 'lastRenewedDate', 'expiryDate', 'documentImage', 'addedBy']);
        else if (tab === 'vehicleInfo') await renderVehicleInfo();
        else if (tab === 'users' && currentUser.role === 'admin') await renderUsersTab();
        else if (tab === 'backup' && currentUser.role === 'admin') renderBackupTab();
    } catch (err) { console.error(err); mc.innerHTML = `<div class="p-4 text-red-500 bg-red-50 rounded-lg">Error loading data. Check internet.</div>`; }
}

/* -------------------------------------------------------------------------- */
/* 4. Dashboard View (With Charts)                                            */
/* -------------------------------------------------------------------------- */
async function renderDashboard() {
    const incomeRecords = await fetchCollection('rentIncome');
    const expenseRecords = await fetchCollection('expenses');
    const kmRecords = await fetchCollection('monthlyKm');
    const kmLog = kmRecords.length > 0 ? kmRecords[0] : null;

    const totalIncome = incomeRecords.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpense = expenseRecords.reduce((sum, item) => sum + Number(item.amount), 0);
    const netProfit = totalIncome - totalExpense;
    const currentKm = kmLog ? kmLog.currentKm : 0;

    let html = `
        <div class="mb-6 slide-up">
            <h2 class="text-2xl font-bold text-slate-800">Welcome back, ${currentUser ? currentUser.username : 'User'}!</h2>
            <p class="text-sm text-slate-500 mt-1">Here is the latest summary of your vehicle operations.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center slide-up delay-100 hover-lift">
                <div class="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-2xl mr-5"><i class="fa-solid fa-arrow-trend-up"></i></div>
                <div><p class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Income</p><p class="text-2xl font-black text-slate-800">${formatCurrency(totalIncome)}</p></div>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center slide-up delay-200 hover-lift">
                <div class="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-2xl mr-5"><i class="fa-solid fa-money-bill-transfer"></i></div>
                <div><p class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Expense</p><p class="text-2xl font-black text-slate-800">${formatCurrency(totalExpense)}</p></div>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center slide-up delay-300 hover-lift">
                <div class="w-14 h-14 rounded-full ${netProfit >= 0 ? 'bg-indigo-50 text-indigo-500' : 'bg-orange-50 text-orange-500'} flex items-center justify-center text-2xl mr-5"><i class="fa-solid fa-wallet"></i></div>
                <div><p class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Net Profit</p><p class="text-2xl font-black ${netProfit >= 0 ? 'text-indigo-600' : 'text-orange-500'}">${formatCurrency(netProfit)}</p></div>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center slide-up delay-400 hover-lift">
                <div class="w-14 h-14 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center text-2xl mr-5"><i class="fa-solid fa-gauge-high"></i></div>
                <div><p class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Current KM</p><p class="text-2xl font-black text-slate-800">${formatKm(currentKm)} <span class="text-sm font-medium text-slate-400">KM</span></p></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 slide-up delay-200 flex flex-col">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-lg text-slate-800">Financial Overview</h3>
                    <div class="p-2 bg-slate-50 rounded-lg"><i class="fa-solid fa-chart-column text-slate-400"></i></div>
                </div>
                <div class="relative flex-1 w-full min-h-[300px]"><canvas id="financeChart"></canvas></div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden slide-up delay-300 flex flex-col">
                <div class="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 class="font-bold text-lg text-slate-800">Action Center</h3>
                    <span class="flex h-3 w-3 relative"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span></span>
                </div>
                <div class="p-6 flex-1 overflow-auto"><h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Service Alerts</h4><div id="dash-services-list" class="space-y-3 mb-6"></div><h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Document Renewals</h4><div id="dash-renewals-list" class="space-y-3"></div></div>
            </div>
        </div>
    `;
    document.getElementById('main-content').innerHTML = html;

    // Render Chart
    renderChart(totalIncome, totalExpense, netProfit);

    // Render Alerts (Renewals & Services)
    const renewals = await fetchCollection('renewals');
    const renList = document.getElementById('dash-renewals-list');

    const latestRenewals = {};
    renewals.forEach(r => {
        if (!latestRenewals[r.type] || new Date(r.expiryDate) > new Date(latestRenewals[r.type].expiryDate)) {
            latestRenewals[r.type] = r;
        }
    });

    if (Object.keys(latestRenewals).length === 0) renList.innerHTML = `<p class="text-sm text-slate-500 text-center py-4">No document alerts.</p>`;
    else {
        let rHtml = ''; Object.values(latestRenewals).forEach(r => {
            const days = calcDaysDiff(r.expiryDate);
            let c = days < 0 ? 'bg-red-100 text-red-600' : (days <= 30 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600');
            let dt = days < 0 ? `Expired` : (days === 0 ? 'Today' : `${days} days`);
            rHtml += `<div class="flex justify-between items-center p-3 rounded-lg border border-slate-100 mb-3 shadow-sm bg-white hover:bg-slate-50 transition-colors"><div class="flex items-center"><i class="fa-solid fa-file-contract text-slate-400 mr-3 text-lg"></i><p class="font-semibold text-sm text-slate-700">${r.type}</p></div><span class="text-xs font-bold px-3 py-1.5 rounded-full ${c}">${dt}</span></div>`;
        });
        renList.innerHTML = rHtml || `<p class="text-sm text-slate-500 text-center py-4">No documents added.</p>`;
    }

    const servicesRecords = await fetchCollection('serviceTracker');
    const lastService = servicesRecords.length > 0 ? servicesRecords[0] : null;
    const servList = document.getElementById('dash-services-list');
    if (lastService) {
        const rem = lastService.nextServiceKm - currentKm;
        let sc = rem <= 0 ? 'bg-red-100 text-red-600' : (rem <= 500 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600');
        let rt = rem <= 0 ? `Overdue` : `${formatKm(rem)} KM left`;
        servList.innerHTML = `<div class="flex justify-between items-center p-3 rounded-lg border border-slate-100 shadow-sm bg-white hover:bg-slate-50 transition-colors"><div class="flex items-center"><i class="fa-solid fa-wrench text-slate-400 mr-3 text-lg"></i><p class="font-semibold text-sm text-slate-700">Service</p></div><span class="text-xs font-bold px-3 py-1.5 rounded-full ${sc}">${rt}</span></div>`;
    } else servList.innerHTML = `<p class="text-sm text-slate-500 text-center py-4">No service records.</p>`;
}

function renderChart(inc, exp, prof) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    // Create gradient
    let bgGradientInc = ctx.createLinearGradient(0, 0, 0, 400); bgGradientInc.addColorStop(0, 'rgba(16, 185, 129, 0.8)'); bgGradientInc.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
    let bgGradientExp = ctx.createLinearGradient(0, 0, 0, 400); bgGradientExp.addColorStop(0, 'rgba(244, 63, 94, 0.8)'); bgGradientExp.addColorStop(1, 'rgba(244, 63, 94, 0.2)');
    let bgGradientProf = ctx.createLinearGradient(0, 0, 0, 400);
    if (prof >= 0) { bgGradientProf.addColorStop(0, 'rgba(99, 102, 241, 0.8)'); bgGradientProf.addColorStop(1, 'rgba(99, 102, 241, 0.2)'); }
    else { bgGradientProf.addColorStop(0, 'rgba(249, 115, 22, 0.8)'); bgGradientProf.addColorStop(1, 'rgba(249, 115, 22, 0.2)'); }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Total Income', 'Total Expense', 'Net Profit'],
            datasets: [{
                label: 'Amount (Rs)',
                data: [inc, exp, prof],
                backgroundColor: [bgGradientInc, bgGradientExp, bgGradientProf],
                borderRadius: 8,
                borderSkipped: false,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 14, family: 'Inter' }, bodyFont: { size: 14, family: 'Inter', weight: 'bold' }, padding: 12, cornerRadius: 8, displayColors: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', drawBorder: false }, ticks: { font: { family: 'Inter' } } },
                x: { grid: { display: false, drawBorder: false }, ticks: { font: { family: 'Inter', weight: '600' } } }
            },
            animation: {
                y: { duration: 1000, easing: 'easeOutQuart' }
            }
        }
    });
}

/* -------------------------------------------------------------------------- */
/* 5. Dynamic Tables (With Admin Controls)                                    */
/* -------------------------------------------------------------------------- */
async function renderTableTab(tableName, singularName, title, columns) {
    const records = await fetchCollection(tableName);
    let currentKm = 0;
    if (tableName === 'serviceTracker') { const kms = await fetchCollection('monthlyKm'); currentKm = kms.length > 0 ? kms[0].currentKm : 0; }

    let html = `
        <div class="flex justify-between items-center mb-6 gap-4">
            <h3 class="text-lg font-semibold text-slate-800">${title}</h3>
            <button onclick="openModal('${tableName}')" class="bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center"><i class="fa-solid fa-plus mr-2"></i> Add ${singularName}</button>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
    `;
    columns.forEach(col => { html += `<th class="px-6 py-4 font-medium">${col.replace(/([A-Z])/g, ' $1').trim()}</th>`; });
    html += `<th class="px-6 py-4 font-medium text-right">Actions</th></tr></thead><tbody class="divide-y divide-slate-100 text-sm">`;

    if (records.length === 0) html += `<tr><td colspan="${columns.length + 1}" class="px-6 py-8 text-center text-slate-500">No records found.</td></tr>`;
    else {
        records.forEach(record => {
            html += `<tr class="hover:bg-slate-50 transition-colors">`;
            columns.forEach(col => {
                let val = record[col];
                if (col === 'bill' || col === 'documentImage') { html += val ? `<td class="px-6 py-4"><button onclick="viewImage('${val}')" class="text-primary text-sm font-medium"><i class="fa-regular fa-image mr-1"></i> View</button></td>` : `<td class="px-6 py-4 text-slate-400 text-xs">No image</td>`; }
                else if (col === 'addedBy') { html += `<td class="px-6 py-4"><span class="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded capitalize">${val || 'Admin'}</span></td>`; }
                else if (col === 'remainingKm') { let rem = record.nextServiceKm - currentKm; let cC = rem <= 0 ? 'text-red-500' : (rem <= 500 ? 'text-orange-500' : 'text-slate-700'); html += `<td class="px-6 py-4 ${cC} font-medium">${rem <= 0 ? `Overdue by ${formatKm(Math.abs(rem))}` : formatKm(rem)}</td>`; }
                else { if (col.toLowerCase().includes('date')) val = formatDate(val); else if (col.toLowerCase().includes('amount')) val = formatCurrency(val); else if (col.toLowerCase().includes('km') && val !== null && !isNaN(val)) val = formatKm(val); html += `<td class="px-6 py-4 text-slate-700">${val || '-'}</td>`; }
            });

            // Action Buttons (Only Admin can Edit/Delete)
            if (currentUser.role === 'admin') {
                html += `<td class="px-6 py-4 text-right">
                            <button onclick="editRecord('${tableName}', '${record.id}')" class="text-sky-500 hover:text-sky-700 p-1 mr-2" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button onclick="deleteRecord('${tableName}', '${record.id}')" class="text-red-400 hover:text-red-600 p-1" title="Delete"><i class="fa-solid fa-trash"></i></button>
                            </td></tr>`;
            } else {
                html += `<td class="px-6 py-4 text-right"><i class="fa-solid fa-lock text-slate-300" title="Admin access required"></i></td></tr>`;
            }
        });
    }
    html += `</tbody></table></div></div>`; document.getElementById('main-content').innerHTML = html;
}

/* -------------------------------------------------------------------------- */
/* 6. User Management (Admin Only)                                            */
/* -------------------------------------------------------------------------- */
async function renderUsersTab() {
    const users = await fetchCollection('users');
    let html = `
        <div class="flex justify-between items-center mb-6 gap-4">
            <h3 class="text-lg font-semibold text-slate-800">System Users</h3>
            <button onclick="openUserModal()" class="bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"><i class="fa-solid fa-user-plus mr-2"></i> Add User</button>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200"><th class="px-6 py-4 font-medium">Username</th><th class="px-6 py-4 font-medium">Role</th><th class="px-6 py-4 font-medium text-right">Actions</th></tr></thead><tbody class="divide-y divide-slate-100 text-sm">`;

    users.forEach(u => {
        let badge = u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700';
        html += `<tr class="hover:bg-slate-50"><td class="px-6 py-4 font-medium text-slate-800"><i class="fa-solid fa-circle-user text-slate-400 mr-2 text-lg align-middle"></i>${u.username}</td><td class="px-6 py-4"><span class="px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${badge}">${u.role}</span></td><td class="px-6 py-4 text-right">`;
        if (u.username !== 'admin') {
            html += `<button onclick="deleteRecord('users', '${u.id}')" class="text-red-400 hover:text-red-600 p-1" title="Delete User"><i class="fa-solid fa-trash"></i></button>`;
        } else {
            html += `<span class="text-xs text-slate-400 italic">Master Admin</span>`;
        }
        html += `</td></tr>`;
    });
    html += `</tbody></table></div>`; document.getElementById('main-content').innerHTML = html;
}

function openUserModal() {
    editingId = null; document.getElementById('modal-title').innerText = "Add New User";
    const i = `class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none mb-4"`;
    document.getElementById('modal-body').innerHTML = `
        <form onsubmit="saveUser(event)">
            <label class="block text-xs font-semibold text-slate-600 mb-1">Username</label><input type="text" id="u-name" required ${i}>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Password</label><input type="text" id="u-pass" required ${i}>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Role</label><select id="u-role" required ${i}><option value="user">User (Add/View Only)</option><option value="admin">Admin (Full Access)</option></select>
            <div class="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2"><button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg text-sm text-slate-600 bg-slate-100">Cancel</button><button type="submit" class="bg-primary text-white px-5 py-2 rounded-lg text-sm">Save User</button></div>
        </form>`;
    document.getElementById('app-modal').classList.remove('hidden');
}

async function saveUser(e) {
    e.preventDefault();
    const payload = { username: document.getElementById('u-name').value.trim(), password: document.getElementById('u-pass').value.trim(), role: document.getElementById('u-role').value, createdAt: Date.now() };
    try {
        // Check if exists
        const exist = await db.collection('users').where('username', '==', payload.username).get();
        if (!exist.empty) return alert("Username already exists!");
        await db.collection('users').add(payload); closeModal(); showToast('User created successfully'); switchTab('users');
    } catch (e) { alert("Error saving"); }
}

/* -------------------------------------------------------------------------- */
/* 7. Forms, Adding & Editing Logic                                           */
/* -------------------------------------------------------------------------- */
async function getFormFields(table, data = null) {
    const i = `class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none mb-4"`; const l = `class="block text-xs font-semibold text-slate-600 mb-1"`;
    const v = (key) => data && data[key] ? data[key] : '';

    if (table === 'rentIncome') return `<label ${l}>Date</label><input type="date" id="f-date" required ${i} value="${v('date')}"><label ${l}>Amount (Rs)</label><input type="number" id="f-amount" required ${i} value="${v('amount')}">`;
    else if (table === 'expenses') return `<label ${l}>Date</label><input type="date" id="f-date" required ${i} value="${v('date')}"><label ${l}>Category</label><select id="f-cat" required ${i} style="margin-bottom:1rem"><option ${v('category') === 'Repair' ? 'selected' : ''}>Repair</option><option ${v('category') === 'Maintenance' ? 'selected' : ''}>Maintenance</option><option ${v('category') === 'Fuel' ? 'selected' : ''}>Fuel</option><option ${v('category') === 'Other' ? 'selected' : ''}>Other</option></select><label ${l}>Description</label><input type="text" id="f-desc" ${i} value="${v('description')}"><label ${l}>Amount</label><input type="number" id="f-amount" required ${i} value="${v('amount')}"><label ${l}>Bill Image (Optional)</label><input type="file" id="f-image" accept="image/*" ${i}> <p class="text-[10px] text-slate-400 -mt-3 mb-3">Leave file empty to keep existing image</p>`;
    else if (table === 'monthlyKm') {
        let startVal = v('startKm'), attr = '';
        if (!data) {
            const logs = await fetchCollection('monthlyKm');
            if (logs.length > 0) { startVal = logs[0].currentKm; attr = 'readonly style="background-color:#f1f5f9; cursor:not-allowed;" title="Auto-filled from last log"'; }
        }
        return `<label ${l}>Date</label><input type="date" id="f-date" required ${i} value="${v('date')}"><label ${l}>Start KM</label><input type="number" id="f-start" required ${i} ${attr} value="${startVal}"><label ${l}>Monthly KM</label><input type="number" id="f-monthly" required ${i} value="${v('monthlyKm')}">`;
    }
    else if (table === 'serviceTracker') return `<label ${l}>Service Date</label><input type="date" id="f-date" required ${i} value="${v('serviceDate')}"><label ${l}>Service KM</label><input type="number" id="f-skm" required ${i} value="${v('serviceKm')}"><label ${l}>Interval KM (e.g. 5000)</label><input type="number" id="f-intm" required ${i} value="${v('intervalKm')}">`;
    else if (table === 'renewals') return `<label ${l}>Type</label><select id="f-type" required ${i} style="margin-bottom:1rem"><option ${v('type') === 'Insurance' ? 'selected' : ''}>Insurance</option><option ${v('type') === 'License' ? 'selected' : ''}>License</option><option ${v('type') === 'Emission Test (PUC)' ? 'selected' : ''}>Emission Test (PUC)</option></select><label ${l}>Last Renewed</label><input type="date" id="f-ldate" required ${i} value="${v('lastRenewedDate')}"><label ${l}>Expiry</label><input type="date" id="f-edate" required ${i} value="${v('expiryDate')}"><label ${l}>Image</label><input type="file" id="f-image" accept="image/*" ${i}>`;
    return '';
}

async function openModal(table, id = null) {
    editingId = id;
    const t = { rentIncome: 'Income', expenses: 'Expense', monthlyKm: 'KM Log', serviceTracker: 'Service', renewals: 'Vehicle Document' };
    document.getElementById('modal-title').innerText = id ? `Edit ${t[table]}` : `Add ${t[table]}`;

    let data = null;
    if (id) {
        const doc = await db.collection(table).doc(id).get();
        if (doc.exists) data = doc.data();
    }

    document.getElementById('modal-body').innerHTML = `<form onsubmit="submitForm(event, '${table}')">${await getFormFields(table, data)}<div class="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2"><button type="button" onclick="closeModal()" class="px-4 py-2 rounded-lg text-sm text-slate-600 bg-slate-100">Cancel</button><button type="submit" id="modal-save-btn" class="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium">${id ? 'Update' : 'Save'}</button></div></form>`;
    document.getElementById('app-modal').classList.remove('hidden');
}

function closeModal() { document.getElementById('app-modal').classList.add('hidden'); editingId = null; }

async function editRecord(table, id) { openModal(table, id); }

async function submitForm(e, table) {
    e.preventDefault();
    const sBtn = document.getElementById('modal-save-btn'); sBtn.innerText = 'Saving...'; sBtn.disabled = true;

    // Base payload
    let p = { addedBy: currentUser.username };
    if (!editingId) p.createdAt = Date.now(); // Only set createdAt on new records

    if (table === 'rentIncome') p = { ...p, date: document.getElementById('f-date').value, amount: Number(document.getElementById('f-amount').value) };
    else if (table === 'expenses') { p = { ...p, date: document.getElementById('f-date').value, category: document.getElementById('f-cat').value, description: document.getElementById('f-desc').value, amount: Number(document.getElementById('f-amount').value) }; const fi = document.getElementById('f-image'); if (fi && fi.files.length > 0) p.bill = await fileToBase64(fi.files[0]); }
    else if (table === 'monthlyKm') { const s = Number(document.getElementById('f-start').value), m = Number(document.getElementById('f-monthly').value); p = { ...p, date: document.getElementById('f-date').value, startKm: s, endKm: s + m, monthlyKm: m, currentKm: s + m }; if (m < 0) { alert("Cannot be negative"); return; } }
    else if (table === 'serviceTracker') { const sk = Number(document.getElementById('f-skm').value), ik = Number(document.getElementById('f-intm').value); p = { ...p, serviceDate: document.getElementById('f-date').value, serviceKm: sk, intervalKm: ik, nextServiceKm: sk + ik, status: 'Completed' }; }
    else if (table === 'renewals') { p = { ...p, type: document.getElementById('f-type').value, lastRenewedDate: document.getElementById('f-ldate').value, expiryDate: document.getElementById('f-edate').value }; const fi = document.getElementById('f-image'); if (fi && fi.files.length > 0) p.documentImage = await fileToBase64(fi.files[0]); }

    try {
        if (editingId) {
            await db.collection(table).doc(editingId).update(p); showToast('Updated securely!');
        } else {
            await db.collection(table).add(p); showToast('Saved securely!');
        }
        closeModal();
        switchTab(currentView); checkNotifications();
    } catch (err) { alert("Error saving. Check connection."); console.log(err); sBtn.innerText = 'Save'; sBtn.disabled = false; }
}

async function deleteRecord(table, id) {
    if (currentUser.role !== 'admin') return alert("Admin permission required.");
    if (confirm("Delete this permanently?")) {
        await db.collection(table).doc(id).delete();
        switchTab(currentView); showToast('Deleted.', 'danger'); checkNotifications();
    }
}

/* -------------------------------------------------------------------------- */
/* 8. Vehicle Info Form                                                       */
/* -------------------------------------------------------------------------- */
async function renderVehicleInfo() {
    const infoSnap = await db.collection('vehicleInfo').limit(1).get();
    const data = infoSnap.empty ? { vehicleNumber: '', make: '', model: '', year: '', fuelType: 'Petrol' } : infoSnap.docs[0].data();
    const disabled = currentUser.role !== 'admin' ? 'disabled' : '';
    const hideBtn = currentUser.role !== 'admin' ? 'hidden' : '';

    document.getElementById('main-content').innerHTML = `
        <div class="max-w-4xl mx-auto bg-white rounded-xl border border-slate-100 p-6"><div class="flex items-center mb-6 pb-4 border-b border-slate-100"><div class="w-12 h-12 bg-indigo-50 text-primary rounded-full flex items-center justify-center mr-4"><i class="fa-solid fa-car-side"></i></div><h3 class="text-lg font-semibold">Vehicle Profile</h3></div>
            <form onsubmit="saveVehicleInfo(event)">
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-6">
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Vehicle Number</label><input type="text" id="v-number" required class="w-full border rounded-lg px-4 py-2 uppercase" value="${data.vehicleNumber || ''}" ${disabled}></div>
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Make (Brand)</label><input type="text" id="v-make" required class="w-full border rounded-lg px-4 py-2" value="${data.make || ''}" ${disabled}></div>
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Model</label><input type="text" id="v-model" required class="w-full border rounded-lg px-4 py-2" value="${data.model || ''}" ${disabled}></div>
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Year</label><input type="number" id="v-year" required class="w-full border rounded-lg px-4 py-2" value="${data.year || ''}" ${disabled}></div>
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Fuel Type</label><select id="v-fuel" class="w-full border rounded-lg px-4 py-2" ${disabled}><option value="Petrol" ${data.fuelType === 'Petrol' ? 'selected' : ''}>Petrol</option><option value="Diesel" ${data.fuelType === 'Diesel' ? 'selected' : ''}>Diesel</option><option value="EV" ${data.fuelType === 'EV' ? 'selected' : ''}>EV</option></select></div>
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Engine Capacity (cc)</label><input type="text" id="v-engine-cap" class="w-full border rounded-lg px-4 py-2" value="${data.engineCapacity || ''}" ${disabled}></div>
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Engine Number</label><input type="text" id="v-engine-num" class="w-full border rounded-lg px-4 py-2 uppercase" value="${data.engineNumber || ''}" ${disabled}></div>
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Chassis Number</label><input type="text" id="v-chassis-num" class="w-full border rounded-lg px-4 py-2 uppercase" value="${data.chassisNumber || ''}" ${disabled}></div>
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Registration Date</label><input type="date" id="v-reg-date" class="w-full border rounded-lg px-4 py-2" value="${data.registrationDate || ''}" ${disabled}></div>
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Meter Reading</label><input type="number" id="v-meter" class="w-full border rounded-lg px-4 py-2" value="${data.meterReading || ''}" ${disabled}></div>
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Colour</label><input type="text" id="v-colour" class="w-full border rounded-lg px-4 py-2" value="${data.colour || ''}" ${disabled}></div>
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Seating Capacity</label><input type="number" id="v-seating" class="w-full border rounded-lg px-4 py-2" value="${data.seatingCapacity || ''}" ${disabled}></div>
                    <div><label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Current Owner</label><input type="text" id="v-owner" class="w-full border rounded-lg px-4 py-2" value="${data.currentOwner || ''}" ${disabled}></div>
                </div>
                <div class="flex justify-end ${hideBtn}"><button type="submit" id="v-save-btn" class="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm">Save Changes</button></div>
                ${currentUser.role !== 'admin' ? '<p class="text-xs text-red-500 text-right mt-2"><i class="fa-solid fa-lock mr-1"></i> Admin access required to edit</p>' : ''}
            </form>
        </div>`;
}
async function saveVehicleInfo(e) {
    e.preventDefault();
    const p = {
        vehicleNumber: document.getElementById('v-number').value.trim(),
        make: document.getElementById('v-make').value.trim(),
        model: document.getElementById('v-model').value.trim(),
        year: document.getElementById('v-year').value,
        fuelType: document.getElementById('v-fuel').value,
        engineCapacity: document.getElementById('v-engine-cap').value.trim(),
        engineNumber: document.getElementById('v-engine-num').value.trim(),
        chassisNumber: document.getElementById('v-chassis-num').value.trim(),
        registrationDate: document.getElementById('v-reg-date').value,
        meterReading: document.getElementById('v-meter').value,
        colour: document.getElementById('v-colour').value.trim(),
        seatingCapacity: document.getElementById('v-seating').value,
        currentOwner: document.getElementById('v-owner').value.trim(),
        createdAt: Date.now()
    };
    const oldDocs = await db.collection('vehicleInfo').get(); const batch = db.batch(); oldDocs.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit();
    await db.collection('vehicleInfo').add(p); showToast('Vehicle info updated!', 'success');
}

/* -------------------------------------------------------------------------- */
/* 9. Backup & Restore (Admin Only)                                           */
/* -------------------------------------------------------------------------- */
function renderBackupTab() {
    let html = `
        <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center fade-in">
            <div class="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"><i class="fa-solid fa-server"></i></div>
            <h2 class="text-2xl font-bold text-slate-800 mb-2">System Backup & Restore</h2>
            <p class="text-slate-500 text-sm mb-10">Download a full backup of all your data (Income, Expenses, Services, Vehicles, etc.) or restore from an existing backup file. <br> <span class="text-orange-500 font-semibold"><i class="fa-solid fa-triangle-exclamation"></i> Warning: Restoring will overwrite existing related data!</span></p>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <!-- Backup Panel -->
                <div class="border border-slate-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div class="w-12 h-12 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center text-xl mx-auto mb-4"><i class="fa-solid fa-download"></i></div>
                    <h3 class="font-semibold text-slate-700 mb-1">Export Data</h3>
                    <p class="text-xs text-slate-400 mb-6">Save the current state of the system.</p>
                    <button id="btn-backup" onclick="performBackup()" class="w-full bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"><i class="fa-solid fa-cloud-arrow-down mr-2"></i> Download Backup JSON</button>
                </div>
                
                <!-- Restore Panel -->
                <div class="border border-slate-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div class="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-xl mx-auto mb-4"><i class="fa-solid fa-upload"></i></div>
                    <h3 class="font-semibold text-slate-700 mb-1">Restore Data</h3>
                    <p class="text-xs text-slate-400 mb-6">Upload a JSON backup file to overwrite data.</p>
                    <input type="file" id="restore-file" accept=".json" class="hidden" onchange="performRestore(event)">
                    <button onclick="document.getElementById('restore-file').click()" id="btn-restore" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"><i class="fa-solid fa-cloud-arrow-up mr-2"></i> Upload Backup JSON</button>
                </div>
            </div>
            <p class="text-[11px] text-slate-400 mt-8 font-mono" id="backup-status"></p>
        </div>`;
    document.getElementById('main-content').innerHTML = html;
}

const ALL_COLLECTIONS = ['rentIncome', 'expenses', 'monthlyKm', 'serviceTracker', 'renewals', 'vehicleInfo', 'users'];

async function performBackup() {
    const btn = document.getElementById('btn-backup');
    const status = document.getElementById('backup-status');
    const oriText = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Exporting...';
        btn.disabled = true;
        status.innerText = 'Fetching all collections...';

        let backupData = {};
        for (let col of ALL_COLLECTIONS) {
            const snap = await db.collection(col).get();
            backupData[col] = snap.docs.map(doc => doc.data());
        }

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `vrm_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(dlAnchorElem);
        dlAnchorElem.click();
        dlAnchorElem.remove();

        status.innerText = 'Backup downloaded successfully at ' + new Date().toLocaleTimeString();
        showToast('Backup generated successfully', 'success');
    } catch (err) {
        console.error(err);
        status.innerText = 'Error generating backup: ' + err.message;
        alert('Failed to generate backup.');
    } finally {
        btn.innerHTML = oriText;
        btn.disabled = false;
    }
}

async function performRestore(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm("Are you SURE you want to restore? This will OVERWRITE ALL existing system data matching the backup! Please confirm.")) {
        e.target.value = ''; // Reset
        return;
    }

    const btn = document.getElementById('btn-restore');
    const status = document.getElementById('backup-status');
    const oriText = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Restoring...';
        btn.disabled = true;
        status.innerText = 'Reading backup file...';

        const text = await file.text();
        const data = JSON.parse(text);

        status.innerText = 'Cleaning existing data...';
        // Only clear collections that are actually included in the backup map
        for (let col of ALL_COLLECTIONS) {
            if (!data[col]) continue; // Skip if backup does not have this collection

            // Delete all current docs in this collection
            const snap = await db.collection(col).get();
            const batches = [];
            let batch = db.batch();
            let count = 0;

            snap.docs.forEach((doc) => {
                batch.delete(doc.ref);
                count++;
                if (count === 400) { batches.push(batch); batch = db.batch(); count = 0; }
            });
            if (count > 0) batches.push(batch);

            for (let b of batches) await b.commit();
        }

        status.innerText = 'Importing backup records...';
        // Now add all data from JSON
        for (let col of ALL_COLLECTIONS) {
            if (!data[col]) continue;

            const records = data[col];
            const batches = [];
            let batch = db.batch();
            let count = 0;

            records.forEach(rec => {
                const docRef = db.collection(col).doc();
                batch.set(docRef, rec);
                count++;
                if (count === 400) { batches.push(batch); batch = db.batch(); count = 0; }
            });
            if (count > 0) batches.push(batch);

            for (let b of batches) await b.commit();
        }

        status.innerText = 'Restore completed successfully at ' + new Date().toLocaleTimeString();
        showToast('Data restored securely!', 'success');

        // Timeout to show changes then refresh
        setTimeout(() => {
            alert("Restore completed. App will now reload.");
            window.location.reload();
        }, 1500);

    } catch (err) {
        console.error(err);
        status.innerText = 'Error restoring: ' + err.message;
        alert('Failed to restore backup. Make sure the file is a valid JSON backup.');
    } finally {
        e.target.value = ''; // Reset file input
        btn.innerHTML = oriText;
        btn.disabled = false;
    }
}

/* -------------------------------------------------------------------------- */
/* 10. Notifications & Helpers                                                */
/* -------------------------------------------------------------------------- */
async function checkNotifications() {
    let alerts = [];
    const kmLog = await fetchCollection('monthlyKm'); const currKm = kmLog.length > 0 ? kmLog[0].currentKm : 0;
    const lastServList = await fetchCollection('serviceTracker'); const lastService = lastServList.length > 0 ? lastServList[0] : null;

    if (lastService) { const rem = lastService.nextServiceKm - currKm; if (rem <= 500 && rem > 0) alerts.push({ type: 'warning', icon: 'fa-wrench', title: 'Service Due', msg: `${formatKm(rem)} KM remaining` }); else if (rem <= 0) alerts.push({ type: 'danger', icon: 'fa-triangle-exclamation', title: 'Service Overdue', msg: `Exceeded by ${formatKm(Math.abs(rem))} KM` }); }

    const renewals = await fetchCollection('renewals');
    const latestRenewals = {};
    renewals.forEach(r => {
        if (!latestRenewals[r.type] || new Date(r.expiryDate) > new Date(latestRenewals[r.type].expiryDate)) {
            latestRenewals[r.type] = r;
        }
    });
    Object.values(latestRenewals).forEach(r => { const d = calcDaysDiff(r.expiryDate); if (d <= 30 && d >= 0) alerts.push({ type: 'warning', icon: 'fa-file-contract', title: `${r.type} Alert`, msg: `${d} days remaining` }); else if (d < 0) alerts.push({ type: 'danger', icon: 'fa-ban', title: `${r.type} Expired`, msg: `Expired ${Math.abs(d)} days ago` }); });

    const badge = document.getElementById('notif-badge'), count = document.getElementById('notif-count'), list = document.getElementById('notif-list');
    if (alerts.length > 0) {
        badge.classList.remove('hidden'); count.innerText = alerts.length; let html = '', fHtml = '';
        alerts.forEach((alt, i) => { const c = alt.type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'; html += `<div class="p-3 border-b flex items-start"><div class="w-8 h-8 rounded-full ${c} flex items-center justify-center mr-3"><i class="fa-solid ${alt.icon}"></i></div><div><p class="text-sm font-semibold">${alt.title}</p><p class="text-xs text-slate-500">${alt.msg}</p></div></div>`; if (i < 2 && currentView === 'dashboard') { const bc = alt.type === 'danger' ? 'bg-red-500' : 'bg-orange-500'; fHtml += `<div class="${bc} pointer-events-auto text-white rounded-lg p-3 flex justify-between w-full max-w-2xl mb-2 shadow-md"><div class="flex items-center"><i class="fa-solid ${alt.icon} mr-3 text-lg"></i><div><p class="font-bold text-sm">${alt.title}</p><p class="text-xs text-white/90">${alt.msg}</p></div></div><button onclick="this.parentElement.style.display='none'" class="hover:text-white/70 transition-colors p-1"><i class="fa-solid fa-xmark text-lg"></i></button></div>`; } });
        list.innerHTML = html; document.getElementById('global-alerts').innerHTML = fHtml;
    } else { badge.classList.add('hidden'); count.innerText = '0'; list.innerHTML = `<p class="p-4 text-center text-slate-500 text-sm">All caught up!</p>`; document.getElementById('global-alerts').innerHTML = ''; }
}

function showToast(msg, type = 'success') { const t = document.createElement('div'); t.className = `fixed bottom-4 right-4 text-white px-5 py-3 rounded-lg shadow-lg transition-transform translate-y-20 z-50 flex items-center text-sm ${type === 'success' ? 'bg-sky-500' : 'bg-red-500'}`; t.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} mr-2"></i> ${msg}`; document.body.appendChild(t); setTimeout(() => t.classList.remove('translate-y-20'), 10); setTimeout(() => { t.classList.add('translate-y-20'); setTimeout(() => t.remove(), 300); }, 3000); }

document.getElementById('notif-btn').addEventListener('click', () => document.getElementById('notif-dropdown').classList.toggle('hidden'));
document.addEventListener('click', (e) => { if (!e.target.closest('#notif-dropdown') && !e.target.closest('#notif-btn')) document.getElementById('notif-dropdown').classList.add('hidden'); });
document.getElementById('mobile-menu-btn').addEventListener('click', () => { document.getElementById('mobile-sidebar').classList.remove('-translate-x-full'); document.getElementById('mobile-sidebar-overlay').classList.remove('hidden'); });
document.getElementById('close-mobile-menu').addEventListener('click', closeMobileMenu);
document.getElementById('mobile-sidebar-overlay').addEventListener('click', closeMobileMenu);

// Theme Toggle Logic
const themeBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');
const savedTheme = localStorage.getItem('vrm-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
if (savedTheme === 'dark') { document.documentElement.classList.add('dark'); themeIcon.classList.replace('fa-moon', 'fa-sun'); }
themeBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('vrm-theme', isDark ? 'dark' : 'light');
    themeIcon.classList.replace(isDark ? 'fa-moon' : 'fa-sun', isDark ? 'fa-sun' : 'fa-moon');
});

// App Entry Point
window.addEventListener('DOMContentLoaded', initAuth);
