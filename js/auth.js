// Authentication and User Management System
class AuthSystem {
    constructor() {
        this.currentUser = null;
        // init() is async now, so we can't await in constructor.
        // We will call init() explicitly or ensure methods call it.
        this.init();
    }

    async init() {
        // Initialize DB Service
        await dbService.init();

        const users = await dbService.getUsers();

        // Check for Admin User
        const adminUser = users.find(u => u.username === 'admin');
        if (!adminUser) {
            console.log("Admin user not found. Creating default admin.");
            await this.createDefaultAdmin();
        }

        if (users.length === 0) {
            this.initializeDemoData();
        }
    }

    async createDefaultAdmin() {
        const admin = {
            id: 'admin1',
            username: 'admin',
            password: 'admin1234',
            name: '관리자',
            role: 'admin',
            createdAt: new Date().toISOString()
        };
        await dbService.saveUser(admin);

        // Check if user is logged in (Session persistence)
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            // Refresh User Data from DB to ensure sync
            // But we don't want to block UI render too long.
        }
    }

    async initializeDemoData() {
        // Only for LocalStorage fallbacks usually
        if (dbService.type === 'firebase') return;

        // Demo Admin
        const admins = [
            {
                id: 'admin1',
                username: 'admin',
                password: 'admin1234', // Default Admin Password
                name: '관리자',
                role: 'admin',
                createdAt: new Date().toISOString()
            }
        ];

        // Demo teachers
        const teachers = [
            {
                id: 'teacher1',
                username: 'teacher',
                password: 'teacher123',
                name: '김선생님',
                role: 'teacher',
                teacherCode: '12345',
                createdAt: new Date().toISOString()
            }
        ];

        // Demo students
        const students = [
            {
                id: 'student1',
                username: 'student1',
                password: '1234',
                name: '김민수',
                grade: 3,
                role: 'student',
                progress: { flashcardsCompleted: 0, typingCompleted: 0, writingCompleted: 0, currentLesson: 0, totalScore: 0 },
                createdAt: new Date().toISOString()
            },
            {
                id: 'student2',
                username: 'student2',
                password: '1234',
                name: '이지은',
                grade: 4,
                role: 'student',
                progress: { flashcardsCompleted: 0, typingCompleted: 0, writingCompleted: 0, currentLesson: 0, totalScore: 0 },
                createdAt: new Date().toISOString()
            },
            {
                id: 'student3',
                username: 'student3',
                password: '1234',
                name: '박준호',
                grade: 5,
                role: 'student',
                progress: { flashcardsCompleted: 0, typingCompleted: 0, writingCompleted: 0, currentLesson: 0, totalScore: 0 },
                createdAt: new Date().toISOString()
            }
        ];

        const users = [...admins, ...teachers, ...students];
        for (const u of users) {
            await dbService.saveUser(u);
        }
    }

    async login(username, password, role, teacherCode = null) {
        await dbService.init();

        // In real Firebase Auth, we would use signInWithEmailAndPassword.
        // But to keep it simple matching existing username logic:
        // We will query the DB for the username/password.

        const user = await dbService.getUser('username', username);

        if (user && user.password === password && user.role === role) {
            // If student login with teacherCode, find teacher and update the student's teacherId
            if (role === 'student' && teacherCode) {
                const teacher = await this.getTeacherByCode(teacherCode);
                if (!teacher) {
                    return { success: false, message: '유효하지 않은 선생님 코드입니다.' };
                }
                user.teacherId = teacher.id;
                await dbService.saveUser(user);
            }

            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            return { success: true, user };
        }

        return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    }

    logout() {
        if (typeof dbService !== 'undefined' && dbService.type === 'firebase') {
            // Attempt sign out but don't block
            try { dbService.auth.signOut(); } catch (e) { console.error(e); }
        }

        this.currentUser = null;
        localStorage.removeItem('currentUser');

        // Handle path for redirection to index.html
        // Use replace to prevent back-button login
        const path = window.location.pathname;
        if (path.indexOf('/student/') !== -1 || path.indexOf('/teacher/') !== -1 || path.indexOf('/admin/') !== -1) {
            window.location.replace('../index.html');
        } else {
            window.location.replace('index.html');
        }
    }

    getCurrentUser() {
        return this.currentUser; // Synchronous access to cached user
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    async requireAuth(requiredRole = null) {
        // Wait for potential init?
        // Usually called at page load.
        // We assume init() started.

        // If not logged in
        const savedUser = localStorage.getItem('currentUser');
        if (!this.currentUser && savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }

        if (!this.isLoggedIn()) {
            window.location.href = '/index.html';
            return false;
        }

        if (requiredRole && this.currentUser.role !== requiredRole) {
            alert('접근 권한이 없습니다.');
            window.location.href = '/index.html';
            return false;
        }

        return true;
    }

    // Helper function to generate unique 5-digit teacher code
    async generateTeacherCode() {
        const users = await dbService.getUsers();
        let code;
        let isUnique = false;

        while (!isUnique) {
            // Generate random 5-digit code (10000-99999)
            code = Math.floor(10000 + Math.random() * 90000).toString();

            // Check if code is already used
            isUnique = !users.some(u => u.teacherCode === code);
        }

        return code;
    }

    // Find teacher by code
    async getTeacherByCode(code) {
        await dbService.init();
        const users = await dbService.getUsers();
        return users.find(u => u.role === 'teacher' && u.teacherCode === code);
    }

    // Admin functions
    async createTeacher(teacherData) {
        if (this.currentUser.role !== 'admin') return;

        const teacherCode = await this.generateTeacherCode();

        const newTeacher = {
            id: 'teacher' + Date.now(),
            username: teacherData.username,
            password: teacherData.password,
            name: teacherData.name,
            role: 'teacher',
            teacherCode: teacherCode,
            createdAt: new Date().toISOString()
        };

        return await dbService.saveUser(newTeacher);
    }

    // Teacher self-registration (no admin required)
    async registerTeacher(teacherData) {
        await dbService.init();

        // Username is now provided by user and already checked for duplicates
        const username = teacherData.username;

        // Double-check if username already exists (for safety)
        const existingUser = await dbService.getUser('username', username);
        if (existingUser) {
            return { success: false, message: '이미 사용중인 아이디입니다. 다시 확인해주세요.' };
        }

        // Generate unique teacher code
        const teacherCode = await this.generateTeacherCode();

        const newTeacher = {
            id: 'teacher_' + crypto.randomUUID(),
            username: username,
            password: teacherData.password,
            name: teacherData.nickname, // Display name
            school: teacherData.school,
            grade: teacherData.grade,
            nickname: teacherData.nickname,
            role: 'teacher',
            teacherCode: teacherCode,
            createdAt: new Date().toISOString()
        };

        try {
            await dbService.saveUser(newTeacher);
            return { success: true, teacher: newTeacher, teacherCode: teacherCode };
        } catch (error) {
            return { success: false, message: '회원가입 중 오류가 발생했습니다.' };
        }
    }

    async getTeachers() {
        if (this.currentUser.role !== 'admin') return [];
        const users = await dbService.getUsers();
        return users.filter(u => u.role === 'teacher');
    }

    // Public function to get all teachers (for student login page)
    async getAllTeachers() {
        await dbService.init();
        const users = await dbService.getUsers();
        return users.filter(u => u.role === 'teacher');
    }

    async deleteTeacher(usernameOrId) {
        if (this.currentUser.role !== 'admin') return;
        const user = await dbService.getUser('username', usernameOrId);
        if (user) {
            await dbService.deleteUser(user.id);
            return true;
        }
        return false;
    }

    // Teacher functions
    async createStudent(studentData) {
        // Check role (assume currentUser is set)
        if (this.currentUser.role !== 'teacher' && this.currentUser.role !== 'admin') return;

        const newStudent = {
            id: 'student_' + crypto.randomUUID(),
            username: studentData.username,
            password: studentData.password,
            name: studentData.name,
            grade: parseInt(studentData.grade),
            role: 'student',
            teacherId: this.currentUser.role === 'teacher' ? this.currentUser.id : 'admin', // Link to creator
            progress: {
                flashcardsCompleted: 0,
                typingCompleted: 0,
                writingCompleted: 0,
                currentLesson: 0,
                totalScore: 0
            },
            createdAt: new Date().toISOString()
        };

        const result = await dbService.saveUser(newStudent);
        return result;
    }

    async getStudents() {
        // if (!this.requireAuth('teacher')) return []; // Sync check
        // Ideally fetch from DB
        const users = await dbService.getUsers();

        // If teacher, return only their students
        if (this.currentUser && this.currentUser.role === 'teacher') {
            return users.filter(u => u.role === 'student' && u.teacherId === this.currentUser.id);
        }

        // Admin sees all? Or handled elsewhere.
        return users.filter(u => u.role === 'student');
    }

    // Deleting student
    async deleteStudent(usernameOrId) {
        // Need to find user ID if username passed
        let userId = usernameOrId;
        // Try to look up if not an ID format (simple logic)
        // Actually dbService.deleteUser takes ID.
        // Let's assume we pass ID or we look it up.
        // Current UI passes 'username' to deleteStudent(username).
        // So we must lookup ID.
        const user = await dbService.getUser('username', usernameOrId);
        if (user) {
            await dbService.deleteUser(user.id);
            return true;
        }
        return false;
    }

    // Student functions
    async updateProgress(progressData) {
        if (!this.isLoggedIn() || this.currentUser.role !== 'student') return;

        const updatedProgress = {
            ...this.currentUser.progress,
            ...progressData
        };

        // Update local object
        this.currentUser.progress = updatedProgress;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        // Save to DB
        // Need to partial update "progress" field
        // Firestore set with merge: true handles this if we structure it right.
        const userUpdate = {
            id: this.currentUser.id,
            progress: updatedProgress
        };
        await dbService.saveUser(userUpdate);
    }

    getProgress() {
        if (!this.isLoggedIn() || this.currentUser.role !== 'student') return null;
        return this.currentUser.progress;
    }

    async saveStudyHistory(historyData) {
        if (!this.isLoggedIn() || this.currentUser.role !== 'student') return;

        const record = {
            userId: this.currentUser.id,
            ...historyData,
            timestamp: new Date().toISOString()
        };

        await dbService.saveStudyHistory(record);
    }

    async getStudyHistory(studentId = null) {
        const userId = studentId || this.currentUser?.id;
        if (!userId) return [];
        return await dbService.getStudyHistory(userId);
    }
    async updateUser(updates) {
        if (!this.isLoggedIn()) return;

        const updatedUser = {
            ...this.currentUser,
            ...updates
        };

        // Cache update
        this.currentUser = updatedUser;
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));

        // DB update
        await dbService.saveUser(updatedUser);
        return updatedUser;
    }
}

// Create global auth instance
const auth = new AuthSystem();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthSystem, auth };
}
