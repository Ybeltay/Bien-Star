// ============================================
// CONFIGURACIÓN INICIAL RESPONSIVE
// ============================================
const LS_PROFILES = "bienstar_profiles_v10";
const LS_TRACKS = "bienstar_tracks_v10";

const $ = (id) => document.getElementById(id);

const state = {
    currentProfileId: null,
    profiles: [],
    tracks: [],
    mobileMenuOpen: false,
    currentPlanData: null,
    currentPhoneNumber: null
};

function uid() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function loadFromStorage() {
    try {
        const profiles = localStorage.getItem(LS_PROFILES);
        const tracks = localStorage.getItem(LS_TRACKS);
        
        state.profiles = profiles ? JSON.parse(profiles) : [];
        state.tracks = tracks ? JSON.parse(tracks) : [];
        
        if (!Array.isArray(state.profiles)) state.profiles = [];
        if (!Array.isArray(state.tracks)) state.tracks = [];
    } catch(e) {
        console.error("Error leyendo almacenamiento", e);
        state.profiles = []; 
        state.tracks = [];
    }
}

function saveProfiles() {
    try {
        localStorage.setItem(LS_PROFILES, JSON.stringify(state.profiles));
    } catch(e) {
        console.error("Error guardando perfiles", e);
    }
}

function saveTracks() {
    try {
        localStorage.setItem(LS_TRACKS, JSON.stringify(state.tracks));
    } catch(e) {
        console.error("Error guardando seguimientos", e);
    }
}

function showError(msg) {
    const errorEl = $('formError');
    if (!errorEl) return;
    
    errorEl.textContent = msg;
    errorEl.style.display = msg ? 'block' : 'none';
    
    if(msg) {
        errorEl.classList.add('fade-in');
        setTimeout(() => {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
            errorEl.classList.remove('fade-in');
        }, 6000);
    }

    
}

