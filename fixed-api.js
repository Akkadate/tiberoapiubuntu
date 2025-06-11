// fixed-api.js - API with corrected parser
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5226;

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

class FixedTiberoExecutor {
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
                        const result = this.parseResultFixed(stdout, sql);
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
    
    parseResultFixed(output, originalSQL) {
        console.log('\n' + '='.repeat(60));
        console.log('PARSING WITH FIXED LOGIC');
        console.log('='.repeat(60));
        
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
                
                // แยก headers และลบ empty strings
                const rawHeaders = line.split('|');
                headers = rawHeaders.map(h => h.trim()).filter(h => h.length > 0);
                headerFound = true;
                
                console.log('Found headers:', headers);
                continue;
            }
            
            // Process data lines
            if (headerFound && line.includes('|') && line.trim().startsWith('|')) {
                // แยก values และลบ empty strings
                const rawValues = line.split('|');
                const values = rawValues.map(v => v.trim()).filter(v => v.length > 0);
                
                console.log('Processing data line:', line);
                console.log('Values:', values);
                
                // ตรวจสอบว่าจำนวน values ตรงกับ headers
                if (values.length === headers.length) {
                    const rowObject = {};
                    
                    for (let j = 0; j < headers.length; j++) {
                        const header = headers[j];
                        let value = values[j];
                        
                        if (value && value !== 'null' && value !== 'NULL') {
                            // ถ้าเป็น DUMP column
                            if (header.includes('DUMP')) {
                                const thaiText = this.convertDumpToThai(value);
                                console.log(`Converted "${value}" to "${thaiText}"`);
                                
                                // เก็บข้อมูลที่แปลงแล้ว
                                const originalColumnName = header.replace('_DUMP', '').replace('DUMP_DATA', 'THESISNAME');
                                if (originalColumnName !== header) {
                                    rowObject[originalColumnName] = thaiText;
                                }
                                
                                // เก็บข้อมูล dump ไว้ดู
                                rowObject[header] = value;
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
                    
                    console.log('Created row:', rowObject);
                    dataRows.push(rowObject);
                } else {
                    console.log(`Skipped line: values count (${values.length}) != headers count (${headers.length})`);
                }
            }
        }
        
        console.log(`Final result: ${dataRows.length} rows`);
        console.log('='.repeat(60) + '\n');
        
        return dataRows;
    }
}

const dbExecutor = new FixedTiberoExecutor('NBU_DSN');

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
        message: 'Fixed Tibero API',
        timestamp: new Date().toISOString()
    });
});

// Test basic connection
app.get('/test', async (req, res) => {
    try {
        console.log('\n🔍 Testing basic connection...');
        
        const result = await dbExecutor.executeQuery('SELECT 1 as test_number FROM DUAL');
        
        res.json({
            status: 'success',
            message: 'Connection test successful',
            result: result
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        res.status(500).json({
            status: 'failed',
            error: error.message
        });
    }
});

// Test DUMP function
app.get('/test-dump', async (req, res) => {
    try {
        console.log('\n🧪 Testing DUMP function...');
        
        const query = 'SELECT STUDENTID, DUMP(THESISNAME) as DUMP_DATA FROM THESIS WHERE ROWNUM <= 2';
        
        const result = await dbExecutor.executeQuery(query);
        
        res.json({
            status: 'success',
            message: 'DUMP function test successful',
            query: query,
            result: result
        });
        
    } catch (error) {
        console.error('❌ DUMP test failed:', error.message);
        res.status(500).json({
            status: 'failed',
            error: error.message
        });
    }
});

// Get simplified data (avoid complex queries)
app.get('/getdata/:limit', async (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 5;
        console.log(`\n📡 Getting ${limit} records...`);
        
        // แยก query เป็น 2 ส่วนเพื่อหลีกเลี่ยง SQL Error
        const queries = [
            `SELECT STUDENTID, DUMP(THESISNAME) as THESISNAME_DUMP FROM THESIS WHERE ROWNUM <= ${limit}`,
            `SELECT STUDENTID, THESISNAMEENG, COMPLETEDATE, ACADYEARTO, SEMESTERTO FROM THESIS WHERE ROWNUM <= ${limit}`
        ];
        
        let thaiData = [];
        let otherData = [];
        
        try {
            // รันแยกกันเพื่อหลีกเลี่ยงปัญหา
            thaiData = await dbExecutor.executeQuery(queries[0]);
            console.log('Thai data retrieved:', thaiData.length, 'rows');
        } catch (error) {
            console.error('Thai query failed:', error.message);
        }
        
        try {
            otherData = await dbExecutor.executeQuery(queries[1]);
            console.log('Other data retrieved:', otherData.length, 'rows');
        } catch (error) {
            console.error('Other query failed:', error.message);
        }
        
        // รวมข้อมูลจาก 2 queries
        const combinedData = [];
        const maxRows = Math.max(thaiData.length, otherData.length);
        
        for (let i = 0; i < maxRows; i++) {
            const row = {};
            
            if (thaiData[i]) {
                Object.assign(row, thaiData[i]);
            }
            
            if (otherData[i]) {
                Object.assign(row, otherData[i]);
            }
            
            combinedData.push(row);
        }
        
        res.json({
            limit: limit,
            count: combinedData.length,
            data: combinedData,
            method: 'Split queries to avoid SQL errors',
            queries_used: queries
        });
        
    } catch (error) {
        console.error('❌ Query failed:', error.message);
        res.status(500).json({
            error: error.message
        });
    }
});

// Simple data endpoint (just DUMP test)
app.get('/simple/:limit', async (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 3;
        console.log(`\n📡 Getting simple data (${limit} records)...`);
        
        const query = `SELECT STUDENTID, DUMP(THESISNAME) as DUMP_DATA FROM THESIS WHERE ROWNUM <= ${limit}`;
        
        const result = await dbExecutor.executeQuery(query);
        
        res.json({
            limit: limit,
            count: result.length,
            data: result,
            method: 'Simple DUMP query only'
        });
        
    } catch (error) {
        console.error('❌ Simple query failed:', error.message);
        res.status(500).json({
            error: error.message
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Fixed Tibero API',
        status: 'Parser issues resolved',
        endpoints: {
            '/health': 'Health check',
            '/test': 'Test basic connection',
            '/test-dump': 'Test DUMP function',
            '/simple/:limit': 'Simple data (Thai only)',
            '/getdata/:limit': 'Combined data (may split queries)'
        },
        recommended_test_order: [
            `http://localhost:${PORT}/test`,
            `http://localhost:${PORT}/test-dump`,
            `http://localhost:${PORT}/simple/3`,
            `http://localhost:${PORT}/getdata/3`
        ]
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Fixed Tibero API started on port ${PORT}`);
    console.log(`✅ Parser logic corrected`);
    console.log(`🔧 Handles complex queries with split approach`);
    console.log('\n🧪 Test order:');
    console.log(`  1. http://localhost:${PORT}/test`);
    console.log(`  2. http://localhost:${PORT}/test-dump`);
    console.log(`  3. http://localhost:${PORT}/simple/3`);
    console.log(`  4. http://localhost:${PORT}/getdata/3`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
});
