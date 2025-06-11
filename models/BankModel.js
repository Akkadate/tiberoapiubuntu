const BaseModel = require('./BaseModel');

class BankModel extends BaseModel {
    constructor() {
        super('BANK');
    }

    // ดึงธนาคารทั้งหมดด้วย DUMP สำหรับภาษาไทย
    async getAllBanks(limit = 100) {
        try {
            const sql = `
                SELECT BANKCODE, 
                       DUMP(BANKNAME) as BANKNAME_DUMP,
                       BANKACCOUNT, 
                       TRANSACTIONFEE, 
                       VOUCHERTYPECODE, 
                       BANKFILECODE, 
                       BANKFEEID 
                FROM ${this.tableName} 
                WHERE ROWNUM <= ${limit} 
                ORDER BY BANKCODE
            `;
            console.log('Executing getAllBanks SQL:', sql);
            return await this.customQuery(sql);
        } catch (error) {
            console.error('getAllBanks error:', error);
            throw error;
        }
    }

    // ทดสอบการเชื่อมต่อ
    async testConnection() {
        try {
            const countResult = await this.customQuery('SELECT COUNT(*) as count FROM BANK');
            const sampleResult = await this.customQuery('SELECT BANKCODE, DUMP(BANKNAME) as BANKNAME_DUMP FROM BANK WHERE ROWNUM <= 3');
            
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

    // ค้นหาธนาคารตาม BANKCODE ด้วย DUMP
    async getBankByCode(bankCode) {
        try {
            const sql = `
                SELECT BANKCODE, 
                       DUMP(BANKNAME) as BANKNAME_DUMP,
                       BANKACCOUNT, 
                       TRANSACTIONFEE, 
                       VOUCHERTYPECODE, 
                       BANKFILECODE, 
                       BANKFEEID 
                FROM ${this.tableName} 
                WHERE BANKCODE = '${bankCode}'
            `;
            const result = await this.customQuery(sql);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('getBankByCode error:', error);
            throw error;
        }
    }

    async getTotalBankCount() {
        try {
            const result = await this.customQuery('SELECT COUNT(*) as total_count FROM BANK');
            return result[0]?.total_count || 0;
        } catch (error) {
            console.error('getTotalBankCount error:', error);
            return 0;
        }
    }

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

    async insertTestData() {
        try {
            const testData = [
                "INSERT INTO BANK (BANKCODE, BANKNAME, BANKACCOUNT, TRANSACTIONFEE, VOUCHERTYPECODE, BANKFILECODE, BANKFEEID) VALUES ('TEST1', 'ทดสอบธนาคาร1', '1111111111', 5, 'VT111', 'BF111', 'BFE111')",
                "INSERT INTO BANK (BANKCODE, BANKNAME, BANKACCOUNT, TRANSACTIONFEE, VOUCHERTYPECODE, BANKFILECODE, BANKFEEID) VALUES ('TEST2', 'ทดสอบธนาคาร2', '2222222222', 10, 'VT222', 'BF222', 'BFE222')"
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
