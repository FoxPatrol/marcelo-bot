// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { addDoc, collection, getFirestore } from "firebase/firestore/lite";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgg4cQOg7ZkQrkI-GOpPkINcMbI7apiBM",
  authDomain: "marcelo-bot.firebaseapp.com",
  projectId: "marcelo-bot",
  storageBucket: "marcelo-bot.appspot.com",
  messagingSenderId: "187607780746",
  appId: "1:187607780746:web:e7a72e51ad1b41f5884c73"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function createTicket(messageId: string, text: string) {
  try {
    await addDoc(collection(db, 'tickets'), {
      threadId: messageId,
      text,
      openedAt: Date()
    })
  } catch(e) {
    console.error("Error adding document: ", e)
  }
}