import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqUch5PjqBmpM2xduo_kG4CMlvFonoa-E",
  authDomain: "tugerente-50e25.firebaseapp.com",
  projectId: "tugerente-50e25",
  storageBucket: "tugerente-50e25.appspot.com",
  messagingSenderId: "30353541577",
  appId: "1:30353541577:web:86d1326cae1cd7dfbb4018"
};

// Initialize Firebase
const app1 = initializeApp(firebaseConfig);
export default app1