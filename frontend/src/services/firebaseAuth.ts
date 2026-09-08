import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { firebaseAuth } from '../config/firebase';

export const registerWithFirebase = async (email: string, password: string): Promise<FirebaseUser> => {
  const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  if (userCredential.user) {
    try {
      await sendEmailVerification(userCredential.user);
    } catch (e) {
      console.warn("Firebase email verification send warning:", e);
    }
  }
  return userCredential.user;
};

export const loginWithFirebase = async (email: string, password: string): Promise<FirebaseUser> => {
  const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return userCredential.user;
};

export const sendVerificationEmailLink = async (): Promise<void> => {
  const currentUser = firebaseAuth.currentUser;
  if (currentUser) {
    await sendEmailVerification(currentUser);
  }
};

export const checkFirebaseEmailVerified = async (): Promise<boolean> => {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) return true; // Default fallback if using dev accounts
  await currentUser.reload();
  return currentUser.emailVerified;
};

export const logoutFirebase = async (): Promise<void> => {
  await signOut(firebaseAuth);
};
