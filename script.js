/* ============================================================ */
/* GLOBAL STUB — ensures __seedDeliverTransaction always exists  */
/* ============================================================ */
window.__seedDeliverTransaction = window.__seedDeliverTransaction || function (tx) { window.__pendingDeliverSeed = tx || null; };

/* CLOCK */
(function startClock() {
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    function tick() {
        var now = new Date();
        var dateEl = document.getElementById('currentDate');
        var timeEl = document.getElementById('currentTime');
        if (dateEl) { try { dateEl.textContent = now.toLocaleDateString(); } catch (e) { dateEl.textContent = pad(now.getMonth() + 1) + '/' + pad(now.getDate()) + '/' + now.getFullYear(); } }
        if (timeEl) timeEl.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    }
    function boot() { tick(); setInterval(tick, 1000); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();

const ProviderTxIdManager = {
    pattern: /^[A-Za-z]{2}[0-9]{6}\.[0-9]{4}\.[A-Za-z][0-9]{5}$/,
    usedIds: [],
    loadUsedIds: function() { try { this.usedIds = JSON.parse(localStorage.getItem('afripay_provider_tx_ids') || '[]'); } catch (e) { this.usedIds = []; } },
    saveUsedIds: function() { try { localStorage.setItem('afripay_provider_tx_ids', JSON.stringify(this.usedIds)); } catch (e) {} },
    isValidFormat: function(txId) { return this.pattern.test(txId); },
    isUnique: function(txId) { return this.usedIds.indexOf(txId) === -1; },
    validate: function(txId) {
        if (!txId || txId.trim() === '') return { valid: false, error: 'Provider TX ID required.' };
        const c = txId.trim();
        if (!this.isValidFormat(c)) return { valid: false, error: 'Invalid format. Use AB123456.1234.X12345' };
        if (!this.isUnique(c)) return { valid: false, error: 'Provider TX ID already used.' };
        return { valid: true, error: null };
    },
    markAsUsed: function(txId) { if (txId && txId.trim()) { const c = txId.trim(); if (this.usedIds.indexOf(c) === -1) { this.usedIds.push(c); this.saveUsedIds(); } } }
};
const TransferCodeManager = {
    usedCodes: [],
    pattern: /^[0-9]{6}$|^[0-9]{8}$|^[0-9]{10}$|^[0-9]{12}$|^[0-9]{14}$/,
    loadUsedCodes: function() { try { this.usedCodes = JSON.parse(localStorage.getItem('afripay_transfer_codes') || '[]'); } catch (e) { this.usedCodes = []; } },
    saveUsedCodes: function() { try { localStorage.setItem('afripay_transfer_codes', JSON.stringify(this.usedCodes)); } catch (e) {} },
    isValidFormat: function(code) { return this.pattern.test(code); },
    isUnique: function(code) { return this.usedCodes.indexOf(code) === -1; },
    validate: function(code) {
        if (!code || code.trim() === '') return { valid: false, error: 'Transfer Code required.' };
        const c = code.trim();
        if (!this.isValidFormat(c)) return { valid: false, error: 'Must be 6, 8, 10, 12, or 14 digits.' };
        if (!this.isUnique(c)) return { valid: false, error: 'Transfer Code already used.' };
        return { valid: true, error: null };
    },
    markAsUsed: function(code) { if (code && code.trim()) { const c = code.trim(); if (this.usedCodes.indexOf(c) === -1) { this.usedCodes.push(c); this.saveUsedCodes(); } } }
};

const SUPABASE_URL = 'https://adxtvefswcosnooezdha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeHR2ZWZzd2Nvc25vb2V6ZGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNzU1NzQsImV4cCI6MjEwNDY1MTU3NH0.zfeZdUzCHcRCcBCkgrtvp5uriqcK0FyI5xGiHNMk42A';

var supabaseClient = null;
try {
    if (typeof window.supabase !== 'undefined' && SUPABASE_URL && SUPABASE_URL.startsWith('http')) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {}

const Supa = {
    isReady: function() { return !!supabaseClient; },
    async saveUser(u) { if (!supabaseClient) return null; try { const { data, error } = await supabaseClient.from('users').upsert({ local_id: u.id || null, name: u.name, phone: u.phone, address: u.address || null, city: u.city || null, country: u.country || null, emoji: u.emoji || '👤', avatar_data_url: u.avatarDataURL || null, role: u.role || 'user' }, { onConflict: 'phone' }).select().single(); if (error) throw error; return data; } catch (e) { return null; } },
    async saveAgent(a) { if (!supabaseClient) return null; try { const { data, error } = await supabaseClient.from('agents').upsert({ business_name: a.businessName, business_address: a.businessAddress || null, city: a.city || null, reg_number: a.regNumber || null, business_type: a.businessType || null, owner_name: a.ownerName || null, id_type: a.idType || null, id_number: a.idNumber || null, mobile_money: a.mobileMoney || null, country_code: a.countryCode || null, password: a.password || null, pin: a.pin || null, collateral_amount: a.collateralAmount || 0, collateral_limit: a.collateralLimit || 0, currency: a.currency || 'SLL', approved: a.approved === true, status: a.approved ? 'active' : 'pending', provider_tx_id: a.providerTxId || null, nin: a.nin || null, emoji: a.emoji || '🏢', avatar_data_url: a.avatarDataURL || null }, { onConflict: 'business_name' }).select().single(); if (error) throw error; return data; } catch (e) { return null; } },
    async getAgents() { if (!supabaseClient) return null; try { const { data, error } = await supabaseClient.from('agents').select('*').eq('approved', true); if (error) throw error; return data || []; } catch (e) { return null; } },
    async saveBusiness(b) { if (!supabaseClient) return null; try { const { data, error } = await supabaseClient.from('businesses').upsert({ local_id: typeof b.id === 'number' ? String(b.id) : (b.id || null), name: b.name, contact: b.contact || null, mobile_money: b.mobileMoney || null, type: b.type || null, icon: b.icon || '🏪', website: b.website || null, address: b.address || null, city: b.city || null, country: b.country || null }, { onConflict: 'name' }).select().single(); if (error) throw error; return data; } catch (e) { return null; } },
    async saveTransaction(t) {
        if (!supabaseClient) return null;
        try {
            const { data, error } = await supabaseClient.from('transactions').insert({
                tx_id: t.txId,
                provider_tx_id: t.providerTxId || null,
                transfer_code: t.transferCode || null,
                sender_name: t.senderName || null,
                sender_phone: t.senderPhone || null,
                client_name: t.clientName || null,
                client_phone: t.clientPhone || null,
                agent_name: t.agentName || null,
                agent_phone: t.agentPhone || null,
                amount: parseFloat(t.amount) || 0,
                charge: parseFloat(t.charge) || 0,
                gst: parseFloat(t.gst) || 0,
                total: parseFloat(t.total) || 0,
                currency: t.currency || 'SLL',
                mode: t.mode || 'Local',
                status: 'confirmed'
            }).select().single();
            if (error) throw error;
            return data;
        } catch (e) { return null; }
    },
    async savePendingItem(item) { if (!supabaseClient) return null; try { const { data, error } = await supabaseClient.from('pending_items').upsert({ id: item.id, type: item.type, country: item.country || null, submitted_by: item.submittedBy || null, data: item.data || null, status: item.status || 'pending', submitted_at: item.submittedAt || new Date().toISOString() }, { onConflict: 'id' }).select().single(); if (error) throw error; return data; } catch (e) { return null; } },
    async updatePendingItemStatus(id, status, reviewedBy) { if (!supabaseClient) return null; try { const { data, error } = await supabaseClient.from('pending_items').update({ status: status, reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy || null }).eq('id', id).select().single(); if (error) throw error; return data; } catch (e) { return null; } },
    async saveAgentClient(client) { if (!supabaseClient) return null; try { const { data, error } = await supabaseClient.from('agent_clients').upsert({ id: client.id, agent_id: client.agentId, name: client.name, phone: client.phone, address: client.address || null, city: client.city || null, country: client.country || null, status: 'pending' }, { onConflict: 'id' }).select().single(); if (error) throw error; return data; } catch (e) { return null; } },
    async saveSubscriber(email) { if (!supabaseClient) return null; try { const { data, error } = await supabaseClient.from('subscribers').upsert({ email: email }, { onConflict: 'email' }).select().single(); if (error) throw error; return data; } catch (e) { return null; } },
    async saveComplaint(c) { if (!supabaseClient) return null; try { const { data, error } = await supabaseClient.from('complaints').insert({ name: c.name, phone: c.phone, category: c.category, details: c.details, status: 'pending' }).select().single(); if (error) throw error; return data; } catch (e) { return null; } }
};

/* CLOUD AGENTS SYNC */
async function supaRefreshAgents() {
    if (!Supa.isReady()) return false;
    try {
        const cloudAgents = await Supa.getAgents();
        if (!Array.isArray(cloudAgents)) return false;
        let changed = false;
        cloudAgents.forEach(function (a) {
            const exists = registeredUsers.find(function (u) { return u.businessName === a.business_name; });
            const mapped = {
                id: 'agent_' + (a.business_name || a.id).replace(/\W/g, '').toLowerCase(),
                name: a.business_name, businessName: a.business_name,
                businessAddress: a.business_address, city: a.city,
                regNumber: a.reg_number, businessType: a.business_type,
                ownerName: a.owner_name, idType: a.id_type, idNumber: a.id_number,
                mobileMoney: a.mobile_money, countryCode: a.country_code,
                password: a.password, pin: a.pin,
                collateralAmount: a.collateral_amount, collateralLimit: a.collateral_limit,
                currency: a.currency, approved: a.approved === true,
                approvedBy: a.approved === true ? 'cloud-admin' : null,
                approvedAt: a.approved === true ? new Date().toISOString() : null,
                role: 'agent', isAgent: true,
                providerTxId: a.provider_tx_id, transferCode: a.transfer_code, nin: a.nin,
                avatarDataURL: a.avatar_data_url || null,
                emoji: a.emoji || '🏢'
            };
            if (exists) {
                if (JSON.stringify(exists) !== JSON.stringify(Object.assign({}, exists, mapped))) { Object.assign(exists, mapped); changed = true; }
            } else { registeredUsers.push(mapped); changed = true; }
        });
        if (changed) {
            saveRegisteredUsers();
            try { syncConnectedUsersFromRegistered(); } catch (e) {}
            try { renderAgentDropdown(currentAgentFilterCountry); } catch (e) {}
            try { populateAgentSelect(currentAgentFilterCountry); } catch (e) {}
            try { updateAgentDropdownPlaceholder(); } catch (e) {}
        }
        return changed;
    } catch (e) { console.warn('supaRefreshAgents:', e && e.message); return false; }
}

function subscribeAgentRealtime() {
    if (!Supa.isReady()) return;
    try {
        if (window.__agentRealtimeChannel) { try { supabaseClient.removeChannel(window.__agentRealtimeChannel); } catch (e) {} }
        window.__agentRealtimeChannel = supabaseClient.channel('agents-live').on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, function () { console.log('📡 agents table changed'); supaRefreshAgents(); }).subscribe();
        console.log('✅ Subscribed to agents realtime');
    } catch (e) { console.warn('subscribeAgentRealtime:', e && e.message); }
}

window.addEventListener('storage', function (e) {
    if (e.key !== 'afripay_registered_users') return;
    try {
        loadRegisteredUsers();
        try { syncConnectedUsersFromRegistered(); } catch (e) {}
        try { renderAgentDropdown(currentAgentFilterCountry); } catch (e) {}
        try { populateAgentSelect(currentAgentFilterCountry); } catch (e) {}
        console.log('🔄 agents synced from another tab');
    } catch (err) {}
});

setInterval(function () { if (Supa.isReady()) supaRefreshAgents(); }, 30000);

/* ============================================================ */
/* TRANSLATIONS                                                  */
/* ============================================================ */
const TRANSLATIONS = {
    en: { login:"Login", register:"Register", logout:"Logout", sender:"👤 SENDER", agent:"👤 AGENT", client:"👥 CLIENT", name:"Name *", phone:"Phone *", address:"Address", city:"City *", amount:"Amount *", country:"🌍 Country", base:"💰 Base:", fee:"📊 Fee (5%):", gst:"🏛️ GST", total:"💵 Total:", currency:"🌍 Currency:", operator:"💸 Operator", txId:"🔖 TX ID", providerTxId:"🔐 Provider TX ID", transferCode:"Transfer Code *", submit:"Submit", quickPay:"⭐ QUICK PAY ⭐", addBiz:"➕ Add Biz", editBiz:"✏️ Edit Biz", about:"About", dev:"Dev", contact:"Contact", subscribe:"Subscribe", how:"📖 How", convert:"💱 Convert", addClient:"➕ Client", gen:"Gen", copy:"Copy", save:"Save", cancel:"Cancel", close:"Close", selectContact:"Select a contact", send:"Send", chooseAvatar:"😊 Choose Your Avatar", profileAvatar:"😊 Profile Avatar", upload:"📷 Upload", remove:"🗑️ Remove", emoji:"🎨 Emoji", replaceLogo:"🖼️ Replace Agent Logo", credentialsCorrect:"✅ Credentials correct", directPay:"💳 DirectPay +", watuPay:"🌍 WatuPay", weBine:"🏦 WeBine", others:"🔗 Others", report:"🚨 Report" },
    fr: { login:"Connexion", register:"Inscription", logout:"Déconnexion", sender:"👤 EXPÉDITEUR", agent:"👤 AGENT", client:"👥 CLIENT", name:"Nom *", phone:"Téléphone *", address:"Adresse", city:"Ville *", amount:"Montant *", country:"🌍 Pays", base:"💰 Base:", fee:"📊 Frais (5%):", gst:"🏛️ TVA", total:"💵 Total:", currency:"🌍 Devise:", operator:"💸 Opérateur", txId:"🔖 ID TX", providerTxId:"🔐 ID TX Fournisseur", transferCode:"Code de transfert *", submit:"Soumettre", quickPay:"⭐ PAIEMENT RAPIDE ⭐", addBiz:"➕ Ajouter Entreprise", editBiz:"✏️ Modifier Entreprise", about:"À propos", dev:"Développeur", contact:"Contact", subscribe:"S'abonner", how:"📖 Comment", convert:"💱 Convertir", addClient:"➕ Client", gen:"Gén", copy:"Copier", save:"Enregistrer", cancel:"Annuler", close:"Fermer", selectContact:"Sélectionner un contact", send:"Envoyer", chooseAvatar:"😊 Choisissez votre avatar", profileAvatar:"😊 Avatar du profil", upload:"📷 Télécharger", remove:"🗑️ Supprimer", emoji:"🎨 Emoji", replaceLogo:"🖼️ Remplacer le logo", credentialsCorrect:"✅ Identifiants corrects", directPay:"💳 DirectPay +", watuPay:"🌍 WatuPay", weBine:"🏦 WeBine", others:"🔗 Autres", report:"🚨 Signaler" },
    ar: { login:"تسجيل الدخول", register:"تسجيل", logout:"خروج", sender:"👤 المرسل", agent:"👤 الوكيل", client:"👥 العميل", name:"الاسم *", phone:"الهاتف *", address:"العنوان", city:"المدينة *", amount:"المبلغ *", country:"🌍 البلد", base:"💰 الأساس:", fee:"📊 الرسوم (5%):", gst:"🏛️ ضريبة", total:"💵 المجموع:", currency:"🌍 العملة:", operator:"💸 المشغل", txId:"🔖 معرف المعاملة", providerTxId:"🔐 معرف مزود المعاملة", transferCode:"رمز التحويل *", submit:"إرسال", quickPay:"⭐ دفع سريع ⭐", addBiz:"➕ إضافة نشاط", editBiz:"✏️ تعديل النشاط", about:"حول", dev:"المطور", contact:"اتصل", subscribe:"اشترك", how:"📖 كيف", convert:"💱 تحويل", addClient:"➕ عميل", gen:"توليد", copy:"نسخ", save:"حفظ", cancel:"إلغاء", close:"إغلاق", selectContact:"اختر جهة اتصال", send:"إرسال", chooseAvatar:"😊 اختر الصورة الرمزية", profileAvatar:"😊 صورة الملف الشخصي", upload:"📷 رفع", remove:"🗑️ إزالة", emoji:"🎨 رمز", replaceLogo:"🖼️ استبدال الشعار", credentialsCorrect:"✅ بيانات الاعتماد صحيحة", directPay:"💳 DirectPay +", watuPay:"🌍 WatuPay", weBine:"🏦 WeBine", others:"🔗 أخرى", report:"🚨 تقرير" },
    es: { login:"Iniciar sesión", register:"Registrarse", logout:"Cerrar sesión", sender:"👤 REMITENTE", agent:"👤 AGENTE", client:"👥 CLIENTE", name:"Nombre *", phone:"Teléfono *", address:"Dirección", city:"Ciudad *", amount:"Monto *", country:"🌍 País", base:"💰 Base:", fee:"📊 Tarifa (5%):", gst:"🏛️ IVA", total:"💵 Total:", currency:"🌍 Moneda:", operator:"💸 Operador", txId:"🔖 ID TX", providerTxId:"🔐 ID TX Proveedor", transferCode:"Código de transferencia *", submit:"Enviar", quickPay:"⭐ PAGO RÁPIDO ⭐", addBiz:"➕ Añadir Negocio", editBiz:"✏️ Editar Negocio", about:"Acerca de", dev:"Desarrollador", contact:"Contacto", subscribe:"Suscribirse", how:"📖 Cómo", convert:"💱 Convertir", addClient:"➕ Cliente", gen:"Gen", copy:"Copiar", save:"Guardar", cancel:"Cancelar", close:"Cerrar", selectContact:"Selecciona un contacto", send:"Enviar", chooseAvatar:"😊 Elige tu avatar", profileAvatar:"😊 Avatar del perfil", upload:"📷 Subir", remove:"🗑️ Eliminar", emoji:"🎨 Emoji", replaceLogo:"🖼️ Reemplazar logo", credentialsCorrect:"✅ Credenciales correctas", directPay:"💳 DirectPay +", watuPay:"🌍 WatuPay", weBine:"🏦 WeBine", others:"🔗 Otros", report:"🚨 Informar" }
};

let currentLang = 'en';
function getEl(id) { return document.getElementById(id); }
function showToast(msg, dur) {
    if (!dur) dur = 2800;
    const el = getEl('toastMsg'); if (!el) { try { alert(msg); } catch(e) {} return; }
    el.innerText = msg; el.style.visibility = 'visible'; el.style.opacity = '1';
    clearTimeout(el._hide);
    el._hide = setTimeout(function() { el.style.opacity = '0'; setTimeout(function() { el.style.visibility = 'hidden'; }, 300); }, dur);
}
function escapeHTML(str) { if (!str) return ''; return String(str).replace(/[&<>"'\/]/g, function(s) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;','/':'&#x2F;' }[s]; }); }
function supaBackground(promise, label) { if (!Supa.isReady()) return; Promise.resolve(promise).catch(function(err) { console.warn('⚠️ ' + (label || 'Sync') + ':', err && err.message); }); }

function translatePage() {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        const key = el.getAttribute('data-i18n');
        if (dict[key] && el.children.length === 0) el.textContent = dict[key];
    });
    try { updateAgentDropdownPlaceholder(); } catch(e) {}
    try { renderAgentDropdown(); } catch(e) {}
    try { populateAgentSelect(currentAgentFilterCountry); } catch(e) {}
}
function setLanguage(lang) {
    currentLang = lang;
    try { localStorage.setItem('afripay_lang', lang); } catch (e) {}
    const sel = getEl('langSelect'); if (sel) sel.value = lang;
    translatePage();
    showToast('🌐 ' + lang.toUpperCase(), 1500);
}

const ALL_COUNTRIES = ['Liberia','Guinea','Senegal','Mali','Ivory Coast','Ghana','Niger','Benin','Guinea Bissau','Gambia','Togo','Kenya','Central Africa Rep','Ethiopia','Gabon','Madagascar','Morocco','Rwanda','Uganda','DR Congo','Burkina Faso','Sierra Leone'];
const CAPITAL_CITIES = ['Monrovia','Conakry','Dakar','Bamako','Yamoussoukro','Accra','Niamey','Porto-Novo','Bissau','Banjul','Lomé','Nairobi','Bangui','Addis Ababa','Libreville','Antananarivo','Rabat','Kigali','Kampala','Kinshasa','Ouagadougou','Freetown'];
const COLLATERAL_OPTIONS = [200,300,400,500,1000,1500,2000,2500,3000,3500,4000,4500,5000,5500,6000,6500,7000,7500,8000,8500,9000,9500,10000,10500,11000,11500,12000,12500,13000,13500,14000,14500,15000];
const SUPPORTED_CURRENCIES = [
    { code:'LR', name:'Liberia', currency:'LRD', flag:'🇱🇷', gst:10 }, { code:'GN', name:'Guinea', currency:'GNF', flag:'🇬🇳', gst:18 },
    { code:'SN', name:'Senegal', currency:'XOF', flag:'🇸🇳', gst:18 }, { code:'ML', name:'Mali', currency:'XOF', flag:'🇲🇱', gst:18 },
    { code:'CI', name:'Ivory Coast', currency:'XOF', flag:'🇨🇮', gst:18 }, { code:'GH', name:'Ghana', currency:'GHS', flag:'🇬🇭', gst:12.5 },
    { code:'NE', name:'Niger', currency:'XOF', flag:'🇳🇪', gst:19 }, { code:'BJ', name:'Benin', currency:'XOF', flag:'🇧🇯', gst:18 },
    { code:'GW', name:'Guinea Bissau', currency:'XOF', flag:'🇬🇼', gst:15 }, { code:'GM', name:'Gambia', currency:'GMD', flag:'🇬🇲', gst:15 },
    { code:'TG', name:'Togo', currency:'XOF', flag:'🇹🇬', gst:18 }, { code:'KE', name:'Kenya', currency:'KES', flag:'🇰🇪', gst:16 },
    { code:'CF', name:'Central Africa Rep', currency:'XAF', flag:'🇨🇫', gst:19 }, { code:'ET', name:'Ethiopia', currency:'ETB', flag:'🇪🇹', gst:15 },
    { code:'GA', name:'Gabon', currency:'XAF', flag:'🇬🇦', gst:18 }, { code:'MG', name:'Madagascar', currency:'MGA', flag:'🇲🇬', gst:20 },
    { code:'MA', name:'Morocco', currency:'MAD', flag:'🇲🇦', gst:20 }, { code:'RW', name:'Rwanda', currency:'RWF', flag:'🇷🇼', gst:18 },
    { code:'UG', name:'Uganda', currency:'UGX', flag:'🇺🇬', gst:18 }, { code:'CD', name:'DR Congo', currency:'CDF', flag:'🇨🇩', gst:16 },
    { code:'BF', name:'Burkina Faso', currency:'XOF', flag:'🇧🇫', gst:18 }, { code:'SL', name:'Sierra Leone', currency:'SLL', flag:'🇸🇱', gst:12.5 }
];

const COUNTRY_CODE_TO_NAME = { '+232':'Sierra Leone', '+224':'Guinea', '+221':'Senegal', '+231':'Liberia', '+233':'Ghana', '+234':'Nigeria', '+254':'Kenya', '+223':'Mali', '+225':'Ivory Coast', '+227':'Niger', '+229':'Benin', '+245':'Guinea Bissau', '+220':'Gambia', '+228':'Togo', '+236':'Central Africa Rep', '+251':'Ethiopia', '+241':'Gabon', '+261':'Madagascar', '+212':'Morocco', '+250':'Rwanda', '+256':'Uganda', '+243':'DR Congo', '+226':'Burkina Faso' };
const COUNTRY_CODE_TO_FLAG = { '+232':'🇸🇱', '+224':'🇬🇳', '+221':'🇸🇳', '+231':'🇱🇷', '+233':'🇬🇭', '+234':'🇳🇬', '+254':'🇰🇪', '+223':'🇲🇱', '+225':'🇨🇮', '+227':'🇳🇪', '+229':'🇧🇯', '+245':'🇬🇼', '+220':'🇬🇲', '+228':'🇹🇬', '+236':'🇨🇫', '+251':'🇪🇹', '+241':'🇬🇦', '+261':'🇲🇬', '+212':'🇲🇦', '+250':'🇷🇼', '+256':'🇺🇬', '+243':'🇨🇩', '+226':'🇧🇫' };
const COUNTRY_NAME_TO_CODE = {};
for (const code in COUNTRY_CODE_TO_NAME) COUNTRY_NAME_TO_CODE[COUNTRY_CODE_TO_NAME[code]] = code;

const SUPPORTED_COUNTRY_FLAGS = ['🇱🇷','🇬🇳','🇸🇳','🇲🇱','🇨🇮','🇬🇭','🇳🇪','🇧🇯','🇬🇼','🇬🇲','🇹🇬','🇰🇪','🇨🇫','🇪🇹','🇬🇦','🇲🇬','🇲🇦','🇷🇼','🇺🇬','🇨🇩','🇧🇫','🇸🇱'];
const AVAILABLE_EMOJIS = ['👤','👩','👨','👧','👦','👴','👵','🧑','👶','🧒','👱','🧔','🧑‍💼','👩‍💼','👨‍💼','🧑‍🎓','👩‍🎓','👨‍🎓','🧑‍🏫','👩‍🏫','👨‍🏫','🧑‍⚕️','👩‍⚕️','👨‍⚕️','🧑‍🍳','👩‍🍳','👨‍🍳','🧑‍🌾','👩‍🌾','👨‍🌾','🧑‍🔧','👩‍🔧','👨‍🔧','🧑‍💻','👩‍💻','👨‍💻','😀','😃','😄','😁','😊','🙂','😉','😍','🤩','😎','🤗','🤔','🧐','😇','🥰','😘','🦁','🐯','🐶','🐱','🐼','🦊','🐨','🐻','🐵','🐸','🐷','🐔','🦄','🐲','🦋','🐢','💰','💵','💴','💶','💷','💸','💳','🪙','🏦','📱','💻','🖥️','🛒','🛍️','🎁','⭐'];

const businesses = [
    { id:1, name:"Mama's Kitchen", contact:"+232-76-123-456", mobileMoney:"+232-76-123-456", type:"Restaurant", icon:"🍽️", website:"https://www.mamaskitchen.sl", goods:[{name:"Jollof Rice + Chicken",price:85,quantity:10,quality:"Fresh",kind:"product",delivery:"Same day in Freetown",icon:"🍛"}] },
    { id:2, name:"Freetown Computer Hub", contact:"+232-80-234-567", mobileMoney:"+232-80-234-567", type:"Electronics", icon:"💻", website:"https://www.freetowncomputers.com", goods:[{name:"Laptop Repair",price:150,quantity:1,quality:"Brand new",kind:"service",delivery:"1-2 business days",icon:"🔧"}] },
    { id:3, name:"Excellence School", contact:"+232-73-345-678", mobileMoney:"+232-73-345-678", type:"Education", icon:"📚", website:"https://www.excellenceschool.edu", goods:[{name:"Tuition Fee",price:120,quantity:30,quality:"Standard",kind:"service",delivery:"Instant enrollment",icon:"🎓"}] },
    { id:4, name:"Dr. Kamara Clinic", contact:"+232-76-456-789", mobileMoney:"+232-76-456-789", type:"Healthcare", icon:"🏥", website:"https://www.drkimaraclinic.com", goods:[{name:"Consultation",price:25,quantity:1,quality:"Premium",kind:"service",delivery:"Walk-in or appointment",icon:"🩺"}] },
    { id:5, name:"John Hardware", contact:"+232-80-567-890", mobileMoney:"+232-80-567-890", type:"Hardware", icon:"🔨", website:"https://www.johnshardware.sl", goods:[{name:"Cement (50kg)",price:180,quantity:200,quality:"Brand new",kind:"product",delivery:"Delivery within 24h",icon:"🧱"}] },
    { id:6, name:"Salone Fashion", contact:"+232-73-678-901", mobileMoney:"+232-73-678-901", type:"Fashion", icon:"👗", website:"https://www.salonefashion.com", goods:[{name:"African Print Dress",price:150,quantity:20,quality:"Premium",kind:"product",delivery:"3-5 days nationwide",icon:"👘"}] },
    { id:7, name:"James Williams", contact:"+232-76-012-345", mobileMoney:"+232-76-012-345", type:"Individual", icon:"👤", website:"https://www.jameswilliams.com", goods:[{name:"Freelance Web Design",price:500,quantity:5,quality:"Premium",kind:"service",delivery:"1-2 weeks",icon:"💻"}] },
    { id:8, name:"Mary Koroma", contact:"+232-80-123-456", mobileMoney:"+232-80-123-456", type:"Individual", icon:"👩", website:"https://www.marykoroma.com", goods:[{name:"Handmade Crafts",price:45,quantity:30,quality:"Brand new",kind:"product",delivery:"Local pickup or delivery",icon:"🧶"}] },
    { id:9, name:"NUSWEB Biz", contact:"+232-76-436-811", mobileMoney:"+232-76-436-811", type:"Electronics", icon:"🖥️", website:"https://www.nuswebtech.com", goods:[{name:"Samsung Galaxy A06 64GB",price:3250,quantity:10,quality:"Brand new",kind:"product",delivery:"Free delivery in Freetown",icon:"📱"}] }
];

let currentUser = null;
let selectedAgentId = null;
let _selectedAgentId = null;
let registeredUsers = [];
let connectedUsers = [];
let agreementSigned = false;
let isLocalMode = true;
let currentCountryData = { gstRate: 10, currency: 'LRD', flag: '🇱🇷', countryName: 'Liberia' };
let currentAgentFilterCountry = null;
let isBusinessMode = false;
let customBusinesses = [];
let lastSelectedBusinessId = null;
let regAvatarDataURL = null;
let regEmoji = '👤';
let agentBizProfileDataURL = null;
let agentBizProfileEmoji = '🏢';
let paybackTargetAgentId = null;
let currentClient = null;
let pendingAgentAuthId = null;
let chatActiveTarget = null;
let chatUnreadCount = 0;
let dpImageDataURL = null;
let currentOrderedProduct = null;
let mbFourSelectedAgentId = null;
let mbFourSelectedAgentPhone = null;

const FEE_CARREAR = 0.03;
const FEE_LOCAL = 0.01;
const FEE_SERVICES = 0.01;
const FEE_TOTAL = FEE_CARREAR + FEE_LOCAL + FEE_SERVICES;

const FX_TO_USD = { SLL:0.000044, LRD:0.0052, GNF:0.000116, XOF:0.00165, GHS:0.066, GMD:0.014, KES:0.0077, XAF:0.00165, ETB:0.0175, MGA:0.00022, MAD:0.10, RWF:0.00078, UGX:0.00027, CDF:0.00035 };

const APP_LINKS = { directPay: 'https://www.appcreator24.com/app4066434-hmkuo4', watuPay: 'https://aminejalloh-io.github.io/WatuPay/', weBine: 'https://www.appcreator24.com/app814705-24jpuf' };

let popupAdCount = 0;
let popupAdIntervalId = null;
let currentPopupAdModal = null;

const PREMIUM_POPUP_AD = {
    icon: '👑', title: 'AfriPay PREMIUM',
    body: 'Unlock the full power of AfriPay! Zero fees on all transfers, priority 24/7 support, higher transaction limits, and exclusive partner discounts. Join thousands of premium members today!',
    buttonText: '🌟 Upgrade to Premium',
    buttonAction: function() { alert('Redirecting to Premium signup...'); },
    isPremium: true
};

function getRandomProductAd() {
    const allBiz = getAllBusinesses();
    const candidates = [];
    allBiz.forEach(function(biz) { if (biz.goods && biz.goods.length > 0) biz.goods.forEach(function(g) { candidates.push({ biz: biz, product: g }); }); });
    if (candidates.length === 0) return { icon: '🏪', title: 'Discover AfriPay Businesses', body: 'Browse local businesses, order products and services, and pay instantly with AfriPay.', buttonText: 'Explore Now', buttonAction: function() { showToast('🏪 Browse the Quick Pay strip!', 2200); } };
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const biz = pick.biz; const p = pick.product;
    const currency = (typeof getUserCurrency === 'function' ? getUserCurrency() : 'SLL');
    return { icon: p.icon || biz.icon || '📦', title: p.name || 'Featured Product', isProductAd: true, businessId: biz.id, businessName: biz.name, businessIcon: biz.icon || '🏪', businessType: biz.type || '', businessMobileMoney: biz.mobileMoney || biz.contact || '', productName: p.name || 'Item', price: parseFloat(p.price) || 0, currency: currency, quality: p.quality || 'Standard', quantity: p.quantity || 1, kind: (p.kind || 'product').toLowerCase(), delivery: p.delivery || 'Delivery 1-3 business days', website: biz.website || '', buttonText: '🛒 Order via AfriPay', buttonAction: function() { placeProductOrder(adDataRef); } };
}

let adDataRef = null;

function placeProductOrder(adData) {
    if (!adData) return;
    if (!currentUser) { showToast('🔐 Please login or register to place an order.', 2600); try { getEl('loginModal').style.display = 'flex'; } catch (e) {} return; }
    try { exitBusinessMode(); } catch (e) {}
    const amountInput = getEl('amountInput');
    if (amountInput) { amountInput.value = (parseFloat(adData.price) || 0).toFixed(2); amountInput.dispatchEvent(new Event('input')); }
    if (getEl('agentName')) getEl('agentName').value = adData.businessName || 'Business';
    if (getEl('agentPhone')) getEl('agentPhone').value = adData.businessMobileMoney || '';
    const agentSelect = getEl('agentNameSelect'); const agentLabel = getEl('agentNameLabel');
    if (agentSelect) {
        isBusinessMode = true; agentSelect.style.display = 'none';
        let bd = getEl('bizDisplayField');
        if (!bd) { bd = document.createElement('div'); bd.id = 'bizDisplayField'; bd.className = 'biz-display-field'; agentSelect.parentNode.insertBefore(bd, agentSelect.nextSibling); }
        bd.innerHTML = '<span>' + (adData.businessIcon || '🏪') + '</span><span>' + escapeHTML(adData.businessName || 'Business') + '</span>';
        bd.style.display = 'flex';
        if (agentLabel) agentLabel.textContent = '🏢 Business (from ad)';
    }
    currentOrderedProduct = { productName: adData.productName || 'Item', productIcon: adData.icon || '📦', businessName: adData.businessName || 'Business', businessIcon: adData.businessIcon || '🏪', businessMobileMoney: adData.businessMobileMoney || '', price: parseFloat(adData.price) || 0, currency: adData.currency || getUserCurrency(), quality: adData.quality || '', quantity: adData.quantity || 1, delivery: adData.delivery || '', website: adData.website || '', kind: adData.kind || 'product' };
    renderOrderProductBadge(currentOrderedProduct);
    computeCharges();
    try { ensureTransactionId(); } catch (e) {}
    try { const fc = getEl('mainFormContainer'); if (fc && fc.scrollIntoView) fc.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (amountInput && amountInput.focus) amountInput.focus(); } catch (e) {}
    showToast('🛒 Order ready: ' + (adData.productName || 'Item'), 3200);
}

function renderOrderProductBadge(order) {
    const container = getEl('orderProductBadgeContainer'); if (!container) return;
    if (!order) { container.innerHTML = ''; container.style.display = 'none'; return; }
    container.innerHTML = '<div class="order-product-badge"><span class="opb-icon">' + (order.productIcon || '📦') + '</span><div class="opb-info"><div class="opb-title">' + escapeHTML(order.productName) + '</div><div class="opb-sub">' + (order.businessIcon || '🏪') + ' ' + escapeHTML(order.businessName) + ' · ' + escapeHTML(order.currency) + ' ' + (parseFloat(order.price) || 0).toFixed(2) + (order.delivery ? ' · 🚚 ' + escapeHTML(order.delivery) : '') + '</div></div><button type="button" class="opb-clear" id="clearOrderProductBtn" title="Clear product">✕</button></div>';
    container.style.display = 'block';
    const clearBtn = getEl('clearOrderProductBtn');
    if (clearBtn) clearBtn.addEventListener('click', function() { clearOrderedProduct(); showToast('🗑️ Product cleared from order', 1800); });
}

function clearOrderedProduct() {
    currentOrderedProduct = null;
    renderOrderProductBadge(null);
    try { exitBusinessMode(); const sel = getEl('agentNameSelect'); if (sel) sel.style.display = 'block'; const lbl = getEl('agentNameLabel'); if (lbl) lbl.textContent = 'Agent *'; if (getEl('agentName')) getEl('agentName').value = ''; if (getEl('agentPhone')) getEl('agentPhone').value = ''; if (getEl('amountInput')) getEl('amountInput').value = ''; computeCharges(); } catch (e) {}
}

function removeExistingPopupAd() { if (currentPopupAdModal && currentPopupAdModal.parentNode) currentPopupAdModal.parentNode.removeChild(currentPopupAdModal); currentPopupAdModal = null; }

function showPopupAd(adData) {
    removeExistingPopupAd();
    adDataRef = adData;
    const adModal = document.createElement('div');
    adModal.id = 'popupAdModal'; adModal.className = 'modal'; adModal.style.display = 'flex'; adModal.style.zIndex = '2000';
    const isPremium = adData.isPremium === true; const isProduct = adData.isProductAd === true;
    let headerBg, titleSize, buttonBg, borderGlow;
    if (isPremium) { headerBg = 'linear-gradient(135deg,#f4a261,#e67e22 50%,#d35400)'; titleSize = '1.5rem'; buttonBg = '#0f2b3d'; borderGlow = 'box-shadow:0 0 0 3px rgba(244,162,97,.5),0 0 30px rgba(244,162,97,.4),0 20px 40px rgba(0,0,0,.35);'; }
    else if (isProduct) { headerBg = 'linear-gradient(135deg,#0a2b3c 0%,#2c7da0 55%,#4aa8c9 100%)'; titleSize = '1.25rem'; buttonBg = '#f4a261'; borderGlow = 'box-shadow:0 0 0 3px rgba(44,125,160,.35),0 0 22px rgba(44,125,160,.3),0 20px 40px rgba(0,0,0,.32);'; }
    else { headerBg = 'linear-gradient(135deg,#0a2b3c,#1c4e6c)'; titleSize = '1.3rem'; buttonBg = '#f4a261'; borderGlow = ''; }
    let productDetailsHtml = '';
    if (isProduct) { productDetailsHtml = '<div class="popup-ad-details-panel"><div class="popup-ad-detail-row"><span class="label">🏢 Business</span><span class="value">' + (adData.businessIcon || '🏪') + ' ' + escapeHTML(adData.businessName) + '</span></div><div class="popup-ad-detail-row"><span class="label">🏷️ Product</span><span class="value">' + escapeHTML(adData.productName) + '</span></div><div class="popup-ad-detail-row price"><span class="label">💰 Price</span><span class="value">' + adData.currency + ' ' + (parseFloat(adData.price) || 0).toFixed(2) + '</span></div><div class="popup-ad-detail-row"><span class="label">⭐ Quality</span><span class="value">' + escapeHTML(adData.quality) + '</span></div><div class="popup-ad-detail-row"><span class="label">📦 Quantity</span><span class="value">' + escapeHTML(String(adData.quantity)) + ' available</span></div><div class="popup-ad-detail-row delivery"><span class="label">🚚 Delivery</span><span class="value">' + escapeHTML(adData.delivery) + '</span></div>' + (adData.businessMobileMoney ? '<div class="popup-ad-detail-row"><span class="label">📱 Mobile Money</span><span class="value">' + escapeHTML(adData.businessMobileMoney) + '</span></div>' : '') + '</div>'; }
    let websiteHtml = ''; if (isProduct && adData.website) websiteHtml = '<a class="popup-ad-website" href="' + escapeHTML(adData.website) + '" target="_blank" rel="noopener">🌐 ' + escapeHTML(adData.website) + '</a>';
    const sparkles = '<span class="popup-ad-sparkle s1">✦</span><span class="popup-ad-sparkle s2">✦</span><span class="popup-ad-sparkle s3">✦</span><span class="popup-ad-sparkle s4">✦</span>';
    const premiumBadge = isPremium ? '<div class="popup-ad-mini-badge" style="background:rgba(255,255,255,.25);">👑 VIP ONLY</div>' : '';
    adModal.innerHTML = '<div class="modal-content popup-ad-card' + (isPremium ? ' premium' : '') + '" style="max-width:' + (isPremium ? '380px' : (isProduct ? '360px' : '320px')) + '; padding:0; overflow:hidden; position:relative; border-radius:1.2rem; ' + borderGlow + '"><button class="popup-ad-close" id="closeAdBtn">✕</button>' + (isPremium ? '<div class="popup-ad-tag red">🔥 LIMITED OFFER</div>' : '') + (isProduct ? '<div class="popup-ad-tag green">✨ FEATURED</div>' : '') + '<div style="background:' + headerBg + ';padding:22px 20px;text-align:center;color:white;position:relative;overflow:hidden;"><div class="popup-ad-header-glow"></div>' + sparkles + '<div class="popup-ad-icon-wrap"><div class="popup-ad-icon">' + adData.icon + '</div></div><h2 class="popup-ad-title" style="margin:8px 0 0;font-size:' + titleSize + ';font-weight:900;">' + escapeHTML(adData.title) + '</h2>' + (isProduct ? '<div style="font-size:.68rem;opacity:.85;margin-top:6px;font-weight:600;">from ' + escapeHTML(adData.businessName) + '</div>' : '') + (isPremium ? '<div style="margin-top:8px;">' + premiumBadge + '</div>' : '') + '</div><div style="padding:18px;text-align:center;background:#fff;">' + productDetailsHtml + (!isProduct ? '<p style="color:#1e3b4a;margin-bottom:15px;font-size:0.9rem;line-height:1.5;">' + escapeHTML(adData.body) + '</p>' : '') + '<button class="popup-ad-btn" id="popupAdActionBtn" style="background:' + buttonBg + ';color:#fff;border:none;padding:13px 20px;border-radius:30px;font-weight:800;cursor:pointer;width:100%;">' + escapeHTML(adData.buttonText) + '</button>' + websiteHtml + '</div><div class="popup-ad-progress"></div></div>';
    document.body.appendChild(adModal);
    currentPopupAdModal = adModal;
    document.getElementById('closeAdBtn').addEventListener('click', function() { adModal.style.display = 'none'; removeExistingPopupAd(); });
    const actionBtn = document.getElementById('popupAdActionBtn');
    if (actionBtn) actionBtn.addEventListener('click', function() { adData.buttonAction(); adModal.style.display = 'none'; removeExistingPopupAd(); });
    adModal.addEventListener('click', function(e) { if (e.target === adModal) { adModal.style.display = 'none'; removeExistingPopupAd(); } });
}

function triggerNextPopupAd() { popupAdCount++; if (popupAdCount % 7 === 0) showPopupAd(PREMIUM_POPUP_AD); else showPopupAd(getRandomProductAd()); }
function initPopupAds() { if (popupAdIntervalId) clearInterval(popupAdIntervalId); setTimeout(function() { triggerNextPopupAd(); }, 5000); popupAdIntervalId = setInterval(function() { triggerNextPopupAd(); }, 90000); }

function resizeImageFile(file, maxSize, quality) {
    return new Promise(function(resolve, reject) {
        if (!file || !file.type || file.type.indexOf('image/') !== 0) { reject(new Error('Not an image file')); return; }
        const reader = new FileReader();
        reader.onload = function(ev) {
            const img = new Image();
            img.onload = function() {
                try {
                    let w = img.width || maxSize, h = img.height || maxSize;
                    if (w > maxSize || h > maxSize) { if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; } else { w = Math.round(w * maxSize / h); h = maxSize; } }
                    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality || 0.82));
                } catch (e) { reject(e); }
            };
            img.onerror = function() { reject(new Error('Image load failed')); };
            img.src = ev.target.result;
        };
        reader.onerror = function() { reject(new Error('File read failed')); };
        reader.readAsDataURL(file);
    });
}

function populateCapitalCityDropdown(selectId) { const s = getEl(selectId); if (!s) return; const cv = s.value; s.innerHTML = '<option value="">Select city...</option>'; CAPITAL_CITIES.forEach(function(c) { const o = document.createElement('option'); o.value = c; o.textContent = c; s.appendChild(o); }); if (cv && Array.from(s.options).some(function(o) { return o.value === cv; })) s.value = cv; }
function populateCountryDropdown(selectId) { const s = getEl(selectId); if (!s) return; const cv = s.value; s.innerHTML = ''; ALL_COUNTRIES.forEach(function(c) { const o = document.createElement('option'); o.value = c; o.textContent = c; s.appendChild(o); }); if (cv && Array.from(s.options).some(function(o) { return o.value === cv; })) s.value = cv; }
function populateAllDropdowns() { ['senderCitySelect','regCitySelect','agentCitySelect','editCitySelect','editAccountCitySelect','bizCitySelect','newClientCitySelect'].forEach(populateCapitalCityDropdown); ['regCountry','editAccountCountry','newClientCountrySelect','bizCountrySelect','dcCountry','dbCountry'].forEach(populateCountryDropdown); }
function ensureSelectsArePopulated() { document.addEventListener('focusin', function(e) { var t = e.target; if (!t || t.tagName !== 'SELECT') return; if (t.options && t.options.length > 1) return; var id = t.id; var cities = ['senderCitySelect','regCitySelect','agentCitySelect','editCitySelect','editAccountCitySelect','bizCitySelect','newClientCitySelect']; var countries = ['regCountry','editAccountCountry','newClientCountrySelect','bizCountrySelect','dcCountry','dbCountry']; try { if (cities.indexOf(id) !== -1) populateCapitalCityDropdown(id); else if (countries.indexOf(id) !== -1) populateCountryDropdown(id); } catch (err) {} }, true); }
function populateCollateralDropdowns() { ['agentCollateralLimit','editCollateralLimit','daCollateral'].forEach(function(id) { const s = getEl(id); if (!s) return; const cv = s.value; s.innerHTML = ''; COLLATERAL_OPTIONS.forEach(function(v) { const o = document.createElement('option'); o.value = v; o.textContent = v.toLocaleString(); s.appendChild(o); }); if (cv) s.value = cv; }); }
function populateCountryCodeSelect() { let s = getEl('countryCodeSelect'); if (!s) { s = document.createElement('select'); s.id = 'countryCodeSelect'; s.style.display = 'none'; document.body.appendChild(s); } s.innerHTML = ''; SUPPORTED_CURRENCIES.forEach(function(c, i) { const o = document.createElement('option'); o.value = c.code + '|' + c.name + '|' + c.currency + '|' + c.flag + '|' + c.gst + '|' + (i + 1); o.textContent = c.flag + ' ' + c.name; s.appendChild(o); }); }
function populateInlineConverter() { const from = getEl('inlineConvFrom'), to = getEl('inlineConvTo'); if (!from || !to) return; const codes = Object.keys(FX_TO_USD); const opts = codes.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join(''); if (!from.options.length) from.innerHTML = opts; if (!to.options.length) to.innerHTML = opts; try { from.value = getUserCurrency(); } catch (e) {} try { to.value = 'SLL'; } catch (e) {} }
function getUserCurrency() {
    const map = { 'Sierra Leone':'SLL','Liberia':'LRD','Guinea':'GNF','Senegal':'XOF','Mali':'XOF','Ivory Coast':'XOF','Ghana':'GHS','Niger':'XOF','Benin':'XOF','Guinea Bissau':'XOF','Gambia':'GMD','Togo':'XOF','Kenya':'KES','Central Africa Rep':'XAF','Ethiopia':'ETB','Gabon':'XAF','Madagascar':'MGA','Morocco':'MAD','Rwanda':'RWF','Uganda':'UGX','DR Congo':'CDF','Burkina Faso':'XOF' };
    const uc = currentUser && currentUser.country;
    if (uc && map[uc]) return map[uc];
    if (!isLocalMode && currentCountryData && currentCountryData.currency) return currentCountryData.currency;
    const s = getEl('countryCodeSelect');
    if (s && s.value) { const p = s.value.split('|'); if (p[2]) return p[2]; }
    return 'SLL';
}
function updateUserCountryData() { if (currentUser && currentUser.country) { const sup = SUPPORTED_CURRENCIES.find(function(c) { return c.name.toLowerCase() === currentUser.country.toLowerCase(); }); if (sup) currentCountryData = { gstRate: sup.gst, currency: sup.currency, flag: sup.flag, countryName: sup.name }; } }
function loadRegisteredUsers() { try { registeredUsers = JSON.parse(localStorage.getItem('afripay_registered_users') || '[]'); } catch (e) { registeredUsers = []; } if (!Array.isArray(registeredUsers)) registeredUsers = []; }
function saveRegisteredUsers() { try { localStorage.setItem('afripay_registered_users', JSON.stringify(registeredUsers)); } catch (e) { try { const light = registeredUsers.map(function(u) { if (u && u.avatarDataURL && String(u.avatarDataURL).length > 200000) { const c = Object.assign({}, u); delete c.avatarDataURL; return c; } return u; }); localStorage.setItem('afripay_registered_users', JSON.stringify(light)); } catch (e2) {} } try { syncConnectedUsersFromRegistered(); } catch (e) {} }

function syncConnectedUsersFromRegistered() {
    const curr = connectedUsers.find(function(u) { return u.id === 'current'; });
    connectedUsers = curr ? [curr] : [];
    registeredUsers.forEach(function(u) {
        const isAgentRec = (u.isAgent === true || u.role === 'agent' || u.businessName);
        if (isAgentRec) {
            if (!connectedUsers.find(function(c) { return c.id === u.id; })) {
                connectedUsers.push({ id: u.id || ('agent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)), name: u.businessName || u.name || '', phone: u.mobileMoney || u.phone || '', emoji: u.emoji || '🏢', status: 'online', isAgent: true, role: 'agent', agentData: u });
            }
        }
    });
}

function getAgents() {
    try { syncConnectedUsersFromRegistered(); } catch (e) {}
    return connectedUsers.filter(function(u) {
        if (!(u.isAgent === true || u.role === 'agent')) return false;
        const d = u.agentData || u;
        if (d.approved === false) return false;
        return true;
    });
}

function getAdminApprovedAgents() { return getAgents().filter(function(a) { const d = a.agentData || a; if (d.approved !== true) return false; return !!(d.approvedBy || d.approvedAt) || d.approvedBy === 'system-seed'; }); }
function getAgentInitials(agent) { const d = agent.agentData || agent; let n = d.businessName || agent.name || ''; n = n.replace(/\(.*\)/, '').trim(); return n.substring(0, 2).toUpperCase() || 'AG'; }
function getAgentFlag(agent) { const c = (agent.agentData || agent).countryCode || ''; return COUNTRY_CODE_TO_FLAG[c] || '🌍'; }
function getAgentCountryName(agent) { const c = (agent.agentData || agent).countryCode || ''; return COUNTRY_CODE_TO_NAME[c] || ''; }
function getCityValue(sid, oid) { const s = getEl(sid), o = getEl(oid); if (s && s.value && s.value !== '') return s.value; if (o && o.value && o.value.trim()) return o.value.trim(); if (s && s.value) return s.value; return ''; }
function setCityValue(sid, oid, value) { const s = getEl(sid), o = getEl(oid); if (!s || !o) return; let found = false; for (let i = 0; i < s.options.length; i++) { if (s.options[i].value === value) { s.value = value; found = true; break; } } if (!found && value) { s.value = ''; o.value = value; } else { o.value = ''; } }
function updateAgentDropdownPlaceholder() { const b = getEl('selectedAgentName'); if (!b || isBusinessMode) return; if (currentAgentFilterCountry && !selectedAgentId) { const flag = COUNTRY_NAME_TO_CODE[currentAgentFilterCountry] ? COUNTRY_CODE_TO_FLAG[COUNTRY_NAME_TO_CODE[currentAgentFilterCountry]] : '🌍'; b.innerHTML = 'Select Agent in ' + flag + ' ' + currentAgentFilterCountry; } else if (!selectedAgentId) b.textContent = 'Select Agent'; }
function getCountryNameFromSelect() { const s = getEl('countryCodeSelect'); if (!s || !s.value) return null; return s.value.split('|')[1] || null; }
function getAgentsByCountry(cn) { if (!cn) return getAgents(); return getAgents().filter(function(a) { return getAgentCountryName(a).toLowerCase() === cn.toLowerCase(); }); }

function renderAgentDropdown(filterCountry) {
    const list = getEl('agentDropdownList'); if (!list) return;
    if (isBusinessMode) { list.innerHTML = ''; list.classList.remove('open'); return; }
    try { syncConnectedUsersFromRegistered(); } catch (e) {}
    if (filterCountry === undefined) filterCountry = currentAgentFilterCountry; else currentAgentFilterCountry = filterCountry;
    let agents = (filterCountry ? getAgentsByCountry(filterCountry) : getAgents()).sort(function(a, b) { const aN = (a.agentData && a.agentData.businessName) || a.name; const bN = (b.agentData && b.agentData.businessName) || b.name; return aN.localeCompare(bN); });
    list.innerHTML = '';
    const selItem = document.createElement('div'); selItem.className = 'agent-dropdown-item'; selItem.style.fontWeight = '600';
    selItem.innerHTML = '<div class="agent-info"><span style="color:#FFD966;">👤</span> <span class="agent-name">Select Agent</span></div>';
    selItem.addEventListener('click', function(e) { e.stopPropagation(); selectedAgentId = null; _selectedAgentId = null; clearAgentSelection(); list.classList.remove('open'); });
    list.appendChild(selItem);
    if (agents.length === 0) { const em = document.createElement('div'); em.className = 'agent-dropdown-item'; em.style.justifyContent = 'center'; em.innerHTML = '<span style="color:#ccc;">No agents</span>'; list.appendChild(em); return; }
    agents.forEach(function(agent) {
        const item = document.createElement('div'); item.className = 'agent-dropdown-item';
        const data = agent.agentData || agent;
        const displayName = (data.businessName || agent.name || '').replace(/\(.*\)/, '').trim();
        item.innerHTML = '<div class="agent-info"><span class="agent-flag">' + getAgentFlag(agent) + '</span><span class="agent-name">' + escapeHTML(displayName) + '</span><span class="agent-logo-fallback">' + getAgentInitials(agent) + '</span></div>';
        item.querySelector('.agent-name').addEventListener('click', function(e) { e.stopPropagation(); selectAgent(agent.id); list.classList.remove('open'); });
        item.querySelector('.agent-logo-fallback').addEventListener('click', function(e) { e.stopPropagation(); list.classList.remove('open'); promptAgentCredentials(agent.id); });
        list.appendChild(item);
    });
    updateAgentDropdownPlaceholder();
}

function populateAgentSelect(filterCountry) {
    const select = getEl('agentNameSelect'); if (!select) return;
    if (isBusinessMode) { select.style.display = 'none'; return; }
    try { syncConnectedUsersFromRegistered(); } catch (e) {}
    select.style.display = 'block'; select.innerHTML = '';
    let agents = (filterCountry ? getAgentsByCountry(filterCountry) : getAgents()).sort(function(a, b) { const aN = (a.agentData && a.agentData.businessName) || a.name; const bN = (b.agentData && b.agentData.businessName) || b.name; return aN.localeCompare(bN); });
    const ph = document.createElement('option'); ph.value = ''; ph.textContent = filterCountry ? 'Agent in ' + filterCountry : '-- Select Agent --'; ph.disabled = true; ph.selected = true; select.appendChild(ph);
    agents.forEach(function(agent) { const opt = document.createElement('option'); opt.value = agent.id; const data = agent.agentData || agent; opt.textContent = getAgentFlag(agent) + ' ' + (data.businessName || agent.name || '').replace(/\(.*\)/, '').trim(); select.appendChild(opt); });
    if (selectedAgentId) select.value = selectedAgentId;
}
function clearAgentSelection() { ['agentName','agentPhone'].forEach(function(id) { const e = getEl(id); if (e) e.value = ''; }); const amt = getEl('amountInput'); if (amt) { amt.removeAttribute('max'); amt.placeholder = 'Amount'; } const li = getEl('amountLimitIndicator'); if (li) li.style.display = 'none'; const s = getEl('agentNameSelect'); if (s) s.value = ''; exitBusinessMode(); }
function exitBusinessMode() { isBusinessMode = false; const sel = getEl('agentNameSelect'), lbl = getEl('agentNameLabel'), bd = getEl('bizDisplayField'); if (sel) sel.style.display = 'block'; if (bd) bd.style.display = 'none'; if (lbl) lbl.textContent = 'Agent *'; populateAgentSelect(currentAgentFilterCountry); }
function selectAgent(agentId) {
    if (isBusinessMode) exitBusinessMode();
    const agent = getAgents().find(function(a) { return a.id === agentId; });
    if (!agent) { selectedAgentId = null; _selectedAgentId = null; clearAgentSelection(); return; }
    _selectedAgentId = agentId; selectedAgentId = agentId;
    const data = agent.agentData || agent;
    const displayName = (data.businessName || agent.name || '').replace(/\(.*\)/, '').trim();
    const btn = getEl('selectedAgentName');
    if (btn) btn.innerHTML = '<span class="agent-flag">' + getAgentFlag(agent) + '</span><span class="agent-name-text">' + escapeHTML(displayName) + '</span><span class="agent-initials-inline">' + getAgentInitials(agent) + '</span>';
    if (getEl('agentName')) getEl('agentName').value = displayName;
    let phoneDisplay = agent.phone || '';
    if (data.countryCode && phoneDisplay && phoneDisplay.indexOf(data.countryCode) !== 0) phoneDisplay = data.countryCode + ' ' + phoneDisplay;
    if (getEl('agentPhone')) getEl('agentPhone').value = phoneDisplay;
    const s = getEl('agentNameSelect'); if (s) s.value = agentId;
    const limit = data.collateralLimit || 0;
    const ai = getEl('amountInput'); const li = getEl('amountLimitIndicator');
    if (limit > 0 && ai) { ai.max = limit; ai.placeholder = 'Max ' + limit; if (li) { li.style.display = 'inline-block'; li.textContent = 'Max: ' + limit; } }
    else if (ai) { ai.removeAttribute('max'); ai.placeholder = 'Amount'; if (li) li.style.display = 'none'; }
    computeCharges();
}
function computeCharges() {
    const raw = parseFloat(getEl('amountInput') && getEl('amountInput').value) || 0;
    const carrear = raw * FEE_CARREAR; const local = raw * FEE_LOCAL; const services = raw * FEE_SERVICES;
    const chargeTotal = raw * FEE_TOTAL;
    const gst = isLocalMode ? 0 : chargeTotal * (currentCountryData.gstRate / 100);
    const total = raw + chargeTotal + gst;
    if (getEl('displayAmount')) getEl('displayAmount').innerText = raw.toFixed(2);
    if (getEl('chargeAmount')) getEl('chargeAmount').innerText = chargeTotal.toFixed(2);
    if (getEl('gstAmount')) getEl('gstAmount').innerText = gst.toFixed(2);
    if (getEl('totalAmount')) getEl('totalAmount').innerText = total.toFixed(2);
    if (getEl('currencySymbol')) getEl('currencySymbol').innerText = isLocalMode ? getUserCurrency() : currentCountryData.currency;
    if (getEl('cbsCarrear')) getEl('cbsCarrear').innerText = carrear.toFixed(2);
    if (getEl('cbsLocal')) getEl('cbsLocal').innerText = local.toFixed(2);
    if (getEl('cbsServices')) getEl('cbsServices').innerText = services.toFixed(2);
    if (getEl('cbsTotal')) getEl('cbsTotal').innerText = chargeTotal.toFixed(2);
    const cbs = getEl('chargeBreakdownSection');
    if (cbs) { if (raw > 0) cbs.classList.add('show'); else cbs.classList.remove('show'); }
    updateInlineConversion();
}
function updateInlineConversion() { const from = getEl('inlineConvFrom'), to = getEl('inlineConvTo'), amtEl = getEl('inlineConvAmount'), resEl = getEl('inlineConvResult'); if (!from || !to || !amtEl || !resEl) return; const amt = parseFloat(amtEl.value) || 0; const fromCur = from.value, toCur = to.value; const fromRate = FX_TO_USD[fromCur] || 1; const toRate = FX_TO_USD[toCur] || 1; const result = amt * fromRate / toRate; resEl.value = result.toFixed(2) + ' ' + toCur; }

function saveUserToStorage(u) { if (!u) return; try { localStorage.setItem('afripay_user', JSON.stringify(u)); } catch (e) { try { const light = Object.assign({}, u); delete light.avatarDataURL; localStorage.setItem('afripay_user', JSON.stringify(light)); } catch (e2) {} } }
function clearUserStorage() { try { localStorage.removeItem('afripay_user'); } catch (e) {} currentUser = null; showLoggedOutUI(); }
function loadStoredUser() { const stored = localStorage.getItem('afripay_user'); if (stored) { try { const u = JSON.parse(stored); if (u && u.name && u.phone) { currentUser = u; if (!currentUser.emoji) currentUser.emoji = '👤'; showLoggedInUI(); return true; } } catch (e) {} } showLoggedOutUI(); return false; }

/* ============================================================ */
/* FIXED: showLoggedInUI — each step wrapped so a failure in    */
/* one sub-step doesn't abort the whole flow                    */
/* ============================================================ */
function showLoggedInUI() {
    try { if (getEl('authButtons')) getEl('authButtons').style.display = 'none'; } catch(e) {}
    try { if (getEl('welcomeSection')) getEl('welcomeSection').style.display = 'flex'; } catch(e) {}
    try { if (getEl('loggedUserName')) getEl('loggedUserName').innerText = (currentUser && currentUser.name) || 'User'; } catch(e) {}
    try { updateAvatarDisplay(currentUser); } catch(e) {}
    try { updateProfileAvatarDisplay(currentUser); } catch(e) {}
    try { if (getEl('mainFormContainer')) getEl('mainFormContainer').style.display = 'block'; } catch(e) {}
    try { if (getEl('profileAddress')) getEl('profileAddress').innerText = (currentUser && currentUser.address) || '—'; } catch(e) {}
    try { if (getEl('profileCity')) getEl('profileCity').innerText = (currentUser && currentUser.city) || '—'; } catch(e) {}
    try { if (getEl('profileCountry')) getEl('profileCountry').innerText = (currentUser && currentUser.country) || '—'; } catch(e) {}
    try {
        if (currentUser) {
            if (getEl('senderName')) getEl('senderName').value = currentUser.name || '';
            if (getEl('senderPhone')) getEl('senderPhone').value = currentUser.phone || '';
            if (getEl('senderAddress')) getEl('senderAddress').value = currentUser.address || '';
            populateCapitalCityDropdown('senderCitySelect');
            setCityValue('senderCitySelect', 'senderCityOther', currentUser.city || '');
        }
    } catch(e) {}
    try { updateUserCountryData(); } catch(e) {}
    try { if (getEl('currencySymbol')) getEl('currencySymbol').innerText = isLocalMode ? getUserCurrency() : currentCountryData.currency; } catch(e) {}
    try { if (getEl('gstRateLabel')) getEl('gstRateLabel').innerText = currentCountryData.gstRate; } catch(e) {}
    try { populateInlineConverter(); } catch(e) {}
    try { renderBusinessStrip(); } catch(e) {}
    try { updateAgentDropdownForCountry(); } catch(e) {}
    try { computeCharges(); } catch(e) {}
    try { translatePage(); } catch(e) {}
}
function showLoggedOutUI() { try { if (getEl('authButtons')) getEl('authButtons').style.display = 'flex'; } catch(e) {} try { if (getEl('welcomeSection')) getEl('welcomeSection').style.display = 'none'; } catch(e) {} try { if (getEl('mainFormContainer')) getEl('mainFormContainer').style.display = 'none'; } catch(e) {} connectedUsers = connectedUsers.filter(function(u) { return u.id !== 'current'; }); try { renderAgentDropdown(null); } catch(e) {} }
function updateAvatarDisplay(user) { const em = getEl('userAvatarEmoji'), img = getEl('userAvatarImg'); if (!em || !img) return; if (user && user.avatarDataURL) { em.style.display = 'none'; img.style.display = 'block'; img.src = user.avatarDataURL; } else if (user && user.emoji) { em.style.display = 'inline'; img.style.display = 'none'; em.innerText = user.emoji; } else { em.style.display = 'inline'; img.style.display = 'none'; em.innerText = '👤'; } }
function updateProfileAvatarDisplay(user) { const em = getEl('profileAvatarEmoji'), img = getEl('profileAvatarImg'); if (!em || !img) return; if (user && user.avatarDataURL) { em.style.display = 'none'; img.style.display = 'block'; img.src = user.avatarDataURL; } else if (user && user.emoji) { em.style.display = 'inline'; img.style.display = 'none'; em.innerText = user.emoji; } else { em.style.display = 'inline'; img.style.display = 'none'; em.innerText = '👤'; } }

function loginUser(fullName, phoneNumber) {
    const name = fullName.trim(), phone = phoneNumber.trim();
    if (!name || !phone) { if (getEl('loginError')) getEl('loginError').innerHTML = '❌ Enter both fields'; return false; }
    let storedUser = null; try { const s = localStorage.getItem('afripay_user'); if (s) storedUser = JSON.parse(s); } catch (e) {}
    if (storedUser && storedUser.name.toLowerCase() === name.toLowerCase() && storedUser.phone === phone) { currentUser = storedUser; if (!currentUser.emoji) currentUser.emoji = '👤'; saveUserToStorage(storedUser); showToast('✅ Welcome ' + storedUser.name + '!', 1800); showLoggedInUI(); renderAgentDropdown(currentAgentFilterCountry); if (getEl('loginError')) getEl('loginError').innerHTML = ''; return true; }
    loadRegisteredUsers();
    const user = registeredUsers.find(function(u) { return u.name && u.name.toLowerCase() === name.toLowerCase() && u.phone === phone; });
    if (user) { currentUser = { name:user.name, phone:user.phone, address:user.address || '', city:user.city || '', country:user.country || '', emoji:user.emoji || '👤', avatarDataURL: user.avatarDataURL || null }; saveUserToStorage(currentUser); showToast('✅ Welcome ' + currentUser.name + '!', 1800); showLoggedInUI(); renderAgentDropdown(currentAgentFilterCountry); populateAgentSelect(currentAgentFilterCountry); if (getEl('loginError')) getEl('loginError').innerHTML = ''; return true; }
    if (getEl('loginError')) getEl('loginError').innerHTML = '❌ Account not found.'; return false;
}
function loadCustomBusinesses() { try { customBusinesses = JSON.parse(localStorage.getItem('afripay_custom_businesses') || '[]'); } catch (e) { customBusinesses = []; } if (!Array.isArray(customBusinesses)) customBusinesses = []; }
function saveCustomBusinesses() { try { localStorage.setItem('afripay_custom_businesses', JSON.stringify(customBusinesses)); } catch (e) {} }
function getAllBusinesses() { return businesses.concat(customBusinesses); }
function renderBusinessStrip() { const c = getEl('businessIconsContainer'); if (!c) return; c.innerHTML = ''; getAllBusinesses().forEach(function(biz) { const div = document.createElement('div'); div.className = 'business-item'; div.innerHTML = '<div class="business-icon-img">' + (biz.icon || '🏪') + '</div><div class="business-name">' + escapeHTML(biz.name) + '</div><div class="business-category">' + escapeHTML(biz.type) + '</div>'; div.addEventListener('click', function() { lastSelectedBusinessId = biz.id; try { showGoodsModal(biz.id); } catch (e) {} }); c.appendChild(div); }); }
function showGoodsModal(businessId) {
    const biz = getAllBusinesses().find(function(b) { return b.id === businessId; }); if (!biz) return;
    lastSelectedBusinessId = businessId; const displayCur = isLocalMode ? getUserCurrency() : currentCountryData.currency;
    let html = '';
    if (biz.goods && biz.goods.length > 0) html = biz.goods.map(function(g) { const price = parseFloat(g.price) || 0; return '<div class="goods-item" data-price="' + price + '" data-name="' + escapeHTML(g.name) + '" data-quantity="' + (g.quantity || 1) + '" data-business="' + escapeHTML(biz.name) + '" data-businessphone="' + escapeHTML(biz.mobileMoney || biz.contact || '') + '"><div class="goods-row"><span class="goods-name">📦 ' + escapeHTML(g.name) + '</span><span class="goods-price">' + price.toFixed(2) + ' ' + displayCur + '</span><button class="goods-select-btn">Select</button></div></div>'; }).join('');
    else html = '<div style="text-align:center;padding:12px;color:#95a5a6;">No items yet.</div>';
    getEl('goodsModalTitle').innerHTML = (biz.icon || '🏪') + ' ' + escapeHTML(biz.name);
    getEl('goodsList').innerHTML = html;
    const wl = getEl('businessWebsiteLink'); wl.href = biz.website || '#'; wl.style.display = biz.website ? 'block' : 'none';
    getEl('goodsModal').style.display = 'flex';
    document.querySelectorAll('#goodsList .goods-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const price = parseFloat(this.getAttribute('data-price') || 0);
            const name = this.getAttribute('data-name') || 'Product';
            const bName = this.getAttribute('data-business') || 'Business';
            const bPhone = this.getAttribute('data-businessphone') || '';
            if (getEl('agentName')) getEl('agentName').value = bName;
            if (getEl('agentPhone')) getEl('agentPhone').value = bPhone;
            if (getEl('amountInput')) { getEl('amountInput').value = price; getEl('amountInput').dispatchEvent(new Event('input')); }
            const aSel = getEl('agentNameSelect'); const aLbl = getEl('agentNameLabel');
            if (aSel) { isBusinessMode = true; aSel.style.display = 'none'; let bd = getEl('bizDisplayField'); if (!bd) { bd = document.createElement('div'); bd.id = 'bizDisplayField'; bd.className = 'biz-display-field'; aSel.parentNode.insertBefore(bd, aSel.nextSibling); } bd.textContent = bName; bd.style.display = 'flex'; if (aLbl) aLbl.textContent = '🏢 Business'; }
            selectedAgentId = null; _selectedAgentId = null;
            showToast('✅ ' + name, 2000); getEl('goodsModal').style.display = 'none';
        });
    });
}
function generateTransactionId() { const p1 = Math.floor(1000000 + Math.random() * 9000000); const p2 = Math.floor(10000 + Math.random() * 90000); const L = String.fromCharCode(65 + Math.floor(Math.random() * 26)); const p3 = Math.floor(1000000 + Math.random() * 9000000); return 'WB' + p1 + '.' + p2 + '.' + L + p3; }
function setGeneratedTransactionId() { const f = getEl('transactionId'); if (f) f.value = generateTransactionId(); }
function copyTransactionIdToClipboard() { const v = getEl('transactionId') && getEl('transactionId').value; if (v) navigator.clipboard.writeText(v).then(function() { showToast('✅ Copied!', 1800); }).catch(function() { showToast('✅ Copied!', 1800); }); else showToast('⚠️ No ID', 1500); }
function ensureTransactionId() { const f = getEl('transactionId'); if (f && !f.value.trim()) f.value = generateTransactionId(); }
function showInfoModal(title, body) { getEl('modalTitle').innerText = title; getEl('modalBody').innerHTML = body; getEl('infoModal').style.display = 'flex'; }

function openWhatsApp(phone, name) { if (!phone) { showToast('⚠️ No phone number available.', 2200); return; } const clean = String(phone).replace(/\D/g, ''); if (!clean) { showToast('⚠️ Invalid phone number.', 2200); return; } const greeting = 'Hello ' + (name || '') + ', I am reaching out from AfriPay regarding a transaction.'; window.open('https://wa.me/' + clean + '?text=' + encodeURIComponent(greeting), '_blank'); }
function openSMS(phone, name) { if (!phone) { showToast('⚠️ No phone number available.', 2200); return; } const clean = String(phone).replace(/\s+/g, ''); if (!clean) { showToast('⚠️ Invalid phone number.', 2200); return; } const body = 'Hello ' + (name || '') + ', I am reaching out from AfriPay regarding a transaction.'; const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent); const sep = isMobile && /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?'; window.location.href = 'sms:' + clean + sep + 'body=' + encodeURIComponent(body); }

function showReceiptModal(data) {
    const body = getEl('receiptBody'); if (!body) return;
    const lines = [{ key: 'TX ID', value: data.txId }, { key: 'Date', value: data.date }, { key: 'Type', value: data.mode }, { key: 'Sender', value: data.sender }, { key: 'Agent', value: data.agent }];
    if (data.localAgentName) lines.push({ key: 'Local Agent', value: data.localAgentName + (data.localAgentPhone ? ' (' + data.localAgentPhone + ')' : '') });
    lines.push({ key: 'Provider TX ID', value: data.providerTxId || 'N/A' });
    lines.push({ key: 'Transfer Code', value: data.transferCode || 'N/A' });
    if (data.orderedProduct) { const op = data.orderedProduct; lines.push({ key: '— Product Order —', value: '' }); lines.push({ key: (op.productIcon || '📦') + ' Product', value: op.productName }); if (op.businessName) lines.push({ key: '🏢 Business', value: op.businessName }); if (op.quality) lines.push({ key: '⭐ Quality', value: op.quality }); if (op.quantity) lines.push({ key: '📦 Quantity', value: String(op.quantity) }); if (op.delivery) lines.push({ key: '🚚 Delivery', value: op.delivery }); }
    lines.push({ key: 'Base Amount', value: data.currency + ' ' + data.baseAmount });
    lines.push({ key: '— Fee Breakdown (5%) —', value: '' });
    lines.push({ key: 'Carrear Charges (3%)', value: data.currency + ' ' + (data.carrear || '0.00') });
    lines.push({ key: 'Local Transfer (1%)', value: data.currency + ' ' + (data.localFee || '0.00') });
    lines.push({ key: 'Services (1%)', value: data.currency + ' ' + (data.servicesFee || '0.00') });
    lines.push({ key: 'Total Charges', value: data.currency + ' ' + data.charge });
    lines.push({ key: 'Grand Total', value: data.currency + ' ' + data.total, total: true });
    let html = '';
    lines.forEach(function(l) {
        if (l.value === '') { html += '<div style="padding:6px 0 2px;color:#f4a261;font-weight:800;font-size:.78rem;border-bottom:1px solid #f0f0f0;text-transform:uppercase;letter-spacing:.3px;">' + l.key + '</div>'; return; }
        let style = 'display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #f0f0f0;font-size:.82rem;';
        if (l.total) style += 'font-weight:800;border-top:2px solid #1c4e6c;border-bottom:none;padding-top:8px;font-size:.95rem;';
        html += '<div style="' + style + '"><span style="color:#7f8c8d;">' + l.key + '</span><span style="color:#1e3b4a;font-weight:600;text-align:right;max-width:60%;word-break:break-word;">' + escapeHTML(l.value) + '</span></div>';
    });
    body.innerHTML = html;
    const socialEl = getEl('receiptSocialButtons');
    if (socialEl) {
        let socialHtml = '';
        if (data.localAgentPhone) socialHtml += '<button type="button" class="action-btn whatsapp" id="receiptLocalAgentWhatsAppBtn" style="flex:1;min-width:100px;height:36px;font-size:.78rem;">💬 Local Agent WhatsApp</button>';
        if (data.agentPhoneRaw) { socialHtml += '<button type="button" class="action-btn whatsapp" id="receiptAgentWhatsAppBtn" style="flex:1;min-width:90px;height:36px;font-size:.78rem;">💬 Agent WhatsApp</button>'; socialHtml += '<button type="button" class="action-btn sms" id="receiptAgentSmsBtn" style="flex:1;min-width:70px;height:36px;font-size:.78rem;">✉️ Agent SMS</button>'; }
        if (data.clientPhoneRaw) { socialHtml += '<button type="button" class="action-btn whatsapp" id="receiptClientWhatsAppBtn" style="flex:1;min-width:90px;height:36px;font-size:.78rem;">💬 Client WhatsApp</button>'; socialHtml += '<button type="button" class="action-btn sms" id="receiptClientSmsBtn" style="flex:1;min-width:70px;height:36px;font-size:.78rem;">✉️ Client SMS</button>'; }
        if (socialHtml) {
            socialEl.innerHTML = '<div style="font-size:.72rem;color:#7f8c8d;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px;">📱 Quick Contact</div><div class="receipt-social-row">' + socialHtml + '</div>';
            if (data.localAgentPhone) { const laBtn = getEl('receiptLocalAgentWhatsAppBtn'); if (laBtn) laBtn.addEventListener('click', function() { openWhatsApp(data.localAgentPhone, data.localAgentName); }); }
            if (data.agentPhoneRaw) { const aWpBtn = getEl('receiptAgentWhatsAppBtn'); if (aWpBtn) aWpBtn.addEventListener('click', function() { openWhatsApp(data.agentPhoneRaw, data.agentName); }); const aSmsBtn = getEl('receiptAgentSmsBtn'); if (aSmsBtn) aSmsBtn.addEventListener('click', function() { openSMS(data.agentPhoneRaw, data.agentName); }); }
            if (data.clientPhoneRaw) { const cWpBtn = getEl('receiptClientWhatsAppBtn'); if (cWpBtn) cWpBtn.addEventListener('click', function() { openWhatsApp(data.clientPhoneRaw, data.clientName); }); const cSmsBtn = getEl('receiptClientSmsBtn'); if (cSmsBtn) cSmsBtn.addEventListener('click', function() { openSMS(data.clientPhoneRaw, data.clientName); }); }
        } else { socialEl.innerHTML = ''; }
    }
    if (getEl('receiptModal')) getEl('receiptModal').style.display = 'flex';
}
function toggleChat() { const w = getEl('chatWindow'); if (!w) return; const open = w.classList.toggle('open'); const t = getEl('chatToggleBtn'); if (t) t.style.display = open ? 'none' : 'flex'; }
function openEmojiPicker() { const grid = getEl('emojiGrid'); if (!grid) return; grid.innerHTML = ''; AVAILABLE_EMOJIS.forEach(function(e) { const s = document.createElement('span'); s.className = 'emoji-option'; s.textContent = e; s.addEventListener('click', function() { applyEmoji(e); }); grid.appendChild(s); }); getEl('emojiPickerModal').style.display = 'flex'; }
function applyEmoji(e) { if (currentUser) { currentUser.emoji = e; currentUser.avatarDataURL = null; saveUserToStorage(currentUser); updateAvatarDisplay(currentUser); updateProfileAvatarDisplay(currentUser); } showToast('✅ Avatar: ' + e, 1500); setTimeout(function() { getEl('emojiPickerModal').style.display = 'none'; }, 400); }
function applyAvatarImage(dataURL) { if (currentUser) { currentUser.avatarDataURL = dataURL; saveUserToStorage(currentUser); updateAvatarDisplay(currentUser); updateProfileAvatarDisplay(currentUser); } showToast('✅ Image updated!', 1800); getEl('emojiPickerModal').style.display = 'none'; }
function removeAvatarImage() { if (currentUser) { currentUser.avatarDataURL = null; if (!currentUser.emoji) currentUser.emoji = '👤'; saveUserToStorage(currentUser); updateAvatarDisplay(currentUser); updateProfileAvatarDisplay(currentUser); } showToast('🗑️ Image removed', 1500); }
function renderHeaderFlags() { const grid = getEl('headerFlagGrid'); if (!grid) return; grid.innerHTML = ''; SUPPORTED_COUNTRY_FLAGS.forEach(function(f) { const s = document.createElement('span'); s.className = 'flag-icon'; s.textContent = f; s.addEventListener('click', function() { let sel = getEl('countryCodeSelect'); if (!sel) { sel = document.createElement('select'); sel.id = 'countryCodeSelect'; sel.style.display = 'none'; document.body.appendChild(sel); populateCountryCodeSelect(); } if (!sel.options || sel.options.length === 0) populateCountryCodeSelect(); for (let i = 0; i < sel.options.length; i++) { if (sel.options[i].text.startsWith(f)) { sel.selectedIndex = i; const parts = sel.value.split('|'); currentCountryData = { gstRate: parseFloat(parts[4]) || 10, currency: parts[2] || 'USD', flag: parts[3] || '🌍', countryName: parts[1] || '' }; isLocalMode = false; const intlBtn = getEl('intlToggleBtn'); if (intlBtn) intlBtn.classList.add('active'); const cw = getEl('countryWrapper'); if (cw) cw.style.display = 'block'; if (getEl('gstRateLabel')) getEl('gstRateLabel').innerText = currentCountryData.gstRate; if (getEl('currencySymbol')) getEl('currencySymbol').innerText = currentCountryData.currency; if (getEl('flagEmoji')) getEl('flagEmoji').innerText = currentCountryData.flag; computeCharges(); updateAgentDropdownForCountry(); showToast('📍 ' + currentCountryData.countryName, 1500); break; } } }); grid.appendChild(s); }); }
function handleCountrySelectChange(selectEl) { const parts = (selectEl.value || '').split('|'); if (!parts || !parts[2]) return; currentCountryData = { gstRate: parseFloat(parts[4]) || 10, currency: parts[2], flag: parts[3] || '🌍', countryName: parts[1] || '' }; if (getEl('flagEmoji')) getEl('flagEmoji').innerText = currentCountryData.flag; if (getEl('gstRateLabel')) getEl('gstRateLabel').innerText = currentCountryData.gstRate; if (getEl('currencySymbol')) getEl('currencySymbol').innerText = currentCountryData.currency; computeCharges(); updateAgentDropdownForCountry(); showToast('📍 ' + currentCountryData.countryName, 1500); }
function updateAgentDropdownForCountry() { const cw = getEl('countryWrapper'); if (!cw || cw.style.display === 'none' || isLocalMode) { currentAgentFilterCountry = null; renderAgentDropdown(null); populateAgentSelect(null); return; } const cn = getCountryNameFromSelect(); currentAgentFilterCountry = cn; renderAgentDropdown(cn); populateAgentSelect(cn); }

function initializePermanentAgents() {
    try {
        const seedData = [
            { biz:'NUSWEB Biz', owner:'Mohamed Amine Jalloh', addr:'123 Tech Hub, Freetown', city:'Freetown', reg:'NW-2025-001', mobile:'73671566', cc:'+232', pw:'NUSWEB1', pin:'12345', collat:10000, curr:'SLL', pTx:'NW123456.1234.X12345', tCode:'12345678', nin:'SL-123456789' },
            { biz:'DAD Asso du Fouta', owner:'Amine Juldeh Jalloh', addr:'Marche Parawol', city:'Conakry', reg:'DA543256D', mobile:'624592014', cc:'+224', pw:'PJL6JY', pin:'22656', collat:7000, curr:'GNF', pTx:'MP266546.7657.N87906', tCode:'87906543', nin:'GN-987654321' },
            { biz:'RJ-Adventures', owner:'Rahmatullah Jallow', addr:'Bakau', city:'Banjul', reg:'RJ2526323A', mobile:'7897893', cc:'+220', pw:'P8K628', pin:'78063', collat:500, curr:'GMD', pTx:'MP266452.2532.M26542', tCode:'02345698', nin:'PC309248' },
            { biz:'TW-SENEGAL GUINEE', owner:'TW Rep', addr:'Dakar', city:'Dakar', reg:'TW-2025-001', mobile:'772605278', cc:'+221', pw:'TW$en1', pin:'12345', collat:2000, curr:'XOF', pTx:'TW123456.1234.X12345', tCode:'12345678', nin:'SN-123456789' },
            { biz:'IBS-Burkina', owner:'Ibrahim Simpore', addr:'Ouagadougou', city:'Ouagadougou', reg:'IB2563245S', mobile:'66960317', cc:'+226', pw:'8PESWF', pin:'87411', collat:200, curr:'XOF', pTx:'MP260662.2354.A25632', tCode:'036214', nin:'A3335688' }
        ];
        seedData.forEach(function(s) {
            const existing = registeredUsers.find(function(u) { return u.businessName === s.biz; });
            if (existing) { if (existing.approved !== true) existing.approved = true; if (!existing.approvedBy) existing.approvedBy = 'system-seed'; if (!existing.approvedAt) existing.approvedAt = new Date().toISOString(); if (existing.role !== 'agent') existing.role = 'agent'; if (existing.isAgent !== true) existing.isAgent = true; }
            else registeredUsers.push({ id: 'agent_' + s.biz.replace(/\W/g, '').toLowerCase(), name: s.biz, businessName: s.biz, ownerName: s.owner, businessAddress: s.addr, city: s.city, regNumber: s.reg, businessType: 'Service', idType: 'Business Registration', idNumber: s.reg, mobileMoney: s.mobile, countryCode: s.cc, password: s.pw, pin: s.pin, collateralAmount: s.collat, collateralLimit: s.collat, currency: s.curr, approved: true, approvedBy: 'system-seed', approvedAt: new Date().toISOString(), role: 'agent', isAgent: true, registeredAt: new Date().toISOString(), providerTxId: s.pTx, transferCode: s.tCode, nin: s.nin });
        });
        saveRegisteredUsers();
    } catch (e) { console.error('seed agents error:', e); }
}
function promptAgentCredentials(agentId) { const agent = getAgents().find(function(a) { return a.id === agentId; }); if (!agent) { showToast('⚠️ Agent not found.', 2200); return; } const data = agent.agentData || agent; pendingAgentAuthId = agentId; if (getEl('agentAuthFlag')) getEl('agentAuthFlag').textContent = getAgentFlag(agent); if (getEl('agentAuthName')) getEl('agentAuthName').textContent = (data.businessName || data.name || 'Agent').replace(/\(.*\)/, '').trim(); if (getEl('agentAuthInitials')) getEl('agentAuthInitials').textContent = getAgentInitials(agent); if (getEl('agentAuthPassword')) getEl('agentAuthPassword').value = ''; if (getEl('agentAuthPin')) getEl('agentAuthPin').value = ''; if (getEl('agentAuthError')) getEl('agentAuthError').textContent = ''; getEl('agentAuthModal').style.display = 'flex'; }
function confirmAgentAuth() {
    const err = getEl('agentAuthError');
    const pw = (getEl('agentAuthPassword') && getEl('agentAuthPassword').value.trim()) || '';
    const pin = (getEl('agentAuthPin') && getEl('agentAuthPin').value.trim()) || '';
    if (err) err.textContent = '';
    if (pw.length !== 6) { if (err) err.textContent = '❌ Password must be 6 chars.'; return; }
    if (!/^[0-9]{5}$/.test(pin)) { if (err) err.textContent = '❌ PIN must be 5 digits.'; return; }
    if (!pendingAgentAuthId) { if (err) err.textContent = '❌ No agent selected.'; return; }
    const agent = getAgents().find(function(a) { return a.id === pendingAgentAuthId; });
    if (!agent) { if (err) err.textContent = '❌ Agent not found.'; return; }
    const data = agent.agentData || agent;
    if (pw !== (data.password || '') || pin !== (data.pin || '')) { if (err) err.textContent = '❌ Incorrect credentials.'; return; }
    const id = pendingAgentAuthId; pendingAgentAuthId = null;
    getEl('agentAuthModal').style.display = 'none'; showToast('✅ Authenticated!', 1400);
    setTimeout(function() { openAgentDashboard(id); }, 250);
}

let dashCurrentAgentId = null;
let dashTab = 'profile';
let dashClients = [];
const PendingStore = {
    key: 'afripay_pending_items', items: [],
    load: function() { try { this.items = JSON.parse(localStorage.getItem(this.key) || '[]'); } catch (e) { this.items = []; } if (!Array.isArray(this.items)) this.items = []; },
    save: function() { try { localStorage.setItem(this.key, JSON.stringify(this.items)); } catch (e) {} },
    add: function(item) { item.id = 'pend_' + Date.now() + '_' + Math.floor(Math.random() * 10000); item.status = 'pending'; item.submittedAt = new Date().toISOString(); this.items.push(item); this.save(); supaBackground(Supa.savePendingItem(item), 'Pending'); return item; },
    get: function(id) { return this.items.find(function(i) { return i.id === id; }); },
    setStatus: function(id, status, byId) { const it = this.get(id); if (it) { it.status = status; it.reviewedAt = new Date().toISOString(); it.reviewedBy = byId || null; this.save(); supaBackground(Supa.updatePendingItemStatus(id, status, byId), 'Status'); } return it; },
    pendingFor: function(country) { return this.items.filter(function(i) { if (i.status !== 'pending') return false; if (!country || !i.country) return true; return String(i.country).toLowerCase() === String(country).toLowerCase(); }); }
};
function loadDashClients() { try { dashClients = JSON.parse(localStorage.getItem('afripay_agent_clients') || '[]'); } catch (e) { dashClients = []; } if (!Array.isArray(dashClients)) dashClients = []; }
function saveDashClients() { try { localStorage.setItem('afripay_agent_clients', JSON.stringify(dashClients)); } catch (e) {} }
function getDashAgent() { if (!dashCurrentAgentId) return null; const a = getAgents().find(function(x) { return x.id === dashCurrentAgentId; }); return a ? (a.agentData || a) : null; }
function getDashArea() { const d = getDashAgent(); if (!d) return ''; return COUNTRY_CODE_TO_NAME[d.countryCode] || d.city || ''; }
function openAgentDashboard(agentId) {
    const agent = getAgents().find(function(a) { return a.id === agentId; }); if (!agent) { showToast('Agent not found', 2000); return; }
    dashCurrentAgentId = agentId; const data = agent.agentData || agent;
    try { populateCapitalCityDropdown('editCitySelect'); } catch(e) {}
    try { populateCollateralDropdowns(); } catch(e) {}
    try { populateCountryDropdown('dcCountry'); } catch(e) {}
    try { populateCountryDropdown('dbCountry'); } catch(e) {}
    const setV = function(id, v) { const e = getEl(id); if (e) e.value = v || ''; };
    setV('editAgentId', agentId); setV('editBusinessName', data.businessName || ''); setV('editAddress', data.businessAddress || '');
    setCityValue('editCitySelect', 'editCityOther', data.city || '');
    setV('editMobileMoney', data.mobileMoney || agent.phone || ''); setV('editPassword', ''); setV('editPin', '');
    const logoPreview = getEl('editAgentLogoPreview'); const logoRemove = getEl('editAgentRemoveLogoBtn');
    if (logoPreview) { if (data.avatarDataURL) { logoPreview.src = data.avatarDataURL; logoPreview.style.display = 'block'; if (logoRemove) logoRemove.style.display = 'inline-flex'; } else { logoPreview.src = ''; logoPreview.style.display = 'none'; if (logoRemove) logoRemove.style.display = 'none'; } }
    if (getEl('agentDashTitle')) getEl('agentDashTitle').innerHTML = '🏢 ' + escapeHTML((data.businessName || 'Agent').replace(/\(.*\)/, '').trim());
    if (getEl('agentDashSubtitle')) getEl('agentDashSubtitle').innerHTML = getAgentFlag(agent) + ' ' + escapeHTML(getDashArea() || '—');
    switchDashTab('profile'); getEl('editAgentModal').style.display = 'flex';
}
function switchDashTab(tab) { dashTab = tab; document.querySelectorAll('#editAgentModal .dash-tab').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-dash-tab') === tab); }); document.querySelectorAll('#editAgentModal .dash-pane').forEach(function(p) { p.classList.toggle('active', p.id === 'dash-pane-' + tab); }); refreshDashPanes(); }
function refreshDashPanes() { const area = getDashArea(); const pend = PendingStore.pendingFor(area); const badge = getEl('dashPendingBadge'); if (badge) { badge.textContent = pend.length; badge.style.display = pend.length ? 'inline-block' : 'none'; } renderDashAgentsList(); renderDashClientsList(); renderDashBizList(); renderDashPendingList(); }
function renderDashAgentsList() { const c = getEl('dashAgentsList'); if (!c) return; const area = getDashArea(); let agents = getAgents(); if (area) agents = agents.filter(function(a) { return (getAgentCountryName(a) || '').toLowerCase() === area.toLowerCase(); }); if (!agents.length) { c.innerHTML = '<div class="dash-empty">No agents in this area yet.</div>'; return; } c.innerHTML = agents.map(function(a) { const d = a.agentData || a; const name = escapeHTML((d.businessName || a.name || '').replace(/\(.*\)/, '').trim()); return '<div class="dash-list-item"><div class="dli-head"><span>' + getAgentFlag(a) + ' ' + name + '</span></div><div class="dli-meta"><span>📱 ' + escapeHTML(d.mobileMoney || '—') + '</span><span>💳 ' + (d.collateralLimit || 0) + '</span></div></div>'; }).join(''); }
function renderDashClientsList() { const c = getEl('dashClientsList'); if (!c) return; const mine = dashClients.filter(function(x) { return x.agentId === dashCurrentAgentId; }); if (!mine.length) { c.innerHTML = '<div class="dash-empty">No clients added yet.</div>'; return; } c.innerHTML = mine.map(function(cl) { return '<div class="dash-list-item"><div class="dli-head"><span>👤 ' + escapeHTML(cl.name) + '</span></div><div class="dli-meta"><span>📱 ' + escapeHTML(cl.phone) + '</span></div></div>'; }).join(''); }
function renderDashBizList() { const c = getEl('dashBizList'); if (!c) return; const area = getDashArea(); let all = getAllBusinesses(); if (area) all = all.filter(function(b) { return !b.country || String(b.country).toLowerCase() === area.toLowerCase(); }); if (!all.length) { c.innerHTML = '<div class="dash-empty">No businesses yet.</div>'; return; } c.innerHTML = all.map(function(b) { return '<div class="dash-list-item"><div class="dli-head"><span>' + (b.icon || '🏪') + ' ' + escapeHTML(b.name) + '</span></div></div>'; }).join(''); }
function renderDashPendingList() { const c = getEl('dashPendingList'); if (!c) return; const area = getDashArea(); const pend = PendingStore.pendingFor(area); if (!pend.length) { c.innerHTML = '<div class="dash-empty">No pending approvals.</div>'; return; } c.innerHTML = pend.map(function(it) { const d = it.data || {}; return '<div class="dash-list-item"><div class="dli-head"><span>' + escapeHTML(d.businessName || d.name || 'Item') + '</span></div><div class="dash-actions"><button type="button" class="mini-btn approve" data-dash-approve="' + it.id + '">✅ Approve</button><button type="button" class="mini-btn reject" data-dash-reject="' + it.id + '">❌ Reject</button></div></div>'; }).join(''); }

function approvePendingItem(id) {
    const it = PendingStore.get(id);
    if (!it || it.status !== 'pending') return;

    if (it.type === 'agent') {
        const d = it.data;
        const rec = Object.assign({}, d, { id: d.id || ('agent_' + Date.now()), name: d.businessName, businessName: d.businessName, approved: true, approvedBy: dashCurrentAgentId || 'admin', approvedAt: new Date().toISOString(), role: 'agent', isAgent: true });
        if (!rec.countryCode) rec.countryCode = d.countryCode || '+232';
        if (!rec.mobileMoney) rec.mobileMoney = d.mobileMoney || '';
        if (!rec.emoji) rec.emoji = d.emoji || '🏢';
        const ex = registeredUsers.find(function(u) { return u.businessName === rec.businessName || u.id === rec.id; });
        if (ex) Object.assign(ex, rec); else registeredUsers.push(rec);
        saveRegisteredUsers();
        try { syncConnectedUsersFromRegistered(); } catch (e) {}
        supaBackground(Supa.saveAgent(rec), 'Approved agent');
        try {
            const newAgentCountry = COUNTRY_CODE_TO_NAME[rec.countryCode] || '';
            if (currentAgentFilterCountry && newAgentCountry && currentAgentFilterCountry.toLowerCase() !== newAgentCountry.toLowerCase()) {
                currentAgentFilterCountry = null;
                const cw = getEl('countryWrapper'); if (cw) cw.style.display = 'none';
                isLocalMode = true;
                const intlBtn = getEl('intlToggleBtn'); if (intlBtn) intlBtn.classList.remove('active');
            }
            renderAgentDropdown(currentAgentFilterCountry);
            populateAgentSelect(currentAgentFilterCountry);
            updateAgentDropdownPlaceholder();
            const list = getEl('agentDropdownList');
            if (list && list.classList.contains('open')) { setTimeout(function() { renderAgentDropdown(currentAgentFilterCountry); }, 50); }
        } catch (e) { console.warn('agent dropdown refresh:', e); }
        setTimeout(function() { try { syncConnectedUsersFromRegistered(); renderAgentDropdown(currentAgentFilterCountry); populateAgentSelect(currentAgentFilterCountry); } catch (e) {} }, 150);
    }
    else if (it.type === 'business') {
        const d = it.data;
        const bizObj = { id: d.id || ('biz_' + Date.now()), name: d.name, contact: d.contact || '', mobileMoney: d.mobileMoney || '', type: d.type || 'Other', icon: d.icon || '🏪', city: d.city || '', country: d.country || '', goods: d.goods || [] };
        const ex = getAllBusinesses().find(function(b) { return b.name === bizObj.name; });
        if (ex) Object.assign(ex, bizObj); else customBusinesses.push(bizObj);
        saveCustomBusinesses();
        renderBusinessStrip();
        supaBackground(Supa.saveBusiness(bizObj), 'Approved business');
    }

    PendingStore.setStatus(id, 'approved', dashCurrentAgentId);
    refreshDashPanes();
    showToast('✅ Approved', 2400);
    try { renderAgentDropdown(currentAgentFilterCountry); } catch (e) {}
    try { populateAgentSelect(currentAgentFilterCountry); } catch (e) {}
    try { updateAgentDropdownPlaceholder(); } catch (e) {}
    setTimeout(function() { supaRefreshAgents(); }, 400);
}
function rejectPendingItem(id) { PendingStore.setStatus(id, 'rejected', dashCurrentAgentId); refreshDashPanes(); showToast('❌ Rejected', 1800); }
function submitDashClient() { const name = (getEl('dcName').value || '').trim(); const phone = (getEl('dcPhone').value || '').trim(); const msg = getEl('dcMsg'); msg.style.color = '#c0392b'; if (!name || !phone) { msg.textContent = '❌ Name and phone required.'; return; } const newClient = { id: 'cl_' + Date.now(), agentId: dashCurrentAgentId, name: name, phone: phone, city: getEl('dcCity').value, country: getEl('dcCountry').value }; dashClients.push(newClient); saveDashClients(); supaBackground(Supa.saveAgentClient(newClient), 'Client'); msg.style.color = '#27ae60'; msg.textContent = '✅ Client saved.'; refreshDashPanes(); }
function submitDashBusiness() { const name = (getEl('dbName').value || '').trim(); const contact = (getEl('dbContact').value || '').trim(); const msg = getEl('dbMsg'); msg.style.color = '#c0392b'; if (!name || !contact) { msg.textContent = '❌ Fill fields.'; return; } PendingStore.add({ type: 'business', country: getEl('dbCountry').value, submittedBy: getDashAgent() && getDashAgent().businessName, data: { name: name, contact: contact, mobileMoney: getEl('dbMobileMoney').value, type: getEl('dbType').value, icon: getEl('dbIcon').value, city: getEl('dbCity').value, country: getEl('dbCountry').value } }); msg.style.color = '#27ae60'; msg.textContent = '✅ Submitted.'; refreshDashPanes(); }
function submitDashProduct() { const biz = getEl('dpBusiness').value; const name = (getEl('dpName').value || '').trim(); const price = parseFloat(getEl('dpPrice').value) || 0; const msg = getEl('dpMsg'); msg.style.color = '#c0392b'; if (!biz || !name || price <= 0) { msg.textContent = '❌ Fill fields.'; return; } PendingStore.add({ type: getEl('dpKind').value, country: getDashArea(), submittedBy: getDashAgent() && getDashAgent().businessName, data: { businessName: biz, name: name, price: price, quantity: parseInt(getEl('dpQty').value) || 1, icon: getEl('dpIcon').value, image: dpImageDataURL || null, kind: getEl('dpKind').value, quality: getEl('dpQuality').value } }); msg.style.color = '#27ae60'; msg.textContent = '✅ Submitted.'; refreshDashPanes(); dpImageDataURL = null; const pv = getEl('dpImagePreview'); if (pv) { pv.src = ''; pv.style.display = 'none'; } const cb = getEl('dpImageClearBtn'); if (cb) cb.style.display = 'none'; const fi = getEl('dpImageUpload'); if (fi) fi.value = ''; }
function setupAgentDashboardEvents() {
    const modal = getEl('editAgentModal');
    if (modal) { modal.addEventListener('click', function(e) { if (!e.target || !e.target.closest) return; const tabBtn = e.target.closest('.dash-tab'); if (tabBtn) { e.preventDefault(); switchDashTab(tabBtn.getAttribute('data-dash-tab')); return; } const ap = e.target.closest('[data-dash-approve]'); if (ap) { e.preventDefault(); approvePendingItem(ap.getAttribute('data-dash-approve')); return; } const rj = e.target.closest('[data-dash-reject]'); if (rj) { e.preventDefault(); rejectPendingItem(rj.getAttribute('data-dash-reject')); return; } }); }
    function bind(id, ev, fn) { const el = getEl(id); if (el) el.addEventListener(ev, fn); }
    bind('dcSubmitClient', 'click', function(e) { e.preventDefault(); submitDashClient(); });
    bind('dbSubmitBiz', 'click', function(e) { e.preventDefault(); submitDashBusiness(); });
    bind('dpSubmit', 'click', function(e) { e.preventDefault(); submitDashProduct(); });
    bind('saveEditAgentBtn', 'click', function(e) {
        e.preventDefault();
        const aid = getEl('editAgentId').value; const agent = getAgents().find(function(a) { return a.id === aid; });
        if (!agent) { getEl('editAgentError').textContent = 'Agent not found'; return; }
        const data = agent.agentData || agent;
        if (getEl('editPassword').value !== data.password) { getEl('editAgentError').textContent = '❌ Wrong password'; return; }
        if (getEl('editPin').value !== data.pin) { getEl('editAgentError').textContent = '❌ Wrong PIN'; return; }
        data.businessName = getEl('editBusinessName').value.trim(); data.businessAddress = getEl('editAddress').value.trim();
        data.city = getCityValue('editCitySelect', 'editCityOther'); data.mobileMoney = getEl('editMobileMoney').value.trim();
        saveRegisteredUsers(); refreshDashPanes(); showToast('✅ Updated!', 2000);
        setTimeout(function() { getEl('editAgentModal').style.display = 'none'; }, 1000);
        supaBackground(Supa.saveAgent(data), 'Agent update');
    });
    bind('editAgentUploadLogoBtn', 'click', function(e) { e.preventDefault(); const fi = getEl('editLogoImage'); if (fi) fi.click(); });
    bind('editLogoImage', 'change', function() { const f = this.files && this.files[0]; if (!f) return; resizeImageFile(f, 200, 0.82).then(function(dataUrl) { const aid = getEl('editAgentId').value; const agent = getAgents().find(function(a) { return a.id === aid; }); if (agent) { const data = agent.agentData || agent; data.avatarDataURL = dataUrl; saveRegisteredUsers(); supaBackground(Supa.saveAgent(data), 'Agent logo'); } const pv = getEl('editAgentLogoPreview'); if (pv) { pv.src = dataUrl; pv.style.display = 'block'; } const rb = getEl('editAgentRemoveLogoBtn'); if (rb) rb.style.display = 'inline-flex'; showToast('✅ Logo updated', 1800); }).catch(function() { showToast('⚠️ Could not process image.', 2200); }); this.value = ''; });
    bind('editAgentRemoveLogoBtn', 'click', function(e) { e.preventDefault(); const aid = getEl('editAgentId').value; const agent = getAgents().find(function(a) { return a.id === aid; }); if (agent) { const data = agent.agentData || agent; delete data.avatarDataURL; saveRegisteredUsers(); supaBackground(Supa.saveAgent(data), 'Agent logo removed'); } const pv = getEl('editAgentLogoPreview'); if (pv) { pv.src = ''; pv.style.display = 'none'; } this.style.display = 'none'; showToast('🗑️ Logo removed', 1500); });
    bind('dpImagePickBtn', 'click', function(e) { e.preventDefault(); const fi = getEl('dpImageUpload'); if (fi) fi.click(); });
    bind('dpImageUpload', 'change', function() { const f = this.files && this.files[0]; if (!f) return; resizeImageFile(f, 200, 0.82).then(function(dataUrl) { dpImageDataURL = dataUrl; const pv = getEl('dpImagePreview'); if (pv) { pv.src = dataUrl; pv.style.display = 'block'; } const cb = getEl('dpImageClearBtn'); if (cb) cb.style.display = 'inline-flex'; showToast('✅ Image ready', 1200); }).catch(function() { showToast('⚠️ Could not process image.', 2200); }); this.value = ''; });
    bind('dpImageClearBtn', 'click', function(e) { e.preventDefault(); dpImageDataURL = null; const pv = getEl('dpImagePreview'); if (pv) { pv.src = ''; pv.style.display = 'none'; } this.style.display = 'none'; const fi = getEl('dpImageUpload'); if (fi) fi.value = ''; });
    bind('refreshAgentsBtn', 'click', async function(e) { e.preventDefault(); showToast('🔄 Refreshing agents…', 1200); await supaRefreshAgents(); showToast('✅ Agents refreshed', 1400); });
}

/* ============================================================ */
/* USSD TEMPLATE ROUTING — GAMBIA + EXISTING PREFIXES           */
/* ============================================================ */
const PREFIX_144_2D = ['76','78','79','75','74','73'];
const PREFIX_161_2D = ['88','99','77','33','30','70','80','90'];
const GAMBIA_PREFIXES_2D = ['70','71','72','73','74','75','76','77','78','79','90','91','92','93','94','95','96','97','98','99'];
const GAMBIA_DESTINATION_DIAL = { 'Sierra Leone':'232','Guinea':'224','Senegal':'221','Liberia':'231','Ghana':'233','Nigeria':'234','Kenya':'254','Mali':'223','Ivory Coast':'225','Niger':'227','Benin':'229','Guinea Bissau':'245','Gambia':'220','Togo':'228','Central Africa Rep':'236','Ethiopia':'251','Gabon':'241','Madagascar':'261','Morocco':'212','Rwanda':'250','Uganda':'256','DR Congo':'243','Burkina Faso':'226' };

function isGambianPhone(agentPhoneDigits) {
    let digits = String(agentPhoneDigits || '').replace(/\D/g, '');
    if (digits.indexOf('220') === 0) digits = digits.slice(3);
    if (digits.indexOf('0') === 0) digits = digits.slice(1);
    if (digits.length < 7) return false;
    const two = digits.slice(0, 2);
    return GAMBIA_PREFIXES_2D.indexOf(two) !== -1;
}
function getGambiaDestinationDial() {
    try { const selectEl = getEl('countryCodeSelect'); if (selectEl && selectEl.value) { const parts = selectEl.value.split('|'); const countryName = parts[1]; if (countryName && GAMBIA_DESTINATION_DIAL[countryName]) return GAMBIA_DESTINATION_DIAL[countryName]; } } catch (e) {}
    try { if (typeof currentCountryData !== 'undefined' && currentCountryData.countryName) { const dial = GAMBIA_DESTINATION_DIAL[currentCountryData.countryName]; if (dial) return dial; } } catch (e) {}
    return '232';
}
function buildGambiaLocalUssd(agentPhoneDigits, amount) { const digits = String(agentPhoneDigits || '').replace(/\D/g, ''); const amt = String(Math.round(parseFloat(amount) || 0)); return '*777*1*' + digits + '*' + amt + '*KKKK#'; }
function buildGambiaBusinessPaybackUssd(amount) { const amt = String(Math.round(parseFloat(amount) || 0)); return '*777*1*4*2*1*23280422698*' + amt + '*KKKK#'; }
function buildGambiaAgentInternationalUssd(agentPhoneDigits, destinationDial) { const digits = String(agentPhoneDigits || '').replace(/\D/g, ''); const m = String(destinationDial || '232').replace(/\D/g, ''); return '*144*1*4*' + m + '*' + digits + '#'; }
function getUssdTemplateForPhone(agentPhoneDigits) {
    const digits = String(agentPhoneDigits || '').replace(/\D/g, '');
    if (isGambianPhone(digits)) {
        const m = getGambiaDestinationDial();
        if (m === '220') { return { variant: 'gambia-local', template: '*777*1*{AGENT}*{AMOUNT}*KKKK#', label: 'Gambia Local (777)' }; }
        return { variant: 'gambia-agent-intl', template: '*144*1*4*' + m + '*{AGENT}#', label: 'Gambia Agent → Intl (144 / ' + m + ')' };
    }
    let local = digits;
    if (local.indexOf('232') === 0) local = local.slice(3);
    if (local.indexOf('0') === 0) local = local.slice(1);
    const twoDigit = local.slice(0, 2);
    if (PREFIX_144_2D.indexOf(twoDigit) !== -1) return { variant: '144', template: '#144*2*2*{AGENT}*{AMOUNT}*0000#', label: 'MB-FOUR (144)' };
    if (PREFIX_161_2D.indexOf(twoDigit) !== -1) return { variant: '161', template: '*161*1*1*{AGENT}*{AMOUNT}*0000#', label: 'MB-FOUR (161)' };
    return { variant: '144', template: '#144*2*2*{AGENT}*{AMOUNT}*0000#', label: 'MB-FOUR (144)' };
}
function substituteUssdTemplate(template, agentPhoneDigits, amount) { const digits = String(agentPhoneDigits || '').replace(/\D/g, ''); const amt = String(Math.round(parseFloat(amount) || 0)); return String(template).replace(/\{AGENT\}/g, digits).replace(/\{AMOUNT\}/g, amt).replace(/\{CC\}/g, getGambiaDestinationDial()).replace(/\{M\}/g, getGambiaDestinationDial()); }

function selectMbFourAgent(agentId) {
    const agent = getAgents().find(function(a) { return a.id === agentId; }); if (!agent) { showToast('⚠️ Agent not found.', 2200); return; }
    const d = agent.agentData || agent;
    const agentCountryCode = d.countryCode || '';
    const phoneRaw = String(d.mobileMoney || d.phone || agent.phone || '').replace(/\D/g, '');
    if (phoneRaw.length < 6) { showToast('⚠️ Agent has no valid phone number.', 2600); return; }
    mbFourSelectedAgentId = agentId; mbFourSelectedAgentPhone = phoneRaw;
    const displayName = (d.businessName || agent.name || 'Agent').replace(/\(.*\)/, '').trim();
    const detailsEl = getEl('localAgentDetails');
    if (detailsEl) { if (getEl('localAgentName')) getEl('localAgentName').textContent = displayName; if (getEl('localAgentPhone')) getEl('localAgentPhone').textContent = agentCountryCode + ' ' + phoneRaw; detailsEl.classList.add('show'); }
    const amountRaw = parseFloat(getEl('amountInput') && getEl('amountInput').value) || 0;
    const amt = Math.round(amountRaw);
    let routeLabel, ussd;
    if (isGambianPhone(phoneRaw)) {
        const destinationDial = getGambiaDestinationDial();
        if (destinationDial === '220') { routeLabel = 'Gambia Local (777)'; ussd = buildGambiaLocalUssd(phoneRaw, amt); }
        else { routeLabel = 'Gambia Agent → Intl (144 / ' + destinationDial + ')'; ussd = buildGambiaAgentInternationalUssd(phoneRaw, destinationDial); }
    } else {
        const route = getUssdTemplateForPhone(phoneRaw);
        routeLabel = route.label; ussd = substituteUssdTemplate(route.template, phoneRaw, amt);
    }
    showMbFourUssdModal({ agentName: displayName, agentPhone: phoneRaw, agentCountryCode: agentCountryCode, amount: amt, routeLabel: routeLabel, ussd: ussd });
}
function showMbFourUssdModal(data) {
    const existing = document.getElementById('mbFourUssdDisplayModal'); if (existing) existing.remove();
    const modal = document.createElement('div'); modal.id = 'mbFourUssdDisplayModal'; modal.className = 'modal'; modal.style.display = 'flex';
    const eN = escapeHTML(data.agentName); const eP = escapeHTML(data.agentPhone); const eCC = escapeHTML(data.agentCountryCode || ''); const eA = escapeHTML(String(data.amount)); const eR = escapeHTML(data.routeLabel); const eU = escapeHTML(data.ussd);
    modal.innerHTML = '<div class="modal-content" style="max-width:460px;"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><h3 style="margin:0;color:#0f2b3d;">📞 ' + eR + '</h3><button type="button" class="action-btn close-mbusssd" style="width:32px;height:32px;padding:0;border-radius:50%;background:#ccc;color:#222;font-size:1rem;">✕</button></div><div class="ussd-modal-details"><div class="ussd-modal-row"><span class="ussd-modal-label">🏢 Local Agent</span><span class="ussd-modal-value">' + eN + '</span></div><div class="ussd-modal-row"><span class="ussd-modal-label">📱 Phone</span><span class="ussd-modal-value">' + eCC + ' ' + eP + '</span></div><div class="ussd-modal-row"><span class="ussd-modal-label">💵 Amount</span><span class="ussd-modal-value">' + eA + '</span></div></div><div style="font-weight:700;color:#1c6e8f;font-size:.82rem;margin-bottom:4px;">🔐 USSD Code to Dial:</div><div id="mbUssdCodeBox" class="ussd-code-box">' + eU + '</div><div class="ussd-hint">💡 Tap <strong>Dial USSD</strong> to open your phone dialer with the code pre-filled.<br>When prompted for PIN, enter your <strong>4-digit PIN</strong> in place of <code>KKKK</code> (or <code>0000</code> for legacy templates).</div><div class="action-buttons-row" style="gap:6px;"><button type="button" class="action-btn dial" id="mbUssdDialBtn" style="flex:1;">📞 Dial USSD</button><button type="button" class="action-btn green" id="mbUssdCopyBtn" style="flex:1;">📋 Copy</button></div><button type="button" class="action-btn close-mbusssd" style="background:#95a5a6;width:100%;margin-top:6px;">Close</button></div>';
    document.body.appendChild(modal);
    modal.querySelectorAll('.close-mbusssd').forEach(function(b) { b.addEventListener('click', function() { modal.remove(); }); });
    const dialBtn = modal.querySelector('#mbUssdDialBtn'); if (dialBtn) dialBtn.addEventListener('click', function() { const link = document.createElement('a'); link.href = 'tel:' + encodeURIComponent(data.ussd).replace(/%23/g, '#'); document.body.appendChild(link); link.click(); document.body.removeChild(link); showToast('📞 Opening dialer with USSD code...', 2600); });
    const copyBtn = modal.querySelector('#mbUssdCopyBtn'); if (copyBtn) copyBtn.addEventListener('click', function() { const code = data.ussd; if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(code).then(function() { showToast('✅ USSD copied', 2600); }).catch(function() { fallbackCopy(code); }); } else fallbackCopy(code); });
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
}
function fallbackCopy(text) { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); showToast('✅ USSD copied', 2600); } catch (err) { showToast('⚠️ Copy failed', 2600); } document.body.removeChild(ta); }

