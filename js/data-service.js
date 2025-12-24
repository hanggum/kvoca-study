class DataService {
    constructor() {
        this.type = 'local'; // 'local' or 'firebase'
        this.db = null;
        this.auth = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        // Check if Firebase script is loaded and config exists
        if (window.firebase && window.firebaseConfig && window.firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(window.firebaseConfig);
                }
                this.db = firebase.firestore();
                this.auth = firebase.auth();
                this.type = 'firebase';
                console.log('🌐 Connected to Firebase');
            } catch (e) {
                console.error('Firebase init failed, falling back to LocalStorage', e);
                this.type = 'local';
            }
        } else {
            console.log('💾 Using LocalStorage (Firebase not configured)');
            this.type = 'local';
            this._initLocalData();
        }
        this.initialized = true;
    }

    _initLocalData() {
        // Initialize demo data if empty
        if (!localStorage.getItem('users')) {
            // (Copy demo data logic from auth.js if needed, or rely on auth.js to do it initially)
            // We'll let existing auth.js logic handle seed for now if possible, 
            // but ideally this service handles it.
        }
    }

    // --- USERS ---
    async getUsers() {
        await this.init();
        if (this.type === 'firebase') {
            const snapshot = await this.db.collection('users').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            return JSON.parse(localStorage.getItem('users') || '[]');
        }
    }

    async getUser(field, value) {
        await this.init();
        if (this.type === 'firebase') {
            // value should be unique for username
            const snapshot = await this.db.collection('users').where(field, '==', value).get();
            if (snapshot.empty) return null;
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        } else {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            return users.find(u => u[field] === value) || null;
        }
    }

    async saveUser(user) {
        await this.init();
        if (this.type === 'firebase') {
            // If id exists, set. If not, add.
            // Ensure ID is string.
            const { id, ...data } = user;
            if (id) {
                await this.db.collection('users').doc(id).set(user, { merge: true });
                return user;
            } else {
                const ref = await this.db.collection('users').add(user);
                return { id: ref.id, ...user };
            }
        } else {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const index = users.findIndex(u => u.id === user.id);
            if (index !== -1) {
                users[index] = user;
            } else {
                users.push(user);
            }
            localStorage.setItem('users', JSON.stringify(users));
            return user;
        }
    }

    async deleteUser(userId) {
        await this.init();
        if (this.type === 'firebase') {
            await this.db.collection('users').doc(userId).delete();
        } else {
            let users = JSON.parse(localStorage.getItem('users') || '[]');
            users = users.filter(u => u.id !== userId);
            localStorage.setItem('users', JSON.stringify(users));
        }
    }

    // --- ASSIGNMENTS ---
    async getAssignments() {
        await this.init();
        if (this.type === 'firebase') {
            const snapshot = await this.db.collection('assignments').orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            return JSON.parse(localStorage.getItem('assignments') || '[]');
        }
    }

    async saveAssignment(assignment) {
        await this.init();
        if (this.type === 'firebase') {
            const { id, ...data } = assignment;
            // Use provided ID or generate
            const docId = id || 'assign_' + Date.now();
            await this.db.collection('assignments').doc(docId).set({ ...assignment, id: docId });
            return await this.getAssignment(docId); // Return full obj
        } else {
            const list = JSON.parse(localStorage.getItem('assignments') || '[]');
            list.unshift(assignment);
            localStorage.setItem('assignments', JSON.stringify(list));
            return assignment;
        }
    }

    async getAssignment(id) {
        await this.init();
        if (this.type === 'firebase') {
            const doc = await this.db.collection('assignments').doc(id).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } else {
            const list = JSON.parse(localStorage.getItem('assignments') || '[]');
            return list.find(a => a.id === id);
        }
    }

    async deleteAssignment(id) {
        await this.init();
        if (this.type === 'firebase') {
            await this.db.collection('assignments').doc(id).delete();
        } else {
            let list = JSON.parse(localStorage.getItem('assignments') || '[]');
            list = list.filter(a => a.id !== id);
            localStorage.setItem('assignments', JSON.stringify(list));
        }
    }

    // --- SUBMISSIONS ---
    async getSubmissions(assignmentId = null) {
        await this.init();
        if (this.type === 'firebase') {
            let query = this.db.collection('submissions');
            if (assignmentId) {
                query = query.where('assignmentId', '==', assignmentId);
            }
            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            const list = JSON.parse(localStorage.getItem('submissions') || '[]');
            if (assignmentId) return list.filter(s => s.assignmentId === assignmentId);
            return list;
        }
    }

    async saveSubmission(submission) {
        await this.init();
        if (this.type === 'firebase') {
            const { id, ...data } = submission;
            const docId = id || 'sub_' + Date.now();
            await this.db.collection('submissions').doc(docId).set({ ...submission, id: docId });
        } else {
            const list = JSON.parse(localStorage.getItem('submissions') || '[]');
            list.push(submission);
            localStorage.setItem('submissions', JSON.stringify(list));
        }
    }

    // --- HISTORY ---
    async getStudyHistory(userId) {
        await this.init();
        if (this.type === 'firebase') {
            const snapshot = await this.db.collection('study_history')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
            return snapshot.docs.map(doc => doc.data());
        } else {
            const list = JSON.parse(localStorage.getItem('studyHistory') || '[]');
            return list.filter(h => h.userId === userId).reverse(); // Reverse for display?
        }
    }

    async getAllStudyHistory() {
        await this.init();
        if (this.type === 'firebase') {
            // Caution: large query
            const now = new Date();
            const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            const snapshot = await this.db.collection('study_history')
                .where('timestamp', '>=', startOfDay) // Optimized for "Today" view
                .get();
            return snapshot.docs.map(doc => doc.data());
        } else {
            return JSON.parse(localStorage.getItem('studyHistory') || '[]');
        }
    }

    async saveStudyHistory(record) {
        await this.init();
        if (this.type === 'firebase') {
            await this.db.collection('study_history').add(record);
        } else {
            const list = JSON.parse(localStorage.getItem('studyHistory') || '[]');
            list.push(record);
            localStorage.setItem('studyHistory', JSON.stringify(list));
        }
    }

    // --- SAVED WORKSHEETS (Teacher Local Templates) ---
    // These might remain local OR sync. Let's sync them for the teacher.
    async getSavedWorksheets() {
        await this.init();
        if (this.type === 'firebase') {
            const snapshot = await this.db.collection('saved_worksheets').orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            return JSON.parse(localStorage.getItem('savedWorksheets') || '[]');
        }
    }

    async saveWorksheet(worksheet) {
        await this.init();
        if (this.type === 'firebase') {
            const docId = worksheet.id.toString();
            await this.db.collection('saved_worksheets').doc(docId).set(worksheet);
        } else {
            const list = JSON.parse(localStorage.getItem('savedWorksheets') || '[]');
            list.unshift(worksheet);
            localStorage.setItem('savedWorksheets', JSON.stringify(list));
        }
    }

    async deleteSavedWorksheet(id) {
        await this.init();
        if (this.type === 'firebase') {
            await this.db.collection('saved_worksheets').doc(id.toString()).delete();
        } else {
            let list = JSON.parse(localStorage.getItem('savedWorksheets') || '[]');
            list = list.filter(w => w.id != id);
            localStorage.setItem('savedWorksheets', JSON.stringify(list)); // fixed from assignments to savedWorksheets
        }
    }
    // --- DAILY PLANS ---
    async getDailyPlan(date, grade) {
        // date format: YYYY-MM-DD
        await this.init();
        const docId = `plan_${grade}_${date}`;
        if (this.type === 'firebase') {
            // In firestore we might want a 'daily_plans' collection
            const doc = await this.db.collection('daily_plans').doc(docId).get();
            return doc.exists ? doc.data() : null;
        } else {
            // We can check localStorage key 'daily_words_GRADE_DATE' which vocabDB uses.
            // vocabDB stores array of IDs as JSON string directly.
            // But vocabDB access is synchronous direct localStorage.
            // Here we wrap it.
            const key = `daily_words_${grade}_${date}`;
            const val = localStorage.getItem(key);
            return val ? { words: JSON.parse(val) } : null;
        }
    }

    async saveDailyPlan(date, grade, wordIds) {
        await this.init();
        const docId = `plan_${grade}_${date}`;
        if (this.type === 'firebase') {
            await this.db.collection('daily_plans').doc(docId).set({
                date,
                grade,
                words: wordIds,
                updatedAt: new Date().toISOString()
            });
            // Also need to consider how student reads it? 
            // Student 'vocabDB.getDailyWords' is SYNC and reads localStorage.
            // If we use firebase, student needs to fetch it.
            // I will address this by having student dashboard fetch daily plan ON LOAD and inject into localStorage.
        } else {
            const key = `daily_words_${grade}_${date}`;
            localStorage.setItem(key, JSON.stringify(wordIds));
        }
    }
}

const dbService = new DataService();
window.dbService = dbService; // Expose globally
