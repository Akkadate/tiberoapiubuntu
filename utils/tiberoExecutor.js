// utils/tiberoExecutor.js - Tibero Database Executor
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

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

class TiberoExecutor {
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
                        const result = this.parseResult(stdout);
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
    
    parseResult(output) {
        const lines = output.split('\n');
        const dataRows = [];
        let headers = [];
        let headerFound = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip system messages and separators
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
            
            // Find header line
            if (!headerFound && line.includes('|') && 
                (line.includes('STUDENTID') || line.includes('DUMP_DATA') || line.includes('TEST_NUMBER') || line.includes('BANKCODE') || line.includes('BANKNAME') || line.includes('COUNT') || 
                 line.includes('COURSEID') || line.includes('THESISID'))) {
                
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
                            // Handle DUMP columns - convert to Thai
                            if (header.includes('DUMP')) {
                                const thaiText = this.convertDumpToThai(value);
                                const originalColumnName = header.replace('_DUMP', '').replace('DUMP_DATA', 'THESISNAME');
                                
                                // Store only converted data, not DUMP
                                if (originalColumnName !== header) {
                                    rowObject[originalColumnName] = thaiText;
                                }
                            } else {
                                // Regular data
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
    
    // Merge data by STUDENTID
    mergeDataByStudentId(thaiData, otherData) {
        const mergedData = [];
        const otherDataMap = {};
        
        // Create map from otherData using STUDENTID as key
        otherData.forEach(row => {
            if (row.STUDENTID) {
                otherDataMap[row.STUDENTID] = row;
            }
        });
        
        // Merge thaiData with otherData
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
    
    // Merge data by COURSEID
    mergeDataByCourseId(thaiData, otherData) {
        const mergedData = [];
        const otherDataMap = {};
        
        otherData.forEach(row => {
            if (row.COURSEID) {
                otherDataMap[row.COURSEID] = row;
            }
        });
        
        thaiData.forEach(thaiRow => {
            const courseId = thaiRow.COURSEID;
            const mergedRow = { ...thaiRow };
            
            if (courseId && otherDataMap[courseId]) {
                Object.assign(mergedRow, otherDataMap[courseId]);
            }
            
            mergedData.push(mergedRow);
        });
        
        return mergedData;
    }
}

module.exports = TiberoExecutor;