function openMbFourAgentPicker() {
    const allAgents = getAdminApprovedAgents(); if (!allAgents.length) { showToast('⚠️ No admin-approved agents available yet.', 2800); return; }
    const senderCountry = getSenderCountry(); let agents = allAgents; let filteredByCountry = false;
    if (senderCountry) { const filtered = allAgents.filter(function(a) { const cn = getAgentCountryName(a); return cn && cn.toLowerCase() === senderCountry.toLowerCase(); }); if (filtered.length > 0) { agents = filtered; filteredByCountry = true; } }
    const modal = getEl('mbFourAgentPicker'); const list = getEl('mbFourAgentList'); const hint = getEl('mbFourPickerHint'); if (!modal || !list) return;
    if (hint) hint.innerHTML = filteredByCountry ? 'Showing <strong>admin-approved</strong> agents in <strong>' + escapeHTML(senderCountry) + '</strong>.' : 'Showing <strong>all admin-approved</strong> agents.';
    if (agents.length === 1) { modal.style.display = 'none'; selectMbFourAgent(agents[0].id); return; }
    const byCountry = {}; agents.forEach(function(a) { const c = getAgentCountryName(a) || 'Other'; if (!byCountry[c]) byCountry[c] = []; byCountry[c].push(a); });
    list.innerHTML = Object.keys(byCountry).sort().map(function(country) {
        const code = COUNTRY_NAME_TO_CODE[country]; const flag = (code && COUNTRY_CODE_TO_FLAG[code]) || '🌍';
        const header = '<div style="font-weight:800;color:#1c6e8f;font-size:.78rem;margin:8px 0 4px;border-left:3px solid #f4a261;padding-left:7px;">' + flag + ' ' + escapeHTML(country) + '</div>';
        const rows = byCountry[country].sort(function(a, b) { const an = (a.agentData && a.agentData.businessName) || a.name; const bn = (b.agentData && b.agentData.businessName) || b.name; return an.localeCompare(bn); }).map(function(a) {
            const d = a.agentData || a; const name = (d.businessName || a.name || '').replace(/\(.*\)/, '').trim();
            const phone = d.mobileMoney || d.phone || a.phone || '—';
            const route = getUssdTemplateForPhone(phone);
            return '<button type="button" class="broadcast-option" data-mbfour-agent="' + escapeHTML(a.id) + '" style="width:100%;text-align:left;"><span class="bo-icon">' + (d.emoji || '🏢') + '</span><span class="bo-text"><span class="bo-title">' + escapeHTML(name) + ' <span style="color:#27ae60;font-size:.62rem;font-weight:700;">✅ Admin-verified</span></span><span class="bo-sub">📱 ' + escapeHTML(phone) + ' · 🔀 ' + route.label + '</span></span><span style="color:#2c7da0;font-size:1.2rem;">›</span></button>';
        }).join('');
        return header + rows;
    }).join('');
    list.querySelectorAll('[data-mbfour-agent]').forEach(function(btn) { btn.addEventListener('click', function() { const id = btn.getAttribute('data-mbfour-agent'); modal.style.display = 'none'; selectMbFourAgent(id); }); });
    modal.style.display = 'flex';
}
function getSenderCountry() { if (currentUser && currentUser.country) return currentUser.country; return getCountryNameFromSelect() || null; }

