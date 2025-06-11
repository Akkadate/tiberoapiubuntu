# 🚀 Complete Guide: Tibero API on Ubuntu with Node.js + Express

## 📋 Overview
สร้าง REST API สำหรับ Tibero Database บน Ubuntu Server โดยใช้ Node.js และ Express พร้อมรองรับภาษาไทย

## 🛠️ Prerequisites

### System Requirements
- Ubuntu Server 18.04+ 
- Tibero Database Server
- Node.js 16+ และ npm
- Tibero Client Tools (isql)

### ✅ Pre-installation Check
```bash
# ตรวจสอบ Node.js
node --version
npm --version

# ตรวจสอบ Tibero client
which isql
isql --help

# ตรวจสอบการเชื่อมต่อ database
isql -v NBU_DSN
```

## 📦 Step 1: Project Setup

### สร้าง Project Directory
```bash
mkdir tibero-api
cd tibero-api
```

### Initialize npm Project
```bash
npm init -y
```

### Install Dependencies
```bash
npm install express
```

### สร้าง package.json
```json
{
  "name": "tibero-api-thai",
  "version": "1.0.0",
  "description": "Tibero API with Thai character support",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "test": "curl http://localhost:5225/test"
  },
  "dependencies": {
    "express": "^4.21.2"
  },
  "keywords": ["tibero", "api", "thai", "nodejs", "express"],
  "author": "Your Name",
  "license": "MIT"
}
```

## 🔧 Step 2: Create Main API Server

### สร้างไฟล์ server.js
```javascript
// server.js - Clean Tibero API with Thai Support
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5225;

// TIS-620 to UTF-8 mapping สำหรับภาษาไทย
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
                            // ถ้าเป็น DUMP column - แปลงเป็นภาษาไทย
                            if (header.includes('DUMP')) {
                                const thaiText = this.convertDumpToThai(value);
                                const originalColumnName = header.replace('_DUMP', '').replace('DUMP_DATA', 'THESISNAME');
                                
                                // เก็บเฉพาะข้อมูลที่แปลงแล้ว
                                if (originalColumnName !== header) {
                                    rowObject[originalColumnName] = thaiText;
                                }
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

const dbExecutor = new TiberoExecutor('NBU_DSN');

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Content-Type', 'application/json; charset=utf-8');
    next();
});

// Routes
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Tibero API with Thai Support',
        features: ['Thai character support', 'Clean JSON output', 'Fast performance'],
        timestamp: new Date().toISOString()
    });
});

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

app.get('/getdata/:limit', async (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        
        // Query แยกเป็น 2 ส่วนเพื่อหลีกเลี่ยง SQL Error
        const thaiQuery = `SELECT STUDENTID, DUMP(THESISNAME) as THESISNAME_DUMP FROM THESIS WHERE ROWNUM <= ${limit}`;
        const otherQuery = `SELECT STUDENTID, THESISNAMEENG, COMPLETEDATE, ACADYEARTO, SEMESTERTO FROM THESIS WHERE ROWNUM <= ${limit}`;
        
        const [thaiData, otherData] = await Promise.all([
            dbExecutor.executeQuery(thaiQuery).catch(() => []),
            dbExecutor.executeQuery(otherQuery).catch(() => [])
        ]);
        
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

app.get('/', (req, res) => {
    res.json({
        message: 'Tibero API with Thai Support',
        version: '1.0.0',
        endpoints: {
            'GET /': 'API information',
            'GET /health': 'Health check',
            'GET /test': 'Test connection',
            'GET /count': 'Get total record count',
            'GET /getdata/:limit': 'Get records with limit',
            'GET /student/:id': 'Get student by ID'
        },
        examples: {
            health: `http://localhost:${PORT}/health`,
            test: `http://localhost:${PORT}/test`,
            sample_data: `http://localhost:${PORT}/getdata/5`,
            student_search: `http://localhost:${PORT}/student/50130052`,
            count: `http://localhost:${PORT}/count`
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Tibero API started on port ${PORT}`);
    console.log(`✨ Features: Thai support, Clean JSON, Fast performance`);
    console.log(`🔗 API Info: http://localhost:${PORT}/`);
    console.log(`📊 Test: http://localhost:${PORT}/test`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
});
```

## 🧪 Step 3: Testing & Validation

### ทดสอบการทำงาน
```bash
# รัน API server
node server.js

