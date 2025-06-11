// server.js - Fixed syntax error
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5230;

// Import routes
 const thesisRoutes = require('./routes/thesis');
const studentRoutes = require('./routes/student');
const courseRoutes = require('./routes/course');
const bankRoutes = require('./routes/bank');
const quotaRoutes = require('./routes/quota');

// TIS-620 to UTF-8 mapping
const TIS620_TO_UTF8 = {
    161: 'ก', 162: 'ข', 163: 'ฃ', 164: 'ค', 165: 'ฅ', 166: 'ฆ', 167: 'ง',
    168: 'จ', 169: 'ฉ', 170: 'ช', 171: 'ซ', 172: 'ฌ', 173: 'ญ', 174: 'ฎ',
    175: 'ฏ', 176: 'ฐ', 177: 'ฑ', 178: 'ฒ', 179: 'ณ', 180: 'ด', 181: 'ต',
    182: 'ถ', 183: 'ท', 184: 'ธ', 185: 'น', 186: 'บ', 187: 'ป', 188: 'ผ',
    189: 'ฝ', 190: 'พ', 191: 'ฟ', 192: 'ภ', 193: 'ม', 194: 'ย', 195: 'ร',
    196: 'ฤ', 197: 'ล', 198: 'ฦ', 199: 'ว', 200: 'ศ', 201: 'ษ', 202: 'ส',
    203: 'ห', 204: 'ฬ', 205: 'อ', 206: 'ฮ', 207: 'ฯ', 208: 'ะ', 209: 'ั',
    210: 'า', 211: 'ำ', 212: 'ิ', 213: 'ี', 214: 'ึ', 215: 'ื', 216: 'ุ',
    217: 'ู', 218: 'ฺ', 224: 'เ', 225: 'แ', 226: 'โ', 227: 'ใ', 228: 'ไ',
    229: 'ๅ', 230: 'ๆ', 231: '็', 232: '่', 233: '้', 234: '๊', 235: '๋',
    236: '์', 237: 'ํ', 240: '๐', 241: '๑', 242: '๒', 243: '๓', 244: '๔',
    245: '๕', 246: '๖', 247: '๗', 248: '๘', 249: '๙'
};

class CleanTiberoExecutor {
    constructor(dsn) {
        this.dsn = dsn;
        this.tempDir = '/tmp';
    }
    
    convertDumpToThai(dumpOutput) {
        try {
            const matches = dumpOutput.match(/Len=\d+:\s*([\d,\s]+)/);
            if (!matches) return dumpOutput;
            
            const bytes = matches[1].split(',').map(b => parseInt(b.trim()));
            let result = '';
            
            for (const byte of bytes) {
                if (byte >= 32 && byte <= 126) {
                    result += String.fromCharCode(byte);
                } else if (TIS620_TO_UTF8[byte]) {
                    result += TIS620_TO_UTF8[byte];
                } else {
                    result += '?';
                }
            }
            
            return result;
        } catch (error) {
            console.error('Conversion error:', error);
            return '[conversion failed]';
        }
    }
    
    async executeQuery(sql) {
        return new Promise((resolve, reject) => {
            const timestamp = Date.now();
            const tempFile = path.join(this.tempDir, `query_${timestamp}.sql`);
            
            try {
                fs.writeFileSync(tempFile, sql + '\nquit\n', 'utf8');
                
                const command = `isql -v ${this.dsn} < ${tempFile}`;
                
                exec(command, { timeout: 30000, encoding: 'utf8' }, (error, stdout, stderr) => {
                    try {
                        fs.unlinkSync(tempFile);
                    } catch (e) {}
                    
                    if (error) {
                        reject(new Error(`Query execution failed: ${error.message}`));
                        return;
                    }
                    
                    if (stderr && stderr.includes('ERROR')) {
                        reject(new Error(`SQL Error: ${stderr}`));
                        return;
                    }
                    
                    try {
                        const result = this.parseCleanResult(stdout);
                        resolve(result);
                    } catch (parseError) {
                        console.error('Parse error:', parseError);
                        reject(new Error(`Parse error: ${parseError.message}`));
                    }
                });
                
            } catch (fileError) {
                reject(new Error(`File operation failed: ${fileError.message}`));
            }
        });
    }
    
