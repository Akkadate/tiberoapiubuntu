// models/BankModel.js - BANK table operations (แก้ไขแล้ว)
const BaseModel = require('./BaseModel');

class BankModel extends BaseModel {
    constructor() {
        // แก้ไขจาก 'AVSREG.BANK' เป็น 'BANK'
        super('BANK');
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
        const result = await this.customQuery('SELECT COUNT(*) as total_count FROM BANK');
        return result[0]?.total_count || 0;
    }

    // ดึงธนาคารที่มี transaction fee ต่ำกว่าที่กำหนด
    async getBanksByMaxFee(maxFee, limit = 50) {
        const columns = 'BANKCODE, BANKNAME, BANKACCOUNT, TRANSACTIONFEE, VOUCHERTYPECODE, BANKFILECODE, BANKFEEID';
        const conditions = `TRANSACTIONFEE <= ${maxFee}`;
        return await this.select(columns, conditions, limit, 'TRANSACTIONFEE ASC');
    }

    // ทดสอบการเชื่อมต่อ
    async testConnection() {
        try {
            const result = await this.customQuery('SELECT COUNT(*) as count FROM BANK');
            return { 
                success: true, 
                message: 'BANK table found!',
                count: result[0]?.count || 0
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // ดูโครงสร้างตาราง (ถ้าต้องการ)
    async getTableStructure() {
        try {
            const result = await this.customQuery(`
                SELECT column_name, data_type, data_length 
                FROM user_tab_columns 
                WHERE table_name = 'BANK' 
                ORDER BY column_id
            `);
            return result;
        } catch (error) {
            return { error: error.message };
        }
    }
}

module.exports = BankModel;
