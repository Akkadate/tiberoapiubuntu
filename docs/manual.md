# 🚀 Expanding Tibero API: Adding New Tables & Queries

## 📋 Overview
วิธีการเพิ่ม API endpoints สำหรับตารางอื่นๆ ใน Tibero Database แบบ scalable และ maintainable

## 🏗️ Architecture Patterns

### 1. 📁 **Modular Structure (Recommended)**
```
tibero-api/
├── server.js                 # Main server
├── config/
│   ├── database.js           # Database configuration
│   └── tables.js             # Table definitions
├── controllers/
│   ├── thesisController.js   # THESIS table operations
│   ├── studentController.js  # STUDENT table operations
│   └── courseController.js   # COURSE table operations
├── models/
│   ├── BaseModel.js          # Base database operations
│   ├── ThesisModel.js        # THESIS specific methods
│   └── StudentModel.js       # STUDENT specific methods
├── routes/
│   ├── thesis.js             # THESIS routes
│   ├── student.js            # STUDENT routes
│   └── course.js             # COURSE routes
├── utils/
│   ├── tiberoExecutor.js     # Database executor
│   └── thaiConverter.js      # Thai character conversion
└── middleware/
    ├── auth.js               # Authentication
    ├── validation.js         # Input validation
    └── rateLimit.js          # Rate limiting
```

## 🔧 Step 1: Create Base Model

### สร้าง models/BaseModel.js
```javascript
// models/BaseModel.js - Base class สำหรับ database operations
const TiberoExecutor = require('../utils/tiberoExecutor');

class BaseModel {
    constructor(tableName, dsn = 'NBU_DSN') {
        this.tableName = tableName;
        this.executor = new TiberoExecutor(dsn);
    }

    // Generic SELECT with conditions
    async select(columns = '*', conditions = '', limit = null, orderBy = '') {
        let sql = `SELECT ${columns} FROM ${this.tableName}`;
        
        if (conditions) {
            sql += ` WHERE ${conditions}`;
        }
        
        if (orderBy) {
            sql += ` ORDER BY ${orderBy}`;
        }
        
        if (limit) {
            sql += ` AND ROWNUM <= ${limit}`;
        }
        
        return await this.executor.executeQuery(sql);
    }

    // Count records
    async count(conditions = '') {
        let sql = `SELECT COUNT(*) as total_count FROM ${this.tableName}`;
        
        if (conditions) {
            sql += ` WHERE ${conditions}`;
        }
        
        const result = await this.executor.executeQuery(sql);
        return result[0]?.total_count || 0;
    }

    // Find by ID
    async findById(idColumn, idValue) {
        const conditions = `${idColumn} = '${idValue}'`;
        const result = await this.select('*', conditions, 1);
        return result.length > 0 ? result[0] : null;
    }

    // Search with pagination
    async paginate(page = 1, pageSize = 10, conditions = '', orderBy = '') {
        const offset = (page - 1) * pageSize;
        const total = await this.count(conditions);
        
        let sql = `SELECT * FROM ${this.tableName}`;
        
        if (conditions) {
            sql += ` WHERE ${conditions}`;
        }
        
        if (orderBy) {
            sql += ` ORDER BY ${orderBy}`;
        }
        
        // Tibero pagination using ROWNUM
        sql = `SELECT * FROM (
            SELECT rownum rn, a.* FROM (${sql}) a 
            WHERE rownum <= ${offset + pageSize}
        ) WHERE rn > ${offset}`;
        
        const data = await this.executor.executeQuery(sql);
        
        return {
            data: data,
            pagination: {
                page: page,
                pageSize: pageSize,
                total: total,
                totalPages: Math.ceil(total / pageSize),
                hasNext: page * pageSize < total,
                hasPrev: page > 1
            }
        };
    }

    // Execute custom SQL
    async customQuery(sql) {
        return await this.executor.executeQuery(sql);
    }
}

module.exports = BaseModel;
```

## 🎯 Step 2: Create Specific Models