function showToast(msg, type = 'info') {
    // Crear toast si no existe
    let toast = $('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 90%;
            width: auto;
            text-align: center;
            font-weight: 600;
            font-size: 16px;
            opacity: 0;
            transition: opacity 0.3s, transform 0.3s;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        document.body.appendChild(toast);
    }
    
    const bgColor = type === 'success' ? 'var(--verde-claro)' : 
                    type === 'error' ? 'var(--vino-claro)' : 'var(--verde-bandera)';
    
    toast.style.background = bgColor;
    toast.style.color = 'white';
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${msg}`;
    
    // Mostrar toast
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
    }, 3000);
}

function formatDateTime(iso) {
    try {
        const d = new Date(iso);
        if(isNaN(d.getTime())) return iso;
        
        const dateStr = d.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const timeStr = d.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
        return `${dateStr} ${timeStr}`;
    } catch(e) {
        return iso;
    }
}

function renderProfiles() {
    const wrap = $('profiles');
    if (!wrap) return;
    
    wrap.innerHTML = '';
    
    if (state.profiles.length === 0) {
        wrap.innerHTML = `
            <div class="no-profiles">
                <i class="fas fa-user-plus"></i>
                <p>No hay perfiles guardados</p>
            </div>
        `;
        return;
    }
    
    state.profiles.forEach(p => {
        const profileItem = document.createElement('div');
        profileItem.className = 'profile-item';
        profileItem.dataset.id = p.id;
        profileItem.dataset.selected = (state.currentProfileId === p.id).toString();
        
        profileItem.innerHTML = `
            <div class="profile-avatar" style="background: ${p.color || getRandomColor()}">
                ${p.name ? p.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div class="profile-info">
                <div class="profile-name">${p.name || ('Perfil ' + (p.id ? p.id.slice(-4) : '0'))}</div>
                <div class="profile-details">
                    <span class="profile-age">${p.age || '?'} años</span>
                    <span class="profile-imc">IMC: ${calcIMC(p.weight, p.height)?.toFixed(1) || '?'}</span>
                </div>
            </div>
            <div class="profile-action">
                <i class="fas fa-chevron-right"></i>
            </div>
        `;
        
        profileItem.onclick = () => {
            selectProfile(p.id);
            showToast(`Perfil "${p.name}" cargado`, 'success');
            
            if (state.mobileMenuOpen) {
                toggleMobileMenu();
            }
        };
        
        wrap.appendChild(profileItem);
    });
    
    updateStats();
}

function selectProfile(id) {
    if (!id) return;
    
    const p = state.profiles.find(x => x.id === id);
    if(!p) {
        if (state.profiles.length > 0) {
            selectProfile(state.profiles[0].id);
        }
        return;
    }
    
    state.currentProfileId = id;
    
    $('profileName').value = p.name || '';
    $('age').value = p.age || '';
    $('height').value = p.height || '';
    $('weight').value = p.weight || '';
    
    document.querySelectorAll("input[name='cond']").forEach(ch => {
        ch.checked = p.conditions && Array.isArray(p.conditions) ? 
                    p.conditions.includes(ch.value) : false;
    });
    
    $('mobility').value = p.mobility || 'normal';
    $('activityLevel').value = p.activity || 'sedentario';
    $('objective').value = p.objective || 'movilidad';
    $('dietType').value = p.dietType || 'balanceada';
    
    renderProfiles();
    refreshHistoryUI();
    
    if (window.innerWidth < 768) {
        document.querySelector('#formTitle').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

function newProfile() {
    const id = uid();
    const profile = { 
        id, 
        name: 'Nuevo perfil',
        age: '',
        height: '',
        weight: '',
        conditions: [],
        mobility: 'normal',
        activity: 'sedentario',
        objective: 'movilidad',
        dietType: 'balanceada',
        created: new Date().toISOString(),
        color: getRandomColor()
    };
    
    state.profiles.push(profile);
    saveProfiles();
    state.currentProfileId = id;
    
    renderProfiles();
    selectProfile(id);
    showToast('¡Nuevo perfil creado!', 'success');
}

function getRandomColor() {
    const colors = [
        '#006847',
        '#2E8B57',
        '#9B2D3A',
        '#B56576',
        '#4A90E2',
        '#F5A623',
        '#7B1FA2'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// FUNCIÓN COMPLETA PARA GUARDAR PERFIL
async function saveCurrentProfile() {
    const profileData = getCurrentFormData();
    if (!profileData) return;
    
    if(profileData.age < 50 || profileData.age > 120) { 
        showError('Por favor ingresa una edad válida (entre 50 y 120 años)'); 
        return; 
    }
    if(profileData.height < 100 || profileData.height > 250) { 
        showError('Por favor ingresa una altura válida (entre 100 y 250 cm)'); 
        return; 
    }
    if(profileData.weight < 30 || profileData.weight > 200) { 
        showError('Por favor ingresa un peso válido (entre 30 y 200 kg)'); 
        return; 
    }
    
    let id = state.currentProfileId;
    if (!id) {
        id = uid();
        state.currentProfileId = id;
    }
    
    const payload = { 
        id, 
        name: profileData.name,
        age: profileData.age, 
        height: profileData.height, 
        weight: profileData.weight, 
        conditions: profileData.conditions, 
        mobility: profileData.mobility, 
        activity: profileData.activity, 
        objective: profileData.objective, 
        dietType: profileData.dietType,
        updated: new Date().toISOString(),
        color: getRandomColor()
    };
    
    const existingIndex = state.profiles.findIndex(x => x.id === id);
    if(existingIndex >= 0){
        payload.created = state.profiles[existingIndex].created;
        state.profiles[existingIndex] = payload;
    } else {
        payload.created = new Date().toISOString();
        state.profiles.push(payload);
    }
    
    saveProfiles();
    renderProfiles();
    
    showToast('¡Perfil guardado exitosamente!', 'success');
}

// FUNCIÓN PARA GENERAR PDF DE PERFIL
async function generateProfilePDF(profile) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        let yPos = 20;
        
        doc.setFillColor(0, 104, 71);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('BIEN-STAR', pageWidth / 2, 25, { align: 'center' });
        
        doc.setFontSize(14);
        doc.text('Perfil de Salud y Bienestar', pageWidth / 2, 35, { align: 'center' });
        
        yPos = 60;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`Perfil: ${profile.name}`, margin, yPos);
        
        yPos += 15;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const fecha = new Date(profile.updated || profile.created).toLocaleDateString('es-ES');
        doc.text(`Generado: ${fecha}`, margin, yPos);
        
        yPos += 10;
        doc.setDrawColor(0, 104, 71);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        
        yPos += 15;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('📊 Datos Personales', margin, yPos);
        
        yPos += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        const imc = calcIMC(profile.weight, profile.height);
        const calorias = estimateCalories(profile);
        
        const datosPersonales = [
            ['Edad:', `${profile.age} años`],
            ['Altura:', `${profile.height} cm`],
            ['Peso:', `${profile.weight} kg`],
            ['IMC:', imc ? imc.toFixed(1) : 'N/A'],
            ['Estado IMC:', imcStatusText(imc)],
            ['Calorías estimadas:', calorias ? `${calorias} kcal/día` : 'N/A']
        ];
        
        datosPersonales.forEach(([label, value]) => {
            doc.text(label, margin, yPos);
            doc.text(value, margin + 60, yPos);
            yPos += 7;
        });
        
        yPos += 5;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('🎯 Preferencias y Objetivos', margin, yPos);
        
        yPos += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        const getMobilityText = (mob) => {
            const mobMap = {
                'silla': 'Silla de ruedas',
                'baston': 'Bastón o andador',
                'baja': 'Movilidad reducida',
                'normal': 'Movilidad normal',
                'buena': 'Buena movilidad'
            };
            return mobMap[mob] || mob;
        };
        
        const getActivityText = (act) => {
            const actMap = {
                'sedentario': 'Sedentario',
                'ligero': 'Ligero',
                'moderado': 'Moderado',
                'activo': 'Activo'
            };
            return actMap[act] || act;
        };
        
        const getObjectiveText = (obj) => {
            const objMap = {
                'movilidad': 'Mejorar movilidad',
                'equilibrio': 'Mejorar equilibrio',
                'dolor': 'Reducir dolor',
                'resistencia': 'Mejorar resistencia',
                'fuerza': 'Aumentar fuerza',
                'perder': 'Control de peso',
                'salud': 'Mejorar salud'
            };
            return objMap[obj] || obj;
        };
        
        const getDietText = (diet) => {
            const dietMap = {
                'balanceada': 'Balanceada',
                'mediterranea': 'Mediterránea',
                'baja_sal': 'Baja en sodio',
                'baja_azucar': 'Baja en azúcar',
                'vegana': 'Vegana',
                'vegetariana': 'Vegetariana',
                'economica': 'Económica',
                'mexicana': 'Mexicana'
            };
            return dietMap[diet] || diet;
        };
        
        const preferencias = [
            ['Movilidad:', getMobilityText(profile.mobility)],
            ['Nivel actividad:', getActivityText(profile.activity)],
            ['Objetivo principal:', getObjectiveText(profile.objective)],
            ['Tipo de dieta:', getDietText(profile.dietType)]
        ];
        
        preferencias.forEach(([label, value]) => {
            doc.text(label, margin, yPos);
            doc.text(value, margin + 60, yPos);
            yPos += 7;
        });
        
        if (profile.conditions && profile.conditions.length > 0) {
            yPos += 5;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('💊 Condiciones de Salud', margin, yPos);
            
            yPos += 10;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            
            const condMap = {
                'diabetes': 'Diabetes',
                'hipertension': 'Hipertensión',
                'artritis': 'Artritis/Artrosis',
                'problemas_corazon': 'Problemas cardíacos',
                'osteoporosis': 'Osteoporosis'
            };
            
            profile.conditions.forEach(cond => {
                const condText = condMap[cond] || cond;
                doc.text('• ' + condText, margin, yPos);
                yPos += 7;
            });
        }
        
        yPos += 10;
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('💡 Recomendaciones Iniciales', margin, yPos);
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const recomendaciones = getHealthRecommendations(profile).slice(0, 5);
        recomendaciones.forEach(rec => {
            const text = rec.replace(/[💡⏰🩸❤️🦵🦴]/g, '').replace(/\*\*/g, '').trim();
            if (text) {
                const lines = doc.splitTextToSize('• ' + text, pageWidth - 2 * margin);
                lines.forEach(line => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, margin, yPos);
                    yPos += 7;
                });
            }
        });
        
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Página ${i} de ${pageCount} • BIEN-STAR - Fitness para Adultos Mayores • ${fecha}`,
                pageWidth / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }
        
        const fileName = `Perfil_${profile.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
        
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
    } catch (error) {
        console.error('Error generando PDF:', error);
        return false;
    }
}

function getCurrentFormData() {
    const name = $('profileName').value.trim();
    const age = parseInt($('age').value);
    const height = parseInt($('height').value);
    const weight = parseInt($('weight').value);
    
    if (!age || !height || !weight) {
        showError('Completa los datos básicos primero');
        return null;
    }
    
    const allChecked = Array.from(document.querySelectorAll("input[name='cond']:checked"))
        .map(n => n.value);
    
    if (allChecked.includes('ninguna') && allChecked.length > 1) {
        showError('No puedes seleccionar "Ninguna" junto con otras condiciones');
        return null;
    }
    
    if (allChecked.length === 0) {
        showError('Selecciona al menos una condición o marca "Ninguna"');
        return null;
    }
    
    const conditions = allChecked.filter(v => v !== 'ninguna');
    
    return {
        name: name || 'Perfil actual',
        age,
        height,
        weight,
        conditions,
        mobility: $('mobility').value,
        activity: $('activityLevel').value,
        objective: $('objective').value,
        dietType: $('dietType').value,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    };
}

function deleteSelectedProfile() {
    if(!state.currentProfileId) { 
        showError('No hay ningún perfil seleccionado'); 
        return; 
    }
    
    const profile = state.profiles.find(p => p.id === state.currentProfileId);
    if(!profile) return;
    
    if(!confirm(`¿Estás seguro de que quieres eliminar el perfil "${profile.name}"? Esta acción también eliminará todo su historial de seguimiento.`)) return;
    
    state.profiles = state.profiles.filter(p => p.id !== state.currentProfileId);
    state.tracks = state.tracks.filter(t => t.profileId !== state.currentProfileId);
    
    saveProfiles(); 
    saveTracks();
    
    state.currentProfileId = state.profiles.length > 0 ? state.profiles[0].id : null;
    
    renderProfiles(); 
    refreshHistoryUI();
    
    if (state.profiles.length === 0) {
        newProfile();
    }
    
    showToast('Perfil eliminado', 'success');
}

function calcIMC(weight, heightCm) {
    if(!weight || !heightCm) return null;
    const h = heightCm / 100; 
    const imc = weight / (h * h);
    return Math.round(imc * 10) / 10;
}

function imcStatusText(imc) {
    if(imc === null) return 'Esperando datos';
    if(imc < 18.5) return 'BAJO PESO';
    if(imc < 25) return 'PESO NORMAL';
    if(imc < 30) return 'SOBREPESO';
    if(imc < 35) return 'OBESIDAD GRADO I';
    if(imc < 40) return 'OBESIDAD GRADO II';
    return 'OBESIDAD GRADO III';
}

function estimateCalories(profile) {
    const { age, weight, height, activity, objective } = profile;
    if(!age || !weight || !height) return null;
    
    let bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    
    let factor = 1.2;
    if(activity === 'ligero') factor = 1.375;
    if(activity === 'moderado') factor = 1.55;
    if(activity === 'activo') factor = 1.725;
    
    if(objective === 'perder') factor *= 0.85;
    if(objective === 'fuerza') factor *= 1.1;
    
    return Math.round(bmr * factor);
}

function getHealthRecommendations(profile) {
    const conditions = profile.conditions || [];
    const age = profile.age || 65;
    const mobility = profile.mobility || 'normal';
    const recommendations = [];
    
    if (age >= 70) {
        recommendations.push("💡 **Adulto Mayor Avanzado**: Prioriza seguridad y movilidad sobre intensidad.");
        recommendations.push("⏰ **Tiempo de recuperación**: Permite 48 horas entre sesiones intensas.");
    } else {
        recommendations.push("💪 **Adulto Mayor Activo**: Puedes mantener buena intensidad con supervisión.");
    }
    
    if (mobility === 'silla') {
        recommendations.push("🪑 **Usuario de silla de ruedas**: Todos los ejercicios están adaptados para realizarse sentado.");
        recommendations.push("💪 **Enfoque en extremidades superiores**: Las rutinas priorizan brazos, hombros y torso.");
        recommendations.push("⚠️ **Seguridad en silla**: Siempre bloquea los frenos antes de comenzar los ejercicios.");
    }
    
    if(conditions.includes('diabetes')) {
        recommendations.push("🩸 **Diabetes**: Controla glucosa antes y después del ejercicio.");
        recommendations.push("🍎 **Alimentación**: Distribuye carbohidratos en 5-6 comidas pequeñas.");
        recommendations.push("⚠️ **Precaución**: Evita ejercicio si glucosa >250 mg/dL o <100 mg/dL.");
    }
    
    if(conditions.includes('hipertension')) {
        recommendations.push("❤️ **Hipertensión**: Controla presión antes del ejercicio.");
        recommendations.push("🧂 **Alimentación**: Limita sal a <5g/día, evita procesados.");
        recommendations.push("💊 **Medicación**: Ejercítate lejos de la toma de medicamentos antihipertensivos.");
    }
    
    if(conditions.includes('artritis')) {
        recommendations.push("🦵 **Artritis**: Prioriza ejercicios en agua o sin impacto.");
        recommendations.push("🔥 **Dolor**: Aplica calor antes, frío después del ejercicio.");
        recommendations.push("🏊 **Ejercicio ideal**: Natación, bicicleta estática, tai chi.");
    }
    
    if(conditions.includes('problemas_corazon')) {
        recommendations.push("❤️ **Cardiaco**: Monitorea frecuencia cardíaca durante ejercicio.");
        recommendations.push("🚫 **Evita**: Ejercicio isométrico (empujar/pujar contra resistencia fija).");
        recommendations.push("📊 **Zona segura**: Mantén FC < (220 - edad) x 0.7.");
    }
    
    if(conditions.includes('osteoporosis')) {
        recommendations.push("🦴 **Osteoporosis**: Ejercicios de carga como caminar, subir escalones.");
        recommendations.push("⚠️ **Evita**: Flexión excesiva de columna, torsiones bruscas.");
        recommendations.push("☀️ **Vitamina D**: Exposición solar 15 min/día, alimentos fortificados.");
    }
    
    if(recommendations.length <= 5) {
        recommendations.push("💧 **Hidratación**: 8 vasos de agua/día, más si hace calor.");
        recommendations.push("🥦 **Nutrición**: 5 porciones diarias de frutas y verduras.");
        recommendations.push("😴 **Descanso**: 7-8 horas de sueño de calidad.");
        recommendations.push("🚶 **Movimiento**: Rompe sedentarismo cada 30 minutos.");
    }
    
    return recommendations;
}

function generateDietOptions(profile) {
    const dietType = profile.dietType || 'balanceada';
    const conditions = profile.conditions || [];
    const objective = profile.objective || 'movilidad';
    const age = profile.age || 65;
    const mobility = profile.mobility || 'normal';
    
    const diets = [];
    
    diets.push({
        title: "Opción Clásica - " + getDietName(dietType),
        desc: "Plan equilibrado, fácil de seguir y adaptado a tus preferencias",
        icon: "🍎",
        meals: generateClassicDiet(dietType, conditions, age, mobility)
    });
    
    diets.push({
        title: "Opción Saludable",
        desc: "Enfocada en alimentos nutritivos y antiinflamatorios",
        icon: "🥗",
        meals: generateHealthyDiet(dietType, conditions, objective, mobility)
    });
    
    if(conditions.length > 0 || objective === 'perder' || objective === 'fuerza') {
        diets.push({
            title: "Opción Especializada",
            desc: getSpecialDietDesc(conditions, objective, mobility),
            icon: "⚕️",
            meals: generateSpecialDiet(conditions, objective, dietType, age, mobility)
        });
    }
    
    return diets;
}

function getDietName(type) {
    const names = {
        'balanceada': 'Tradicional Balanceada',
        'mediterranea': 'Mediterránea Saludable',
        'baja_sal': 'Baja en Sodio',
        'baja_azucar': 'Baja en Azúcares',
        'vegana': 'Vegana Integral',
        'vegetariana': 'Vegetariana Nutritiva',
        'economica': 'Económica y Saludable',
        'mexicana': 'Mexicana Tradicional'
    };
    return names[type] || 'Dieta Balanceada';
}

function generateClassicDiet(dietType, conditions, age, mobility) {
    const meals = [];
    const isSenior = age >= 70;
    
    meals.push(`<strong>🍳 DESAYUNO (7:00 - 8:00):</strong>`);
    if(dietType === 'vegana' || dietType === 'vegetariana') {
        meals.push("• Batido de espinaca, plátano y leche de almendras");
        meals.push("• 2 tostadas integrales con aguacate");
    } else if(dietType === 'baja_sal') {
        meals.push("• Avena con manzana rallada y canela");
        meals.push("• Yogur natural sin sal");
    } else if(dietType === 'mexicana') {
        meals.push("• Huevos revueltos con espinacas");
        meals.push("• Tortillas de maíz + frijoles refritos bajos en grasa");
    } else {
        meals.push("• Yogur griego con frutos rojos y nueces");
        meals.push("• 1 rebanada pan integral con aceite de oliva");
    }
    
    meals.push(`<br><strong>☕ MEDIA MAÑANA (10:30):</strong>`);
    if(conditions.includes('diabetes')) {
        meals.push("• 1 manzana pequeña + 10 almendras");
    } else if(isSenior) {
        meals.push("• Fruta suave (plátano maduro, pera)");
    } else {
        meals.push("• Fruta de temporada + puñado de frutos secos");
    }
    
    meals.push(`<br><strong>🍛 ALMUERZO (13:00 - 14:00):</strong>`);
    if(dietType === 'vegana') {
        meals.push("• Ensalada de quinoa con garbanzos y aguacate");
        meals.push("• Sopa de lentejas con verduras");
    } else if(dietType === 'mediterranea') {
        meals.push("• Salmón al horno con verduras asadas");
        meals.push("• 1/2 taza de couscous integral");
    } else if(dietType === 'economica') {
        meals.push("• Pollo guisado con verduras");
        meals.push("• Arroz integral + ensalada verde");
    } else {
        meals.push("• Proteína magra (pollo/pescado) a la plancha");
        meals.push("• 1/2 plato de verduras al vapor");
        meals.push("• 1/3 plato de carbohidrato complejo");
    }
    
    meals.push(`<br><strong>🍎 MERIENDA (16:30):</strong>`);
    if (mobility === 'silla') {
        meals.push("• Batido proteico fácil de preparar sentado");
    } else {
        meals.push("• Batido proteico o yogur natural");
    }
    meals.push("• 1 fruta pequeña");
    
    meals.push(`<br><strong>🌙 CENA (19:00 - 20:00):</strong>`);
    if(isSenior) {
        meals.push("• Sopa o crema de verduras");
        meals.push("• Proteína fácil de digerir (pollo desmenuzado, pescado blanco)");
    } else {
        meals.push("• Proteína ligera + verdura cocida");
        meals.push("• Pequeña porción de carbohidrato");
    }
    
    meals.push(`<br><strong>💧 HIDRATACIÓN:</strong>`);
    meals.push("• 8 vasos de agua al día");
    meals.push("• Infusiones sin azúcar");
    
    if (mobility === 'silla') {
        meals.push(`<br><strong>🪑 ADAPTACIONES PARA SILLA DE RUEDAS:</strong>`);
        meals.push("• Utensilios adaptados para mayor independencia");
        meals.push("• Vasos con tapa y pajita para evitar derrames");
        meals.push("• Preparar comidas fáciles de manipular");
    }
    
    return meals;
}

function generateHealthyDiet(dietType, conditions, objective, mobility) {
    const meals = [];
    
    meals.push(`<strong>🥗 ALIMENTACIÓN SALUDABLE Y VARIADA</strong>`);
    meals.push("========================================");
    
    meals.push("<br><strong>PRINCIPIOS BÁSICOS:</strong>");
    meals.push("• Consume alimentos de todos los grupos en cada comida");
    meals.push("• Prefiere alimentos integrales y naturales");
    meals.push("• Cocina al vapor, horno o plancha");
    meals.push("• Usa hierbas y especias en lugar de sal");
    
    meals.push("<br><strong>EJEMPLO DE MENÚ DIARIO:</strong>");
    meals.push("1. Desayuno: Avena con fruta y semillas");
    meals.push("2. Media mañana: Batido verde (espinaca, piña, jengibre)");
    meals.push("3. Almuerzo: Plato del buen comer (1/2 verduras, 1/4 proteína, 1/4 carbohidrato)");
    meals.push("4. Merienda: Puñado de frutos secos + infusión");
    meals.push("5. Cena: Proteína ligera + ensalada variada");
    
    if(objective === 'perder') {
        meals.push("<br><strong>🔻 PARA CONTROL DE PESO:</strong>");
        meals.push("• Reduce porciones gradualmente");
        meals.push("• Incrementa consumo de fibra");
        meals.push("• Evita alimentos procesados");
        meals.push("• Mantén horarios regulares");
    }
    
    if(conditions.includes('artritis')) {
        meals.push("<br><strong>🦵 ALIMENTOS ANTIINFLAMATORIOS:</strong>");
        meals.push("• Pescado azul (salmón, sardinas)");
        meals.push("• Nueces y semillas");
        meals.push("• Cúrcuma y jengibre");
        meals.push("• Frutos rojos");
    }
    
    if (mobility === 'silla') {
        meals.push("<br><strong>🪑 CONSEJOS PARA USUARIOS DE SILLA:</strong>");
        meals.push("• Organiza la cocina a altura accesible");
        meals.push("• Usa tablas de cortar con ventosas");
        meals.push("• Prepara porciones individuales fáciles de servir");
        meals.push("• Ten a mano utensilios adaptados");
    }
    
    return meals;
}

function getSpecialDietDesc(conditions, objective, mobility) {
    let desc = "";
    
    if(conditions.includes('diabetes') && conditions.includes('hipertension')) {
        desc = "Para diabetes e hipertensión combinadas";
    } else if(objective === 'perder') {
        desc = "Enfocada en control de peso saludable";
    } else if(objective === 'fuerza') {
        desc = "Optimizada para ganancia muscular";
    } else if(conditions.includes('osteoporosis')) {
        desc = "Rica en calcio y vitamina D";
    } else {
        desc = "Adaptada a necesidades específicas";
    }
    
    if (mobility === 'silla') {
        desc += " (adaptada para silla de ruedas)";
    }
    
    return desc;
}

function generateSpecialDiet(conditions, objective, dietType, age, mobility) {
    const meals = [];
    
    meals.push(`<strong>⚕️ DIETA ESPECIALIZADA</strong>`);
    meals.push("========================================");
    
    if(conditions.includes('diabetes') && conditions.includes('hipertension')) {
        meals.push("<br><strong>PARA DIABETES E HIPERTENSIÓN:</strong>");
        meals.push("• Desayuno: Avena con canela + claras de huevo");
        meals.push("• Media mañana: 1 pera + almendras");
        meals.push("• Almuerzo: Pollo al curry con coliflor");
        meals.push("• Merienda: Yogur griego sin azúcar");
        meals.push("• Cena: Pescado blanco al vapor con espárragos");
        meals.push("<br><strong>🔸 Evitar:</strong> Sal, azúcar, alimentos procesados");
        meals.push("<strong>🔸 Priorizar:</strong> Vegetales, proteínas magras, grasas saludables");
    }
    
    if(objective === 'perder') {
        meals.push("<br><strong>PARA CONTROL DE PESO:</strong>");
        meals.push("• Desayuno: Tortilla de 1 huevo + espinacas");
        meals.push("• Media mañana: 1 manzana verde");
        meals.push("• Almuerzo: Ensalada grande con pollo");
        meals.push("• Merienda: Apio con hummus");
        meals.push("• Cena: Sopa de verduras con tofu");
        meals.push("<br><strong>💡 Consejos:</strong>");
        meals.push("- Come despacio, mastica bien");
        meals.push("- Usa platos pequeños");
        meals.push("- Bebe agua antes de las comidas");
    }
    
    if(objective === 'fuerza') {
        meals.push("<br><strong>PARA GANANCIA MUSCULAR:</strong>");
        meals.push("• Desayuno: Batido de proteína + avena + plátano");
        meals.push("• Media mañana: Requesón con frutos rojos");
        meals.push("• Almuerzo: Carne magra con batata y brócoli");
        meals.push("• Merienda: Yogur griego con miel");
        meals.push("• Cena: Salmón con quinoa y espárragos");
        meals.push("<br><strong>💪 Proteínas por comida:</strong> 20-30g");
        meals.push("<strong>⏰ Timing:</strong> Proteína cada 3-4 horas");
    }
    
    if(conditions.includes('osteoporosis')) {
        meals.push("<br><strong>PARA OSTEOPOROSIS:</strong>");
        meals.push("• Alimentos ricos en calcio:");
        meals.push("  - Lácteos: 3 porciones/día");
        meals.push("  - Sardinas con espinas");
        meals.push("  - Brócoli, almendras, tofu");
        meals.push("• Vitamina D: Pescado azul, huevo, exposición solar");
        meals.push("• Evitar: Exceso de sal, café, alcohol");
    }
    
    if(age >= 75) {
        meals.push("<br><strong>👵 ADAPTACIONES PARA ADULTOS MAYORES AVANZADOS:</strong>");
        meals.push("• Texturas suaves y fáciles de masticar");
        meals.push("• Comidas pequeñas y frecuentes (5-6/día)");
        meals.push("• Hidratación constante (aunque no haya sed)");
        meals.push("• Suplementos si hay deficiencias nutricionales");
    }
    
    if (mobility === 'silla') {
        meals.push("<br><strong>🪑 ADAPTACIONES PARA SILLA DE RUEDAS:</strong>");
        meals.push("• Organizar la nevera a altura accesible");
        meals.push("• Usar recipientes fáciles de abrir con una mano");
        meals.push("• Preparar comidas que se puedan comer con una mano");
        meals.push("• Tener utensilios adaptados cerca del área de comida");
    }
    
    return meals;
}

function generateRoutineOptions(profile) {
    const mobility = profile.mobility || 'normal';
    const objective = profile.objective || 'movilidad';
    const activity = profile.activity || 'sedentario';
    const age = profile.age || 65;
    const conditions = profile.conditions || [];
    
    const routines = [];
    
    if (mobility === 'silla') {
        routines.push({
            title: "Rutina Completa en Silla",
            desc: "Ejercicios especializados para usuarios de silla de ruedas",
            icon: "🪑",
            exercises: generateSillaRutinaCompleta(age, conditions, objective)
        });
        
        if (objective === 'fuerza') {
            routines.push({
                title: "Fuerza en Silla",
                desc: "Fortalece brazos y torso para mayor independencia",
                icon: "💪",
                exercises: generateSillaFuerza(age, conditions)
            });
        } else if (objective === 'movilidad') {
            routines.push({
                title: "Movilidad Articular",
                desc: "Mejora flexibilidad y rango de movimiento",
                icon: "🔄",
                exercises: generateSillaMovilidad(age, conditions)
            });
        }
        
        if (conditions.length > 0) {
            routines.push({
                title: "Rutina Terapéutica",
                desc: "Adaptada a tus condiciones de salud",
                icon: "⚕️",
                exercises: generateSillaTerapeutica(conditions, age)
            });
        }
        
        return routines;
    }
    
    routines.push({
        title: getMobilityRoutineTitle(mobility),
        desc: getMobilityRoutineDesc(mobility),
        icon: getMobilityIcon(mobility),
        exercises: generateMobilityRoutine(mobility, age)
    });
    
    if (!(mobility === 'baston' && (objective === 'fuerza' || objective === 'perder'))) {
        routines.push({
            title: "Para " + getObjectiveName(objective),
            desc: `Rutina enfocada en tu objetivo: ${getObjectiveName(objective).toLowerCase()}`,
            icon: getObjectiveIcon(objective),
            exercises: generateObjectiveRoutine(mobility, objective, activity)
        });
    }
    
    if (mobility === 'normal' || mobility === 'buena') {
        routines.push({
            title: "Seguridad y Prevención",
            desc: "Ejercicios para prevenir caídas y mejorar estabilidad",
            icon: "🛡️",
            exercises: generateSafetyRoutine(mobility, age)
        });
    }
    
    if (conditions.length > 0 && conditions.some(c => c !== 'ninguna')) {
        routines.push({
            title: "Terapéutica Especial",
            desc: "Adaptada a tus condiciones de salud",
            icon: "⚕️",
            exercises: generateTherapeuticRoutine(conditions, mobility, age)
        });
    }
    
    return routines;
}

function generateSillaRutinaCompleta(age, conditions, objective) {
    const exercises = [];
    const isSenior = age >= 70;
    
    exercises.push(`<strong>🪑 RUTINA COMPLETA EN SILLA DE RUEDAS</strong>`);
    exercises.push("==================================================");
    exercises.push(`<strong>🎯 OBJETIVO:</strong> ${getObjectiveName(objective)}`);
    exercises.push(`<strong>⏰ DURACIÓN:</strong> 30-40 minutos`);
    exercises.push(`<strong>🔄 FRECUENCIA:</strong> 3-4 veces por semana`);
    
    exercises.push("<br><strong>⚠️ IMPORTANTE:</strong> Asegurar frenos bloqueados antes de comenzar");
    
    exercises.push("<br><strong>🔸 CALENTAMIENTO (8-10 minutos):</strong>");
    exercises.push("1. Rotaciones de cuello suaves: 2 minutos");
    exercises.push("2. Círculos con hombros: 2 minutos (adelante y atrás)");
    exercises.push("3. Flexión y extensión de muñecas: 2 minutos");
    exercises.push("4. Respiración diafragmática: 2 minutos");
    exercises.push("5. Movilidad de dedos: 1 minuto");
    
    exercises.push("<br><strong>🔸 EJERCICIOS DE BRAZOS (12-15 minutos):</strong>");
    exercises.push("6. Press de hombros con bandas: 3 series x 10-12 rep");
    exercises.push("7. Curl de bíceps (botella de agua): 3 series x 12-15 rep");
    exercises.push("8. Extensionas de tríceps: 3 series x 10-12 rep");
    exercises.push("9. Aperturas laterales: 3 series x 10 rep");
    exercises.push("10. 'Remo' sentado con banda: 3 series x 12 rep");
    
    exercises.push("<br><strong>🔸 EJERCICIOS DE TORSO (8-10 minutos):</strong>");
    exercises.push("11. Rotaciones de torso: 3 series x 10 rep c/lado");
    exercises.push("12. Inclinaciones laterales: 3 series x 10 rep c/lado");
    exercises.push("13. Contracciones abdominales: 3 series x 15 rep");
    
    exercises.push("<br><strong>🔸 EJERCICIOS DE MANOS (5 minutos):</strong>");
    exercises.push("14. Apretar pelota antiestrés: 2 minutos");
    exercises.push("15. Estiramientos de dedos: 1 minuto");
    exercises.push("16. Movilidad de muñeca: 1 minuto");
    
    exercises.push("<br><strong>🔸 ENFRIAMIENTO (5 minutos):</strong>");
    exercises.push("17. Estiramiento de brazos cruzados: 30s c/lado");
    exercises.push("18. Estiramiento de tríceps: 30s c/brazo");
    exercises.push("19. Respiración de relajación: 2 minutos");
    
    if (isSenior) {
        exercises.push("<br><strong>👵 ADAPTACIONES PARA ADULTOS MAYORES:</strong>");
        exercises.push("- Reducir series a 2 en cada ejercicio");
        exercises.push("- Aumentar tiempo de descanso entre series");
        exercises.push("- Priorizar control sobre velocidad");
    }
    
    if (conditions.includes('artritis')) {
        exercises.push("<br><strong>🦵 ADAPTACIONES PARA ARTROSIS/ARTRITIS:</strong>");
        exercises.push("- Realizar movimientos en rango sin dolor");
        exercises.push("- Aplicar calor en articulaciones antes");
        exercises.push("- Evitar movimientos bruscos o forzados");
    }
    
    exercises.push("<br><strong>📋 RECOMENDACIONES:</strong>");
    exercises.push("- Mantener frenos de silla BLOQUEADOS durante toda la rutina");
    exercises.push("- Realizar cerca de una mesa para apoyo si es necesario");
    exercises.push("- Detener si aparece dolor intenso, mareo o malestar");
    exercises.push("- Consultar con terapeuta físico para ajustes personalizados");
    
    return exercises;
}

function generateSillaFuerza(age, conditions) {
    const exercises = [];
    
    exercises.push(`<strong>💪 RUTINA DE FUERZA PARA SILLA DE RUEDAS</strong>`);
    exercises.push("==================================================");
    
    exercises.push("<br><strong>🔸 CALENTAMIENTO (5 minutos)</strong>");
    exercises.push("<br><strong>🔸 CIRCUITO DE FUERZA (20 minutos):</strong>");
    exercises.push("Realizar 3 rondas, descanso 60s entre rondas");
    exercises.push("");
    exercises.push("1. Press de hombros con resistencia: 10-12 rep");
    exercises.push("2. Remo sentado con banda: 12-15 rep");
    exercises.push("3. Curl de bíceps concentrado: 10-12 rep c/brazo");
    exercises.push("4. Extensiones de tríceps sobre cabeza: 10 rep");
    exercises.push("5. Rotaciones de torso con resistencia: 8 rep c/lado");
    
    exercises.push("<br><strong>🔸 ENFRIAMIENTO (5 minutos)</strong>");
    
    if (age >= 70) {
        exercises.push("<br><strong>👵 ADAPTACIONES PARA MAYORES DE 70:</strong>");
        exercises.push("- Comenzar con bandas de baja resistencia");
        exercises.push("- Priorizar técnica perfecta sobre peso/resistencia");
        exercises.push("- Aumentar tiempo de descanso según necesidad");
    }
    
    return exercises;
}

function generateSillaMovilidad(age, conditions) {
    const exercises = [];
    
    exercises.push(`<strong>🔄 RUTINA DE MOVILIDAD PARA SILLA DE RUEDAS</strong>`);
    exercises.push("==================================================");
    
    exercises.push("<br><strong>🔸 MOVILIDAD CERVICAL (5 minutos):</strong>");
    exercises.push("1. Flexión/Extensión de cuello: 10 rep lentas");
    exercises.push("2. Inclinaciones laterales: 8 rep c/lado");
    exercises.push("3. Rotaciones suaves: 6 rep c/lado");
    
    exercises.push("<br><strong>🔸 MOVILIDAD DE HOMBROS (8 minutos):</strong>");
    exercises.push("4. Círculos de hombros: 10 rep adelante/atrás");
    exercises.push("5. Elevaciones frontales: 10 rep alternadas");
    exercises.push("6. Aperturas laterales: 10 rep controladas");
    
    exercises.push("<br><strong>🔸 MOVILIDAD DE CODO Y MUÑECA (7 minutos):</strong>");
    exercises.push("7. Flexión/Extensión de codo: 12 rep c/brazo");
    exercises.push("8. Flexión dorsal/palmar: 15 rep c/muñeca");
    exercises.push("9. Círculos de muñeca: 8 rep c/dirección");
    
    exercises.push("<br><strong>🔸 MOVILIDAD DE TORSO (7 minutos):</strong>");
    exercises.push("10. Rotaciones de torso: 10 rep c/lado");
    exercises.push("11. Inclinaciones laterales: 8 rep c/lado");
    exercises.push("12. Respiración costo-diafragmática: 2 min");
    
    exercises.push("<br><strong>📋 RECOMENDACIONES:</strong>");
    exercises.push("- Realizar todos los movimientos en rango SIN DOLOR");
    exercises.push("- Mantener respiración fluida durante todo el ejercicio");
    exercises.push("- Usar movimientos lentos y controlados");
    
    return exercises;
}

function generateSillaTerapeutica(conditions, age) {
    const exercises = [];
    
    exercises.push(`<strong>⚕️ RUTINA TERAPÉUTICA PARA SILLA DE RUEDAS</strong>`);
    exercises.push("==================================================");
    
    exercises.push("<br><strong>⚠️ IMPORTANTE:</strong> Esta rutina debe ser supervisada por profesional de salud");
    
    if (conditions.includes('artritis')) {
        exercises.push("<br><strong>🦵 PARA ARTROSIS/ARTRITIS:</strong>");
        exercises.push("1. Movilidad en rango sin dolor - 10 min");
        exercises.push("2. Ejercicios en agua caliente (o imaginaria) - 15 min");
        exercises.push("3. Estiramientos muy suaves - 8 min");
        exercises.push("4. Aplicar calor después - 10 min");
    }
    
    if (conditions.includes('hipertension')) {
        exercises.push("<br><strong>❤️ PARA HIPERTENSIÓN:</strong>");
        exercises.push("1. Ejercicios de respiración - 10 min");
        exercises.push("2. Movimientos lentos y controlados - 15 min");
        exercises.push("3. Relajación muscular progresiva - 10 min");
    }
    
    if (conditions.includes('diabetes')) {
        exercises.push("<br><strong>🩸 PARA DIABETES:</strong>");
        exercises.push("1. Ejercicio regular a la misma hora - 30 min");
        exercises.push("2. Combinar ejercicios de brazos y torso");
        exercises.push("3. Estirar después de cada sesión");
    }
    
    exercises.push("<br><strong>📞 CONSULTA SIEMPRE CON TU MÉDICO:</strong>");
    exercises.push("- Antes de comenzar cualquier nueva rutina");
    exercises.push("- Si experimentas dolor intenso");
    exercises.push("- Si tienes síntomas nuevos");
    
    return exercises;
}

function getMobilityRoutineTitle(mobility) {
    switch(mobility) {
        case 'silla': return "Rutina en Silla";
        case 'baston': return "Rutina con Apoyo";
        case 'baja': return "Rutina de Movilidad Reducida";
        case 'normal': return "Rutina de Movilidad Normal";
        case 'buena': return "Rutina Avanzada";
        default: return "Rutina Básica";
    }
}

function getMobilityRoutineDesc(mobility) {
    switch(mobility) {
        case 'silla': return "Ejercicios seguros desde la silla";
        case 'baston': return "Ejercicios con apoyo de bastón o andador";
        case 'baja': return "Adaptada para movilidad limitada";
        case 'normal': return "Para mantener y mejorar movilidad";
        case 'buena': return "Para quienes tienen buena condición física";
        default: return "Rutina general adaptada";
    }
}

function getMobilityIcon(mobility) {
    switch(mobility) {
        case 'silla': return "🪑";
        case 'baston': return "🦯";
        case 'baja': return "🚶‍♂️";
        case 'normal': return "🏃‍♂️";
        case 'buena': return "💪";
        default: return "🧘‍♂️";
    }
}

function getObjectiveName(objective) {
    const names = {
        'movilidad': 'Mejorar Movilidad',
        'equilibrio': 'Mejorar Equilibrio',
        'dolor': 'Reducir Dolor',
        'resistencia': 'Mejorar Resistencia',
        'fuerza': 'Aumentar Fuerza',
        'perder': 'Control de Peso',
        'mantener': 'Mantenimiento',
        'salud': 'Mejorar Salud'
    };
    return names[objective] || 'Mejorar Movilidad';
}

function getObjectiveIcon(objective) {
    switch(objective) {
        case 'movilidad': return "🦵";
        case 'equilibrio': return "⚖️";
        case 'dolor': return "😌";
        case 'resistencia': return "🏃‍♂️";
        case 'fuerza': return "💪";
        case 'perder': return "⚖️";
        default: return "❤️";
    }
}

function generateMobilityRoutine(mobility, age) {
    const exercises = [];
    const isAdvancedSenior = age >= 75;
    
    exercises.push(`<strong>${getMobilityRoutineTitle(mobility).toUpperCase()}</strong>`);
    exercises.push("========================================");
    
    if(mobility === 'baston' || mobility === 'baja') {
        exercises.push("<br><strong>🦯 RUTINA CON APOYO (30-35 minutos)</strong>");
        exercises.push("<br><strong>🔸 CALENTAMIENTO (8 min):</strong>");
        exercises.push("1. Marcha en sitio con apoyo - 5 min");
        exercises.push("2. Movilidad articular suave - 3 min");
        
        exercises.push("<br><strong>🔸 EJERCICIOS PRINCIPALES (18 min):</strong>");
        exercises.push("3. Sentadillas asistidas - 3 series x 8-10 rep");
        exercises.push("4. Elevación de talones - 3 series x 12 rep");
        exercises.push("5. Equilibrio a una pierna - 30s cada lado x3");
        exercises.push("6. Estiramientos con apoyo - 8 min");
        
        exercises.push("<br><strong>🔸 ENFRIAMIENTO (6 min):</strong>");
        exercises.push("7. Respiración y relajación - 6 min");
    }
    else {
        exercises.push(`<br><strong>${mobility === 'buena' ? '💪 RUTINA AVANZADA' : '🏃‍♂️ RUTINA COMPLETA'} (40-45 minutos)</strong>`);
        
        exercises.push("<br><strong>🔸 CALENTAMIENTO (10 min):</strong>");
        exercises.push("1. Caminata suave o marcha - 5 min");
        exercises.push("2. Movilidad articular completa - 5 min");
        
        exercises.push("<br><strong>🔸 EJERCICIOS PRINCIPALES (25 min):</strong>");
        exercises.push("3. Sentadillas - 3 series x 10-12 rep");
        exercises.push("4. Flexiones de pared - 3 series x 8-10 rep");
        exercises.push("5. Puente de glúteos - 3 series x 12 rep");
        exercises.push("6. Plancha modificada - 3 series x 20-30s");
        exercises.push("7. Ejercicios de equilibrio - 5 min");
        
        exercises.push("<br><strong>🔸 ENFRIAMIENTO (10 min):</strong>");
        exercises.push("8. Estiramientos completos - 10 min");
    }
    
    if(isAdvancedSenior) {
        exercises.push("<br><strong>⚠️ ADAPTACIONES PARA MAYORES DE 75:</strong>");
        exercises.push("- Reducir intensidad al 70%");
        exercises.push("- Aumentar tiempo de descanso");
        exercises.push("- Priorizar seguridad sobre intensidad");
        exercises.push("- Realizar cerca de apoyo/silla");
    }
    
    exercises.push("<br><strong>📋 RECOMENDACIONES:</strong>");
    exercises.push("- Realizar 3-4 veces por semana");
    exercises.push("- Mantener hidratación");
    exercises.push("- Parar si aparece dolor intenso");
    exercises.push("- Consultar con médico si hay dudas");
    
    return exercises;
}

function generateObjectiveRoutine(mobility, objective, activity) {
    const exercises = [];
    
    exercises.push(`<strong>OBJETIVO: ${getObjectiveName(objective).toUpperCase()}</strong>`);
    exercises.push("========================================");
    
    if (mobility === 'silla') {
        if (objective === 'equilibrio' || objective === 'perder') {
            exercises.push("<br><strong>⚠️ OBJETIVO NO APLICABLE PARA SILLA DE RUEDAS</strong>");
            exercises.push("<br>El objetivo seleccionado requiere ejercicios de piernas o equilibrio");
            exercises.push("que no son compatibles con el uso de silla de ruedas.");
            exercises.push("<br><strong>🎯 OBJETIVOS ALTERNATIVOS RECOMENDADOS:</strong>");
            exercises.push("- 'Mejorar movilidad' (para flexibilidad y rango de movimiento)");
            exercises.push("- 'Aumentar fuerza' (en brazos y torso para mayor independencia)");
            exercises.push("- 'Mejorar salud general' (ejercicios adaptados específicamente)");
            return exercises;
        }
    }
    
    if(objective === 'equilibrio') {
        exercises.push("<br><strong>⚖️ RUTINA DE EQUILIBRIO (30 min)</strong>");
        exercises.push("<br>1. Equilibrio en una pierna - 30s cada lado x4");
        exercises.push("2. Caminata de talón a punta - 3 min");
        exercises.push("3. Giros controlados 360° - 2 min");
        exercises.push("4. Marcha lateral - 3 min");
        exercises.push("5. Tai Chi básico - 10 min");
        exercises.push("6. Ejercicios en línea recta - 5 min");
        exercises.push("7. Estiramientos - 5 min");
    }
    else if(objective === 'dolor') {
        exercises.push("<br><strong>😌 RUTINA PARA REDUCIR DOLOR (35 min)</strong>");
        exercises.push("<br>1. Movilización articular suave - 10 min");
        exercises.push("2. Ejercicios en agua imaginaria - 8 min");
        exercises.push("3. Estiramientos suaves sin rebote - 10 min");
        exercises.push("4. Respiración diafragmática - 5 min");
        exercises.push("5. Relajación muscular progresiva - 7 min");
        
        exercises.push("<br><strong>💡 CONSEJOS PARA EL DOLOR:</strong>");
        exercises.push("- Aplica calor antes del ejercicio");
        exercises.push("- Frío después si hay inflamación");
        exercises.push("- Nunca ejercites a través del dolor intenso");
        exercises.push("- Progresa muy gradualmente");
    }
    else if(objective === 'fuerza') {
        exercises.push("<br><strong>💪 RUTINA DE FUERZA (45 min)</strong>");
        exercises.push("<br><strong>🔸 CALENTAMIENTO (10 min)</strong>");
        exercises.push("<strong>🔸 CIRCUITO (3 rondas, descanso 60s entre rondas):</strong>");
        exercises.push("1. Sentadillas con silla - 12 rep");
        exercises.push("2. Flexiones inclinadas - 8-10 rep");
        exercises.push("3. Puente de glúteos - 15 rep");
        exercises.push("4. Elevaciones laterales - 12 rep");
        exercises.push("5. Plancha - 30s");
        exercises.push("<strong>🔸 ENFRIAMIENTO (10 min)</strong>");
    }
    else if(objective === 'perder') {
        exercises.push("<br><strong>⚖️ RUTINA PARA CONTROL DE PESO (50 min)</strong>");
        exercises.push("<br><strong>🔸 CARDIO (25 min):</strong>");
        exercises.push("- Caminata enérgica: 15 min");
        exercises.push("- Intervalos suaves: 10 min");
        exercises.push("<br><strong>🔸 CIRCUITO (15 min, 2 rondas):</strong>");
        exercises.push("1. Sentadillas - 45s");
        exercises.push("2. Marcha alta - 45s");
        exercises.push("3. Plancha - 30s");
        exercises.push("4. Descanso - 60s");
        exercises.push("<br><strong>🔸 ENFRIAMIENTO (10 min)</strong>");
    }
    else {
        exercises.push("<br><strong>❤️ RUTINA PARA SALUD GENERAL (40 min)</strong>");
        exercises.push("<br>1. Calentamiento general - 10 min");
        exercises.push("2. Caminata variada - 15 min");
        exercises.push("3. Ejercicios funcionales - 10 min:");
        exercises.push("   • Levantarse de la silla");
        exercises.push("   • Subir escalones");
        exercises.push("   • Agacharse controladamente");
        exercises.push("4. Enfriamiento - 5 min");
    }
    
    if(activity === 'sedentario') {
        exercises.push("<br><strong>📊 NIVEL SEDENTARIO:</strong>");
        exercises.push("- Comienza con 50% de la rutina");
        exercises.push("- Incrementa 10% cada semana");
        exercises.push("- Prioriza consistencia sobre intensidad");
    }
    
    return exercises;
}

function generateSafetyRoutine(mobility, age) {
    const exercises = [];
    
    exercises.push(`<strong>🛡️ RUTINA DE SEGURIDAD Y PREVENCIÓN</strong>`);
    exercises.push("========================================");
    
    exercises.push("<br><strong>🎯 OBJETIVO:</strong> Prevenir caídas y mejorar estabilidad");
    
    exercises.push("<br><strong>1. EJERCICIOS DE EQUILIBRIO ESTÁTICO (10 min):</strong>");
    exercises.push("   • Equilibrio a dos pies - 30s x5");
    exercises.push("   • Equilibrio a una pierna - 15s c/lado x4");
    exercises.push("   • Cambios de peso - 2 min");
    
    exercises.push("<br><strong>2. EJERCICIOS DE EQUILIBRIO DINÁMICO (10 min):</strong>");
    exercises.push("   • Caminata con cambios de dirección");
    exercises.push("   • Paso adelante-atrás");
    exercises.push("   • Paso lateral cruzado");
    
    exercises.push("<br><strong>3. FUERZA PARA LA ESTABILIDAD (10 min):</strong>");
    exercises.push("   • Elevación de talones");
    exercises.push("   • Mini sentadillas");
    exercises.push("   • Extensionas de cadera");
    
    exercises.push("<br><strong>4. COORDINACIÓN (5 min):</strong>");
    exercises.push("   • Marcha coordinada con brazos");
    exercises.push("   • Movimientos opuestos mano-pie");
    
    exercises.push("<br><strong>💡 CONSEJOS DE SEGURIDAD:</strong>");
    exercises.push("- Realizar cerca de una silla o pared");
    exercises.push("- Usar calzado adecuado y antideslizante");
    exercises.push("- Eliminar obstáculos en el área");
    exercises.push("- No agarrarse si pierdes equilibrio, mejor sentarse");
    
    if(age >= 70) {
        exercises.push("<br><strong>👵 ADAPTACIONES PARA ADULTOS MAYORES:</strong>");
        exercises.push("- Supervisión recomendada");
        exercises.push("- Realizar en momentos de mayor energía");
        exercises.push("- Evitar superficies irregulares");
        exercises.push("- Parar al primer signo de fatiga");
    }
    
    return exercises;
}

function generateTherapeuticRoutine(conditions, mobility, age) {
    const exercises = [];
    
    exercises.push(`<strong>⚕️ RUTINA TERAPÉUTICA ESPECIAL</strong>`);
    exercises.push("========================================");
    
    exercises.push("<br><strong>⚠️ IMPORTANTE:</strong> Esta rutina debe ser supervisada por profesional de salud");
    
    if(conditions.includes('artritis')) {
        exercises.push("<br><strong>🦵 PARA ARTROSIS/ARTRITIS:</strong>");
        exercises.push("1. Movilidad en rango sin dolor - 10 min");
        exercises.push("2. Ejercicios en agua caliente (o imaginaria) - 15 min");
        exercises.push("3. Estiramientos muy suaves - 8 min");
        exercises.push("4. Aplicar calor después - 10 min");
        
        exercises.push("<br><strong>🔸 EJERCICIOS RECOMENDADOS:</strong>");
        exercises.push("- Natación o ejercicios en piscina");
        exercises.push("- Bicicleta estática suave");
        exercises.push("- Tai Chi adaptado");
        exercises.push("- Movimientos articulares lentos");
    }
    
    if(conditions.includes('osteoporosis')) {
        exercises.push("<br><strong>🦴 PARA OSTEOPOROSIS:</strong>");
        exercises.push("1. Ejercicios de carga moderada - 20 min");
        exercises.push("2. Entrenamiento de equilibrio - 10 min");
        exercises.push("3. Postura y alineación - 5 min");
        
        exercises.push("<br><strong>🔸 PRECAUCIONES:</strong>");
        exercises.push("- Evitar flexión excesiva de columna");
        exercises.push("- No realizar torsiones bruscas");
        exercises.push("- Evitar impacto alto (saltos)");
        exercises.push("- Caminar es el mejor ejercicio");
    }
    
    if(conditions.includes('problemas_corazon')) {
        exercises.push("<br><strong>❤️ PARA SALUD CARDIOVASCULAR:</strong>");
        exercises.push("1. Calentamiento gradual - 10 min");
        exercises.push("2. Ejercicio aeróbico suave - 15-20 min");
        exercises.push("3. Enfriamiento prolongado - 10 min");
        
        exercises.push("<br><strong>🔸 MONITOREO:</strong>");
        exercises.push("- Controlar frecuencia cardíaca");
        exercises.push("- Parar si hay mareo o dolor torácico");
        exercises.push("- Evitar ejercicio después de comer");
        exercises.push("- Mantener conversación durante ejercicio");
    }
    
    if(conditions.includes('diabetes')) {
        exercises.push("<br><strong>🩸 PARA DIABETES:</strong>");
        exercises.push("1. Ejercicio regular a la misma hora - 30 min");
        exercises.push("2. Combinar aeróbico y fuerza");
        exercises.push("3. Estirar después de cada sesión");
        
        exercises.push("<br><strong>🔸 PRECAUCIONES:</strong>");
        exercises.push("- Medir glucosa antes y después");
        exercises.push("- Tener carbohidratos a mano");
        exercises.push("- Evitar ejercicio si glucosa >250 mg/dL");
        exercises.push("- Hidratarse adecuadamente");
    }
    
    exercises.push("<br><strong>📞 CONSULTA SIEMPRE CON TU MÉDICO:</strong>");
    exercises.push("- Antes de comenzar cualquier nueva rutina");
    exercises.push("- Si experimentas dolor intenso");
    exercises.push("- Si tienes síntomas nuevos");
    exercises.push("- Para ajustes según tu evolución");
    
    return exercises;
}

async function generatePlanFromForm() {
    const profileData = getCurrentFormData();
    if (!profileData) return;
    
    if(profileData.age < 50 || profileData.age > 120) { 
        showError('Por favor ingresa una edad válida entre 50 y 120 años'); 
        return; 
    }
    if(profileData.height < 100 || profileData.height > 250) { 
        showError('Por favor ingresa una altura válida entre 100 y 250 cm'); 
        return; 
    }
    if(profileData.weight < 30 || profileData.weight > 200) { 
        showError('Por favor ingresa un peso válido entre 30 y 200 kg'); 
        return; 
    }
    
    const imc = calcIMC(profileData.weight, profileData.height);
    const calories = estimateCalories(profileData);
    
    $('imcValue').textContent = imc !== null ? imc.toFixed(1) : '-';
    $('imcStatus').textContent = imcStatusText(imc);
    $('imcStatus').className = 'stat-status ' + (imcStatusText(imc) === 'PESO NORMAL' ? 'success' : 
                               imcStatusText(imc).includes('BAJO') ? 'muted' : 'danger');
    $('calValue').textContent = calories !== null ? calories : '-';
    
    const healthRecs = getHealthRecommendations(profileData);
    $('healthRecommendations').innerHTML = healthRecs.map(rec => 
        `<div class="recommendation-item">${rec}</div>`
    ).join('');
    
    const dietOptions = generateDietOptions(profileData);
    $('dietOptions').innerHTML = dietOptions.map((diet, index) => `
        <div class="plan-card fade-in" style="animation-delay: ${index * 0.1}s;">
            <div class="plan-card-header">
                <div class="plan-icon">
                    <i class="fas fa-utensils"></i>
                </div>
                <div class="plan-info">
                    <h4 class="plan-title">${diet.title}</h4>
                    <p class="plan-desc">${diet.desc}</p>
                </div>
            </div>
            <div class="plan-content-items">
                ${diet.meals.map(meal => `<div class="meal-item">${meal}</div>`).join('')}
            </div>
        </div>
    `).join('');
    
    const routineOptions = generateRoutineOptions(profileData);
    
    if (profileData.mobility === 'silla') {
        $('routineOptions').innerHTML = `
            <div class="plan-card silla-rutina fade-in">
                <div class="plan-card-header">
                    <div class="plan-icon">
                        <i class="fas fa-wheelchair"></i>
                    </div>
                    <div class="plan-info">
                        <h4 class="plan-title">Rutinas para Silla de Ruedas</h4>
                        <p class="plan-desc">Adaptadas específicamente para usuarios de silla de ruedas</p>
                    </div>
                </div>
                <div class="silla-nota">
                    <i class="fas fa-info-circle"></i>
                    <p>Se han excluido automáticamente todas las rutinas que involucran ejercicios de piernas, equilibrio o control de peso mediante actividad física de pie.</p>
                </div>
                ${routineOptions.map((routine, index) => `
                    <div class="routine-section">
                        <h5>${routine.icon} ${routine.title}</h5>
                        <p class="routine-desc">${routine.desc}</p>
                        <div class="routine-exercises">
                            ${routine.exercises.map(ex => `<div class="exercise-item">${ex}</div>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        $('routineOptions').innerHTML = routineOptions.map((routine, index) => `
            <div class="plan-card fade-in" style="animation-delay: ${index * 0.1 + 0.3}s;">
                <div class="plan-card-header">
                    <div class="plan-icon">
                        <i class="fas fa-dumbbell"></i>
                    </div>
                    <div class="plan-info">
                        <h4 class="plan-title">${routine.title}</h4>
                        <p class="plan-desc">${routine.desc}</p>
                    </div>
                </div>
                <div class="plan-content-items">
                    ${routine.exercises.map(ex => `<div class="exercise-item">${ex}</div>`).join('')}
                </div>
            </div>
        `).join('');
    }
    
    const planData = {
        profile: profileData,
        imc,
        calories,
        healthRecommendations: healthRecs,
        dietOptions,
        routineOptions,
        generatedAt: new Date().toISOString()
    };
    
    // Guardar los datos del plan
    state.currentPlanData = planData;
    $('downloadPlanBtn').dataset.plan = JSON.stringify(planData);
    
    showToast('¡Plan personalizado generado exitosamente!', 'success');
    
    return planData;
}

function saveTrack() {
    if(!state.currentProfileId) { 
        showError('Por favor guarda o selecciona un perfil antes de registrar seguimiento'); 
        return; 
    }
    
    const mood = $('mood').value.trim();
    const notes = $('notes').value.trim();
    
    if(!mood) {
        showError('Por favor describe cómo te sientes hoy');
        return;
    }
    
    const item = { 
        profileId: state.currentProfileId, 
        id: uid(), 
        dateISO: new Date().toISOString(), 
        mood, 
        notes 
    };
    
    state.tracks.push(item);
    saveTracks();
    
    $('mood').value = ''; 
    $('notes').value = '';
    
    refreshHistoryUI();
    showToast('¡Seguimiento guardado correctamente!', 'success');
    
    if (window.innerWidth < 768) {
        document.activeElement.blur();
    }
}

function refreshHistoryUI() {
    const out = $('historyOutput');
    if(!state.currentProfileId) {
        out.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-calendar-plus"></i>
                <p>Selecciona un perfil para ver su historial</p>
            </div>
        `;
        updateStats();
        return;
    }
    
    const arr = state.tracks
        .filter(t => t.profileId === state.currentProfileId)
        .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
    
    if(arr.length === 0) { 
        out.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-calendar-plus"></i>
                <p>No hay registros aún. ¡Comienza registrando tu primer día!</p>
            </div>
        `; 
        updateStats();
        return; 
    }
    
    out.innerHTML = arr.map(t => `
        <div class="track-item fade-in">
            <div class="track-header">
                <div class="track-date">${formatDateTime(t.dateISO)}</div>
                <div class="track-id">ID: ${t.id.slice(-6)}</div>
            </div>
            <div class="track-mood">${t.mood}</div>
            ${t.notes ? `<div class="track-notes">${t.notes}</div>` : ''}
        </div>
    `).join('');
    
    updateStats();
}

function updateStats() {
    if(!state.currentProfileId) {
        $('daysCount').textContent = '0';
        $('lastDate').textContent = '-';
        return;
    }
    
    const arr = state.tracks.filter(t => t.profileId === state.currentProfileId);
    $('daysCount').textContent = arr.length;
    
    if(arr.length > 0) {
        const last = arr.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO))[0];
        const dateStr = new Date(last.dateISO).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
        $('lastDate').textContent = dateStr;
    } else {
        $('lastDate').textContent = '-';
    }
}

