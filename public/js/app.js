/**
 * BROQINSTA - OFFICIAL CLIENT-SIDE CORE
 * Version: 2.1.0-Production
 * Optimized for speed and security.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Core Elements
    const form = document.getElementById('downloadForm');
    const urlInput = document.getElementById('instagramUrl');
    const pasteBtn = document.getElementById('pasteBtn');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const error = document.getElementById('error');
    const mediaPreview = document.getElementById('mediaPreview');
    const errorMessage = document.getElementById('errorMessage');
    const mediaTitle = document.getElementById('mediaTitle');

    // 2. Action Elements
    const mainDownloadBtn = document.getElementById('mainDownloadBtn');
    const btnIcon = document.getElementById('btnIcon');
    const btnText = document.getElementById('btnText');
    const downloadProgress = document.getElementById('downloadProgress');
    const progressBar = document.getElementById('progressBar');
    const viewLink = document.getElementById('viewLink');
    const copyLinkBtn = document.getElementById('copyLinkBtn');

    let currentVideoUrl = '';

    // Initialize observers safely
    initializeScrollObserver();

    /**
     * FORM SUBMISSION HANDLER - CRITICAL
     */
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent page refresh

            const url = urlInput ? urlInput.value.trim() : '';

            if (!url) {
                handleSystemError('Please enter an Instagram URL');
                return;
            }

            // Hide previous results/errors
            if (result) result.classList.add('hidden');
            if (error) error.classList.add('hidden');

            // Show loading
            if (loading) loading.classList.remove('hidden');

            try {
                console.log('[System] Fetching:', url);

                const response = await fetch('/api/download', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url })
                });

                const data = await response.json();

                // Hide loading
                if (loading) loading.classList.add('hidden');

                if (data.success) {
                    processSuccessfulFetch(data);
                } else {
                    handleSystemError(data.error || 'Failed to fetch content');
                }

            } catch (err) {
                console.error('[System] Network Error:', err);
                if (loading) loading.classList.add('hidden');
                handleSystemError('Network error. Please check your connection and try again.');
            }
        });
    }

    // Paste Button Handler
    if (pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (urlInput) {
                    urlInput.value = text;
                    urlInput.focus();
                }
            } catch (err) {
                console.error('[System] Clipboard read failed');
            }
        });
    }

    /**
     * Handles successful content extraction
     */
    function processSuccessfulFetch(data) {
        currentVideoUrl = data.videoUrl;
        if (mediaTitle) mediaTitle.innerText = data.title || 'Instagram Media';
        if (viewLink) viewLink.href = data.videoUrl;

        // Preview Optimization
        if (mediaPreview) {
            if (data.thumbnail) {
                mediaPreview.innerHTML = `
                    <img src="${data.thumbnail}" 
                         class="w-full h-full object-cover rounded-[1.5rem] shadow-lg animate-on-scroll visible" 
                         alt="Direct Media Stream">`;
            } else {
                mediaPreview.innerHTML = `
                    <div class="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                        <span class="text-6xl mb-4">🎬</span>
                        <p class="font-black uppercase tracking-[0.2em] text-[10px]">Stream Link Verified</p>
                    </div>`;
            }
        }

        if (result) {
            result.classList.remove('hidden');
            setTimeout(() => {
                result.scrollIntoView({ behavior: 'smooth', block: 'start' });
                result.classList.add('visible');
            }, 100);
        }
    }

    // 5. High-Speed Download Handling
    if (mainDownloadBtn) {
        mainDownloadBtn.onclick = () => {
            if (!currentVideoUrl) return;

            const iconText = btnIcon ? btnIcon.innerText : '';
            const textContent = btnText ? btnText.innerText : '';

            mainDownloadBtn.disabled = true;
            if (btnText) btnText.innerText = 'Starting Download...';
            if (btnIcon) btnIcon.innerText = '🚀';

            window.location.href = `/api/download-video?url=${encodeURIComponent(currentVideoUrl)}`;

            setTimeout(() => {
                if (btnIcon) btnIcon.innerText = iconText;
                if (btnText) btnText.innerText = textContent;
                mainDownloadBtn.disabled = false;
            }, 4000);
        };
    }

    function handleSystemError(message) {
        if (errorMessage) errorMessage.innerText = message;
        if (error) {
            error.classList.remove('hidden');
            setTimeout(() => error.classList.add('hidden'), 5000);
        }
        if (form) {
            form.classList.add('animate-shake');
            setTimeout(() => form.classList.remove('animate-shake'), 600);
        }
    }

    if (copyLinkBtn) {
        copyLinkBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(currentVideoUrl);
                const originalHtml = copyLinkBtn.innerHTML;
                copyLinkBtn.innerHTML = '<span>✅ Copied</span>';
                setTimeout(() => copyLinkBtn.innerHTML = originalHtml, 2000);
            } catch (err) { console.error('[System] Clipboard write failed'); }
        };
    }

    function initializeScrollObserver() {
        const options = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, options);
        document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    }

    // Easter Egg
    let konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;
    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                triggerConfetti();
                konamiIndex = 0;
            }
        } else { konamiIndex = 0; }
    });

    function triggerConfetti() {
        if (window.confetti) {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#7C3AED', '#EC4899', '#F59E0B'] });
        }
    }
});

// Production Console Brand
console.log(
    '%cBroqInsta Official',
    'font-size: 32px; font-weight: 900; background: linear-gradient(135deg, #7C3AED, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: sans-serif;'
);
console.log('%cProfessional Media Extraction Protocol Active.', 'color: #6B7280; font-size: 12px;');
console.log('%cLocked & Loaded. Powered by Infinite Rankers.', 'color: #9CA3AF; font-size: 10px; font-style: italic;');
