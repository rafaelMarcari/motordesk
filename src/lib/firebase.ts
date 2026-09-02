import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const fallbackConfig = {
  projectId: "centered-repeater-4x4wp",
  appId: "1:605741677403:web:f7c23ddb74a79b6648b87e",
  apiKey: "AIzaSyBNlO7Ac7m7FdpfBkkTKTF-d5U_tJdPO3s",
  authDomain: "centered-repeater-4x4wp.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-motordesk-482bfc36-4102-4b50-8248-5f7c219505fc",
  storageBucket: "centered-repeater-4x4wp.firebasestorage.app",
  messagingSenderId: "605741677403"
};

const app = !getApps().length ? initializeApp(fallbackConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
