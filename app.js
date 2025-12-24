// Importações do Firebase v9 (Direto do CDN para não precisar de instalações locais complexas)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

// Variáveis Globais
let currentUser = null;
let selectedTime = null;

// Elementos do DOM
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const dateInput = document.getElementById('date-select');
const slotsContainer = document.getElementById('slots-container');
const serviceSelect = document.getElementById('service-select');
const appointmentsList = document.getElementById('appointments-list');

// --- 2. AUTENTICAÇÃO ---

// Observador de Estado (Logado ou Não)
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        document.getElementById('user-display').innerText = user.email;
        carregarMeusAgendamentos();
    } else {
        currentUser = null;
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});

// Botão Cadastrar
document.getElementById('btnSignup').addEventListener('click', () => {
    createUserWithEmailAndPassword(auth, emailInput.value, passInput.value)
        .then(() => alert("Conta criada!"))
        .catch((error) => alert("Erro: " + error.message));
});

// Botão Entrar
document.getElementById('btnLogin').addEventListener('click', () => {
    signInWithEmailAndPassword(auth, emailInput.value, passInput.value)
        .catch((error) => alert("Erro ao entrar: " + error.message));
});

// Botão Sair
document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));


// --- 3. LÓGICA DE AGENDAMENTO ---

// Quando muda a data, carrega horários
dateInput.addEventListener('change', carregarHorarios);

async function carregarHorarios() {
    const dataSelecionada = dateInput.value;
    if (!dataSelecionada) return;

    slotsContainer.innerHTML = '<p>Carregando...</p>';

    // Horários possíveis (Exemplo: 9h às 18h)
    const horariosBase = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

    // Buscar no Firebase quais já estão ocupados nesta data
    const q = query(collection(db, "agendamentos"), where("data", "==", dataSelecionada));
    const snapshot = await getDocs(q);
    
    const horariosOcupados = snapshot.docs.map(doc => doc.data().horario);

    slotsContainer.innerHTML = ''; // Limpa

    horariosBase.forEach(hora => {
        const div = document.createElement('div');
        div.className = 'slot';
        div.innerText = hora;

        if (horariosOcupados.includes(hora)) {
            div.classList.add('taken');
            div.title = "Indisponível";
        } else {
            div.onclick = () => selecionarHorario(div, hora);
        }
        slotsContainer.appendChild(div);
    });
}

function selecionarHorario(elemento, hora) {
    // Remove seleção anterior
    document.querySelectorAll('.slot.selected').forEach(el => el.classList.remove('selected'));
    
    // Adiciona nova seleção
    elemento.classList.add('selected');
    selectedTime = hora;
    
    // Pergunta se quer confirmar
    if(confirm(`Confirmar agendamento para ${dateInput.value} às ${hora}?`)) {
        salvarAgendamento();
    }
}

async function salvarAgendamento() {
    if (!currentUser || !selectedTime || !dateInput.value) return;

    try {
        await addDoc(collection(db, "agendamentos"), {
            uid: currentUser.uid,
            email: currentUser.email,
            servico: serviceSelect.value,
            data: dateInput.value,
            horario: selectedTime,
            criado_em: new Date()
        });
        alert("Agendamento Confirmado!");
        selectedTime = null;
        carregarHorarios(); // Recarrega para bloquear o horário
    } catch (e) {
        console.error("Erro", e);
        alert("Erro ao salvar.");
    }
}

// --- 4. LISTAGEM EM TEMPO REAL ---

function carregarMeusAgendamentos() {
    const q = query(collection(db, "agendamentos"), where("uid", "==", currentUser.uid));
    
    // onSnapshot atualiza a lista automaticamente se algo mudar no banco
    onSnapshot(q, (snapshot) => {
        appointmentsList.innerHTML = '';
        if (snapshot.empty) {
            appointmentsList.innerHTML = '<li>Nenhum agendamento encontrado.</li>';
        }
        
        snapshot.forEach((docSnap) => {
            const agendamento = docSnap.data();
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <strong>${agendamento.data} - ${agendamento.horario}</strong><br>
                    <small>${agendamento.servico}</small>
                </div>
                <button class="btn-delete" data-id="${docSnap.id}">X</button>
            `;
            
            // Botão de Excluir
            li.querySelector('.btn-delete').onclick = async () => {
                if(confirm("Cancelar este agendamento?")) {
                    await deleteDoc(doc(db, "agendamentos", docSnap.id));
                    carregarHorarios(); // Atualiza a grade se for no mesmo dia
                }
            };

            appointmentsList.appendChild(li);
        });
    });
}