### สร้าง models/StudentModel.js
```javascript
// models/StudentModel.js - STUDENT table operations
const BaseModel = require('./BaseModel');

class StudentModel extends BaseModel {
    constructor() {
        super('STUDENT');
        this.thaiColumns = ['STUDENTNAME', 'ADDRESS']; // คอลัมน์ที่มีภาษาไทย
    }

    // Get all students with Thai support
    async getAllStudents(limit = 50) {
        // Query for Thai columns using DUMP
        const thaiQuery = `
            SELECT STUDENTID, 
                   DUMP(STUDENTNAME) as STUDENTNAME_DUMP,
                   DUMP(ADDRESS) as ADDRESS_DUMP
            FROM STUDENT 
            WHERE ROWNUM <= ${limit}
        `;
        
        // Query for other columns
        const otherQuery = `
            SELECT STUDENTID, EMAIL, PHONE, REGISTDATE, STATUS
            FROM STUDENT 
            WHERE ROWNUM <= ${limit}
        `;
        
        const [thaiData, otherData] = await Promise.all([
            this.executor.executeQuery(thaiQuery).catch(() => []),
            this.executor.executeQuery(otherQuery).catch(() => [])
        ]);
        
        return this.executor.mergeDataByStudentId(thaiData, otherData);
    }

    // Search students by name (Thai support)
    async searchByName(searchTerm, limit = 20) {
        // สำหรับการค้นหาภาษาไทย อาจต้องใช้ LIKE หรือ custom function
        const sql = `
            SELECT STUDENTID, 
                   DUMP(STUDENTNAME) as STUDENTNAME_DUMP,
                   EMAIL, PHONE 
            FROM STUDENT 
            WHERE STUDENTNAME LIKE '%${searchTerm}%' 
            AND ROWNUM <= ${limit}
        `;
        
        return await this.customQuery(sql);
    }

    // Get student with all related data
    async getStudentDetails(studentId) {
        const student = await this.findById('STUDENTID', studentId);
        
        if (!student) return null;
        
        // Get related thesis data
        const thesisQuery = `
            SELECT THESISID, 
                   DUMP(THESISNAME) as THESISNAME_DUMP,
                   THESISNAMEENG, COMPLETEDATE
            FROM THESIS 
            WHERE STUDENTID = '${studentId}'
        `;
        
        const thesis = await this.customQuery(thesisQuery);
        
        return {
            student: student,
            thesis: thesis
        };
    }

    // Get students by graduation year
    async getByGraduationYear(year, limit = 100) {
        const conditions = `EXTRACT(YEAR FROM GRADUATIONDATE) = ${year}`;
        return await this.select('*', conditions, limit, 'GRADUATIONDATE DESC');
    }
}

module.exports = StudentModel;
```

### สร้าง models/CourseModel.js
```javascript
// models/CourseModel.js - COURSE table operations
const BaseModel = require('./BaseModel');

class CourseModel extends BaseModel {
    constructor() {
        super('COURSE');
    }

    // Get all courses with Thai course names
    async getAllCourses(limit = 100) {
        const thaiQuery = `
            SELECT COURSEID, 
                   DUMP(COURSENAME) as COURSENAME_DUMP,
                   DUMP(DESCRIPTION) as DESCRIPTION_DUMP
            FROM COURSE 
            WHERE ROWNUM <= ${limit}
        `;
        
        const otherQuery = `
            SELECT COURSEID, COURSENAMEENG, CREDITS, 
                   SEMESTER, ACADEMICYEAR, STATUS
            FROM COURSE 
            WHERE ROWNUM <= ${limit}
        `;
        
        const [thaiData, otherData] = await Promise.all([
            this.executor.executeQuery(thaiQuery).catch(() => []),
            this.executor.executeQuery(otherQuery).catch(() => [])
        ]);
        
        return this.executor.mergeDataByCourseId(thaiData, otherData);
    }

    // Get courses by semester
    async getBySemester(semester, academicYear, limit = 50) {
        const conditions = `SEMESTER = ${semester} AND ACADEMICYEAR = ${academicYear}`;
        return await this.select('*', conditions, limit, 'COURSEID');
    }

    // Get course with enrolled students
    async getCourseWithStudents(courseId) {
        const course = await this.findById('COURSEID', courseId);
        
        if (!course) return null;
        
        const studentsQuery = `
            SELECT s.STUDENTID, 
                   DUMP(s.STUDENTNAME) as STUDENTNAME_DUMP,
                   e.ENROLLDATE, e.GRADE
            FROM STUDENT s
            JOIN ENROLLMENT e ON s.STUDENTID = e.STUDENTID
            WHERE e.COURSEID = '${courseId}'
            ORDER BY s.STUDENTID
        `;
        
        const students = await this.customQuery(studentsQuery);
        
        return {
            course: course,
            students: students,
            totalStudents: students.length
        };
    }
}

module.exports = CourseModel;
```

