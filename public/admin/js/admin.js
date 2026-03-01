// Admin Dashboard Logic
document.addEventListener('DOMContentLoaded', async () => {
    // Check Authentication
    const authCheck = await fetch('/api/auth/check');
    const authData = await authCheck.json();

    if (!authData.authenticated && window.location.pathname !== '/admin/login.html') {
        window.location.href = '/admin/login.html';
        return;
    }

    // Load Stats
    loadStats();
    loadActivity();

    // Logout Handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/admin/login.html';
        };
    }
});

async function loadStats() {
    try {
        const res = await fetch('/api/admin/analytics/overview');
        const data = await res.json();

        if (data.success) {
            document.getElementById('todayDownloads').textContent = data.stats.todayDownloads;
            document.getElementById('totalDownloads').textContent = data.stats.totalDownloads;
            document.getElementById('successRate').textContent = data.stats.successRate + '%';
            document.getElementById('liveUsers').textContent = data.stats.activeUsers;

            // Simple Chart
            initChart();
        }
    } catch (err) {
        console.error('Failed to load stats');
    }
}

async function loadActivity() {
    const res = await fetch('/api/admin/analytics/recent');
    const data = await res.json();

    if (data.success) {
        const container = document.getElementById('recentActivity');
        container.innerHTML = data.logs.map(log => `
            <tr>
                <td class="py-4"><span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${log.status}</span></td>
                <td class="py-4 text-sm text-gray-600">${new Date(log.created_at).toLocaleTimeString()}</td>
                <td class="py-4 text-sm font-bold text-gray-900">${log.country || 'Unknown'}</td>
            </tr>
        `).join('');
    }
}

function initChart() {
    const ctx = document.getElementById('trafficChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Downloads',
                data: [12, 19, 3, 5, 2, 3, 9],
                borderColor: '#9333ea',
                backgroundColor: 'rgba(147, 51, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
        }
    });
}
