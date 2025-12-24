// --- IMPORTAÇÕES DO FIREBASE (V9) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    onSnapshot, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- 1. CONFIGURAÇÃO ---
const firebaseConfig = {
    apiKey: "AIzaSyCvS2rnWz2qqyet_eqwTNQ6hSdlyxgoHjY",
    authDomain: "beautytime-1f1a9.firebaseapp.com",
    projectId: "beautytime-1f1a9",
    storageBucket: "beautytime-1f1a9.firebasestorage.app",
    messagingSenderId: "502374683776",
    appId: "1:502374683776:web:6d9f57c7309b58279ac265",
    measurementId: "G-2MMEH73BLL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Variáveis de Estado
let currentUser = null;
let selectedTime = null;

// Elementos da Tela
const loginScreen = document.getElementById('auth-container');
const appScreen = document.getElementById('app-container');
const inputDate = document.getElementById('date-select');
const inputService = document.getElementById('service-select');
const slotsContainer = document.getElementById('slots-container');

// --- 2. AUTENTICAÇÃO GOOGLE ---

// Monitora login/logout
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário logado
        currentUser = user;
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');

        // Preenche dados do usuário na tela
        document.getElementById('user-display').innerText = user.displayName;
        document.getElementById('user-photo').src = user.photoURL;

        carregarMeusAgendamentos();
    } else {
        // Usuário deslogado
        currentUser = null;
        loginScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
    }
});

// Botão Entrar
document.getElementById('btnGoogle').addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error(error);
        alert("Não foi possível entrar com o Google.");
    }
});

// Botão Sair
document.getElementById('btnLogout').addEventListener('click', () => {
    signOut(auth);
    window.location.reload(); // Recarrega a página para limpar estados
});

// --- 3. LÓGICA DE AGENDAMENTO ---

inputDate.addEventListener('change', carregarHorarios);

async function carregarHorarios() {
    const data = inputDate.value;
    if (!data) return;

    slotsContainer.innerHTML = '<p class="hint">Carregando disponibilidade...</p>';

    // Horários fixos do salão
    const agendaPadrao = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

    // Busca agendamentos existentes no Firestore
    const q = query(collection(db, "agendamentos"), where("data", "==", data));
    const snapshot = await getDocs(q);
    const ocupados = snapshot.docs.map(doc => doc.data().horario);

    // Renderiza a grade
    slotsContainer.innerHTML = '';
    agendaPadrao.forEach(hora => {
        const div = document.createElement('div');
        div.className = 'slot';
        div.innerText = hora;

        if (ocupados.includes(hora)) {
            div.classList.add('taken');
            div.title = "Indisponível";
        } else {
            div.onclick = () => selecionarHorario(div, hora);
        }
        slotsContainer.appendChild(div);
    });
}

function selecionarHorario(el, hora) {
    document.querySelectorAll('.slot.selected').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    selectedTime = hora;

    // Pequeno delay para a UI atualizar antes do confirm
    setTimeout(() => {
        if(confirm(`Confirmar agendamento para ${inputDate.value} às ${hora}?`)) {
            salvarNoBanco();
        }
    }, 50);
}

async function salvarNoBanco() {
    if (!currentUser || !selectedTime) return;

    try {
        await addDoc(collection(db, "agendamentos"), {
            // Campos obrigatórios conforme suas Regras de Segurança
            cliente: currentUser.displayName, 
            data: inputDate.value,
            horario: selectedTime,
            
            // Campos extras
            uid: currentUser.uid,
            servico: inputService.value,
            criado_em: new Date().toISOString()
        });

        alert("Agendamento realizado com sucesso!");
        selectedTime = null;
        carregarHorarios(); // Atualiza a tela para bloquear o horário
    } catch (error) {
        console.error("Erro ao gravar:", error);
        alert("Erro ao agendar. Tente novamente.");
    }
}

// --- 4. LISTA DE AGENDAMENTOS ---

function carregarMeusAgendamentos() {
    const lista = document.getElementById('appointments-list');
    
    // Mostra apenas agendamentos do usuário logado
    const q = query(collection(db, "agendamentos"), where("uid", "==", currentUser.uid));

    onSnapshot(q, (snapshot) => {
        lista.innerHTML = '';
        if (snapshot.empty) {
            lista.innerHTML = '<li style="justify-content: center; color: #888;">Nenhum agendamento encontrado.</li>';
            return;
        }

        snapshot.forEach(doc => {
            const dados = doc.data();
            // Inverte data de YYYY-MM-DD para DD/MM/YYYY
            const dataBR = dados.data.split('-').reverse().join('/');
            
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <strong>${dataBR} às ${dados.horario}</strong>
                    <div style="font-size: 13px; color: #666;">${dados.servico}</div>
                </div>
                <div style="text-align:right">
                    <span style="display:block; font-size:12px; color:green; font-weight:bold;">Confirmado</span>
                </div>
            `;
            lista.appendChild(li);
        });
    });
}
