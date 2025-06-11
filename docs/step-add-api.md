# 🏦 Step-by-Step: สร้าง Bank API

## 📋 ข้อมูลตาราง BANK
```sql
SELECT BANKCODE, BANKNAME, BANKACCOUNT, TRANSACTIONFEE, 
       VOUCHERTYPECODE, BANKFILECODE, BANKFEEID
FROM AVSREG.BANK;
```

**Target:** `localhost:5230/api/bank`

---

## 🛠️ ขั้นตอนการสร้าง API

### Step 1: สร้าง Bank Model
```bash
cd /var/www/tiberoapi

# สร้างไฟล์ models/BankModel.js
cat > models/BankModel.js << 'EOF'
// models/BankModel.js - BANK table operations
const BaseModel = require('./BaseModel');

class BankModel extends BaseModel {
    constructor() {
        // เรียกใช้ BaseModel โดยส่งชื่อตารางเป็น 'AVSREG.BANK'
        super('AVSREG.BANK');
    }

    // ดึงธนาคารทั้งหมด
    async getAllBanks(limit = 100) {
        const columns = 'BANKCODE, BANKNAME, BANKACCOUNT, TRANSACTIONFEE, VOUCHERTYPECODE, BANKFILECODE, BANKFEEID';
        return await this.select(columns, '', limit, 'BANKCODE');
    }

    // ค้นหาธนาคารตาม BANKCODE
    async getBankByCode(bankCode) {
        const columns = 'BANKCODE, BANKNAME, BANKACCOUNT, TRANSACTIONFEE, VOUCHERTYPECODE, BANKFILECODE, BANKFEEID';
        const conditions = `BANKCODE = '${bankCode}'`;
        const result = await this.select(columns, conditions, 1);
        return result.length > 0 ? result[0] : null;
    }

    // ค้นหาธนาคารตามชื่อ
    async searchBankByName(searchTerm, limit = 20) {
        const columns = 'BANKCODE, BANKNAME, BANKACCOUNT, TRANSACTIONFEE, VOUCHERTYPECODE, BANKFILECODE, BANKFEEID';
        const conditions = `BANKNAME LIKE '%${searchTerm}%'`;
        return await this.select(columns, conditions, limit, 'BANKNAME');
    }

    // นับจำนวนธนาคารทั้งหมด
    async getTotalBankCount() {
        const result = await this.customQuery('SELECT COUNT(*) as total_count FROM AVSREG.BANK');
        return result[0]?.total_count || 0;
    }

    // ดึงธนาคารที่มี transaction fee ต่ำกว่าที่กำหนด
    async getBanksByMaxFee(maxFee, limit = 50) {
        const columns = 'BANKCODE, BANKNAME, BANKACCOUNT, TRANSACTIONFEE, VOUCHERTYPECODE, BANKFILECODE, BANKFEEID';
        const conditions = `TRANSACTIONFEE <= ${maxFee}`;
        return await this.select(columns, conditions, limit, 'TRANSACTIONFEE ASC');
    }
}

module.exports = BankModel;
EOF
```

### Step 2: สร้าง Bank Routes
```bash
# สร้างไฟล์ routes/bank.js
cat > routes/bank.js << 'EOF'
// routes/bank.js - Bank API routes
const express = require('express');
const router = express.Router();
const BankModel = require('../models/BankModel');

const bankModel = new BankModel();

// GET /api/bank - ดึงธนาคารทั้งหมด
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const banks = await bankModel.getAllBanks(limit);
        
        res.json({
            message: 'Bank data retrieved successfully',
            count: banks.length,
            limit: limit,
            data: banks
        });
    } catch (error) {
        console.error('Error getting banks:', error);
        res.status(500).json({ 
            error: error.message,
            endpoint: '/api/bank'
        });
    }
});

// GET /api/bank/count - นับจำนวนธนาคาร
router.get('/count', async (req, res) => {
    try {
        const totalCount = await bankModel.getTotalBankCount();
        
        res.json({
            message: 'Total bank count',
            total_banks: totalCount
        });
    } catch (error) {
        console.error('Error counting banks:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/bank/search/:term - ค้นหาธนาคารตามชื่อ
router.get('/search/:term', async (req, res) => {
    try {
        const searchTerm = req.params.term;
        const limit = parseInt(req.query.limit) || 20;
        
        const banks = await bankModel.searchBankByName(searchTerm, limit);
        
        res.json({
            message: `Search results for: ${searchTerm}`,
            searchTerm: searchTerm,
            count: banks.length,
            data: banks
        });
    } catch (error) {
        console.error('Error searching banks:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/bank/fee/:maxFee - ธนาคารที่ค่าธรรมเนียมไม่เกินที่กำหนด
router.get('/fee/:maxFee', async (req, res) => {
    try {
        const maxFee = parseFloat(req.params.maxFee);
        const limit = parseInt(req.query.limit) || 50;
        
        const banks = await bankModel.getBanksByMaxFee(maxFee, limit);
        
        res.json({
            message: `Banks with transaction fee <= ${maxFee}`,
            maxFee: maxFee,
            count: banks.length,
            data: banks
        });
    } catch (error) {
        console.error('Error getting banks by fee:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/bank/:code - ดึงธนาคารตาม BANKCODE
router.get('/:code', async (req, res) => {
    try {
        const bankCode = req.params.code.toUpperCase();
        const bank = await bankModel.getBankByCode(bankCode);
        
        if (!bank) {
            return res.status(404).json({
                error: 'Bank not found',
                bankCode: bankCode
            });
        }
        
        res.json({
            message: 'Bank found',
            bankCode: bankCode,
            data: bank
        });
    } catch (error) {
        console.error('Error getting bank by code:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
EOF
```

