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

    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget.getAttribute('data-target');
            if (target) switchTab(target);
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

    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        if (btn.getAttribute('data-target') === tab) btn.classList.add('active', 'text-primary');
        else btn.classList.remove('active', 'text-primary');
    });

    const mc = document.getElementById('main-content');
    mc.innerHTML = `<div class="flex justify-center py-10"><i class="fa-solid fa-spinner fa-spin text-primary text-4xl"></i></div>`;
    try {
        if (tab === 'dashboard') await renderDashboard();
        else if (tab === 'income') await renderTableTab('rentIncome', 'Income', 'Income Records', ['paymentDueDate', 'paymentReceivedDate', 'amount', 'remark', 'addedBy']);
        else if (tab === 'expenses') await renderTableTab('expenses', 'Expense', 'Expense Records', ['date', 'category', 'description', 'amount', 'bill', 'addedBy']);
        else if (tab === 'monthlyKm') await renderTableTab('monthlyKm', 'KM Log', 'Tracking & Usage Logs', ['type', 'dateRange', 'days', 'startKm', 'endKm', 'drivenKm', 'currentKm', 'addedBy']);
        else if (tab === 'services') await renderTableTab('serviceTracker', 'Service', 'Service Records', ['serviceDate', 'serviceKm', 'intervalKm', 'nextServiceKm', 'remainingKm', 'status', 'addedBy']);
        else if (tab === 'renewals') await renderTableTab('renewals', 'Vehicle Document', 'Vehicle Documents', ['type', 'lastRenewedDate', 'expiryDate', 'documentImage', 'addedBy']);
        else if (tab === 'vehicleInfo') await renderVehicleInfo();
        else if (tab === 'users' && currentUser.role === 'admin') await renderUsersTab();
        else if (tab === 'backup' && currentUser.role === 'admin') renderBackupTab();
        checkNotifications();
    } catch (err) { console.error(err); mc.innerHTML = `<div class="p-4 text-red-500 bg-red-50 rounded-lg">Error loading data. Check internet.</div>`; }
}

/* -------------------------------------------------------------------------- */
/* 4. Dashboard View (With Charts)                                            */
/* -------------------------------------------------------------------------- */
let currentDashboardFilter = 'all';
let globalCalDate = new Date();

async function setDashboardFilter(filter) {
    currentDashboardFilter = filter;
    await renderDashboard();
}

async function changeGlobalCal(offset) {
    globalCalDate.setMonth(globalCalDate.getMonth() + offset);
    await updateGlobalCalendarUI();
}

async function updateGlobalCalendarUI() {
    const inc = await fetchCollection('rentIncome');
    const exp = await fetchCollection('expenses');
    const km = await fetchCollection('monthlyKm');
    const serv = await fetchCollection('serviceTracker');

    const eventsMap = {};
    const addEvent = (d, type, label) => {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!eventsMap[key]) eventsMap[key] = { rent: false, personal: false, serv: false, exp: false, inc: false, details: [] };
        eventsMap[key][type] = true;
        eventsMap[key].details.push(label);
    };

    km.forEach(r => {
        let s = new Date(r.startDate || r.date);
        let e = new Date(r.endDate || r.date);
        let d = new Date(s);
        while (d <= e) {
            let type = 'personal';
            if (r.type === 'Rent') type = 'rent';
            else if (r.type === 'Repair') type = 'serv';
            addEvent(d, type, `${r.type} (${r.drivenKm || r.monthlyKm || 0} KM)`);
            d.setDate(d.getDate() + 1);
        }
    });

    serv.forEach(r => {
        let d = new Date(r.serviceDate);
        addEvent(d, 'serv', `Service (${r.serviceKm} KM)`);
    });

    exp.forEach(r => {
        let d = new Date(r.date);
        addEvent(d, 'exp', `Expense: ${r.category} (Rs.${r.amount})`);
    });

    inc.forEach(r => {
        let d = new Date(r.date);
        addEvent(d, 'inc', `Income (Rs.${r.amount})`);
    });

    const targetYear = globalCalDate.getFullYear();
    const targetMonth = globalCalDate.getMonth();

    let html = `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 slide-up delay-400">
        <div class="flex justify-between items-center mb-6">
            <h3 class="font-bold text-lg text-slate-800">Vehicle Timeline</h3>
            <div class="flex items-center gap-2">
                <button onclick="showGraphsView()" class="bg-purple-50 text-purple-600 hover:bg-purple-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center shadow-sm">
                    <i class="fa-solid fa-chart-pie mr-1.5"></i>Graphs View
                </button>
                <button onclick="generatePaymentSummaryPDF()" class="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center shadow-sm">
                    <i class="fa-solid fa-chart-line mr-1.5"></i>Payment Summary
                </button>
                <button onclick="generateTimelinePDF()" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center shadow-sm mr-2">
                    <i class="fa-solid fa-file-invoice mr-1.5"></i>Timeline Report
                </button>
                <button onclick="changeGlobalCal(-3)" class="p-2 bg-slate-50 hover:bg-slate-100 rounded text-slate-600 transition"><i class="fa-solid fa-chevron-left"></i></button>
                <span class="font-bold text-slate-700 w-auto px-4 text-center text-sm">3 Months View</span>
                <button onclick="changeGlobalCal(3)" class="p-2 bg-slate-50 hover:bg-slate-100 rounded text-slate-600 transition"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
        </div>
        
        <div class="flex flex-wrap gap-4 mb-6 text-xs font-semibold text-slate-600">
            <div class="flex items-center"><span class="w-3 h-3 rounded-full bg-indigo-500 mr-1.5 shadow-sm"></span>Rent</div>
            <div class="flex items-center"><span class="w-3 h-3 rounded-full bg-sky-500 mr-1.5 shadow-sm"></span>Personal</div>
            <div class="flex items-center"><span class="w-3 h-3 rounded-full bg-orange-400 mr-1.5 shadow-sm"></span>Service</div>
            <div class="flex items-center"><span class="w-3 h-3 rounded-full bg-rose-500 mr-1.5 shadow-sm"></span>Expense</div>
            <div class="flex items-center"><span class="w-3 h-3 rounded-full bg-emerald-500 mr-1.5 shadow-sm"></span>Income</div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    `;

    for (let offset = -1; offset <= 1; offset++) {
        let mDate = new Date(targetYear, targetMonth + offset, 1);
        let year = mDate.getFullYear();
        let month = mDate.getMonth();
        let daysInMonth = new Date(year, month + 1, 0).getDate();
        let firstDay = new Date(year, month, 1).getDay();
        let monthName = mDate.toLocaleString('default', { month: 'long' });

        html += `<div class="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <h4 class="font-bold text-center text-slate-700 mb-4">${monthName} ${year}</h4>
            <div class="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-2">`;

        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => { html += `<div class="text-[10px] font-bold text-slate-400 py-1">${d}</div>`; });
        html += `</div><div class="grid grid-cols-7 gap-1 sm:gap-1.5">`;

        for (let i = 0; i < firstDay; i++) html += `<div></div>`;

        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const key = `${year}-${month}-${i}`;
            const dm = eventsMap[key] || { rent: false, personal: false, serv: false, exp: false, inc: false, details: [] };

            let detailsText = dm.details.length > 0 ? dm.details.join('\n') : '';
            let encDetails = encodeURIComponent(detailsText);
            let safeTitle = detailsText.replace(/"/g, '&quot;');

            let indicators = '';
            if (dm.rent) indicators += `<div class="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>`;
            if (dm.personal) indicators += `<div class="w-1.5 h-1.5 rounded-full bg-sky-500"></div>`;
            if (dm.serv) indicators += `<div class="w-1.5 h-1.5 rounded-full bg-orange-400"></div>`;
            if (dm.exp) indicators += `<div class="w-1.5 h-1.5 rounded-full bg-rose-500"></div>`;
            if (dm.inc) indicators += `<div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>`;

            let cellBg = 'cal-cell-default';
            if (today.getDate() === i && today.getMonth() === month && today.getFullYear() === year) {
                cellBg = 'cal-cell-today';
            } else if (dm.details.length > 0) {
                cellBg = 'cal-cell-event';
            } else {
                cellBg = 'cal-cell-empty';
            }

            let onClickAction = detailsText ? `onclick="showCalDetails('${encDetails}')"` : '';

            html += `<div title="${safeTitle}" ${onClickAction} class="h-9 rounded flex flex-col items-center justify-center transition-colors ${cellBg} relative">
                <span class="text-[11px] sm:text-xs">${i}</span>
                ${indicators ? `<div class="flex gap-0.5 absolute bottom-1">${indicators}</div>` : ''}
            </div>`;
        }
        html += `</div></div>`;
    }

    html += `</div></div>`;

    document.getElementById('dash-global-calendar').innerHTML = html;
}

window.showCalDetails = function (details) {
    const decoded = decodeURIComponent(details);
    if (!decoded) return;

    document.getElementById('modal-title').innerText = "Day Details";

    // Format details with some tailwind styles
    const lines = decoded.split('\n');
    let html = `<ul class="space-y-2">`;
    lines.forEach(l => {
        let icon = 'fa-circle-info text-sky-500';
        if (l.includes('Rent')) icon = 'fa-hand-holding-dollar text-indigo-500';
        else if (l.includes('Personal')) icon = 'fa-car text-sky-500';
        else if (l.includes('Expense')) icon = 'fa-money-bill-transfer text-rose-500';
        else if (l.includes('Income')) icon = 'fa-arrow-trend-up text-emerald-500';
        else if (l.includes('Service')) icon = 'fa-screwdriver-wrench text-orange-400';

        html += `<li class="flex items-start bg-slate-50 p-3 rounded-lg border border-slate-100"><i class="fa-solid ${icon} mt-1 mr-3"></i><span class="text-sm font-medium text-slate-700">${l}</span></li>`;
    });
    html += `</ul>
    <div class="mt-6 flex justify-end">
        <button onclick="closeModal()" class="bg-primary hover:bg-primaryHover text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors">Close</button>
    </div>`;

    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('app-modal').classList.remove('hidden');
};

