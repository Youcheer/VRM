/* -------------------------------------------------------------------------- */
/* 1. Firebase Initialization & Core Setup                                    */
/* -------------------------------------------------------------------------- */
const firebaseConfig = {
    apiKey: "AIzaSyDPOZeUDp1lZtuxJgaDbLrRmNGbL3E3a4Q",
    authDomain: "vehicale-bcdf7.firebaseapp.com",
    projectId: "vehicale-bcdf7",
    storageBucket: "vehicale-bcdf7.firebasestorage.app",
    messagingSenderId: "60435383241",
    appId: "1:60435383241:web:bbaddebdee13bfa4ca1e18",
    measurementId: "G-1MZD6VW58B"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = null;
let currentView = 'dashboard';
let chartInstance = null; // Holds the dashboard chart
let editingId = null; // For editing records

const formatCurrency = (amount) => 'Rs. ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount);
const formatKm = (km) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(km);
const formatDate = (dateStr) => { if (!dateStr) return '-'; const d = new Date(dateStr); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
const calcDaysDiff = (targetDate) => { const today = new Date(); today.setHours(0, 0, 0, 0); const target = new Date(targetDate); target.setHours(0, 0, 0, 0); return Math.floor((target - today) / (1000 * 60 * 60 * 24)); };

const closeImageModal = () => document.getElementById('image-modal').classList.add('hidden');
const viewImage = (base64Str) => { document.getElementById('modal-image-view').src = base64Str; document.getElementById('image-modal').classList.remove('hidden'); };

const fileToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (e) => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas'); const MAX_WIDTH = 800; const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        }
    };
    reader.onerror = error => reject(error);
});

async function fetchCollection(colName) {
    const snapshot = await db.collection(colName).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