function clearHistory() {
    if(!state.currentProfileId) { 
        showError('Selecciona un perfil primero'); 
        return; 
    }
    
    const profile = state.profiles.find(p => p.id === state.currentProfileId);
    if(!profile) return;
    
    if(!confirm(`¿Estás seguro de borrar todo el historial del perfil "${profile.name}"? Esta acción no se puede deshacer.`)) return;
    
    state.tracks = state.tracks.filter(t => t.profileId !== state.currentProfileId);
    saveTracks(); 
    refreshHistoryUI(); 
    showToast('Historial eliminado', 'success');
}

function downloadText(filename, text) {
    try {
        const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch(e) {
        showError('Error al descargar: ' + e.message);
    }
}

// FUNCIÓN COMPLETA PARA DESCARGAR PLAN EN PDF
function downloadPlan() {
    const data = $('downloadPlanBtn').dataset.plan;
    if(!data) { 
        showError('Por favor genera un plan primero'); 
        return; 
    }
    
    try {
        const plan = JSON.parse(data);
        const p = plan.profile;
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        let yPos = 20;
        
        doc.setFillColor(0, 104, 71);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('BIEN-STAR', pageWidth / 2, 25, { align: 'center' });
        
        doc.setFontSize(14);
        doc.text('Plan Personalizado de Salud y Bienestar', pageWidth / 2, 35, { align: 'center' });
        
        yPos = 60;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`Plan para: ${p.name}`, margin, yPos);
        
        yPos += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const fecha = new Date(plan.generatedAt).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(`Generado: ${fecha}`, margin, yPos);
        
        yPos += 10;
        doc.setDrawColor(0, 104, 71);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        
        yPos += 15;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('📊 Datos Personales', margin, yPos);
        
        yPos += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        const datosPersonales = [
            ['Edad:', `${p.age} años`],
            ['Altura:', `${p.height} cm`],
            ['Peso:', `${p.weight} kg`],
            ['IMC:', `${plan.imc ? plan.imc.toFixed(1) : 'N/A'} (${imcStatusText(plan.imc)})`],
            ['Calorías estimadas:', `${plan.calories ? plan.calories + ' kcal/día' : 'N/A'}`],
            ['Nivel movilidad:', getMobilityTextPDF(p.mobility)],
            ['Nivel actividad:', getActivityTextPDF(p.activity)],
            ['Objetivo:', getObjectiveTextPDF(p.objective)],
            ['Tipo de dieta:', getDietTextPDF(p.dietType)]
        ];
        
        datosPersonales.forEach(([label, value]) => {
            doc.text(label, margin, yPos);
            doc.text(value, margin + 60, yPos);
            yPos += 7;
        });
        
        if (p.conditions && p.conditions.length > 0) {
            yPos += 10;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('💊 Condiciones de Salud', margin, yPos);
            
            yPos += 10;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            
            const condMap = {
                'diabetes': 'Diabetes',
                'hipertension': 'Hipertensión',
                'artritis': 'Artritis/Artrosis',
                'problemas_corazon': 'Problemas cardíacos',
                'osteoporosis': 'Osteoporosis'
            };
            
            p.conditions.forEach(cond => {
                const condText = condMap[cond] || cond;
                doc.text('• ' + condText, margin, yPos);
                yPos += 7;
            });
        } else {
            yPos += 10;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('💊 Condiciones de Salud', margin, yPos);
            
            yPos += 10;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text('• Ninguna condición de salud reportada', margin, yPos);
            yPos += 7;
        }
        
        yPos += 10;
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('💡 Recomendaciones Específicas', margin, yPos);
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const recomendaciones = plan.healthRecommendations;
        recomendaciones.forEach(rec => {
            const text = rec.replace(/\*\*/g, '').trim();
            if (text) {
                const lines = doc.splitTextToSize('• ' + text, pageWidth - 2 * margin);
                lines.forEach(line => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, margin, yPos);
                    yPos += 7;
                });
            }
        });
        
        yPos += 10;
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('🍎 Opciones de Alimentación', margin, yPos);
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        if (plan.dietOptions && plan.dietOptions.length > 0) {
            plan.dietOptions.forEach((diet, index) => {
                if (index > 0) {
                    yPos += 5;
                }
                
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(`${index + 1}. ${diet.title}`, margin, yPos);
                yPos += 7;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const descLines = doc.splitTextToSize(diet.desc, pageWidth - 2 * margin);
                descLines.forEach(line => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, margin, yPos);
                    yPos += 7;
                });
                
                if (diet.meals && Array.isArray(diet.meals)) {
                    diet.meals.forEach(meal => {
                        const cleanMeal = meal.replace(/[🍳☕🍛🍎🌙💧]/g, '').trim();
                        if (cleanMeal) {
                            const mealLines = doc.splitTextToSize('   ' + cleanMeal, pageWidth - 2 * margin - 10);
                            mealLines.forEach(line => {
                                if (yPos > 270) {
                                    doc.addPage();
                                    yPos = 20;
                                }
                                doc.text(line, margin + 5, yPos);
                                yPos += 7;
                            });
                        }
                    });
                }
                
                yPos += 5;
            });
        }
        
        yPos += 10;
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('🏃‍♂️ Rutinas de Ejercicio', margin, yPos);
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        if (plan.routineOptions && plan.routineOptions.length > 0) {
            plan.routineOptions.forEach((routine, index) => {
                if (index > 0) {
                    yPos += 5;
                }
                
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(`${index + 1}. ${routine.title}`, margin, yPos);
                yPos += 7;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const descLines = doc.splitTextToSize(routine.desc, pageWidth - 2 * margin);
                descLines.forEach(line => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, margin, yPos);
                    yPos += 7;
                });
                
                if (routine.exercises && Array.isArray(routine.exercises)) {
                    routine.exercises.slice(0, 10).forEach(exercise => {
                        const cleanExercise = exercise.replace(/[🪑🔸🎯⚠️📋🦯🏃‍♂️💪❤️⚖️😌🛡️⚕️🦵🦴]/g, '').trim();
                        if (cleanExercise) {
                            const exLines = doc.splitTextToSize('   ' + cleanExercise, pageWidth - 2 * margin - 10);
                            exLines.forEach(line => {
                                if (yPos > 270) {
                                    doc.addPage();
                                    yPos = 20;
                                }
                                doc.text(line, margin + 5, yPos);
                                yPos += 7;
                            });
                        }
                    });
                }
                
                yPos += 5;
            });
        }
        
        yPos += 10;
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('⚠️ IMPORTANTE', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const finalText = "Consulta siempre con tu médico antes de comenzar cualquier plan de ejercicio o dieta. Escucha a tu cuerpo y ajusta la intensidad según te sientas. La consistencia es clave para obtener resultados.";
        const finalLines = doc.splitTextToSize(finalText, pageWidth - 2 * margin);
        finalLines.forEach(line => {
            doc.text(line, pageWidth / 2, yPos, { align: 'center' });
            yPos += 7;
        });
        
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Página ${i} de ${pageCount} • BIEN-STAR - Fitness para Adultos Mayores • ${fecha}`,
                pageWidth / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }
        
        const filename = `Plan_BienStar_${p.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
        
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('¡Plan descargado como PDF exitosamente!', 'success');
    } catch(e) {
        console.error('Error generando PDF:', e);
        showError('Error al generar PDF: ' + e.message);
    }
}

