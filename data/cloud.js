import { getApps, getApp, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, getDocs, getFirestore, writeBatch, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, onSnapshot, setDoc } from 'firebase/firestore';
import { config } from '../firebase.config.js';
const existing = getApps().some(app => app.name === '[DEFAULT]');
const app = existing ? getApp() : initializeApp(config);
const db = existing ? getFirestore(app) : initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
export const auth = getAuth(app);
export const watchAuth = cb => onAuthStateChanged(auth,cb);
export const login = () => signInWithPopup(auth,new GoogleAuthProvider());
export const logout = () => signOut(auth);
// Deletes only the Skills data of the signed-in user. The Firebase user is shared with
// other VitalOS modules and is deliberately NOT deleted here (see docs/ANDROID-RELEASE.md).
export async function deleteSkillsData() {
  const user = auth.currentUser;
  if (!user) throw new Error('Nicht angemeldet');
  const snapshot = await getDocs(collection(db,'skillsUsers',user.uid,'events'));
  for (let i = 0; i < snapshot.docs.length; i += 400) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i,i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}
export function watchEvents(uid, next, error) {
  return onSnapshot(collection(db,'skillsUsers',uid,'events'), {includeMetadataChanges:true}, snapshot => next(snapshot.docs.map(d => d.data()),snapshot.metadata),error);
}
export function uploadEvent(uid,event) {
  // Immutable, idempotent document IDs; never send whole progress arrays.
  return setDoc(doc(db,'skillsUsers',uid,'events',event.id),event);
}
