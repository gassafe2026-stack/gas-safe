// Google Analytics 4 with Consent Mode v2. Included by build.js only when GA_MEASUREMENT_ID is set.
// Nothing is stored in cookies until the visitor accepts the banner (#consent-banner); the choice is kept in localStorage.
(function () {
    const CONSENT_KEY = 'gassafe-consent';
    const measurementId = document.currentScript.dataset.gaId;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };

    function readConsent() {
        try {
            return localStorage.getItem(CONSENT_KEY);
        } catch (e) {
            return null;
        }
    }

    function saveConsent(value) {
        try {
            localStorage.setItem(CONSENT_KEY, value);
        } catch (e) {
            // Private mode / blocked storage: the choice applies to this page view only
        }
    }

    // Ads signals are never used on this site; only analytics depends on the visitor's choice
    gtag('consent', 'default', {
        analytics_storage: readConsent() === 'granted' ? 'granted' : 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
    });
    gtag('js', new Date());
    gtag('config', measurementId);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);

    document.addEventListener('DOMContentLoaded', () => {
        const banner = document.getElementById('consent-banner');

        function choose(value) {
            saveConsent(value);
            gtag('consent', 'update', { analytics_storage: value });
            banner.classList.add('hidden');
        }

        if (!readConsent()) banner.classList.remove('hidden');
        document.getElementById('consent-accept').addEventListener('click', () => choose('granted'));
        document.getElementById('consent-decline').addEventListener('click', () => choose('denied'));
        // Footer link lets the visitor change their mind later
        document.querySelectorAll('[data-open-consent]').forEach(link => {
            link.classList.remove('hidden');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                banner.classList.remove('hidden');
            });
        });
    });
})();
