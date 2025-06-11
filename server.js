// clean-api.js - Clean API without debug data
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5230;

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

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Clean Tibero API',
        features: ['Thai character support', 'No debug data', 'Clean JSON output'],
        timestamp: new Date().toISOString()
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
    res.json({
        message: 'Clean Tibero API',
        description: 'Thai-enabled API with clean JSON output',
        features: [
            'Thai character support',
            'No debug data in response',
            'Clean JSON structure',
            'Fast performance'
        ],
        endpoints: {
            'GET /': 'API information',
            'GET /health': 'Health check',
            'GET /test': 'Test connection',
            'GET /count': 'Get total record count',
            'GET /getdata': 'Get all data (limited to 50)',
            'GET /getdata/:limit': 'Get specific number of records',
            'GET /student/:id': 'Get student by ID'
        },
        examples: {
            count: `http://localhost:${PORT}/count`,
            sample_data: `http://localhost:${PORT}/getdata/5`,
            student_search: `http://localhost:${PORT}/student/50130052`
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Clean Tibero API started on port ${PORT}`);
    console.log(`✨ Features: Thai support, Clean JSON, No debug data`);
    console.log(`🔗 API Info: http://localhost:${PORT}/`);
    console.log(`📊 Sample: http://localhost:${PORT}/getdata/5`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
});