function getMobilityTextPDF(mob) {
    const mobMap = {
        'silla': 'Silla de ruedas',
        'baston': 'Bastón o andador',
        'baja': 'Movilidad reducida',
        'normal': 'Movilidad normal',
        'buena': 'Buena movilidad'
    };
    return mobMap[mob] || mob;
}

function getActivityTextPDF(act) {
    const actMap = {
        'sedentario': 'Sedentario',
        'ligero': 'Ligero',
        'moderado': 'Moderado',
        'activo': 'Activo'
    };
    return actMap[act] || act;
}

function getObjectiveTextPDF(obj) {
    const objMap = {
        'movilidad': 'Mejorar movilidad',
        'equilibrio': 'Mejorar equilibrio',
        'dolor': 'Reducir dolor',
        'resistencia': 'Mejorar resistencia',
        'fuerza': 'Aumentar fuerza',
        'perder': 'Control de peso',
        'salud': 'Mejorar salud'
    };
    return objMap[obj] || obj;
}

function getDietTextPDF(diet) {
    const dietMap = {
        'balanceada': 'Balanceada',
        'mediterranea': 'Mediterránea',
        'baja_sal': 'Baja en sodio',
        'baja_azucar': 'Baja en azúcar',
        'vegana': 'Vegana',
        'vegetariana': 'Vegetariana',
        'economica': 'Económica',
        'mexicana': 'Mexicana'
    };
    return dietMap[diet] || diet;
}

