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
    async saveBusiness(b) {
        if (!supabaseClient) return null;
        try {
            const { data, error } = await supabaseClient.from('businesses').upsert({
                local_id: typeof b.id === 'number' ? String(b.id) : (b.id || null),
                name: b.name,
                contact: b.contact || null,
                mobile_money: b.mobileMoney || null,
                type: b.type || null,
                icon: b.icon || '🏪',
                website: b.website || null,
                address: b.address || null,
                city: b.city || null,
                country: b.country || null,
                pin: b.pin || null,
                biz_images: Array.isArray(b.bizImages) ? b.bizImages : (Array.isArray(b.goods) && b.goods.length && b.goods[0] && b.goods[0].image ? b.goods : []),
                goods: Array.isArray(b.goods) ? b.goods : [],
                owner_phone: b.ownerPhone || b.mobileMoney || null,
                owner_name: b.ownerName || null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'name' }).select().single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.warn('Supa.saveBusiness:', e && e.message);
            return null;
        }
    },
    async getBusinesses() {
        if (!supabaseClient) return null;
        try {
            const { data, error } = await supabaseClient
                .from('businesses')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(500);
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('Supa.getBusinesses:', e && e.message);
            return null;
        }
    },
    async getBusinessByPin(businessName) {
        if (!supabaseClient || !businessName) return null;
        try {
            const { data, error } = await supabaseClient
                .from('businesses')
                .select('*')
                .ilike('name', businessName)
                .maybeSingle();
            if (error) throw error;
            return data || null;
        } catch (e) {
            console.warn('Supa.getBusinessByPin:', e && e.message);
            return null;
        }
    },
    async logEditBizAuth(entry) {
        if (!supabaseClient) return null;
        try {
            const { data, error } = await supabaseClient.from('edit_biz_auth_log').insert({
                business_id: entry.businessId ? String(entry.businessId) : null,
                business_name: entry.businessName || null,
                attempted_name: entry.attemptedName || null,
                attempted_phone: entry.attemptedPhone || null,
                success: !!entry.success,
                failure_reason: entry.failureReason || null,
                attempts_in_session: parseInt(entry.attemptsInSession, 10) || 1,
                device_info: entry.deviceInfo || (typeof navigator !== 'undefined' ? navigator.userAgent : null)
            }).select().single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.warn('Supa.logEditBizAuth:', e && e.message);
            return null;
        }
    },
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

/* CLOUD BUSINESSES SYNC */
async function supaRefreshBusinesses() {
    if (!Supa.isReady()) return false;
    try {
        const cloudBiz = await Supa.getBusinesses();
        if (!Array.isArray(cloudBiz) || cloudBiz.length === 0) return false;
        let changed = false;
        cloudBiz.forEach(function (b) {
            let existing = customBusinesses.find(function (x) { return x.cloud_id === b.id; });
            if (!existing) existing = customBusinesses.find(function (x) { return String(x.name || '').toLowerCase() === String(b.name || '').toLowerCase(); });
            const mapped = {
                id: existing ? existing.id : ('biz_cloud_' + b.id),
                cloud_id: b.id,
                name: b.name,
                contact: b.contact || '',
                mobileMoney: b.mobile_money || b.owner_phone || '',
                type: b.type || 'Other',
                icon: b.icon || '🏪',
                website: b.website || '',
                address: b.address || '',
                city: b.city || '',
                country: b.country || '',
                pin: b.pin || null,
                goods: Array.isArray(b.goods) ? b.goods : [],
                bizImages: Array.isArray(b.biz_images) ? b.biz_images : [],
                ownerName: b.owner_name || '',
                ownerPhone: b.owner_phone || '',
                updated_at: b.updated_at || null
            };
            if (existing) {
                const before = JSON.stringify(existing);
                Object.assign(existing, mapped);
                if (JSON.stringify(existing) !== before) changed = true;
            } else {
                const seededIdx = businesses.findIndex(function (x) {
                    return String(x.name || '').toLowerCase() === String(b.name || '').toLowerCase();
                });
                if (seededIdx !== -1) businesses.splice(seededIdx, 1);
                customBusinesses.push(mapped);
                changed = true;
            }
        });
        if (changed) {
            saveCustomBusinesses();
            try { renderBusinessStrip(); } catch (e) {}
        }
        return changed;
    } catch (e) {
        console.warn('supaRefreshBusinesses:', e && e.message);
        return false;
    }
}

