// ============================================================
//  PWA INSTALLER AVANCÉ - NELIA
//  Détecte automatiquement si l'app peut être installée
// ============================================================

let deferredPrompt = null;
let isInstalled = false;

// Détecter si déjà installé
if (window.matchMedia('(display-mode: standalone)').matches || 
    window.navigator.standalone === true) {
    isInstalled = true;
    console.log('✅ Nelia est déjà installé en mode application');
}

// ============================================================
//  ÉVÉNEMENT : beforeinstallprompt
// ============================================================
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('📲 Installation possible !');
    
    // Afficher la bannière personnalisée
    setTimeout(afficherBanniereInstallation, 3000);
});

// ============================================================
//  BANNIÈRE D'INSTALLATION PERSONNALISÉE
// ============================================================
function afficherBanniereInstallation() {
    // Ne pas afficher si déjà fermée
    if (localStorage.getItem('nelia_banniere_fermee') === 'true') return;
    
    // Ne pas afficher si déjà installé
    if (isInstalled) return;
    
    // Ne pas afficher si pas de prompt dispo
    if (!deferredPrompt) return;

    // Créer la bannière
    const banniere = document.createElement('div');
    banniere.id = 'pwa-banniere';
    banniere.innerHTML = `
        <div class="pwa-banniere-content">
            <div class="pwa-banniere-icon">🧶</div>
            <div class="pwa-banniere-text">
                <strong>Installer Nelia</strong>
                <span>Accès rapide depuis votre écran d'accueil</span>
            </div>
            <button class="pwa-banniere-installer" onclick="installerPWA()">
                Installer
            </button>
            <button class="pwa-banniere-fermer" onclick="fermerBanniere()">×</button>
        </div>
    `;
    document.body.appendChild(banniere);

    // Ajouter les styles
    const style = document.createElement('style');
    style.textContent = `
        #pwa-banniere {
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideUpPWA 0.5s ease;
            max-width: 500px;
            margin: 0 auto;
        }
        @keyframes slideUpPWA {
            from { transform: translateY(200px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .pwa-banniere-content {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
        }
        .pwa-banniere-icon {
            font-size: 32px;
            flex-shrink: 0;
        }
        .pwa-banniere-text {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .pwa-banniere-text strong {
            font-size: 15px;
            color: #2d2a24;
            margin-bottom: 2px;
        }
        .pwa-banniere-text span {
            font-size: 12px;
            color: #b5aaa0;
        }
        .pwa-banniere-installer {
            background: #c67a7a;
            color: white;
            border: none;
            padding: 10px 18px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            flex-shrink: 0;
        }
        .pwa-banniere-installer:hover {
            background: #a85a5a;
        }
        .pwa-banniere-fermer {
            background: none;
            border: none;
            font-size: 22px;
            color: #b5aaa0;
            cursor: pointer;
            padding: 4px;
            flex-shrink: 0;
        }
        @media (max-width: 480px) {
            #pwa-banniere {
                left: 10px;
                right: 10px;
                bottom: 10px;
            }
            .pwa-banniere-content {
                padding: 12px;
                gap: 8px;
            }
            .pwa-banniere-text strong {
                font-size: 13px;
            }
            .pwa-banniere-text span {
                font-size: 10px;
            }
            .pwa-banniere-installer {
                padding: 8px 14px;
                font-size: 12px;
            }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
//  INSTALLER
// ============================================================
async function installerPWA() {
    if (!deferredPrompt) {
        alert('📱 Pour installer Nelia :\n\n1. Menu du navigateur\n2. "Ajouter"');
        return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('✅ Nelia installé !');
        toast('🎉 Nelia installé ! Merci 💖');
        
        // Envoyer un événement à Formspree
        fetch('https://formspree.io/f/xqevwzzj', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                _subject: '📲 Nouvelle installation de Nelia',
                type: 'installation_pwa',
                date: new Date().toLocaleString('fr-FR')
            })
        }).catch(() => {});
    }
    
    deferredPrompt = null;
    const banner = document.getElementById('pwa-banniere');
    if (banner) banner.remove();
}

// ============================================================
//  FERMER LA BANNIÈRE
// ============================================================
function fermerBanniere() {
    const banner = document.getElementById('pwa-banniere');
    if (banner) banner.remove();
    localStorage.setItem('nelia_banniere_fermee', 'true');
}

// ============================================================
//  DÉTECTER L'INSTALLATION RÉUSSIE
// ============================================================
window.addEventListener('appinstalled', () => {
    console.log('🎉 Nelia a été installé !');
    isInstalled = true;
    const banner = document.getElementById('pwa-banniere');
    if (banner) banner.remove();
});

// ============================================================
//  ENREGISTRER LE SERVICE WORKER
// ============================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('✅ Service Worker enregistré');
                
                // Vérifier les mises à jour
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            afficherMiseAJour();
                        }
                    });
                });
            })
            .catch(err => console.error('❌ Erreur SW:', err));
    });
}

// ============================================================
//  BANNIÈRE DE MISE À JOUR
// ============================================================
function afficherMiseAJour() {
    const banniere = document.createElement('div');
    banniere.id = 'pwa-update';
    banniere.innerHTML = `
        <div style="position:fixed;bottom:20px;left:20px;right:20px;background:linear-gradient(135deg,#c67a7a,#a85a5a);color:white;padding:16px;border-radius:16px;z-index:9999;display:flex;align-items:center;gap:12px;box-shadow:0 10px 40px rgba(0,0,0,0.2);max-width:500px;margin:0 auto;">
            <span style="font-size:24px;">🔄</span>
            <div style="flex:1;">
                <strong style="display:block;font-size:14px;">Mise à jour disponible</strong>
                <span style="font-size:12px;opacity:0.9;">Nouvelle version de Nelia</span>
            </div>
            <button onclick="rechargerPage()" style="background:white;color:#c67a7a;border:none;padding:8px 16px;border-radius:10px;font-weight:600;font-size:13px;cursor:pointer;">
                Mettre à jour
            </button>
        </div>
    `;
    document.body.appendChild(banniere);
}

function rechargerPage() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
}

// ============================================================
//  RACCOURCIS D'APP (URL avec paramètres)
// ============================================================
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'points') {
        setTimeout(() => ouvrirPoints(), 500);
    } else if (action === 'panier') {
        setTimeout(() => ouvrirPanier(), 500);
    } else if (action === 'partager') {
        setTimeout(() => partagerSite(), 500);
    }
});