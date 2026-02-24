/* -------------------------------------------------------------------------- */
/* 2. Authentication System (Login & Roles)                                   */
/* -------------------------------------------------------------------------- */
async function checkDefaultAdmin() {
    const users = await db.collection('users').get();
    if (users.empty) {
        // Create default admin if no users exist
        await db.collection('users').add({ username: 'admin', password: 'admin123', role: 'admin', createdAt: Date.now() });
        console.log("Default admin created");
    }
}

function initAuth() {
    const savedUser = localStorage.getItem('vrm_pro_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        applyUserRoleUI();
        document.getElementById('login-container').classList.add('hidden');
        switchTab('dashboard');
        checkNotifications();
    } else {
        checkDefaultAdmin(); // Ensure admin exists
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    const btn = document.getElementById('login-btn');
    const err = document.getElementById('login-error');

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; err.classList.add('hidden');

    try {
        const snapshot = await db.collection('users').where('username', '==', u).where('password', '==', p).get();
        if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();
            currentUser = { id: snapshot.docs[0].id, username: userData.username, role: userData.role };
            localStorage.setItem('vrm_pro_user', JSON.stringify(currentUser));
            applyUserRoleUI();
            document.getElementById('login-container').classList.add('hidden');
            switchTab('dashboard'); checkNotifications();
        } else {
            err.classList.remove('hidden');
        }
    } catch (error) { console.error(error); alert("Connection error."); }
    btn.innerHTML = '<span>Login</span><i class="fa-solid fa-arrow-right-to-bracket ml-2"></i>';
});

function applyUserRoleUI() {
    document.getElementById('sidebar-username').innerText = currentUser.username;
    document.getElementById('sidebar-user-avatar').innerText = currentUser.username.charAt(0).toUpperCase();
    document.getElementById('sidebar-role').innerText = currentUser.role === 'admin' ? 'Administrator' : 'Staff User';

    // Show/hide Users tab and Backup tab
    const usersTab = document.getElementById('nav-users-li');
    const backupTab = document.getElementById('nav-backup-li');
    if (currentUser.role === 'admin') { usersTab.classList.remove('hidden'); backupTab.classList.remove('hidden'); }
    else { usersTab.classList.add('hidden'); backupTab.classList.add('hidden'); }

    // Sync mobile menu
    document.getElementById('mobile-nav-list').innerHTML = document.querySelector('aside ul').innerHTML;
    setupNavListeners();
}

function logout(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('vrm_pro_user');
    currentUser = null;
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('login-password').value = '';
    closeMobileMenu();
}