function subscribeAgentRealtime() {
    if (!Supa.isReady()) return;
    try {
        if (window.__agentRealtimeChannel) { try { supabaseClient.removeChannel(window.__agentRealtimeChannel); } catch (e) {} }
        window.__agentRealtimeChannel = supabaseClient.channel('agents-live').on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, function () { console.log('📡 agents table changed'); supaRefreshAgents(); }).subscribe();
        console.log('✅ Subscribed to agents realtime');
    } catch (e) { console.warn('subscribeAgentRealtime:', e && e.message); }
}

function subscribeBusinessRealtime() {
    if (!Supa.isReady()) return;
    try {
        if (window.__businessRealtimeChannel) { try { supabaseClient.removeChannel(window.__businessRealtimeChannel); } catch (e) {} }
        window.__businessRealtimeChannel = supabaseClient
            .channel('businesses-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, function () {
                console.log('📡 businesses table changed');
                supaRefreshBusinesses();
            })
            .subscribe();
        console.log('✅ Subscribed to businesses realtime');
    } catch (e) { console.warn('subscribeBusinessRealtime:', e && e.message); }
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
window.addEventListener('storage', function (e) {
    if (e.key !== 'afripay_custom_businesses') return;
    try {
        loadCustomBusinesses();
        renderBusinessStrip();
        console.log('🔄 businesses synced from dashboard tab');
    } catch (err) { console.warn('storage-businesses:', err); }
});

setInterval(function () { if (Supa.isReady()) supaRefreshAgents(); }, 30000);
setInterval(function () { if (Supa.isReady()) supaRefreshBusinesses(); }, 45000);

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

function summarizeChatBody(body) {
    const raw = String(body || '');
    if (raw.indexOf('[img]') === 0) {
        const bytes = Math.round((raw.length - 5) * 0.75);
        return '[image] ' + (bytes > 1024 ? Math.round(bytes / 1024) + ' KB' : bytes + ' B');
    }
    if (raw.indexOf('[audio]') === 0) {
        const bytes = Math.round((raw.length - 7) * 0.75);
        return '[audio] ' + (bytes > 1024 ? Math.round(bytes / 1024) + ' KB' : bytes + ' B');
    }
    if (raw.indexOf('[video]') === 0) {
        const bytes = Math.round((raw.length - 7) * 0.75);
        return '[video] ' + (bytes > 1024 ? Math.round(bytes / 1024) + ' KB' : bytes + ' B');
    }
    return raw;
}
async function logChatForDashboard(payload) {
    if (!supabaseClient) return null;
    const shortMessage = summarizeChatBody(payload.body);
    const base = {
        convo_id: payload.convo_id,
        sender_key: payload.sender_key,
        sender_name: payload.sender_name,
        body: payload.body
    };
    try {
        const { data, error } = await supabaseClient
            .from('chat_messages')
            .insert(Object.assign({}, base, { message: shortMessage }))
            .select()
            .single();
        if (!error && data) return data;
        if (error && !/column .* does not exist/i.test(String(error.message || ''))) throw error;
    } catch (e) {
        if (!/column .* does not exist/i.test(String(e && e.message || ''))) {
            console.warn('logChatForDashboard (with message) failed:', e);
        }
    }
    try {
        const { data, error } = await supabaseClient
            .from('chat_messages')
            .insert(base)
            .select()
            .single();
        if (error) throw error;
        return data;
    } catch (e2) {
        console.warn('logChatForDashboard (body-only) failed:', e2);
        return null;
    }
}

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

let pendingEditBizTarget = null;
let pendingEditBizAttempts = 0;

/* PAYBACK: state */
let paybackRecipientType = 'agent';
let paybackTargetClientId = null;

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
    const ph = document.createElement('option'); ph.value = ''; ph.textContent = '-- Select Agent --'; select.appendChild(ph);
    agents.forEach(function(a) {
        const d = a.agentData || a;
        const o = document.createElement('option'); o.value = a.id; o.textContent = (d.businessName || a.name || '').replace(/\(.*\)/, '').trim();
        select.appendChild(o);
    });
}

