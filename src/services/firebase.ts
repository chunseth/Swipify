import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyCxJUNEX4aTHUuvBHX2gKB2VlOvBqmVLYo",
    authDomain: "swipify-24b99.firebaseapp.com",
    projectId: "swipify-24b99",
    databaseURL: "https://swipify-24b99-default-rtdb.firebaseio.com/",
    storageBucket: "swipify-24b99.firebasestorage.app",
    messagingSenderId: "897204697458",
    appId: "1:897204697458:web:e5fe5c4825b17a11e5c5eb"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);