async function renderDashboard() {
    let incomeRecords = await fetchCollection('rentIncome');
    let expenseRecords = await fetchCollection('expenses');
    let kmRecords = await fetchCollection('monthlyKm');
    const allKmRecords = [...kmRecords]; // Preserve un-filtered for currentKm

    // Apply Date Filtering
    if (currentDashboardFilter !== 'all') {
        const filterFn = (item) => {
            const d = new Date(item.date || item.createdAt);
            const now = new Date();
            if (currentDashboardFilter === 'thisMonth') {
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }
            if (currentDashboardFilter === 'lastMonth') {
                const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
            }
            if (currentDashboardFilter === 'thisYear') {
                return d.getFullYear() === now.getFullYear();
            }
            if (currentDashboardFilter === 'customRange') {
                const start = document.getElementById('filter-start-date').value;
                const end = document.getElementById('filter-end-date').value;
                if (!start || !end) return true;
                const dateStart = new Date(start);
                const dateEnd = new Date(end);
                dateEnd.setHours(23, 59, 59, 999);
                return d >= dateStart && d <= dateEnd;
            }
            return true;
        };
        incomeRecords = incomeRecords.filter(filterFn);
        expenseRecords = expenseRecords.filter(filterFn);
        kmRecords = kmRecords.filter(filterFn);
    }
    let maxKmLog = null; let maxKmC = -1;
    allKmRecords.forEach(k => { if (Number(k.currentKm) > maxKmC) { maxKmC = Number(k.currentKm); maxKmLog = k; } });
    const kmLog = maxKmLog;

    const totalIncome = incomeRecords.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpense = expenseRecords.reduce((sum, item) => sum + Number(item.amount), 0);
    const netProfit = totalIncome - totalExpense;
    const currentKm = kmLog ? kmLog.currentKm : 0;

    const totalDrivenKMs = kmRecords.reduce((sum, item) => sum + Number(item.drivenKm || item.monthlyKm || 0), 0);
    const costPerKm = totalDrivenKMs > 0 ? (totalExpense / totalDrivenKMs) : 0;

    let totalRentKm = 0; let totalPersonalKm = 0;
    let totalRentDays = 0; let totalPersonalDays = 0;
    kmRecords.forEach(item => {
        let k = Number(item.drivenKm || item.monthlyKm || 0);
        let d = Number(item.days || 1);
        if (item.type === 'Rent') { totalRentKm += k; totalRentDays += d; }
        else { totalPersonalKm += k; totalPersonalDays += d; }
    });

    let html = `
        <div class="mb-6 slide-up">
            <h2 class="text-2xl font-bold text-slate-800">Welcome back, ${currentUser ? currentUser.username : 'User'}!</h2>
            <p class="text-sm text-slate-500 mt-1">Here is the latest summary of your vehicle operations.</p>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center slide-up delay-100 hover-lift">
                <div class="flex items-center mb-2"><div class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mr-3"><i class="fa-solid fa-arrow-trend-up"></i></div><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Income</p></div>
                <p class="text-xl font-black text-slate-800">${formatCurrency(totalIncome)}</p>
            </div>
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center slide-up delay-200 hover-lift">
                <div class="flex items-center mb-2"><div class="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mr-3"><i class="fa-solid fa-money-bill-transfer"></i></div><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Expense</p></div>
                <p class="text-xl font-black text-slate-800">${formatCurrency(totalExpense)}</p>
            </div>
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center slide-up delay-300 hover-lift">
                <div class="flex items-center mb-2"><div class="w-8 h-8 rounded-full ${netProfit >= 0 ? 'bg-indigo-50 text-indigo-500' : 'bg-orange-50 text-orange-500'} flex items-center justify-center mr-3"><i class="fa-solid fa-wallet"></i></div><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Net Profit</p></div>
                <p class="text-xl font-black ${netProfit >= 0 ? 'text-indigo-600' : 'text-orange-500'}">${formatCurrency(netProfit)}</p>
            </div>
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center slide-up delay-400 hover-lift">
                <div class="flex items-center mb-2"><div class="w-8 h-8 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center mr-3"><i class="fa-solid fa-gauge-high"></i></div><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current KM</p></div>
                <p class="text-xl font-black text-slate-800">${formatKm(currentKm)} <span class="text-xs font-medium text-slate-400">KM</span></p>
            </div>
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center slide-up delay-500 hover-lift col-span-2 lg:col-span-1">
                <div class="flex items-center mb-2"><div class="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mr-3"><i class="fa-solid fa-calculator"></i></div><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cost Per KM</p></div>
                <p class="text-xl font-black text-slate-800">Rs. ${costPerKm.toFixed(2)} <span class="text-[10px] font-medium text-slate-400">/ KM</span></p>
            </div>
        </div>

        <div class="flex justify-between items-center mb-3 mt-4"><h3 class="font-bold text-lg text-slate-800">Vehicle Usage Stats</h3></div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center slide-up delay-200 hover-lift relative overflow-hidden">
                <div class="absolute top-0 right-0 w-8 h-8 bg-sky-50 rounded-bl-2xl"></div>
                <div class="flex items-center mb-1 text-sky-500"><i class="fa-solid fa-user-tie mr-2"></i><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Personal Days</p></div>
                <p class="text-xl font-black text-slate-800">${totalPersonalDays} <span class="text-xs font-medium text-slate-400">Days</span></p>
            </div>
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center slide-up delay-300 hover-lift relative overflow-hidden">
                <div class="absolute top-0 right-0 w-8 h-8 bg-sky-50 rounded-bl-2xl"></div>
                <div class="flex items-center mb-1 text-sky-500"><i class="fa-solid fa-road mr-2"></i><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Personal KM</p></div>
                <p class="text-xl font-black text-slate-800">${formatKm(totalPersonalKm)} <span class="text-xs font-medium text-slate-400">KM</span></p>
            </div>
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center slide-up delay-400 hover-lift border-l-4 border-l-indigo-400 relative overflow-hidden">
                <div class="absolute top-0 right-0 w-8 h-8 bg-indigo-50 rounded-bl-2xl"></div>
                <div class="flex items-center mb-1 text-indigo-500"><i class="fa-solid fa-hand-holding-dollar mr-2"></i><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rent Days</p></div>
                <p class="text-xl font-black text-slate-800">${totalRentDays} <span class="text-xs font-medium text-slate-400">Days</span></p>
            </div>
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center slide-up delay-500 hover-lift border-l-4 border-l-indigo-400 relative overflow-hidden">
                <div class="absolute top-0 right-0 w-8 h-8 bg-indigo-50 rounded-bl-2xl"></div>
                <div class="flex items-center mb-1 text-indigo-500"><i class="fa-solid fa-route mr-2"></i><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rent KM</p></div>
                <p class="text-xl font-black text-slate-800">${formatKm(totalRentKm)} <span class="text-xs font-medium text-slate-400">KM</span></p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 slide-up delay-200 flex flex-col">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-lg text-slate-800">Financial Overview</h3>
                    <div class="flex items-center gap-2">
                        <div id="custom-date-inputs" class="hidden items-center gap-1 mr-2 px-2 border-r border-slate-200">
                            <input type="date" id="filter-start-date" class="text-xs border rounded px-1.5 py-1" onchange="setDashboardFilter('customRange')" value="${currentDashboardFilter === 'customRange' ? (document.getElementById('filter-start-date') ? document.getElementById('filter-start-date').value : '') : ''}">
                            <span class="text-xs text-slate-400">to</span>
                            <input type="date" id="filter-end-date" class="text-xs border rounded px-1.5 py-1" onchange="setDashboardFilter('customRange')" value="${currentDashboardFilter === 'customRange' ? (document.getElementById('filter-end-date') ? document.getElementById('filter-end-date').value : '') : ''}">
                        </div>
                        <select onchange="handleFilterChange(this.value)" class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-primary focus:border-primary bg-white text-slate-700 font-medium">
                            <option value="all" ${currentDashboardFilter === 'all' ? 'selected' : ''}>All Time</option>
                            <option value="thisMonth" ${currentDashboardFilter === 'thisMonth' ? 'selected' : ''}>This Month</option>
                            <option value="lastMonth" ${currentDashboardFilter === 'lastMonth' ? 'selected' : ''}>Last Month</option>
                            <option value="thisYear" ${currentDashboardFilter === 'thisYear' ? 'selected' : ''}>This Year</option>
                            <option value="customRange" ${currentDashboardFilter === 'customRange' ? 'selected' : ''}>Custom Range...</option>
                        </select>
                        <button onclick="generateVehiclePDF()" class="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center shadow-sm">
                            <i class="fa-solid fa-file-pdf mr-1.5 hidden sm:inline"></i><span class="hidden sm:inline">Download PDF</span><i class="fa-solid fa-download sm:hidden"></i>
                        </button>
                        <div class="p-2 bg-slate-50 rounded-lg hidden md:block"><i class="fa-solid fa-chart-column text-slate-400"></i></div>
                    </div>
                </div>
                <div class="relative flex-1 w-full min-h-[300px]"><canvas id="financeChart"></canvas></div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden slide-up delay-300 flex flex-col">
                <div class="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 class="font-bold text-lg text-slate-800">Action Center</h3>
                    <span class="flex h-3 w-3 relative"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span></span>
                </div>
                <div class="p-6 flex-1 overflow-auto"><h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Rent Payment</h4><div id="dash-rent-payment" class="space-y-3 mb-6"></div><h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Service Alerts</h4><div id="dash-services-list" class="space-y-3 mb-6"></div><h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Document Renewals</h4><div id="dash-renewals-list" class="space-y-3"></div></div>
            </div>
        </div>
        <div id="dash-global-calendar" class="w-full mb-8"></div>
    `;
    document.getElementById('main-content').innerHTML = html;

    // Re-check visibility of custom date fields
    handleFilterChange(currentDashboardFilter, true);

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

    // Render Rent Payment Due countdown (Rent days only from monthlyKm)
    const rentPayList = document.getElementById('dash-rent-payment');
    const allRentKmRecords = await fetchCollection('monthlyKm');
    const incomeRecs = await fetchCollection('rentIncome');

    // Find the latest received payment
    let latestPayment = null;
    incomeRecs.forEach(r => {
        const d = new Date(r.paymentDueDate || r.date);
        if (!latestPayment || d > new Date(latestPayment.paymentDueDate || latestPayment.date)) {
            latestPayment = r;
        }
    });

    if (latestPayment) {
        // Count RENT days only from monthlyKm logs
        const rentKmLogs = allRentKmRecords.filter(r => r.type === 'Rent');
        let totalRentDaysAll = 0;
        rentKmLogs.forEach(r => { totalRentDaysAll += Number(r.days || 1); });

        // Next due date = last payment due date + 1 month
        const lastDueDate = new Date(latestPayment.paymentDueDate || latestPayment.date);
        lastDueDate.setHours(0, 0, 0, 0);
        const nextDueDate = new Date(lastDueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        nextDueDate.setHours(0, 0, 0, 0);

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const calDaysUntilDue = Math.round((nextDueDate - today) / (1000 * 60 * 60 * 24));

        // Count RENT days accumulated SINCE nextDueDate (from Tracking & Usage logs)
        // Personal days are completely excluded
        let rentDaysSinceNextDue = 0;
        rentKmLogs.forEach(r => {
            const rStart = new Date(r.startDate || r.date); rStart.setHours(0,0,0,0);
            const rEnd = new Date(r.endDate || r.date); rEnd.setHours(0,0,0,0);
            if (rEnd < nextDueDate) return; // entirely before due date, skip
            const effectiveStart = rStart < nextDueDate ? nextDueDate : rStart;
            const overlapDays = Math.floor((rEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
            rentDaysSinceNextDue += Math.max(0, overlapDays);
        });

        // Also count rent days BEFORE next due date (since last payment) for "days until due" context
        let rentDaysSinceLastDue = 0;
        rentKmLogs.forEach(r => {
            const rStart = new Date(r.startDate || r.date); rStart.setHours(0,0,0,0);
            const rEnd = new Date(r.endDate || r.date); rEnd.setHours(0,0,0,0);
            if (rEnd < lastDueDate) return;
            const effectiveStart = rStart < lastDueDate ? lastDueDate : rStart;
            const effectiveEnd = rEnd > today ? today : rEnd;
            if (effectiveEnd < effectiveStart) return;
            const days = Math.floor((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
            rentDaysSinceLastDue += Math.max(0, days);
        });

        const nextDueDateStr = nextDueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const lastReceivedStr = formatDate(latestPayment.paymentReceivedDate || latestPayment.date);
        const lastDueDateStr = formatDate(latestPayment.paymentDueDate || latestPayment.date);

        let rentPayColor, rentPayText;
        if (calDaysUntilDue < 0) {
            // Overdue - show rent days accumulated since next due (personal excluded)
            rentPayColor = 'bg-red-100 text-red-600';
            rentPayText = rentDaysSinceNextDue > 0
                ? `Overdue by ${rentDaysSinceNextDue} Rent day${rentDaysSinceNextDue !== 1 ? 's' : ''}`
                : `Overdue (due: ${nextDueDateStr})`;
        } else if (calDaysUntilDue === 0) {
            rentPayColor = 'bg-orange-100 text-orange-600';
            rentPayText = 'Due Today!';
        } else if (calDaysUntilDue <= 7) {
            rentPayColor = 'bg-orange-100 text-orange-600';
            rentPayText = `${calDaysUntilDue} days left`;
        } else {
            rentPayColor = 'bg-green-100 text-green-600';
            rentPayText = `${calDaysUntilDue} days`;
        }

        rentPayList.innerHTML = `
            <div class="p-3 rounded-lg border border-slate-100 shadow-sm bg-white hover:bg-slate-50 transition-colors">
                <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center">
                        <i class="fa-solid fa-money-bill-wave text-slate-400 mr-3 text-lg"></i>
                        <div>
                            <p class="font-semibold text-sm text-slate-700">Next Payment</p>
                            <p class="text-[10px] text-slate-400">Due: ${nextDueDateStr}</p>
                        </div>
                    </div>
                    <span class="text-xs font-bold px-3 py-1.5 rounded-full ${rentPayColor}">${rentPayText}</span>
                </div>
                <div class="border-t border-slate-100 pt-2 mt-1 grid grid-cols-2 gap-1">
                    <p class="text-[10px] text-slate-400"><span class="font-semibold text-slate-600">Last Due:</span> ${lastDueDateStr}</p>
                    <p class="text-[10px] text-slate-400"><span class="font-semibold text-slate-600">Received:</span> ${lastReceivedStr}</p>
                    <p class="text-[10px] text-slate-400"><span class="font-semibold text-slate-600">Rent Days (this cycle):</span> ${rentDaysSinceLastDue} days</p>
                    <p class="text-[10px] text-slate-400"><span class="font-semibold text-slate-600">Total Rent Days:</span> ${totalRentDaysAll} days</p>
                </div>
            </div>`;
    } else {
        rentPayList.innerHTML = `<p class="text-sm text-slate-500 text-center py-4">No rent payments recorded.</p>`;
    }

    const servicesRecords = await fetchCollection('serviceTracker');
    let lastService = null;
    let maxSkm = -1;
    servicesRecords.forEach(r => {
        if (Number(r.serviceKm) > maxSkm) { maxSkm = Number(r.serviceKm); lastService = r; }
    });
    const servList = document.getElementById('dash-services-list');
    if (lastService) {
        const rem = lastService.nextServiceKm - currentKm;
        let sc = rem <= 0 ? 'bg-red-100 text-red-600' : (rem <= 500 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600');
        let rt = rem <= 0 ? `Overdue` : `${formatKm(rem)} KM left`;
        servList.innerHTML = `<div class="flex justify-between items-center p-3 rounded-lg border border-slate-100 shadow-sm bg-white hover:bg-slate-50 transition-colors"><div class="flex items-center"><i class="fa-solid fa-wrench text-slate-400 mr-3 text-lg"></i><p class="font-semibold text-sm text-slate-700">Service</p></div><span class="text-xs font-bold px-3 py-1.5 rounded-full ${sc}">${rt}</span></div>`;
    } else servList.innerHTML = `<p class="text-sm text-slate-500 text-center py-4">No service records.</p>`;

    // Render Global Calendar
    await updateGlobalCalendarUI();
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

async function generateVehiclePDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Show loading state (could enhance this with a proper UI loader later)
        showToast('Generating PDF Report...', 'success');

        // Fetch required data
        let incomeRecords = await fetchCollection('rentIncome');
        let expenseRecords = await fetchCollection('expenses');
        const infoSnap = await db.collection('vehicleInfo').limit(1).get();
        const vInfo = infoSnap.empty ? {} : infoSnap.docs[0].data();

        // Apply active filter
        let filterLabel = "All Time";
        if (currentDashboardFilter !== 'all') {
            const filterFn = (item) => {
                const d = new Date(item.date || item.createdAt);
                const now = new Date();
                if (currentDashboardFilter === 'thisMonth') {
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }
                if (currentDashboardFilter === 'lastMonth') {
                    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
                }
                if (currentDashboardFilter === 'thisYear') {
                    return d.getFullYear() === now.getFullYear();
                }
                if (currentDashboardFilter === 'customRange') {
                    const start = document.getElementById('filter-start-date').value;
                    const end = document.getElementById('filter-end-date').value;
                    if (!start || !end) return true;
                    const dateStart = new Date(start);
                    const dateEnd = new Date(end);
                    dateEnd.setHours(23, 59, 59, 999);
                    return d >= dateStart && d <= dateEnd;
                }
                return true;
            };
            incomeRecords = incomeRecords.filter(filterFn);
            expenseRecords = expenseRecords.filter(filterFn);

            const labelsMap = { 'thisMonth': 'This Month', 'lastMonth': 'Last Month', 'thisYear': 'This Year', 'customRange': 'Custom Range' };
            filterLabel = labelsMap[currentDashboardFilter] || 'All Time';
        }

        // Calculations
        const totalIncome = incomeRecords.reduce((sum, item) => sum + Number(item.amount), 0);
        const totalExpense = expenseRecords.reduce((sum, item) => sum + Number(item.amount), 0);
        const netProfit = totalIncome - totalExpense;

        // Custom Colors
        const primaryColor = [79, 70, 229]; // Indigo-600
        const darkTextColor = [15, 23, 42]; // Slate-900
        const lightTextColor = [100, 116, 139]; // Slate-500

        // Format Date
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // Document Header
        doc.setFontSize(22);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("VRM Pro - Vehicle Report", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(...lightTextColor);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated on: ${today} | Filtered by: ${filterLabel}`, 14, 28);

        // Vehicle Information Box
        doc.setFillColor(248, 250, 252); // Slate-50
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.roundedRect(14, 35, 182, 35, 3, 3, 'FD');

        doc.setFontSize(12);
        doc.setTextColor(...darkTextColor);
        doc.setFont("helvetica", "bold");
        doc.text("Vehicle Profile", 18, 43);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...lightTextColor);

        let vDetails = [
            `Number: ${vInfo.vehicleNumber || 'N/A'}`,
            `Make/Model: ${vInfo.make || 'N/A'} ${vInfo.model || ''}`,
            `Owner: ${vInfo.currentOwner || 'N/A'}`
        ];
        doc.text(vDetails[0], 18, 52);
        doc.text(vDetails[1], 18, 58);
        doc.text(vDetails[2], 18, 64);

        // Financial Summary Box
        let startY = 80;
        doc.setFontSize(14);
        doc.setTextColor(...darkTextColor);
        doc.setFont("helvetica", "bold");
        doc.text("Financial Summary", 14, startY);

        doc.autoTable({
            startY: startY + 5,
            head: [['Total Income', 'Total Expenses', 'Net Profit']],
            body: [[
                `Rs. ${totalIncome.toLocaleString()}`,
                `Rs. ${totalExpense.toLocaleString()}`,
                `Rs. ${netProfit.toLocaleString()}`
            ]],
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center' },
            bodyStyles: { halign: 'center', fontSize: 12, fontStyle: 'bold', textColor: [30, 41, 59] },
            theme: 'grid',
            margin: { left: 14, right: 14 }
        });

        // Income Breakdown
        let nextY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setTextColor(...darkTextColor);
        doc.text("Rent Income Breakdown", 14, nextY);

        const incomeData = incomeRecords.map(inc => [
            formatDate(inc.date),
            `Rs. ${Number(inc.amount).toLocaleString()}`,
            inc.addedBy || 'System'
        ]);

        doc.autoTable({
            startY: nextY + 5,
            head: [['Date', 'Amount', 'Added By']],
            body: incomeData.length > 0 ? incomeData : [['No records', '', '']],
            headStyles: { fillColor: [16, 185, 129] }, // Emerald-500
            theme: 'striped',
            margin: { left: 14, right: 14 }
        });

        // Expense Breakdown
        nextY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setTextColor(...darkTextColor);
        doc.text("Expense Breakdown", 14, nextY);

        const expenseData = expenseRecords.map(exp => [
            formatDate(exp.date),
            exp.category || '-',
            exp.description || '-',
            `Rs. ${Number(exp.amount).toLocaleString()}`
        ]);

        doc.autoTable({
            startY: nextY + 5,
            head: [['Date', 'Category', 'Description', 'Amount']],
            body: expenseData.length > 0 ? expenseData : [['No records', '', '', '']],
            headStyles: { fillColor: [244, 63, 94] }, // Rose-500
            theme: 'striped',
            margin: { left: 14, right: 14 }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // Slate-400
            doc.text(`VRM Pro Application - Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }

        doc.save(`VRM_Report_${vInfo.vehicleNumber || 'Vehicle'}_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('PDF generated successfully!', 'success');

    } catch (err) {
        console.error("Error generating PDF:", err);
        showToast('Failed to generate PDF report', 'danger');
    }
}

async function generateTimelinePDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');

        showToast('Generating Timeline Report...', 'success');

        const kmRecords = await fetchCollection('monthlyKm');
        const incomeRecords = await fetchCollection('rentIncome');
        const infoSnap = await db.collection('vehicleInfo').limit(1).get();
        const vInfo = infoSnap.empty ? {} : infoSnap.docs[0].data();

        if (kmRecords.length === 0 && incomeRecords.length === 0) {
            showToast('No records found to generate timeline.', 'danger');
            return;
        }

        const events = [];

        // Add all usage logs
        kmRecords.forEach(r => {
            const startDate = new Date(r.startDate || r.date);
            const endDate = new Date(r.endDate || r.date);
            events.push({
                sortDate: startDate.getTime(),
                type: r.type || 'Unknown',
                period: `${formatDate(r.startDate || r.date)}  to  ${formatDate(r.endDate || r.date)}`,
                days: r.days ? `${r.days} Days` : '-',
                amount: '-',
                details: `End KM: ${formatKm(r.currentKm || r.endKm || 0)}`
            });
        });

        // Add all payment records
        incomeRecords.forEach(inc => {
            const dueDate = new Date(inc.paymentDueDate);
            events.push({
                sortDate: dueDate.getTime() + 1, // +1ms to ensure payment appears slightly after the usage ending on the same day
                type: 'Payment Received',
                period: `Due: ${formatDate(inc.paymentDueDate)}`,
                days: '-',
                amount: formatCurrency(inc.amount),
                details: `Paid on: ${formatDate(inc.paymentReceivedDate || inc.date)}${inc.remark ? ' | ' + inc.remark : ''}`
            });
        });

        // Sort chronologically
        events.sort((a, b) => a.sortDate - b.sortDate);

        const rows = events.map(e => [
            e.period,
            e.type,
            e.days,
            e.amount,
            e.details
        ]);

        // Header
        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229);
        doc.setFont("helvetica", "bold");
        doc.text("Vehicle Usage & Payment Timeline", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.text(`Vehicle: ${vInfo.vehicleNumber || 'N/A'} (${vInfo.make || ''} ${vInfo.model || ''})`, 14, 28);
        doc.text(`Generated on: ${new Date().toLocaleDateString()} | Admin: ${currentUser.username}`, 14, 33);

        doc.autoTable({
            startY: 40,
            head: [['Date / Period', 'Event Type', 'Duration', 'Amount', 'Details']],
            body: rows,
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 11 },
            bodyStyles: { fontSize: 10, textColor: [51, 65, 85] },
            didParseCell: function(data) {
                if (data.section === 'body') {
                    const type = data.row.raw[1];
                    if (type === 'Payment Received') {
                        data.cell.styles.fillColor = [220, 252, 231]; // Light green
                        data.cell.styles.fontStyle = 'bold';
                        if (data.column.index === 3) data.cell.styles.textColor = [21, 128, 61]; // Dark green text for amount
                    } else if (type === 'Personal') {
                        data.cell.styles.fillColor = [255, 247, 237]; // Light orange
                    } else if (type === 'Repair') {
                        data.cell.styles.fillColor = [255, 241, 242]; // Light red
                    }
                }
            },
            theme: 'grid',
            styles: { lineColor: [226, 232, 240], lineWidth: 0.1, cellPadding: 5 }
        });

        // Add Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${pageCount} - Generated by VRM Pro`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }

        doc.save(`Vehicle_Timeline_${vInfo.vehicleNumber || 'Report'}.pdf`);
        showToast('Timeline Report generated!', 'success');

    } catch (err) {
        console.error("Timeline PDF Error:", err);
        showToast('Failed to generate timeline report', 'danger');
    }
}

async function generatePaymentSummaryPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');

        showToast('Generating Payment Summary...', 'success');

        const kmRecords = await fetchCollection('monthlyKm');
        const incomeRecords = await fetchCollection('rentIncome');
        const infoSnap = await db.collection('vehicleInfo').limit(1).get();
        const vInfo = infoSnap.empty ? {} : infoSnap.docs[0].data();

        if (incomeRecords.length === 0) {
            showToast('No payment records found.', 'danger');
            return;
        }

        // Sort by Due Date
        incomeRecords.sort((a, b) => new Date(a.paymentDueDate) - new Date(b.paymentDueDate));

        // Find the absolute earliest log to serve as the start of the timeline
        let firstLogDate = null;
        kmRecords.forEach(r => {
            const d = new Date(r.startDate || r.date);
            d.setHours(0,0,0,0);
            if (!firstLogDate || d < firstLogDate) {
                firstLogDate = d;
            }
        });

        let previousDueDate = firstLogDate;

        const rows = [];
        let totalAmount = 0;

        incomeRecords.forEach((inc, index) => {
            const dueDate = new Date(inc.paymentDueDate);
            const receivedDate = new Date(inc.paymentReceivedDate || inc.date);
            
            dueDate.setHours(0,0,0,0);
            receivedDate.setHours(0,0,0,0);

            // Calculate delay
            const diffTime = receivedDate.getTime() - dueDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            let status = 'On Time';
            if (diffDays > 0) {
                status = `${diffDays} Day(s) Late`;
            } else if (diffDays < 0) {
                status = `${Math.abs(diffDays)} Day(s) Early`;
            }

            // Calculate usage breakdown
            let rentD = 0, personalD = 0, repairD = 0;
            let periodStr = previousDueDate ? `${formatDate(previousDueDate)} to\n${formatDate(dueDate)}` : `Up to ${formatDate(dueDate)}`;
            
            if (previousDueDate) {
                let checkDate = new Date(previousDueDate);
                while (checkDate < dueDate) {
                    let dayType = 'None';
                    for (const r of kmRecords) {
                        const rs = new Date(r.startDate || r.date); rs.setHours(0,0,0,0);
                        const re = new Date(r.endDate || r.date); re.setHours(0,0,0,0);
                        if (checkDate >= rs && checkDate <= re) {
                            dayType = r.type;
                            if (r.type === 'Personal' || r.type === 'Repair') break; // Priority
                        }
                    }
                    if (dayType === 'Rent') rentD++;
                    else if (dayType === 'Personal') personalD++;
                    else if (dayType === 'Repair') repairD++;
                    
                    checkDate.setDate(checkDate.getDate() + 1);
                }
            }

            let breakdown = `Rent: ${rentD} Days`;
            if (personalD > 0) breakdown += `\nPersonal: ${personalD} Days`;
            if (repairD > 0) breakdown += `\nRepair: ${repairD} Days`;

            totalAmount += Number(inc.amount) || 0;

            rows.push([
                index + 1,
                periodStr,
                breakdown,
                formatDate(inc.paymentDueDate),
                formatDate(inc.paymentReceivedDate || inc.date),
                status,
                formatCurrency(inc.amount),
                inc.remark || '-'
            ]);

            previousDueDate = new Date(dueDate);
        });

        // Generate Pending / Upcoming Payment Rows
        let pendingIndex = incomeRecords.length + 1;
        if (incomeRecords.length > 0) {
            let lastDueDate = new Date(incomeRecords[incomeRecords.length - 1].paymentDueDate);
            lastDueDate.setHours(0,0,0,0);
            
            let cycleStart = new Date(lastDueDate);
            cycleStart.setDate(cycleStart.getDate() + 1);
            
            let isFuture = false;
            let safetyLoops = 0;
            const todayDate = new Date();
            todayDate.setHours(0,0,0,0);
            
            while (!isFuture && safetyLoops < 12) {
                let calendarEnd = new Date(cycleStart);
                calendarEnd.setMonth(calendarEnd.getMonth() + 1);
                let targetRentDays = Math.round((calendarEnd - cycleStart) / (1000 * 60 * 60 * 24));
                
                let rentDaysAccumulated = 0;
                let checkDate = new Date(cycleStart);
                let pDays = 0, rDays = 0;
                
                let safety = 0;
                while (rentDaysAccumulated < targetRentDays && safety < 180) {
                    let dayType = 'Rent';
                    for (const r of kmRecords) {
                        const rs = new Date(r.startDate || r.date); rs.setHours(0,0,0,0);
                        const re = new Date(r.endDate || r.date); re.setHours(0,0,0,0);
                        if (checkDate >= rs && checkDate <= re) {
                            if (r.type === 'Personal' || r.type === 'Repair') {
                                dayType = r.type;
                                break;
                            }
                        }
                    }
                    
                    if (dayType === 'Rent') rentDaysAccumulated++;
                    else if (dayType === 'Personal') pDays++;
                    else if (dayType === 'Repair') rDays++;
                    
                    checkDate.setDate(checkDate.getDate() + 1);
                    safety++;
                }
                
                if (rentDaysAccumulated >= targetRentDays) {
                    let nextPayDate = new Date(checkDate);
                    nextPayDate.setDate(nextPayDate.getDate() - 1);
                    
                    let pStr = `${formatDate(cycleStart)} to\n${formatDate(nextPayDate)}`;
                    let bStr = `Rent: ${rentDaysAccumulated} Days`;
                    if (pDays > 0) bStr += `\nPersonal: ${pDays} Days`;
                    if (rDays > 0) bStr += `\nRepair: ${rDays} Days`;
                    
                    let diffTime = todayDate.getTime() - nextPayDate.getTime();
                    let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                    
                    let statusStr = 'Upcoming';
                    if (diffDays > 0) statusStr = `${diffDays} Day(s) Overdue`;
                    else if (diffDays === 0) statusStr = `Due Today!`;

                    // Hide projected breakdown for future/ongoing periods
                    if (statusStr === 'Upcoming') {
                        bStr = '-';
                    }

                    rows.push([
                        pendingIndex++,
                        pStr,
                        bStr,
                        formatDate(nextPayDate),
                        '-',
                        statusStr,
                        '-',
                        'Pending / Unpaid'
                    ]);
                    
                    if (nextPayDate >= todayDate) {
                        isFuture = true;
                    } else {
                        cycleStart = new Date(nextPayDate);
                        cycleStart.setDate(cycleStart.getDate() + 1);
                    }
                } else {
                    break;
                }
                safetyLoops++;
            }
        }

        // Add Total Row
        rows.push([
            '', '', '', '', 'TOTAL RECEIVED:', '', formatCurrency(totalAmount), ''
        ]);

        // Header
        doc.setFontSize(22);
        doc.setTextColor(59, 130, 246);
        doc.setFont("helvetica", "bold");
        doc.text("Payment Summary Report", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.text(`Vehicle: ${vInfo.vehicleNumber || 'N/A'} (${vInfo.make || ''} ${vInfo.model || ''})`, 14, 28);
        doc.text(`Generated on: ${new Date().toLocaleDateString()} | Admin: ${currentUser.username}`, 14, 33);

        doc.autoTable({
            startY: 40,
            head: [['#', 'Period Covered', 'Usage Breakdown', 'Due Date', 'Received Date', 'Status / Delay', 'Amount (LKR)', 'Remarks']],
            body: rows,
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 10 },
            bodyStyles: { fontSize: 10, textColor: [51, 65, 85] },
            columnStyles: {
                2: { fontStyle: 'italic', textColor: [71, 85, 105] } // Dim italic for breakdown
            },
            didParseCell: function(data) {
                if (data.section === 'body') {
                    const isTotalRow = data.row.raw[4] === 'TOTAL RECEIVED:';

                    if (isTotalRow) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [241, 245, 249];
                        return;
                    }

                    const status = data.row.raw[5];
                    const isPending = data.row.raw[4] === '-'; // Received Date is '-'

                    if (isPending) {
                        if (status.includes('Overdue')) {
                            if (data.column.index === 5) {
                                data.cell.styles.textColor = [220, 38, 38]; // Red 600
                                data.cell.styles.fontStyle = 'bold';
                            }
                        } else {
                            if (data.column.index === 5) {
                                data.cell.styles.textColor = [217, 119, 6]; // Amber 600
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    } else {
                        if (data.column.index === 5) {
                            if (status.includes('Late')) {
                                data.cell.styles.textColor = [225, 29, 72];
                                data.cell.styles.fontStyle = 'bold';
                            } else if (status === 'On Time' || status.includes('Early')) {
                                data.cell.styles.textColor = [21, 128, 61];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    }
                }
            },
            theme: 'grid',
            styles: { lineColor: [226, 232, 240], lineWidth: 0.1, cellPadding: 5 }
        });

        // Add Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${pageCount} - Generated by VRM Pro`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }

        doc.save(`Payment_Summary_${vInfo.vehicleNumber || 'Report'}.pdf`);
        showToast('Payment Summary generated!', 'success');

    } catch (err) {
        console.error("Payment Summary PDF Error:", err);
        showToast('Failed to generate payment summary', 'danger');
    }
}

window.showGraphsView = async function() {
    try {
        showToast('Loading Analytics...', 'info');
        
        const kmRecords = await fetchCollection('monthlyKm');
        const incomeRecords = await fetchCollection('rentIncome');
        
        // 1. Calculate Usage Breakdown
        let totalRent = 0, totalPersonal = 0, totalRepair = 0;
        kmRecords.forEach(r => {
            let d = Number(r.days) || 1;
            if (r.type === 'Rent') totalRent += d;
            else if (r.type === 'Personal') totalPersonal += d;
            else if (r.type === 'Repair') totalRepair += d;
        });
        
        // 2. Calculate Payment Timeliness
        let onTime = 0, late = 0, early = 0;
        incomeRecords.forEach(inc => {
            const dueDate = new Date(inc.paymentDueDate);
            const receivedDate = new Date(inc.paymentReceivedDate || inc.date);
            dueDate.setHours(0,0,0,0); receivedDate.setHours(0,0,0,0);
            const diffDays = Math.round((receivedDate - dueDate) / (1000 * 60 * 60 * 24));
            if (diffDays > 0) late++;
            else if (diffDays < 0) early++;
            else onTime++;
        });

        // 3. Calculate Income Over Time
        let monthlyIncome = {};
        incomeRecords.forEach(inc => {
            let d = new Date(inc.paymentReceivedDate || inc.date);
            let key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
            if (!monthlyIncome[key]) monthlyIncome[key] = 0;
            monthlyIncome[key] += Number(inc.amount) || 0;
        });
        
        let keys = Object.keys(monthlyIncome).sort();
        let incomeLabels = keys.map(k => {
            let [y, m] = k.split('-');
            let date = new Date(y, m-1, 1);
            return date.toLocaleString('default', { month: 'short', year: 'numeric' });
        });
        let incomeData = keys.map(k => monthlyIncome[k]);

        document.getElementById('modal-title').innerText = "Analytics & Graphs View";
        
        let html = `
        <div class="space-y-8 pb-4">
            <!-- Usage Breakdown Chart -->
            <div>
                <h4 class="text-sm font-bold text-slate-700 mb-3 text-center border-b pb-2"><i class="fa-solid fa-car text-slate-400 mr-2"></i>Vehicle Usage Breakdown</h4>
                <div class="relative w-full h-48 flex justify-center">
                    <canvas id="usagePieChart"></canvas>
                </div>
                <div class="flex justify-center gap-4 mt-3 text-xs text-slate-500 font-medium">
                    <div class="flex items-center"><div class="w-3 h-3 rounded-full bg-indigo-500 mr-1.5"></div>Rent (${totalRent}d)</div>
                    <div class="flex items-center"><div class="w-3 h-3 rounded-full bg-sky-500 mr-1.5"></div>Personal (${totalPersonal}d)</div>
                    <div class="flex items-center"><div class="w-3 h-3 rounded-full bg-orange-400 mr-1.5"></div>Repair (${totalRepair}d)</div>
                </div>
            </div>

            <!-- Timeliness Chart -->
            <div>
                <h4 class="text-sm font-bold text-slate-700 mb-3 text-center border-b pb-2"><i class="fa-solid fa-clock-rotate-left text-slate-400 mr-2"></i>Payment Timeliness</h4>
                <div class="relative w-full h-48 flex justify-center">
                    <canvas id="timelinessPieChart"></canvas>
                </div>
                <div class="flex justify-center gap-4 mt-3 text-xs text-slate-500 font-medium">
                    <div class="flex items-center"><div class="w-3 h-3 rounded-full bg-green-500 mr-1.5"></div>On Time (${onTime})</div>
                    <div class="flex items-center"><div class="w-3 h-3 rounded-full bg-rose-500 mr-1.5"></div>Late (${late})</div>
                    <div class="flex items-center"><div class="w-3 h-3 rounded-full bg-blue-500 mr-1.5"></div>Early (${early})</div>
                </div>
            </div>
            
            <!-- Income Over Time Chart -->
            <div>
                <h4 class="text-sm font-bold text-slate-700 mb-3 text-center border-b pb-2"><i class="fa-solid fa-money-bill-trend-up text-slate-400 mr-2"></i>Income Over Time</h4>
                <div class="relative w-full h-48 flex justify-center">
                    <canvas id="incomeLineChart"></canvas>
                </div>
            </div>
        </div>
        <div class="mt-4 flex justify-end">
            <button onclick="closeModal()" class="bg-primary hover:bg-primaryHover text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">Close</button>
        </div>
        `;
        
        document.getElementById('modal-body').innerHTML = html;
        document.getElementById('app-modal').classList.remove('hidden');
        
        setTimeout(() => {
            // Usage Chart
            new Chart(document.getElementById('usagePieChart'), {
                type: 'doughnut',
                data: {
                    labels: ['Rent', 'Personal', 'Repair'],
                    datasets: [{
                        data: [totalRent, totalPersonal, totalRepair],
                        backgroundColor: ['#6366f1', '#0ea5e9', '#fb923c'],
                        borderWidth: 2,
                        hoverOffset: 4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } }
            });

            // Timeliness Chart
            new Chart(document.getElementById('timelinessPieChart'), {
                type: 'doughnut',
                data: {
                    labels: ['On Time', 'Late', 'Early'],
                    datasets: [{
                        data: [onTime, late, early],
                        backgroundColor: ['#22c55e', '#f43f5e', '#3b82f6'],
                        borderWidth: 2,
                        hoverOffset: 4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } }
            });
            
            // Income Bar Chart
            new Chart(document.getElementById('incomeLineChart'), {
                type: 'bar',
                data: {
                    labels: incomeLabels,
                    datasets: [{
                        label: 'Income (LKR)',
                        data: incomeData,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderRadius: 4
                    }]
                },
                options: { 
                    responsive: true, maintainAspectRatio: false, 
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { font: { family: 'Inter' } } }, x: { ticks: { font: { family: 'Inter' } } } }
                }
            });
        }, 150);
        
    } catch (err) {
        console.error("Graphs View Error:", err);
        showToast('Failed to load graphs', 'danger');
    }
};

/* -------------------------------------------------------------------------- */
/* 5. Dynamic Tables (With Admin Controls)                                    */
/* -------------------------------------------------------------------------- */
async function renderTableTab(tableName, singularName, title, columns) {
    const records = await fetchCollection(tableName);
    let currentKm = 0;
    let latestServiceId = null;
    if (tableName === 'serviceTracker') {
        const kms = await fetchCollection('monthlyKm');
        let maxKmV = -1;
        kms.forEach(k => { if (Number(k.currentKm) > maxKmV) { maxKmV = Number(k.currentKm); currentKm = maxKmV; } });
        if (maxKmV === -1) currentKm = 0;

        // Find highest service KM to dynamically hide old overdues
        let maxKm = -1;
        records.forEach(r => {
            if (Number(r.serviceKm) > maxKm) { maxKm = Number(r.serviceKm); latestServiceId = r.id; }
        });
    }

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
                // Special display for remark column - show dash if empty
                if (col === 'remark' && !record[col]) { html += `<td data-label="Remark" class="px-6 py-4 text-slate-400 text-xs italic">—</td>`; return; }
                let val = record[col];
                if (col === 'dateRange') val = formatDate(record.startDate || record.date) + ' - ' + formatDate(record.endDate || record.date);
                let label = col.replace(/([A-Z])/g, ' $1').trim();
                let dl = `data-label="${label}"`;
                if (col === 'bill' || col === 'documentImage') { html += val ? `<td ${dl} class="px-6 py-4"><button onclick="viewImage('${val}')" class="text-primary text-sm font-medium"><i class="fa-regular fa-image mr-1"></i> View</button></td>` : `<td ${dl} class="px-6 py-4 text-slate-400 text-xs">No image</td>`; }
                else if (col === 'addedBy') { html += `<td ${dl} class="px-6 py-4"><span class="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded capitalize">${val || 'Admin'}</span></td>`; }
                else if (col === 'remainingKm') {
                    let rem = record.nextServiceKm - currentKm;
                    if (tableName === 'serviceTracker' && (record.id !== latestServiceId || record.status === 'Completed (Past)')) {
                        html += `<td ${dl} class="px-6 py-4 text-emerald-500 font-medium">Service Done</td>`;
                    } else {
                        let cC = rem <= 0 ? 'text-red-500' : (rem <= 500 ? 'text-orange-500' : 'text-slate-700');
                        let remText = rem <= 0 ? `Overdue by ${formatKm(Math.abs(rem))}` : formatKm(rem);
                        html += `<td ${dl} class="px-6 py-4 ${cC} font-medium">${remText}</td>`;
                    }
                }
                else if (col === 'status') {
                    let stat = val;
                    if (tableName === 'serviceTracker') {
                        stat = (record.id === latestServiceId && val !== 'Completed (Past)') ? 'Active' : 'Completed';
                        let b = stat === 'Active' ? 'text-sky-600 font-bold' : 'text-slate-500 font-medium';
                        html += `<td ${dl} class="px-6 py-4 ${b}">${stat || '-'}</td>`;
                    } else {
                        html += `<td ${dl} class="px-6 py-4 text-slate-700 capitalize font-medium">${val || '-'}</td>`;
                    }
                }
                else { if (col.toLowerCase().includes('date') && col !== 'dateRange') val = formatDate(val); else if (col.toLowerCase().includes('amount')) val = formatCurrency(val); else if (col.toLowerCase().includes('km') && val !== null && !isNaN(val)) val = formatKm(val); html += `<td ${dl} class="px-6 py-4 text-slate-700">${val || '-'}</td>`; }
            });

            // Action Buttons (Only Admin can Edit/Delete)
            if (currentUser.role === 'admin') {
                html += `<td data-label="Actions" class="px-6 py-4 text-right">
                            <button onclick="editRecord('${tableName}', '${record.id}')" class="text-sky-500 hover:text-sky-700 p-1 mr-2" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button onclick="deleteRecord('${tableName}', '${record.id}')" class="text-red-400 hover:text-red-600 p-1" title="Delete"><i class="fa-solid fa-trash"></i></button>
                            </td></tr>`;
            } else {
                html += `<td data-label="Actions" class="px-6 py-4 text-right"><i class="fa-solid fa-lock text-slate-300" title="Admin access required"></i></td></tr>`;
            }
        });
    }
    html += `</tbody></table></div></div>`; document.getElementById('main-content').innerHTML = html;
}

function renderUsageCalendar(records) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday

    const rentDays = new Set();
    const personalDays = new Set();

    records.forEach(r => {
        let start = new Date(r.startDate || r.date);
        let end = new Date(r.endDate || r.date);
        let d = new Date(start);
        while (d <= end) {
            if (d.getFullYear() === year && d.getMonth() === month) {
                if (r.type === 'Rent') rentDays.add(d.getDate());
                else personalDays.add(d.getDate());
            }
            d.setDate(d.getDate() + 1);
        }
    });

    const monthName = now.toLocaleString('default', { month: 'long' });
    let calHTML = `<div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6 slide-up"><h3 class="font-bold text-lg text-slate-800 mb-4">${monthName} ${year} Usage Calendar</h3><div class="flex items-center gap-4 mb-4"><div class="flex items-center"><span class="w-3 h-3 rounded bg-indigo-500 mr-2"></span><span class="text-xs text-slate-600 font-medium">Rent</span></div><div class="flex items-center"><span class="w-3 h-3 rounded bg-sky-500 mr-2"></span><span class="text-xs text-slate-600 font-medium">Personal</span></div></div><div class="grid grid-cols-7 gap-2 sm:gap-4 text-center mb-2">`;
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => { calHTML += `<div class="text-xs font-bold text-slate-400">${d}</div>`; });
    calHTML += `</div><div class="grid grid-cols-7 gap-2 sm:gap-4">`;

    for (let i = 0; i < firstDay; i++) calHTML += `<div></div>`;
    for (let i = 1; i <= daysInMonth; i++) {
        let bg = 'bg-slate-50 text-slate-500 border border-slate-100';
        if (rentDays.has(i) && personalDays.has(i)) bg = 'bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow font-bold border-none';
        else if (rentDays.has(i)) bg = 'bg-indigo-500 text-white shadow font-bold border-none';
        else if (personalDays.has(i)) bg = 'bg-sky-500 text-white shadow font-bold border-none';
        else if (i === now.getDate()) bg = 'bg-primary/10 text-primary font-bold border border-primary/20';

        calHTML += `<div class="aspect-square rounded-xl flex items-center justify-center text-sm md:text-base transition-transform hover:scale-105 ${bg}">${i}</div>`;
    }

    calHTML += `</div></div>`;
    return calHTML;
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
        html += `<tr class="hover:bg-slate-50"><td data-label="Username" class="px-6 py-4 font-medium text-slate-800"><i class="fa-solid fa-circle-user text-slate-400 mr-2 text-lg align-middle"></i>${u.username}</td><td data-label="Role" class="px-6 py-4"><span class="px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${badge}">${u.role}</span></td><td data-label="Actions" class="px-6 py-4 text-right">`;
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