/* ============================================================ */
/* PAYBACK: restored helpers, renderers, and event wiring        */
/* ============================================================ */

function paybackGetCurrentAgent() {
    const id = getEl('editAgentId') ? getEl('editAgentId').value : (_selectedAgentId || selectedAgentId);
    if (!id) return null;
    try { return getAgents().find(function(a) { return a.id === id; }) || null; } catch (e) { return null; }
}

function paybackGetClientsForAgent(agentId) {
    // Agent dashboard clients are stored per-agent in localStorage under afripay_agent_clients
    try {
        const raw = localStorage.getItem('afripay_agent_clients');
        const all = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(all)) return [];
        return all.filter(function(c) { return c && (c.agentId === agentId || c.agent_id === agentId); });
    } catch (e) { return []; }
}

function populatePaybackSelectors() {
    const agentSelect = getEl('paybackAgentSelect');
    const clientSelect = getEl('paybackClientSelect');
    if (agentSelect) {
        const current = agentSelect.value;
        agentSelect.innerHTML = '<option value="">-- Select Agent --</option>';
        getAgents().forEach(function(a) {
            const d = a.agentData || a;
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = (d.businessName || a.name || '').replace(/\(.*\)/, '').trim();
            agentSelect.appendChild(opt);
        });
        if (current) agentSelect.value = current;
    }
    if (clientSelect) {
        const current = clientSelect.value;
        clientSelect.innerHTML = '<option value="">-- Select Client --</option>';
        const me = paybackGetCurrentAgent();
        const clients = me ? paybackGetClientsForAgent(me.id) : [];
        clients.forEach(function(c) {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = (c.name || 'Client') + (c.phone ? ' · ' + c.phone : '');
            clientSelect.appendChild(opt);
        });
        if (current) clientSelect.value = current;
    }
    const curr = getEl('paybackCurrency');
    if (curr) curr.value = (typeof getUserCurrency === 'function' ? getUserCurrency() : 'SLL');
}

function openPaybackModal() {
    if (getEl('paybackError')) getEl('paybackError').textContent = '';
    if (getEl('paybackSuccess')) getEl('paybackSuccess').textContent = '';
    if (getEl('paybackAmount')) getEl('paybackAmount').value = '';
    if (getEl('paybackNote')) getEl('paybackNote').value = '';
    paybackRecipientType = 'agent';
    paybackTargetClientId = null;
    const typeSel = getEl('paybackRecipientType');
    if (typeSel) typeSel.value = 'agent';
    if (getEl('paybackAgentGroup')) getEl('paybackAgentGroup').style.display = 'block';
    if (getEl('paybackClientGroup')) getEl('paybackClientGroup').style.display = 'none';
    populatePaybackSelectors();
    const modal = getEl('paybackModal');
    if (modal) modal.style.display = 'flex';
}

