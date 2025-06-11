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