async function copyPlan() {
    const data = $('downloadPlanBtn').dataset.plan;
    if(!data) { 
        showError('Por favor genera un plan primero'); 
        return; 
    }
    
    try {
        const plan = JSON.parse(data);
        const p = plan.profile;
        
        let text = `Plan BIEN-STAR para ${p.name}\n\n`;
        text += `IMC: ${plan.imc} (${imcStatusText(plan.imc)})\n`;
        text += `Calorías/día: ${plan.calories}\n\n`;
        
        text += `Recomendaciones principales:\n`;
        plan.healthRecommendations.slice(0, 3).forEach(rec => {
            text += `• ${rec.replace(/\*\*/g, '').replace(/[💡⏰🩸❤️🦵🦴]/g, '')}\n`;
        });
        
        text += `\nDieta recomendada (Opción 1):\n`;
        if (plan.dietOptions && plan.dietOptions.length > 0) {
            plan.dietOptions[0].meals.slice(0, 8).forEach(meal => {
                text += `• ${meal.replace(/[🍳☕🍛🍎🌙💧]/g, '').replace(/:.*?:/g, '').trim()}\n`;
            });
        }
        
        text += `\nRutina recomendada (Opción 1):\n`;
        if (plan.routineOptions && plan.routineOptions.length > 0) {
            plan.routineOptions[0].exercises.slice(0, 6).forEach(ex => {
                if(ex.length < 50) text += `• ${ex.replace(/[🪑🔸🎯⚠️📋]/g, '').trim()}\n`;
            });
        }
        
        await navigator.clipboard.writeText(text);
        showToast('¡Plan copiado al portapapeles!', 'success');
    } catch(e) { 
        showError('No se pudo copiar: ' + e.message); 
    }
}

