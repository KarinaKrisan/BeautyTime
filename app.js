// Importa as funções do Firebase (Core e Analytics)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";

// ADICIONADO: Importa as funções do Banco de Dados (Firestore)
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Sua configuração do Firebase (BeautyTime)
const firebaseConfig = {
    apiKey: "AIzaSyCvS2rnWz2qqyet_eqwTNQ6hSdlyxgoHjY",
    authDomain: "beautytime-1f1a9.firebaseapp.com",
    projectId: "beautytime-1f1a9",
    storageBucket: "beautytime-1f1a9.firebasestorage.app",
    messagingSenderId: "502374683776",
    appId: "1:502374683776:web:6d9f57c7309b58279ac265",
    measurementId: "G-2MMEH73BLL"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inicializa o Banco de Dados
const db = getFirestore(app);

// --- LÓGICA DA AGENDA ---

// Referência aos elementos da tela
const bookingForm = document.getElementById('bookingForm');
const appointmentsList = document.getElementById('appointmentsList');
const messageDiv = document.getElementById('message');

// 1. Função para SALVAR agendamento
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;

        // Limpa mensagem anterior
        messageDiv.innerHTML = '<div class="alert alert-info">Processando...</div>';

        try {
            // Salva na coleção "agendamentos" do seu projeto BeautyTime
            await addDoc(collection(db, "agendamentos"), {
                cliente: name,
                data: date,
                horario: time,
                criadoEm: new Date()
            });
            
            messageDiv.innerHTML = '<div class="alert alert-success">Agendado com sucesso!</div>';
            bookingForm.reset();
            
        } catch (error) {
            console.error("Erro ao agendar: ", error);
            messageDiv.innerHTML = `<div class="alert alert-danger">Erro: ${error.message}</div>`;
        }
    });
}

// 2. Função para LER agendamentos em tempo real
if (appointmentsList) {
    // Busca ordenado por data e depois horário
    const q = query(collection(db, "agendamentos"), orderBy("data"), orderBy("horario"));

    onSnapshot(q, (snapshot) => {
        appointmentsList.innerHTML = ""; // Limpa a lista visual
        
        if (snapshot.empty) {
            appointmentsList.innerHTML = '<li class="list-group-item">Nenhum agendamento encontrado.</li>';
            return;
        }

        snapshot.forEach((doc) => {
            const appointment = doc.data();
            
            // Cria o item da lista
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            
            // Formata a data para visualização (opcional)
            // Exibe: 2023-12-25 - 14:00 (Cliente)
            li.innerHTML = `
                <div>
                    <strong>${appointment.data}</strong> às <strong>${appointment.horario}</strong>
                </div>
                <span class="badge bg-primary rounded-pill">${appointment.cliente}</span>
            `;
            appointmentsList.appendChild(li);
        });
    });
}