    parseCleanResult(output) {
        const lines = output.split('\n');
        const dataRows = [];
        let headers = [];
        let headerFound = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // ข้าม system messages และ separators
            if (!line || line.trim() === '' ||
                line.includes('Connected!') || 
                line.includes('sql-statement') ||
                line.includes('help [tablename]') ||
                line.includes('quit') ||
                line.includes('SQL>') ||
                line.includes('SQLRowCount') ||
                line.includes('rows fetched') ||
                line.includes('+---') ||
                line.includes('===')) {
                continue;
            }
            
            // หา header line
            if (!headerFound && line.includes('|') && 
                (line.includes('STUDENTID') || line.includes('DUMP_DATA') || line.includes('TEST_NUMBER'))) {
                
                const rawHeaders = line.split('|');
                headers = rawHeaders.map(h => h.trim()).filter(h => h.length > 0);
                headerFound = true;
                continue;
            }
            
            // Process data lines
            if (headerFound && line.includes('|') && line.trim().startsWith('|')) {
                const rawValues = line.split('|');
                const values = rawValues.map(v => v.trim()).filter(v => v.length > 0);
                
                if (values.length === headers.length) {
                    const rowObject = {};
                    
                    for (let j = 0; j < headers.length; j++) {
                        const header = headers[j];
                        let value = values[j];
                        
                        if (value && value !== 'null' && value !== 'NULL') {
                            // ถ้าเป็น DUMP column - แปลงเป็นภาษาไทยและไม่เก็บ DUMP data
                            if (header.includes('DUMP')) {
                                const thaiText = this.convertDumpToThai(value);
                                const originalColumnName = header.replace('_DUMP', '').replace('DUMP_DATA', 'THESISNAME');
                                
                                // เก็บเฉพาะข้อมูลที่แปลงแล้ว ไม่เก็บ DUMP
                                if (originalColumnName !== header) {
                                    rowObject[originalColumnName] = thaiText;
                                }
                                // ไม่เก็บ DUMP data เลย
                            } else {
                                // ข้อมูลปกติ
                                if (/^\d+$/.test(value)) {
                                    value = parseInt(value);
                                } else if (/^\d+\.\d+$/.test(value)) {
                                    value = parseFloat(value);
                                }
                                rowObject[header] = value;
                            }
                        } else {
                            if (!header.includes('DUMP')) {
                                rowObject[header] = null;
                            }
                        }
                    }
                    
                    dataRows.push(rowObject);
                }
            }
        }
        
        return dataRows;
    }
    
    // รวม STUDENTID data จาก 2 queries
    mergeDataByStudentId(thaiData, otherData) {
        const mergedData = [];
        const otherDataMap = {};
        
        // สร้าง map จาก otherData โดยใช้ STUDENTID เป็น key
        otherData.forEach(row => {
            if (row.STUDENTID) {
                otherDataMap[row.STUDENTID] = row;
            }
        });
        
        // รวม thaiData กับ otherData
        thaiData.forEach(thaiRow => {
            const studentId = thaiRow.STUDENTID;
            const mergedRow = { ...thaiRow };
            
            if (studentId && otherDataMap[studentId]) {
                Object.assign(mergedRow, otherDataMap[studentId]);
            }
            
            mergedData.push(mergedRow);
        });
        
        return mergedData;
    }
}

const dbExecutor = new CleanTiberoExecutor('NBU_DSN');

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
            '/api/courses',
            '/api/bank',
            '/api/bank',
            '/api/quota'
        ]
    });
});

// API Routes
app.use('/api/thesis', thesisRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/quota', quotaRoutes);

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
                'GET /api/courses',
            '/api/bank',
            '/api/quota',
            '/api/bank',
            '/api/quota': 'Get all courses',
                'GET /api/courses',
            '/api/bank',
            '/api/quota',
            '/api/bank',
            '/api/quota/:id': 'Get course by ID',
                'GET /api/courses',
            '/api/bank',
            '/api/quota',
            '/api/bank',
            '/api/quota/:id/students': 'Get course with students',
                'GET /api/courses',
            '/api/bank',
            '/api/quota',
            '/api/bank',
            '/api/quota/semester/:semester/year/:year': 'Get courses by semester'
            }
        },
        examples: {
            students: `http://localhost:${PORT}/api/students?limit=10`,
            student_detail: `http://localhost:${PORT}/api/students/50130052`,
            student_search: `http://localhost:${PORT}/api/students/search/นาย`,
            courses: `http://localhost:${PORT}/api/courses',
            '/api/bank',
            '/api/quota',
            '/api/bank',
            '/api/quota?limit=20`,
            course_students: `http://localhost:${PORT}/api/courses',
            '/api/bank',
            '/api/quota',
            '/api/bank',
            '/api/quota/CS101/students`,
            thesis: `http://localhost:${PORT}/api/thesis/10`
        }
    });
});

