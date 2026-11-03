import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';

// -------------------------------------------------------------
// REPLACE THIS WITH YOUR FIREBASE CONFIG FROM FIREBASE CONSOLE
// -------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDfs3IZ2MwF-PafzGKGANt9I7rApkGBfPg",
  authDomain: "thinkstodo.firebaseapp.com",
  projectId: "thinkstodo",
  storageBucket: "thinkstodo.firebasestorage.app",
  messagingSenderId: "235574521798",
  appId: "1:235574521798:web:1fda86d6b1067e8645ccc7",
  measurementId: "G-G2MHWXW5R1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState('');
  const [dueDate, setDueDate] = useState('');

  // 1. Listen for user authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch tasks from Firestore in real-time when logged in
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const q = query(collection(db, 'todos'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(fetchedTasks);
    });

    return () => unsubscribe();
  }, [user]);

  // Google Sign In
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    await signOut(auth);
  };

  // Create Task (saves current date as Created Date + selected Due Date)
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskText.trim()) return;

    await addDoc(collection(db, 'todos'), {
      userId: user.uid,
      text: taskText,
      dueDate: dueDate || 'No due date',
      createdAt: new Date().toLocaleString(), // Stored when created
      isDone: false,
      completedAt: null
    });

    setTaskText('');
    setDueDate('');
  };

  // Mark Done (stamps current date/time when Done is clicked)
  const handleMarkDone = async (taskId) => {
    const taskRef = doc(db, 'todos', taskId);
    await updateDoc(taskRef, {
      isDone: true,
      completedAt: new Date().toLocaleString() // Stored when marked done
    });
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    await deleteDoc(doc(db, 'todos', taskId));
  };

  if (!user) {
    return (
      <div style={styles.centerContainer}>
        <h2>To-Do App</h2>
        <p>Please sign in with your Gmail account to manage your tasks.</p>
        <button style={styles.googleBtn} onClick={handleSignIn}>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h3>Welcome, {user.displayName}</h3>
          <p style={styles.emailText}>{user.email}</p>
        </div>
        <button style={styles.logoutBtn} onClick={handleSignOut}>Sign Out</button>
      </header>

      {/* Task Creation Form */}
      <form onSubmit={handleAddTask} style={styles.form}>
        <input 
          type="text" 
          placeholder="What needs to be done?" 
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          required
          style={styles.input}
        />
        <input 
          type="date" 
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.addBtn}>Save Task</button>
      </form>

      {/* Task List */}
      <h3>Your Tasks</h3>
      {tasks.length === 0 ? (
        <p>No tasks found. Add your first task above!</p>
      ) : (
        <ul style={styles.taskList}>
          {tasks.map(task => (
            <li key={task.id} style={{ ...styles.taskItem, opacity: task.isDone ? 0.7 : 1 }}>
              <div>
                <h4 style={{ textDecoration: task.isDone ? 'line-through' : 'none', margin: '0 0 8px 0' }}>
                  {task.text}
                </h4>
                <p style={styles.dateLabel}>📅 <strong>Created:</strong> {task.createdAt}</p>
                <p style={styles.dateLabel}>⏰ <strong>Due Date:</strong> {task.dueDate}</p>
                {task.isDone && (
                  <p style={styles.completedLabel}>✅ <strong>Completed On:</strong> {task.completedAt}</p>
                )}
              </div>

              <div>
                {!task.isDone && (
                  <button style={styles.doneBtn} onClick={() => handleMarkDone(task.id)}>
                    Done
                  </button>
                )}
                <button style={styles.deleteBtn} onClick={() => handleDeleteTask(task.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Basic inline styling
const styles = {
  centerContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', fontFamily: 'sans-serif' },
  container: { maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif', border: '1px solid #ddd', borderRadius: '10px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
  emailText: { margin: 0, color: '#666', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' },
  input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '16px' },
  addBtn: { padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' },
  googleBtn: { padding: '12px 24px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' },
  logoutBtn: { padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  taskList: { listStyle: 'none', padding: 0 },
  taskItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '10px', background: '#f9fafb' },
  dateLabel: { margin: '2px 0', fontSize: '12px', color: '#4b5563' },
  completedLabel: { margin: '2px 0', fontSize: '12px', color: '#16a34a', fontWeight: 'bold' },
  doneBtn: { padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '5px' },
  deleteBtn: { padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }
};