function exportHistoryTXT() {
    if(!state.currentProfileId) { 
        showError('Selecciona un perfil para exportar'); 
        return; 
    }
    
    const arr = state.tracks
        .filter(t => t.profileId === state.currentProfileId)
        .sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
    
    const p = state.profiles.find(x => x.id === state.currentProfileId);
    
    let text = `HISTORIAL DE SEGUIMIENTO - BIEN-STAR\n`;
    text += `════════════════════════════════════════\n\n`;
    text += `👤 Perfil: ${p?.name || 'Sin nombre'}\n`;
    text += `📅 Exportado: ${new Date().toLocaleString('es-ES')}\n`;
    text += `📊 Total de registros: ${arr.length}\n`;
    text += `═`.repeat(40) + `\n\n`;
    
    if(arr.length === 0) {
        text += 'No hay registros de seguimiento.\n';
    } else {
        arr.forEach((t, i) => {
            text += `REGISTRO ${i+1}\n`;
            text += `─`.repeat(30) + `\n`;
            text += `Fecha: ${formatDateTime(t.dateISO)}\n`;
            text += `Estado: ${t.mood}\n`;
            if(t.notes) text += `Notas: ${t.notes}\n`;
            text += `\n`;
        });
    }
    
    text += `════════════════════════════════════════\n`;
    text += `Sistema BIEN-STAR - Fitness para Adultos Mayores\n`;
    
    downloadText(`Historial_${p?.name || 'perfil'}_${new Date().toISOString().slice(0,10)}.txt`, text);
    showToast('¡Historial exportado!', 'success');
}

