import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const hubConfig = {
  apiKey:            "AIzaSyBgWBwt_yzANIwvNFMRpQ0ZojaaJPFJDmo",
  authDomain:        "sharedhub-75b02.firebaseapp.com",
  projectId:         "sharedhub-75b02",
  storageBucket:     "sharedhub-75b02.appspot.com",
  messagingSenderId: "1083303718370",
  appId:             "1:1083303718370:web:7188b52594e0b907bcddbb",
};

const hubApp = getApps().find(a => a.name === "hub")
  ?? initializeApp(hubConfig, "hub");

export const hubDb   = getFirestore(hubApp);
export const hubAuth = getAuth(hubApp);