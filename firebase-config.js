// =============================================
// CONFIGURACIÓN DE FIREBASE
// Reemplazá estos valores con los de tu proyecto Firebase
// =============================================

const firebaseConfig = {
  apiKey: "AIzaSyB_jiV-nHFXe5HdvAYzzTnxlALG4GO7WXI",
  authDomain: "app-deposito-373cc.firebaseapp.com",
  projectId: "app-deposito-373cc",
  storageBucket: "app-deposito-373cc.firebasestorage.app",
  messagingSenderId: "788742122890",
  appId: "1:788742122890:web:c9402f3f0cbb5a5dadac73",
  measurementId: "G-HMCP0R3D5Z"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Email del administrador
const ADMIN_EMAIL = "pereznicolasemanuel@gmail.com";