function handleLocalAgentBtnClick(e) {
    if (e) e.preventDefault();
    if (!mbFourSelectedAgentId) { showToast('⚠️ No local agent selected yet. Tap MB-FOUR first.', 2400); return; }
    const agent = getAgents().find(function(a) { return a.id === mbFourSelectedAgentId; });
    if (!agent) { showToast('⚠️ Local agent not found.', 2200); return; }
    const d = agent.agentData || agent;
    const displayName = (d.businessName || agent.name || 'Agent').replace(/\(.*\)/, '').trim();
    const phoneRaw = String(d.mobileMoney || d.phone || agent.phone || '').replace(/\D/g, '');
    const amount = parseFloat(getEl('amountInput') && getEl('amountInput').value) || 0;
    if (phoneRaw.length < 6) { showToast('⚠️ Local agent has no valid phone number.', 2400); return; }
    let routeLabel, ussd;
    if (isGambianPhone(phoneRaw)) {
        const destinationDial = getGambiaDestinationDial();
        if (destinationDial === '220') { routeLabel = 'Gambia Local (777)'; ussd = buildGambiaLocalUssd(phoneRaw, Math.round(amount)); }
        else { routeLabel = 'Gambia Agent → Intl (144 / ' + destinationDial + ')'; ussd = buildGambiaAgentInternationalUssd(phoneRaw, destinationDial); }
    } else {
        const route = getUssdTemplateForPhone(phoneRaw);
        routeLabel = route.label; ussd = substituteUssdTemplate(route.template, phoneRaw, Math.round(amount));
    }
    showMbFourUssdModal({ agentName: displayName, agentPhone: phoneRaw, agentCountryCode: d.countryCode || '', amount: Math.round(amount), routeLabel: routeLabel, ussd: ussd });
}