### Step 3: เพิ่ม Route ใน server.js
```bash
# เพิ่ม import และ route ใน server.js
# เพิ่มหลังบรรทัดที่มี require อื่นๆ

# เปิดไฟล์ server.js และเพิ่มหลังบรรทัด const courseRoutes = require('./routes/course');
sed -i '/const courseRoutes = require/a const bankRoutes = require('\''./routes/bank'\'');' server.js

# เพิ่มหลังบรรทัด app.use('/api/courses', courseRoutes);
sed -i '/app.use.*courses.*courseRoutes/a app.use('\''/api/bank'\'', bankRoutes);' server.js
```

### Step 4: อัพเดต API Documentation
```bash
# แก้ไข API documentation ใน server.js เพื่อเพิ่ม bank endpoints
# (ทำด้วยมือหรือใช้ sed command)

# ตัวอย่างการเพิ่มใน documentation:
# แก้ไขส่วน endpoints ใน /api route
```

### Step 5: ทดสอบ
```bash
# ตรวจสอบ syntax
node -c models/BankModel.js
node -c routes/bank.js
node -c server.js

# รัน server
node server.js
```

---

## 🧪 ทดสอบ API ที่สร้างขึ้น

### ทดสอบ endpoints ต่างๆ
```bash
# 1. ดึงธนาคารทั้งหมด (จำกัด 5 รายการ)
curl "http://localhost:5230/api/bank?limit=5"

# 2. นับจำนวนธนาคารทั้งหมด
curl "http://localhost:5230/api/bank/count"

# 3. ค้นหาธนาคารตาม BANKCODE
curl "http://localhost:5230/api/bank/BBL"

# 4. ค้นหาธนาคารตามชื่อ
curl "http://localhost:5230/api/bank/search/กรุง"

# 5. ธนาคารที่ค่าธรรมเนียมไม่เกิน 10 บาท
curl "http://localhost:5230/api/bank/fee/10"

# 6. ดู API documentation
curl "http://localhost:5230/api"

# 7. ทดสอบ health check
curl "http://localhost:5230/health"
```

---

## 📋 สรุปไฟล์ที่สร้าง

```
/var/www/tiberoapi/
├── models/
│   └── BankModel.js          ← ใหม่
├── routes/
│   └── bank.js               ← ใหม่
└── server.js                 ← แก้ไข (เพิ่ม bank routes)
```

---

## 🎯 Expected Results

### GET /api/bank?limit=3
```json
{
  "message": "Bank data retrieved successfully",
  "count": 3,
  "limit": 3,
  "data": [
    {
      "BANKCODE": "BBL",
      "BANKNAME": "ธนาคารกรุงเทพ จำกัด (มหาชน)",
      "BANKACCOUNT": "1234567890",
      "TRANSACTIONFEE": 15,
      "VOUCHERTYPECODE": "VT001",
      "BANKFILECODE": "BF001",
      "BANKFEEID": "BFE001"
    }
  ]
}
```

### GET /api/bank/BBL
```json
{
  "message": "Bank found",
  "bankCode": "BBL",
  "data": {
    "BANKCODE": "BBL",
    "BANKNAME": "ธนาคารกรุงเทพ จำกัด (มหาชน)",
    "BANKACCOUNT": "1234567890",
    "TRANSACTIONFEE": 15,
    "VOUCHERTYPECODE": "VT001",
    "BANKFILECODE": "BF001",
    "BANKFEEID": "BFE001"
  }
}
```

---

## 💡 เคล็ดลับสำหรับมือใหม่

### 1. ลำดับการพัฒนา
1. **Model** → จัดการข้อมูลจาก database
2. **Routes** → สร้าง endpoints และ business logic  
3. **Server** → เชื่อม routes เข้าระบบ
4. **Test** → ทดสอบให้ครบทุก endpoint

### 2. แนวทางการทดสอบ
- เริ่มจาก endpoint ง่ายๆ ก่อน (GET ทั้งหมด)
- ทดสอบทีละ endpoint
- ดู error logs ถ้ามีปัญหา

### 3. การ Debug
```bash
# ดู logs ของ server
# ถ้ามี error จะแสดงใน console

# ทดสอบ database connection แยก
curl "http://localhost:5230/api/debug/test-query/BANK"
```

---

**🎉 พร้อมสร้าง Bank API แล้ว! เริ่มจาก Step 1 เลยครับ**