async function submitPayback() {
    const errEl = getEl('paybackError');
    const okEl = getEl('paybackSuccess');
    if (errEl) errEl.textContent = '';
    if (okEl) okEl.textContent = '';

    const me = paybackGetCurrentAgent();
    if (!me) { if (errEl) errEl.textContent = '❌ Agent session missing. Please reopen the dashboard.'; return; }

    const amount = parseFloat(getEl('paybackAmount') ? getEl('paybackAmount').value : 0) || 0;
    if (amount <= 0) { if (errEl) errEl.textContent = '❌ Enter a valid amount greater than 0.'; return; }

    let recipientLabel = '';
    let recipientId = '';
    if (paybackRecipientType === 'client') {
        recipientId = getEl('paybackClientSelect') ? getEl('paybackClientSelect').value : '';
        if (!recipientId) { if (errEl) errEl.textContent = '❌ Select a client.'; return; }
        const clients = paybackGetClientsForAgent(me.id);
        const client = clients.find(function(c) { return c.id === recipientId; });
        if (!client) { if (errEl) errEl.textContent = '❌ Client not found.'; return; }
        recipientLabel = client.name || 'Client';
    } else {
        recipientId = getEl('paybackAgentSelect') ? getEl('paybackAgentSelect').value : '';
        if (!recipientId) { if (errEl) errEl.textContent = '❌ Select an agent.'; return; }
        const agent = getAgents().find(function(a) { return a.id === recipientId; });
        if (!agent) { if (errEl) errEl.textContent = '❌ Agent not found.'; return; }
        const d = agent.agentData || agent;
        recipientLabel = (d.businessName || agent.name || 'Agent').replace(/\(.*\)/, '').trim();
    }

    const currency = getEl('paybackCurrency') ? getEl('paybackCurrency').value : (typeof getUserCurrency === 'function' ? getUserCurrency() : 'SLL');
    const note = getEl('paybackNote') ? getEl('paybackNote').value.trim() : '';
    const senderId = me.id;
    const senderName = ((me.agentData || me).businessName || me.name || 'Agent').replace(/\(.*\)/, '').trim();

    const payload = {
        sender_id: senderId,
        sender_name: senderName,
        recipient_type: paybackRecipientType,
        recipient_id: recipientId,
        recipient_name: recipientLabel,
        amount: amount,
        currency: currency,
        note: note,
        created_at: new Date().toISOString()
    };

    // Persist locally so the app has a record even when offline
    try {
        const raw = localStorage.getItem('afripay_paybacks');
        const list = raw ? JSON.parse(raw) : [];
        const arr = Array.isArray(list) ? list : [];
        arr.unshift(Object.assign({ id: 'pb_' + Date.now() }, payload));
        localStorage.setItem('afripay_paybacks', JSON.stringify(arr.slice(0, 200)));
    } catch (e) { /* ignore quota */ }

    // Best-effort cloud log
    if (Supa.isReady()) {
        try {
            const { error } = await supabaseClient.from('paybacks').insert({
                sender_id: senderId,
                sender_name: senderName,
                recipient_type: paybackRecipientType,
                recipient_id: recipientId,
                recipient_name: recipientLabel,
                amount: amount,
                currency: currency,
                note: note || null,
                status: 'sent'
            });
            if (error) {
                // Don't block the user on missing table; just log
                console.warn('paybacks insert:', error.message);
            }
        } catch (e) {
            console.warn('paybacks insert failed:', e && e.message);
        }
    }

    if (okEl) okEl.textContent = '✅ PayBack sent to ' + recipientLabel + ' (' + currency + ' ' + amount.toFixed(2) + ')';
    showToast('💸 PayBack sent to ' + recipientLabel, 2600);
    try { if (getEl('paybackAmount')) getEl('paybackAmount').value = ''; if (getEl('paybackNote')) getEl('paybackNote').value = ''; } catch (e) {}
    setTimeout(function() { const m = getEl('paybackModal'); if (m) m.style.display = 'none'; }, 1400);
}

/* Wire PayBack UI (idempotent — safe even if script loads more than once) */
function initPaybackUI() {
    const openBtn = getEl('openPaybackBtn');
    if (openBtn && !openBtn.__paybackWired) {
        openBtn.addEventListener('click', function() { openPaybackModal(); });
        openBtn.__paybackWired = true;
    }

    const typeSel = getEl('paybackRecipientType');
    if (typeSel && !typeSel.__paybackWired) {
        typeSel.addEventListener('change', function() {
            paybackRecipientType = typeSel.value;
            if (getEl('paybackAgentGroup')) getEl('paybackAgentGroup').style.display = paybackRecipientType === 'agent' ? 'block' : 'none';
            if (getEl('paybackClientGroup')) getEl('paybackClientGroup').style.display = paybackRecipientType === 'client' ? 'block' : 'none';
            populatePaybackSelectors();
        });
        typeSel.__paybackWired = true;
    }

    const submitBtn = getEl('paybackSubmitBtn');
    if (submitBtn && !submitBtn.__paybackWired) {
        submitBtn.addEventListener('click', function() { submitPayback(); });
        submitBtn.__paybackWired = true;
    }

    // Populate selectors when the modal opens via any path (close-modal buttons etc. don't reopen)
    const modal = getEl('paybackModal');
    if (modal && !modal.__paybackWired) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) { modal.style.display = 'none'; }
        });
        modal.__paybackWired = true;
    }
}

/* Bootstrap PayBack once DOM is ready (works with any existing DOMContentLoaded handlers) */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaybackUI);
} else {
    // If this script is loaded late, run now and also after a tick to be safe
    try { initPaybackUI(); } catch (e) {}
    setTimeout(function() { try { initPaybackUI(); } catch (e) {} }, 0);
}