## 🛣️ Step 3: Create Route Files

### สร้าง routes/student.js
```javascript
// routes/student.js - Student routes
const express = require('express');
const router = express.Router();
const StudentModel = require('../models/StudentModel');

const studentModel = new StudentModel();

// GET /api/students - Get all students
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const students = await studentModel.getAllStudents(limit);
        
        res.json({
            count: students.length,
            limit: limit,
            data: students
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/students/:id - Get student by ID
router.get('/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const studentDetails = await studentModel.getStudentDetails(studentId);
        
        if (!studentDetails) {
            return res.status(404).json({
                error: 'Student not found',
                studentId: studentId
            });
        }
        
        res.json(studentDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/students/search/:term - Search students
router.get('/search/:term', async (req, res) => {
    try {
        const searchTerm = req.params.term;
        const limit = parseInt(req.query.limit) || 20;
        
        const results = await studentModel.searchByName(searchTerm, limit);
        
        res.json({
            searchTerm: searchTerm,
            count: results.length,
            data: results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/students/year/:year - Get students by graduation year
router.get('/year/:year', async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        const limit = parseInt(req.query.limit) || 100;
        
        const students = await studentModel.getByGraduationYear(year, limit);
        
        res.json({
            graduationYear: year,
            count: students.length,
            data: students
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/students/paginate - Paginated students
router.get('/paginate', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const orderBy = req.query.orderBy || 'STUDENTID';
        
        const result = await studentModel.paginate(page, pageSize, '', orderBy);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

### สร้าง routes/course.js
```javascript
// routes/course.js - Course routes
const express = require('express');
const router = express.Router();
const CourseModel = require('../models/CourseModel');

const courseModel = new CourseModel();