/* ============================================================ */
/* FIXED: setupEventListeners — Register button robust + safe    */
/* ============================================================ */
function setupEventListeners() {
    function safe(id, event, handler) { const el = getEl(id); if (el) el.addEventListener(event, handler); }

    safe('langSelect', 'change', function() { setLanguage(this.value); });
    safe('othersBtn', 'click', function(e) { e.preventDefault(); e.stopPropagation(); const m = getEl('othersDropdownMenu'); if (m) m.classList.toggle('open'); });
    document.addEventListener('click', function(e) { const od = document.querySelector('.others-dropdown'); if (!od) return; if (!od.contains(e.target)) { const m = getEl('othersDropdownMenu'); if (m) m.classList.remove('open'); } });

    safe('loginBtn', 'click', function(e) { e.preventDefault(); if (getEl('loginError')) getEl('loginError').innerHTML = ''; if (getEl('loginModal')) getEl('loginModal').style.display = 'flex'; });

    /* ============================================================ */
    /* FIXED: registerBtn — populate dropdowns BEFORE showing modal */
    /* ============================================================ */
    safe('registerBtn', 'click', function(e) {
        e.preventDefault();
        try {
            populateCountryDropdown('regCountry');
            populateCapitalCityDropdown('regCitySelect');
        } catch (err) { console.warn('registerBtn populate:', err); }
        regAvatarDataURL = null; regEmoji = '👤';
        try { updateRegAvatarPreview(); } catch (err) {}
        try { const rb = getEl('regRemoveImageBtn'); if (rb) rb.style.display = 'none'; } catch (err) {}
        try { if (getEl('regError')) getEl('regError').textContent = ''; } catch (err) {}
        try { if (getEl('regSuccess')) getEl('regSuccess').textContent = ''; } catch (err) {}
        if (getEl('registerModal')) getEl('registerModal').style.display = 'flex';
    });

    safe('logoutBtn', 'click', function(e) { e.preventDefault(); clearUserStorage(); showToast('Logged out'); });
    safe('agentAuthConfirmBtn', 'click', function(e) { e.preventDefault(); confirmAgentAuth(); });
    safe('doLoginBtn', 'click', function(e) { e.preventDefault(); if (loginUser(getEl('loginName').value, getEl('loginPhone').value)) { getEl('loginModal').style.display = 'none'; getEl('loginName').value = ''; getEl('loginPhone').value = ''; } });
    safe('countryCodeSelect', 'change', function() { handleCountrySelectChange(this); });

    safe('regPickEmojiBtn', 'click', function() { const grid = getEl('emojiGrid'); if (!grid) return; grid.innerHTML = ''; AVAILABLE_EMOJIS.forEach(function(e) { const s = document.createElement('span'); s.className = 'emoji-option'; s.textContent = e; s.addEventListener('click', function() { regEmoji = e; regAvatarDataURL = null; try { updateRegAvatarPreview(); } catch(err) {} const rb = getEl('regRemoveImageBtn'); if (rb) rb.style.display = 'none'; getEl('emojiPickerModal').style.display = 'none'; }); grid.appendChild(s); }); getEl('emojiPickerModal').style.display = 'flex'; });
    safe('regUploadImageBtn', 'click', function() { const fi = getEl('regAvatarUploadInput'); if (fi) fi.click(); });
    safe('regAvatarUploadInput', 'change', function() { const f = this.files[0]; if (!f) return; resizeImageFile(f, 200, 0.82).then(function(dataUrl) { regAvatarDataURL = dataUrl; try { updateRegAvatarPreview(); } catch(err) {} const rb = getEl('regRemoveImageBtn'); if (rb) rb.style.display = 'inline-flex'; }).catch(function() { showToast('⚠️ Could not process image.', 2200); }); this.value = ''; });
    safe('regRemoveImageBtn', 'click', function() { regAvatarDataURL = null; regEmoji = '👤'; try { updateRegAvatarPreview(); } catch(err) {} this.style.display = 'none'; });

    /* ============================================================ */
    /* FIXED: doRegisterBtn — full try/catch, safe dropdown read,   */
    /* guaranteed showLoggedInUI, robust error display               */
    /* ============================================================ */
    safe('doRegisterBtn', 'click', function(e) {
        e.preventDefault();
        const errEl = getEl('regError'); const okEl = getEl('regSuccess');
        if (errEl) errEl.textContent = ''; if (okEl) okEl.textContent = '';
        try {
            /* Ensure dropdowns are populated in case they weren't */
            try { populateCountryDropdown('regCountry'); } catch (err) {}
            try { populateCapitalCityDropdown('regCitySelect'); } catch (err) {}

            const nameField = getEl('regName');
            const phoneField = getEl('regPhone');
            if (!nameField || !phoneField) { if (errEl) errEl.textContent = '❌ Form not ready, please retry.'; return; }

            const name = (nameField.value || '').trim();
            const phone = (phoneField.value || '').trim();

            /* City: prefer dropdown, then other text input, then empty */
            const citySelect = getEl('regCitySelect');
            const cityOther = getEl('regCityOther');
            let city = '';
            if (citySelect && citySelect.value) city = citySelect.value;
            else if (cityOther && cityOther.value && cityOther.value.trim()) city = cityOther.value.trim();
            else if (citySelect && citySelect.value === '' && cityOther && cityOther.value === '') city = '';

            if (!name || !phone || !city) {
                if (errEl) errEl.textContent = '❌ Please fill Name, Phone and City (pick a city or type one under OR).';
                return;
            }
            loadRegisteredUsers();
            if (registeredUsers.some(function(u) { return u.phone === phone; })) { if (errEl) errEl.textContent = '❌ Phone already registered.'; return; }

            const newUser = {
                id: 'user_' + Date.now(),
                name: name,
                phone: phone,
                address: (getEl('regAddress') && getEl('regAddress').value) || '',
                city: city,
                country: (getEl('regCountry') && getEl('regCountry').value) || 'Sierra Leone',
                emoji: regEmoji || '👤',
                avatarDataURL: regAvatarDataURL || null,
                role: 'user',
                nin: (getEl('regNin') && getEl('regNin').value) || '',
                idNumber: (getEl('regIdNumber') && getEl('regIdNumber').value) || ''
            };
            registeredUsers.push(newUser);
            saveRegisteredUsers();

            currentUser = {
                name: newUser.name,
                phone: newUser.phone,
                address: newUser.address,
                city: newUser.city,
                country: newUser.country,
                emoji: newUser.emoji,
                avatarDataURL: newUser.avatarDataURL,
                nin: newUser.nin,
                idNumber: newUser.idNumber
            };
            saveUserToStorage(currentUser);

            if (okEl) okEl.textContent = '✅ Registered!';
            showToast('✅ Registered!', 1500);

            /* Show logged-in UI — wrapped so if any sub-step fails registration still succeeds */
            try { showLoggedInUI(); } catch (uiErr) { console.warn('showLoggedInUI after register:', uiErr); }

            setTimeout(function() { if (getEl('registerModal')) getEl('registerModal').style.display = 'none'; }, 900);
            supaBackground(Supa.saveUser(newUser), 'User');
        } catch (err) {
            console.error('❌ Register handler error:', err);
            if (errEl) errEl.textContent = '❌ Registration error: ' + (err && err.message ? err.message : 'unknown');
        }
    });

    safe('userAvatarContainer', 'click', function(e) { if (e.target.closest('.logout-btn') || e.target.closest('.edit-account-btn')) return; if (!currentUser) return; openEmojiPicker(); });
    safe('profileAvatarLarge', 'click', function() { if (!currentUser) return; openEmojiPicker(); });
    safe('emojiUploadImageBtn', 'click', function() { if (getEl('avatarUploadInput')) getEl('avatarUploadInput').click(); });
    safe('emojiRemoveImageBtn', 'click', function() { removeAvatarImage(); });
    safe('avatarUploadInput', 'change', function() { const f = this.files[0]; if (!f) return; resizeImageFile(f, 200, 0.82).then(function(dataUrl) { applyAvatarImage(dataUrl); }).catch(function() { showToast('⚠️ Could not process image.', 2200); }); this.value = ''; });

    safe('editAccountBtn', 'click', function(e) { e.preventDefault(); if (!currentUser) { showToast('⚠️ Login first', 2000); return; } try { populateCountryDropdown('editAccountCountry'); } catch(err) {} try { populateCapitalCityDropdown('editAccountCitySelect'); } catch(err) {} getEl('editAccountName').value = currentUser.name || ''; getEl('editAccountPhone').value = currentUser.phone || ''; getEl('editAccountAddress').value = currentUser.address || ''; setCityValue('editAccountCitySelect', 'editAccountCityOther', currentUser.city || ''); getEl('editAccountCountry').value = currentUser.country || 'Sierra Leone'; getEl('editAccountModal').style.display = 'flex'; });
    safe('saveEditAccountBtn', 'click', function(e) { e.preventDefault(); const name = getEl('editAccountName').value.trim(); const phone = getEl('editAccountPhone').value.trim(); const city = getCityValue('editAccountCitySelect', 'editAccountCityOther'); if (!name || !phone || !city) { getEl('editAccountError').textContent = '❌ Fill Name, Phone & City'; return; } currentUser.name = name; currentUser.phone = phone; currentUser.address = getEl('editAccountAddress').value; currentUser.city = city; currentUser.country = getEl('editAccountCountry').value; saveUserToStorage(currentUser); showLoggedInUI(); showToast('✅ Account updated!', 2000); setTimeout(function() { getEl('editAccountModal').style.display = 'none'; }, 1000); supaBackground(Supa.saveUser(currentUser), 'Account update'); });

    safe('agentDropdownBtn', 'click', function(e) { e.preventDefault(); e.stopPropagation(); const list = getEl('agentDropdownList'); if (list) list.classList.toggle('open'); renderAgentDropdown(currentAgentFilterCountry); });
    document.addEventListener('click', function(e) { const c = document.querySelector('.agent-dropdown-container'); if (c && !c.contains(e.target)) { const list = getEl('agentDropdownList'); if (list) list.classList.remove('open'); } });

    safe('agentNameSelect', 'change', function() { if (this.value) selectAgent(this.value); else { selectedAgentId = null; _selectedAgentId = null; clearAgentSelection(); } });
    safe('generateTxBtn', 'click', function(e) { e.preventDefault(); setGeneratedTransactionId(); });
    safe('copyTxBtn', 'click', function(e) { e.preventDefault(); copyTransactionIdToClipboard(); });
    document.querySelectorAll('.close-modal').forEach(function(b) { b.addEventListener('click', function(e) { e.preventDefault(); const m = this.closest('.modal'); if (m) m.style.display = 'none'; }); });

    safe('mainMmBtn', 'click', function(e) { e.preventDefault(); const amt = parseFloat(getEl('amountInput') && getEl('amountInput').value) || 0; if (amt <= 0) { showToast('⚠️ Enter an amount first.', 2200); return; } openMbFourAgentPicker(); });
    safe('localAgentBtn', 'click', handleLocalAgentBtnClick);
    safe('localAgentClearBtn', 'click', function(e) { e.preventDefault(); mbFourSelectedAgentId = null; mbFourSelectedAgentPhone = null; const d = getEl('localAgentDetails'); if (d) d.classList.remove('show'); showToast('✅ Local agent cleared', 1500); });
    safe('localAgentWhatsAppBtn', 'click', function(e) { e.preventDefault(); if (!mbFourSelectedAgentId) { showToast('⚠️ Select a local agent first.', 2200); return; } const agent = getAgents().find(function(a) { return a.id === mbFourSelectedAgentId; }); if (!agent) { showToast('⚠️ Agent not found.', 2200); return; } const d = agent.agentData || agent; openWhatsApp(d.mobileMoney || d.phone || agent.phone || '', (d.businessName || agent.name || 'Agent').replace(/\(.*\)/, '').trim()); });
    safe('localAgentSmsBtn', 'click', function(e) { e.preventDefault(); if (!mbFourSelectedAgentId) { showToast('⚠️ Select a local agent first.', 2200); return; } const agent = getAgents().find(function(a) { return a.id === mbFourSelectedAgentId; }); if (!agent) { showToast('⚠️ Agent not found.', 2200); return; } const d = agent.agentData || agent; openSMS(d.mobileMoney || d.phone || agent.phone || '', (d.businessName || agent.name || '').replace(/\(.*\)/, '').trim()); });

    safe('inlineConvFrom', 'change', function() { updateInlineConversion(); });
    safe('inlineConvTo', 'change', function() { updateInlineConversion(); });
    safe('inlineConvAmount', 'input', function() { updateInlineConversion(); });

    safe('intlToggleBtn', 'click', function(e) { e.preventDefault(); isLocalMode = !isLocalMode; this.classList.toggle('active', !isLocalMode); const cw = getEl('countryWrapper'); if (cw) cw.style.display = isLocalMode ? 'none' : 'block'; computeCharges(); updateAgentDropdownForCountry(); });
    safe('addClientBtnHeader', 'click', function(e) { e.preventDefault(); if (getEl('addClientModal')) getEl('addClientModal').style.display = 'flex'; try { populateCountryDropdown('newClientCountrySelect'); } catch(err) {} try { populateCapitalCityDropdown('newClientCitySelect'); } catch(err) {} });
    safe('saveClientBtn', 'click', function(e) { e.preventDefault(); const n = getEl('newClientName').value.trim(); const p = getEl('newClientPhone').value.trim(); if (!n || !p) { getEl('addClientError').textContent = '❌ Name & Phone required.'; return; } getEl('clientName').value = n; getEl('clientPhone').value = p; getEl('clientSectionTitle').style.display = 'block'; getEl('clientFieldsRow').style.display = 'grid'; currentClient = { name: n, phone: p }; showToast('✅ Client "' + n + '" added!', 2000); getEl('addClientModal').style.display = 'none'; });

    /* FIXED: registerAgentBtn — wrap in try/catch so agentRegistrationModal always opens */
    safe('registerAgentBtn', 'click', function(e) {
        e.preventDefault();
        try {
            if (getEl('registerModal')) getEl('registerModal').style.display = 'none';
            try { populateCapitalCityDropdown('agentCitySelect'); } catch(err) { console.warn('agentCitySelect:', err); }
            try { populateCollateralDropdowns(); } catch(err) { console.warn('collateral:', err); }
            agentBizProfileDataURL = null; agentBizProfileEmoji = '🏢';
            try { updateAgentBizProfilePreview(); } catch(err) {}
            if (getEl('agentBizProfileUpload')) getEl('agentBizProfileUpload').value = '';
            if (getEl('agentIdUpload')) getEl('agentIdUpload').value = '';
            if (getEl('agentIdPreview')) getEl('agentIdPreview').style.display = 'none';
            if (getEl('agentRegError')) getEl('agentRegError').textContent = '';
            if (getEl('agentProviderTxIdError')) getEl('agentProviderTxIdError').textContent = '';
            if (getEl('agentRegistrationModal')) getEl('agentRegistrationModal').style.display = 'flex';
        } catch (err) {
            console.error('registerAgentBtn error:', err);
            showToast('⚠️ Could not open agent form: ' + (err && err.message ? err.message : 'error'), 3200);
        }
    });

    safe('agentPickLogoEmojiBtn', 'click', function() { const grid = getEl('emojiGrid'); if (!grid) return; grid.innerHTML = ''; AVAILABLE_EMOJIS.forEach(function(e) { const s = document.createElement('span'); s.className = 'emoji-option'; s.textContent = e; s.addEventListener('click', function() { agentBizProfileEmoji = e; agentBizProfileDataURL = null; updateAgentBizProfilePreview(); getEl('emojiPickerModal').style.display = 'none'; }); grid.appendChild(s); }); getEl('emojiPickerModal').style.display = 'flex'; });
    safe('agentUploadLogoBtn', 'click', function() { const fi = getEl('agentBizProfileUpload'); if (fi) fi.click(); });
    safe('agentBizProfileUpload', 'change', function() { const f = this.files[0]; if (!f) return; resizeImageFile(f, 200, 0.82).then(function(dataUrl) { agentBizProfileDataURL = dataUrl; updateAgentBizProfilePreview(); }).catch(function() { showToast('⚠️ Could not process image.', 2200); }); this.value = ''; });
    safe('agentRemoveLogoBtn', 'click', function() { agentBizProfileDataURL = null; agentBizProfileEmoji = '🏢'; updateAgentBizProfilePreview(); });
    safe('agentIdUpload', 'change', function() { const f = this.files[0]; if (!f) return; if (f.type.startsWith('image/')) { const r = new FileReader(); r.onload = function(ev) { const pv = getEl('agentIdPreview'); if (pv) { pv.src = ev.target.result; pv.style.display = 'block'; } }; r.readAsDataURL(f); } else { const pv = getEl('agentIdPreview'); if (pv) pv.style.display = 'none'; } showToast('✅ ID uploaded', 1500); this.value = ''; });

    safe('generatePasswordBtn', 'click', function(e) { e.preventDefault(); const ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let pw = ''; for (let i = 0; i < 6; i++) pw += ch.charAt(Math.floor(Math.random() * ch.length)); getEl('agentPassword').value = pw; showToast('🔑 ' + pw, 3000); });
    safe('generatePinBtn', 'click', function(e) { e.preventDefault(); const pin = String(Math.floor(10000 + Math.random() * 90000)); getEl('agentPin').value = pin; showToast('🔑 ' + pin, 3000); });

    safe('submitAgentRegistrationBtn', 'click', function(e) {
        e.preventDefault();
        try {
            const ptx = getEl('agentProviderTxId').value.trim();
            const val = ProviderTxIdManager.validate(ptx);
            if (!val.valid) { getEl('agentProviderTxIdError').textContent = val.error; return; }
            const bn = getEl('agentBusinessName').value.trim();
            const ci = getCityValue('agentCitySelect', 'agentCityOther');
            if (!bn || !ci) { getEl('agentRegError').textContent = '❌ Fill required fields.'; return; }
            ProviderTxIdManager.markAsUsed(ptx);
            const data = { id: 'agent_' + Date.now(), name: bn, businessName: bn, businessAddress: getEl('agentAddress').value.trim(), city: ci, regNumber: getEl('agentRegNumber').value.trim(), businessType: getEl('agentBusinessType').value, ownerName: getEl('agentOwnerName').value.trim(), idType: getEl('agentIdType').value, idNumber: getEl('agentIdNumber').value.trim(), mobileMoney: getEl('agentMobileMoney').value.trim(), countryCode: getEl('agentCountryCode').value, password: getEl('agentPassword').value.trim(), pin: getEl('agentPin').value.trim(), collateralAmount: parseFloat(getEl('agentCollateralLimit').value) || 0, collateralLimit: parseInt(getEl('agentCollateralLimit').value) || 0, currency: 'GNF', approved: false, role: 'agent', isAgent: true, registeredAt: new Date().toISOString(), nin: getEl('agentNin').value.trim(), providerTxId: ptx, avatarDataURL: agentBizProfileDataURL || null, emoji: agentBizProfileEmoji || '🏢' };
            PendingStore.add({ type: 'agent', country: COUNTRY_CODE_TO_NAME[data.countryCode] || data.city, submittedBy: bn, data: data });
            registeredUsers.push(data); saveRegisteredUsers();
            showToast('✅ Agent submitted — awaiting admin approval.', 3200);
            setTimeout(function() { getEl('agentRegistrationModal').style.display = 'none'; }, 1400);
            supaBackground(Supa.saveAgent(data), 'Agent (pending)');
        } catch (err) {
            console.error('submitAgentRegistrationBtn error:', err);
            if (getEl('agentRegError')) getEl('agentRegError').textContent = '❌ ' + (err && err.message ? err.message : 'Error');
        }
    });

    safe('mainForm', 'submit', function(e) {
        e.preventDefault();
        try {
            const ptx = (getEl('providerTxId') && getEl('providerTxId').value.trim()) || '';
            const val = ProviderTxIdManager.validate(ptx);
            if (!val.valid) { const eg = getEl('providerTxIdError'); if (eg) { eg.textContent = val.error; eg.style.display = 'block'; } showToast('❌ ' + val.error, 2500); return; }
            const ptxErr = getEl('providerTxIdError'); if (ptxErr) ptxErr.style.display = 'none';
            const tcg = getEl('mainTransferCodeGroup'); if (tcg) tcg.style.display = 'block';
            const tc = (getEl('mainTransferCode') && getEl('mainTransferCode').value.trim()) || '';
            const tcv = TransferCodeManager.validate(tc);
            if (!tcv.valid) { const eg = getEl('mainTransferCodeError'); if (eg) { eg.textContent = tcv.error; eg.style.display = 'block'; } showToast('❌ ' + tcv.error, 2500); return; }
            const tcErr = getEl('mainTransferCodeError'); if (tcErr) tcErr.style.display = 'none';
            const sn = getEl('senderName').value.trim(); const sp = getEl('senderPhone').value.trim();
            const an = (getEl('agentName') && getEl('agentName').value.trim()) || '';
            const ap = (getEl('agentPhone') && getEl('agentPhone').value.trim()) || '';
            if (!sn) { showToast('❌ Enter sender name.'); return; }
            if (!sp) { showToast('❌ Enter sender phone.'); return; }
            if (!an) { showToast('❌ Select an agent or business.'); return; }
            const amount = parseFloat(getEl('amountInput') && getEl('amountInput').value) || 0;
            if (amount <= 0) { showToast('❌ Enter amount.'); return; }
            ensureTransactionId();
            const carrear = amount * FEE_CARREAR; const localFee = amount * FEE_LOCAL; const servicesFee = amount * FEE_SERVICES;
            const chargeTotal = amount * FEE_TOTAL;
            const currency = isLocalMode ? getUserCurrency() : currentCountryData.currency;
            const txId = (getEl('transactionId') && getEl('transactionId').value.trim()) || '';
            ProviderTxIdManager.markAsUsed(ptx); TransferCodeManager.markAsUsed(tc);
            let localAgentName = '', localAgentPhone = '';
            if (mbFourSelectedAgentId) { const la = getAgents().find(function(a) { return a.id === mbFourSelectedAgentId; }); if (la) { const ld = la.agentData || la; localAgentName = (ld.businessName || la.name || '').replace(/\(.*\)/, '').trim(); localAgentPhone = ld.mobileMoney || ld.phone || la.phone || ''; } }
            const agentPhoneRaw = String(ap).replace(/\D/g, '');
            const clientName = (getEl('clientName') && getEl('clientName').value.trim()) || '';
            const clientPhoneRaw = String(getEl('clientPhone') && getEl('clientPhone').value || '').replace(/\D/g, '');
            const clientPhoneValue = (getEl('clientPhone') && getEl('clientPhone').value) || '';
            const orderedProductSnapshot = currentOrderedProduct ? Object.assign({}, currentOrderedProduct) : null;
            const data = { txId: txId, date: new Date().toLocaleString(), mode: isLocalMode ? 'Local' : 'International', sender: sn + ' (' + sp + ')', agent: an + ' (' + ap + ')', agentName: an, agentPhoneRaw: agentPhoneRaw, clientName: clientName, clientPhoneRaw: clientPhoneRaw, localAgentName: localAgentName, localAgentPhone: localAgentPhone, baseAmount: amount.toFixed(2), charge: chargeTotal.toFixed(2), carrear: carrear.toFixed(2), localFee: localFee.toFixed(2), servicesFee: servicesFee.toFixed(2), gst: '0.00', total: (amount + chargeTotal).toFixed(2), currency: currency, providerTxId: ptx, transferCode: tc, orderedProduct: orderedProductSnapshot };
            showReceiptModal(data);
            try { if (typeof window.__seedDeliverTransaction === 'function') { window.__seedDeliverTransaction({ senderName: sn, senderPhone: sp, clientName: clientName, clientPhone: clientPhoneValue, amount: amount, currency: currency, localAgentName: localAgentName, localAgentPhone: localAgentPhone, txId: data.txId, providerTxId: data.providerTxId, transferCode: data.transferCode }); } } catch (seedErr) { console.warn('Deliver seed failed:', seedErr); }
            showToast('✅ Receipt generated!', 2500);
            supaBackground(Supa.saveTransaction({ txId: data.txId, providerTxId: data.providerTxId, transferCode: data.transferCode, senderName: sn, senderPhone: sp, clientName: clientName, clientPhone: clientPhoneValue, agentName: an, agentPhone: ap, amount: amount, charge: chargeTotal, gst: 0, total: amount + chargeTotal, currency: currency, mode: data.mode }), 'Transaction');
            clearOrderedProduct();
        } catch (err) { console.error('❌ Submit:', err); showToast('❌ Submit failed: ' + (err.message || 'Error'), 3500); }
    });

    safe('providerTxId', 'input', function() { const v = this.value.trim(); const eg = getEl('mainTransferCodeGroup'); if (!v) { if (eg) eg.style.display = 'none'; return; } const valid = ProviderTxIdManager.validate(v); if (valid.valid) { if (eg) eg.style.display = 'block'; if (getEl('providerTxIdError')) getEl('providerTxIdError').style.display = 'none'; } else { if (eg) eg.style.display = 'none'; if (getEl('providerTxIdError')) { getEl('providerTxIdError').textContent = valid.error; getEl('providerTxIdError').style.display = 'block'; } } });
    safe('receiptCloseXBtn', 'click', function(e) { e.preventDefault(); getEl('receiptModal').style.display = 'none'; });
    safe('receiptCloseBtn', 'click', function(e) { e.preventDefault(); getEl('receiptModal').style.display = 'none'; });
    safe('chatToggleBtn', 'click', function(e) { e.preventDefault(); toggleChat(); });
    safe('chatCloseBtn', 'click', function(e) { e.preventDefault(); getEl('chatWindow').classList.remove('open'); getEl('chatToggleBtn').style.display = 'flex'; });
    safe('convCloseBtn', 'click', function(e) { e.preventDefault(); getEl('currencyConverterModal').style.display = 'none'; });
    safe('converterCloseXBtn', 'click', function(e) { e.preventDefault(); getEl('currencyConverterModal').style.display = 'none'; });
    safe('convFromCurrency', 'change', updateConverterModal);
    safe('convCountrySelect', 'change', updateConverterModal);
    safe('convAmount', 'input', updateConverterModal);
    safe('mapButton', 'click', function(e) { e.preventDefault(); const city = getEl('profileCity').innerText; const country = getEl('profileCountry').innerText; getEl('mapIframe').src = 'https://www.google.com/maps?q=' + encodeURIComponent(city + ', ' + country) + '&output=embed'; getEl('mapModal').style.display = 'flex'; });
    document.querySelectorAll('.modal').forEach(function(m) { m.addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; }); });
    setupAgentDashboardEvents();
}