function speak(text) {
    if(!window.speechSynthesis) { 
        showError('Tu navegador no soporta lectura en voz alta'); 
        return; 
    }
    
    window.speechSynthesis.cancel();
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.rate = 0.9;
    utter.pitch = 1;
    utter.volume = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es-'));
    if(spanishVoice) {
        utter.voice = spanishVoice;
    }
    
    window.speechSynthesis.speak(utter);
}

function speakPlan() {
    const dietText = $('dietOptions').textContent;
    const routineText = $('routineOptions').textContent;
    
    if((!dietText || dietText.includes('Esperando datos')) && 
        (!routineText || routineText.includes('Esperando datos'))) { 
        showError('Por favor genera un plan primero'); 
        return; 
    }
    
    let textToRead = 'Plan personalizado BIEN-STAR. ';
    
    const imc = $('imcValue').textContent;
    const calories = $('calValue').textContent;
    if(imc !== '-') {
        textToRead += `Tu índice de masa corporal es ${imc}. `;
    }
    if(calories !== '-') {
        textToRead += `Necesitas aproximadamente ${calories} calorías diarias. `;
    }
    
    const recs = $('healthRecommendations').textContent;
    if(recs && !recs.includes('Completa tus datos')) {
        textToRead += 'Recomendaciones de salud. ' + recs.substring(0, 200) + '. ';
    }
    
    if(dietText && !dietText.includes('Esperando datos')) {
        const firstDiet = dietText.split('\n').slice(0, 10).join('. ');
        textToRead += 'Plan de alimentación. ' + firstDiet.substring(0, 300) + '. ';
    }
    
    if(routineText && !routineText.includes('Esperando datos')) {
        const firstRoutine = routineText.split('\n').slice(0, 8).join('. ');
        textToRead += 'Rutina de ejercicio. ' + firstRoutine.substring(0, 300);
    }
    
    speak(textToRead);
}

