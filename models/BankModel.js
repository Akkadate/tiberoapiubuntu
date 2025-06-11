const BaseModel = require('./BaseModel');

class BankModel extends BaseModel {
    constructor() {
        super('BANK');
    }

    // ทดสอบการเชื่อมต่อและดูข้อมูล
    async testConnection() {
        try {
            const countResult = await this.customQuery('SELECT COUNT(*) as count FROM BANK');
            const sampleResult = await this.customQuery('SELECT * FROM BANK WHERE ROWNUM <= 3');
            
            return { 
                success: true, 
                message: 'BANK table found!',
                count: countResult[0]?.count || 0,
                sample: sampleResult
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // ดูโครงสร้างตาราง
    async getTableStructure() {
        try {
            const result = await this.customQuery(`
                SELECT column_name, data_type, data_length, nullable
                FROM user_tab_columns 
                WHERE table_name = 'BANK' 
                ORDER BY column_id
            `);
            return result;
        } catch (error) {
            return { error: error.message };
        }
    }

    // ดึงธนาคารทั้งหมด - เวอร์ชันที่แก้ไขแล้ว
    async getAllBanks(limit = 100) {
        try {
            // ใช้ * ก่อนเพื่อดูว่ามี columns อะไรบ้าง
            const sql = `SELECT * FROM ${this.tableName} WHERE ROWNUM <= ${limit} ORDER BY BANKCODE`;
            console.log('Executing getAllBanks SQL:', sql);
            return await this.customQuery(sql);
        } catch (error) {
            console.error('getAllBanks error:', error);
            throw error;
        }
    }

    // ค้นหาธนาคารตาม BANKCODE - ปรับปรุงแล้ว
    async getBankByCode(bankCode) {
        try {
            const sql = `SELECT * FROM ${this.tableName} WHERE BANKCODE = '${bankCode}'`;
            console.log('Executing getBankByCode SQL:', sql);
            const result = await this.customQuery(sql);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('getBankByCode error:', error);
            throw error;
        }
    }

    // นับจำนวนธนาคารทั้งหมด
    async getTotalBankCount() {
        try {
            const result = await this.customQuery('SELECT COUNT(*) as total_count FROM BANK');
            return result[0]?.total_count || 0;
        } catch (error) {
            console.error('getTotalBankCount error:', error);
            return 0;
        }
    }

    // สร้างข้อมูลทดสอบ
    async insertTestData() {
        try {
            const testData = [
                "INSERT INTO BANK (BANKCODE, BANKNAME, BANKACCOUNT, TRANSACTIONFEE, VOUCHERTYPECODE, BANKFILECODE, BANKFEEID) VALUES ('BBL', 'ธนาคารกรุงเทพ', '1234567890', 15, 'VT001', 'BF001', 'BFE001')",
                "INSERT INTO BANK (BANKCODE, BANKNAME, BANKACCOUNT, TRANSACTIONFEE, VOUCHERTYPECODE, BANKFILECODE, BANKFEEID) VALUES ('SCB', 'ธนาคารไทยพาณิชย์', '0987654321', 20, 'VT002', 'BF002', 'BFE002')",
                "INSERT INTO BANK (BANKCODE, BANKNAME, BANKACCOUNT, TRANSACTIONFEE, VOUCHERTYPECODE, BANKFILECODE, BANKFEEID) VALUES ('KTB', 'ธนาคารกรุงไทย', '1122334455', 10, 'VT003', 'BF003', 'BFE003')"
            ];

            for (const sql of testData) {
                await this.customQuery(sql);
            }
            
            await this.customQuery('COMMIT');
            
            return { success: true, message: 'Test data inserted successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = BankModel;