let predefinedCategories = {
    expenses: ['Repair', 'Maintenance', 'Fuel', 'Other'],
    renewals: ['Insurance', 'License', 'Emission Test (PUC)'],
    loaded: false
};

async function loadCategories() {
    try {
        const doc = await db.collection('settings').doc('categories').get();
        if (doc.exists) {
            predefinedCategories = { ...predefinedCategories, ...doc.data(), loaded: true };
        } else {
            predefinedCategories.loaded = true;
            await db.collection('settings').doc('categories').set({ expenses: predefinedCategories.expenses, renewals: predefinedCategories.renewals });
        }
    } catch (e) { predefinedCategories.loaded = true; }
}

async function saveCategories() {
    try {
        await db.collection('settings').doc('categories').set({ expenses: predefinedCategories.expenses, renewals: predefinedCategories.renewals });
        const expSelect = document.getElementById('f-cat');
        if (expSelect) { const cur = expSelect.value; expSelect.innerHTML = predefinedCategories.expenses.map(c => `<option>${c}</option>`).join(''); expSelect.value = cur; }
        const renSelect = document.getElementById('f-type');
        if (renSelect) { const cur = renSelect.value; renSelect.innerHTML = predefinedCategories.renewals.map(c => `<option>${c}</option>`).join(''); renSelect.value = cur; }
    } catch (e) { }
}

