// --- IMPORTAÇÕES DO FIREBASE (Versão 9 Modular) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
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

// --- 1. CONFIGURAÇÃO (SUAS CHAVES) ---
const firebaseConfig = {
    apiKey: "AIzaSyCvS2rnWz2qqyet_eqwTNQ6hSdlyxgoHjY",
    authDomain: "beautytime-1f1a9.firebaseapp.com",
    projectId: "beautytime-1f1a9",
    storageBucket: "beautytime-1f1a9.firebasestorage.app",
    messagingSenderId: "502374683776",
    appId: "1:502374683776:web:6d9f57c7309b58279ac265",
    measurementId: "G-2MMEH73BLL"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Variáveis de Estado
let currentUser = null;
let selectedTime = null;

// Elementos da Tela
const views = {
    auth: document.getElementById('auth-container'),
    app: document.getElementById('app-container')
};

const inputs = {
    email: document.getElementById('email'),
    pass: document.getElementById('password'),
    date: document.getElementById('date-select'),
    service: document.getElementById('service-select')
};

// --- 2. SISTEMA DE LOGIN ---

// Monitora se o usuário entrou ou saiu
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        views.auth.classList.add('hidden');
        views.app.classList.remove('hidden');
        
        // Se tiver nome (Google) usa ele, senão usa o email
        const displayName = user.displayName || user.email.split('@')[0];
        document.getElementById('user-display').innerText = displayName;
        
        carregarMeusAgendamentos();
    } else {
        currentUser = null;
        views.auth.classList.remove('hidden');
        views.app.classList.add('hidden');
    }
});

// Botão Login com Google
document.getElementById('btnGoogle').addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        alert("Erro no Google: " + error.message);
    }
});

// Botão Cadastrar (Email/Senha)
document.getElementById('btnSignup').addEventListener('click', () => {
    createUserWithEmailAndPassword(auth, inputs.email.value, inputs.pass.value)
        .then(() => alert("Conta criada!"))
        .catch(err => alert("Erro: " + err.message));
});

// Botão Entrar (Email/Senha)
document.getElementById('btnLogin').addEventListener('click', () => {
    signInWithEmailAndPassword(auth, inputs.email.value, inputs.pass.value)
        .catch(err => alert("Erro: " + err.message));
});

// Botão Sair
document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));


// --- 3. LÓGICA DE AGENDAMENTO ---

// Quando muda a data, busca horários no banco
inputs.date.addEventListener('change', carregarHorarios);

async function carregarHorarios() {
    const dataEscolhida = inputs.date.value;
    const container = document.getElementById('slots-container');
    
    if (!dataEscolhida) return;

    container.innerHTML = '<p class="hint">Verificando agenda...</p>';

    // Lista de horários fixos do salão
    const horariosDisponiveis = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

    // Busca no Firestore o que já está ocupado nessa data
    const q = query(collection(db, "agendamentos"), where("data", "==", dataEscolhida));
    const snapshot = await getDocs(q);
    const ocupados = snapshot.docs.map(doc => doc.data().horario);

    // Renderiza os botões
    container.innerHTML = '';
    horariosDisponiveis.forEach(hora => {
        const div = document.createElement('div');
        div.className = 'slot';
        div.innerText = hora;

        if (ocupados.includes(hora)) {
            div.classList.add('taken'); // Estilo vermelho/bloqueado
            div.title = "Horário Ocupado";
        } else {
            div.onclick = () => selecionarHorario(div, hora);
        }
        container.appendChild(div);
    });
}

function selecionarHorario(el, hora) {
    // Limpa seleção anterior
    document.querySelectorAll('.slot.selected').forEach(e => e.classList.remove('selected'));
    
    // Marca o novo
    el.classList.add('selected');
    selectedTime = hora;

    // Confirmação simples
    setTimeout(() => {
        if(confirm(`Confirmar agendamento para ${inputs.date.value} às ${hora}?`)) {
            salvarAgendamento();
        }
    }, 100);
}

async function salvarAgendamento() {
    if (!currentUser || !selectedTime) return;

    // Define o nome do cliente (Necessário para suas regras de segurança)
    // Se for Google, pega o displayName. Se for Email, pega o email.
    const nomeCliente = currentUser.displayName || currentUser.email;

    const novoAgendamento = {
        cliente: nomeCliente, // Campo OBRIGATÓRIO nas suas regras
        data: inputs.date.value,
        horario: selectedTime,
        servico: inputs.service.value,
        uid: currentUser.uid, // Útil para filtrar "meus agendamentos"
        criado_em: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "agendamentos"), novoAgendamento);
        alert("Agendamento realizado com sucesso!");
        selectedTime = null;
        carregarHorarios(); // Atualiza a grade
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar: Verifique se todos os campos estão preenchidos.");
    }
}

// --- 4. MEUS AGENDAMENTOS (TEMPO REAL) ---

function carregarMeusAgendamentos() {
    const lista = document.getElementById('appointments-list');
    
    // Busca agendamentos onde o UID é igual ao do usuário logado
    const q = query(collection(db, "agendamentos"), where("uid", "==", currentUser.uid));

    onSnapshot(q, (snapshot) => {
        lista.innerHTML = '';
        if (snapshot.empty) {
            lista.innerHTML = '<li style="justify-content:center; color:#777;">Você não tem agendamentos.</li>';
            return;
        }

        snapshot.forEach(doc => {
            const dados = doc.data();
            // Formata a data para padrão BR (dd/mm/aaaa)
            const dataFormatada = dados.data.split('-').reverse().join('/');
            
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <strong>${dataFormatada} às ${dados.horario}</strong>
                    <div style="font-size:13px; color:#555">${dados.servico}</div>
                </div>
                <span style="font-size:12px; color:green;">Confirmado</span>
            `;
            lista.appendChild(li);
        });
    });
}