// Test basic connection
app.get('/test', async (req, res) => {
    try {
        const result = await dbExecutor.executeQuery('SELECT 1 as test_number FROM DUAL');
        
        res.json({
            status: 'success',
            message: 'Connection test successful',
            result: result
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'failed',
            error: error.message
        });
    }
});

// Get clean data
app.get('/getdata/:limit', async (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        
        // Query 1: ข้อมูลภาษาไทย
        const thaiQuery = `SELECT STUDENTID, DUMP(THESISNAME) as THESISNAME_DUMP FROM THESIS WHERE ROWNUM <= ${limit}`;
        
        // Query 2: ข้อมูลอื่นๆ
        const otherQuery = `SELECT STUDENTID, THESISNAMEENG, COMPLETEDATE, ACADYEARTO, SEMESTERTO FROM THESIS WHERE ROWNUM <= ${limit}`;
        
        const [thaiData, otherData] = await Promise.all([
            dbExecutor.executeQuery(thaiQuery).catch(() => []),
            dbExecutor.executeQuery(otherQuery).catch(() => [])
        ]);
        
        // รวมข้อมูลโดยใช้ STUDENTID
        const combinedData = dbExecutor.mergeDataByStudentId(thaiData, otherData);
        
        res.json({
            limit: limit,
            count: combinedData.length,
            data: combinedData
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Get all data (limited for performance)
app.get('/getdata', async (req, res) => {
    try {
        const limit = 50; // จำกัดไว้ที่ 50 records
        
        const thaiQuery = `SELECT STUDENTID, DUMP(THESISNAME) as THESISNAME_DUMP FROM THESIS WHERE ROWNUM <= ${limit}`;
        const otherQuery = `SELECT STUDENTID, THESISNAMEENG, COMPLETEDATE, ACADYEARTO, SEMESTERTO FROM THESIS WHERE ROWNUM <= ${limit}`;
        
        const [thaiData, otherData] = await Promise.all([
            dbExecutor.executeQuery(thaiQuery).catch(() => []),
            dbExecutor.executeQuery(otherQuery).catch(() => [])
        ]);
        
        const combinedData = dbExecutor.mergeDataByStudentId(thaiData, otherData);
        
        res.json({
            note: `Limited to ${limit} records for performance`,
            count: combinedData.length,
            data: combinedData
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Search by student ID
app.get('/student/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        
        const thaiQuery = `SELECT STUDENTID, DUMP(THESISNAME) as THESISNAME_DUMP FROM THESIS WHERE STUDENTID = '${studentId}'`;
        const otherQuery = `SELECT STUDENTID, THESISNAMEENG, COMPLETEDATE, ACADYEARTO, SEMESTERTO FROM THESIS WHERE STUDENTID = '${studentId}'`;
        
        const [thaiData, otherData] = await Promise.all([
            dbExecutor.executeQuery(thaiQuery).catch(() => []),
            dbExecutor.executeQuery(otherQuery).catch(() => [])
        ]);
        
        const combinedData = dbExecutor.mergeDataByStudentId(thaiData, otherData);
        
        if (combinedData.length === 0) {
            res.status(404).json({
                error: 'Student not found',
                studentId: studentId
            });
        } else {
            res.json({
                studentId: studentId,
                data: combinedData[0]
            });
        }
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Count total records
app.get('/count', async (req, res) => {
    try {
        const result = await dbExecutor.executeQuery('SELECT COUNT(*) as total_count FROM THESIS');
        
        res.json({
            total_records: result[0]?.total_count || 0
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
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
            '/api/bank',
            '/api/quota',
            '/api/bank',
            '/api/quota',
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