# ในอีก terminal ทดสอบ
curl http://localhost:5225/health
curl http://localhost:5225/test
curl http://localhost:5225/getdata/3
curl http://localhost:5225/student/50130052
curl http://localhost:5225/count
```

### Expected Output
```json
{
  "limit": 3,
  "count": 3,
  "data": [
    {
      "STUDENTID": 50130052,
      "THESISNAME": "ระบบบริหารจัดการพัสดุครุภัณฑ์",
      "THESISNAMEENG": "Management supplies and equipment System.",
      "COMPLETEDATE": "2011/03/20",
      "ACADYEARTO": 2554,
      "SEMESTERTO": 1
    }
  ]
}
```

## 🚀 Step 4: Production Deployment

### สร้าง PM2 Configuration
```json
{
  "name": "tibero-api",
  "script": "server.js",
  "instances": 1,
  "exec_mode": "cluster",
  "watch": false,
  "max_memory_restart": "1G",
  "env": {
    "NODE_ENV": "production",
    "PORT": 5225
  },
  "log_file": "./logs/app.log",
  "out_file": "./logs/out.log",
  "error_file": "./logs/error.log",
  "log_date_format": "YYYY-MM-DD HH:mm:ss Z"
}
```

### Install และ Setup PM2
```bash
# Install PM2
npm install -g pm2

# สร้าง logs directory
mkdir logs

# Start application
pm2 start ecosystem.config.json

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

# Monitor application
pm2 status
pm2 logs tibero-api
pm2 monit
```

### Nginx Reverse Proxy (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5225;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Step 5: Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# ตรวจสอบ DSN configuration
cat ~/.odbc.ini
cat /etc/odbc.ini

# ทดสอบ manual connection
isql -v NBU_DSN
```

#### 2. Thai Characters แสดงเป็น ?
```bash
# ตรวจสอบ system locale
locale
echo $LANG

# Set UTF-8 locale
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

#### 3. Port Already in Use
```bash
# หา process ที่ใช้ port
sudo lsof -i :5225

# Kill process
sudo kill -9 <PID>
```

#### 4. Permission Denied for /tmp
```bash
# ตรวจสอบ permissions
ls -la /tmp/

# สร้าง temp directory
mkdir -p /home/$(whoami)/tibero-temp
# แก้ไข tempDir ใน code
```

## 📊 Step 6: Performance Optimization

### Connection Pooling (Advanced)
```javascript
// เพิ่มใน TiberoExecutor class
constructor(dsn) {
    this.dsn = dsn;
    this.tempDir = '/tmp';
    this.connectionPool = [];
    this.maxConnections = 5;
}

async getConnection() {
    // Connection pooling logic
    // สำหรับ production scale
}
```

### Caching Strategy
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

// ใน route handler
const cacheKey = `data_${limit}`;
const cachedData = cache.get(cacheKey);
if (cachedData) {
    return res.json(cachedData);
}
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

## ✅ Final Checklist

- [ ] Node.js และ npm installed
- [ ] Tibero client tools available
- [ ] Database connection working
- [ ] API server runs without errors
- [ ] Thai characters display correctly
- [ ] All endpoints tested
- [ ] PM2 configured for production
- [ ] Logging setup
- [ ] Error handling implemented
- [ ] Performance optimizations applied

## 🎯 Success Metrics

การติดตั้งสำเร็จเมื่อ:

1. **Connection Test** ✅
   ```bash
   curl http://localhost:5225/test
   # Response: {"status":"success"}
   ```

2. **Thai Character Support** ✅
   ```bash
   curl http://localhost:5225/getdata/1
   # Response: แสดงภาษาไทยถูกต้อง
   ```

3. **Performance** ✅
   - Response time < 2 seconds
   - Memory usage < 100MB
   - No memory leaks

4. **Stability** ✅
   - รัน 24/7 ไม่มีปัญหา
   - Auto-restart เมื่อเกิด error
   - Proper logging

## 🔗 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Tibero Documentation](https://technet.tmaxsoft.com/upload/download/online/tibero/pver-20150504-000001/tibero_guide/html/index.html)

---

**🎉 Congratulations!** 
คุณได้สร้าง Tibero API ที่รองรับภาษาไทยบน Ubuntu เรียบร้อยแล้ว!