function openAddBizModal() { try { populateCountryDropdown('bizCountrySelect'); } catch(err) {} try { populateCapitalCityDropdown('bizCitySelect'); } catch(err) {} const resetVal = function(id, v) { const e = getEl(id); if (e) e.value = v; }; resetVal('bizName', ''); resetVal('bizContact', ''); resetVal('bizMobileMoney', ''); resetVal('bizType', 'Service'); resetVal('bizIcon', '🏪'); resetVal('bizCountrySelect', (currentUser && currentUser.country) || 'Sierra Leone'); getEl('addBizModal').style.display = 'flex'; }

function initApp() {
    function safeCall(label, fn) { try { fn(); } catch (e) { console.error('❌ init step failed:', label, e); } }
    safeCall('load registered users', function() { loadRegisteredUsers(); });
    safeCall('seed agents', function() { initializePermanentAgents(); });
    safeCall('sync agents', function() { syncConnectedUsersFromRegistered(); });
    safeCall('load provider tx ids', function() { ProviderTxIdManager.loadUsedIds(); });
    safeCall('load transfer codes', function() { TransferCodeManager.loadUsedCodes(); });
    safeCall('load language', function() { const s = localStorage.getItem('afripay_lang'); if (s) currentLang = s; });
    safeCall('load custom businesses', function() { loadCustomBusinesses(); });
    safeCall('load pending items', function() { PendingStore.load(); });
    safeCall('load dash clients', function() { loadDashClients(); });
    safeCall('load stored user', function() { loadStoredUser(); });
    safeCall('populate dropdowns', function() { populateAllDropdowns(); });
    safeCall('populate collateral', function() { populateCollateralDropdowns(); });
    safeCall('populate country codes', function() { populateCountryCodeSelect(); });
    safeCall('populate inline converter', function() { populateInlineConverter(); });
    safeCall('populate modal converter', function() { populateConverterDropdowns(); });
    safeCall('render business strip', function() { renderBusinessStrip(); });
    safeCall('render header flags', function() { renderHeaderFlags(); });
    safeCall('setup event listeners', function() { setupEventListeners(); });
    safeCall('ensure select population', function() { ensureSelectsArePopulated(); });
    safeCall('render agent dropdown', function() { renderAgentDropdown(null); });
    safeCall('populate agent select', function() { populateAgentSelect(null); });
    safeCall('set lang select', function() { const s = getEl('langSelect'); if (s) s.value = currentLang; });
    safeCall('translate page', function() { translatePage(); });
    safeCall('first toast', function() { showToast('✅ AfriPay ready!', 1500); });
    safeCall('init register avatar preview', function() { updateRegAvatarPreview(); });
    safeCall('init agent biz profile preview', function() { updateAgentBizProfilePreview(); });
    safeCall('compute charges', function() { computeCharges(); });
    safeCall('init popup ads', function() { setTimeout(initPopupAds, 1000); });
    setTimeout(function() { try { renderAgentDropdown(currentAgentFilterCountry); } catch(e) {} try { populateAgentSelect(currentAgentFilterCountry); } catch(e) {} }, 300);
    (async function initSupabaseSync() { if (!Supa.isReady()) return; try { await supaRefreshAgents(); subscribeAgentRealtime(); } catch (e) {} })();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(initApp, 50);
else document.addEventListener('DOMContentLoaded', function() { setTimeout(initApp, 50); });

/* STANDALONE REPORT MODULE */
(function initReportModule() {
    function boot() {
        var reportBtn = document.getElementById('reportAppBtn'); var reportModal = document.getElementById('reportModal'); var submitBtn = document.getElementById('submitReportBtn');
        if (!reportModal || !reportBtn || !submitBtn) return; if (reportBtn.dataset.reportBound === '1') return; reportBtn.dataset.reportBound = '1';
        reportBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); var errEl = document.getElementById('reportError'); var okEl = document.getElementById('reportSuccess'); if (errEl) errEl.textContent = ''; if (okEl) okEl.textContent = ''; try { if (typeof currentUser !== 'undefined' && currentUser) { var nameField = document.getElementById('reportName'); var phoneField = document.getElementById('reportPhone'); if (nameField && !nameField.value) nameField.value = currentUser.name || ''; if (phoneField && !phoneField.value) phoneField.value = currentUser.phone || ''; } } catch (e) {} reportModal.style.display = 'flex'; });
        submitBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); var errEl = document.getElementById('reportError'); var okEl = document.getElementById('reportSuccess'); if (errEl) errEl.textContent = ''; if (okEl) okEl.textContent = ''; var name = (document.getElementById('reportName').value || '').trim(); var phone = (document.getElementById('reportPhone').value || '').trim(); var category = document.getElementById('reportCategory').value; var details = (document.getElementById('reportDetails').value || '').trim(); if (!name) { if (errEl) errEl.textContent = '❌ Enter your name.'; return; } if (!phone) { if (errEl) errEl.textContent = '❌ Enter your phone number.'; return; } if (!category) { if (errEl) errEl.textContent = '❌ Select a category.'; return; } if (!details) { if (errEl) errEl.textContent = '❌ Describe the issue.'; return; } var complaint = { name: name, phone: phone, category: category, details: details }; try { if (typeof Supa !== 'undefined' && Supa.isReady && Supa.isReady()) Supa.saveComplaint(complaint).catch(function(err) { console.warn('⚠️ Report cloud save failed:', err && err.message); }); } catch (e) {} try { var list = JSON.parse(localStorage.getItem('afripay_complaints') || '[]'); list.push(Object.assign({}, complaint, { submittedAt: new Date().toISOString() })); localStorage.setItem('afripay_complaints', JSON.stringify(list)); } catch (e) {} if (okEl) okEl.textContent = '✅ Report submitted. Thank you!'; try { if (typeof showToast === 'function') showToast('🚨 Report submitted', 2200); } catch (e) {} document.getElementById('reportName').value = ''; document.getElementById('reportPhone').value = ''; document.getElementById('reportCategory').value = ''; document.getElementById('reportDetails').value = ''; setTimeout(function() { reportModal.style.display = 'none'; }, 1200); });
        reportModal.addEventListener('click', function(e) { if (e.target === reportModal) reportModal.style.display = 'none'; });
        console.log('✅ Report module initialized');
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    setTimeout(function() { if (!document.getElementById('reportModal')) return; var btn = document.getElementById('reportAppBtn'); if (btn && !btn.dataset.reportBound) boot(); }, 800);
})();