// GET /api/courses - Get all courses
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const courses = await courseModel.getAllCourses(limit);
        
        res.json({
            count: courses.length,
            limit: limit,
            data: courses
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/courses/:id - Get course by ID
router.get('/:id', async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await courseModel.findById('COURSEID', courseId);
        
        if (!course) {
            return res.status(404).json({
                error: 'Course not found',
                courseId: courseId
            });
        }
        
        res.json(course);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/courses/:id/students - Get course with enrolled students
router.get('/:id/students', async (req, res) => {
    try {
        const courseId = req.params.id;
        const courseWithStudents = await courseModel.getCourseWithStudents(courseId);
        
        if (!courseWithStudents) {
            return res.status(404).json({
                error: 'Course not found',
                courseId: courseId
            });
        }
        
        res.json(courseWithStudents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/courses/semester/:semester/year/:year - Get courses by semester
router.get('/semester/:semester/year/:year', async (req, res) => {
    try {
        const semester = parseInt(req.params.semester);
        const academicYear = parseInt(req.params.year);
        const limit = parseInt(req.query.limit) || 50;
        
        const courses = await courseModel.getBySemester(semester, academicYear, limit);
        
        res.json({
            semester: semester,
            academicYear: academicYear,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

## 🔄 Step 4: Update Main Server

### แก้ไข server.js
```javascript
// server.js - Updated with modular routes
const express = require('express');
const path = require('path');

// Import routes
const thesisRoutes = require('./routes/thesis');
const studentRoutes = require('./routes/student');
const courseRoutes = require('./routes/course');

const app = express();
const PORT = process.env.PORT || 5225;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Content-Type', 'application/json; charset=utf-8');
    next();
});

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Tibero API with Multiple Tables',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/api/thesis',
            '/api/students', 
            '/api/courses'
        ]
    });
});

// API Routes
app.use('/api/thesis', thesisRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);

// API Documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Tibero API v2.0 - Multiple Tables Support',
        version: '2.0.0',
        features: [
            'Thai character support',
            'Modular architecture', 
            'Pagination support',
            'Search functionality',
            'Multiple table operations'
        ],
        endpoints: {
            thesis: {
                'GET /api/thesis': 'Get all thesis',
                'GET /api/thesis/:limit': 'Get thesis with limit',
                'GET /api/thesis/student/:id': 'Get thesis by student ID'
            },
            students: {
                'GET /api/students': 'Get all students',
                'GET /api/students/:id': 'Get student by ID',
                'GET /api/students/search/:term': 'Search students',
                'GET /api/students/year/:year': 'Get students by graduation year',
                'GET /api/students/paginate': 'Paginated students'
            },
            courses: {
                'GET /api/courses': 'Get all courses',
                'GET /api/courses/:id': 'Get course by ID',
                'GET /api/courses/:id/students': 'Get course with students',
                'GET /api/courses/semester/:semester/year/:year': 'Get courses by semester'
            }
        },
        examples: {
            students: `http://localhost:${PORT}/api/students?limit=10`,
            student_detail: `http://localhost:${PORT}/api/students/50130052`,
            student_search: `http://localhost:${PORT}/api/students/search/นาย`,
            courses: `http://localhost:${PORT}/api/courses?limit=20`,
            course_students: `http://localhost:${PORT}/api/courses/CS101/students`,
            thesis: `http://localhost:${PORT}/api/thesis/10`
        }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.redirect('/api');
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: [
            '/api',
            '/api/thesis',
            '/api/students',
            '/api/courses',
            '/health'
        ]
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Tibero API v2.0 started on port ${PORT}`);
    console.log(`📊 Multiple tables: THESIS, STUDENT, COURSE`);
    console.log(`🔗 API Documentation: http://localhost:${PORT}/api`);
    console.log(`✨ Features: Thai support, Pagination, Search`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
});

module.exports = app;
```

## 🧪 Step 5: Testing New Endpoints

### Test Commands
```bash
# Students API
curl http://localhost:5225/api/students
curl http://localhost:5225/api/students/50130052
curl http://localhost:5225/api/students/search/นาย
curl "http://localhost:5225/api/students/paginate?page=1&pageSize=5"

# Courses API  
curl http://localhost:5225/api/courses
curl http://localhost:5225/api/courses/CS101
curl http://localhost:5225/api/courses/CS101/students
curl http://localhost:5225/api/courses/semester/1/year/2024

# Original Thesis API (still works)
curl http://localhost:5225/api/thesis/5
```

## 🔧 Step 6: Quick Add New Table

### Template สำหรับเพิ่มตารางใหม่
```javascript
// models/YourTableModel.js
const BaseModel = require('./BaseModel');

class YourTableModel extends BaseModel {
    constructor() {
        super('YOUR_TABLE_NAME');
        this.thaiColumns = ['COLUMN1', 'COLUMN2']; // คอลัมน์ที่มีภาษาไทย
    }

    // Custom methods สำหรับตารางนี้
    async customMethod() {
        const sql = `SELECT * FROM ${this.tableName} WHERE condition`;
        return await this.customQuery(sql);
    }
}

module.exports = YourTableModel;
```

### Quick Route Template
```javascript
// routes/yourTable.js
const express = require('express');
const router = express.Router();
const YourTableModel = require('../models/YourTableModel');

const model = new YourTableModel();

router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const data = await model.select('*', '', limit);
        res.json({ count: data.length, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

## 📊 Performance Tips

### 1. Index Optimization
```sql
-- สร้าง index สำหรับคอลัมน์ที่ใช้ค้นหาบ่อย
CREATE INDEX IDX_STUDENT_NAME ON STUDENT(STUDENTNAME);
CREATE INDEX IDX_COURSE_SEMESTER ON COURSE(SEMESTER, ACADEMICYEAR);
```

### 2. Query Optimization
```javascript
// ใช้ prepared statements สำหรับ security
const conditions = `STUDENTID = ?`;
// หรือ escape input
const safeInput = input.replace(/'/g, "''");
```

### 3. Caching Strategy
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

// ใน controller
const cacheKey = `students_${limit}`;
let data = cache.get(cacheKey);
if (!data) {
    data = await studentModel.getAllStudents(limit);
    cache.set(cacheKey, data);
}
```

## ✅ Checklist for Adding New Table

- [ ] สร้าง Model class ใน `models/`
- [ ] กำหนด Thai columns ถ้ามี
- [ ] สร้าง Route file ใน `routes/`
- [ ] เพิ่ม route ใน `server.js`
- [ ] ทดสอบ endpoints ทั้งหมด
- [ ] เพิ่ม documentation
- [ ] สร้าง index ใน database ถ้าจำเป็น
- [ ] เพิ่ม caching ถ้าต้องการ

---

**🎯 Result:** คุณจะได้ API ที่ scalable และง่ายต่อการขยาย สำหรับทุกตารางใน Tibero Database!