function manageCategories(type) {
    const typeLabel = type === 'expenses' ? 'Expense Categories' : 'Document Types';
    const list = predefinedCategories[type];

    const ex = document.getElementById('cat-mgr-modal');
    if (ex) ex.remove();

    let listHtml = list.map((c, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2">
            <span class="font-medium text-sm text-slate-700">${c}</span>
            <div>
                <button type="button" onclick="editCategoryItem('${type}', ${i})" class="text-sky-500 hover:text-sky-700 mx-2 p-1"><i class="fa-solid fa-pen"></i></button>
                <button type="button" onclick="deleteCategoryItem('${type}', ${i})" class="text-rose-400 hover:text-rose-600 p-1"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');

    const html = `
    <div id="cat-mgr-modal" class="fixed inset-0 modal-bg z-[60] flex items-center justify-center p-4 fade-in">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] relative border border-slate-100">
            <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 class="font-semibold text-base text-slate-800">Manage ${typeLabel}</h3>
                <button type="button" onclick="document.getElementById('cat-mgr-modal').remove()" class="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="p-5 overflow-y-auto flex-1">
                ${listHtml}
                ${list.length === 0 ? '<p class="text-sm text-slate-500 text-center py-4">No categories found.</p>' : ''}
            </div>
            <div class="p-5 border-t border-slate-100 bg-slate-50 flex gap-2">
                <input type="text" id="new-cat-input" placeholder="New category name..." class="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none">
                <button type="button" onclick="addCategoryItem('${type}')" class="bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">Add</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
}

async function addCategoryItem(type) {
    const inp = document.getElementById('new-cat-input');
    const val = inp.value.trim();
    if (!val) return;
    if (predefinedCategories[type].includes(val)) { alert("Category already exists!"); return; }
    predefinedCategories[type].push(val);
    await saveCategories();
    inp.value = '';
    manageCategories(type);
}

async function editCategoryItem(type, index) {
    const oldName = predefinedCategories[type][index];
    const newName = prompt("Edit category name:", oldName);
    if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
        if (predefinedCategories[type].includes(newName.trim())) { alert("Category name already exists!"); return; }
        predefinedCategories[type][index] = newName.trim();
        await saveCategories();
        manageCategories(type);
    }
}

async function deleteCategoryItem(type, index) {
    if (confirm(`Remove "${predefinedCategories[type][index]}"?`)) {
        predefinedCategories[type].splice(index, 1);
        await saveCategories();
        manageCategories(type);
    }
}

async function getFormFields(table, data = null) {
    const i = `class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none mb-4"`; const l = `class="block text-xs font-semibold text-slate-600 mb-1"`;
    const v = (key) => data && data[key] ? data[key] : '';

    if (!predefinedCategories.loaded) await loadCategories();

    if (table === 'rentIncome') return `
        <label ${l}>Payment Due Date <span class="text-rose-500">*</span></label>
        <input type="date" id="f-due-date" required ${i} value="${v('paymentDueDate')}">
        <label ${l}>Payment Received Date <span class="text-rose-500">*</span></label>
        <input type="date" id="f-date" required ${i} value="${v('paymentReceivedDate') || v('date')}">
        <label ${l}>Amount (Rs) <span class="text-rose-500">*</span></label>
        <input type="number" id="f-amount" required ${i} value="${v('amount')}">
        <label ${l}>Remark <span class="text-slate-400 font-normal">(Optional)</span></label>
        <input type="text" id="f-remark" ${i} placeholder="e.g. April rent paid" value="${v('remark')}">
    `;
    else if (table === 'expenses') {
        let opts = predefinedCategories.expenses.map(c => `<option ${v('category') === c ? 'selected' : ''}>${c}</option>`).join('');
        // If an old category exists that was deleted from settings, still show it
        if (v('category') && !predefinedCategories.expenses.includes(v('category'))) opts += `<option selected>${v('category')}</option>`;
        return `<label ${l}>Date</label><input type="date" id="f-date" required ${i} value="${v('date')}"><div class="flex items-center justify-between mb-1"><label class="text-xs font-semibold text-slate-600">Category</label><button type="button" onclick="manageCategories('expenses')" class="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold uppercase"><i class="fa-solid fa-gear mr-1"></i>Manage</button></div><select id="f-cat" required ${i} style="margin-bottom:1rem">${opts}</select><label ${l}>Description</label><input type="text" id="f-desc" ${i} value="${v('description')}"><label ${l}>Amount</label><input type="number" id="f-amount" required ${i} value="${v('amount')}"><label ${l}>Bill Image (Optional)</label><input type="file" id="f-image" accept="image/*" ${i}> <p class="text-[10px] text-slate-400 -mt-3 mb-3">Leave file empty to keep existing image</p>`;
    }
    else if (table === 'monthlyKm') {
        let startVal = v('startKm'), attr = '';
        let lastDateStr = null;
        if (!data) {
            const logs = await fetchCollection('monthlyKm');
            if (logs.length > 0) {
                let maxKmV = -1;
                logs.forEach(k => { if (Number(k.currentKm) > maxKmV) { maxKmV = Number(k.currentKm); startVal = maxKmV; lastDateStr = k.endDate || k.date; } });
                attr = 'style="background-color:#f1f5f9;" title="Auto-filled from last log"';
            }
        }
        let opts = `<option value="Personal" ${v('type') === 'Personal' ? 'selected' : ''}>Personal</option><option value="Rent" ${v('type') === 'Rent' ? 'selected' : ''}>Rent</option><option value="Repair" ${v('type') === 'Repair' ? 'selected' : ''}>Repair</option>`;
        let today = new Date().toISOString().split('T')[0];
        let defStart = today;
        if (!data && lastDateStr) {
            let nextD = new Date(lastDateStr);
            nextD.setDate(nextD.getDate() + 1);
            if (!isNaN(nextD.getTime())) defStart = nextD.toISOString().split('T')[0];
        }
        let sDate = v('startDate') || v('date') || defStart;
        let defEnd = today < sDate ? sDate : today;
        let eDate = v('endDate') || v('date') || defEnd;
        let eKm = v('endKm') || (data ? (Number(v('startKm')) + Number(v('monthlyKm'))) : '');
        let dKm = v('drivenKm') || v('monthlyKm') || '';
        let calcJS = `const s=Number(document.getElementById('f-start').value); if(this.id==='f-end'){ document.getElementById('f-driven').value = this.value ? Number(this.value) - s : ''; } else { document.getElementById('f-end').value = this.value ? s + Number(this.value) : ''; }`;
        return `<label ${l}>Usage Type</label><select id="f-type" required ${i}>${opts}</select>
                <div class="flex gap-4 mb-1"><div class="flex-1"><label ${l}>Start Date</label><input type="date" id="f-sdate" required ${i} value="${sDate}"></div><div class="flex-1"><label ${l}>End Date</label><input type="date" id="f-edate" required ${i} value="${eDate}"></div></div>
                <label ${l}>Start KM</label><input type="number" id="f-start" required ${i} ${attr} value="${startVal}" oninput="${calcJS}">
                <div class="flex gap-4 mb-1">
                    <div class="flex-1"><label ${l}>End KM</label><input type="number" id="f-end" ${i} value="${eKm}" oninput="${calcJS}"></div>
                    <div class="flex-1"><label ${l}>Driven KM</label><input type="number" id="f-driven" ${i} value="${dKm}" oninput="${calcJS}"></div>
                </div>`;
    }
    else if (table === 'serviceTracker') return `<label ${l}>Service Date</label><input type="date" id="f-date" required ${i} value="${v('serviceDate')}"><label ${l}>Service KM</label><input type="number" id="f-skm" required ${i} value="${v('serviceKm')}"><label ${l}>Interval KM (e.g. 5000)</label><input type="number" id="f-intm" required ${i} value="${v('intervalKm')}">`;
    else if (table === 'renewals') {
        let opts = predefinedCategories.renewals.map(c => `<option ${v('type') === c ? 'selected' : ''}>${c}</option>`).join('');
        if (v('type') && !predefinedCategories.renewals.includes(v('type'))) opts += `<option selected>${v('type')}</option>`;
        return `<div class="flex items-center justify-between mb-1"><label class="text-xs font-semibold text-slate-600">Type</label><button type="button" onclick="manageCategories('renewals')" class="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold uppercase"><i class="fa-solid fa-gear mr-1"></i>Manage</button></div><select id="f-type" required ${i} style="margin-bottom:1rem">${opts}</select><label ${l}>Last Renewed</label><input type="date" id="f-ldate" required ${i} value="${v('lastRenewedDate')}"><label ${l}>Expiry</label><input type="date" id="f-edate" required ${i} value="${v('expiryDate')}"><label ${l}>Image</label><input type="file" id="f-image" accept="image/*" ${i}>`;
    }
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

function handleFilterChange(val, skipRender = false) {
    const custWrap = document.getElementById('custom-date-inputs');
    if (val === 'customRange' && custWrap) {
        custWrap.classList.remove('hidden');
        custWrap.classList.add('flex');
    } else if (custWrap) {
        custWrap.classList.add('hidden');
        custWrap.classList.remove('flex');
    }

    if (!skipRender) {
        if (val !== 'customRange') setDashboardFilter(val);
        // Custom range only triggers on date input change
        else currentDashboardFilter = val;
    }
}

async function submitForm(e, table) {
    e.preventDefault();
    const sBtn = document.getElementById('modal-save-btn'); sBtn.innerText = 'Saving...'; sBtn.disabled = true;

    // Base payload
    let p = { addedBy: currentUser.username };
    if (!editingId) p.createdAt = Date.now(); // Only set createdAt on new records

    if (table === 'rentIncome') {
        const receivedDate = document.getElementById('f-date').value;
        const dueDate = document.getElementById('f-due-date').value;
        const remark = document.getElementById('f-remark').value.trim();
        p = { ...p, date: receivedDate, paymentReceivedDate: receivedDate, paymentDueDate: dueDate, amount: Number(document.getElementById('f-amount').value) };
        if (remark) p.remark = remark;
    }
    else if (table === 'expenses') { p = { ...p, date: document.getElementById('f-date').value, category: document.getElementById('f-cat').value, description: document.getElementById('f-desc').value, amount: Number(document.getElementById('f-amount').value) }; const fi = document.getElementById('f-image'); if (fi && fi.files.length > 0) p.bill = await fileToBase64(fi.files[0]); }
    else if (table === 'monthlyKm') {
        const type = document.getElementById('f-type').value;
        const sd = document.getElementById('f-sdate').value;
        const ed = document.getElementById('f-edate').value;
        const s = Number(document.getElementById('f-start').value);
        const end = Number(document.getElementById('f-end').value);
        const driven = Number(document.getElementById('f-driven').value);
        if (!end && !driven) { alert("Please enter either End KM or Driven KM"); document.getElementById('modal-save-btn').innerText = 'Save'; document.getElementById('modal-save-btn').disabled = false; return; }
        const m = driven || (end - s);
        const eKm = end || (s + driven);
        if (eKm < s) { alert("End KM cannot be less than Start KM"); document.getElementById('modal-save-btn').innerText = 'Save'; document.getElementById('modal-save-btn').disabled = false; return; }
        const startD = new Date(sd); const endD = new Date(ed); const days = Math.floor((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
        p = { ...p, type: type, date: sd, startDate: sd, endDate: ed, startKm: s, endKm: eKm, drivenKm: m, monthlyKm: m, currentKm: eKm, days: Math.max(days, 1) };
    }
    else if (table === 'serviceTracker') {
        const sk = Number(document.getElementById('f-skm').value), ik = Number(document.getElementById('f-intm').value);
        p = { ...p, serviceDate: document.getElementById('f-date').value, serviceKm: sk, intervalKm: ik, nextServiceKm: sk + ik, status: 'Active' };

        // If it's a new record, set all old service records to "Completed (Past)" so they stop showing as Overdue
        if (!editingId) {
            const oldRecords = await db.collection('serviceTracker').where('status', '==', 'Active').get();
            const batch = db.batch();
            oldRecords.docs.forEach((doc) => batch.update(doc.ref, { status: 'Completed (Past)' }));
            await batch.commit();
        }
    }
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

function deleteRecord(table, id) {
    if (currentUser.role !== 'admin') return alert("Admin permission required.");

    // Remove existing confirm modal if any
    const existing = document.getElementById('confirm-delete-modal');
    if (existing) existing.remove();

    const modalHtml = `
    <div id="confirm-delete-modal" class="fixed inset-0 modal-bg z-[60] flex items-center justify-center p-4 fade-in">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">
            <div class="p-6 text-center">
                <div class="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                    <i class="fa-solid fa-trash"></i>
                </div>
                <h3 class="font-bold text-lg text-slate-800 mb-1">Delete Record?</h3>
                <p class="text-sm text-slate-500 mb-6">This action cannot be undone. Are you sure you want to permanently delete this record?</p>
                <div class="flex gap-3">
                    <button onclick="document.getElementById('confirm-delete-modal').remove()"
                        class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                        Cancel
                    </button>
                    <button id="confirm-delete-btn"
                        class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors">
                        <i class="fa-solid fa-trash mr-1"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
        const btn = document.getElementById('confirm-delete-btn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Deleting...';
        btn.disabled = true;
        try {
            await db.collection(table).doc(id).delete();
            document.getElementById('confirm-delete-modal').remove();
            switchTab(currentView);
            showToast('Record deleted.', 'danger');
            checkNotifications();
        } catch (err) {
            console.error(err);
            btn.innerHTML = '<i class="fa-solid fa-trash mr-1"></i> Delete';
            btn.disabled = false;
            showToast('Failed to delete. Check connection.', 'danger');
        }
    });
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
    const kmLog = await fetchCollection('monthlyKm');
    let currKm = 0; let maxKmC = -1;
    kmLog.forEach(k => { if (Number(k.currentKm) > maxKmC) { maxKmC = Number(k.currentKm); currKm = maxKmC; } });
    const lastServList = await fetchCollection('serviceTracker');
    let lastService = null; let maxSkm = -1;
    lastServList.forEach(r => { if (Number(r.serviceKm) > maxSkm) { maxSkm = Number(r.serviceKm); lastService = r; } });

    if (lastService) { const rem = lastService.nextServiceKm - currKm; if (rem <= 500 && rem > 0) alerts.push({ type: 'warning', icon: 'fa-wrench', title: 'Service Due', msg: `${formatKm(rem)} KM remaining` }); else if (rem <= 0) alerts.push({ type: 'danger', icon: 'fa-triangle-exclamation', title: 'Service Overdue', msg: `Exceeded by ${formatKm(Math.abs(rem))} KM` }); }

    // Rent payment due notification
    const incomeRecs = await fetchCollection('rentIncome');
    let latestPayment = null;
    incomeRecs.forEach(r => {
        const d = new Date(r.paymentDueDate || r.date);
        if (!latestPayment || d > new Date(latestPayment.paymentDueDate || latestPayment.date)) {
            latestPayment = r;
        }
    });
    if (latestPayment) {
        const lastDueDate = new Date(latestPayment.paymentDueDate || latestPayment.date);
        lastDueDate.setHours(0,0,0,0);
        const nextDueDate = new Date(lastDueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        nextDueDate.setHours(0, 0, 0, 0);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const calDaysUntilDue = Math.round((nextDueDate - today) / (1000 * 60 * 60 * 24));
        const nextDueDateStr = nextDueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        // Count rent days since next due date (personal excluded)
        const rentOnlyLogs = kmLog.filter(r => r.type === 'Rent');
        let rentDaysSinceNextDue = 0;
        rentOnlyLogs.forEach(r => {
            const rStart = new Date(r.startDate || r.date); rStart.setHours(0,0,0,0);
            const rEnd = new Date(r.endDate || r.date); rEnd.setHours(0,0,0,0);
            if (rEnd < nextDueDate) return;
            const effectiveStart = rStart < nextDueDate ? nextDueDate : rStart;
            const overlapDays = Math.floor((rEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
            rentDaysSinceNextDue += Math.max(0, overlapDays);
        });

        if (calDaysUntilDue < 0) {
            const msg = rentDaysSinceNextDue > 0
                ? `Due ${nextDueDateStr} — ${rentDaysSinceNextDue} Rent day${rentDaysSinceNextDue !== 1 ? 's' : ''} overdue`
                : `Due ${nextDueDateStr} — overdue`;
            alerts.push({ type: 'danger', icon: 'fa-money-bill-wave', title: 'Rent Payment Overdue', msg });
        } else if (calDaysUntilDue <= 7) {
            alerts.push({ type: 'warning', icon: 'fa-money-bill-wave', title: 'Rent Payment Due Soon', msg: `Due ${nextDueDateStr} — ${calDaysUntilDue} days left` });
        }
    }

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

const openMenuAction = () => { document.getElementById('mobile-sidebar').classList.remove('-translate-x-full'); document.getElementById('mobile-sidebar-overlay').classList.remove('hidden'); };

if (document.getElementById('mobile-menu-btn')) { document.getElementById('mobile-menu-btn').addEventListener('click', openMenuAction); }
if (document.getElementById('mobile-menu-open-more')) { document.getElementById('mobile-menu-open-more').addEventListener('click', (e) => { e.preventDefault(); openMenuAction(); }); }

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
