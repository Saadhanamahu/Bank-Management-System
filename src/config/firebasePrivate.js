import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const privateConfig = {
  apiKey:            "AIzaSyCsvyI_C0fDMWKKFs8C92RPs9Pn2vI1ovc",
  authDomain:        "smbank.firebaseapp.com",
  projectId:         "smbank",
  storageBucket:     "smbank.firebasestorage.app",
  messagingSenderId: "391543089030",
  appId:             "1:391543089030:web:8e85c78523e09e2511ae07",
};

const privateApp = getApps().find(a => a.name === "private")
  ?? initializeApp(privateConfig, "private");

export const privateDb   = getFirestore(privateApp);
export const privateAuth = getAuth(privateApp);