/* AGENT REGISTRATION HELPERS — GAMBIA-AWARE USSD + AGREEMENT */
(function initAgentRegistrationHelpers() {
    var AGREEMENT_KEY = 'afripay_agent_agreement_signed';
    function boot() {
        var ussdBtn = document.getElementById('generateCollateralBtn'); var agreementBtn = document.getElementById('viewAgreementBtn');
        var ussdDisplay = document.getElementById('collateralUssdDisplay'); var ussdError = document.getElementById('collateralError'); var agreementModal = document.getElementById('agreementModal');
        if (!ussdBtn && !agreementBtn) return;
        if (ussdBtn && !ussdBtn.dataset.ussdBound) {
            ussdBtn.dataset.ussdBound = '1';
            ussdBtn.addEventListener('click', function(e) {
                e.preventDefault(); e.stopPropagation();
                if (ussdError) ussdError.textContent = ''; if (ussdDisplay) { ussdDisplay.textContent = ''; ussdDisplay.style.display = 'none'; }
                var bizName = (document.getElementById('agentBusinessName') || {}).value || ''; var mobile = (document.getElementById('agentMobileMoney') || {}).value || ''; var collat = (document.getElementById('agentCollateralLimit') || {}).value || ''; var cc = (document.getElementById('agentCountryCode') || {}).value || '+232';
                bizName = bizName.trim(); mobile = mobile.replace(/\D/g, ''); collat = parseFloat(collat) || 0;
                if (!bizName) { if (ussdError) ussdError.textContent = '❌ Enter the Business name first.'; return; }
                if (mobile.length < 6) { if (ussdError) ussdError.textContent = '❌ Enter a valid Mobile Money number.'; return; }
                if (collat <= 0) { if (ussdError) ussdError.textContent = '❌ Select a collateral amount.'; return; }
                var routeLabel, ussd;
                if (typeof isGambianPhone === 'function' && isGambianPhone(mobile)) {
                    ussd = '*777*1*4*2*1*23280422698*' + String(Math.round(collat)) + '*KKKK#';
                    routeLabel = 'Gambia Business Payback (777)';
                } else {
                    var route;
                    try { route = (typeof getUssdTemplateForPhone === 'function') ? getUssdTemplateForPhone(mobile) : null; } catch (e) { route = null; }
                    if (!route) route = { template: '#144*2*2*{AGENT}*{AMOUNT}*0000#', label: 'MB-FOUR (144)' };
                    routeLabel = route.label;
                    ussd = String(route.template).replace(/\{AGENT\}/g, mobile).replace(/\{AMOUNT\}/g, String(Math.round(collat)));
                }
                if (ussdDisplay) { ussdDisplay.textContent = ussd; ussdDisplay.style.display = 'block'; ussdDisplay.title = 'Tap to copy'; ussdDisplay.style.cursor = 'pointer'; ussdDisplay.onclick = function() { try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ussd).then(function() { if (typeof showToast === 'function') showToast('📋 USSD copied', 1600); }); else { var ta = document.createElement('textarea'); ta.value = ussd; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); if (typeof showToast === 'function') showToast('📋 USSD copied', 1600); } } catch (err) {} }; }
                try { if (typeof showMbFourUssdModal === 'function') showMbFourUssdModal({ agentName: bizName, agentPhone: mobile, agentCountryCode: cc, amount: Math.round(collat), routeLabel: routeLabel, ussd: ussd }); } catch (err) {}
                if (typeof showToast === 'function') showToast('✅ USSD code generated', 1600);
            });
        }
        if (agreementBtn && !agreementBtn.dataset.agreementBound) {
            agreementBtn.dataset.agreementBound = '1';
            agreementBtn.addEventListener('click', function(e) {
                e.preventDefault(); e.stopPropagation();
                if (!agreementModal) { if (typeof showToast === 'function') showToast('⚠️ Agreement modal missing', 2200); return; }
                var body = document.getElementById('agreementBody');
                if (body && !body.dataset.populated) { body.dataset.populated = '1'; var bizName = ((document.getElementById('agentBusinessName') || {}).value || '').trim() || 'the Agent'; var collat = parseFloat((document.getElementById('agentCollateralLimit') || {}).value) || 0; var cc = ((document.getElementById('agentCountryCode') || {}).value || '').trim() || '+232'; body.innerHTML = '<p style="margin-bottom:10px;line-height:1.5;">This <strong>AfriPay Agent Agreement</strong> is entered into between <strong>AfriPay</strong> and <strong>' + (bizName.replace(/[<>&"\'\/]/g, '')) + '</strong> ("the Agent") under the following terms:</p><ol style="padding-left:20px;line-height:1.6;"><li>The Agent agrees to comply with all AfriPay transfer rules and applicable mobile-money regulations.</li><li>The Agent has pledged a collateral of <strong>' + collat.toLocaleString() + '</strong> units for the country code <strong>' + cc + '</strong> as security against any losses arising from misuse.</li><li>The Agent is responsible for verifying sender and client details before processing any transaction.</li><li>All fees (Carrear 3%, Local Transfer 1%, Services 1%) are non-refundable once a transaction is confirmed.</li><li>AfriPay may suspend or revoke this agreement if the Agent violates any of the above terms.</li><li>This agreement is effective immediately upon acceptance and remains in force until terminated.</li></ol><p style="margin-top:10px;font-size:.78rem;color:#7f8c8d;">By tapping <strong>Agree</strong>, you acknowledge that you have read and accept these terms.</p>'; }
                var agreeBtn = document.getElementById('agreementAgreeBtn'); var statusTxt = document.getElementById('agreementStatusText');
                var alreadySigned = false; try { alreadySigned = localStorage.getItem(AGREEMENT_KEY) === '1'; } catch (err) {}
                if (agreeBtn) { if (alreadySigned) { agreeBtn.disabled = true; agreeBtn.textContent = '✅ Signed'; } else { agreeBtn.disabled = false; agreeBtn.textContent = '✋ Agree'; } }
                if (statusTxt) { if (alreadySigned) { statusTxt.textContent = 'Signed'; statusTxt.style.color = '#27ae60'; } else { statusTxt.textContent = 'Not Signed'; statusTxt.style.color = '#e74c3c'; } }
                agreementModal.style.display = 'flex';
            });
            var agreeBtnEl = document.getElementById('agreementAgreeBtn');
            if (agreeBtnEl && !agreeBtnEl.dataset.bound) { agreeBtnEl.dataset.bound = '1'; agreeBtnEl.addEventListener('click', function(e) { e.preventDefault(); try { localStorage.setItem(AGREEMENT_KEY, '1'); } catch (err) {} try { agreementSigned = true; } catch (err) {} var statusTxt = document.getElementById('agreementStatusText'); if (statusTxt) { statusTxt.textContent = 'Signed'; statusTxt.style.color = '#27ae60'; } this.disabled = true; this.textContent = '✅ Signed'; if (typeof showToast === 'function') showToast('✅ Agreement signed', 1800); }); }
            ['agreementCloseXBtn', 'agreementCloseBtn'].forEach(function(id) { var b = document.getElementById(id); if (b && !b.dataset.bound) { b.dataset.bound = '1'; b.addEventListener('click', function(e) { e.preventDefault(); if (agreementModal) agreementModal.style.display = 'none'; }); } });
            if (!agreementModal.dataset.backdropBound) { agreementModal.dataset.backdropBound = '1'; agreementModal.addEventListener('click', function(e) { if (e.target === agreementModal) agreementModal.style.display = 'none'; }); }
            try { if (localStorage.getItem(AGREEMENT_KEY) === '1') { var statusTxt2 = document.getElementById('agreementStatusText'); if (statusTxt2) { statusTxt2.textContent = 'Signed'; statusTxt2.style.color = '#27ae60'; } } } catch (err) {}
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    setTimeout(function() { var u = document.getElementById('generateCollateralBtn'); var a = document.getElementById('viewAgreementBtn'); if ((u && !u.dataset.ussdBound) || (a && !a.dataset.agreementBound)) boot(); }, 800);
})();

/* CHAT MODULE */
(function initChatModule() {
    const DEVELOPER_KEY = 'dev_amine'; const DEVELOPER_NAME = 'AfriPay Developer';
    let currentConvo = null; let unsubRealtime = null; let membersCache = []; let currentUserKey = null; let currentUserName = null;
    function el(id) { return document.getElementById(id); }
    function toast(m, d) { try { if (typeof showToast === 'function') showToast(m, d || 2000); } catch (e) {} }
    function esc(s) { if (s == null) return ''; return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
    function fmtTime(iso) { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
    function fmtDateTime(d) { try { return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
    function getMyKey() { if (typeof currentUser !== 'undefined' && currentUser && currentUser.id) return currentUser.id; if (typeof currentUser !== 'undefined' && currentUser && currentUser.phone) return 'user_' + currentUser.phone; let g = localStorage.getItem('afripay_guest_key'); if (!g) { g = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); localStorage.setItem('afripay_guest_key', g); } return g; }
    function getMyName() { if (typeof currentUser !== 'undefined' && currentUser && currentUser.name) return currentUser.name; return 'Guest'; }
    function buildConvoId(a, b) { return [a, b].sort().join('__'); }
    function supaReady() { try { return typeof Supa !== 'undefined' && Supa.isReady && Supa.isReady() && typeof supabaseClient !== 'undefined' && supabaseClient; } catch (e) { return false; } }
    async function ensureConversation(keyA, keyB) { const convoId = buildConvoId(keyA, keyB); if (!supaReady()) return { convo_id: convoId, participant_a: keyA, participant_b: keyB }; try { const { data: existing } = await supabaseClient.from('chat_conversations').select('*').eq('convo_id', convoId).maybeSingle(); if (existing) return existing; const { data, error } = await supabaseClient.from('chat_conversations').insert({ convo_id: convoId, participant_a: keyA, participant_b: keyB }).select().single(); if (error) throw error; return data; } catch (e) { return { convo_id: convoId, participant_a: keyA, participant_b: keyB }; } }
    async function fetchMessages(convoId) { if (!supaReady()) { try { return JSON.parse(localStorage.getItem('chat_local_' + convoId) || '[]'); } catch (e) { return []; } } try { const { data, error } = await supabaseClient.from('chat_messages').select('*').eq('convo_id', convoId).order('created_at', { ascending: true }).limit(300); if (error) throw error; return data || []; } catch (e) { return []; } }
    function renderMessage(msg) { const mine = msg.sender_key === currentUserKey; const wrap = document.createElement('div'); wrap.className = 'chat-msg ' + (mine ? 'mine' : 'theirs'); const body = msg.body || ''; let bodyHtml = ''; let m; if ((m = body.match(/^\[img\](.+)$/))) bodyHtml = '<img class="chat-img" src="' + esc(m[1]) + '" alt="image" />'; else if ((m = body.match(/^\[audio\](.+)$/))) bodyHtml = '<audio controls src="' + esc(m[1]) + '"></audio>'; else if ((m = body.match(/^\[video\](.+)$/))) bodyHtml = '<video controls src="' + esc(m[1]) + '"></video>'; else bodyHtml = esc(body).replace(/\n/g, '<br>'); wrap.innerHTML = '<div class="msg-head"><strong>' + esc(msg.sender_name || (mine ? 'You' : 'User')) + '</strong> · ' + esc(fmtTime(msg.created_at)) + '</div><div class="msg-body">' + bodyHtml + '</div>'; if (msg.id) wrap.dataset.msgId = msg.id; return wrap; }
    async function paintMessages() { const list = el('chatMessages'); if (!list) return; const hint = el('chatEmptyHint'); if (!currentConvo) { list.innerHTML = ''; if (hint) { hint.style.display = 'block'; list.appendChild(hint); } return; } if (hint) hint.style.display = 'none'; list.innerHTML = '<div style="text-align:center;color:#95a5a6;font-size:.75rem;padding:8px;">Loading…</div>'; const msgs = await fetchMessages(currentConvo.convoId); list.innerHTML = ''; if (!msgs.length) list.innerHTML = '<div style="text-align:center;color:#95a5a6;font-size:.78rem;padding:20px;">No messages yet. Say hello 👋</div>'; else msgs.forEach(m => list.appendChild(renderMessage(m))); list.scrollTop = list.scrollHeight; }
    function subscribeRealtime(convoId) { if (unsubRealtime) { try { unsubRealtime(); } catch (e) {} unsubRealtime = null; } if (!supaReady() || !convoId) return; try { const channel = supabaseClient.channel('chat:' + convoId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'convo_id=eq.' + convoId }, (payload) => { const list = el('chatMessages'); if (!list || !payload || !payload.new) return; if (list.querySelector('[data-msg-id="' + payload.new.id + '"]')) return; const node = renderMessage(payload.new); node.dataset.msgId = payload.new.id; const hintNode = list.querySelector('div[style*="No messages"]'); if (hintNode) hintNode.remove(); list.appendChild(node); list.scrollTop = list.scrollHeight; }).subscribe(); unsubRealtime = () => { try { supabaseClient.removeChannel(channel); } catch (e) {} }; } catch (e) {} }
    async function sendMessage(rawBody) { const body = (rawBody || '').trim(); if (!body) { toast('⚠️ Type a message first', 1500); return; } if (!currentConvo) { toast('⚠️ Select a conversation first', 2000); return; } const convoId = currentConvo.convoId; const payload = { convo_id: convoId, sender_key: currentUserKey, sender_name: currentUserName, body: body }; const list = el('chatMessages'); if (list) { const emptyHint = list.querySelector('div[style*="No messages"]'); if (emptyHint) emptyHint.remove(); const optimistic = renderMessage({ sender_key: currentUserKey, sender_name: currentUserName, body: body, created_at: new Date().toISOString() }); list.appendChild(optimistic); list.scrollTop = list.scrollHeight; } if (supaReady()) { try { const { data, error } = await supabaseClient.from('chat_messages').insert(payload).select().single(); if (error) throw error; if (list && data && data.id) { const nodes = list.querySelectorAll('.chat-msg'); const last = nodes[nodes.length - 1]; if (last && !last.dataset.msgId) last.dataset.msgId = data.id; } try { await supabaseClient.from('chat_conversations').update({ last_message: body, last_message_at: new Date().toISOString() }).eq('convo_id', convoId); } catch (e2) {} } catch (e) { const arr = JSON.parse(localStorage.getItem('chat_local_' + convoId) || '[]'); arr.push({ id: 'local_' + Date.now(), ...payload, created_at: new Date().toISOString() }); localStorage.setItem('chat_local_' + convoId, JSON.stringify(arr)); } } else { const arr = JSON.parse(localStorage.getItem('chat_local_' + convoId) || '[]'); arr.push({ id: 'local_' + Date.now(), ...payload, created_at: new Date().toISOString() }); localStorage.setItem('chat_local_' + convoId, JSON.stringify(arr)); } }
    async function openConversation(opts) { currentConvo = opts; const contactEl = el('chatContact'); if (contactEl) contactEl.textContent = opts.title || 'Conversation'; await paintMessages(); subscribeRealtime(opts.convoId); const inp = el('chatInput'); if (inp) inp.focus(); }
    async function openDirectChat(targetKey, targetName) { const conv = await ensureConversation(currentUserKey, targetKey); await openConversation({ convoId: conv.convo_id, title: targetName || targetKey, kind: 'direct', targetKey: targetKey, targetName: targetName }); }
    async function openGroupChat(kind) { const convoId = 'group_' + kind; const titles = { agents: '🏢 All Agents', users: '👤 All Users', clients: '👥 All Clients', developer: '🧑‍💻 Direct Developer' }; if (kind === 'developer') { await openDirectChat(DEVELOPER_KEY, DEVELOPER_NAME); return; } if (supaReady()) { try { const { data: existing } = await supabaseClient.from('chat_conversations').select('*').eq('convo_id', convoId).maybeSingle(); if (!existing) await supabaseClient.from('chat_conversations').insert({ convo_id: convoId, participant_a: convoId, participant_b: currentUserKey }); } catch (e) {} } await openConversation({ convoId: convoId, title: titles[kind] || ('Group: ' + kind), kind: 'group-' + kind, targetKey: convoId, targetName: titles[kind] }); }
    async function collectMembers() { const online = []; const all = []; if (typeof currentUser !== 'undefined' && currentUser && currentUser.name) online.push({ key: currentUserKey, name: (currentUser.name || 'You') + ' (you)', emoji: currentUser.emoji || '👤', isOnline: true, role: 'user' }); try { const agents = JSON.parse(localStorage.getItem('afripay_registered_users') || '[]'); agents.forEach(a => { if (a.role === 'agent' || a.isAgent === true || a.businessName) all.push({ key: a.id || ('agent_' + (a.businessName || '').replace(/\W/g, '').toLowerCase()), name: a.businessName || a.name || 'Agent', emoji: a.emoji || '🏢', isOnline: a.approved === true, role: 'agent' }); else if (a.name && a.phone) all.push({ key: a.id || ('user_' + a.phone), name: a.name, emoji: a.emoji || '👤', isOnline: false, role: 'user' }); }); } catch (e) {} if (supaReady()) { try { const { data } = await supabaseClient.from('agent_clients').select('id,name,phone').limit(50); (data || []).forEach(c => { all.push({ key: 'client_' + (c.id || c.phone), name: c.name || c.phone || 'Client', emoji: '👥', isOnline: false, role: 'client' }); }); } catch (e) {} } all.push({ key: DEVELOPER_KEY, name: DEVELOPER_NAME, emoji: '🧑‍💻', isOnline: true, role: 'developer' }); const seen = new Set(); const dedup = (arr) => arr.filter(x => { if (!x.key || seen.has(x.key)) return false; seen.add(x.key); return true; }); const onlineDedup = dedup(online.slice()); const rest = dedup(all); membersCache = onlineDedup.concat(rest); return { online: onlineDedup, all: membersCache }; }
    async function refreshMembers() { const onlineList = el('chatOnlineList'); const allList = el('chatMemberList'); const onlineCount = el('chatOnlineCount'); const memberCount = el('chatMemberCount'); if (!onlineList || !allList) return; const { online, all } = await collectMembers(); onlineList.innerHTML = ''; allList.innerHTML = ''; if (!online.length) onlineList.innerHTML = '<div class="chat-member" style="color:#95a5a6;">No one online</div>'; else online.forEach(m => onlineList.appendChild(makeMemberRow(m, true))); const onlineKeys = new Set(online.map(x => x.key)); const rest = all.filter(x => !onlineKeys.has(x.key)); if (!rest.length) allList.innerHTML = '<div class="chat-member" style="color:#95a5a6;">No other members</div>'; else rest.forEach(m => allList.appendChild(makeMemberRow(m, false))); if (onlineCount) onlineCount.textContent = online.length; if (memberCount) memberCount.textContent = all.length; }
    function makeMemberRow(m, isOnline) { const row = document.createElement('div'); row.className = 'chat-member' + (isOnline ? ' online' : ''); row.innerHTML = '<div class="avatar">' + (m.emoji || '👤') + '</div><div class="name">' + esc(m.name) + '</div>'; row.addEventListener('click', function() { if (m.key === currentUserKey) { toast('This is you 🙂', 1500); return; } openDirectChat(m.key, m.name); }); return row; }
    let dtTimer = null;
    function startDatetimeTicker() { const elm = el('chatDatetime'); if (!elm) return; if (dtTimer) clearInterval(dtTimer); const tick = () => { elm.textContent = fmtDateTime(new Date()); }; tick(); dtTimer = setInterval(tick, 30000); }
    function bind() { currentUserKey = getMyKey(); currentUserName = getMyName(); const groupsBtn = el('chatGroupsBtn'); const groupsMenu = el('chatGroupsMenu'); if (groupsBtn && groupsMenu && !groupsBtn.dataset.bound) { groupsBtn.dataset.bound = '1'; groupsBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); groupsMenu.classList.toggle('open'); }); document.addEventListener('click', function(e) { const wrap = groupsBtn.parentElement; if (wrap && !wrap.contains(e.target)) groupsMenu.classList.remove('open'); }); groupsMenu.querySelectorAll('[data-group]').forEach(b => { b.addEventListener('click', async function(e) { e.preventDefault(); e.stopPropagation(); groupsMenu.classList.remove('open'); await openGroupChat(b.getAttribute('data-group')); }); }); } const sendBtn = el('chatSendBtn'); const input = el('chatInput'); if (sendBtn && input && !sendBtn.dataset.bound) { sendBtn.dataset.bound = '1'; sendBtn.addEventListener('click', async function(e) { e.preventDefault(); const v = input.value; input.value = ''; await sendMessage(v); input.focus(); }); input.addEventListener('keydown', async function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const v = input.value; input.value = ''; await sendMessage(v); } }); } bindMediaButtons(); const toggleRight = el('chatToggleRightBarBtn'); const rightBar = el('chatRightbar'); if (toggleRight && rightBar && !toggleRight.dataset.bound) { toggleRight.dataset.bound = '1'; toggleRight.addEventListener('click', function(e) { e.preventDefault(); rightBar.style.display = (rightBar.style.display === 'none') ? 'flex' : 'none'; }); } const chatToggle = el('chatToggleBtn'); if (chatToggle && !chatToggle.dataset.chatBound) { chatToggle.dataset.chatBound = '1'; chatToggle.addEventListener('click', function() { setTimeout(refreshMembers, 100); startDatetimeTicker(); }); } refreshMembers(); startDatetimeTicker(); const hint = el('chatEmptyHint'); if (hint) hint.style.display = 'block'; console.log('✅ Chat module initialized'); }
    function bindMediaButtons() { const audioCall = el('chatAudioCallBtn'); const videoCall = el('chatVideoCallBtn'); const audioMsg = el('chatAudioMsgBtn'); const videoMsg = el('chatVideoMsgBtn'); const imagePost = el('chatImagePostBtn'); const audioInput = el('chatAudioInput'); const videoInput = el('chatVideoInput'); const imageInput = el('chatImageInput'); if (audioCall && !audioCall.dataset.bound) { audioCall.dataset.bound = '1'; audioCall.addEventListener('click', function() { if (!currentConvo) { toast('⚠️ Open a conversation first', 2000); return; } toast('📞 Audio call requested with ' + (currentConvo.targetName || currentConvo.title), 2600); }); } if (videoCall && !videoCall.dataset.bound) { videoCall.dataset.bound = '1'; videoCall.addEventListener('click', function() { if (!currentConvo) { toast('⚠️ Open a conversation first', 2000); return; } toast('🎥 Video call requested with ' + (currentConvo.targetName || currentConvo.title), 2600); }); } if (audioMsg && audioInput && !audioMsg.dataset.bound) { audioMsg.dataset.bound = '1'; audioMsg.addEventListener('click', () => audioInput.click()); audioInput.addEventListener('change', function() { const f = this.files && this.files[0]; if (!f) return; if (!currentConvo) { toast('⚠️ Open a conversation first', 2000); return; } const r = new FileReader(); r.onload = (ev) => sendMessage('[audio]' + ev.target.result); r.readAsDataURL(f); this.value = ''; }); } if (videoMsg && videoInput && !videoMsg.dataset.bound) { videoMsg.dataset.bound = '1'; videoMsg.addEventListener('click', () => videoInput.click()); videoInput.addEventListener('change', function() { const f = this.files && this.files[0]; if (!f) return; if (!currentConvo) { toast('⚠️ Open a conversation first', 2000); return; } if (f.size > 2 * 1024 * 1024) { toast('⚠️ Video too large (max 2 MB)', 2600); this.value = ''; return; } const r = new FileReader(); r.onload = (ev) => sendMessage('[video]' + ev.target.result); r.readAsDataURL(f); this.value = ''; }); } if (imagePost && imageInput && !imagePost.dataset.bound) { imagePost.dataset.bound = '1'; imagePost.addEventListener('click', () => imageInput.click()); imageInput.addEventListener('change', function() { const f = this.files && this.files[0]; if (!f) return; if (!currentConvo) { toast('⚠️ Open a conversation first', 2000); return; } const r = new FileReader(); r.onload = (ev) => sendMessage('[img]' + ev.target.result); r.readAsDataURL(f); this.value = ''; }); } }
    function boot() { if (!el('chatWindow')) return; if (el('chatWindow').dataset.chatBound === '1') return; el('chatWindow').dataset.chatBound = '1'; bind(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    setTimeout(function() { if (el('chatWindow') && el('chatWindow').dataset.chatBound !== '1') boot(); }, 900);
})();

/* DELIVER MODULE — GAMBIA-AWARE */
try {
(function initDeliverModule() {
    const DELIVER_PREFIX_144 = ['78','79','76','75','73','74'];
    const DELIVER_PREFIX_161 = ['88','99','77','33','30','80','70','90'];
    let dealMessages = []; let currentDeliverSeed = null;
    function el(id) { return document.getElementById(id); }
    function esc(s) { if (s==null) return ''; return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function toast(m,d) { try { if (typeof showToast==='function') showToast(m,d||2000); } catch(e){} }
    function getCurrentAgent() { try { if (typeof dashCurrentAgentId === 'undefined' || !dashCurrentAgentId) return null; if (typeof getAgents !== 'function') return null; const a = getAgents().find(x => x.id === dashCurrentAgentId); return a ? (a.agentData || a) : null; } catch (e) { return null; } }
    function pickUssdForAgent(agent) {
        const phone = String((agent && (agent.mobileMoney || agent.phone)) || '').replace(/\D/g,'');
        if (typeof isGambianPhone === 'function' && isGambianPhone(phone)) { const m = (typeof getGambiaDestinationDial === 'function') ? getGambiaDestinationDial() : '232'; if (m === '220') { return { template: '*777*1*{AGENT}*{AMOUNT}*KKKK#', label: 'Gambia Local (777)' }; } return { template: '*144*1*4*' + m + '*{AGENT}#', label: 'Gambia Agent → Intl (144 / ' + m + ')' }; }
        let local = phone;
        if (local.indexOf('232') === 0) local = local.slice(3);
        if (local.indexOf('0') === 0) local = local.slice(1);
        const two = local.slice(0, 2);
        if (DELIVER_PREFIX_144.indexOf(two) !== -1) return { template: '#144*2*5*1*{CC}#', label: 'Dial 144' };
        if (DELIVER_PREFIX_161.indexOf(two) !== -1) return { template: '*161*1*6*1*{CC}#', label: 'Dial 161' };
        return { template: '#144*2*5*1*{CC}#', label: 'Dial 144' };
    }
    function getCountryDialCode(countryName) { const map = { 'Sierra Leone':'232','Guinea':'224','Senegal':'221','Liberia':'231','Ghana':'233','Nigeria':'234','Kenya':'254','Mali':'223','Ivory Coast':'225','Niger':'227','Benin':'229','Guinea Bissau':'245','Gambia':'220','Togo':'228','Central Africa Rep':'236','Ethiopia':'251','Gabon':'241','Madagascar':'261','Morocco':'212','Rwanda':'250','Uganda':'256','DR Congo':'243','Burkina Faso':'226' }; return map[countryName] || '232'; }
    function fillCountrySelect() { const sel = el('deliverCountrySelect'); if (!sel) return; if (sel.options.length > 0) return; try { if (typeof SUPPORTED_CURRENCIES !== 'undefined') sel.innerHTML = SUPPORTED_CURRENCIES.map(c => '<option value="' + esc(c.name) + '">' + c.flag + ' ' + esc(c.name) + '</option>').join(''); } catch (e) {} }
    function updateUssd() { const agent = getCurrentAgent(); if (!agent) { if (el('deliverUssdBox')) el('deliverUssdBox').textContent = '—'; return; } const countryName = (el('deliverCountrySelect') || {}).value || ''; const cc = getCountryDialCode(countryName); const route = pickUssdForAgent(agent); const ussd = route.template.replace('{CC}', cc).replace('{M}', cc).replace('{AGENT}', ''); if (el('deliverUssdBox')) el('deliverUssdBox').textContent = ussd; }
    function prefillFromTransaction(tx) { if (!tx) return; const set = (id, v) => { const e = el(id); if (e) e.value = v || ''; }; set('deliverSenderName', tx.senderName || (tx.sender||'').split('(')[0].trim()); set('deliverSenderPhone', tx.senderPhone || ''); if (tx.clientName) set('deliverClientName', tx.clientName); if (tx.clientPhone) set('deliverClientPhone', tx.clientPhone); set('deliverAmount', tx.amount || tx.baseAmount || ''); set('deliverCurrency', tx.currency || 'SLL'); set('deliverLocalAgentName', tx.localAgentName || ''); set('deliverLocalAgentPhone', tx.localAgentPhone || ''); set('deliverTxId', tx.txId || ''); set('deliverProviderTxId', tx.providerTxId || ''); set('deliverTransferCode', tx.transferCode || ''); updateUssd(); }
    function normalizeDeal(d) { return { senderName: d.sender_name || d.senderName || '', senderPhone: d.sender_phone || d.senderPhone || '', clientName: d.client_name || d.clientName || '', clientPhone: d.client_phone || d.clientPhone || '', amount: d.amount || 0, currency: d.currency || 'SLL', localAgentName: d.agent_name || d.agentName || '', localAgentPhone: d.agent_phone || d.agentPhone || '', txId: d.tx_id || d.txId || '', providerTxId: d.provider_tx_id || d.providerTxId || '', transferCode: d.transfer_code || d.transferCode || '' }; }
    async function loadDeals() {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) { refreshDealsUI(); return; }
        const agent = getCurrentAgent(); if (!agent) { refreshDealsUI(); return; }
        try { const { data, error } = await supabaseClient.from('transactions').select('*').eq('agent_name', agent.businessName || agent.name || '').order('created_at', { ascending: false }).limit(20); if (error) throw error; const rows = data || []; dealMessages = []; for (const r of rows) { const deal = normalizeDeal(r); if ((!deal.clientName || !deal.clientPhone) && deal.senderPhone) { try { const { data: clientRow } = await supabaseClient.from('agent_clients').select('name, phone').eq('phone', deal.senderPhone).maybeSingle(); if (clientRow) { if (!deal.clientName) deal.clientName = clientRow.name || ''; if (!deal.clientPhone) deal.clientPhone = clientRow.phone || ''; } } catch (e) {} } dealMessages.push(deal); } } catch (e) { console.warn('loadDeals:', e); dealMessages = []; }
        refreshDealsUI();
    }
    function refreshDealsUI() { const btn = el('deliverDealsBtn'); const countEl = el('deliverDealsCount'); const menu = el('deliverDealsMenu'); if (!btn) return; const n = dealMessages.length; btn.classList.remove('has-deals','no-deals'); if (n > 0) { btn.classList.add('has-deals'); if (countEl) { countEl.style.display = 'inline'; countEl.textContent = n; } } else { btn.classList.add('no-deals'); if (countEl) { countEl.style.display = 'none'; } } if (!menu) return; if (!n) { menu.innerHTML = ''; return; } menu.innerHTML = dealMessages.map((d,i) => '<div class="deliver-deal-item" data-deal-idx="' + i + '"><span class="deal-icon">💸</span><div class="deal-info"><div class="deal-title">' + esc(d.senderName || 'Sender') + ' → ' + esc(d.amount) + ' ' + esc(d.currency) + '</div><div class="deal-sub">' + esc(d.txId || '—') + ' · ' + esc(d.senderPhone || '') + '</div></div></div>').join(''); menu.querySelectorAll('[data-deal-idx]').forEach(row => { row.addEventListener('click', function() { const idx = parseInt(this.getAttribute('data-deal-idx'), 10); const deal = dealMessages[idx]; if (!deal) return; prefillFromTransaction(deal); menu.classList.remove('open'); toast('✅ Deal loaded', 2000); }); }); }
    function bind() { const openBtn = el('openDeliverBtn'); const modal = el('deliverModal'); if (openBtn && !openBtn.dataset.bound) { openBtn.dataset.bound = '1'; openBtn.addEventListener('click', function(e) { e.preventDefault(); if (!modal) return; fillCountrySelect(); loadDeals(); prefillFromTransaction(currentDeliverSeed || null); if (el('deliverError')) el('deliverError').textContent = ''; if (el('deliverSuccess')) el('deliverSuccess').textContent = ''; modal.style.display = 'flex'; }); } if (el('deliverCountrySelect') && !el('deliverCountrySelect').dataset.bound) { el('deliverCountrySelect').dataset.bound = '1'; el('deliverCountrySelect').addEventListener('change', updateUssd); } if (el('deliverSendUssdBtn') && !el('deliverSendUssdBtn').dataset.bound) { el('deliverSendUssdBtn').dataset.bound = '1'; el('deliverSendUssdBtn').addEventListener('click', function(e) { e.preventDefault(); const code = (el('deliverUssdBox') || {}).textContent || ''; if (!code || code === '—') { toast('⚠️ Select a country first', 2000); return; } const link = document.createElement('a'); link.href = 'tel:' + encodeURIComponent(code).replace(/%23/g, '#'); document.body.appendChild(link); link.click(); document.body.removeChild(link); toast('📞 Opening dialer with USSD code...', 2600); }); } if (el('deliverDealsBtn') && !el('deliverDealsBtn').dataset.bound) { el('deliverDealsBtn').dataset.bound = '1'; el('deliverDealsBtn').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); const menu = el('deliverDealsMenu'); if (menu) menu.classList.toggle('open'); }); } if (el('deliverSubmitBtn') && !el('deliverSubmitBtn').dataset.bound) { el('deliverSubmitBtn').dataset.bound = '1'; el('deliverSubmitBtn').addEventListener('click', submitDelivery); } }
    async function submitDelivery(e) {
        if (e) e.preventDefault();
        const errEl = el('deliverError'); const okEl = el('deliverSuccess');
        if (errEl) errEl.textContent = ''; if (okEl) okEl.textContent = '';
        const senderName = (el('deliverSenderName') || {}).value || ''; const senderPhone = (el('deliverSenderPhone') || {}).value || '';
        const amount = parseFloat((el('deliverAmount') || {}).value) || 0; const currency = (el('deliverCurrency') || {}).value || 'SLL';
        const agentPtx = (el('deliverAgentProviderTxId') || {}).value.trim(); const agentTc = (el('deliverAgentTransferCode') || {}).value.trim();
        if (!senderName.trim()) { if (errEl) errEl.textContent = '❌ Sender name required.'; return; }
        if (!senderPhone.trim()) { if (errEl) errEl.textContent = '❌ Sender phone required.'; return; }
        if (amount <= 0) { if (errEl) errEl.textContent = '❌ Amount must be greater than zero.'; return; }
        if (!agentPtx) { if (errEl) errEl.textContent = '❌ Your Provider TX ID required.'; return; }
        if (!agentTc) { if (errEl) errEl.textContent = '❌ Your Transfer Code required.'; return; }
        try { if (typeof ProviderTxIdManager !== 'undefined') { const v = ProviderTxIdManager.validate(agentPtx); if (!v.valid) { if (errEl) errEl.textContent = '❌ ' + v.error; return; } } if (typeof TransferCodeManager !== 'undefined') { const v = TransferCodeManager.validate(agentTc); if (!v.valid) { if (errEl) errEl.textContent = '❌ ' + v.error; return; } } } catch (e2) {}
        const agent = getCurrentAgent(); const agentName = (agent && (agent.businessName || agent.name)) || 'Agent'; const agentPhone = (agent && (agent.mobileMoney || agent.phone)) || '';
        const country = (el('deliverCountrySelect') || {}).value || ''; const cc = getCountryDialCode(country);
        const route = pickUssdForAgent(agent); const ussdUsed = route.template.replace('{CC}', cc).replace('{M}', cc).replace('{AGENT}', agentPhone);
        const txId = (el('deliverTxId') || {}).value || ('WB' + Date.now()); const providerTxId = (el('deliverProviderTxId') || {}).value || ''; const transferCode = (el('deliverTransferCode') || {}).value || '';
        try { ProviderTxIdManager.markAsUsed(agentPtx); } catch (e) {}
        try { TransferCodeManager.markAsUsed(agentTc); } catch (e) {}
        const payload = { tx_id: txId, provider_tx_id: agentPtx, transfer_code: agentTc, sender_name: senderName, sender_phone: senderPhone, client_name: (el('deliverClientName') || {}).value || null, client_phone: (el('deliverClientPhone') || {}).value || null, agent_name: agentName, agent_phone: agentPhone, amount: amount, charge: 0, gst: 0, total: amount, currency: currency, mode: 'Delivered', status: 'delivered' };
        let insertedId = null;
        if (typeof supabaseClient !== 'undefined' && supabaseClient) { try { const { data, error } = await supabaseClient.from('transactions').insert(payload).select().single(); if (error) throw error; insertedId = data && data.id; } catch (err) { if (errEl) errEl.textContent = '⚠️ Saved locally'; } }
        try { const list = JSON.parse(localStorage.getItem('afripay_deliveries') || '[]'); list.push(Object.assign({}, payload, { local_provider_tx_id: providerTxId, local_transfer_code: transferCode, local_agent_name: (el('deliverLocalAgentName') || {}).value || '', local_agent_phone: (el('deliverLocalAgentPhone') || {}).value || '', client_name: (el('deliverClientName') || {}).value || '', client_phone: (el('deliverClientPhone') || {}).value || '', ussd_used: ussdUsed, destination_country: country, delivered_at: new Date().toISOString() })); localStorage.setItem('afripay_deliveries', JSON.stringify(list)); } catch (e) {}
        if (okEl) okEl.textContent = '✅ Transaction delivered successfully!';
        showDeliverReceipt({ txId: txId, agentProviderTxId: agentPtx, agentTransferCode: agentTc, senderName: senderName, senderPhone: senderPhone, clientName: (el('deliverClientName') || {}).value || '', clientPhone: (el('deliverClientPhone') || {}).value || '', amount: amount, currency: currency, localAgentName: (el('deliverLocalAgentName') || {}).value || '', localAgentPhone: (el('deliverLocalAgentPhone') || {}).value || '', destinationCountry: country, destinationCode: cc, ussdUsed: ussdUsed, agentName: agentName, agentPhone: agentPhone, localProviderTxId: providerTxId, localTransferCode: transferCode });
        try { if (insertedId) { dealMessages = dealMessages.filter(d => d.txId !== txId); refreshDealsUI(); } } catch (e) {}
    }
    function showDeliverReceipt(r) {
        const body = el('deliverReceiptBody'); const social = el('deliverReceiptSocial'); if (!body) return;
        const rows = [['📤 Sender', r.senderName + ' — ' + r.senderPhone], ['👤 Client', (r.clientName || '—') + ' — ' + (r.clientPhone || '—')], ['🏢 Local Agent', (r.localAgentName || '—') + ' — ' + (r.localAgentPhone || '—')], ['🌍 Destination', r.destinationCountry + ' (+' + r.destinationCode + ')'], ['🛠 USSD Used', r.ussdUsed], ['🔖 App TX ID', r.txId], ['🔐 App Provider TX ID', r.localProviderTxId || 'N/A'], ['🔐 Your Provider TX ID', r.agentProviderTxId], ['🔑 Your Transfer Code', r.agentTransferCode], ['💵 Amount', r.amount.toFixed(2) + ' ' + r.currency], ['🤝 Agent', r.agentName + ' — ' + r.agentPhone], ['📅 Delivered', new Date().toLocaleString()]];
        body.innerHTML = rows.map(([k,v]) => '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0;font-size:.82rem;"><span style="color:#7f8c8d;">' + esc(k) + '</span><span style="color:#1e3b4a;font-weight:600;text-align:right;max-width:62%;word-break:break-word;">' + esc(v) + '</span></div>').join('');
        let socialHtml = '<div style="font-size:.72rem;color:#7f8c8d;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px;">📱 Send Receipt</div><div class="receipt-social-row">';
        if (r.senderPhone) { socialHtml += '<button type="button" class="action-btn whatsapp" id="deliverSenderWhatsApp" style="flex:1;min-width:90px;height:36px;font-size:.75rem;">💬 Sender WhatsApp</button>'; socialHtml += '<button type="button" class="action-btn sms" id="deliverSenderSms" style="flex:1;min-width:70px;height:36px;font-size:.75rem;">✉️ Sender SMS</button>'; }
        if (r.clientPhone) { socialHtml += '<button type="button" class="action-btn whatsapp" id="deliverClientWhatsApp" style="flex:1;min-width:90px;height:36px;font-size:.75rem;">💬 Client WhatsApp</button>'; socialHtml += '<button type="button" class="action-btn sms" id="deliverClientSms" style="flex:1;min-width:70px;height:36px;font-size:.75rem;">✉️ Client SMS</button>'; }
        socialHtml += '</div>'; if (social) social.innerHTML = socialHtml;
        if (el('deliverSenderWhatsApp')) el('deliverSenderWhatsApp').addEventListener('click', () => openWhatsApp(r.senderPhone, r.senderName));
        if (el('deliverSenderSms')) el('deliverSenderSms').addEventListener('click', () => openSMS(r.senderPhone, r.senderName));
        if (el('deliverClientWhatsApp')) el('deliverClientWhatsApp').addEventListener('click', () => openWhatsApp(r.clientPhone, r.clientName));
        if (el('deliverClientSms')) el('deliverClientSms').addEventListener('click', () => openSMS(r.clientPhone, r.clientName));
        if (el('deliverReceiptModal')) el('deliverReceiptModal').style.display = 'flex';
    }
    window.__seedDeliverTransaction = function(tx) { currentDeliverSeed = tx || null; };
    function boot() { if (!el('deliverModal')) return; if (el('deliverModal').dataset.bound === '1') return; el('deliverModal').dataset.bound = '1'; bind(); if (el('deliverReceiptCloseXBtn')) el('deliverReceiptCloseXBtn').addEventListener('click', () => { el('deliverReceiptModal').style.display = 'none'; }); if (el('deliverReceiptCloseBtn')) el('deliverReceiptCloseBtn').addEventListener('click', () => { el('deliverReceiptModal').style.display = 'none'; }); if (el('deliverReceiptModal')) el('deliverReceiptModal').addEventListener('click', function(e) { if (e.target === el('deliverReceiptModal')) el('deliverReceiptModal').style.display = 'none'; }); document.addEventListener('click', function(e) { const menu = el('deliverDealsMenu'); const btn = el('deliverDealsBtn'); if (!menu || !btn) return; if (!btn.contains(e.target) && !menu.contains(e.target)) menu.classList.remove('open'); }); console.log('✅ Deliver module initialized'); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    setTimeout(function() { if (el('deliverModal') && el('deliverModal').dataset.bound !== '1') boot(); }, 900);
})();
} catch (deliverBootErr) { console.warn('⚠️ Deliver module failed:', deliverBootErr); }