function toggleDarkMode() {
    const el = document.documentElement;
    const isDark = el.getAttribute('data-theme') === 'dark';
    el.setAttribute('data-theme', isDark ? 'light' : 'dark');
    
    const btn = $('darkModeBtn');
    if (btn) {
        btn.setAttribute('aria-pressed', String(!isDark));
        btn.querySelector('i').className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        btn.querySelector('.control-text').textContent = isDark ? 'Oscuro' : 'Claro';
    }
    
    localStorage.setItem('bienstar_dark_mode', String(!isDark));
    showToast(`Modo ${isDark ? 'claro' : 'oscuro'} activado`, 'success');
}

function toggleLargeText() {
    const root = document.documentElement;
    const isLarge = root.getAttribute('data-large') === 'true';
    root.setAttribute('data-large', isLarge ? 'false' : 'true');
    
    const btn = $('bigTextBtn');
    if (btn) {
        btn.setAttribute('aria-pressed', String(!isLarge));
        btn.querySelector('.control-text').textContent = isLarge ? 'Texto' : 'Grande';
    }
    
    localStorage.setItem('bienstar_large_text', String(!isLarge));
    showToast(`Texto ${isLarge ? 'normal' : 'grande'} activado`, 'success');
}

function toggleMobileMenu() {
    const menu = $('mobileMenu');
    const fab = $('fabBtn');
    
    if (menu && fab) {
        if (menu.classList.contains('active')) {
            menu.classList.remove('active');
            fab.innerHTML = '<i class="fas fa-bars"></i>';
            state.mobileMenuOpen = false;
        } else {
            menu.classList.add('active');
            fab.innerHTML = '<i class="fas fa-times"></i>';
            state.mobileMenuOpen = true;
        }
    }
}

function setupMobileMenu() {
    const mobileMenuBtn = $('mobileMenuBtn');
    const closeMobileMenu = $('closeMobileMenu');
    const fabBtn = $('fabBtn');
    const mobileMenu = $('mobileMenu');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    if (closeMobileMenu) {
        closeMobileMenu.addEventListener('click', toggleMobileMenu);
    }
    
    if (fabBtn) {
        fabBtn.addEventListener('click', toggleMobileMenu);
    }
    
    if (mobileMenu) {
        document.addEventListener('click', (e) => {
            if (state.mobileMenuOpen && 
                !mobileMenu.contains(e.target) && 
                !fabBtn.contains(e.target) &&
                (!mobileMenuBtn || !mobileMenuBtn.contains(e.target))) {
                toggleMobileMenu();
            }
        });
        
        const mobileMenuItems = document.querySelectorAll('.mobile-menu-item');
        mobileMenuItems.forEach(item => {
            item.addEventListener('click', () => {
                toggleMobileMenu();
            });
        });
    }
}

function setupConditionValidation() {
    const conditionCheckboxes = document.querySelectorAll('input[name="cond"]');
    const noneCheckbox = document.getElementById('none-cb');
    const errorElement = document.getElementById('conditionError');
    
    if (!conditionCheckboxes.length || !noneCheckbox) return;
    
    function showConditionError(message) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            errorElement.classList.add('fade-in');
        }
    }
    
    function clearConditionError() {
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            errorElement.classList.remove('fade-in');
        }
    }
    
    function handleNoneChange() {
        if (noneCheckbox.checked) {
            conditionCheckboxes.forEach(cb => {
                if (cb !== noneCheckbox && cb.checked) {
                    cb.checked = false;
                }
            });
            clearConditionError();
        }
    }
    
    function handleConditionChange(changedCheckbox) {
        if (changedCheckbox.checked && changedCheckbox !== noneCheckbox) {
            if (noneCheckbox.checked) {
                noneCheckbox.checked = false;
            }
            clearConditionError();
        }
    }
    
    function updateCheckboxStyle(checkbox) {
        if (checkbox.checked) {
            checkbox.parentElement.style.background = '#e9f7ef';
            checkbox.parentElement.style.borderColor = 'var(--verde-claro)';
        } else {
            checkbox.parentElement.style.background = '#f8f9fa';
            checkbox.parentElement.style.borderColor = '#e9ecef';
        }
    }
    
    conditionCheckboxes.forEach(cb => {
        updateCheckboxStyle(cb);
        
        cb.addEventListener('change', function() {
            updateCheckboxStyle(this);
            
            if (this === noneCheckbox) {
                handleNoneChange();
            } else {
                handleConditionChange(this);
            }
            
            const checkedConditions = Array.from(conditionCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            
            if (checkedConditions.length === 0) {
                showConditionError('Selecciona al menos una condición o marca "Ninguna"');
                return false;
            }
            
            if (checkedConditions.includes('ninguna') && checkedConditions.length > 1) {
                showConditionError('No puedes seleccionar "Ninguna" junto con otras condiciones');
                setTimeout(() => {
                    noneCheckbox.checked = false;
                    updateCheckboxStyle(noneCheckbox);
                }, 100);
                return false;
            }
            
            clearConditionError();
            return true;
        });
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            generatePlanFromForm();
        }
        
        if(e.key === 'Escape') {
            const errorEl = $('formError');
            if(errorEl) errorEl.textContent = '';
            
            if (state.mobileMenuOpen) {
                toggleMobileMenu();
            }
        }
        
        if((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveCurrentProfile();
        }
        
        if((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            toggleDarkMode();
        }
        
        if((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            toggleLargeText();
        }
        
        if((e.ctrlKey || e.metaKey) && e.key === 'm' && window.innerWidth < 768) {
            e.preventDefault();
            toggleMobileMenu();
        }
        
        // Atajo Ctrl+P para generar PDF del perfil
        if((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            if (state.currentProfileId) {
                const profile = state.profiles.find(p => p.id === state.currentProfileId);
                if (profile) generateProfilePDF(profile);
            }
        }
    });
}

// ============================================
// FUNCIONES PARA WHATSAPP
// ============================================

function validatePhoneNumber(phone) {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
}

function getWhatsAppMessage(profile, planData) {
    const date = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    let message = `*BIEN-STAR - Plan Personalizado*\n\n`;
    message += `👤 *Perfil:* ${profile.name}\n`;
    message += `📅 *Fecha:* ${date}\n\n`;
    message += `📊 *Resumen:*\n`;
    message += `• Edad: ${profile.age} años\n`;
    message += `• IMC: ${planData.imc ? planData.imc.toFixed(1) : 'N/A'}\n`;
    message += `• Calorías/día: ${planData.calories || 'N/A'}\n`;
    message += `• Objetivo: ${getObjectiveTextPDF(profile.objective)}\n\n`;
    
    message += `💡 *Recomendaciones principales:*\n`;
    if (planData.healthRecommendations && planData.healthRecommendations.length > 0) {
        planData.healthRecommendations.slice(0, 3).forEach(rec => {
            const cleanRec = rec.replace(/\*\*/g, '').replace(/[💡⏰🩸❤️🦵🦴]/g, '').trim();
            message += `• ${cleanRec}\n`;
        });
    }
    
    message += `\n⚠️ *Importante:* Consulta siempre con tu médico antes de comenzar. Escucha a tu cuerpo y ajusta la intensidad según te sientas. La consistencia es clave para obtener resultados.`;
    
    return message;
}

function init() {
    console.log('🚀 Iniciando BIEN-STAR Wizard - Versión Mejorada');
    
    loadFromStorage();
    
    // Configurar modo oscuro si está activo
    const darkMode = localStorage.getItem('bienstar_dark_mode') === 'true';
    if(darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Configurar texto grande si está activo
    const largeText = localStorage.getItem('bienstar_large_text') === 'true';
    if(largeText) {
        document.documentElement.setAttribute('data-large', 'true');
    }
    
    // Cargar primer perfil si existe
    if(state.profiles.length > 0) {
        state.currentProfileId = state.profiles[0].id;
        selectProfile(state.currentProfileId);
    }
    
    renderProfiles();
    refreshHistoryUI();
    
    // Configurar validación de condiciones
    setupConditionValidation();
    
    // Configurar validación de inputs numéricos
    ['age', 'height', 'weight'].forEach(id => {
        const element = $(id);
        if (element) {
            element.addEventListener('input', function() {
                const value = parseInt(this.value);
                if(value && (value < this.min || value > this.max)) {
                    this.style.borderColor = 'var(--vino-claro)';
                    this.style.boxShadow = '0 0 0 3px rgba(155, 45, 58, 0.15)';
                } else {
                    this.style.borderColor = '';
                    this.style.boxShadow = '';
                }
            });
        }
    });
    
    // Configurar responsive
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            renderProfiles();
            refreshHistoryUI();
        }, 250);
    });
    
    console.log('✅ BIEN-STAR Wizard inicializado correctamente');
}

// Inicializar cuando el DOM esté listo
if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Exportar funciones globales
window.bienstar = {
    state,
    generatePlanFromForm,
    saveCurrentProfile,
    downloadPlan,
    generateProfilePDF,
    version: '10.0-wizard'
};