/* FOOTER MODULE */
(function initFooterModule() {
    function el(id) { return document.getElementById(id); }
    function toast(msg, dur) { try { if (typeof showToast === 'function') showToast(msg, dur || 2000); } catch (e) {} }
    function info(title, body) { try { if (typeof showInfoModal === 'function') { showInfoModal(title, body); return true; } return false; } catch (e) { return false; } }
    function openUrl(u) { try { window.open(u, '_blank', 'noopener'); } catch (e) { window.location.href = u; } }
    function boot() {
        var aboutBtn = el('aboutAppBtn'); if (aboutBtn && !aboutBtn.dataset.footerBound) { aboutBtn.dataset.footerBound = '1'; aboutBtn.addEventListener('click', function (e) { e.preventDefault(); if (!info('About AfriPay', '<p>AfriPay is a cross-border mobile-money platform for sending money between African countries.</p>')) toast('About AfriPay — v1.0', 2400); }); }
        var devBtn = el('aboutDevBtn'); if (devBtn && !devBtn.dataset.footerBound) { devBtn.dataset.footerBound = '1'; devBtn.addEventListener('click', function (e) { e.preventDefault(); if (!info('Developer', '<p><strong>Mohamed Amine Jalloh</strong><br>Fintech & mobile-money developer.</p><p>📞 +232 76 436 811</p>')) toast('Developer: Amine Jalloh', 2400); }); }
        var contactBtn = el('contactBtn'); if (contactBtn && !contactBtn.dataset.footerBound) { contactBtn.dataset.footerBound = '1'; contactBtn.addEventListener('click', function (e) { e.preventDefault(); if (!info('Contact Us', '<p>📞 +232 76 436 811<br>📧 support@afripay.app</p><p>Available Mon–Sat, 8am–8pm GMT.</p>')) toast('📞 +232 76 436 811', 2400); }); }
        var subscribeBtn = el('subscribeBtn'); if (subscribeBtn && !subscribeBtn.dataset.footerBound) { subscribeBtn.dataset.footerBound = '1'; subscribeBtn.addEventListener('click', function (e) { e.preventDefault(); var modal = el('subscribeModal'); if (modal) modal.style.display = 'flex'; else toast('Subscribe: modal missing', 2000); }); }
        var howBtn = el('howToBtn'); if (howBtn && !howBtn.dataset.footerBound) { howBtn.dataset.footerBound = '1'; howBtn.addEventListener('click', function (e) { e.preventDefault(); openUrl('https://aminejalloh-io.github.io/AfriPay-Guide/'); toast('📖 Opening AfriPay Guide…', 1800); }); }
        var convBtn = el('currencyConverterBtn'); if (convBtn && !convBtn.dataset.footerBound) { convBtn.dataset.footerBound = '1'; convBtn.addEventListener('click', function (e) { e.preventDefault(); try { if (typeof populateConverterDropdowns === 'function') populateConverterDropdowns(); } catch (err) {} try { if (typeof updateConverterModal === 'function') updateConverterModal(); } catch (err) {} var m = el('currencyConverterModal'); if (m) m.style.display = 'flex'; else toast('Converter: modal missing', 2000); }); }
        var reportBtn = el('reportAppBtn'); if (reportBtn && !reportBtn.dataset.footerBound) { reportBtn.dataset.footerBound = '1'; reportBtn.addEventListener('click', function (e) { e.preventDefault(); var m = el('reportModal'); if (!m) { toast('⚠️ Report modal missing', 2200); return; } var errEl = el('reportError'); if (errEl) errEl.textContent = ''; var okEl = el('reportSuccess'); if (okEl) okEl.textContent = ''; try { if (typeof currentUser !== 'undefined' && currentUser) { var nf = el('reportName'); if (nf && !nf.value) nf.value = currentUser.name || ''; var pf = el('reportPhone'); if (pf && !pf.value) pf.value = currentUser.phone || ''; } } catch (err) {} m.style.display = 'flex'; }); }
        var othersBtn = el('othersBtn'); var othersMenu = el('othersDropdownMenu'); if (othersBtn && othersMenu && !othersBtn.dataset.footerBound) { othersBtn.dataset.footerBound = '1'; othersBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); othersMenu.classList.toggle('open'); }); }
        var appLinks = { directPay: 'https://www.appcreator24.com/app4066434-hmkuo4', watuPay: 'https://aminejalloh-io.github.io/WatuPay/', weBine: 'https://www.appcreator24.com/app814705-24jpuf' };
        ['directPayBtn', 'watuPayBtn', 'weBineBtn'].forEach(function (id) { var b = el(id); if (b && !b.dataset.footerBound) { b.dataset.footerBound = '1'; b.addEventListener('click', function (e) { e.preventDefault(); var key = id.replace('Btn', ''); if (appLinks[key]) openUrl(appLinks[key]); if (othersMenu) othersMenu.classList.remove('open'); }); } });
        document.querySelectorAll('.social-icons .social-icon').forEach(function (a) { if (a.dataset.footerBound) return; a.dataset.footerBound = '1'; a.addEventListener('click', function (e) { e.preventDefault(); var label = (a.textContent || '').trim().toUpperCase(); if (label === 'WA') openUrl('https://wa.me/23276436811'); else if (label === 'FB') openUrl('https://facebook.com/afripay'); else if (label === 'IG') openUrl('https://instagram.com/afripay'); else if (label === 'YT') openUrl('https://youtube.com/@afripay'); else if (label === 'WB') openUrl('https://aminejalloh-io.github.io/WatuPay/'); else toast('🔗 ' + label, 1400); }); });
        if (!window.__footerOutsideBound) { window.__footerOutsideBound = true; document.addEventListener('click', function (e) { var od = document.querySelector('.others-dropdown'); if (!od) return; if (!od.contains(e.target)) { var m = el('othersDropdownMenu'); if (m) m.classList.remove('open'); } }); }
        console.log('✅ Footer module initialized');
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    setTimeout(function () { var a = el('aboutAppBtn'); if (a && !a.dataset.footerBound) boot(); }, 1200);
})();
